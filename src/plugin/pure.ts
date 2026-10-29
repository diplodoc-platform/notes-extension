export {createNotesPlugin} from './plugin.js';
export {TokenType, TITLES, DEFAULT_LANG} from './const.js';
export type {Lang} from './const.js';
export type {
    NoteParser,
    NoteState,
    NoteToken,
    NotesLogger,
    NotesOptions,
    NotesPlugin,
    NotesDirectivePlugin,
    NotesDirectiveDiagnostic,
    NotesFactoryOptions,
} from './types.js';

export {recognizeNoteBoundary} from './recognize.js';
export type {NoteBoundary} from './recognize.js';
