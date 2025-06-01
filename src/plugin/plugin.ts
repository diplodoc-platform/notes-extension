import type MarkdownIt from 'markdown-it';
import { DEFAULT_LANG } from './const';
import type { Core , StateCore } from 'markdown-it';
import { findCloseTokenIdx, getTitle, matchOpenToken, matchWrongNotes } from './helpers';

interface NotesPluginParams {
    notesAutotitle?: boolean;
    lang?: string;
    path?: string;
    log?: {
        warn: (message: string) => void;
    };
}

export const notesPlugin: MarkdownIt.PluginSimple = (
    md: MarkdownIt,
    {lang = DEFAULT_LANG, notesAutotitle, path: optPath, log}: NotesPluginParams = {},
) => {
    notesAutotitle = typeof notesAutotitle === 'boolean' ? notesAutotitle : true;

    const rule: Core.RuleCore = (state: StateCore) => {
        const {tokens, env} = state;
        const path = env.path || optPath;
        let i = 0;

        while (i < tokens.length) {
            const match = matchOpenToken(tokens, i);

            if (match) {
                // Skip paragraph_close for open token (+1) and paragraph_open for close token (+1)
                // This is minimal useless content length
                const closeTokenIdx = findCloseTokenIdx(tokens, i + 2, path, log);

                if (!closeTokenIdx) {
                    i += 3;
                    continue;
                }

                const type = match[1].toLowerCase();
                const newOpenToken = new state.Token('yfm_note_open', 'div', 1);
                newOpenToken.attrSet('class', `yfm-note yfm-accent-${type}`);
                newOpenToken.attrSet('note-type', type);
                newOpenToken.map = tokens[i].map;
                const closeTokenMap = tokens[closeTokenIdx].map;

                if (closeTokenMap && newOpenToken.map) {
                    newOpenToken.map[1] = closeTokenMap[1];
                }

                const newCloseToken = new state.Token('yfm_note_close', 'div', -1);
                newCloseToken.map = tokens[closeTokenIdx].map;

                // Add extra paragraph
                const titleOpen = new state.Token('yfm_note_title_open', 'p', 1);
                titleOpen.attrSet('class', 'yfm-note-title');
                const autotitle = notesAutotitle ? getTitle(type, lang) : '';
                const titleContent = match[2] === undefined ? autotitle : match[2];
                const titleInline = state.md.parseInline(titleContent, state.env)[0];
                titleInline.map = null;
                const titleClose = new state.Token('yfm_note_title_close', 'p', -1);

                titleOpen.block = true;
                titleClose.block = true;

                const contentOpen = new state.Token('yfm_note_content_open', 'div', 1);
                contentOpen.attrSet('class', 'yfm-note-content');
                const contentClose = new state.Token('yfm_note_content_close', 'div', -1);

                if (newOpenToken.map) {
                    contentOpen.map = [newOpenToken.map[0] + 2, newOpenToken.map[1] - 2];
                }

                const insideTokens = [newOpenToken];
                if (titleInline.content) {
                    insideTokens.push(titleOpen, titleInline, titleClose);
                }

                insideTokens.push(
                    contentOpen,
                    ...tokens.slice(i + 3, closeTokenIdx),
                    contentClose,
                    newCloseToken,
                );

                tokens.splice(i, closeTokenIdx - i + 3, ...insideTokens);

                i++;
            } else if (matchWrongNotes(tokens, i) && tokens[i + 1].content !== '{% endnote %}') {
                log?.warn(`Incorrect syntax for notes${path ? `, file ${path}` : ''}`);

                i += 3;
            } else {
                i++;
            }
        }
    };

    try {
        md.core.ruler.before('curly_attributes', 'notes', rule);
    } catch (e) {
        md.core.ruler.push('notes', rule);
    }
};
