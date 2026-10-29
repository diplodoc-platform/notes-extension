import type {
    NoteParser,
    NoteToken,
    NotesDirectivePlugin,
    NotesFactoryOptions,
    NotesOptions,
    NotesPlugin,
} from '../plugin/types.js';
import type {RuntimeOption} from '../plugin/resources.js';

import {createNotesPlugin} from '../plugin/plugin.js';
import {addResources, normalizeRuntime, semanticOptions} from '../plugin/resources.js';
import {TokenType} from '../plugin/const.js';

export type TransformOptions = NotesOptions &
    NotesFactoryOptions & {runtime?: RuntimeOption; bundle?: false};
export function transform(options?: TransformOptions & {directiveSyntax?: 'disabled'}): NotesPlugin;
export function transform(
    options: TransformOptions & {directiveSyntax: 'enabled' | 'only'},
): NotesDirectivePlugin;
export function transform(options: TransformOptions): NotesPlugin | NotesDirectivePlugin;
export function transform(options: TransformOptions = {}): NotesPlugin | NotesDirectivePlugin {
    if (options.bundle !== undefined && options.bundle !== false) {
        throw new TypeError('Browser notes extension cannot copy runtime files.');
    }
    const runtime = normalizeRuntime(options.runtime);
    const onNote = runtime
        ? (env: Record<string, unknown>) => addResources(env, runtime)
        : undefined;
    const mode = options.directiveSyntax;
    if (mode === 'enabled' || mode === 'only') {
        const directive = createNotesPlugin(undefined, onNote, {
            directiveSyntax: mode,
            onDiagnostic: options.onDiagnostic,
        });
        const plugin: NotesDirectivePlugin = (md, settings = {}) =>
            directive(md, semanticOptions(options, settings));
        return plugin;
    }
    return function plugin<Token extends NoteToken>(
        md: NoteParser<Token>,
        settings: NotesOptions = {},
    ): void {
        createNotesPlugin(undefined, onNote)(md, semanticOptions(options, settings));
    };
}
export {TokenType};
export type {
    NotesOptions,
    NotesLogger,
    NotesDirectiveDiagnostic,
    NotesFactoryOptions,
    NotesDirectivePlugin,
} from '../plugin/types.js';
export default {transform, TokenType};
