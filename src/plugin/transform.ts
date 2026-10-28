import type MarkdownItConstructor from 'markdown-it' with {'resolution-mode': 'import'};
import type {NoteParser, NoteToken, NotesOptions} from './types.js';
import type {Runtime, RuntimeOption} from './resources.js';

import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {copyFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

import {createNotesPlugin} from './plugin.js';
import {addResources, normalizeRuntime, semanticOptions} from './resources.js';

declare const __MODULE_PATH__: string;

export type TransformOptions = NotesOptions & {runtime?: RuntimeOption; bundle?: boolean};
export type PluginOptions = NotesOptions & {output?: string};
export type CollectOptions = NotesOptions & {destRoot?: string};
export interface NotesTransformPlugin {
    <Token extends NoteToken>(md: NoteParser<Token>, settings?: PluginOptions): void;
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

export function transform(options: TransformOptions = {}): NotesTransformPlugin {
    const {bundle = true} = options;
    const runtime = normalizeRuntime(options.runtime, bundle);
    const copiedByDocument = new WeakMap<Record<string, unknown>, Set<string>>();
    function plugin<Token extends NoteToken>(
        md: NoteParser<Token>,
        settings: PluginOptions = {},
    ): void {
        const semantic = semanticOptions(options, settings);
        createNotesPlugin(
            undefined,
            runtime
                ? (env) => {
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
                : undefined,
        )(md, semantic);
    }
    return Object.assign(plugin, {
        collect(input: string, {destRoot = '.', ...settings}: CollectOptions = {}): void {
            const MarkdownIt: typeof MarkdownItConstructor =
                createRequire(__MODULE_PATH__)('markdown-it');
            new MarkdownIt().use(plugin, {...settings, output: destRoot}).parse(input, {});
        },
    });
}
