---
tags: [validation]
item: H-248
---
# Validation H-248

2026-11-25 · H-248 · PASS · V-009 (docs hygiene), boundary-wording grep over live `brain/` (excl. Archive, Session Log), build check against `web/src` media queries, version-pin grep, behaviour-diff review of all uncommitted H-248 hunks, cross-spec conflict check · failures: none

- **Boundary:** phone = "40rem and below", desktop = "above 40rem" in SPEC-010 (summary, SYNC-003, 104 e, 150 incl. (g), 158, AC 71, AC 81), SPEC-007 COLL-094 (a), (c), SPEC-005 OWN-094, SPEC-012 LOG-010 and AC 2, Test Data and the Spec Index lines. Zero hits left for "40rem and wider", "below 40rem", "40rem or more", "at or above 40rem" in live specs. It agrees with `max-width: 40rem` (`web/src/app/app.scss` line 174, plus every other media query in `web/src`, all `max-width: 40rem`), so 640 px is a phone. AC 81 now tests 640 and 641; AC 71 uses 641 and says 640 shows no name.
- **No behaviour change:** every hunk is a wording swap; no requirement added, removed or re-valued. The build already used `max-width: 40rem`, so the specs now match the code.
- **Pins to SPEC-010 0.17.1:** frontmatter, Spec Index row (SPEC-010) plus the SPEC-012 and SPEC-013 rows, Test Data "Depends on", Current State row, ADR-0006 "Specified in", My Collection "Current:" line, Changelog history line. Remaining 0.17.0 mentions are history (Changelog 0.1.2 entry, Brief H-245 header "spec text is ... 0.17.0", H-244 validation, board rows): acceptable.
- **Unbumped edits (SPEC-007, SPEC-005, SPEC-012):** acceptable. Precedent: SPEC-008 pin-only fix "no version bump" (H-244), SPEC-013 pin-only, and each edit carries a one-line note. They are boundary-wording fixes that make the text agree with the already built behaviour. No bump required. (A patch bump would also be defensible, and SPEC-010 got one; this is consistency, not a fail.)
- **Brief H-175 pointer:** present, links SPEC-010 decision 22 and the ADR-0006 amendment. Theme part done. ADR-0006 Theme amendment confirmed by the earlier H-248 note.
- **Notes, not failures:** (1) `Brief H-175` still shows "≥ 40rem" in its old layout drawings (lines 62, 269); it is a historical design brief and the specs govern. (2) `Brief H-245 H-246 H-247` header line 3 still names SPEC-010 0.17.0; harmless. (3) Link resolution on touched notes: all new wikilinks ([[My Collection]], [[Your Decks Ownership View]], [[Changelog]], [[Brief H-245 H-246 H-247]], [[Accounts and Sync]]) point to existing notes.
- Not run: V-008 (docs only, no code changed). Other validators' uncommitted work (H-245, H-247 notes) left untouched.
