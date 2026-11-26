---
tags: [loop, validation]
item: H-341
date: 2026-11-25
round: 1
result: PASS (H-341)
---
# Validation H-341: Deck Import review critique and a11y audit

Item: [[Handoff Board]] H-341. Accept: critique and a11y audit in `brain/04-UI/`; builder items filed. Note under test: [[Critique H-341 Deck Import Review]].

2026-11-25 · H-341 · **PASS** · V-009 (docs), coverage, code spot-checks, string-change reasons, board row shape, scope · 0 failures.

## Checks run
- **Coverage:** the note covers name field, Lines to fix, zone questions, Placed by card type, source fields (findings 1-20, 3, 6, 12, 14, 15), the four widths (1440, 1024, 768, 390 in "How it was tested" and §3/§8 screenshots), selects (findings 1, 6, section 1), screen-reader flow (§3), focus after Save (section 1: lands on the Import deck FAB) and after each step change (finding 2). Contrast table, target size, reflow and reduced motion are included. "Not tested" is listed honestly.
- **Code spot-checks (all confirmed):**
  - `deck-review.ts` line 123 `@for (q of v.questions; track $index)` and line 167 `.pick-zone [value]="null"`: finding 1 is real.
  - `championMany` (line 36) says "The other Champion lines are left out."; `deck-import.ts` lines 505-521 set the unpicked lines to `zone = 'main'`: finding 4 is real.
  - `zoneReason` is rendered only at line 226 inside the `inferred()` list (line 280: `zoneMethod === 'inferred'`, or `'user'` with no section). Champion-section lines get `method = 'user'` but have a section, so `championNotPicked` / `championExtraToMain` are never shown: finding 5 is real.
  - Save: `[aria-disabled]="busy() || !canSaveDeck()"` (line 127), no `disabled` or `aria-describedby`; name input has no `required` / `aria-invalid`; hint only: findings 3 and 12 match.
  - `.issues` max-height 12rem and `.inferred` 16rem (`import-dialog.scss` lines 77, 203): finding 14 matches.
  - `REVIEW_TEXT.notes` is "Check these:" (`import-dialog.ts`), as the note says for the new heading.
- **String changes have reasons:** every proposed change in §4 has a Reason column entry. Changes to RJ-approved strings (`championMany`, `inferred`/`inferredNote`, `removed`) cite a factual mismatch, a wrong label for user-placed lines, and an ambiguous "it". The two champion reason lines came after the approval, so they are in scope. `needAttention` and `mismatch` are marked "proposal for H-342 / RJ only, not filed". `DECK_SAVE_TEXT` unchanged, with a reason. The "legendNone" line stays and a new variant is added.
- **Builder items:** H-450 (blocker 1, 2), H-451 (3, 6, 11, 12, 17), H-452 (4, 5, 7, 8, 9, 10, 18), H-453 (13-16) cover every finding that needs code; finding 19 is an RJ choice, finding 20 goes to spec gap S4. Each Accept is a testable Playwright, unit or screenshot check plus lint, build, tests. Spec gaps S1-S7 map to H-454 (spec-writer) with an Accept.
- **Board rows:** H-450 to H-454 each have 10 columns, like H-341 to H-343 and the table header. IDs are within H-450 to H-459 and unused elsewhere (one occurrence each). Depends is H-341 on all five. The only other board change is H-341 `todo` to `doing`. No other row differs (`git diff`).
- **V-009 links:** every wikilink used in the note and the new rows resolves: Deck Import, Validation H-253, Design Direction, Collection Import, UI Index, API Contracts, Physical Copies Across Decks, Critique H-341 Deck Import Review. The UI Index row links the new note.
- **Game-rule claims:** the note states no rules or meta facts of its own. Champion and Legend behaviour refers to RJ's 2026-11-25 decision and [[Validation H-253]]. Code shapes refer to IMP-064 and CARD-037 (the latter exists in [[Card Data Model]], line 137, and covers the `SP1` forms).
- **Scope:** `git status` shows only `brain/` files changed (UI Index, Handoff Board, the new note). No code touched. I started no servers.
- **V-008:** not run, no code changed.

## Failures
None.

## Observations (not failures)
- Finding 3 says Save has `aria-disabled="true"`. The template binds `[aria-disabled]` as a property; the note observed the attribute in the browser, so it holds in practice.
- Not re-run in a browser by the validator; screenshots and measurements are the ui-engineer's, and the code-level causes were confirmed by reading and match the described symptoms.
