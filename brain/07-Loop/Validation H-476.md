---
tags: [loop, validation]
item: H-476
date: 2026-11-26
round: 1
result: PASS
---
# Validation H-476: SPEC-005 OWN-010 matches the built Deck detail header

Item: [[Handoff Board]] H-476. Scope: `git diff origin/dev` on `loop/H-476-own010-header` (4 brain files:
[[Your Decks Ownership View]], [[Spec Index]], [[Shared Cards and Lock-in]], the board row). No code changed.

## Checks
- Accept, OWN-010: the text now describes the two-part header (back link, then the title side (b)–(g) and the
  actions (h)); from 40rem the actions sit top-right beside the title side and wrap under it only when the two don't
  fit; below 40rem one column; actions after the title side in reading and focus order; the lock badge (g) sits in the
  meta row before the legality label, above the summary (f). PASS.
- Against the build (read-only): `deck-detail.html` has `.header-top` > `.header-main` (h1, notes, source, `.meta` with
  `app-lock-badge`, legality, Rule check, then `.summary`) and `.actions` after it. `deck-detail.scss` has
  `@media (min-width: 40rem)` with `.header-top` as a wrapping flex row, `.header-main` `flex: 1 1 20rem; min-width: 0`,
  actions `flex: 0 0 auto`, top aligned; below 40rem a single grid column. Every claim in the new text matches. PASS.
- No over-claiming: wording only, no requirement, AC or data field changed, no RJ decision claimed; the changelog says
  the source is the build and [[Validation H-460 H-461 H-475]]. PASS.
- OWN-116 (reason line under the actions, Lock in first) and SPEC-008 AC 23 (lock feedback, reason line) do not
  contradict the new OWN-010 text. PASS.
- Pins: SPEC-005 front matter 0.11.1 and `board` adds H-476; Spec Index SPEC-005 row 0.11.1 with a changelog entry;
  SPEC-008 row in the Spec Index and "Depends on" in Shared Cards and Lock-in pin 0.11.1. Older pins left in the
  history lines are historical. PASS.
- V-009: wikilinks in the added text resolve (`[[Validation H-460 H-461 H-475]]` exists); added dashes are numeric
  ranges only; board row still 12 columns, status `review`. PASS.
- Tests, build: SKIPPED (no code changed).

No failures.
