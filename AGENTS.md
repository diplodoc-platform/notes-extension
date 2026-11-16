# Agent guide

`@diplodoc/notes-extension` is a standalone Diplodoc package. In the metapackage,
follow `.agents/core.md`, `.agents/monorepo.md`, `.agents/style-and-testing.md`
and `.agents/dev-infrastructure.md`; use normal hooks and Conventional Commits.

The pure parser lives in `src/plugin`, with explicit Node and browser adapters.
The runtime stylesheet and Sass mixin are public exports. Preserve all public
CJS/ESM declarations, resource behavior and computed styles when changing them.
The custom build emits these multiple Node/browser entries, dual declarations,
CSS and Sass; it deliberately remains separate from the generic Infra build.
Use `@diplodoc/infra/esbuild` for bundling and Infra's Husky command for hooks.
Sass remains a direct dependency for compiling styles and testing package imports.

Use Node 24 and npm 11.5.1 or newer. Run `npm ci --no-workspaces`, `npm run lint`,
`npm run typecheck`, `npm test`, `npm run build` and `npm run test:package`.
Package tests require Playwright Chromium and test installed native markdown-it
13, 14 and 15. Work outside the metapackage when proving standalone installs.
Infra owns generated scaffolding; `.infrarc.yml` records bounded exceptions.
Release prerequisites are documented in `docs/release-process.md`.
Do not publish or modify GitHub settings without explicit authorization.
