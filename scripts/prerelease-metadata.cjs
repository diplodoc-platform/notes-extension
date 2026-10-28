'use strict';

const {appendFileSync} = require('node:fs');

const {
    INPUT_TAG: tag,
    GITHUB_REF_NAME: branch,
    GITHUB_RUN_ID: run,
    GITHUB_RUN_ATTEMPT: attempt,
    GITHUB_OUTPUT: output,
} = process.env;
if (!tag || !/^[a-z][a-z0-9-]{0,63}$/.test(tag) || tag === 'latest') {
    throw new Error(
        'The prerelease dist-tag must start with a lowercase letter, contain only lowercase letters, digits or hyphens, and must not be latest.',
    );
}
if (
    !branch ||
    !/^[1-9][0-9]*$/.test(run || '') ||
    !/^[1-9][0-9]*$/.test(attempt || '') ||
    !output
) {
    throw new Error('Missing GitHub branch, numeric run identifier, attempt, or output path.');
}
const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
if (!slug) {
    throw new Error('Branch name cannot produce an empty prerelease identifier.');
}
appendFileSync(output, `version=0.0.0-rc.b-${slug}.${run}.${attempt}\ntag=${tag}\n`);
