---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Collection Import]]"
---
# Collection Import changelog

Moved out of [[Collection Import]] on 2026-11-23 (H-039). Newest first. New changelog entries for the spec go here.

- 0.3 (2026-11-23): H-039. Part A preamble now lists the requirements not applicable to decks (the `.csv` parts of IMP-001/IMP-011, IMP-009, IMP-015, IMP-040…046), matching SPEC-006 DECK-013; CSV heading marked owned cards only; Purpose bullet aligned. Summary block added; changelog moved to this archive note.
- 0.2 (2026-11-23): Scope narrowed to owned cards (ADR-0006); deck lists move to SPEC-006 [[Deck Import]]. Requirements split into Part A shared parsing (reused by SPEC-006) and Part B collection-specific; purpose and links now point at [[My Collection]] (SPEC-007) and [[Your Decks Ownership View]] (SPEC-005), "Build Matching" removed. A1 resolved against CARD-030; ownership and merging by `cardKey`; IMP-029 comma-prefix check on canonical names; A2 bound to CARD-036 (MUST) and its normalization (IMP-033/037/044, no own zero-padding). IMP-048 and IMP-053 confirmed (ADR-0005). IMP-006 source now the Riot API catalog with the community count 1,451 as approximate; Riftcodex removed. IMP-002, IMP-018, IMP-031 reworded so the parser keeps sections and merging is collection-specific. IMP-011 decode reference IMP-030 → IMP-031. Data contract: `NameKey`/`PrintingKey` → `CardKey`/`PrintingCode`/`PrintingId`, `catalogVersion` from SPEC-001. AC10 rewritten with a genuinely unknown name; explicit **When** in ACs 10, 12, 14, 15, 17, 18, 21. Added IMP-058 (collection feeds SPEC-005/007, ownership by `cardKey`), IMP-059 (no alias table), IMP-060 (Owned Cards Import entry point); ACs 23–26. 60 requirements.
- 0.1 (2026-11-23): draft. Five formats, auto-detection, exact + fuzzy resolution, merge by name key, Add/Replace commit, local browser storage for MVP. 57 requirements (IMP-001…IMP-057).
