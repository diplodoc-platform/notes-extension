import type {Token} from 'markdown-it';

export interface MatchTokenFunction {
    (tokens: Token[], i: number): boolean | RegExpMatchArray | null;
}

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
