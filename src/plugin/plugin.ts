import type {
    MatchTokenFunction,
    NoteParser,
    NoteState,
    NoteToken,
    NotesOptions,
    NotesPlugin,
} from './types.js';

import {createNestedCloseTokenIdxFactory} from './close.js';
import {DEFAULT_LANG, TITLES} from './const.js';

const quietLogger = {warn: (_message: string) => {}, error: (_message: string) => {}};

const ALERT_RE = /^{% note (alert|info|tip|warning)\s*(?:"(.*?)")? %}$/;
const WRONG_NOTES = /^{% note (.*)%}/;

const matchCloseToken: MatchTokenFunction = (tokens, i) => {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endnote %}'
    );
};

const titleDictionaries = new Map(Object.entries(TITLES));

function getTitle(type: string, lang: string) {
    return (titleDictionaries.get(lang) ?? TITLES.ru)[type];
}

function matchOpenToken(tokens: NoteToken[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(ALERT_RE)
    );
}

function matchWrongNotes(tokens: NoteToken[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(WRONG_NOTES)
    );
}

/**
 * Bind existing feature diagnostics to an execution-host path formatter.
 * @param formatPath - Original terminal or plain browser formatting.
 * @param onNote - Optional host resource notification after a real note is created.
 * @returns The unchanged feature callback.
 */
export function createNotesPlugin(
    formatPath: (path: string) => string = (path) => path,
    onNote?: (env: Record<string, unknown>) => void,
): NotesPlugin {
    const findCloseTokenIdx = createNestedCloseTokenIdxFactory(formatPath)(
        'Note',
        matchOpenToken,
        matchCloseToken,
    );

    const index: NotesPlugin = <Token extends NoteToken>(
        md: NoteParser<Token>,
        {lang = DEFAULT_LANG, notesAutotitle, path: optPath, log = quietLogger}: NotesOptions = {},
    ) => {
        notesAutotitle = typeof notesAutotitle === 'boolean' ? notesAutotitle : true;

        const plugin = (state: NoteState<Token>) => {
            const {tokens, env} = state;
            const path = typeof env.path === 'string' && env.path ? env.path : (optPath ?? '');
            let i = 0;

            while (i < tokens.length) {
                const match = matchOpenToken(tokens, i);

                if (match) {
                    // Skip paragraph_close for open token (+1) and paragraph_open for close token (+1)
                    // This is minimal useless content length
                    const closeTokenIdx = findCloseTokenIdx(tokens, i + 2, path, log);

                    if (!closeTokenIdx) {
                        i += 3;
                        continue;
                    }

                    const type = match[1].toLowerCase();
                    const newOpenToken = new state.Token('yfm_note_open', 'div', 1);
                    newOpenToken.attrSet('class', `yfm-note yfm-accent-${type}`);
                    newOpenToken.attrSet('note-type', type);
                    newOpenToken.map = tokens[i].map;
                    const closeTokenMap = tokens[closeTokenIdx].map;

                    if (closeTokenMap && newOpenToken.map) {
                        newOpenToken.map[1] = closeTokenMap[1];
                    }

                    const newCloseToken = new state.Token('yfm_note_close', 'div', -1);
                    newCloseToken.map = tokens[closeTokenIdx].map;

                    // Add extra paragraph
                    const titleOpen = new state.Token('yfm_note_title_open', 'p', 1);
                    titleOpen.attrSet('class', 'yfm-note-title');
                    const autotitle = notesAutotitle ? getTitle(type, lang) : '';
                    const titleContent = match[2] === undefined ? autotitle : match[2];
                    const titleInline = state.md.parseInline(titleContent, state.env)[0];
                    titleInline.map = null;
                    const titleClose = new state.Token('yfm_note_title_close', 'p', -1);

                    titleOpen.block = true;
                    titleClose.block = true;

                    const contentOpen = new state.Token('yfm_note_content_open', 'div', 1);
                    contentOpen.attrSet('class', 'yfm-note-content');
                    const contentClose = new state.Token('yfm_note_content_close', 'div', -1);

                    if (newOpenToken.map) {
                        contentOpen.map = [newOpenToken.map[0] + 2, newOpenToken.map[1] - 2];
                    }

                    const insideTokens = [newOpenToken];
                    if (titleInline.content) {
                        insideTokens.push(titleOpen, titleInline, titleClose);
                    }

                    insideTokens.push(
                        contentOpen,
                        ...tokens.slice(i + 3, closeTokenIdx),
                        contentClose,
                        newCloseToken,
                    );

                    tokens.splice(i, closeTokenIdx - i + 3, ...insideTokens);

                    onNote?.(env);
                    i++;
                } else if (
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

    return index;
}
