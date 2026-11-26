---
tags: [loop, validation]
item: H-477
date: 2026-11-26
round: 1
result: PASS
---
# Validation H-477: Decks.md §6 sketches and the 768 reason-line decision

Item: [[Handoff Board]] H-477 (ui-engineer). Scope: `git diff HEAD~1` on `loop/H-477-decks-sketch` (3 brain files:
[[Decks]], [[Decks Components]], the board). No code changed, so no lint, build or test run (V-008 not in scope).
Prior context: [[Validation H-460 H-461 H-475]].

## Checks
- Decks.md §6 vs the build (read `deck-detail.html`, `deck-detail.scss`, `lock-actions.ts`): PASS. `.header-top` wrapping
  flex row, `.header-main` (`flex: 1 1 20rem; min-width: 0`) with name, description, source, meta row (lock badge,
  legality, Rule check) and summary lines; `.actions` (`flex: 0 0 auto`, after the main column in the DOM) with Lock in,
  Copy missing list + chevron, More; Copy hidden on phones (`!isPhone()`) and the Missing panel's copy shown on phones
  (`[showCopy]="isPhone()"`); More menu items (Copy deck list, Download .txt, Duplicate, Rename, divider, Delete) match;
  section bar has the view toggle (Card view / List view); panel has Card / Missing tabs; focus order in the text matches
  the DOM. The sketch says the reason is end-aligned "built in H-475; H-520 changes it", which matches the code
  (`justify-content: flex-end; text-align: end; margin-inline-start: calc(-1 * var(--space-2))`).
- Decision recorded (start-aligned under Lock in, from 40rem, with four reasons): PASS.
- H-520 row: PASS. ID in the reserved H-520...H-539 range, owner builder, status todo, depends H-477, priority P3, 10
  columns like its neighbours, names the file and selectors, current vs wanted behaviour, phones unchanged. The Accept
  check is testable (rects at 1440 / 1024 / 768 with ±1px tolerances, computed `text-align`, gutter >= 16 at 768,
  actions width with and without the reason, a 120-character reason, 390 unchanged). `next_id` stays 483 (reserved block).
- Decks Components.md §5 edit: PASS. States the same decision and points to [[Decks]] §6 and H-520.
- V-009 wikilinks: PASS for every link added or changed in the diff ([[Decks]], [[Decks Components]],
  [[Collection Test Data]], [[Validation H-460 H-461 H-475]], [[Validation H-477]]). The link scan flagged four tokens in
  the board, all in lines this diff does not touch (backtick-wrapped text and Board Done archive names), so not H-477.

## Notes (not failures)
- The sketch for the locked deck is a two-line fragment; fine as a sketch.
- The reason decision is a taste call but is recorded with RJ's earlier ask in H-477; RJ may still overrule it.

## Result
2026-11-26 · H-477 · PASS · Decks.md §6 vs header html/scss/lock-actions, decision recorded, H-520 row (range, Accept testable), Decks Components §5, V-009 on changed lines · no failures
