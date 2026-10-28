import type {NotesOptions} from './types.js';

export type Runtime = {style: string; script?: string};
export type RuntimeOption = false | string | Runtime;

export function normalizeRuntime(runtime?: RuntimeOption, bundle = false): Runtime | false {
    if (runtime === false) return false;
    if (typeof runtime === 'string') {
        if (bundle)
            throw new TypeError('Option `runtime` should be record when `bundle` is enabled.');
        return {script: runtime, style: runtime};
    }
    return runtime ?? {style: '_assets/notes-extension.css'};
}

export function semanticOptions(defaults: NotesOptions, settings: NotesOptions): NotesOptions {
    return {
        lang: settings.lang === undefined ? defaults.lang : settings.lang,
        notesAutotitle:
            settings.notesAutotitle === undefined
                ? defaults.notesAutotitle
                : settings.notesAutotitle,
        path: settings.path === undefined ? defaults.path : settings.path,
        log: settings.log === undefined ? defaults.log : settings.log,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function addResources(env: Record<string, unknown>, runtime: Runtime): void {
    const previous = env.meta;
    if (previous !== undefined && !isRecord(previous)) {
        throw new TypeError('Notes resource metadata must be an object.');
    }
    const meta = {...previous};
    for (const key of ['style', 'script'] as const) {
        const resource = runtime[key];
        if (!resource) continue;
        const existing = meta[key];
        let values: unknown[] = [];
        if (Array.isArray(existing)) values = [...existing];
        else if (existing !== undefined) values = [existing];
        if (!values.includes(resource)) values.push(resource);
        meta[key] = values;
    }
    env.meta = meta;
}
