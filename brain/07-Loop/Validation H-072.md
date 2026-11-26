---
tags: [loop, validation]
---
# Validation H-072: V-011 web adapter path

Related: [[Validation Checks]] (V-011), [[Accounts and Sync]] SYNC-130.

2026-11-26 · H-072 · PASS · V-011 grep on tree, V-011 grep on stray file · no failures

## Change
V-011 allowed Firebase imports only under `services/src/adapters/`, but SYNC-130 puts the Firebase adapter in `web/`.

- Before: "outside `services/**/adapters/`"; grep tail `| grep -v services/src/adapters/`.
- After: "outside `services/src/adapters/` and `web/src/app/core/sync/adapters/`"; grep tail `| grep -vE "^(services/src/adapters/|web/src/app/core/sync/adapters/)"`.

## Why this path
Firebase SDK imports in `web/src/` exist only in `web/src/app/core/sync/adapters/`: `firebase-adapters.ts` (`firebase/app`, `firebase/auth`, `firebase/firestore`) and `firebase-auth-service.spec.ts` (`import type` from `firebase/auth`). That folder is the narrowest match for SYNC-130 and the real code. No `@angular/fire` use.

## Runs (grep part of V-011)
- Current tree: no output (0 lines). Expected: no output. PASS.
- Temporary `web/src/app/x-stray.ts` importing `firebase/firestore`: output `web/src/app/x-stray.ts:1:import { getFirestore } from 'firebase/firestore';`. Expected: flagged. PASS. File deleted afterwards; `git status` shows only the brain edit.

## Not run
The ESLint half (`cd services; npm run lint`) is unchanged and covers `services` only. Not rerun.
