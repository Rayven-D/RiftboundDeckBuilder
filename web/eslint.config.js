// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

// V-011 / SPEC-010 SYNC-130: Firebase (and other host SDKs) only in the lazy-loaded adapter folder.
const HOST_SDKS = ['firebase', 'firebase/*', '@firebase/*', 'firebase-admin', 'firebase-admin/*', 'aws-sdk', '@aws-sdk/*', '@google-cloud/*'];

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: HOST_SDKS, message: 'Host SDKs belong in src/app/core/sync/adapters/ only (V-011, SYNC-130).' }] },
      ],
      // The same for dynamic import('firebase/...') and friends.
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportExpression[source.value=/^(@?firebase|@?aws-sdk|@google-cloud)/]",
          message: 'Host SDKs belong in src/app/core/sync/adapters/ only (V-011, SYNC-130).',
        },
      ],
    },
  },
  {
    files: ['src/app/core/sync/adapters/**/*.ts'],
    rules: { 'no-restricted-imports': 'off', 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
