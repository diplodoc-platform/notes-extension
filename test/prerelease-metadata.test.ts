import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

function run(tag: string, branch = 'codex/notes-Feature') {
    const output = join(mkdtempSync(join(tmpdir(), 'notes-prerelease-')), 'output');
    const result = spawnSync(process.execPath, ['scripts/prerelease-metadata.cjs'], {
        env: {
            ...process.env,
            INPUT_TAG: tag,
            GITHUB_REF_NAME: branch,
            GITHUB_RUN_ID: '123',
            GITHUB_RUN_ATTEMPT: '2',
            GITHUB_OUTPUT: output,
        },
        encoding: 'utf8',
    });
    return {result, output};
}

describe('prerelease metadata', () => {
    it('sanitizes a branch name into a valid version and retains the explicit dist-tag', () => {
        const {result, output} = run('transform5');
        expect(result.status).toBe(0);
        expect(readFileSync(output, 'utf8')).toBe(
            'version=0.0.0-rc.b-codex-notes-feature.123.2\ntag=transform5\n',
        );
    });

    it.each(['latest', '1.2.3', 'bad;command', 'bad\noutput', ''])(
        'rejects unsafe or reserved dist-tag %j',
        (tag) => {
            expect(run(tag).result.status).not.toBe(0);
        },
    );

    it('rejects a branch name with no usable identifier', () => {
        expect(run('transform5', '///').result.status).not.toBe(0);
    });
});
