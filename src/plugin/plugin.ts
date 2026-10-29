import type {
    NoteParser,
    NoteState,
    NoteToken,
    NotesDirectivePlugin,
    NotesFactoryOptions,
    NotesOptions,
    NotesPlugin,
} from './types.js';
import type {NoteMarker} from './directive.js';

import {createNestedCloseTokenIdxFactory} from './close.js';
import {DEFAULT_LANG, TITLES} from './const.js';
import {installNoteDirective} from './directive.js';
import {matchCloseToken, matchOpenToken, matchWrongNotes} from './recognize.js';

const quietLogger = {warn: (_message: string) => {}, error: (_message: string) => {}};

const titleDictionaries = new Map(Object.entries(TITLES));

function getTitle(type: string, lang: string) {
    return (titleDictionaries.get(lang) ?? TITLES.ru)[type];
}

type NoteEmission = {
    start: number;
    close: number;
    bodyStart: number;
    removeCount: number;
    type: string;
    title: string;
    contentMap?: [number, number];
};

function emitNote<Token extends NoteToken>(state: NoteState<Token>, note: NoteEmission): void {
    const {tokens, env} = state;
    const open = new state.Token('yfm_note_open', 'div', 1);
    open.attrSet('class', `yfm-note yfm-accent-${note.type}`);
    open.attrSet('note-type', note.type);
    open.map = tokens[note.start].map;
    const closeMap = tokens[note.close].map;
    if (closeMap && open.map) open.map[1] = closeMap[1];
    const close = new state.Token('yfm_note_close', 'div', -1);
    close.map = closeMap;
    const titleOpen = new state.Token('yfm_note_title_open', 'p', 1);
    titleOpen.attrSet('class', 'yfm-note-title');
    const titleInline = state.md.parseInline(note.title, env)[0];
    titleInline.map = null;
    const titleClose = new state.Token('yfm_note_title_close', 'p', -1);
    titleOpen.block = true;
    titleClose.block = true;
    const contentOpen = new state.Token('yfm_note_content_open', 'div', 1);
    contentOpen.attrSet('class', 'yfm-note-content');
    const contentClose = new state.Token('yfm_note_content_close', 'div', -1);
    if (open.map) contentOpen.map = note.contentMap ?? [open.map[0] + 2, open.map[1] - 2];
    const inside = [open];
    if (titleInline.content) inside.push(titleOpen, titleInline, titleClose);
    inside.push(contentOpen, ...tokens.slice(note.bodyStart, note.close), contentClose, close);
    tokens.splice(note.start, note.removeCount, ...inside);
}

function validateMarkers(tokens: NoteToken[], markers: WeakMap<object, NoteMarker>): void {
    const expected: object[] = [];
    for (const token of tokens) {
        const marker = markers.get(token);
        if (
            !marker &&
            (token.type === 'yfm_note_directive_open' || token.type === 'yfm_note_directive_close')
        ) {
            throw new Error('Unowned note directive marker');
        }
        if (marker?.kind === 'open') expected.push(marker.end);
        else if (marker?.kind === 'close' && expected.pop() !== token) {
            throw new Error('Note directive opening marker is missing or crossed');
        }
    }
    if (expected.length) throw new Error('Note directive closing marker is missing');
}

/**
 * Bind existing feature diagnostics to an execution-host path formatter.
 * @param formatPath - Original terminal or plain browser formatting.
 * @param onNote - Optional host resource notification after a real note is created.
 * @returns The unchanged feature callback.
 */
export function createNotesPlugin(
    formatPath?: (path: string) => string,
    onNote?: (env: Record<string, unknown>) => void,
): NotesPlugin;
export function createNotesPlugin(
    formatPath: ((path: string) => string) | undefined,
    onNote: ((env: Record<string, unknown>) => void) | undefined,
    factory: NotesFactoryOptions & {directiveSyntax: 'disabled'},
): NotesPlugin;
export function createNotesPlugin(
    formatPath: ((path: string) => string) | undefined,
    onNote: ((env: Record<string, unknown>) => void) | undefined,
    factory: NotesFactoryOptions & {directiveSyntax: 'enabled' | 'only'},
): NotesDirectivePlugin;
export function createNotesPlugin(
    formatPath: ((path: string) => string) | undefined,
    onNote: ((env: Record<string, unknown>) => void) | undefined,
    factory: NotesFactoryOptions,
): NotesPlugin | NotesDirectivePlugin;
export function createNotesPlugin(
    formatPath: (path: string) => string = (path) => path,
    onNote?: (env: Record<string, unknown>) => void,
    factory: NotesFactoryOptions = {},
): NotesPlugin | NotesDirectivePlugin {
    const findCloseTokenIdx = createNestedCloseTokenIdxFactory(formatPath)(
        'Note',
        matchOpenToken,
        matchCloseToken,
    );

    const installCore = <Token extends NoteToken>(
        md: NoteParser<Token>,
        {lang = DEFAULT_LANG, notesAutotitle, path: optPath, log = quietLogger}: NotesOptions = {},
        markers: WeakMap<object, NoteMarker>,
        legacy: boolean,
        directiveEnabled: boolean,
    ): void => {
        notesAutotitle = typeof notesAutotitle === 'boolean' ? notesAutotitle : true;

        const processNote = (
            state: NoteState<Token>,
            start: number,
            marker: Extract<NoteMarker, {kind: 'open'}> | undefined,
            match: ReturnType<typeof matchOpenToken>,
            path: string,
        ): number => {
            const {tokens, env} = state;
            const closeTokenIdx = marker
                ? tokens.findIndex((token, index) => index > start && token === marker.end)
                : findCloseTokenIdx(tokens, start + 2, path, log);
            if (marker && (closeTokenIdx === null || closeTokenIdx < 0)) {
                throw new Error('Note directive closing marker is missing');
            }
            if (!closeTokenIdx) return start + 3;
            const type = marker ? marker.type : match && match[1].toLowerCase();
            if (!type) throw new Error('Note type is missing');
            let authoredTitle: string | undefined;
            if (marker) authoredTitle = marker.title;
            else if (match) authoredTitle = match[2];
            let title = authoredTitle;
            if (title === undefined) title = notesAutotitle ? getTitle(type, lang) : '';
            emitNote(state, {
                start,
                close: closeTokenIdx,
                bodyStart: start + (marker ? 1 : 3),
                removeCount: closeTokenIdx - start + (marker ? 1 : 3),
                type,
                title,
                contentMap: marker?.contentMap,
            });
            onNote?.(env);
            return start + 1;
        };

        const plugin = (state: NoteState<Token>) => {
            const {tokens, env} = state;
            if (directiveEnabled) validateMarkers(tokens, markers);
            const path = typeof env.path === 'string' && env.path ? env.path : (optPath ?? '');
            let i = 0;
            while (i < tokens.length) {
                const marker = markers.get(tokens[i]);
                if (marker?.kind === 'close') {
                    throw new Error('Note directive opening marker is missing');
                }
                const match = legacy && matchOpenToken(tokens, i);
                if (marker || match) {
                    i = processNote(state, i, marker, match, path);
                } else if (
                    legacy &&
                    matchWrongNotes(tokens, i) &&
                    tokens[i + 1].content !== '{% endnote %}'
                ) {
                    log.warn(
                        `Incorrect syntax for notes${path ? `, file ${formatPath(path)}` : ''}`,
                    );
                    i += 3;
                } else {
                    i++;
                }
            }
        };

        try {
            md.core.ruler.before('curly_attributes', 'notes', plugin);
        } catch {
            md.core.ruler.push('notes', plugin);
        }
    };

    if (!factory.directiveSyntax || factory.directiveSyntax === 'disabled') {
        const legacyPlugin: NotesPlugin = (md, options) =>
            installCore(md, options, new WeakMap(), true, false);
        return legacyPlugin;
    }
    const directivePlugin: NotesDirectivePlugin = (md, options) => {
        const markers = new WeakMap<object, NoteMarker>();
        installNoteDirective(md, markers, factory.onDiagnostic);
        installCore(md, options, markers, factory.directiveSyntax === 'enabled', true);
    };
    return directivePlugin;
}
