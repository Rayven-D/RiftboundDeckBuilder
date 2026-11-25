---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Card Data Model]]"
---
# Card Data Model changelog

Moved out of [[Card Data Model]] on 2026-11-23 (H-039). Newest first. New changelog entries for the spec go here.

- 0.4 (2026-11-25): H-165, from H-022 research ([[Ban List]] #10, [[Sets]] #6, [[Deck Construction Rules]] #17). New CARD-034 (MUST, `partial`): a lookup with no exact `nameKey` retries without one leading "the", exact match wins, unique match only, no alias table (so "Dreaming Tree" finds "The Dreaming Tree"); CARD-033 points to it; AC 6 rewritten (was `not-found`). CARD-023 promo codes OPP / JDG / PR stated with research status (legal by name is SPEC-002 LEGAL-C07, `partial`). New CARD-023a (`ARC` = Arcane Box Set, not a Standard set, `unverified` source). New CARD-044 (MAY, reserved SAMPLE marker, no field name, BLOCKED H-020) for SPEC-002 LEGAL-C10. Open questions 6, 12 updated, new 15–17. ACs 21–23. Data contract: comment only, `schemaVersion` stays `'0.2'`. Status `draft` → `review` (matching behaviour changed). Pins to SPEC-001 0.3 moved to 0.4 in SPEC-003, 005, 006, 007, 008 and the Spec Index.
- 0.3 (2026-11-23): H-039. CARD-016 `defaultPrintingId` SHOULD → MUST, with rationale (SPEC-007 COLL-012/014 are MUST and depend on it). Summary block added; changelog moved to this archive note. Data contract unchanged (`schemaVersion` stays `'0.2'`).
- 0.1 (2026-11-23): first draft (H-003).
- 0.2 (2026-11-23): H-015, H-017, H-026 (ADR-0005/0006). Shared contract: `domains`, `isChampionUnit`
  (renamed from `isChampion`), `isSignature`, `championTag`, `isPreview` are nullable, null = unknown
  (new CARD-029); overnumbered only as `variant.kind`; `type` verbatim + `category` enum
  `legend|champion|unit|spell|gear|rune|battlefield|token|unknown` with a mapping table (CARD-024);
  `cardKey` is the only playable-card key; new `catalogVersion` (CARD-068) and `variantRulesVersion`.
  CARD-036 set + collector-number lookup is now MUST; new CARD-037 collector-number normalization.
  New CARD-070 `printingSortKey` and CARD-071 `setOrder` (API order, no curated dates) for SPEC-007's
  default sort. New CARD-008 `CardSet.releaseStatus` (API only) for SPEC-002 set legality. Removed
  CARD-022 (curated release dates) and CARD-034 (curated alias table) per ADR-0005; CARD-050 external
  IDs is MAY + BLOCKED on H-011; CARD-051 no longer a curated file. CARD-015/016 use set order instead
  of release dates. Fixed AC5 (`Star-Crossed`/`Star Crossed` don't collide); AC6 now shows no alias;
  AC8/AC10 updated; new AC17–20. Schema version `0.2`.
