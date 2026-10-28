export interface NoteToken {
    type: string;
    content: string;
    map: [number, number] | null;
    block: boolean;
    attrSet(name: string, value: string): void;
}

export interface NoteState<Token extends NoteToken> {
    tokens: Token[];
    env: Record<string, unknown>;
    Token: new (type: string, tag: string, nesting: -1 | 0 | 1) => Token;
    md: {parseInline(source: string, env: Record<string, unknown>): Token[]};
}

export interface NoteParser<Token extends NoteToken> {
    core: {
        ruler: {
            before(beforeName: string, name: string, rule: (state: NoteState<Token>) => void): void;
            push(name: string, rule: (state: NoteState<Token>) => void): void;
        };
    };
}

export type NotesOptions = {
    lang?: string;
    notesAutotitle?: boolean;
    path?: string;
    log?: NotesLogger;
};

export interface NotesLogger {
    warn(message: string): void;
    error(message: string): void;
}

export type NotesPlugin = <Token extends NoteToken>(
    md: NoteParser<Token>,
    options?: NotesOptions,
) => void;
export type MatchTokenFunction = (
    tokens: NoteToken[],
    index: number,
) => boolean | RegExpMatchArray | null;
