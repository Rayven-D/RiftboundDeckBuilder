---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Runes Assumed Owned]]"
---
# Runes Assumed Owned changelog

Newest first. New changelog entries for the spec go here.

- 0.3 (2026-11-24, H-097): **withdrawn.** RJ, 2026-11-24: "Let's change the rune specifications. Allow
  users to import runes as well and treat them like any other card." RUNE-001…010 all withdrawn (IDs not
  reused). Replaced by SPEC-003 IMP-071, SPEC-005 OWN-028, SPEC-007 COLL-089, SPEC-008 SHARE-006; SPEC-002
  and SPEC-006 unchanged. Note kept with a withdrawal table mapping each RUNE-ID to its replacement.

- 0.2 (2026-11-23, H-065/H-067): ACs 2–5 now have a **When** (AC 5 split into an import case and a
  no-runes case with concrete data). "Rune Pool section" renamed "Runes section" in the Summary and RUNE-006,
  matching the SPEC-005 OWN-011 heading (the `Rune Pool:` export label of DECK-085 / OWN-052 is unchanged).
  Summary "Depends on" now pinned (SPEC-005 0.4, SPEC-007 0.5, SPEC-008 0.2) and lists SPEC-007 as a
  consumer. No requirement change: 10 rows (9 MUST, 1 MAY), 5 ACs.

- 0.1 (2026-11-23, H-058): first draft per RJ (ADR-0006 "Shared cards, lock in and runes") and
  [[Physical Copies Across Decks]] facts 10–12. Rune entries (zone `runes` or `category: 'rune'`) assumed
  owned; out of the missing list, summary, completeness, lock in and shared counting; Rune Pool section shown
  as "Assumed owned"; Collection never needs runes; legality unchanged. 10 requirements (9 MUST, 1 MAY), 5 ACs.
