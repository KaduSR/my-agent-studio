import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      // SPEC 67: user content must never reach the HTML parser.
      'no-restricted-properties': [
        'error',
        { object: '*', property: 'innerHTML', message: 'Use h()/textContent — SPEC 67 forbids innerHTML.' },
        { object: '*', property: 'outerHTML', message: 'Use h()/textContent — SPEC 67 forbids outerHTML.' },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'event', message: 'Use the handler parameter instead of the global event.' },
      ],
    },
  },
  {
    files: ['tests/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
]
