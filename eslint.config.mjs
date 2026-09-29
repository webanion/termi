import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

const NODE = {
  group: ['node:*', 'fs', 'fs/*', 'path', 'os', 'child_process', 'readline', 'node-pty'],
  message: 'The renderer is sandboxed and has no Node, and shared code runs there too.',
};
const ELECTRON = {
  group: ['electron', 'electron/*'],
  message: 'Only the main process and the preload may import electron.',
};
// A path that climbs out of its folder, unless it leaves src for assets/ or package.json.
const PARENT = {
  regex: '^(\\.\\./)+(?!\\.\\./|assets/|package\\.json$)',
  message: 'Import from another folder of src with @/, as in @/shared/types.',
};

export default [
  {
    ignores: ['out/**', '_releases/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
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
      'no-restricted-imports': ['error', { patterns: [PARENT] }],
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [PARENT, NODE, ELECTRON] }] },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
  },
  // Shared code is loaded by every process, the sandboxed renderer included.
  {
    files: ['src/shared/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [PARENT, NODE, ELECTRON] }] },
  },
  // The MCP server runs under plain Node.
  {
    files: ['src/mcp/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [PARENT, ELECTRON] }] },
  },
  prettier,
];
