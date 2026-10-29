import type MarkdownItConstructor from 'markdown-it' with {'resolution-mode': 'import'};
import type {
    BlockContentState,
    DirectiveBlockState,
    DirectiveInlineState,
    DirectiveParserHost,
} from '@diplodoc/directive';
import type {NoteParser, NoteToken, NotesFactoryOptions, NotesOptions} from './types.js';
import type {Runtime, RuntimeOption} from './resources.js';

import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {copyFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

import {createNotesPlugin} from './plugin.js';
import {addResources, normalizeRuntime, semanticOptions} from './resources.js';

declare const __MODULE_PATH__: string;

export type TransformOptions = NotesOptions &
    NotesFactoryOptions & {runtime?: RuntimeOption; bundle?: boolean};
export type PluginOptions = NotesOptions & {output?: string};
export type CollectOptions = NotesOptions & {destRoot?: string};
export interface NotesTransformPlugin {
    <Token extends NoteToken>(md: NoteParser<Token>, settings?: PluginOptions): void;
    collect(input: string, options?: CollectOptions): void;
}
export interface NotesDirectiveTransformPlugin {
    <
        Token extends NoteToken,
        Block extends DirectiveBlockState & BlockContentState<Block>,
        Inline extends DirectiveInlineState,
    >(
        md: NoteParser<Token> & DirectiveParserHost<Block, Inline>,
        settings?: PluginOptions,
    ): void;
    collect(input: string, options?: CollectOptions): void;
}

function copyRuntime(runtime: Runtime, output: string, copied: Set<string>): void {
    const moduleUrl = __MODULE_PATH__.startsWith('file:')
        ? new URL(__MODULE_PATH__)
        : pathToFileURL(__MODULE_PATH__);
    const runtimeDirectory = fileURLToPath(new URL('../runtime/', moduleUrl));
    for (const [name, target] of [
        ['index.css', runtime.style],
        ['index.cjs', runtime.script],
    ] as const) {
        if (!target) continue;
        const destination = resolve(join(output, target));
        if (copied.has(destination)) continue;
        mkdirSync(dirname(destination), {recursive: true});
        copyFileSync(join(runtimeDirectory, name), destination);
        copied.add(destination);
    }
}

export function transform(
    options?: TransformOptions & {directiveSyntax?: 'disabled'},
): NotesTransformPlugin;
export function transform(
    options: TransformOptions & {directiveSyntax: 'enabled' | 'only'},
): NotesDirectiveTransformPlugin;
export function transform(
    options: TransformOptions,
): NotesTransformPlugin | NotesDirectiveTransformPlugin;
export function transform(
    options: TransformOptions = {},
): NotesTransformPlugin | NotesDirectiveTransformPlugin {
    const {bundle = true} = options;
    const runtime = normalizeRuntime(options.runtime, bundle);
    const copiedByDocument = new WeakMap<Record<string, unknown>, Set<string>>();
    const onNote = (settings: PluginOptions) =>
        runtime
            ? (env: Record<string, unknown>) => {
                  addResources(env, runtime);
                  if (bundle) {
                      let copied = copiedByDocument.get(env);
                      if (!copied) {
                          copied = new Set<string>();
                          copiedByDocument.set(env, copied);
                      }
                      copyRuntime(runtime, settings.output ?? '.', copied);
                  }
              }
            : undefined;
    function legacyPlugin<Token extends NoteToken>(
        md: NoteParser<Token>,
        settings: PluginOptions = {},
    ): void {
        createNotesPlugin(undefined, onNote(settings))(md, semanticOptions(options, settings));
    }
    const mode = options.directiveSyntax;
    function directivePlugin<
        Token extends NoteToken,
        Block extends DirectiveBlockState & BlockContentState<Block>,
        Inline extends DirectiveInlineState,
    >(
        md: NoteParser<Token> & DirectiveParserHost<Block, Inline>,
        settings: PluginOptions = {},
    ): void {
        if (mode !== 'enabled' && mode !== 'only') throw new Error('Directive mode is disabled');
        createNotesPlugin(undefined, onNote(settings), {
            directiveSyntax: mode,
            onDiagnostic: options.onDiagnostic,
        })(md, semanticOptions(options, settings));
    }
    const collector = {
        collect(input: string, {destRoot = '.', ...settings}: CollectOptions = {}): void {
            const MarkdownIt: typeof MarkdownItConstructor =
                createRequire(__MODULE_PATH__)('markdown-it');
            const md = new MarkdownIt();
            if (mode === 'enabled' || mode === 'only')
                md.use(directivePlugin, {...settings, output: destRoot});
            else md.use(legacyPlugin, {...settings, output: destRoot});
            md.parse(input, {});
        },
    };
    return mode === 'enabled' || mode === 'only'
        ? Object.assign(directivePlugin, collector)
        : Object.assign(legacyPlugin, collector);
}
