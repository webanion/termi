import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

const NODE = {
  group: ['node:*', 'fs', 'fs/*', 'path', 'os', 'child_process', 'readline', 'node-pty'],
  message: 'The renderer is sandboxed and has no Node. Go through window.termi.',
};
const ELECTRON = {
  group: ['electron', 'electron/*'],
  message: 'Only the main process and the preload may import electron.',
};

export default [
  {
    ignores: ['out/**', '_releases/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.node.json', './tsconfig.web.json'],
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['src/renderer/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NODE, ELECTRON] }] },
  },
  // The MCP server runs under plain Node, and shared code is loaded by every process.
  {
    files: ['src/mcp/**/*.ts', 'src/shared/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [ELECTRON] }] },
  },
  prettier,
];
