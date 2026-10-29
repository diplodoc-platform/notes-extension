import MarkdownIt from 'markdown-it';
import {describe, expect, it} from 'vitest';

import {createNotesPlugin} from '../src/plugin/plugin.js';
import {recognizeNoteBoundary} from '../src/plugin/recognize.js';

// Mirrors the existing image-dimensions normalizer, with original UTF-16 offsets.
function normalizeSource(source: string) {
    let normalized = '';
    const offsets: number[] = [];
    for (let index = 0; index < source.length; index++) {
        offsets.push(index);
        if (source[index] === '\r') {
            normalized += '\n';
            if (source[index + 1] === '\n') index++;
        } else normalized += source[index] === '\0' ? '\ufffd' : source[index];
    }
    offsets.push(source.length);
    return {normalized, offsets};
}

function inspect(source: string, colon = false) {
    const {normalized, offsets} = normalizeSource(source);
    const md = new MarkdownIt({html: true});
    if (colon) md.use(createNotesPlugin(undefined, undefined, {directiveSyntax: 'enabled'}));
    const tokens: ReturnType<typeof md.parse> = [];
    md.block.parse(normalized, md, {}, tokens);
    const starts = [0];
    for (let i = 0; i < normalized.length; i++) if (normalized[i] === '\n') starts.push(i + 1);
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
        const event = recognizeNoteBoundary(tokens, i);
        if (!event) continue;
        const map = event.map;
        let range: [number, number] | null = null;
        if (map && map[1] === map[0] + 1 && !event.raw.includes('\n')) {
            const begin = starts[map[0]];
            const lineEnd = normalized.indexOf('\n', begin);
            const line = normalized.slice(begin, lineEnd < 0 ? normalized.length : lineEnd);
            const at = line.indexOf(event.raw);
            if (
                at >= 0 &&
                at === line.lastIndexOf(event.raw) &&
                /^\s*$/.test(line.slice(at + event.raw.length))
            ) {
                range = [offsets[begin + at], offsets[begin + at + event.raw.length]];
            }
        }
        result.push({...event, range});
    }
    return result;
}

describe('isolated canonical Note recognition', () => {
    it('excludes fenced, indented, HTML and escaped source while locating real sibling and nested markers', () => {
        const source =
            '\ufeff# 😀\r\n\r\n```\r\n{% note info %}\r\n```\r\n\r\n    {% note tip %}\r\n\r\n<div>\r\n{% note alert %}\r\n</div>\r\n\r\n\\{% note info %}\r\n\r\n> {% note info "" %}\r\n>\r\n> Body\r\n>\r\n> {% endnote %}\r\n\r\n- {% note warning %}\r\n\r\n  Body\r\n\r\n  {% endnote %}\r\n\r\n{% note robot %}\r\n\r\n{% note tip %}\r\n';
        const events = inspect(source);
        expect(events.map(({kind}) => kind)).toEqual([
            'open',
            'close',
            'open',
            'close',
            'unsupported',
            'open',
        ]);
        expect(events[0].kind === 'open' && events[0].title).toEqual({present: true, raw: ''});
        expect(events[2].kind === 'open' && events[2].title).toEqual({present: false});
        for (const e of events) {
            expect(e.range).not.toBeNull();
            if (e.range) expect(source.slice(...e.range)).toBe(e.raw);
        }
        expect(events[0].range && source.slice(0, events[0].range[0]).endsWith('> ')).toBe(true);
        expect(events[2].range && source.slice(0, events[2].range[0]).endsWith('- ')).toBe(true);
    });
    it('sees canonical legacy markers in a valid colon note body before core replacement', () => {
        const source =
            ':::note {type=info}\n\n{% note tip "Inner" %}\n\nBody\n\n{% endnote %}\n\n:::\n';
        expect(
            inspect(source, true).map((event) => ({
                kind: event.kind,
                type: event.kind === 'open' ? event.type : undefined,
            })),
        ).toEqual([
            {kind: 'open', type: 'tip'},
            {kind: 'close', type: undefined},
        ]);
    });
    it('does not guess when paragraph source spans multiple physical lines', () => {
        const source = '{% note info %}\ncontinuation\n';
        expect(inspect(source)).toMatchObject([{kind: 'unsupported', map: [0, 2], range: null}]);
    });
    it('returns a snapshot and leaves token data untouched', () => {
        const tokens = new MarkdownIt().parse('{% note info "" %}\n', {});
        const before = JSON.stringify(tokens);
        const event = recognizeNoteBoundary(tokens, 0);
        expect(JSON.stringify(tokens)).toBe(before);
        expect(event?.map).not.toBe(tokens[0].map);
        if (tokens[0].map) tokens[0].map[1] = 42;
        expect(event?.map).toEqual([0, 1]);
    });
    it('retains an unclosed opener and a separate later recognized sibling as edges', () => {
        const events = inspect('{% note info %}\n\n{% note tip %}\n\nB\n\n{% endnote %}\n');
        expect(
            events.map((event) => [event.kind, event.kind === 'open' ? event.type : undefined]),
        ).toEqual([
            ['open', 'info'],
            ['open', 'tip'],
            ['close', undefined],
        ]);
    });
});
