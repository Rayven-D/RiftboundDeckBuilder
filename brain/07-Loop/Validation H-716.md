---
tags: [validation]
as_of: 2026-11-28
---
# Validation H-716 (spec pass: deck fork, cost filter)

2026-11-28 · H-716 · PASS (one minor note) · docs checks only, no code changed

Checks run (by reading and by shell counts):
- Fork follows RJ's rules (ADR-0010 answers part 4 item 2): any kept version incl. current (DECK-140, OWN-128), original unchanged (DECK-141, AC 57), allowed from a locked deck (DECK-141, DECK-135, AC 58). PASS.
- Everything RJ did not decide is labelled "default, proposed" (DECK-142, 143, 144; OWN-128 label and control; SEARCH-026 one-group layout; Open questions in SPEC-006). PASS.
- Cost covers energy and power (SEARCH-026, ACs 3, 3a, 12); the field mapping is `unverified` pending H-020 and cites only [[Card Data & Images]] #9 (names `energy`, `might`, `cost`, `power`; not their meaning). PASS.
- H-715 items cited as RJ's: DECK-136, DECK-134, SEARCH-050, OWN-123. PASS.
- IDs, ACs, versions: SPEC-006 0.20 (DECK-140..144, ACs 57..59, changelog), SPEC-005 0.21 (OWN-128, AC 53), SPEC-014 0.2 (ACs 3, 3a, 12), Spec Index rows match; Summary blocks present in all three. PASS.
- Wikilinks: all resolve (the "changelog" links resolve in Archive/Spec-Changelogs). `[[Brief H-698 Card Dialog Mobile]]` in SPEC-014 is not in this worktree (untracked in the main checkout); it predates this pass. NOTE only.
- CRLF: all 5 changed files are 100% CRLF. PASS.

Minor note (no board item): DECK-141 and OWN-128 extend the fork to read-only decks and label it "RJ's rule applied". RJ only said locked decks. Label the read-only case "default, proposed" in DECK-141 and AC 53.
