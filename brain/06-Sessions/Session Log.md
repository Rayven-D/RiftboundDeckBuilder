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

## 2026-11-28: Claude (discussion session): all deck-building specs
- Did: RJ asked to finish every spec from the deck-building discussion, build nothing, and keep the build next on deck. Specs: deck stats (H-719, SPEC-005 section O), physical copies + folders (H-703, new SPEC-015, SPEC-008 superseded), 2v2 (H-704, SPEC-002 0.8.1; RJ shelved the teammate check, 2v2 sideboard warning, single-deck notice), Wishlist (H-705, new SPEC-016), sync impacts (H-714, SPEC-010 0.23), H-718, SPEC-013/014 follow-ups. One bulk validation: H-703 failed on labels (Restore/Fork auto-fill and editor live stats had been cited as RJ's; fixed as default, proposed) and stale pins; re-check PASS ([[Validation H-719 H-703 H-704 H-705 H-714]]).
- Changed notes: [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]], the specs above, [[Spec Index]], [[Handoff Board]], [[Current State]]
- Open questions: H-725 (RJ, default, proposed items).
- Next: builder chain H-710…H-730 (P1, next on deck); ui-engineer H-706, H-707, H-708, H-731; researcher H-732.

## 2026-11-28: H-699 card dialogs on phones + Back closes them + list scroll on Back (builder, worktree `loop/H-699`)
- Built [[Brief H-698 Card Dialog Mobile]] (RJ request): both card dialogs are a bottom sheet at 40rem and below (handle, fixed head, scrolling body, deck step bar, swipe down to close, slide motion, reduced motion instant). Shared code: `web/src/app/shared/card-sheet/` (config, sheet behaviour, SCSS mixin). 768 and 1440 are pixel-identical to before.
- Back closes any card dialog at every width (RJ 2026-11-28): `shared/dialog-history.ts` `closeOnBack` (one same-URL pushState entry; other closes remove it with a swallowed `history.back()`; links in the dialog use `replaceUrl`). Reusable for other MatDialogs (open them with `closeOnNavigation: false`).
- Scroll on Back (COLL-093 (e), OWN-084): root cause was `/decks` reading `scrollY` in `onDestroy`, after Angular had already removed the list (clamped to 0). Now saved on `NavigationStart` with a top-tile anchor (`shared/list-scroll.ts`), restored over a few frames; Collection gets the same (it had none).
- Checks: lint clean; web unit tests 1660 pass, 1 fail that was already on `dev` (`preview-deploy.spec`: `firebase.preview.json` not mirrored after the H-064 regex); build OK; Playwright 23 / 23 (new: `card-sheet.e2e.ts`, `list-scroll-back.e2e.ts`). Not pushed.
- RJ tried the preview (2026-11-28): swipe down now also works from the **body** once it is at its top, including a drag that starts mid-scroll (the sheet moves from where the top was reached). Touch events, non-passive `touchmove` cancelled only while the sheet moves, `overscroll-behavior-y: none` meanwhile. Brief S6 updated. Tests: `bodyDragMove` unit tests and real-touch (CDP) e2e for (a), (b), a mid-scroll drag that does not close, sideways/upward drags and row taps.
- RJ 2026-11-28: a card dialog is now part of the history stack. A link in it keeps the dialog's entry (no more `replaceUrl`) and records kind + card id in that entry's `history.state`; Back from the linked page rebuilds the page, restores its scroll, then reopens the dialog on the same card (deck dialog: current step) on that entry (`takeDialogReopen` + `adopt`); next Back closes it; Forward returns to the linked page. Only on Back/Forward, never after a reload; a stale card opens nothing. Deck detail got a Back scroll restore of its own. The reopen waits for the route's view transition, and a history move to another page closes the sheet without its animation: an overlay opening or animating during the transition crashed Chromium's renderer in the e2e. Brief S7 and check 14 updated. New `e2e/dialog-reopen.e2e.ts`.
- Spec follow-ups to file: SPEC-005 OWN-113 (phone step bar, Back), OWN-084 / SPEC-007 COLL-093 (e) (now built for both lists), Collection Components §6 / Decks Components §12 (sheet on phones).

## 2026-11-28: H-717 motion fluidity pass (builder, worktree `loop/H-698-card-dialog-mobile`)
- Built [[Brief H-716 Motion Fluidity]] P1 and most of P2 (RJ: "not too much motion, but not too blocky"). RJ decisions recorded in the brief: no deck-title morph; no minimum skeleton time, nothing may delay content.
- New shared code: `shared/scoped-transition.ts` (`startScopedTransition`: in-page view transitions styled by a class on `<html>`; skipped under reduced motion, during a route or another scoped transition, or while a dialog / menu / select overlay is open), `shared/motion.ts` (`DIALOG_MOTION`, `playEnter`, token readers), `shared/deck-detail/view-anchor.ts` (S1 anchor). Tokens `--move-rise` 6px, `--move-shift` 12px, `--move-enter` 8px ([[Design Direction]]).
- P1: S1 Card / List keeps the section at the reading line (±4 px) and cross-fades in place; S2 a link in a card dialog closes it with the page swap so the route transition fades it out, Back to a reopened dialog is instant behind it and the dialog fades in place; S4 footer fades; S5 (1-2) chips keep their width, the active-filter row grows and shrinks; S7 dialogs rise 8 px from 98 % (no 80 % zoom), exit 120 ms, notices come down from the header, swipe timings from tokens. `MAT_DIALOG_DEFAULT_OPTIONS` would add 29 kB to the initial bundle, so every `dialog.open` spreads `DIALOG_MOTION` instead.
- P2: S3 theme cross-fade; S5 (3) tile moves on chip / filter-chip / Clear filters (tiles named only near the viewport, max 24; Filters "Show" and list-jumps cross-fade); S6 Previous / Next enter from the side, panel pick and Card / Missing fade; S8 art fade on load; S10 tab indicators slide; S11 FAB label eases, the FAB fades in with each page. Skipped: S9 skeleton fade (see report), P3 (S12–S15).
- Checks: lint clean; build OK (initial 471.06 kB, was 464.27); web unit tests 1677 pass, 1 known fail (preview-deploy.spec); dialog-history.spec AC 12 failed once in 4 full runs (jsdom history timing, logic untouched, passes alone); Playwright 49 / 49 (new e2e/motion.e2e.ts, 17 tests by check number). S2 link-out fade reverted: the captured dialog crashed Chromium's renderer on a deck-to-deck link. Not pushed.
