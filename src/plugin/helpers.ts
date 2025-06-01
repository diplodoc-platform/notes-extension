import type {Token} from 'markdown-it';
import { DEFAULT_LANG, TITLES } from './const';

export interface MatchTokenFunction {
    (tokens: Token[], i: number): boolean | RegExpMatchArray | null;
}

const ALERT_RE = /^{% note (alert|info|tip|warning)\s*(?:"(.*?)")? %}$/;
const WRONG_NOTES = /^{% note (.*)%}/;

export function matchOpenToken(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(ALERT_RE)
    );
}

export const matchCloseToken: MatchTokenFunction = (tokens: Token[], i: number) => {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endnote %}'
    );
};

export function getTitle(type: string, originLang: string) {
    let lang = originLang;

    if (!lang || !Object.keys(TITLES).includes(lang)) {
        lang = DEFAULT_LANG;
    }

    return TITLES[lang as keyof typeof TITLES][type];
}

export function matchWrongNotes(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(WRONG_NOTES)
    );
}

export const findCloseTokenIdx = nestedCloseTokenIdxFactory('Note', matchOpenToken, matchCloseToken);

export function nestedCloseTokenIdxFactory(
    name: string,
    matchOpenToken: MatchTokenFunction,
    matchCloseToken: MatchTokenFunction,
) {
    return (tokens: Token[], startIdx: number, path?: string, log?: { warn: (message: string) => void }): number | null => {
        let level = 1;
        let i = startIdx;

        while (i < tokens.length) {
            if (matchOpenToken(tokens, i)) {
                level++;
                i += 3;
            } else if (matchCloseToken(tokens, i)) {
                level--;
                if (level === 0) {
                    return i;
                }
                i += 3;
            } else {
                i++;
            }
        }

        if (log && path) {
            log.warn(`Unclosed ${name} tag in file ${path}`);
        }

        return null;
    };
}
