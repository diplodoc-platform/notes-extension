/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import * as sass from 'sass';

const directory = mkdtempSync(join(tmpdir(), 'notes-package-'));
const root = process.cwd();
const run = (args, cwd) =>
    execFileSync(args[0], args.slice(1), {cwd, stdio: 'pipe', env: process.env});
const npmPath = process.env.npm_execpath;
assert.ok(npmPath, 'Run this gate through npm run test:package.');
const runNpm = (args, cwd) => run([process.execPath, npmPath, ...args], cwd);
const packed = JSON.parse(
    runNpm(['pack', '--json', '--pack-destination', directory], root).toString(),
)[0];
const tar = join(directory, packed.filename);
const results = [];
for (const [version, types] of [
    ['13.0.2', '13.0.9'],
    ['14.1.0', '14.1.2'],
    ['15.0.3', null],
]) {
    const fixture = join(directory, version);
    mkdirSync(fixture);
    const deps = {
        '@diplodoc/notes-extension': `file:${tar}`,
        'markdown-it': version,
        typescript: '6.0.3',
        '@types/node': '22.19.11',
    };
    if (types) deps['@types/markdown-it'] = types;
    writeFileSync(
        join(fixture, 'package.json'),
        JSON.stringify({private: true, dependencies: deps}),
    );
    runNpm(['install', '--no-audit', '--no-fund'], fixture);
    const installed = join(fixture, 'node_modules/@diplodoc/notes-extension');
    const manifest = JSON.parse(readFileSync(join(installed, 'package.json')));
    const targets = (value) =>
        typeof value === 'string' ? [value] : Object.values(value).flatMap(targets);
    for (const target of targets(manifest.exports))
        assert.ok(existsSync(join(installed, target)), target);
    for (const file of packed.files)
        assert.deepEqual(
            readFileSync(join(installed, file.path)),
            readFileSync(join(root, file.path)),
            file.path,
        );
    const css = sass.compileString(
        "@use 'pkg:@diplodoc/notes-extension/scss/notes'; .yfm .yfm-note { @include notes.notes-body; } @include notes.notes-print;",
        {importers: [new sass.NodePackageImporter(fixture)]},
    ).css;
    assert.equal(
        css,
        readFileSync(join(installed, manifest.exports['./runtime/styles.css']), 'utf8'),
    );
    run(
        [
            'node',
            '--input-type=module',
            '-e',
            "import assert from 'node:assert/strict'; import {createRequire} from 'node:module'; assert.deepEqual(createRequire(import.meta.url)('@diplodoc/notes-extension/runtime'), {}); assert.deepEqual(Object.keys(await import('@diplodoc/notes-extension/runtime')), []);",
        ],
        fixture,
    );
    const body = `import notes, {transform, TokenType} from '@diplodoc/notes-extension';
import {createNotesPlugin, TITLES, DEFAULT_LANG, type Lang} from '@diplodoc/notes-extension/plugin';
import {transform as browserTransform} from '@diplodoc/notes-extension/browser';
import '@diplodoc/notes-extension/runtime';
import {mkdirSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const text='{% note info %}\\n\\nBody\\n\\n{% endnote %}';
assert.equal(notes.transform,transform);
assert.equal(TokenType.NoteTitleClose,'yfm_note_title_close');
const language:Lang=DEFAULT_LANG;assert.equal(language,'ru');assert.equal(Object.keys(TITLES).length,16);assert.equal(TITLES[language].info,'Примечание');
const plain = new MarkdownIt().use(createNotesPlugin());
assert.ok(plain.render(text).includes('Примечание'));
const errors:string[]=[];const warnings:string[]=[];
const diagnosed=new MarkdownIt().use(createNotesPlugin(p=>'['+p+']'),{path:'page.md',log:{warn:(m:string)=>warnings.push(m),error:(m:string)=>errors.push(m)}});
diagnosed.parse('{% note info %}',{});diagnosed.parse('{% note wrong %}',{});
assert.deepEqual(errors,['Note must be closed in [page.md]']);assert.deepEqual(warnings,['Incorrect syntax for notes, file [page.md]']);
const plugin=transform({lang:'fr',notesAutotitle:false,runtime:{style:'assets/notes.css'}});
const destination=join(process.cwd(),'output with spaces');mkdirSync(destination,{recursive:true});
const md=new MarkdownIt().use(plugin,{notesAutotitle:true,output:destination});
const env:Record<string,unknown>={};assert.ok(md.render(text,env).includes('Remarque'));
assert.deepEqual(env,{meta:{style:['assets/notes.css']}});assert.ok(readFileSync(join(destination,'assets/notes.css'),'utf8').includes('.yfm .yfm-note'));
const untouched=join(process.cwd(),'no note');new MarkdownIt().use(plugin,{output:untouched}).render('plain',{});assert.equal(existsSync(untouched),false);
plugin.collect(text,{destRoot:join(process.cwd(),'collect output')});assert.ok(existsSync(join(process.cwd(),'collect output/assets/notes.css')));
const suppressed:Record<string,unknown>={};new MarkdownIt().use(transform({runtime:false})).render(text,suppressed);assert.deepEqual(suppressed,{});
const secondDestination=join(process.cwd(),'second output');new MarkdownIt().use(plugin,{output:secondDestination}).render(text,env);assert.ok(existsSync(join(secondDestination,'assets/notes.css')));
const references:Record<string,unknown>={};const noCopy=join(process.cwd(),'references only');new MarkdownIt().use(transform({bundle:false,runtime:{style:'custom.css',script:'custom.js'}}),{output:noCopy}).render(text,references);assert.deepEqual(references,{meta:{style:['custom.css'],script:['custom.js']}});assert.equal(existsSync(noCopy),false);
const explicitScripts=join(process.cwd(),'explicit script');new MarkdownIt().use(transform({runtime:{style:'custom.css',script:'custom.js'}}),{output:explicitScripts}).render(text,{});assert.equal(readFileSync(join(explicitScripts,'custom.js'),'utf8'),'"use strict";\\n');
const collectedErrors:string[]=[];plugin.collect('{% note info %}',{path:'collected.md',log:{warn:()=>{},error:(message:string)=>collectedErrors.push(message)}});assert.deepEqual(collectedErrors,['Note must be closed in collected.md']);
const browserEnv:Record<string,unknown>={};new MarkdownIt().use(browserTransform({lang:'en'})).render(text,browserEnv);assert.deepEqual(browserEnv,{meta:{style:['_assets/notes-extension.css']}});
assert.throws(()=>transform({runtime:'asset',bundle:true}),TypeError);
assert.throws(() => {
// @ts-expect-error Browser entry must not accept filesystem copying.
browserTransform({bundle:true});
}, /cannot copy runtime files/);
// @ts-expect-error A supplied diagnostic logger must retain both severity channels.
transform({log:{warn:(_message:string)=>{}}});
`;
    for (const extension of ['cts', 'mts']) {
        const header =
            extension === 'cts'
                ? `import type MarkdownItConstructor from 'markdown-it' with {'resolution-mode':'import'};\nimport {createRequire} from 'node:module';\nconst MarkdownIt:typeof MarkdownItConstructor=createRequire(__filename)('markdown-it');\n`
                : `import MarkdownIt from 'markdown-it';\n`;
        writeFileSync(join(fixture, `test.${extension}`), header + body);
    }
    writeFileSync(
        join(fixture, 'tsconfig.json'),
        JSON.stringify({
            compilerOptions: {
                target: 'ES2022',
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                strict: true,
                skipLibCheck: false,
                types: ['node'],
                outDir: 'compiled',
            },
            include: ['test.cts', 'test.mts'],
        }),
    );
    run(['node', 'node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], fixture);
    run(['node', 'compiled/test.cjs'], fixture);
    run(['node', 'compiled/test.mjs'], fixture);
    const browserEntry = join(fixture, 'browser.mjs');
    writeFileSync(
        browserEntry,
        `${version === '15.0.3' ? "import MarkdownIt from 'markdown-it';" : 'const MarkdownIt = globalThis.markdownit;'}import {transform} from '@diplodoc/notes-extension/browser';const env={};document.body.innerHTML=new MarkdownIt().use(transform({lang:'fr',runtime:false})).render('{% note info %}\\n\\nBody\\n\\n{% endnote %}',env);if(document.querySelector('.yfm-note-title')?.textContent!=='Remarque'||Object.keys(env).length)throw Error('notes browser contract');document.body.dataset.notes='passed';`,
    );
    const bundle = await build({
        entryPoints: [browserEntry],
        bundle: true,
        platform: 'browser',
        format: 'esm',
        write: false,
        metafile: true,
        target: 'es2022',
    });
    assert.ok(
        Object.values(bundle.metafile.outputs).every((output) => output.imports.length === 0),
    );
    assert.ok(
        !Object.keys(bundle.metafile.inputs).some((input) => input.includes('@diplodoc/transform')),
    );
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(String(error)));
        await page.route('**/*', (route) => route.abort());
        await page.routeWebSocket('**/*', (socket) => socket.close());
        await page.setContent('<html><body class="yfm"></body></html>');
        await page.addStyleTag({
            content: readFileSync(join(installed, 'build/runtime/index.css'), 'utf8'),
        });
        if (version !== '15.0.3') {
            await page.addScriptTag({
                path: join(fixture, 'node_modules/markdown-it/dist/markdown-it.js'),
            });
        }
        await page.addScriptTag({type: 'module', content: bundle.outputFiles[0].text});
        await page.waitForFunction(() => document.body.dataset.notes === 'passed');
        assert.deepEqual(pageErrors, []);
        assert.equal(
            await page
                .locator('.yfm-note')
                .evaluate((element) => getComputedStyle(element).paddingLeft),
            '64px',
        );
        await page.emulateMedia({media: 'print'});
        assert.equal(
            await page
                .locator('.yfm-note')
                .evaluate((element) => getComputedStyle(element).breakInside),
            'avoid',
        );
    } finally {
        await browser.close();
    }
    results.push({
        version,
        strictCjsEsm: true,
        copyCollectResources: true,
        actualBrowser: true,
        exportTargets: true,
        files: packed.files.length,
    });
}
writeFileSync(
    join(directory, 'results.json'),
    JSON.stringify(
        {tar, sha256: createHash('sha256').update(readFileSync(tar)).digest('hex'), results},
        null,
        2,
    ),
);
process.stdout.write(JSON.stringify({directory, results}, null, 2) + '\n');
