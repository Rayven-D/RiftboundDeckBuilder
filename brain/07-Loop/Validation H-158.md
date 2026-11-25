---
tags: [loop, validation]
item: H-158
date: 2026-11-25
result: FAIL
---
# Validation H-158 (import commit landing and Undo)

2026-11-25 · H-158 · **FAIL** · lint, build, test (1022), AC 43–45, AC 26–27, V-009, Deck Import, API Contracts, tracked-store writes, scope · 1 failure (AC 26 Try again path has no test) + follow-ups

Judged against SPEC-003 [[Collection Import]] 0.12 and SPEC-007 [[My Collection]] 0.14, with RJ's 2026-11-25 answers (10 s window, no persistent Undo, Cancel re-shows the notice with a fresh 10 s). Branch `loop/H-158-import-commit`, uncommitted. TEST-033 / `removeTestDecks` out of scope (H-233; the seam comment is in `collection-import.ts`).

## Checks
| Check | Result |
|---|---|
| `npm run lint` (web) | PASS, all files pass |
| `npm run build` (web) | PASS |
| `npx ng test --watch=false` (web) | PASS, 73 files, 1022 tests |
| SPEC-003 AC 43 (Add stays on `/collection`, "Added 5 copies of 2 cards.", 1 copy / 1 card, 1,204 / 412, failed write keeps dialog open, no notice) | PASS. `collection-import.spec.ts`, `collection-commit.spec.ts`, `collection-page.spec.ts` (path stays `/collection`, no navigation) |
| AC 44 (Replace confirmation lists names, "Collection replaced: 1 card.", Undo at once, tags untouched, single use, Replace cancelled writes nothing) | PASS |
| AC 45 (notice survives Decks, Undo works there, changed-since confirmation, Cancel re-shows notice, locked-deck warning and "is now 1 card short") | PASS. The 10 s expiry is asserted only as `duration: 10_000` on the snack bar call, not with a timer (acceptable) |
| SPEC-007 AC 27 (after commit: no navigation, grid in place, Undo restores empty state) | PASS (first-import empty snapshot, `EMPTY_SNAPSHOT_AT`) |
| SPEC-007 AC 26 (card data didn't load) | **FAIL (partial).** Banner, no tiles/count/search/sort/export/Unresolved, nothing written, and the empty-collection case are tested. The **Try again** half is not: "When the user taps Try again and the catalog now loads, the grid shows ... 5 copies of 2 cards; when it fails again the same banner returns" (COLL-090 (d)). `retryCatalog()` exists in `collection-page.ts` but no spec calls it |
| IMP-050, IMP-050a, IMP-052, IMP-072…075, COLL-058, COLL-088, COLL-090, COLL-091 each named in a test | PASS (V-009 for these) |
| COLL-094 (e) snack bars above the FAB | PASS (global `html.has-fab` snack-bar rule in `styles.scss`; commit notice uses the shared MatSnackBar; existing `snackbar-offset.spec.ts` green) |
| Deck Import unchanged | PASS. `decks-page.ts` still opens `ImportDialog` without a `committer` and gets the `ParseResult`; dialog's no-committer branch unchanged; existing specs green |
| API Contracts current | PASS. v1.22 documents `ImportCommitter`, `CollectionImport`, `clearPrevious`, `EMPTY_SNAPSHOT_AT`, 10 s notice, and the H-233 note |
| Nothing writes outside tracked stores | PASS. `CollectionImport` uses `AppStores.stores` only; no direct `localStorage` / backend access in `core/import`, `collection-commit.ts`, `import-confirm-dialog.ts`. `clearPrevious` is routed through the tracked store's queue |
| Scope | PASS. Changed files are all H-158's (14 modified, 4 new paths). Handoff Board diff is the H-158 status `todo` to `doing` only. `brain/Build Matching.md` is not part of the change set and `web/public/import/` does not exist in this worktree, so neither was touched |
| Browser / a11y check of the new review step and confirmation dialog | SKIPPED (no browser run in this validation; unit tests only) |

## Failures (to file)
1. **AC 26 / COLL-090 (d), V-009.** Add a test in `web/src/app/pages/collection/collection-page.spec.ts`: with `catalogError: true` and a stored `lightning rush ×3`, `gust ×2`, tap **Try again**: loading state shows, then with the catalog now loading the grid shows in default order with "5 copies of 2 cards"; with the catalog still failing the same banner returns. Expected: passing test named `SPEC-007 AC 26 / COLL-090 (d)`; actual: none exists. Owner builder, P1.

## Follow-ups (not failures)
- **Fuzzy review not built (IMP-026…030).** Only exact-name and printing-code matches import; everything else is listed as left out in the review step. Consistent with IMP-027 (needs-review not imported until picked) but a user with near-miss names cannot finish the import. Needs a board item (builder, after a UI brief) or an RJ call.
- **Review-step strings are builder-invented** (`REVIEW_TEXT`, `COMMIT_TEXT`, `UNDO_TEXT.confirmTitle` and bodies: "Replace your collection", "How to add them", "Not matched, left out of the import:", "Check these:", "Undo the import?"). SPEC-003 does not word this step. spec-writer / ui-engineer should pin the wording (or RJ confirm), then builder aligns.
- **Undo is not atomic:** `save` of the restore, then `clearPrevious()` in one try. If the clear fails after the save, the user sees "Couldn't undo the import. Nothing was changed." although the restore happened, and `this.last` stays set. Low; reorder or treat a failed clear as success.
- **Changed-since check is inequality** of `updatedAt` (spec says "later than the commit's"). A superset, intentional (slow-clock devices); consider noting it in IMP-075 (spec-writer).
- **No timer test for the 10 s expiry** (AC 45 "after 10 seconds it is gone"); relies on Material's duration. Optional fake-timer test.
- Browser pass of the review step (radio group, focus after close, 390 px) and an accessibility audit of the new dialog states are recommended before RJ's review.

## Round 2 (attempt 2, 2026-11-25): PASS

2026-11-25 · H-158 · **PASS** · lint, build, test (1026), AC 26 retry path, IMP-075 (b), AC 45 timer, scope · no failures

| Check | Result |
|---|---|
| lint / build / `ng test --watch=false` | PASS; 73 files, 1026 tests |
| AC 26 / COLL-090 (d) Try again | PASS. New describe `SPEC-007 AC 26 / COLL-090 (d)` in `collection-page.spec.ts`: loads, so loading state (no banner, no grid), then "5 copies of 2 cards" with Lightning Rush then Gust; still fails, so the same banner and button return, no grid |
| Undo atomicity (IMP-075 b) | PASS. `collection-import.ts` marks `last = null` after the restore save, then ignores a failed `clearPrevious`; test shows "Import undone.", restored quantities, then "Nothing to undo." |
| AC 45 10 s expiry | PASS. Fake-timer test in `collection-import.spec.ts` |
| Scope | PASS. Same file set as round 1 plus this note; Board diff still only the H-158 status; `brain/Build Matching.md` / `web/public/import/` untouched |

Verdict: **PASS**. Remaining follow-ups to file (none block): (2) fuzzy review IMP-026…030 unbuilt (builder after brief / RJ call, P2); (3) spec-writer or ui-engineer pins the review/confirm/error strings, builder aligns (P2); (5) spec-writer notes `updatedAt` inequality in IMP-075 (P3); (7) ui-engineer browser pass and accessibility audit of the review step and confirm dialogs (P2). Items 1, 4 and 6 from round 1 are fixed.
