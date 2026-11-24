---
tags: [loop, validation]
item: H-081
date: 2026-11-24
round: 2
result: PASS
---
# Validation H-081: SPEC-010 v0.8 account-required mode

Item: [[Handoff Board]] H-081. Accept: "SPEC-010 v0.8 ACs 3, 5, 20, 25–28, 31, 36, 40, 45–48 pass; tests".
Scope: uncommitted tree on `loop/H-081-account-required` on top of `ccda2f2` (H-086): 26 modified files, 6 new
(`gate.ts`, `gate.spec.ts`, `sign-in-gate.ts`, `sign-in-panel.ts`, `gated-pages.spec.ts`,
`sync-engine-account-required.spec.ts`). Spec: [[Accounts and Sync]] v0.8 (SYNC-001…009, 030, 048–052, 086,
090–091, 097, ACs above).

## Result
2026-11-24 · H-081 · PASS (round 1) · Accept (ACs 3, 5, 20, 25, 26, 27, 28, 31, 36, 40, 45, 46, 47, 48), local-only-mode invariance (code + tests), SYNC-009/048/049/052/086/090/091/097 vs code, [[API Contracts]] vs code, V-008 (web), V-010, V-011, V-012, V-009 (changed notes), 2 validator probes · failures: none

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0); `firebase-adapters` stays a lazy chunk (601 kB), initial total 373.8 kB |
| `npm test -- --watch=false` | 23 files, **331 passed** |
| `npm run test:rules` (Java 21.0.13 prepended to PATH) | 4 files, **33 passed**, emulator exited 0 |

These match the builder's report. `services/` is unchanged, so its V-008 leg was not rerun.

### Accept: each AC against its test (tests are named by SYNC id and AC)
| AC | What it says | Test(s) | OK |
|---|---|---|---|
| 3 | legacy 350/20/10/3 cleared **before** the full read; no warning in the dialog; exactly 1 write (`set users/uA`), 3 reads; cloud = `users/uA` only; linked `uA`; Collection/Decks empty | `sync-engine-account-required.spec.ts` "AC 3 / SYNC-048 a" (spies `pull` and asserts only the sync-log key exists at read time; `writeLog = [[users/uA, set]]`, `reads = 3`); dialog text: `account-menu.spec.ts` SYNC-003 (no "this device / legacy" wording), `gated-pages.spec.ts` "SYNC-003 the panel Sign in opens the Sign in dialog…" | yes |
| 5 | no Combine; phone shows q 3, `Collector` only, `Kennen Tempo` only; no state/decks write; laptop's next pull changes nothing | "AC 5 / SYNC-049 no Combine" (cloud docs deep-equal before/after, 0 writes); `account-menu.spec.ts` "SYNC-049 / AC 5 there is no Combine dialog" | yes |
| 20 | warning text + Sync now / Sign out anyway / Cancel, no Keep a copy; Sync now → plain question; Sign out clears every store and log, cloud unchanged, Collection panel; rejected push keeps warning; drop during Sync now → offline, buttons disabled, only Cancel; online again re-enabled; menu Sign out disabled offline; re-sign-in downloads with 0 writes | dialog: 6 tests in `account-menu.spec.ts` "SYNC-090 / SYNC-081 the sign-out dialog (AC 20)"; engine: "AC 20 / SYNC-091 sign-out clears every store…" (offline refused, all `rift.` keys gone incl. view state, cloud doc equal, gate `signed-out`, re-sign-in 0 writes) | yes (see note N1) |
| 25 | failed full read → "Couldn't get…" + Try again, log `uid null / lastFullSyncAt null / sessionExpected true`, 0 writes; reopen online → step 1 clear, download, 0 writes, link, pages fill without reload | "AC 25 / SYNC-048 an interrupted first sign-in…" (asserts `clearAll` called on reopen, 350 cards / 10 decks, 0 writes); "AC 25 / SYNC-009 Try again (Sync now)…"; panel text + Try again → `retry()`: `gated-pages.spec.ts` "SYNC-048 / AC 25…" | yes |
| 26 | sign out + reload: no firebase chunk, no session-lost message, Decks panel, stores empty | "AC 26 / SYNC-002 sign out then reload" (`adaptersLoaded 0`, no `sessionLost` notice, no `rift.` keys, gate `signed-out`); panel heading per page: `gated-pages.spec.ts` AC 46 rows | yes |
| 27 | loss: syncing stops, data + 2 pending kept, notice, Collection lost-session panel, no Add to your decks, `sessionLostUid: 'uA'`; reload (online/offline) closed from first frame; same uid → clears flag, opens, pushes 2, nothing cleared; uB → clears device, downloads uB | 5 tests in "SYNC-086 / SYNC-009 a lost session closes the gate"; page: `gated-pages.spec.ts` "SYNC-086 / AC 27 a stored lost session shows the panel…" (`deckControls()` false) | yes |
| 28 | (a) linked tablet, account missing → `checkAccount` `deleted` → device cleared, nothing recreated; (b) not-found update → stop, keep pending, check; (c) half-deleted `ok` → write nothing, sign out, clear every store and log, new message, panel; (d) rules deny create without account | (c): "AC 28 / SYNC-097 half-deleted…" (0 writes, leftovers deep-equal, log = `emptySyncLog()`, 1 Auth sign-out, gate `signed-out`); (a): "AC 28 / SYNC-097 deleted…" (view state and printing codes also gone); (b)/(d) unchanged from H-062 tests in `sync-engine.spec.ts` / `rules-tests` (still green) | yes |
| 31 | account-required, signed in: no Delete all local data on Collection; local-only: COLL-074 as SPEC-007 | `gated-pages.spec.ts` "SYNC-052 / AC 31…" and "SYNC-008 / AC 45 … Delete all local data stays offered" (`offerDeleteLocalData`) | yes, limited (gap 1) |
| 36 | (e) account without data: 40 legacy cleared, 0 writes, `createdAt` kept, no dialog, Collection empty; (f) leftovers without account: nothing imported or written, signed out with the half-deleted message, stores empty | two "AC 36 / SYNC-048 e/f" tests (message string asserted literally) | yes |
| 40 | v0.7 log `uploadingUid: 'uA'`, 350 cards / 25 decks local, 9 decks in cloud → clear, download 9, no state/decks write, update only on build change, no "saved to your account", `uploadingUid` unset | two "AC 40" tests (0 writes same build; exactly `[[users/uA, update]]` on another build) | yes |
| 45 | `signInEnabled: false`: everything works and stays in the browser, no panel, no Sign in, no firebase | `gate.spec.ts` "SYNC-008 / AC 45" (every log, incl. a lost-session one, → `open`); `gated-pages.spec.ts` local-only block (4 routes show content with a lost-session log stored, localStorage byte-identical after load, app shell has no Sign in, 0 adapter loads, `deckControls` stays true even after `set('signed-out')`); `import-page.spec.ts` and `app.routes.spec.ts` pinned to local-only; existing AC 1/35 tests | yes, limited (gap 1) |
| 46 | signed out: 4 URLs keep URL, heading per page, signed-out text, Sign in, tabs and Import visible, no firebase; Tournaments no deck controls; legacy deck never "In your decks"; legacy data hidden; after sign-in controls appear without reload | `gated-pages.spec.ts`: `it.each` over the 4 URLs, legacy-data test, header test, Tournaments test, and "AC 46 signed out → Sign in → first sync completes…" with the **real** `SyncService` (gate flips to `open`, `deckControls` true, legacy collection key removed, cloud = `users/uA` only) | yes, limited (gap 1) |
| 47 | synced + offline reload → content at once, import pending, pushed when online; undetected loss → cards shown, edit stamped/pending, then flag set, panel, later reloads closed; first sync running → "Getting…", no edits, no Tournaments controls; opens when done without reload | three "AC 47" engine tests (first-frame gate computed from `log.peek()` only; download held open by a spied `pull` to observe `first-sync`); `gated-pages.spec.ts` AC 47 page tests (0 adapter loads, no buttons in the running panel) | yes |
| 48 | local-only data (120 cards, 2 decks) + switch to `true` → panel, cards hidden; no warning in Sign in; sign-in to a new account clears, no upload, exactly 1 write | "AC 48 / SYNC-008…" (`gateState(false)` open before, `signed-out` after; `writeLog = [[users/uNew, set]]`; stores empty); page side: legacy-data test | yes |

### Local-only mode (`signInEnabled: false`) is unchanged: code paths read
- `gateState(false, …)` returns `'open'` before reading anything. `SignInGate` injects `AppStores` only when enabled,
  ignores `set()` in local-only mode, and `offerDeleteLocalData = !enabled`.
- `SyncService` is constructed only inside `@if (signInEnabled) { @defer … <app-account-menu> }`; `start()` also
  returns early when disabled. So no engine runs and nothing calls `clearAll` / `clearDevice` in local-only mode.
- Pages render their old content inside `@if (gate.open())`. The `/import?type=` effect adds `&& gate.open()`, which is
  always true here. Tournaments only injects the gate.
- `LocalSyncLogStore.load()` now wraps a synchronous `peek()` (same parsing); the removed `clearSynced` was only
  used by the engine.
- Production build: `environment.ts` `signInEnabled: false`; `firebase-adapters` is lazy.

### Account-required mode vs spec (code read, then confirmed by the tests and probes)
- **Gate from the sync log, no Firebase (SYNC-002/009):** `SignInGate` seeds its signal from `log.peek()` at
  construction; `gateState` = open iff `sessionExpected && uid && lastFullSyncAt && sessionLostUid !== uid`. Engine
  emits update it via `onStatus → gate.set(engine.gate())`. Tests assert 0 adapter loads. OK.
- **`sessionLostUid` (SYNC-086):** set in `sessionLost()` only while `sessionExpected` (to the linked uid); cleared by
  `signIn` with the same uid, by `firstSignIn` step 4, by the pull's successful account check when the flag is set
  (restore of the linked uid), and by every `clearDevice` (`emptySyncLog()` has `sessionLostUid: null`). An
  `offline` check result sets `offline`, not the flag (SYNC-080). OK.
- **First sign-in (SYNC-048/049/050):** `clearDevice(true)` (`clearAll` removes every `rift.` key: collection,
  previous, tags, locks, printing codes, view state, decks, sync log; then saves an empty log with
  `sessionExpected: true`) → full read → (f) `halfDeleted()` / download with `mergePulled` (no `mode`) → account
  `set()` or `update()` only when needed → link. No `batch`, no `confirmCombine`, no notices. `uploadingUid` is never
  written and never read. A failure sets `firstSyncFailed` (gate `first-sync-failed`); the next run restarts at
  step 1. OK.
- **Sign-out (SYNC-090/091/092/081):** `signOut()` refuses offline (`'offline'`, notice), else Auth sign-out,
  `endSession`, `clearDevice()`. The dialog keeps live `online` and `pending`, runs Sync now in place, and closes
  with `true`. The menu Sign out is `[disabled]="!sync.online()"`. OK.
- **SYNC-052:** no Delete all local data UI exists in either mode (placeholder Collection page). The flag is ready. OK for now (gap 1).
- **SYNC-097:** `deleted` (in `accountGone` and `sessionProblem`) and half-deleted both call `clearDevice()`; the
  half-deleted message string is the v0.8 one. OK.

### Validator probes (throwaway specs, run and deleted; the tree is unchanged)
1. **Account menu offline:** with a stubbed `SyncService` (`online: false`), the menu's Sign out is disabled and
   the menu shows "You're offline." **Passed.** No committed test covers this AC 20 clause (note N1).
2. **A v0.7 "Keep a copy" sync log** (`uid: 'uA'`, `lastFullSyncAt` set, `sessionExpected: false`) in account-required
   mode: start-up loads no adapters, the gate is `signed-out`. After signing in as `uA`, the engine **resumes**
   rather than running the first sign-in. A card stamped while signed out (`lightning rush`) was **pushed** into
   `users/uA/state/collection`. This matches the letter of SYNC-048, whose trigger is "linked uid unset or
   different, or `lastFullSyncAt` unset". But it conflicts with the v0.8 idea that data saved without a session
   is never uploaded (SYNC-008 / decision 13 d). It can only happen in browsers that ran a v0.7 preview or dev
   build, and in v0.8 the closed gate blocks new edits. **Spec question, not a build failure** (proposed item P1).

### Builder-reported gaps: verdicts
| # | Gap | Verdict |
|---|---|---|
| 1 | Tournaments deck controls and COLL-074 have no UI yet; only `SignInGate.deckControls()` / `offerDeleteLocalData` are tested | **Acceptable for H-081.** The pages are scaffolds: no control exists that could leak. The contract is in [[API Contracts]], the [[UI Index]] and a code comment in `tournaments-page.ts`. The items that later build CAT-070/074 and COLL-074 must render them only behind the gate, and must test that (proposed item P3). |
| 2 | A session lost before the first sync completes shows the lost-session panel | **Acceptable; spec gap.** SYNC-009 doesn't cover this. The device holds nothing (it was cleared at step 1), so nothing leaks. Note that `sessionLostUid` stays null here (no linked uid), so a reload shows "Getting…" again until the restore fails. Proposed item P2. |
| 3 | Gated pages keep their h1 above the panel | **Acceptable.** "Shows a sign-in panel instead of its content": the h1/lede is page chrome, and no store data is read. The [[UI Index]] already lists it as an RJ question. **Resolved 2026-11-24:** RJ decision 14 (SPEC-010 v0.9, H-093) keeps the page header above the panel; tested in H-094 ([[Validation H-093 H-094]]). |
| 4 | Sign-out dialog splits the spec sentence into title "Sign out?" and body | **Acceptable.** The text is verbatim. A title/body split is a presentation choice. |
| 5 | The engine also refuses sign-out offline | **Acceptable, and correct:** SYNC-081/090 "Nothing is cleared while offline". |
| 6 | SYNC-097 `deleted` clears every store, incl. printing codes and view state | **Correct per v0.8:** "clears this device as for sign-out (SYNC-091: every local store and the sync log)". |
| 7 | The `/import?type=` deep link is kept while gated and opens the dialog when the gate opens | **Acceptable:** "keeps its URL (deep links too)". Opening it after the gate opens is a reasonable reading (tested). |
| 8 | The gate doesn't follow other tabs | **Spec gap.** SYNC-051 covers data, not the gate. If tab A signs out, tab B keeps an open gate over empty stores until reload. Edits made there would be stamped into a log with `sessionExpected: false` and cleared by the next first sign-in, so there is no cloud impact. Proposed item P2. |
| 9 | Two lost-session texts | **Per spec:** the notice "…Sign in again to sync." (SYNC-086) and the panel line "…Sign in again to see them." (SYNC-009). Both are asserted. |
| 10 | AC 14 test changed so the laptop writes the tags doc after signing in | **Acceptable.** The old setup relied on the v0.7 upload of pre-sign-in data, which v0.8 removes. The SYNC-065 assertions are unchanged. |

### Notes (non-blocking)
- **N1:** No committed test covers AC 20's "offline account menu: Sign out disabled with 'You're offline.'". The template does it (probe 1 passed), the engine refuses offline (tested), and the dialog's offline state is tested. Suggest adding a one-line menu test the next time `account-menu.spec.ts` is touched.
- **N2:** The removed test "SYNC-002 a stored linked uid alone does not load Firebase (sessionExpected false)" used `signOut('keep')`. The state it covered is still reachable from v0.7 logs, and probe 2 confirmed that start-up loads nothing. Worth restoring as a seeded-log test, together with whatever P1 decides.
- **N3:** `SignInGate.signIn()` is a no-op until the deferred account menu has constructed `SyncService` (`@defer (on immediate)`). The window is a few milliseconds, so it doesn't matter in practice.
- **H-077:** ACs 3, 5, 36, 40 and 48 already show the SYNC-050 write budget (0 or 1 write, no `state`/`decks`, no `batch` in the flow). What remains of H-077 is AC 4 and the `PushChanges.batch` cleanup.

### Other checks
- **[[API Contracts]] v1.4 vs code:** these all match the code: `sessionLostUid`, `emptySyncLog` (no
  `uploadingUid`, `sessionLostUid: null`), the `gateState` signature and states, `LocalSyncLogStore.peek()`,
  `SignInGate` members (`state`, `open`, `deckControls`, `offerDeleteLocalData`, `signIn`, `retry`),
  `<app-sign-in-panel page=…>`, `SyncEngine.signOut(): Promise<'ok'|'offline'>`, the removed
  `deleteLocalData`/`confirmCombine`/`CombineQuestion`/`CombineDialog`/`MESSAGES.uploaded`/`differentAccount`/`clearSynced`/
  merge `mode`/`liveCounts`/`cloudCounts`, `PushChanges.batch` kept in the adapter, and the sign-out dialog data shape. OK.
- **V-010:** no metagame terms in the added lines. The only grep hit is the path `shared/sync`. OK.
- **V-011:** no firebase/@firebase/aws imports in `web/src` or `services/src` outside `/adapters/`. OK.
- **V-012:** `git grep RGAPI-` finds nothing (excluding `brain/`), and nothing in `web/dist`. OK.
- **V-009 (changed notes):** the wikilinks added in [[UI Index]], [[API Contracts]] and [[Session Log]] resolve. OK.
- **Design skills:** not loaded. The UI change is one text panel (`section` labelled by its `h2`, `role="status"`
  while running, `role="alert"` on failure, a real `button` with `aria-haspopup="dialog"`) and dialog button
  changes. No accessibility failure was found on read. The visual question (gap 3) is with RJ.

## Proposed board items (for the orchestrator to file; not added here)
- **P1 (spec-writer, P2):** SPEC-010 v0.8: decide what a v0.7 "Keep a copy" sync log does in account-required mode
  (`uid` set, `lastFullSyncAt` set, `sessionExpected: false`, data and pending stamps kept). Today a sign-in as the
  same uid resumes and **pushes** changes made while signed out (validator probe 2). Should SYNC-048 also run when
  `sessionExpected` was false at sign-in (that is, clear first), in line with decision 13 d? Accept: SYNC-048 / SYNC-004
  state the rule, and there is an AC with this seeded log.
- **P2 (spec-writer, P3):** SPEC-010 SYNC-009 gaps: (a) the panel and text for a session lost **before** the first
  sync completed (the build shows the lost-session panel in-session, but "Getting…" after a reload until the
  restore fails); (b) whether the gate follows other tabs (sign-out, sign-in or a lost session in another tab
  of the same browser; the build updates only on reload). Accept: SYNC-009 says both, with ACs; builder item if the
  answer differs from the build.
- **P3 (builder, P2, or a note on the items that build them):** when SPEC-004 CAT-070/074 (Tournaments Add to your
  decks / In your decks / Add another copy) and SPEC-007 COLL-074 (Delete all local data) get UI, render them only
  while `SignInGate.deckControls()` / `offerDeleteLocalData` allow, keep the CAT-074 "already added" lookup
  behind the gate, and add the AC 31 / 45 / 46 page tests for them. Accept: AC 31, 45, 46 pass against the real controls.

## Round 2 (2026-11-24)
Scope: round 1's build is committed as `4c0c786`. The code-review fixes are uncommitted on top of it
(`git diff HEAD`): `sync-engine.ts` (session generation counter), `sync-dialogs.ts` (`SignOutDialog.syncNow()`
catches errors), new tests in `sync-engine-account-required.spec.ts` and `account-menu.spec.ts`, and the [[Session Log]].

### Result
2026-11-24 · H-081 · PASS (round 2) · V-008 (web) rerun, fix review (every stale check), race tests run against the pre-fix engine, 5 validator probes · failures: none (1 proposed builder item, below)

### V-008 (web), rerun from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting |
| `npm run build` | bundle generated |
| `npm test -- --watch=false` | 23 files, **337 passed** |
| `npm run test:rules` (Java 21.0.13 prepended to PATH) | 4 files, **33 passed**, exit 0 |

These match the builder's report.

### The fix: review of each generation bump and stale check
`generation` is bumped by `openSession`, `endSession`, `clearDevice` and `sessionLost`. Work captures it and
checks `stale(gen)` after each await. `updateLog(fn, gen)` checks inside the queue, so a write queued before a
clear but run after it is dropped.
- **firstSignIn's own step 1:** `clearDevice(true)` bumps first, and `gen` is captured **after** it. The full read,
  the merge (checked inside the queue), the account push and the step-4 link (`updateLog(…, gen)` plus the `linked`
  flag) all run under that same value, so the flow never drops its own work. Confirmed by the green AC 3/5/25/36/40/47/48 tests.
- **`sessionLost` mid-flow:** it bumps and then writes `sessionLostUid` with the **new** value, so the flag is
  always stored. The interrupted caller stops, which is what SYNC-086 wants ("stops syncing"). Probes, all green:
  (a) a regular pull rejected `unauthenticated` → `sessionLostUid: 'uA'`, gate `session-lost`, data kept;
  (b) the same during the first sign-in's full read → gate `session-lost`, nothing linked, `sessionExpected` true
  (as in round 1);
  (c) a push rejected `unauthenticated` → flag stored, the item still pending.
- **`sessionProblem` / `accountGone`** capture the generation before `checkAccount()` and ignore the result if the session ended meanwhile. They are called from the current generation, so their own clear or `sessionLost` still runs. OK.
- **`pull` / `pushPending`:** a result that arrives after the session ended is dropped, and errors are not handled. A push that landed just as the session ended is not recorded, so its items stay pending. On the next sign-in with the same uid they are pushed again or settled by the tie rule (SYNC-061). No data loss.
- **`signOut`:** `endSession()` (which bumps) now runs **before** the awaited Auth sign-out, so a pull resolving
  during that await is already stale. OK.
- **`deleteAccount`:** stale after re-auth, after `deleteAll`, and before step 4 → `'failed'` without touching the
  cleared device or deleting the Auth user. OK. See R2-1 for the notice this then shows.
- **User stamping** (tracked stores) does not go through `updateLog`, so user edits are never dropped by the counter.
- `SignOutDialog.syncNow()` now has `catch {}` and still re-reads the count in `finally`. OK.

### Do the new tests exercise the race?
I ran the new tests against the **pre-fix** engine (`git show HEAD:…/sync-engine.ts` swapped in temporarily, then the
fixed file restored; `cmp` identical):
- "SYNC-091 / AC 20 sign-out during a running first sync (and a regular sync)…" **fails** without the fix. A separate
  probe with only the regular-sync half also **fails** without the fix and passes with it, so both halves discriminate.
- "SYNC-091 / SYNC-096 sign-out while a deletion is running…" **fails** without the fix (`deleteAccount` returned
  `'ok'`: the old engine went on to delete the Auth user after the sign-out).
- With the fix, both pass. They hold `pull` / `deleteAll` on a promise, sign out while it is pending, then release it.
  That is the real interleaving.
- The other new tests: "SYNC-002 a stored linked uid with sessionExpected false…" (engine: 0 adapters, 0 reads and
  writes, gate `signed-out`; service: only the Sign in button, 0 adapter loads) covers round 1's N2.
  "SYNC-081 / AC 20 offline the menu Sign out is disabled…" covers N1. "SYNC-090 a Sync now that rejects is caught" fails on an unhandled rejection without the `catch`.

### Notes
- **R2-1 (proposed builder item, P2; not an H-081 Accept failure):** after a sign-out during a running deletion,
  `deleteAccount()` returns `'failed'`. `AccountMenu.runDelete()` then shows the "Some data couldn't be deleted." snack bar
  with **Try again** on a signed-out device (account-menu.ts, `if (result === 'failed')`). Try again calls
  `deleteAccount()`, which returns `'failed'` at once (`!this.uid`), so the same notice comes back each time. No data is
  harmed. What the device should show here depends on H-083 (1) (sign-out during an unfinished deletion, default yes).
  Suggested fix: return a distinct result from a deletion ended by sign-out (for example `'signed-out'`) and show no
  failure notice for it (or dismiss the open one on sign-out). Test: the menu shows no Try again after signing out
  mid-deletion. Accept: that test passes.
- Round 1's proposed items P1–P3 still stand. N2 (the restored SYNC-002 test) is done. P1, the question of resuming
  a v0.7 Keep-a-copy log on sign-in, is still open; the new test only covers start-up.
