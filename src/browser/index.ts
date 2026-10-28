import type {NoteParser, NoteToken, NotesOptions, NotesPlugin} from '../plugin/types.js';
import type {RuntimeOption} from '../plugin/resources.js';

import {createNotesPlugin} from '../plugin/plugin.js';
import {addResources, normalizeRuntime, semanticOptions} from '../plugin/resources.js';
import {TokenType} from '../plugin/const.js';

export type TransformOptions = NotesOptions & {runtime?: RuntimeOption; bundle?: false};
export function transform(options: TransformOptions = {}): NotesPlugin {
    if (options.bundle !== undefined && options.bundle !== false) {
        throw new TypeError('Browser notes extension cannot copy runtime files.');
    }
    const runtime = normalizeRuntime(options.runtime);
    return function plugin<Token extends NoteToken>(
        md: NoteParser<Token>,
        settings: NotesOptions = {},
    ): void {
        createNotesPlugin(undefined, runtime ? (env) => addResources(env, runtime) : undefined)(
            md,
            semanticOptions(options, settings),
        );
    };
}
export {TokenType};
export type {NotesOptions, NotesLogger} from '../plugin/types.js';
export default {transform, TokenType};
