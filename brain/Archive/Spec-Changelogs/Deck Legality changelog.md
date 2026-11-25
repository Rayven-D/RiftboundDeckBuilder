---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Deck Legality]]"
---
# Deck Legality changelog

Moved out of [[Deck Legality]] on 2026-11-23 (H-039). Newest first. New changelog entries for the spec go here.

- 0.4 (2026-11-25, H-164; status `review`): from H-022 research. New LEGAL-B11 (2v2 ban data: 1 Legend, 14 cards, 7 battlefields, Radiance wave applies; stored, not shipped; 2v2 content section) and LEGAL-B12 (ban dates are zone-less calendar dates). LEGAL-C05 rewritten (first rotation at the start of 2028, Sets 1-5, kept as data, every `legalUntil` null, OGS unconfirmed, `partial`). LEGAL-C07 rewritten (promos legal by name, `excludedSets` = not legal as sets, `partial`), new LEGAL-C10 (SAMPLE printings not legal; flag BLOCKED on SPEC-001). LEGAL-006 (safe reading: Main Deck at any time) and LEGAL-006a (warning, `unverified`) reworded. LEGAL-012 notes battlefields have no domain (sample only, `partial`). AC 17 reworded; new AC 22-27. Open questions 1, 3, 5, 7, 9, 10 updated. Needs a builder item for the data files and engine (see H-164 report).
- 0.3.1 (2026-11-24, H-076): LEGAL-B02 states that inside one wave every `remove` is applied before every `add` (the engine already did this, H-059 chose it); new AC 21. No builder change.
- 0.3 (2026-11-23): H-039. New LEGAL-R08 shared display rules for messages: dates shown as `Nov 23, 2026`, `{format}` shown as the display name "Standard" (id stays `standard`); LEGAL-R07 and the message templates refer to it (with a rendered LEGAL-016 example); `FormatDef.name` for `standard` is `Standard`; AC 2 and AC 12 message texts updated. Summary block added; changelog moved to this archive note.
- 0.2 (2026-11-23): H-015, H-018, H-026 (ADR-0005/0006). `LegalityCardView` aligned to SPEC-001 (`cardKey`, `category`, nullable `domains`/`isChampionUnit`/`isSignature`/`championTag`, overnumbered via `variant.kind`; `catalogVersion` = SPEC-001 CARD-068); LEGAL-001/004/005/008/010/011/014/015/016/017/018/019 restated on `category`/`cardKey`. Set legality per ADR-0005: `formats.json` schema 2 (`legalFrom` Riot-published or `null`, `basis`, `sourceUrl`, `excludedSets`; `sourceTier` and community dates removed), LEGAL-C01–C05/C07 rewritten, new LEGAL-C08 (no community dates) and LEGAL-C09 (status mismatch warning). LEGAL-C04 is now MUST in wording too. LEGAL-B08: upcoming bans only from the announced date (AC1 fixed: empty as of 2026-11-08; AC3 extended). New LEGAL-B10 per-card ban status for Your decks and Tournaments. Source links on LEGAL-019/R02/R04/R07 (design rules). Consumers updated per ADR-0006 (Your decks shows ban status per card; no legality filtering of decks). New AC16–20.
- 0.1 (2026-11-23): draft. 19 construction rules (LEGAL-001…019, plus LEGAL-006a warning), ban-list data rules (B01–B09) with all four Standard waves through the Radiance update (effective 2026-11-23), format-legality data rules (C01–C07), evaluation rules (R01–R07), result contract, 15 acceptance criteria using the RC Europe Top 8 lists.
