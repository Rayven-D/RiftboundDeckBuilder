// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// V-011 (ADR-0001/0004): host SDKs only inside src/adapters/.
const HOST_SDKS = ['firebase', 'firebase/*', 'firebase-admin', 'firebase-admin/*', 'firebase-functions', '@firebase/*', 'aws-sdk', '@aws-sdk/*', 'aws-lambda', '@aws-lambda-powertools/*', '@google-cloud/*'];

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: HOST_SDKS, message: 'Host SDKs belong in src/adapters/ only (V-011).' }] }],
    },
  },
  {
    files: ['src/adapters/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
