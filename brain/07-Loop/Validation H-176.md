---
tags: [loop, validation]
---
# Validation H-176 (header account, username, theme, no `/import`)

2026-11-25 · H-176 · PASS (to RJ review gate) · validator, branch `loop/H-176-header-account`, uncommitted tree

## Checks run
- **V-008 web:** `npm run lint` clean; `npm run build` ok; `npm test -- --watch=false` 56 files / 777 tests pass.
- **Rules tests:** `npm run test:rules` could not start (Auth 9099 and Firestore 8080 held by the builder's emulators; not killed). Instead ran `vitest run --config rules-tests/vitest.config.mts` against those running emulators: `firestore.rules`, `username`, `indexes`, `delete-all` files pass (40 tests incl. username 2000 allowed / 2001 denied / empty / numeric denied, create with username denied, 24 x family emoji allowed, the one-`update()` write, other-user denied). `auth.test.ts` (4) and `email-link-return.test.ts` (4) failed with 400 from the Auth emulator admin calls: environment (a foreign emulator instance, not their code); builder reports 6 files / 48 pass in a clean run. **Re-run `npm run test:rules` once the ports are free.**
- **`firestore.rules` vs SYNC-112:** create keeps exactly 5 keys (username denied); `validAccountUpdate` allows optional `username`, string, `size()` 1..2000, createdAt unchanged.
- **`/import` grep** in `web/src`: only comments, tests asserting absence, `return-path` tests (path strings) and the catch-all test (`/import` -> `/`). No route, page, link or button.
- **V-011:** no `firebase` / `@firebase` imports in `web/src` outside `adapters/`. **V-012:** `git grep RGAPI-` only in docs; Legal notice still in `app.html` footer.
- **Impacts items 1-9:** (1) header: one control, 3-tab bar, `Account: {username}` named in `account-header.spec.ts` (AC 71). (2) menu order, Theme radios, no Delete item (AC 72). (3) Account Information dialog (AC 73). (4) username rules, prompt, Not now, save held during first sync, `setUsername`, rules and tests (ACs 74-76, 22). (5) theme `device-theme`, inline script + two `theme-color` metas in `index.html`, `theme.service.spec.ts` AC 77-79 incl. cache clear keeps the key. (6) `import-page.*` deleted, FABs and one-shot `?add=1` / `?import=1`. (7) sign-in dialog line, `/decks?import=1` return path. (8) tests name ACs 21, 22, 38, 46, 52-55, 57, 71-80 (68 and 70 are covered by H-152 tests, unchanged). (9) nothing deployed.

## Not run
- Browser screenshots (relying on the builder's 1440/641/390/320 pass); the RJ gate covers the look.

## Follow-ups
1. **spec-writer:** SYNC-151 says menu Sync now / Sign out are `aria-disabled` offline, SYNC-081 and the built menu use native `disabled` (as before H-176). Reconcile the two; if `aria-disabled` stands, **builder** switches the menu items. Not a FAIL: the old behaviour is the SYNC-081 wording.
2. **RJ:** Decks placeholder copy "N decks saved. The deck list comes next." is invented; approve or reword at the review gate.
3. **builder / RJ:** re-run `npm run test:rules` with free ports; rules deploy waits for RJ (SYNC-117). Nothing deployed.
