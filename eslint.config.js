import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Build/asset tools run in Node and report progress on the console.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  {
    // The simulation layer and game data must stay engine-agnostic (testable, deterministic,
    // reusable for online play). See docs/ARCHITECTURE.md.
    files: [
      'src/core/**/*.ts',
      'src/types/**/*.ts',
      'src/controllers/**/*.ts',
      'src/fighters/**/*.ts',
      'src/stages/**/*.ts',
      'src/config/**/*.ts',
      'src/story/**/*.ts',
      'src/audio/MusicManager.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser'], message: 'This layer must not depend on Phaser.' },
            {
              group: ['**/scenes/**', '**/render/**', '**/ui/**', '**/input/**'],
              message: 'Pure layers must not import presentation code.',
            },
          ],
        },
      ],
    },
  },
);
