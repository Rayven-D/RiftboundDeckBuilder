---
tags: [sessions]
---
# Session Log

Newest first. One short entry per working session.

Older entries: [[Session Log 2026-11-25]], [[Session Log 2026-11-24 (late)]], [[Session Log 2026-11-24]], [[Session Log 2026-11-24 (day)]] and [[Session Log 2026-11-23 (early)]] (archived).

## 2026-11-26 (all day): Decks finished and released (orchestrator, one session; RJ on the phone)
- Usage rules adopted (memory): trim the board into [[Completed Items Handoff Board]], validate in bulk, ui-engineer only when needed, pick each agent's model by task size.
- Merged: #112 (H-197), #113 (board trim 263 KB to about 60 KB), #114 (H-194 + H-344 legality), #115 (H-662/663, H-148/233/486), #116 and #117 (specs), #118 (H-665 card-name locks, H-667 instant sync, H-668 to H-671), #119 (H-672/673), #120 (H-674 to H-676), #121 (H-084, H-345; gates H-340 and H-382 closed), #123 (H-679 guest test data and the "Card data not loaded" fix, H-680 notice OK / swipe, H-681).
- Firestore rules (locks cap 400 to 6000) deployed to production with RJ's OK. **Released** to production: #122 (Collection + Decks, What's new 0.0.2) and #124 (guest test data, card-data fix); both GitHub Actions deploys succeeded.
- origin/dev was deleted by the release merge; restored at 2da96dd with RJ's OK. Tournaments left as is.
- Open: H-677, H-678 (P3), H-186, H-653 items 3 and 4, the rest of H-484; real card data waits on the Riot key (H-020; the live demo can back the H-011 application).

## 2026-11-26 (night): builder H-679 + H-680 (branch `loop/H-679-guest-test-data`, not pushed)
- H-679 (SPEC-013 0.2): signed-out **Load test data** on the sign-in panel (Collection, Decks, deck URL) fills fresh memory-only stores; `AppStores.stores` became a facade over the account cache or the guest stores, the sync engine keeps `AppStores.account`. Guest banner with Change set / Remove; imports stay sign-in only; sign-in discards guest data first. TEST-070 bug fix: `CardData.sourceChanged` re-resolves the catalog when the test marker changes (first sync, pull, load, remove, guest on/off) and forgets a failed `/api` result. [[Build H-679]].
- H-680 (SPEC-010 0.20.1 SYNC-162): one notice component for every snack bar: OK on plain notices, only the action on action notices, 44 px, swipe left / right to dismiss on touch (never runs the action). [[Build H-680]].
- Checks: lint, build (initial 461.58 kB), `ng test`, `npm run e2e` (Playwright from another worktree's `node_modules`: the junctioned one has no `@playwright/test`).

## 2026-11-26 (late): builder H-665 + H-667, then H-668 to H-671 (one branch `loop/H-665-H-667-name-locks-sync`)
- H-665: SPEC-008 0.6.1 card-name locks (engine, StoredDeckLocks v2 with the local and cloud v1 migration, per-name Lock / Unlock in the card dialog, lock icon on tiles and rows, removal confirmation in Replace and Undo, sync drop with one notice replacing H-148's text, rules cap 6000, Test Data name locks). state/locks measured: 4,000 entries 475,790 B; 6,000 entries 715,290 B.
- H-667: SYNC-126 immediate pull-then-push on six major actions, one queued follow-up, deletions after their Undo window. Then RJ's chat items H-668 (⋮ on the title row, two-line expandable name), H-669 (Copy missing list in the Missing panel), H-670 ("Can't lock. Missing n cards / copies.", reason line removed), H-671 (all notices at the top).
- Web: lint clean, build OK (461.6 kB initial), 1527 unit tests, 90 rules tests, e2e 5 / 5; not pushed. Notes, proposal wording and gaps: [[Build H-665 H-667]].

## 2026-11-26: builder H-148, H-233, H-486 (one branch `loop/H-148-H-233-H-486`)
- H-148 (SYNC-074): `SyncEngine.afterMerge` sends one `info` notice for all short locked decks (`lockedShortfallNotice`); combined wording = spec sentence per deck joined by a space (RJ to confirm). Takes effect once H-075 wires the hook.
- H-233 (TEST-033 / AC 12): a Replace import calls `removeTestDecks` in the same commit; imports now resolve against `CardData.loadApiCatalog()` so a Replace over test data writes the real `catalogVersion` (gap found: it would have written `'generated'`).
- H-486: flaky `app.spec.ts` cause = non-isolated Vitest + a leaked `sessionExpected` sync log made the real Firebase adapter load; stubbed `SYNC_ADAPTERS` and cleared storage in `app.spec.ts`. Notes: [[Build H-148 H-233 H-486]].


## 2026-11-26 (night): H-662 + H-663, Deck detail lock icon and no other-deck info on tiles (builder)
- Branch `loop/H-662-deck-lock-icon` from `origin/dev` @ `33a1411`, not pushed, one commit per item. H-662: the lock is an icon-only toggle after the deck name (same lock logic), no badge or lock date, no Lock in / Unlock button. H-663: card tiles and rows (Card and List view) show no "Also in N other decks"; the card dialog keeps it.
- Web: lint clean, build OK, 1472 unit tests pass (93 files), e2e 5 / 5. Choices and questions for RJ: [[Build H-662 H-663 Deck Detail]].

## 2026-11-26 (evening): H-194 + H-344, SPEC-002 engine and legality in the Deck Import review (builder)
- One branch `loop/H-194-H-344-legality` from `origin/dev` @ `cb1235b`, not pushed. Built `data/banlist.json` (Standard + 2v2 `unverified` snapshot), `data/formats.json`, the pure engine in `web/src/app/core/legality/` (LEGAL-001…019, set legality, SAMPLE stub, data check) and the review's "Rule check" block (DECK-050…056); `loadBans()` now returns real data.
- Web: lint clean, build OK, 1470 unit tests pass (93 files). Notes, choices and chosen wording: [[Legality Build H-194 H-344]]; contracts v1.35.

## 2026-11-26 (afternoon): `/board` remaining Decks follow-ups (orchestrator; RJ on the phone)
- RJ said "run everything", so four area sessions started (Import & Collection, Accounts & Sync, Legality & research, UI & Tournaments); RJ then corrected it to **Decks items only**. Two sessions were cut to their Decks items and two were stopped. A stopped session's background agents kept running and merged brain-only PRs before an explicit stop message reached them: lesson, a stop must also tell the session to stop its subagents and merge nothing.
- **Decks items:** H-501 (spec-writer, SPEC-006 / SPEC-003 text catch-up) PASS, [#108](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/108) merged by the loop; H-321 (ui-engineer, stale % text in [[Decks]]) PASS, [#101](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/101) merged; **H-560** (flaky styleguide spec) and **H-521** (singular "1 of 1 copy", RJ's call still open) PASS, code in [PR #109](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/109) for RJ. H-344 not run (needs the legality engine, H-197 → H-194).
- **Out-of-scope work merged before the stop (brain only, all validator PASS, kept):** H-291 [#100](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/100), H-300 [#99](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/99), H-196 [#102](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/102), H-072 [#103](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/103), H-195 [#104](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/104), H-169 + H-192 [#105](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/105), H-210 [#106](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/106), H-070 [#107](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/107). New rows from them: H-620 (needs-RJ), H-621, H-645, H-648, H-652.
- **Left local, unpushed (pick up in a later run):** H-197 validated PASS on `loop/H-197-sample-exclusion` (SPEC-002 0.5, rows H-640/641/653), H-093 WIP on `loop/legality-2026-11-26`, Accounts code WIP (H-075/H-148/H-084) on `loop/accounts-sync-work`, SPEC-010 0.18.0 draft on `loop/H-128-H-136-spec010-catchup`, uncommitted H-173 / H-675 drafts in the UI worktree. Their board rows are unchanged on `dev`.

## 2026-11-26: `/board` all remaining Decks items (orchestrator; RJ on the phone, one session per area, all in parallel)
- RJ answered last night's questions first, in chat, recorded in [PR #86](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/86): SPEC-006 0.12 approved, H-392's six answers (spec H-481, build H-482), H-452 strings, H-453 phone full screen, H-454 S3 = hold, Back keeps answers (H-479 → H-480), `@playwright/test` allowed (H-440 / H-431). `brain/Build Matching.md` and `riot.txt` stay local (RJ).
- Four worktree sessions: **Deck Import review** (H-410, H-451, H-452, H-453, H-469, H-480, H-500; specs H-479 → SPEC-006 0.13 [#94](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/94), H-454 → 0.14 `review` [#95](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/95)); **Deck detail** (H-462, H-464, H-466, H-467, H-468 (1)(4)(5)(10), H-482, H-520; specs H-481 [#87](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/87), H-477 [#88](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/88), H-476 [#89](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/89)); **Decks list** (H-463, H-465, H-478, H-400, H-468 (7)(8)(9), tile % 16px / 600); **tests** (H-420, H-430, H-431, H-440 with Playwright, `npm run e2e`). Every item passed the validator on attempt 1. Brain PRs #87, #88, #89, #94, #95 merged by the loop.
- RJ asked to put all code PRs into one: #90, #91, #92, #93, #96 combined into [PR #97](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/97) (`loop/decks-batch-2026-11-26`; only board-row conflicts, each row kept at its furthest status; H-468 and H-482 done once both halves were in) and closed. On the combined branch: lint, build, 1421 unit tests and 5 / 5 Playwright tests pass.
- Gate parked: **H-483** SPEC-006 0.14 `review` (S4 proposal DECK-105, S5–S7 open questions). Follow-ups: H-501 (spec text catch-up), H-521 (singular "copy"), H-560 (flaky styleguide spec). `next_id` 484.

## 2026-11-27: `/board 5`, first run in usage-saving mode (one session, grouped items, right-sized models)
- `/board` now has an always-on usage-saving section (`.claude/commands/board.md`): trim first, read light, group items, one session, ui-engineer only when needed, models by task size, short briefs and reports. The board had no `done` rows to trim.
- Round 1, SPEC-010 text (spec-writer + validator on Sonnet): H-214, H-211, H-136, H-137, H-130, H-131, H-128, H-129, H-190, H-678 → [[Accounts and Sync]] 0.21.0, [PR #126](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/126) merged by the loop. Follow-ups H-682 (builder), H-683 (blocked on deploy), gate **H-684**.
- Round 2, Collection / import text (Sonnet): H-186, H-271, H-257, H-096, H-161, H-184, H-199, H-241 → SPEC-003 0.18, SPEC-007 0.18.1 and patch bumps, [PR #127](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/127) merged by the loop.
- Round 3, UI polish (builder + validator on Sonnet): H-677, H-258, H-088, H-290, H-198 → [PR #128](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/128) for RJ.
- Round 4, Collection page (Sonnet): H-188 → [PR #129](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/129) for RJ; the ui-engineer look was skipped (rule 3), optional H-685.
- Round 5, sync (builder on Opus, validator on Sonnet): H-682 part 1 + H-133 → [PR #130](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/130) for RJ; full web suite 1598 pass. H-682 part 2 waits on H-684.
- All passed on attempt 1. `next_id` 686.

## 2026-11-27 evening: `/board` (usage-saving mode, one session)
- Trim: 26 done rows to the archive ([#134](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/134), merged by the loop). RJ answered H-684 before the run (email-link deletion notice approved, Google notice shelved; [#132](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/132)).
- Round 1 (builder Opus, validator Sonnet): H-682 part 2 + H-075 → [PR #135](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/135) for RJ. Follow-up H-686 (spec-writer).
- Round 2 (Sonnet): H-648 services lookup + H-064 hosting `/api` regex → [PR #136](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/136) for RJ. Gate **H-687**: RJ checks the regex on a preview channel; H-064 stays open until then.
- Round 3 (builder Opus, validator Sonnet): H-093 keyword engine → [PR #137](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/137) for RJ (no visible change until a glossary ships). Follow-up H-690.
- Round 4 (ui-engineer + validator Sonnet): H-270 import review audit (code read; visual pass H-697) + H-173 scrolling guidance (measurement H-696) → [#138](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/138) merged by the loop.
- Round 5 (researcher + validator Sonnet): H-621 Firestore Data Shape → [#139](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/139) merged by the loop.
- All attempt 1. Code PRs #135–#137 each bump the board's `next_id` and #135/#137 both touch [[API Contracts]]: expect small merge conflicts; keep the highest `next_id` (698). Another session's uncommitted brain work (ADR-0009 RiftHunt, H-021 row) was left unstaged.

## 2026-11-28: Claude (discussion session): deck building idea
- Did: talked through deck building with RJ in chat; recorded his decisions as [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]] and filed H-700…H-708 (researcher: formats; spec-writer: search, editor, physical copies + folders, legality formats, wishlist; ui-engineer: three briefs). No code.
- Changed notes: [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]], [[Handoff Board]], [[Decision Log]], [[Current State]], [[Inbox]]
- Open questions: none for RJ now; the spec-writer asks what the ADR leaves open (H-703 migration details, H-704 format picker).
- Next: H-701, then H-702, H-703, H-705; H-700 in parallel. H-698 (card dialog cleanup, another session) keeps its ID; `next_id` is 709.

## 2026-11-28: Claude (discussion session): formats research + UI directions
- Did: researcher H-700 (Sonnet) → [[Format Catalog]]; ui-engineer (Opus) → [[Direction H-706 Search and Deck Editor]], [[Direction H-707 Collection Folders]], [[Direction H-708 Wishlist]]; one validator pass (Sonnet), both PASS attempt 1 ([[Validation H-700 H-706]]). Filed RJ gate H-709 for the drafts' open questions.
- Changed notes: [[Format Catalog]], [[Formats]], [[Ban List]], [[Research Index]], [[UI Index]], the three directions, [[Handoff Board]], [[Current State]]
- Open questions: H-709 (RJ). The H-698 brief link in the H-708 draft resolves once that session commits its brief.
- Next: RJ answers H-709, then spec-writer H-701 → H-702 → H-703 → H-705, H-704 after H-702.

## 2026-11-28: Claude (discussion session): search and deck editor specs
- Did: recorded RJ's H-709 answers in ADR-0010 (parts 1–3, incl. deck version history); spec-writer (Opus) wrote SPEC-014 [[Card Search and Filters]] and updated SPEC-005/006/007; validator (Sonnet) PASS attempt 1 ([[Validation H-701 H-702]]). Filed builder H-710…H-713, spec-writer H-714 (SPEC-010 impacts), RJ H-715.
- Changed notes: [[Card Search and Filters]], [[Deck Import]], [[Your Decks Ownership View]], [[My Collection]], [[Spec Index]], [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]], [[Handoff Board]], [[Current State]], [[Decision Log]]
- Open questions: H-715 (RJ); `cost` field waits on H-020 (SEARCH-026).
- Next: H-710 → H-711 → H-712 (with H-714); H-713; spec-writer H-703 → H-705, H-704.

## 2026-11-28: Claude (discussion session): deck fork + cost filter
- Did: RJ "Yes to all" on H-715; new fork from any version (H-716, spec-writer Sonnet) and Cost = energy + power (SEARCH-026); validator PASS ([[Validation H-716]]); read-only/locked fork labelled default, proposed. Filed RJ H-717, spec-writer H-718; H-712 and H-710 pins updated.
- Changed notes: [[Deck Import]], [[Your Decks Ownership View]], [[Card Search and Filters]], [[Spec Index]], [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]], [[Handoff Board]], [[Current State]]
- Open questions: H-717 (RJ).
- Next: builder H-710 → H-711 → H-712 (with H-714); H-713; spec-writer H-703 → H-705, H-704.
