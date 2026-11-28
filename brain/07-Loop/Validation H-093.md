# Validation H-093

2026-11-27 · H-093 · PASS · lint, full web unit suite, spec cross-check, prod-visibility check · no failures

- `npm run lint`: all files pass. `ng test --watch=false`: 103 files, 1639 tests pass (card dialog is shared).
- Empty glossary: `KEYWORD_INDEX` defaults to `EMPTY_KEYWORD_INDEX`, no `data/keywords.json` ships, so `keywordRows()` is empty and the dialog's `@if` hides the section and heading (KW-056). No visible change to Collection's card dialog.
- Engine `core/cards/keywords.ts`: pure; only import is `formatIsoDate` from `core/decks/deck-ownership-view` (a pure helper). No new dependencies.
- Five unspecced behaviours (bad keywordId/asOf -> `incomplete`, duplicate counting, value-mismatch on unverified, report sort, invalid glossary = empty): none contradicts KW-014, KW-035, KW-037, KW-056. Filed H-690 (spec-writer, P3) to record them.
- Still open by design: KW-030a/032a/033a (H-020), CARD-065 wiring, provisional ACs 3, 5, 8, 18, 23.
- Not run: browser check of production (reasoned from code and tests).
