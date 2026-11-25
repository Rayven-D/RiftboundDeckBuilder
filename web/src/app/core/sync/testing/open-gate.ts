import type { Provider } from '@angular/core';
import { SignInGate } from '../sign-in-gate';

/**
 * Test helper for page specs that are not about the sign-in gate: the gate starts open, as for a user who is
 * signed in and whose first sync completed (SPEC-010 SYNC-009). There is no build without the gate
 * (SYNC-001, SYNC-007); the gate itself is covered in `pages/gated-pages.spec.ts` and `shared/sync/gate.spec.ts`.
 */
export function provideOpenGate(): Provider {
  return {
    provide: SignInGate,
    useFactory: () => {
      const gate = new SignInGate();
      gate.set('open');
      return gate;
    },
  };
}
