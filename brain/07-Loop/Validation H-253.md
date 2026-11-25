---
tags: [loop, validation]
item: H-253
date: 2026-11-25
result: PASS
---
# Validation H-253 (Deck Import save, folds in H-273)

2026-11-25 · H-253 · **PASS** · lint, build, test (1082), Deck Import ACs 26, 27, 29 and DECK-002, 003, 020…026, 070…076, 090…098, seam check, `core/decks/` untouched, Owned Cards Import regression, API Contracts v1.23, V-009 · 0 failures · 5 follow-ups (below)

Judged against SPEC-006 [[Deck Import]] 0.11.1 (`review`) and [[API Contracts]] v1.23. Branch `loop/H-253-save-imported-decks`, uncommitted. Board status change, `brain/Build Matching.md` and `web/public/import/` are not part of the item and were not judged.

## Checks
| Check | Result |
|---|---|
| `npm run lint` (web) | PASS, all files pass |
| `npm run build` (web) | PASS |
| `npx ng test --watch=false` (web) | PASS, 76 files, 1082 tests. Rules tests not run: no rules change |
| Tests named by DECK IDs | PASS. 11 tests in `core/import/deck-import.spec.ts` (save), 36 in `shared/import/deck-import.spec.ts` (review and draft), 7 in `pages/decks/decks-import-save.spec.ts` (dialog on `/decks`) |
| AC 26 (name = Legend, follows the Legend until typed, no suffix on duplicates, fallback `Imported deck Nov 23, 2026`, 80-char trim) | PASS |
| AC 27 (`notes` is `''` on save, `schemaVersion` 1, no new field) | PASS for the import side (rename and the 4,001-char refusal belong to DECK-081 / H-254) |
| AC 29 (dialog closes, stays on `/decks`, "Deck saved." with View deck to `/decks/<id>`, polite; 200 decks keeps the dialog open with `DECK_LIMIT`, nothing written, no notice) | PASS (delete / duplicate feedback is H-254 scope) |
| DECK-002, 003 (one deck, collection untouched, Continue writes nothing) | PASS. Asserted on the backend and on `stores.collection` |
| DECK-020…026 (sections, merge within a zone, repeated label, mismatch with Move to, champion kept twice, tokens rejected) | PASS |
| DECK-070…076 (name, source with `SOURCE_URL_INVALID`, `notes`, timestamps, `format`, `catalogVersion`, `sourceFormat`) | PASS. Monotonic `updatedAt` is the tracked store's stamp (existing sync tests); the import test asserts the stamped value |
| DECK-090…098 (account cache via tracked `stores.decks.create`, `schemaVersion` 1, limits, no write on error, keys-only entries, gate, After Save) | PASS. Pending sync log lists the new id; a fresh set of stores over the same storage lists the deck (reload) |
| Seam: save is an `ImportCommitter` on the H-158 `ImportDialog` (H-273) | PASS. `DeckImport` implements `DeckImportCommitter = ImportCommitter<PreparedDeck, DeckSaveRequest>`; the dialog closes with `'committed'` only after a written save. Generic change is backward compatible |
| `web/src/app/core/decks/` unchanged | PASS (`git status` empty for that path) |
| Owned Cards Import still works (shared parser accepts bold labels, `ImportCommitter` generic, `prepare` gets `text`) | PASS. `collection-import`, `collection-commit`, `import-dialog` and `parse-card-list` specs green, including the new bold-label cases. Collection ignores the extra `text` argument |
| `ImportPending` removal | PASS. No remaining references (build and lint clean) |
| API Contracts current | PASS. v1.23 documents the committer generics, `deckCommitter`, `DeckImport`, `NEW_DECK_ID`, `saved`, "Not built" list |
| V-009 / V-005 traceability | PASS for the in-scope IDs: every DECK ID named in the item's scope appears in a test name or spec comment. DECK-050…056 (legality), DECK-043, DECK-012, DECK-039 are declared "Not built" |
| V-010 (no metagame stats) | PASS. The review shows per-zone counts of one deck only |
| Browser / accessibility check of the deck review step | SKIPPED (no browser run; unit and component tests only). Recommend a ui-engineer pass on the review step |

## Builder's flags, judged
1. **ACs 7 and 23 say "Save is enabled" but DECK-034 asks PICK_CHAMPION first.** Acceptable, not a failure. AC 7's test adds a Champion section so Save is enabled as the AC intends. AC 23's test answers the champion question with "Leave empty" and says so in a comment. The code follows DECK-034 / DECK-038 (normative requirements); the AC wording is the stale part. Filed as a spec-writer follow-up.
2. **`DECK_REVIEW_WORDS` / `DECK_SAVE_TEXT` strings invented.** Acceptable for this item. The spec words only "Deck saved.", "View deck", "N cards need attention", the name fallback and the ZONE_CATEGORY_MISMATCH / token messages; those match exactly. The error and review copy is ordinary UI text with no rule or game claim. Follow-up for ui-engineer to review the wording.
3. **Sync only shown via the pending sync log.** Acceptable. The deck goes through the tracked store, which is the same path as every synced write; the log assertion proves it is queued for the account. An emulator round trip would add nothing the store tests do not already cover.

## Gaps accepted by scope (named in the item: "only as far as the spec allows without live data")
- Legality in review (DECK-050…056): no SPEC-002 engine or ban data in `web/` (H-194).
- Fuzzy suggestions (DECK-043, IMP-026…030) and the leading "a" / "the" rule (CARD-034, in DECK-040): exact `nameKey` only; same limit as the accepted Owned Cards Import (H-272). A line like `Dreaming Tree` therefore blocks Save today instead of resolving.
- Piltover codes and TTS (DECK-012, DECK-039; H-047 / H-057).

## Follow-ups (no blocking failures)
1. spec-writer P3: AC 7 and AC 23 say "Save is enabled" without answering PICK_CHAMPION (DECK-034, DECK-038); add the answer or a Champion section to the Given.
2. ui-engineer P2: review the Deck Import review step (wording in `DECK_REVIEW_WORDS`, `DECK_SAVE_TEXT`; layout in `deck-review.ts`, `import-dialog.scss`) and run the accessibility pass with the browser.
3. builder P2: leading-article rule (CARD-034 / DECK-040) for both imports, if H-272 does not already include it.
4. builder P2: legality display in the review (DECK-050…056) once the engine lands (H-194).
5. Handoff Board: H-273 is satisfied by H-253 (seam used); close it with H-253.

## Re-check 2026-11-25 (champion fix)

2026-11-25 · H-253 (champion fix, uncommitted on 88eece5) · **PASS** · `ng lint`, `npm run build`, `npm test` (76 files, 1088 tests), diff review against the research and spec, `core/decks/` status, V-009 · no failures

| Check | Result |
|---|---|
| 2+ cards under `Champion:` | PASS. The picked card gives one copy to `champion`, extra copies of that line go to `main` (`championExtraToMain`), unpicked cards go to `main` (`championNotPicked`), none go to `importRemovedLines`. "Leave empty" puts all in `main`. Matches DECK-034 "Copies not picked stay in `main`", [[Deck Construction Rules]] facts 1, 4, 15 and [[Physical Copies Across Decks]] fact 5 (4 options + 36 main = 40) |
| Legend behaviour unchanged | PASS. The diff touches only the `championCards.length > 1` branch; the `dropped` flag now only applies to unpicked Legends (DECK-033), covered by the new "unpicked Legends are still left out" test |
| DECK-036 / DECK-038 / DECK-050 | PASS. "Leave empty" still available; Save waits for the answer; nothing blocks on legality |
| `ng lint` / `npm run build` / `npm test` | PASS. 1088 tests green, matching the builder |
| `web/src/app/core/decks/` untouched | PASS (no status output) |
| V-009 | PASS. Six new tests name DECK-034 / 033 / 036 / 022; API Contracts v1.24 documents the change |

Notes (not failures):
- A single card under `Champion:` with quantity 2 is kept as written (DECK-025); builder flagged this for spec-writer. Not part of this fix.
- The two new reason strings are plain UI text; ui-engineer wording review (earlier follow-up 2) now also covers them.
