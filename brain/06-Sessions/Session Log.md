---
tags: [sessions]
---
# Session Log

Newest first. One short entry per working session.

Older entries: [[Session Log 2026-11-23 (early)]] (archived).

## 2026-11-24: UI review of the SPEC-010 v0.9 sign-in UI (ui-ux-engineer)
- Reviewed `loop/SPEC-010-v0.9-build` live on :4201 (`signInEnabled: true`, no emulator) at 1440 / 1024 / 375, dark and light, keyboard; signed-in states rendered by setting `SyncService` signals. Wrote [[UI Review 2026-11-24]] (23 findings), linked from [[UI Index]].
- Top: invisible keyboard focus on Material buttons, snack bars over the phone tab bar, Delete account styled as the teal primary. No board items filed (the orchestrator files them); no code, spec or board edits.

## 2026-11-24: SPEC-010 v0.9 build chain, orchestrated (orchestrator)
- Ran each item in its own session, one after another: H-086 Cancel deletion (`ccda2f2`, first H-076, then H-085, renumbered for dev's fluid UI pass) → H-081 account-required mode (`8a860a7`) + RJ decision 14 H-093/H-094 (`1da257d`) → H-077 write budget (`d029bd4`) → H-078 `appVersion` + preview deploy path (`c1ae411`) → H-079 AC 22 rules test (`7bb7252`). Each one passed the validator and a code review.
- Merged the chain with `dev` @ `dd9673b` on `loop/SPEC-010-v0.9-build` (`1337685`): Import page gate around dev's drag-and-drop, AC 46 nav test split for the phone tab bar, API Contracts renumbered v1.7–v1.10. 444 web + 34 rules tests.
- Incident: H-078 validation created an empty preview channel `sync-test` (real Firebase CLI ran instead of a fake). Briefs now forbid the real CLI.
- Board IDs taken: H-087–H-094, H-097–H-099; `next_id` 100. Open work compiled in [[Open Work 2026-11-24]].

## 2026-11-24: H-079 H-062 clean-ups (builder)
- [[Accounts and Sync]] AC 22 on `loop/H-079-rules-cleanups` (from H-078 tip `c1ae411`): rules test for a 37-character `duplicatedFrom` (denied; 36 allowed); stale comments fixed in `sync-types.ts` (`KNOWN_DOC_SCHEMA`, no spec version) and `firebase-adapters.ts` (`WRITE_TIMEOUT_MS` → `'unconfirmed'`, `withTimeout` SYNC-042 → SYNC-080). The `PushChanges.batch` comment was moot after H-077.
- H-084 overlap check (`dev` board row): none. Tests: 376 web unit, 34 emulator (Java 21 prepended to PATH for `test:rules`; Java 17 is still first in agent shells). Validator PASS round 1 ([[Validation H-079]]); code review: no findings. No new board IDs (`next_id` 100); SYNC-113 spec text already filed as H-097.

## 2026-11-24: H-078 per-build appVersion and preview deploy path (builder)
- [[Accounts and Sync]] SYNC-012 / SYNC-007 on `loop/H-078-appversion-preview`: `web/scripts/build.mjs` computes `web-<prod|preview>-<first 7 hex of HEAD>` (git, then `GITHUB_SHA`, else UTC build time) and passes it to `ng build` as the define `APP_VERSION`; `npm run build` / `build:preview`. Preview deploy: `npm run deploy:preview -- <channel> [expires]` (from `web/`) → `firebase hosting:channel:deploy <channel> --config firebase.preview.json`, whose predeploy builds `preview` into `web/dist/web-preview` and refuses to run unless `deploy:preview` started it. Production paths unchanged. Notes in the root README and [[API Contracts]] v1.6.
- Tests: 28 new (`web/src/tooling/*.spec.ts`, SYNC-012 / SYNC-007 / AC 35 / AC 42); 376 web unit tests and 33 emulator tests green; lint and both builds clean; bundles grepped (`web-prod-d029bd4` + `signInEnabled:!1`, `web-preview-d029bd4` + `signInEnabled:!0`, time fallback `web-prod-20261124T174845Z`). No real deploy: RJ runs the first preview deploy.
- Validator PASS round 1 ([[Validation H-078]]); code review of `d029bd4...HEAD`: no findings. Follow-ups H-098 (spec-writer: SYNC-007/012/118 text), H-099 (RJ: real preview deploy; a validator dry run by mistake created an empty `sync-test` channel, nothing uploaded, `live` untouched). `next_id` 100.

## 2026-11-24: H-077 first-sign-in write budget (builder)
- [[Accounts and Sync]] SYNC-050 on `loop/H-077-write-budget`: the first-sign-in flow now pushes the account write only (`planAccountPush`), so an expired deck tombstone or a merge repair found by the download can no longer ride along with the account `update()` (a real gap: a mutation run made the new test fail). Removed `PushChanges.batch`, `PlanOptions.batch` and its push-everything branches, the adapter's `writeBatch` chunking and `BATCH_CHUNK`, and the fake's batch path and `failBatchAfter`. The fake now logs each push (`pushLog`) and applies the SYNC-113 create rule per write in order. [[API Contracts]] v1.5.
- Tests: AC 4 (both halves), AC 36 e/f with an older build, the tombstone case, two `push-plan` tests; AC 3/36/40/48 tightened to exact write and push logs. 344 web unit tests and 33 emulator tests green; lint and build clean. Spec text conflict for spec-writer: SYNC-113 says the `batch` split stays in the code; the data contract says it may go (it went).
- Validator PASS round 1 ([[Validation H-077]]); filed H-097 (spec-writer: SYNC-113 `batch` text, SYNC-050 "nothing pending" qualifier); `next_id` 98. Rebased onto H-081 tip `1da257d` (SPEC-010 v0.9, no H-077 rows changed): 348 web and 33 emulator tests green, lint and build clean. Code review of the diff: no findings. H-077 done.

## 2026-11-24: H-081 account-required mode (builder)
- Built [[Accounts and Sync]] v0.8 account-required mode on `loop/H-081-account-required`: SYNC-009 sign-in gate from the sync log (new `sessionLostUid`), panels on Collection / Decks / deck detail / Import, `SignInGate.deckControls` for Tournaments; first sign-in clears the device then downloads (no Combine, no upload); sign-out, the half-deleted branch and `deleted` clear the device; new sign-in and sign-out dialogs. Local-only mode unchanged (tested). [[API Contracts]] v1.4, [[UI Index]] row.
- Tests: 331 web unit tests and 33 emulator tests green; lint and build clean. The first-sign-in write counts of ACs 3, 5, 36, 40, 48 pass without a separate H-077 change (the clear leaves nothing to upload); H-077's `batch` clean-up and edge cases remain.
- Code review fixes (committed build `4c0c786`, fixes in the working tree): a session generation counter stops work from an ended session (sign-out, deletion, SYNC-097, lost session) from writing to the cleared device (SYNC-091); the sign-out dialog catches a failed Sync now; new tests for both, for offline Sign out in the menu, and for a stored linked uid loading no Firebase. 337 web and 33 emulator tests green; lint and build clean.
- Validator PASS round 1 and, after the review fixes, round 2 ([[Validation H-081]]). H-081 done. Filed H-089 (spec: v0.7 Keep-a-copy log on re-sign-in), H-090 (spec: SYNC-009 gaps, other tabs, h1 above panel), H-091 (builder: gate the Tournaments / COLL-074 controls once built), H-092 (builder: no Try again after signing out mid-deletion); `next_id` 93.
- RJ decided on the sign-in panel: keep the page header above it; signed-out text "You need a free account to import cards or decks." Filed H-093 (spec) → H-094 (build); `next_id` 95.
- H-094 (builder): `GATE_TEXT.signedOut` = "You need a free account to import cards or decks."; page headers kept as built, new `gated-pages.spec` test for AC 46 "header above the panel"; [[UI Index]] row marked decided (RJ decision 14).

## 2026-11-24: H-086 Cancel deletion and the account-menu Try again (builder)
- Built SYNC-096 / AC 43 from [[Accounts and Sync]] v0.8: `RemoteStore.deleteAll` reports `removedAny`, sync log `deletingRemovedAny`, account menu shows Try again (works after a reload) and Cancel deletion while nothing was removed. [[API Contracts]] v1.3.
- Tests: 294 web unit tests, 33 emulator tests (`test:rules`, new `rules-tests/delete-all.test.ts`); lint and build clean. Builder choices for the spec: Cancel deletion stays enabled offline (only Try again needs a connection); a log from an older build with `deletingUid` but no `deletingRemovedAny` offers no Cancel; a `deleteAll` that returns `'ok'` also sets the flag true.
- Validator PASS round 1; code review (4 findings): fixed a stale failure notice whose Try again could restart a cancelled deletion (Cancel now dismisses it) and a misplaced doc comment; skipped a rare log-write nit and a pre-existing step-3 message gap. Validator PASS round 2 ([[Validation H-086]]). Renumbered H-085 → H-086 (clash with `dev`); new H-087 (spec catch-up), H-088 (step-3 messages); `next_id` 89. Committed on `loop/H-086-cancel-deletion`.

## 2026-11-24: H-074 SPEC-010 follow-ups (spec-writer + validator)
- SPEC-010 [[Accounts and Sync]] v0.7 brought in line with the H-062 build (data contract, batches of 10 with resume via `uploadingUid`, `cloudDocs` create detection, `'unconfirmed'` writes, email-link return trigger, device-local `lastBuild`, emulator Auth codes, interim Delete placement, `duplicatedFrom` ≤ 36, preview-build gap, Java 21). 89 rows, 44 ACs.
- RJ decision 12: a deletion that removed nothing offers Cancel deletion → builder H-086.
- Validator PASS round 1 ([[Validation H-074]]). New items H-086 (cancel deletion; first filed as H-076, renumbered for a clash with `dev`), H-077…H-079 (first-sign-in extra writes, `appVersion` stamping + preview deploy, clean-ups). No code. Committed on `loop/H-074-spec010-followups`.
- RJ then changed the model: an account is required to import cards or decks (Tournaments open to all); sign-out clears the device; signed out = Home + Tournaments; production keeps no-account imports until sign-in is on; old browser data ignored. Filed H-080 (ADR-0007 + SPEC-010 v0.8) and H-081 (build).
- H-080: ADR-0007 amendment accepted by RJ; SPEC-010 v0.8 (two modes by `signInEnabled`, sign-in gate with `sessionLostUid`, no Tournaments deck controls when signed out, lost session closes the pages, no legacy-data warning). Validator FAIL ×2, PASS round 3 ([[Validation H-080]]). New H-082 (Home copy), H-083 (RJ: 2 open questions). Build handed to one builder session (H-086, H-081, H-077, H-078, H-079). Spec-writer agent now limited to `brain/`.

## 2026-11-24: H-085 fluid UI pass, teal accent, phone tab bar (builder)
- RJ's brief: fluid pass + home redesign, teal (green as an alternative) instead of blue, fixed bottom tab bar on phones. Built on `loop/H-065-fluid-ui`; details, accent values and contrast ratios in [[Design Direction]] ("Fluid pass and teal accent").
- Teal `#14B8A6` (light `#0F766E`) with AA text and label tones; green preview via `html[data-accent="green"]` and a switch on `/styleguide`. Material theme, favicon SVG/ICO/PNG regenerated.
- Motion tokens and layer, Angular view transitions on `<main>` only, a global reduced-motion block. Sticky header aligned to the content edges; phone tab bar with `aria-current`. Home: full-screen hero, one-time deal-in + ownership fill, bands with one rhythm, the arrow-link row removed. Import: drop a file on a card or the text box (same upload path). Empty states have the deck mark.
- Lint, build, 164 tests pass (new: tab bar, drop → dialog, dialog drop). Component-style budget warning raised from 4 to 6 kB. Checked with headless-Edge screenshots at 1440, 1024, 768 and 390. H-085 → verify (filed as H-065 at first; that ID was already taken on `dev`, so the branch keeps the old name); RJ review gate.
- Same day (main session): installed the `design-taste-frontend` skill (project-level, `.claude/skills/`, reviewed; used as motion/layout reference only, Direction A kept). Merged `dev` into the branch (`9a026e5`, account menu moved into the new header row), then RJ approved: branch → `dev` (`38aab0b`), `dev` → `main` (`36ceb2c`, 346 tests, build clean), both pushed. The deploy drops `riot.txt` again (H-056). Open: validator run for H-085, RJ's teal vs green pick.

## 2026-11-24: H-058 family merged into one branch, PR to `dev` (with RJ)
- Merged `loop/H-058-shared-cards-lockin`, `H-050-spec004-bump`, `H-045-tags-column`, `H-049-spec-followups`, `H-059-lockin-engine`, `H-062-accounts-sync-build` into `loop/H-058-family-merge` (from `dev`).
- Version clash: H-045 keeps SPEC-003 0.7 / SPEC-007 0.6; H-049 renumbered to SPEC-003 0.8 / SPEC-007 0.7, its new ACs 35–40 → 36–41. SPEC-008 0.3 also holds H-059's 0.2.1 fix; SPEC-005 0.4.1. Board ID clash: H-059's H-069 → H-076 (H-062's privacy research keeps H-069), next_id 77. API Contracts 1.6.
- Validator FAIL (SPEC-003/007 frontmatter versions, stale renumbering text, Validation Runs order, H-061 Done row pipes, Done table > 10) → fixed. Code review: engine and store record types had drifted (`StoredTags` schema 2 vs 3) → builder made `shared/storage/records.ts` the single source. Lint, build, 339 tests green.
- Still open: H-074 (SPEC-010 follow-ups, incl. its stale pins) running in its own session; H-060 not built.

## 2026-11-23: H-058 shared cards + lock-in, runes, then sessions per item (with RJ)
- Researcher: [[Physical Copies Across Decks]]. The Chosen Champion shares the per-name pool with Main/Sideboard. RJ chose to count every physical section (Legend, Champion, Main, Sideboard, Battlefields) and to ignore runes.
- SPEC-008 [[Shared Cards and Lock-in]] and SPEC-009 [[Runes Assumed Owned]]. RJ accepted the five lock-in defaults and decided no force lock.
- Validator round 1 FAIL (missing When steps, filter overlap, cross-spec warning placement) → H-065..H-068; round 2 PASS. Code review: 2 nits, both fixed. Committed on `loop/H-058-shared-cards-lockin`. `loop/ui-direction-a` deleted locally (fully in `dev`).
- One session per remaining item: H-050, H-045, H-049, H-059 done on their own branches; H-061 grew into H-062 (build) and H-074 (still running). Merge plan and the SPEC-003/007 version clash are in [[Current State]].

## 2026-11-23: Hero note text, local deploy with riot.txt (with RJ)
- RJ shortened the home hero note to "Free". Committed on `dev`, merged into `main` (not pushed).
- Local `firebase deploy --only hosting` from `dev` with the uncommitted `web/public/import/riot.txt`, so it is served at `/import/riot.txt` again (H-056 still open: the next Actions deploy of `main` drops it).

## 2026-11-23: One `builder` agent replaces service-builder and ui-builder (with RJ)
- Checked whether spec-writer had been building. Its definition never said to, and it has no Bash, but spec-writer items still shipped code: H-058 (8 `web/` files for the "available" label), H-029 (page text, routes), and H-048 (spec work and parser in one commit). Much UI work also ran in the main session without a builder.
- RJ chose to replace both builders with one [[builder]] agent for UI, browser business logic and services. It keeps the RJ review gate for screens and the API Contracts rule, and must run lint, build and tests before it reports.
- [[spec-writer]] now has a "You don't write code" rule: spec changes that need code become `builder` board items. `/loop` dispatches only `builder` for code. Validator routes code bugs to `builder`.
- Open board items H-047, H-057, H-059, H-060, H-062 and H-064 moved to `builder`. Done rows keep their old owners as history. Updated CLAUDE.md, [[Loop Protocol]], [[Home]], the [[Agents/README|Agents README]], and the owner lines in UI Index, Design Direction and API Contracts. `.claude/` copies refreshed. Nothing committed.

## 2026-11-23: H-050 SPEC-004 version bump (spec-writer)
- SPEC-004 0.4 → 0.5 to record the H-044 lower-case "your decks" strings (CAT-070/074/076, ACs 16–18); archive changelog entry added. Pins → SPEC-004 0.5 in [[Spec Index]] (SPEC-004/005/006 rows), SPEC-005 and SPEC-006 Summary "Depends on" lines; SPEC-006 metadata-only changelog line. Validator PASS (V-009 + pins). H-050 → done. Branch `loop/H-050-spec004-bump`, no code.

## 2026-11-23: H-045 collection CSV export vs positional import (spec-writer, validator)
- RJ decided: the collection CSV export has **no Tags column** (tags and exclude flags are not in the CSV backup; sync per ADR-0007), and it **writes printing codes** (`2,Lightning Rush RAD 001`) so `byPrinting` round-trips. Unassigned, missing-printing and no-code copies go on a name-only row, the export re-parses each row before writing it, and counts above 999 split across rows.
- SPEC-003 0.7 (IMP-055, export rules 1–10, round-trip guarantee, AC 35), SPEC-007 0.6 (COLL-059 withdrawn, AC 24); changelogs, Spec Index, Current State updated.
- Validator: round 1 FAIL (AC row order, guarantee vs rule 7, no-code printings, 999-multiple rest row) → fixed → round 2 PASS. H-045 done. Follow-up for H-050: SPEC-005/006/008/009 still cite SPEC-003 0.6 / SPEC-007 0.5.

## 2026-11-23: H-049 spec follow-ups (spec-writer + validator)
- SPEC-003 0.7 (0.8 after the merge renumbering): import code behaviour written into the spec (interim CSV delimiter rule, decimal quantities, `2. Gust`, label-cell rows, seven upload checks with exact messages, upload kept/dropped, encoding rejection, row limit on the converted line, pre-catalog summary fields, Line grammar steps 3/5); IMP-050 split into MUST + IMP-050a SHOULD; new ACs 35–40.
- SPEC-007 0.6 (0.7 after the merge renumbering) / SPEC-008 0.3: an import Undo warns about locked decks inside the COLL-058 confirmation, or asks for one only on a shortfall (no notice after). H-060 wording updated to match.
- Validator PASS (strings probed against `parse-card-list.ts`, 157 web tests). RJ then decided: straight `'` in all UI messages (three import messages changed in code, 157 tests green) and Undo keeps the notice after it, with the warning before; every locked-deck warning ends "It stays locked." Validator PASS again. Committed on `loop/H-049-spec-followups`.

## 2026-11-23: H-059 shared pool / lock-in engine (builder, validator)
- Built the pure SPEC-008 / SPEC-009 engine and SPEC-005 v0.4.1 `computeDeckOwnership` in `web/src/app/core/decks/` (decision on the board: browser-only consumer, `services/` not hosted, `web/` can't import `services/`). Minimal SPEC-007 `deckOwnership` and SPEC-002 `banStatus`; `nameKey` moved to `web/src/app/core/cards/`; `tileOwnership` moved to core with a "… locked in" option. No new dependencies.
- Cycle: validator round 1 FAIL (split-card label: OWN-033 vs SPEC-005 AC 4 / SPEC-008 AC 6) → spec-writer made OWN-033 explicit and fixed both ACs (SPEC-005 0.4.1, SPEC-008 0.2.1, no behaviour change). Code review (/code-review high, then an independent reviewer): lock comparator made a total order, rune detection uses the pool's catalog, `banStatus` memoized (OWN-080 was ~430 ms with a real ban list), caller duties documented. Rounds 2 and 3 PASS; web lint / build ok, 217 tests.
- Changed notes: [[API Contracts]] (1.4, browser-side shared types), [[UI Index]], [[Your Decks Ownership View]], [[Shared Cards and Lock-in]], [[Validation Runs]], [[Handoff Board]] (H-059 done, H-060 blocked on Decks page only, new H-076 (H-069 on its branch)).
- Open questions: H-076 (numbered H-069 on its branch; ownership-unavailable values, unparseable `lockedAt`, per-card vs total shortfall). Branch `loop/H-059-lockin-engine`, committed, not merged or pushed.
- Next: Decks page, then H-060.

## 2026-11-23: H-061 accounts and sync spec (spec-writer + validator)
- New SPEC-010 [[Accounts and Sync]] v0.4 (88 rows, 36 ACs): optional sign-in behind `signInEnabled`, the [[Firestore Data Shape]] layout, device-local sync log with 30-day tombstones, latest change wins per card count / tag target / lock / deck (monotonic stamps), first sign-in Combine or Cancel, offline, sign-out, delete account, owner-only rules with field validation. Locks sync (`state/locks`, `{lockedAt|null, updatedAt}`).
- Validator FAIL ×3 (rounds 1–3: 6 + 4 + 2 blockers), PASS round 4 ([[Validation H-061]]). Spec Index and Current State rows added.
- Board: H-061 done; H-062 → todo (after H-071); new H-069 (privacy notice research), H-070 (`existsAfter()` billing research + Data Shape estimates), H-071 (SPEC-010 impacts on SPEC-003/006/007/008, ADR-0007), H-072 (V-011 `web/` adapter path), H-073 (RJ: 11 open questions). No code. Committed on `loop/H-061-accounts-sync-spec`.
- RJ answered all 11 questions (H-073): SPEC-010 v0.5 (89 rows, 38 ACs, new SYNC-077 same deck status on every device), validator PASS round 5. H-062 handed to `builder`.
- H-062 built (branch `loop/H-062-accounts-sync-build`): local stores, sync engine, Firebase adapters (lazy), account UI behind `signInEnabled`, owner-only rules. Validator FAIL round 1 (3) + code review (7 findings, incl. deleted-account mapping: emulator says `auth/user-token-expired` / `auth/invalid-refresh-token`), all fixed; PASS round 2. 271 web + 27 emulator tests (Java 21 = Android Studio JBR). New H-074 (spec follow-ups), H-075 (build leftovers).
- RJ enabled the Email link provider and filled in the Firebase web config. SPEC-010 v0.6: providers from build config `authProviders` (default email link; Google later by config). Build matches; validator PASS round 3 (278 web + 27 emulator tests).

## 2026-11-23: H-065 / H-066 / H-067 validator fixes for H-058 (spec-writer)
- When steps added to every flagged AC; SHARE-051 makes each deck one ownership group (empty / runes-only → None available, "No cards to count"); `no-cards` message; Deck 3 = `Kennen Aggro`; locked-deck warning now always inside the confirmation (incl. the IMP-050 Replace confirmation), Undo of an import is the only notice. SPEC-003 0.6, SPEC-005 0.4, SPEC-007 0.5, SPEC-008 0.2, SPEC-009 0.2, SPEC-006 pins only; Spec Index, Current State and changelogs updated; H-065/066/067 → verify. RJ's decisions unchanged; no code, nothing committed.

## 2026-11-23: Home page copy pass (ui-builder, with RJ)
- Rewrote `/` copy shorter and more casual; RJ picked the headline "Know what you own. Own what you need." and approved the rest from a before/after table. Unbuilt features (deck view, Tournaments) now say "coming soon". American spelling ("color").
- Ownership section: title "Collect the cards each deck needs.", text "Know what you need at a glance. Collect every copy you need of a card to fill it with color."
- Tournaments reframed as **Winning decks** ("Pick a winning deck to work towards."): tournaments exist to supply winning constructed decks to add as a goal. New `top-eight-panel`: events expand to their Top 8 as full Legend cards (placing, player, Legend name). Three layouts shown as screenshots; RJ picked swipe on phones and a grid on wider screens, then: same flow as Ownership, no cropping, panel no taller than Ownership's (8 across). 157 web tests.
- Reviewed on a Firebase preview channel and headless-Edge screenshots. RJ: pushed `dev` (`af8806a`), merged into `main` (`e8a4ae2`), Actions deployed; then a local hosting deploy put `riot.txt` back (H-056: still uncommitted, every Actions deploy drops it). Notes in [[Design Direction]] and [[Current State]].

## 2026-11-23: Firestore data shape and sizing (input to H-061)
- New [[Firestore Data Shape]] (05-Services): `users/{uid}`, `state/collection` (one document, per-card map), `state/tags`, `state/locks`, `decks/{deckId}`; `schemaVersion` / `updatedAt` / `syncedAt`, per-card and per-tag timestamps, 30-day tombstones, indexing off except `syncedAt`.
- Sizing: ≈ 95 KB per realistic user, ≈ 640 KB per heavy user; Spark supports about 1,300 DAU (writes bind) and about 7,000 accounts at a 90/10 mix. Free-tier limits checked on the official Firebase pages 2026-11-23.
- ADR-0007 gained a "Data shape" section. H-061 row updated with the layout; Current State links the note.

## 2026-11-23 (evening): bug fixes, deploy, Firestore
- Built, code-reviewed and validated H-046 + H-053 (parser: delimiter, one upload path, limits, encoding, summary), H-054 (skip link, card-art alt), H-055 (`/api` dev proxy, hosting rule). Each on a `loop/` branch merged into `dev`; 156 web tests.
- Pushed `dev` and `main` (RJ, no PR); GitHub Actions deployed `0b7e668`. Live check: the `!/api{,/**}` rule only excludes `/api/` on real Hosting.
- Hosting discussion: no server needed; card data as a static snapshot built in CI (proposed, ADR-0004 open). RJ chose Firebase for optional accounts: ADR-0007, Firestore `(default)` Standard in `us-south1`, rules deny all. Board H-061 (sync spec), H-062 (build), H-063 (Auth providers).
- Tooling: `.agents/` and the ingest snapshot ignored, `skills-lock.json` committed, `Untitled.base` deleted.
- Next: DB sizing and shape session for Firestore.

## 2026-11-23: H-058 shared cards, lock in, runes (spec-writer)
- RJ's decisions recorded in ADR-0006 "Shared cards, lock in and runes" (every physical section shares one per-name pool; runes ignored), plus Claude defaults RJ may change.
- New SPEC-008 [[Shared Cards and Lock-in]] v0.1 (available = ownedForDecks − held by other locked decks; earliest lock wins; short locks stay locked and flagged; no card edits while locked) and SPEC-009 [[Runes Assumed Owned]] v0.1.
- SPEC-005 0.3 ("available" labels, breakdown, runes out of counts), SPEC-006 0.6 (lock rules on edit/delete/duplicate), SPEC-007 0.4 (per-name pool note, runes never needed, shortfall warning). Spec Index updated.
- Board: H-058 → verify; new H-059 (service-builder, pure engine) and H-060 (ui-builder, Decks UI), both blocked; H-021 also checks for non-basic runes. No code touched, nothing committed.
- RJ accepted the five lock-in defaults (earliest lock wins, no yield to unlocked decks, short locks stay locked, no card edits while locked, Undo restores unlocked). RJ also decided no force lock (SPEC-008 open question 2); SPEC-008 has no open questions.

## 2026-11-23: spec catch-up H-043 / H-040 / H-044 + code review
- Verified the import code already does RJ's decisions (quantity required, .xlsx, deck CSV, spaceless labels, one dialog); specs updated to match: SPEC-003/006 v0.4.
- SPEC-005 v0.2 (Riot section order, CAT-045 labels, `deckOwnership(input, cardKey)`); SPEC-007 calls aligned. Screens renamed to Decks / Collection in specs and ADR-0006.
- Validator: all three PASS. Code review (web 54, services 88 tests green; no key or XSS issues) filed as H-045…H-056.
- RJ: deleted the broken Firebase workflows (H-051), removed the unused `firebase` dep (H-052); `riot.txt` is the Riot API verification file. H-048 decided and built: `x3 Name`, `Name x3`, printing codes (`RAD 001/167`); SPEC-003/006 v0.5, 105 web tests, PASS. Code resolution → H-057 (needs H-020).

## 2026-11-23: UI direction, Rift Builder, home page and imports (with RJ, Claude chat)
- H-023 decided: direction A with a blue accent `#378ADD`, B/C-style ownership chip, small source line, Import as a raised button, Angular Material, slight 4/6/8px corners, Archivo headlines.
- Renamed to **Rift Builder** (from Riftbound Deck Builder, briefly Rift Decks); tabs **Decks** / **Collection**; deck-stack favicon.
- Built: home page at `/` (ui-builder ideas, Rift Atlas as layout reference only), Import paste-or-upload dialogs with the shared parser, shared card art / tile / chip components.
- PR #2 merged into `dev`, PR #3 `dev` → `main`, Firebase deploy succeeded. Follow-up PR for two later commits.
- New board items: H-043 (import spec updates), H-044 (screen-name spec updates).

## 2026-11-23: /loop round 3 + lighter brain
- Gate H-036 answered (ADR-0006): Legend + pilot + placing names; In Your decks + Add another copy; per-printing collection with ×N badge; tags on printings; exclude-from-decks tags; Your decks grouped by name.
- PASS: H-030 (SPEC-006 v0.2), H-034 (SPEC-007 v0.2), H-035 + H-037 (SPEC-004 v0.3, legal_as_of = event start), H-008 (services scaffold, 88 tests; V-003 waits on the live payload).
- Lighter brain (H-038): [[Current State]], `Archive/`, reading order for all agents.
- Next: H-039 (spec summaries + clean-ups) and H-007 (SPEC-005 Your Decks Ownership View).

## 2026-11-23: /loop round 2
- RJ feedback applied first: straight button borders (H-027), "Your decks" rename + one-line descriptions (H-028), product model correction ADR-0006 (H-029, H-032), Import option cards (H-033).
- Done: H-015 (SPEC-001/002 v0.2), H-016 (SPEC-004 v0.2), H-017, H-018, H-019, H-025, H-026, H-031 (SPEC-007 v0.1).
- FAIL: H-030 SPEC-006 Deck Import contradicts SPEC-004 on Add to Your decks (source shape, default name, duplicates) and uses old field names. WIP kept on its branch.
- Stopped at gate H-036 (RJ decisions). The services scaffold H-008 is now unblocked.
