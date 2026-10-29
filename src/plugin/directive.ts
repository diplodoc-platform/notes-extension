import type {
    BlockContentState,
    ContainerDirectiveParams,
    DirectiveBlockState,
    DirectiveInlineState,
    DirectiveParserHost,
} from '@diplodoc/directive';
import type {NotesDirectiveDiagnostic} from './types.js';

import {
    directiveParser,
    registerContainerDirective,
    tokenizeBlockContent,
} from '@diplodoc/directive';

export type NoteMarker =
    | {
          kind: 'open';
          end: object;
          type: string;
          title: string | undefined;
          contentMap: [number, number];
      }
    | {kind: 'close'};

function invalidReason(
    params: ContainerDirectiveParams,
    state: DirectiveBlockState,
): string | undefined {
    if (params.dests) {
        const suffix = params.inlineContent
            ? state.src
                  .slice(params.inlineContent.endPos + 1, state.eMarks[params.startLine])
                  .trimStart()
            : '';
        if (!params.inlineContent || suffix.startsWith('(') || suffix.startsWith('[')) {
            return 'Destinations are not supported for note directives';
        }
    }
    if (params.contentTitle) return 'Invalid note directive parameters';
    const attrs = params.attrs ?? {};
    for (const name of Object.keys(attrs)) {
        if (name !== 'type') return `Unknown note attribute: ${name}`;
    }
    if (Array.isArray(attrs.type)) return 'Repeated note attribute: type';
    if (!attrs.type || !['info', 'tip', 'warning', 'alert'].includes(attrs.type)) {
        return 'Note type must be info, tip, warning or alert';
    }
    return undefined;
}

export function installNoteDirective<
    B extends DirectiveBlockState & BlockContentState<B>,
    I extends DirectiveInlineState,
>(
    md: DirectiveParserHost<B, I>,
    markers: WeakMap<object, NoteMarker>,
    onDiagnostic?: (diagnostic: NotesDirectiveDiagnostic) => void,
): void {
    directiveParser()(md);
    registerContainerDirective(
        md,
        'note',
        (state, params) => {
            const reason = invalidReason(params, state);
            if (reason) {
                onDiagnostic?.({line: params.startLine + 1, reason});
                return false;
            }
            // The checked scalar value is the only accepted attribute.
            const type = params.attrs?.type;
            if (typeof type !== 'string') throw new Error('Invalid validated note type');
            const open = state.push('yfm_note_directive_open', '', 0);
            open.map = [params.startLine, params.endLine];
            tokenizeBlockContent(state, params.content, 'note-directive');
            const close = state.push('yfm_note_directive_close', '', 0);
            close.map = [params.endLine - 1, params.endLine];
            markers.set(open, {
                kind: 'open',
                end: close,
                type,
                title: params.inlineContent?.raw,
                contentMap: [params.content.startLine, params.content.endLine],
            });
            markers.set(close, {kind: 'close'});
            return true;
        },
        {onConflict: 'error'},
    );
}
