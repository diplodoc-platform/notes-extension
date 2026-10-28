import {build} from 'esbuild';
import * as sass from 'sass';
import {execFileSync} from 'node:child_process';
import {cpSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';

rmSync('build', {recursive: true, force: true});
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.publish.json'], {
    stdio: 'inherit',
});
for (const format of ['cjs', 'esm']) {
    const outdir = `build/${format}`;
    cpSync('build/types', outdir, {recursive: true});
    writeFileSync(
        `${outdir}/package.json`,
        JSON.stringify({type: format === 'esm' ? 'module' : 'commonjs'}),
    );
    await build({
        entryPoints: {
            index: 'src/plugin/index.ts',
            plugin: 'src/plugin/pure.ts',
            browser: 'src/browser/index.ts',
        },
        outdir,
        format,
        platform: 'node',
        packages: 'external',
        bundle: true,
        sourcemap: true,
        target: 'es2022',
        define: {__MODULE_PATH__: format === 'esm' ? 'import.meta.url' : '__filename'},
    });
}
mkdirSync('build/runtime', {recursive: true});
writeFileSync('build/runtime/index.css', sass.compile('src/runtime/styles/note.scss').css);
writeFileSync('build/runtime/index.mjs', 'export {};\n');
writeFileSync('build/runtime/index.cjs', '"use strict";\n');
writeFileSync('build/runtime/index.d.ts', 'export {};\n');
mkdirSync('build/scss', {recursive: true});
cpSync('src/runtime/styles/_notes.scss', 'build/scss/_notes.scss');
