import type MarkdownItConstructor from 'markdown-it' with {'resolution-mode': 'import'};

import {createRequire} from 'node:module';
import {describe, expect, it} from 'vitest';

import {createNotesPlugin} from '../src/plugin/plugin.js';
import {TITLES, TokenType} from '../src/plugin/const.js';
import {transform} from '../src/browser/index.js';
import {addResources} from '../src/plugin/resources.js';

const MarkdownIt: typeof MarkdownItConstructor = createRequire(`${process.cwd()}/package.json`)(
    'markdown-it',
);
const kinds = ['info', 'tip', 'alert', 'warning'];
const note = (kind: string, title = '') => `{% note ${kind}${title} %}\n\nBody\n\n{% endnote %}`;

for (const [lang, titles] of Object.entries(TITLES)) {
    it.each(kinds)(`${lang} keeps the localized %s title and token identities`, (kind) => {
        const md = new MarkdownIt().use(createNotesPlugin(), {lang});
        const tokens = md.parse(note(kind), {});
        expect(tokens[2].content).toBe(titles[kind]);
        expect(tokens[3].type).toBe(TokenType.NoteTitleClose);
        expect(tokens[0].map).toEqual([0, 5]);
        expect(tokens.find((token) => token.type === TokenType.NoteContentOpen)?.map).toEqual([
            2, 3,
        ]);
    });
}

describe.each(kinds)('%s title policy', (kind) => {
    for (const notesAutotitle of [undefined, true, false]) {
        it.each(['', ' "Explicit *title*"', ' ""'])(`${notesAutotitle} with %s`, (title) => {
            const md = new MarkdownIt().use(createNotesPlugin(), {notesAutotitle, lang: 'en'});
            const tokens = md.parse(note(kind, title), {});
            const hasTitle =
                title === ' "Explicit *title*"' || (title === '' && notesAutotitle !== false);
            expect(tokens.some((token) => token.type === TokenType.NoteTitleOpen)).toBe(hasTitle);
            if (title.includes('Explicit'))
                expect(md.renderer.render(tokens, md.options, {})).toContain('<em>title</em>');
        });
    }
});

it.each([undefined, '', 'unknown', '__proto__', 'constructor'])(
    'falls back to Russian for language %s',
    (lang) => {
        const md = new MarkdownIt().use(createNotesPlugin(), {lang});
        expect(md.render(note('info'))).toContain('Примечание');
    },
);

it('preserves error/warn severity, exact formatted paths, and quiet omission', () => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const md = new MarkdownIt().use(
        createNotesPlugin((path) => `<${path}>`),
        {
            path: 'fallback.md',
            log: {
                warn: (message) => warnings.push(message),
                error: (message) => errors.push(message),
            },
        },
    );
    md.parse('{% note info %}\n\nUnclosed', {path: 'actual.md'});
    md.parse('{% note wrong %}', {});
    expect(errors).toEqual(['Note must be closed in <actual.md>']);
    expect(warnings).toEqual(['Incorrect syntax for notes, file <fallback.md>']);
    expect(() =>
        new MarkdownIt().use(createNotesPlugin()).parse('{% note info %}', {}),
    ).not.toThrow();
});

it('forwards factory settings and callback overrides without resources when disabled', () => {
    const md = new MarkdownIt().use(
        transform({lang: 'fr', notesAutotitle: false, runtime: false}),
        {notesAutotitle: true},
    );
    const env = {};
    expect(md.render(note('info'), env)).toContain('Remarque');
    expect(env).toEqual({});
});

it('emits CSS only for real notes, deduplicates, resets per document and preserves authored arrays', () => {
    const md = new MarkdownIt().use(transform());
    const styles = ['authored.css'];
    const env = {meta: {style: styles, script: ['authored.js']}};
    md.render(`${note('info')}\n\n${note('tip')}`, env);
    expect(env.meta.style).toEqual(['authored.css', '_assets/notes-extension.css']);
    expect(env.meta.script).toEqual(['authored.js']);
    expect(styles).toEqual(['authored.css']);
    const empty = {};
    md.render('No notes', empty);
    expect(empty).toEqual({});
    const next = {};
    md.render(note('info'), next);
    expect(next).toEqual({meta: {style: ['_assets/notes-extension.css']}});
});

it('preserves authored scalar metadata when appending an explicit resource', () => {
    const env = {meta: {style: 'author.css'}};
    addResources(env, {style: 'notes.css'});
    expect(env.meta.style).toEqual(['author.css', 'notes.css']);
});

it('rejects JavaScript browser copying before registration or resource effects', () => {
    const env = {};
    const md = new MarkdownIt();
    expect(() => {
        // @ts-expect-error JavaScript callers can bypass the browser-only false type.
        md.use(transform({bundle: true}));
    }).toThrow('Browser notes extension cannot copy runtime files.');
    expect(md.render('Body', env)).toBe('<p>Body</p>\n');
    expect(env).toEqual({});
});
