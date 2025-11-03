module.exports = {
    root: true,
    env: { es2021: true, node: true, jest: true },
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
    },
    settings: { react: { version: 'detect' } },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
    ],
    plugins: ['react'],
    rules: {
        // Disable core indent globally to avoid known recursion issues
        indent: 'off',
        // Relax common noisy rules; TS handles most of these
        'no-unused-vars': 'off',
        'no-redeclare': 'off',
    },
    overrides: [{
            files: ['*.ts', '*.tsx'],
            parser: '@typescript-eslint/parser',
            plugins: ['@typescript-eslint'],
            rules: {
                // Disable TS indent rule as well (deprecated in typescript-eslint)
                '@typescript-eslint/indent': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                '@typescript-eslint/no-redeclare': 'off',
                // Disable prop-types for TypeScript files since TS provides type checking
                'react/prop-types': 'off',
            },
        },
        {
            files: ['**/*.d.ts'],
            rules: {
                'no-undef': 'off',
                'no-unused-vars': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
            },
        },
    ],
};