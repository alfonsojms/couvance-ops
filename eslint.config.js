import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      '**/dist',
      'data',
      'drizzle',
      'coverage',
      'test-results',
      'playwright-report',
      '.wrangler',
      '.atl',
      '.agents',
      '.claude',
      '.codegraph',
      '.playwright',
      'logs-github',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Las cargas usan useAsyncData y los reinicios por props useChanged: setState en un efecto rompe el CI.
      'react-hooks/set-state-in-effect': 'error',
    },
  },
  {
    files: ['src/server/**/*.ts', 'functions/**/*.ts', '*.config.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.serviceworker } },
  },
  {
    files: ['test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser, ...globals.vitest } },
  },
  {
    rules: {
      // Los errores capturados son `unknown` (ver lib/errors.ts); la única excepción es JsonBody en los tests.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  prettier,
);
