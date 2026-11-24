// Firestore security-rules tests (SPEC-010 SYNC-114) and the index check (SYNC-115).
// Run with `npm run test:rules`: it starts the Firestore emulator around vitest. The index test
// alone needs no emulator: `npx vitest run --config rules-tests/vitest.config.mts indexes`.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['rules-tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
