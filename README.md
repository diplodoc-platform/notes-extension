# Diplodoc notes extension

A synchronous MarkdownIt plugin for the existing `{% note info %}` / `{% endnote %}` syntax. This is a Transform 5 prerelease candidate; publication is separate from source review.

## Node use

```typescript
import MarkdownIt from 'markdown-it';
import {transform, TokenType} from '@diplodoc/notes-extension';

const notes = transform({
  runtime: {style: '_assets/notes-extension.css'},
});
const md = new MarkdownIt().use(notes, {
  lang: 'fr',
  notesAutotitle: true,
  path: 'guide.md',
  output: './public',
  log: {warn: console.warn, error: console.error},
});
const env = {};
const source = '{% note info "Title" %}\n\nBody\n\n{% endnote %}';
const html = md.render(source, env);
notes.collect(source, {destRoot: './public', lang: 'fr'});
```

The root exports named `transform` and `TokenType`, and a default namespace containing the same values. `transform()` returns a callable plugin with a typed `.collect()` method. CJS and ESM entry points are provided.

`lang`, `notesAutotitle`, `path` and `log` may be supplied as factory defaults or through the real `md.use(plugin, settings)` call. Defined callback settings override factory defaults. Language defaults to Russian, matching the accepted Transform notes behavior. Supported languages are ru, en, ar, cs, fr, es, he, bg, et, el, pt, zh, zh-tw, kk, tr and uz; unknown/empty values fall back to Russian.

Automatic titles remain enabled by default. `notesAutotitle: false` disables only the automatic title; explicit titles, inline title markup and explicit empty `""` titles retain their meaning. Supported kinds are info, tip, alert and warning. No colon syntax is added.

A supplied logger must implement both `warn` and `error`. Incorrect syntax is a warning; an unclosed note is an error. Messages and path precedence match the accepted implementation. Omitting the logger is explicitly quiet; it does not create a global logger.

## Browser and prebundled hosts

```typescript
import MarkdownIt from 'markdown-it';
import {transform} from '@diplodoc/notes-extension/browser';
import '@diplodoc/notes-extension/runtime/styles.css';

const md = new MarkdownIt().use(transform({runtime: false}), {lang: 'en'});
```

Render HTML inside a `.yfm` container. The browser entry does not import Node modules, construct a parser, copy files or expose `.collect()`. Its optional `bundle` setting can only be false. Native13/14 browser hosts can use their official MarkdownIt browser distributions; their Node root entry has host-specific builtin requirements. Native15's ordinary root ESM entry is browser-bundle compatible. Extension graph purity does not change those host entry contracts.

`@diplodoc/notes-extension/plugin` exposes the pure `createNotesPlugin(formatPath?, onNote?)` factory, `TokenType`, the canonical `TITLES` dictionary, `DEFAULT_LANG`, and finite public types including `Lang`. The dictionary exports let retained Transform constants paths delegate to this single source. It emits no assets. Transform's built-in bridge can bind its existing diagnostic formatter and reuse its own bundled styles. No private MarkdownIt State imports or Transform dependency are required.

## Resources and styles

- Default standalone resource: `_assets/notes-extension.css`. Notes have no active client JavaScript behavior; no script is emitted by default.
- `runtime: false`: no resource metadata or copies, suitable for a host that bundles CSS itself.
- `bundle: false`: retain resource references but do not copy files. Node default is true.
- `runtime: {style, script?}`: custom targets. An explicit legacy script target receives an empty classic-compatible runtime file.
- Legacy `runtime: 'path'` with `bundle:false` retains its historical mapping to both script and style references. Prefer the unambiguous object form. A string with copying enabled remains an error.
- `.collect(input, {destRoot, ...settings})` parses with the installed public MarkdownIt constructor and copies used assets to that destination. It returns void.

No real note means no resource emission/copy. Metadata is deduplicated in first-seen order, preserving authored values and arrays without mutating shared arrays. Resource metadata must be an object. A fresh document must use a fresh environment; copying is deduplicated by environment identity and actual destination, without a global cache.

`/runtime/styles` and `/runtime/styles.css` resolve to the same scoped CSS including print behavior. `/runtime` remains an importable empty compatibility entry. `/scss/notes` provides the canonical `notes-body` and `notes-print` mixins so host bundles can retain their original cascade positions without duplicating CSS. Do not import both compiled CSS and the same mixins into one output.

The old private prototype advertised `/react` without any source/build target. That placeholder is removed; this package does not implement a React component. Existing supported Transform notes paths must remain bridges under its separate deprecation policy.

## Validation and development

```sh
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:package
npm run lint
```

The installed package gate checks native13/14/15, strict CJS/ESM declarations, all export targets, real copy/collect/resources, and actual browser/style behavior. Tests do not update visual snapshots. Stable adoption requires a separate release decision and actual consumer migration checks.
