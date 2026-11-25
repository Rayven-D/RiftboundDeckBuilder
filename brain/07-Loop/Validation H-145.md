---
tags: [loop, validation]
item: H-145
date: 2026-11-24
round: 1
result: PASS (H-145)
---
# Validation H-145: the email link returns to the start page, "You're signed in." once

Item: [[Handoff Board]] H-145 (from H-119, UI review #17).
Spec: [[Accounts and Sync]] v0.10 SYNC-006 (Return, "You're signed in."), SYNC-002, SYNC-005, SYNC-009; AC 52 and
AC 39. RJ confirmed Open question 9 on 2026-11-24 (app paths only, else `/`; the notice shows once after any sign-in
the user started, never on a restore or reload).
Design: [[Brief H-145]], plus the ui-engineer's Playwright verdict at its end (PASS in the running app on the Auth
emulator).
Contract: [[API Contracts]] v1.13 (the emulator finding on continue URLs).
Scope: uncommitted tree on `loop/H-145-email-link-return` (base 6eaa88c). Changed: `core/sync/adapters/firebase-adapters.ts`,
`core/sync/sync.service.ts`, `shared/sync/sync-engine.ts`, `shared/sync/sync-types.ts`, `shared/sync/testing/{device,fakes}.ts`,
and two existing specs (`sync-engine-account-required.spec.ts`, `sync-engine-notice-kinds.spec.ts`, now expecting
"You're signed in." before the first-sign-in message). New: `shared/sync/return-path.ts` (+ spec),
`shared/sync/sync-engine-email-return.spec.ts`, `pages/email-link-return.spec.ts`, `rules-tests/email-link-return.test.ts`.
Notes: [[API Contracts]], [[UI Index]], [[Session Log]] and the new brief. No file under `brain/02-Specs/` changed.

**Browser evidence:** the ui-engineer ran a development build against the Auth and Firestore emulators
(`demo-rift-builder`, JDK 21) with Playwright at 1440 and 375, dark and light. Every link was sent with Send link in the
app and its code read from the emulator; "another device" was a separate browser context. Screenshots `01`–`10` are
in the side-session notes folder `h145-screens`, outside the repo. The validator did not drive the browser again.
That pass was before the code-review fix (strip only on a spent code); the fix is covered by unit and page tests below.

## Result
2026-11-24 · H-145 · PASS · Accept (AC 52 and AC 39 as tests named by AC; return path on the Auth emulator, 4 tests), V-008, V-009, V-011, V-012, mutation checks (safeReturnPath 4, spent-code check 4) · failures: none

New board items: **H-149** (builder, P3, from ui-engineer: snack-bar OK 40 px), **H-150** (RJ, P3, from ui-engineer:
the Import dialog covers "You're signed in."), **H-151** (builder, P3, from validator: return-path test gap, see
Notes 1). H-146 (spec-writer) gets part (5), AC 52 wording on `?type=deck`. `next_id` 149 → 152.

## Checks run
### V-008 (web), run by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | Application bundle generation complete (exit 0) |
| `npm test` | 51 files, **702 passed** (exit 0) |
| `npm run test:rules` | Default PATH: fails at start-up, "firebase-tools no longer supports Java version before 21" (environment, not the change). With `C:\Program Files\Microsoft\jdk-21.0.13.102-hotspot\bin` prepended for that command (openjdk 21.0.13.1): 5 files, **38 passed** (exit 0) |

Counts match the builder's Session Log entry (702 web, 38 rules).

### Accept: AC 52 and AC 39 as tests named by AC
- **AC 52, same device from `/import?type=deck`** (`pages/email-link-return.spec.ts`, real Router with
  `BrowserPlatformLocation`, so jsdom's address bar is checked): when the notice shows, `location` and `router.url` are
  both exactly `/import?type=deck`; the notice is "You're signed in." once, `success`, 6 s, polite; `history.length`
  unchanged (replaced, not pushed); the page component is the same instance (no reload or rebuild); the gate opens
  and the Import dialog opens; the stored address is removed.
- **AC 52, reload / restore:** a restored session on a clean URL shows no notice (page spec), and a restore plus a
  second `start()` never notify (`sync-engine-email-return.spec.ts`).
- **AC 52, other device from `/`:** confirm dialog, Finish, lands on `/`, notice once (page spec, also tagged AC 39).
- **AC 52, tampered link:** a `//example.org/` landing path and a `continueUrl=https://example.org/` parameter both
  complete on `/`; `continueUrl` is never read (page spec and `return-path.spec.ts`).
- **AC 52, Google:** "You're signed in." once from Continue with Google (engine and page specs); focus falls back to
  `#main` when the panel goes.
- **AC 52, Send link / Send again** pass the page under the dialog as `returnTo`, with Firebase parameters still on the
  page dropped (page spec); the engine passes it to the adapter (engine spec).
- **AC 39:** expired (`auth/expired-action-code`) and used (`auth/invalid-action-code`) codes strip the parameters,
  show the SYNC-005 error and no "You're signed in."; a cancel (no address) keeps the link and shows nothing; the
  other-device confirm and Cancel cases are in the page spec. The rest of AC 39 (`firebase` loads at start-up on a link,
  no chunk on an ordinary URL, no question on the sending device) stays covered by the existing H-062 / H-108 tests
  (`core/sync/sign-in-focus-confirm.spec.ts` "AC 39 / H-108 …"), which pass in the 702.
- **Return path on the Auth emulator** (`rules-tests/email-link-return.test.ts`, 4 tests, part of the 38): the real
  `FirebaseAuthService.sendEmailLink` against the emulator; the emailed link's `continueUrl` is
  `<origin>/import?type=deck`; following the emulator's redirect lands on `/import?type=deck&mode=signIn&…`, the
  sign-in completes, and `returnTarget` gives exactly `/import?type=deck`. Also `/` (header on Home) and an outside
  path sent as `/`; a fragment is never sent and the user's query survives next to the Firebase parameters.
- **Review fix 1 (strip only on a spent code):** engine tests for chunk-load failure, `auth/network-request-failed`,
  `auth/invalid-email`, an error with no code, offline and cancel all keep the link; the page spec checks the network
  and `invalid-email` cases keep `oobCode` in the URL.

### Tests named by AC or board ID
Every test in the four new files and every changed assertion names `AC 52`, `AC 39` and/or `H-145` (a few edge-case
tests carry only `H-145`, e.g. "a network failure keeps the code …"). The changed assertions in the two existing specs
carry an `// H-145` comment.

### Mutation check (each production file copied to the scratchpad, mutated, the three H-145 unit specs run (32 tests), file restored and compared byte for byte with `cmp`)
`shared/sync/return-path.ts`:
1. Filter drops nothing (`part !== '' && !LINK_PARAMS.includes(...)` → `part !== ''`): **8 tests fail**. Restored.
2. Normalized `//` check removed (`if (path.startsWith('//')) return '/';`): **1 test fails** (`AC 52 / H-145 a path
   outside the app gives /`, input `/.//x.org/`). Restored.
3. Leading `//` guard removed (`raw.startsWith('//') || `): **survives** (32 pass); the origin check still catches
   `//x.org`. Restored.
4. Origin check removed (`if (url.origin !== new URL(origin).origin) return '/';`): **survives** (32 pass). Restored.
   Steps 3 and 4 together also **survive**. With both removed, `safeReturnPath('//x.org/evil', origin)` returns
   `/evil` instead of `/` (probe run with `tsx`; the original code returns `/`). See Notes 1.

`shared/sync/sync-engine.ts` (spent-code check and notice):
5. Strip on every email-link failure (drop `&& isSpentLinkError(e)`): **6 tests fail** (chunk-load, network,
   invalid-email, no code; page network and invalid-email). Restored.
6. Never strip on failure: **3 tests fail** (expired and invalid code, engine and page). Restored.
7. `SPENT_LINK_CODES` without `auth/expired-action-code`: **2 tests fail**. Restored.
8. `notify(MESSAGES.signedIn, 'success')` removed: **7 tests fail**. Restored.

After all mutations `cmp` matched both backups and `git diff --stat` was unchanged (11 files, +158 / −23).

### Other checks
- **V-009:** every wikilink in [[Brief H-145]] and in the added [[API Contracts]], [[UI Index]] and [[Session Log]] lines
  resolves: [[Accounts and Sync]], [[API Contracts]], [[Brief H-113 H-116 H-123 H-126]], [[Brief H-140 H-125 H-108]],
  [[Brief H-144 H-114 H-115]], [[Brief H-145]], [[Design Direction]], [[UI Index]]. The brief has frontmatter (title,
  status, board, source, date). API Contracts bumped to v1.13 with a changelog line; the emulator finding names the
  tool version (firebase-tools 15.37.0), the date and the test file, and keeps production as `unverified`.
- **V-011:** no `firebase` import outside `core/sync/adapters/`; the new `return-path.ts` is pure, and the engine reads
  Firebase error codes duck-typed. (`rules-tests/` imports `firebase/*` as before; it is test code run on the emulator.)
- **V-012:** `git grep RGAPI-` outside `brain/` and a search of `web/dist` find nothing; `.env` is ignored.

## Notes (not failures)
1. **Return-path tests don't pin the host guards.** Mutations 3 and 4 survive, alone and together, because every
   foreign-host test input has an empty path (`//x.org`, `//example.org/`), which resolves to `/` anyway. Behaviour is
   correct today (the result is always a path on this origin, so no redirect off-site is possible, and the original
   code returns `/` for `//x.org/evil` and `/\t/x.org/evil`), but SYNC-006 says "anything else returns to `/`" and no
   test would catch a regression to `/evil`. Filed as **H-151** (builder, P3).
2. **Known limitation (accepted in code review, not fixed):** if the user clicks an in-app link while the email sign-in
   is still running, the Router pushes the new entry first, and `leaveSignInLink`'s `replaceUrl` then replaces that new
   entry, not the link's. The spent code can stay in browser history behind the new page (Back returns to it; a
   reload there shows the SYNC-005 failure and changes nothing). Edge case; no board item.
3. **The notice is hidden under the Import dialog** on `/import?type=deck` for its 6 s (ui-engineer finding 1; the
   live region still announces it). Filed for RJ as **H-150** (built default A: accept; B: show it again when the
   dialog closes).
4. **Snack-bar OK is 40 px tall** on every notice (ui-engineer finding 2; from H-116, passes WCAG 2.5.8 but not the
   project's 44 px rule). Filed as **H-149**.
5. **AC 52 wording:** it reads as if `?type=deck` stays in the URL, but the Import page drops it once its dialog opens
   (as before H-145). The test checks the URL at the moment the notice shows. Added to H-146 as part (5).
6. Production's continue-URL handling (Hosting `/__/auth/action`, authorized domains) is still `unverified` in
   API Contracts; the app strips parameters by name, so either shape works. Google was checked by unit tests only
   (off at launch).

## Re-check H-151 (2026-11-24)
2026-11-24 · H-151 · PASS · `npm test` 51 files, **705 passed**; mutations re-run on `return-path.ts` (unchanged, `cmp` against the earlier backup) · failures: none
- The builder added three tests named `H-151` to `return-path.spec.ts` (foreign host with a path, tab/newline host,
  protocol-relative input naming this origin); no production change.
- **Mutations 3 and 4 are now caught:** leading `//` guard removed → 1 test fails; origin check removed → 1 test fails;
  both removed → 3 tests fail. The file was restored and compared byte for byte after each.
- Not added: a separate `returnTarget` case for a `//example.org/evil?mode=signIn…` landing (from the H-151 Accept's
  parenthesis); `returnTarget` only delegates to `safeReturnPath`, so this does not block.
- H-151 moved to Done.
