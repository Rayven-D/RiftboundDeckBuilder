---
tags: [validation]
item: H-300
---
# Validation H-300

2026-11-26 · H-300 · PASS · `git diff origin/dev...HEAD` (2 files: the research note and the board row), grep for `SET-NUMBER-COPY` / "copy index" in the note, fact 7/8 trace, status and as_of check, V-009 · no failures

## Checks
- **No `SET-NUMBER-COPY` in the note:** grep count 0 in `brain/01-Research/Cards/Collection Import Formats.md`. Remaining hits are only in the Handoff Board row (item text) and [[Validation H-166]] (history). Pass.
- **Summary (line 30):** now `SET-NUMBER-ART`, trailing number is an art number (1 = base, above 1 = alternate art), not a copy count, cites fact 8. Matches fact 8. Pass.
- **TTS row (line 41):** `SET-NUMBER-ART`, "one token listed per physical copy" (what fact 8 says: `OGN-245-1` three times = three copies), art number not a copy index, cites fact 8 with fact 7 as see-also. Pass.
- **Citation choice:** the intent was to cite the fact that defines the TTS suffix. That is fact 8 (the TTS fact); fact 7 is the Piltover set and variant table. Citing fact 8 with fact 7 as see-also meets the intent. The board row's "fact 7" was a numbering slip.
- **Status and as_of kept:** the diff touches only the Summary line and the TTS row. Front matter (`status: unverified`, `as_of: 2026-11-24`) and the per-fact status and as_of cells are unchanged. Pass.
- **V-009:** sources, tiers, `as_of` and `status` still present; no new wikilinks. Pass.
