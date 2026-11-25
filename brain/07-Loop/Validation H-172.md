---
tags: [loop, validation]
---
# Validation H-172 (remove local-only mode, account-only build)

2026-11-25 · H-172 · PASS · run by the validator on branch `loop/H-172-account-only` (uncommitted tree)

## Checks run
- **V-008 web:** `npm run lint` clean; `npm run build` ok; `npm run build:preview` ok (builds without the removed fileReplacement); `npm test -- --watch=false` 52 files / 712 tests pass.
- **Accept grep** `grep -rniE "signInEnabled|local-only|clearCollectionData" web/src web/angular.json`: no hits (AC 63).
- **Code-change list 1-7:** (1) `sign-in-flag.ts` gone, `auth-providers.ts` keeps `authProviders`; `gateState` has no flag argument; `environment.preview.ts` and the preview fileReplacements removed, `production`/`preview` differ only in output path (asserted in `preview-deploy.spec.ts`); Home hero note is "Free account" (home-page spec). (2) COLL-074 action, `delete-collection-data-dialog.ts` and tests removed; phone More menu holds Export CSV only; no COLL-074 reference left in `web/src`. (3) fixtures and test names plain; ACs 31, 35, 45, 48, 59-63 each have a named test. (4) a, b, c, e, f covered by `sync-engine-cache.spec.ts` / `sync-engine-first-sign-in.spec.ts` (AC 59-62); d covered in the AC 59 offline-reload test. (5) not touched `/import` or the header. (6) no deploy. (7) no migration.
- **Deploy workflow diff:** `.github/workflows/firebase-hosting-deploy.yml` changes a comment only; behaviour unchanged (AC 35 test on `firebase.json` and the workflow still passes).
- **V-011:** no firebase imports outside adapters in `web/src` (grep empty). **V-012:** `git grep RGAPI-` empty.
- **V-010:** not in scope (no data or copy about metagame statistics changed).
- **AC 64 (process):** the validator ran no deploy and no merge. The board row and Current State must keep saying "not deployed to production" (orchestrator's job at close).
- Rules tests not run: no rules or adapter change in the diff.

## Gaps (not failures)
- AC 62 is proven at engine level (counting RemoteStore fake, 3,000 cards, 200 decks, 0 reads/0 writes) but not with a real page scroll. The Decks list does not exist yet.
- COLL-093 (e) (scroll position kept on Back) left to H-173.
- The manual part of AC 35 (a real preview channel run by RJ) is not done.

## Failures
none
