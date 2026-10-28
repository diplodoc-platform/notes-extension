import type {MatchTokenFunction, NoteToken, NotesLogger} from './types.js';

/**
 * Bind the existing close-token search to the host's path formatter.
 * @param formatPath - Plain browser or original terminal path formatting.
 * @returns The existing finite token-search factory.
 */
export function createNestedCloseTokenIdxFactory(formatPath: (path: string) => string) {
    const nestedCloseTokenIdxFactory =
        (
            tokenName: string,
            matchOpenToken: MatchTokenFunction,
            matchCloseToken: MatchTokenFunction,
        ) =>
        (tokens: NoteToken[], idx: number, path: string, log: NotesLogger) => {
            let level = 0;
            let i = idx;
            while (i < tokens.length) {
                if (matchOpenToken(tokens, i)) {
                    level++;
                } else if (matchCloseToken(tokens, i)) {
                    if (level === 0) {
                        return i;
                    }
                    level--;
                }

                i++;
            }

            log.error(`${tokenName} must be closed${path ? ` in ${formatPath(path)}` : ''}`);

            return null;
        };

    return nestedCloseTokenIdxFactory;
}
