module.exports = {
    root: true,
    ignorePatterns: ['!.*.js'],
    extends: require.resolve('@diplodoc/infra/eslint-config'),
    parserOptions: {tsconfigRootDir: __dirname, project: true},
    overrides: [
        {
            files: ['*.js', '*.mjs', '*.cjs'],
            parserOptions: {project: null},
            env: {node: true, es2022: true},
        },
    ],
};
