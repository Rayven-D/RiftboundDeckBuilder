---
tags: [validation]
item: H-343
---
# Validation H-343

2026-11-25 · H-343 · PASS · V-008 (lint, build, tests), V-009 (notes), V-010 (no meta stats in the diff), item Accept · no failures (three non-blocking notes).

## Checks
- **Lint (PASS):** `npm run lint` in `web/`: "All files pass linting."
- **Build (PASS):** `npm run build`: application bundle generation complete, no errors.
- **Tests (PASS):** `ng test --watch=false`: 85 of 86 files and 1298 of 1299 tests passed on the first full run. The one failure was `sync-engine-cache.spec.ts` AC 62 / SYNC-145 (3,000 entries and 200 decks), a 5000 ms `TestTimeoutError` after 5.5 s. Re-run alone, that file passes 9 of 9. It is a load timeout (other sessions share the machine), not a regression: the diff touches nothing under `shared/sync/`. The other timing failures the builder saw (decks-import-save 100 ms limit, decks-list AC 26, shared-pool SHARE-072) did not recur. A comparison against `origin/dev` was not needed.
- **Named tests (PASS):** the three specs the item touches plus `name-key.spec.ts` pass together (4 files, 84 tests). Test names carry the IDs:
  - `name-key.spec.ts`: CARD-034 and CARD-033, AC 6 and AC 21 (looseKey; Dreaming Tree both ways; exact beats article; `Echo, Twice` is not an article match; `A Pit` / `The Pit` ambiguous; bare `The`).
  - `collection-commit.spec.ts`: "CARD-034 / IMP-025" (6 tests, including the IMP-069 (a) fallback through the article rule).
  - `deck-import.spec.ts`: "DECK-040 / CARD-034" (6 tests, including `AMBIGUOUS_NAME` then a pick enabling Save).
- **Spec match (PASS):**
  - `nameLookup` does what CARD-034 says: exact `nameKey` first and step 2 never runs; then `looseKey` against `looseKey(cardKey)` of every card (both ways), one match is `found` with `method: 'article'`, several is `ambiguous` with the cardKeys, none is `not-found`. A bare article keeps its own key. The result is the card's own `cardKey`, so display and export are unchanged.
  - Deck Import uses `AMBIGUOUS_NAME` with the matching cards as `choices` and none picked, as DECK-040 and Deck Import AC 10 say. The message is the IMP-025 text ("matches more than one card. Pick one.").
  - Not widened: ingestion collision (CARD-032) and the legality name check stay exact, and catalog search (CARD-038) is untouched.
- **Docs (PASS):** API Contracts v1.29 matches the code (new `looseKey` / `nameLookup`, the new attention code, the collection left-out wording), and the changelog line says no endpoint or stored-shape change. Wikilinks used in this note resolve.
- **V-010 (PASS):** nothing in the diff adds meta statistics.

## Judgement on the builder's choices
1. **IMP-067 and IMP-068 stay exact (accepted).** Both spec rows compare names exactly: the code-versus-name agreement is a guard against a wrong card, and IMP-067's guard asks whether the whole typed card part is itself a card name. Loosening them would let `Dreaming Tree RAD 001` agree with the wrong card, and no requirement asks for it.
2. **Collection import leaves an ambiguous name out with `"<input>" matches more than one card: <names>.` (accepted).** IMP-025 sends it to `needs-review` with "Pick one.", but the Owned Cards dialog has no review or pick step yet (the fuzzy review of IMP-026…030 is not built). "Pick one." with nothing to pick from would mislead. The line is left out, not guessed, which is consistent with IMP-027 and with how the dialog already treats IMP-068 (b). Deck Import has the pick, and uses the spec text.
3. **Choices sorted by cardKey (accepted).** CARD-034 lists `ambiguous` with "their `cardKey`s" and sets no order, so a stable order is fine and keeps the list deterministic. The spec does not pin the sort; AC 10 says only "none pre-selected".

## Notes (non-blocking)
1. IMP-025's `needs-review` / `AMBIGUOUS_NAME` for the Owned Cards import stays unbuilt until the review step exists. It belongs with the existing review-step work (IMP-026…030); a row is proposed below only if no such row exists.
2. The `PRINTING_NAME_MISMATCH` choices keep their old order (code card, named card), while `AMBIGUOUS_NAME` choices are sorted. Both are fine under the spec.
3. `sync-engine-cache.spec.ts` AC 62 uses the default 5000 ms timeout for a 3,000-card, 200-deck setup, so it times out under load. A longer explicit timeout for that test would stop the flake.

## Proposed follow-up rows (for the caller to file; IDs H-420 and up)
| ID | Owner | P | Item | Accept |
|---|---|---|---|---|
| H-420 | builder | P2 | Give `sync-engine-cache.spec.ts` AC 62 / SYNC-145 an explicit timeout (it fails at the 5 s default when the machine is loaded; passes alone). Check the same for decks-import-save (100 ms limit), decks-list AC 26 and shared-pool SHARE-072 if they recur. | Spec files pass in a full `ng test` run with two parallel sessions active. |
| H-421 | builder | P2 (only if no review-step row covers it) | When the Owned Cards dialog gets its review step, show a CARD-034 ambiguous name as `needs-review` with `AMBIGUOUS_NAME`, the cards as choices and none picked (IMP-025), instead of leaving it out. | A test named IMP-025 asserts the pick enables the line. |
