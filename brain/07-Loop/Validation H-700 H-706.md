---
tags: [validation]
status: done
as_of: 2026-11-28
---
# Validation H-700 and H-706/H-707/H-708 (2026-11-28)

2026-11-28 · H-700 · PASS (with 2 minor notes) · V-006, V-009, source spot-check against the live Rules Hub and the Riot Core Rules patch notes · failures: none blocking
- Rules Hub re-fetched 2026-11-28: Standard "last updated November 23, 2026" lists 15 cards + 7 battlefields; 2v2 "last updated November 23, 2026" lists 1 Legend (Master Yi, Wuju Bladesman) + 14 cards (Standard minus Fight or Flight) + 7 battlefields; no other format and no regional lists. All match [[Format Catalog]] and [[Ban List]].
- Riot patch notes (2025-10-24): "In 2v2, partners cannot include the same battlefield across both of their decks" and "Players cannot have the same Champion Legend as their partner". Match fact 2.
- Frontmatter has sources with tiers, `as_of` and `status` on [[Format Catalog]]; community sources (riftjudge, riftbound.org) are tiered community and labelled; unverified items (2v2 sideboard, riftbound.org early-2027 claim, regional lists) are marked `unverified`.
- Minor: `as_of` in [[Ban List]] (2026-11-26) and [[Formats]] (2026-11-24) was not bumped though a 2026-11-28 recheck/edit was added. Within the V-006 window, so not a failure.
- Minor: Format Catalog sets the 2v2 team rules from Riot patch notes, not the Core Rules PDF (could not extract); stated openly.

2026-11-28 · H-706, H-707, H-708 · PASS (with 1 dependency note) · V-009, ADR-0010 consistency read, Design Direction read · failures: none blocking
- All three: Summary block present, frontmatter `status: draft`, CRLF, listed in [[UI Index]] under "Directions".
- ADR-0010 consistency: lock freezes card moves only, rename/description/source stay allowed (H-706 §5, H-707 Move dialog); tag "exclude from decks" beats folder with a visible notice (H-707); Master collection is not a folder (H-707); wishlist defaults to the default printing (H-708 Q2 and details); missing counts sum across decks (H-708 "Wants 4 / Needed for 2 decks"); decks and folders hold physical copies. Open product questions (H-706 Q1-Q11, H-707 Q1-Q8, H-708 Q1-Q7) are listed with recommendations, not decided as rules.
- Dependency note: `[[Brief H-698 Card Dialog Mobile]]` does not exist in this worktree (it is an untracked file in the main checkout). It resolves once that brief is committed; do not merge these drafts to dev ahead of it, or add it first.
- Not checked: pixel-level contrast and 44 px targets (these are drafts with no build); the notes state 44 px, reduced motion and text-plus-icon status, consistent with [[Design Direction]].
