import type MarkdownIt from 'markdown-it';

export interface MarkdownItPluginCb<T = any> {
    (md: MarkdownIt, options?: T): void;
}
