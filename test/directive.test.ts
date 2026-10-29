import type {NoteParser, NoteToken} from '../src/plugin/types.js';

import MarkdownIt from 'markdown-it';
import {describe, expect, it} from 'vitest';
import {directiveParser, registerContainerDirective} from '@diplodoc/directive';

import {createNotesPlugin} from '../src/plugin/plugin.js';
import {TITLES} from '../src/plugin/const.js';
import {transform} from '../src/browser/index.js';

const kinds = ['info', 'tip', 'warning', 'alert'];
const oldNote = (type: string, title = '') => `{% note ${type}${title} %}\n\nBody\n\n{% endnote %}`;
const newNote = (type: string, title = '') => `:::note${title} {type=${type}}\nBody\n:::`;

it('keeps the old callback valid for a minimal core-only host', () => {
    const minimal: NoteParser<NoteToken> = {core: {ruler: {before() {}, push() {}}}};
    createNotesPlugin()(minimal);
    createNotesPlugin(undefined, undefined, {directiveSyntax: 'disabled'})(minimal);
    if (process.env.NOTES_TYPE_PROBE) {
        // @ts-expect-error Directive mode requires the host's directive parser capabilities.
        createNotesPlugin(undefined, undefined, {directiveSyntax: 'enabled'})(minimal);
    }
});

describe('note directive parity', () => {
    for (const lang of Object.keys(TITLES)) {
        it.each(kinds)(`${lang} %s retains the legacy output and semantic token fields`, (type) => {
            const legacy = new MarkdownIt().use(createNotesPlugin(), {lang});
            const colon = new MarkdownIt().use(
                createNotesPlugin(undefined, undefined, {directiveSyntax: 'enabled'}),
                {lang},
            );
            const oldTokens = legacy.parse(oldNote(type), {});
            const newTokens = colon.parse(newNote(type), {});
            expect(colon.renderer.render(newTokens, colon.options, {})).toBe(
                legacy.renderer.render(oldTokens, legacy.options, {}),
            );
            const semantic = (tokens: typeof oldTokens) =>
                tokens.map(({type: tokenType, level, block, content, attrs}) => ({
                    type: tokenType,
                    level,
                    block,
                    content,
                    attrs,
                }));
            expect(semantic(newTokens)).toEqual(semantic(oldTokens));
            expect(newTokens[0].map).toEqual([0, 3]);
            expect(newTokens.find((token) => token.type === 'yfm_note_content_open')?.map).toEqual([
                1, 2,
            ]);
        });
    }
    it.each([
        {title: '', legacy: '', options: {}, expected: 'Note'},
        {title: ' []', legacy: ' ""', options: {}, expected: ''},
        {title: ' [*Custom*]', legacy: ' "*Custom*"', options: {}, expected: '<em>Custom</em>'},
        {title: '', legacy: '', options: {notesAutotitle: false}, expected: ''},
    ])('preserves title policy $title', ({title, legacy, options, expected}) => {
        const settings = {lang: 'en', ...options};
        const old = new MarkdownIt().use(createNotesPlugin(), settings);
        const modern = new MarkdownIt().use(
            createNotesPlugin(undefined, undefined, {directiveSyntax: 'enabled'}),
            settings,
        );
        const html = modern.render(newNote('info', title));
        expect(html).toBe(old.render(oldNote('info', legacy)));
        if (expected) expect(html).toContain(expected);
        else expect(html).not.toContain('yfm-note-title');
    });
});

it('honors disabled, enabled and only modes and settings overrides', () => {
    const disabled = new MarkdownIt().use(transform({runtime: false}));
    expect(disabled.render(newNote('info'))).not.toContain('yfm-note');
    const enabled = new MarkdownIt().use(
        transform({directiveSyntax: 'enabled', lang: 'fr', runtime: false}),
        {lang: 'en'},
    );
    expect(enabled.render(newNote('info'))).toContain('Note');
    expect(enabled.render(oldNote('info'))).toContain('Note');
    const only = new MarkdownIt().use(transform({directiveSyntax: 'only', runtime: false}));
    expect(only.render(oldNote('info'))).not.toContain('yfm-note');
    expect(only.render(newNote('info'))).toContain('yfm-note');
});

it.each(['', 'type=robot', 'type=info type=tip', 'type=info id=x', 'type=info class=x'])(
    'diagnoses invalid attributes %s and falls back',
    (attrs) => {
        const diagnostics: {line: number; reason: string}[] = [];
        let called = 0;
        const md = new MarkdownIt().use(
            createNotesPlugin(undefined, () => called++, {
                directiveSyntax: 'enabled',
                onDiagnostic: (value) => diagnostics.push(value),
            }),
        );
        expect(md.render(`:::note {${attrs}}\nBody\n:::`)).toContain(':::note');
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0].line).toBe(1);
        expect(called).toBe(0);
    },
);

it.each([
    ':::note [Title](https://example.com) {type=info}',
    ':::note {type=info} trailing',
    ':::note [oops',
])('rejects destinations and malformed parameters', (opening) => {
    const diagnostics: unknown[] = [];
    const md = new MarkdownIt().use(
        createNotesPlugin(undefined, undefined, {
            directiveSyntax: 'enabled',
            onDiagnostic: (value) => diagnostics.push(value),
        }),
    );
    expect(md.render(`${opening}\nBody\n:::`)).toContain(':::note');
    expect(diagnostics).toHaveLength(1);
});

it('does not replace an existing note directive', () => {
    const md = new MarkdownIt().use(directiveParser());
    registerContainerDirective(md, 'note', () => false);
    expect(() =>
        md.use(createNotesPlugin(undefined, undefined, {directiveSyntax: 'enabled'})),
    ).toThrow('Block directive already registered: note');
});

it('renders nested mixed syntax and notifies once per accepted note', () => {
    let count = 0;
    const md = new MarkdownIt().use(
        createNotesPlugin(undefined, () => count++, {directiveSyntax: 'enabled'}),
        {lang: 'en'},
    );
    const html = md.render(':::note {type=info}\n{% note tip %}\n\nInside\n\n{% endnote %}\n:::');
    expect(html.match(/class="yfm-note yfm-accent-/g)).toHaveLength(2);
    expect(count).toBe(2);
    expect(html).not.toContain('directive_open');
});

it('invokes the host inline formatter once for each title', () => {
    const md = new MarkdownIt().use(
        createNotesPlugin(undefined, undefined, {directiveSyntax: 'enabled'}),
        {lang: 'en'},
    );
    const original = md.parseInline.bind(md);
    const calls: string[] = [];
    md.parseInline = (source, env) => {
        calls.push(source);
        return original(`${source} formatted`, env);
    };
    const modern = md.render(newNote('info', ' [*Custom*]'));
    const legacy = md.render(oldNote('info', ' "*Custom*"'));
    expect(modern).toBe(legacy);
    expect(modern).toContain('<em>Custom</em> formatted');
    expect(calls).toEqual(['*Custom*', '*Custom*']);
});

it('checks every nested marker before notifying about any note', () => {
    let count = 0;
    const md = new MarkdownIt().use(
        createNotesPlugin(undefined, () => count++, {directiveSyntax: 'enabled'}),
    );
    md.core.ruler.before('notes', 'remove-inner-marker', (state) => {
        const closes = state.tokens.filter((token) => token.type === 'yfm_note_directive_close');
        state.tokens.splice(state.tokens.indexOf(closes[0]), 1);
    });
    expect(() => md.render(':::note {type=info}\n:::note {type=tip}\nBody\n:::\n:::')).toThrow(
        /Note directive .* marker is missing/,
    );
    expect(count).toBe(0);
});

it('rejects a cloned marker before it can be rendered or trigger resources', () => {
    let count = 0;
    const md = new MarkdownIt().use(
        createNotesPlugin(undefined, () => count++, {directiveSyntax: 'enabled'}),
    );
    md.core.ruler.before('notes', 'clone-marker', (state) => {
        const index = state.tokens.findIndex((token) => token.type === 'yfm_note_directive_open');
        const original = state.tokens[index];
        state.tokens[index] = Object.assign(
            new state.Token(original.type, original.tag, 0),
            original,
        );
    });
    expect(() => md.render(newNote('info'))).toThrow('Unowned note directive marker');
    expect(count).toBe(0);
});

it.each(['yfm_note_directive_open', 'yfm_note_directive_close'])(
    'rejects a manipulated missing marker %s without notifying',
    (removed) => {
        let count = 0;
        const md = new MarkdownIt().use(
            createNotesPlugin(undefined, () => count++, {directiveSyntax: 'enabled'}),
        );
        md.core.ruler.before('notes', 'remove-marker', (state) => {
            const index = state.tokens.findIndex((token) => token.type === removed);
            if (index >= 0) state.tokens.splice(index, 1);
        });
        expect(() => md.render(newNote('info'))).toThrow(/Note directive .* marker is missing/);
        expect(count).toBe(0);
    },
);
