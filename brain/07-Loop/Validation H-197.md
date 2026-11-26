---
tags: [validation]
item: H-197
---
# Validation H-197

2026-11-26 · H-197 · PASS · Accept (SPEC-002 approved; SAMPLE exclusion IDs and ACs in four specs), RJ attribution, pin grep, version clash, cross-spec, V-009 · no failures (H-194 pin fixed; gate row H-653 filed).

## Checks
- **Accept (PASS):** [[Deck Legality]] 0.5 `approved` (frontmatter = Spec Index). IMP-077 + AC 50 ([[Collection Import]] 0.15), DECK-106 + AC 41 ([[Deck Import]] 0.15), COLL-110 + AC 42 ([[My Collection]] 0.15), OWN-120 + AC 37 ([[Your Decks Ownership View]] 0.12); each has Given/When/Then, IDs unique, AC numbers follow on.
- **RJ attribution (PASS):** quotes ("legal by name", "Sample cards are NOT legal", "leave them out entirely", "data only for deck information") match the H-193 row. LEGAL-C07 keeps the TR 601.2 community-transcription note and says RJ's confirmation settles the product rule, not the wording. LEGAL-B11 adds no behaviour; Open question 11 says what RJ did not say. The two readings (SAMPLE code gives UNKNOWN_PRINTING; SAMPLE-only card gives UNKNOWN_CARD) are labelled proposals, not RJ's, in IMP-077, DECK-106, source columns, ACs and Spec Index.
- **Pins (PASS):** grep of `brain/` except Archive and changelog lines: no stale SPEC-002 0.4, SPEC-003 0.14, SPEC-005 0.11, SPEC-006 0.14, SPEC-007 0.14.1 pin in a Depends-on, Spec Index row, or Test Data. Remaining hits are history ("0.14 pin: H-454", 04-UI notes about older reviews). Only stale pin: the H-194 board row said "Deck Legality 0.4"; fixed to 0.5 (0.5 changes no rule or data, so the spec supports it).
- **Version clash (PASS):** origin/dev has only #106 (H-210, privacy wording) beyond the merge; no spec version touched. The SPEC-005 changelog merge keeps both lines (0.12 Current, H-291 pin-only) and reads right.
- **Cross-spec (PASS):** CARD-044 (SPEC-001 unchanged) already says RJ decided "left out entirely" and points to the consuming specs; LEGAL-C10, IMP-077, DECK-106, COLL-110, OWN-120 cross-reference each other and all say "no marker, no effect". Tension noted and recorded: LEGAL-C10 still ignores a flagged printing in LEGAL-017 while the app's catalog omits it (Open question 12). Follow-ups H-640 (builder), H-641 (spec-writer) are blocked on H-020.
- **V-009 (PASS):** every wikilink added in the diff resolves; requirements numbered; ACs Given/When/Then. Brain-only diff (0 lines in web, services, data), so V-008 and design checks are SKIPPED.

## Gate 3
No spec is newly `review` (SPEC-002 went review to approved; SPEC-006 and SPEC-007 were already `review`). But the two proposals change import matching beyond RJ's words, so a non-blocking `needs-RJ` row H-653 lists what to confirm (the two proposals, copies saved before the marker, whether 2v2 status is shown).
