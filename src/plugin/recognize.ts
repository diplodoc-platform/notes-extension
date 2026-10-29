import type {NoteToken} from './types.js';

const ALERT_RE = /^{% note (alert|info|tip|warning)\s*(?:"(.*?)")? %}$/;
const WRONG_NOTES = /^{% note (.*)%}/;

export function matchCloseToken(tokens: readonly NoteToken[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endnote %}'
    );
}

export function matchOpenToken(tokens: readonly NoteToken[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(ALERT_RE)
    );
}

export function matchWrongNotes(tokens: readonly NoteToken[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(WRONG_NOTES)
    );
}

export type NoteBoundary = {
    readonly map: readonly [number, number] | null;
    readonly raw: string;
} & (
    | {
          readonly kind: 'open';
          readonly type: 'info' | 'tip' | 'warning' | 'alert';
          readonly title:
              | {readonly present: false}
              | {readonly present: true; readonly raw: string};
      }
    | {readonly kind: 'close' | 'unsupported'}
);

/**
 * Classify an original core paragraph without modifying it.
 * @param tokens - The original block token array.
 * @param i - The candidate paragraph token index.
 * @returns A copied boundary observation when recognized.
 */
export function recognizeNoteBoundary(
    tokens: readonly NoteToken[],
    i: number,
): NoteBoundary | undefined {
    if (!tokens[i] || !tokens[i + 1]) return undefined;
    const match = matchOpenToken(tokens, i);
    const close = !match && matchCloseToken(tokens, i);
    const wrong = !match && !close && matchWrongNotes(tokens, i);
    if (!match && !close && !wrong) return undefined;
    const map = tokens[i].map;
    const common = {map: map ? ([map[0], map[1]] as const) : null, raw: tokens[i + 1].content};
    if (match) {
        const type = (['info', 'tip', 'warning', 'alert'] as const).find(
            (item) => item === match[1].toLowerCase(),
        );
        if (!type) throw new Error('Invalid recognized note type');
        return {
            kind: 'open',
            ...common,
            type,
            title: match[2] === undefined ? {present: false} : {present: true, raw: match[2]},
        };
    }
    return {kind: close ? 'close' : 'unsupported', ...common};
}
