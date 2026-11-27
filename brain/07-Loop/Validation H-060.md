---
tags: [validation, loop]
item: H-060
---
# Validation H-060 (Decks list `/decks` and shared lock pieces)

2026-11-25 · H-060 · **PASS** · attempt 1 · checks run: lint, build, `npm test -- --watch=false` (web/), acceptance mapping (SPEC-008 ACs 1–18 and 23, SPEC-005 ACs 16–19, 23–26, 32), hard constraints, V-009 on `API Contracts.md` · failures: none blocking; four non-blocking notes below.

Working tree validated uncommitted on `loop/H-060-decks-list`. Specs: [[Your Decks Ownership View]] 0.10.2, [[Shared Cards and Lock-in]] 0.4.6, [[Deck Import]]. Briefs: [[Decks]] §10, [[Decks Components]].

## Commands run (real)
| Check | Result |
|---|---|
| `npm run lint` | All files pass |
| `npm run build` | Passes. One warning: `decks-page.scss` 7.84 kB over the 6 kB warning (the error limit is 8 kB) |
| `npm test -- --watch=false` | 82 files, 1,196 tests pass |
| V-009 on changed notes | `API Contracts.md`: version 1.25 → 1.26, new section "Decks list and shared lock pieces" present, changelog line v1.26 present, every wikilink resolves. The Handoff Board diff is the status flip only (blocked → doing) |

## Hard constraints
- Completion % never recomputed in the UI: PASS. `deck-tile.ts` reads `s.completionPercent` and `s.completionFill` only (`deck-tile.ts:70-72`, `:274`, `:279`); the only `Math.floor` is in the H-311 engine.
- Stored locks reach the `'unavailable'` variant: PASS. `deck-list.ts:221` builds `{ status: 'unavailable', locks: input.locks }`; tested by SPEC-005 AC 24 / AC 13 and SPEC-008 AC 19 (`decks-list.spec.ts:202`, `:426`; `deck-list.spec.ts:177`).
- Shared lock pieces are standalone components in `web/src/app/shared/deck/` with clear inputs (`app-deck-tile`, `app-deck-status-chip`, `app-lock-badge`, `app-lock-actions`, `app-lock-in-dialog`, `app-shortfall-warning`; inputs listed in [[API Contracts]]): PASS.
- `web/src/app/pages/deck-detail/` untouched: PASS (`git status` shows no change there).
- Tests named by requirement / AC ID: PASS.

## Builder's judgement calls
1. **Lock in / Unlock not on the list tiles (`app-lock-actions` built for H-254): accepted.** [[Decks]] §4 and D5–D14 put Lock in / Unlock in the Deck detail header, and the whole tile is one link (OWN-002), so a button inside it would nest interactive content. The row asks for the actions component, which exists and is tested (SPEC-008 AC 23, `lock-actions.spec.ts:114-217`).
2. **Lock state inside a combined status chip: accepted.** SPEC-005 AC 25 and SPEC-008 AC 19 require the chip to read "Locked" / "Locked · 2 cards short"; `deck-status-chip.ts` lets `lockBadge` win (tested at `decks-list.spec.ts:217`).
3. **1440 toolbar wraps, Sort on a second line: accepted.** The brief says "Row 2 (or the same row when it fits)" ([[Decks]] §5 toolbar). The screenshot `decks-1440-light.png` shows no overlap or clipping.
4. **COLL-088 Collection-edit warnings deferred: accepted.** My Collection 0.13 splits COLL-088: Replace and Undo warnings stay active, the edit warnings are deferred (steppers are not built). The active parts are covered: `app-shortfall-warning` is used by `ImportConfirmDialog`, with tests for SPEC-008 AC 16 at `collection-import.spec.ts:217`, `:235` and `shared-pool.spec.ts:478`. The engine side of AC 9 is tested (`shared-pool.spec.ts:262`).

## Acceptance mapping
- SPEC-008 ACs 1–10, 12–15, 17, 18: engine-level tests, named by AC (`shared-pool.spec.ts`, `runes-are-cards.spec.ts`); AC 13 and 15 also on screen (`decks-list.spec.ts:402`, `deck-list.spec.ts:146`).
- SPEC-008 AC 16: tests at `collection-import.spec.ts:217` (Undo asks, then notifies) and `:235` (Replace warns). Edit part deferred per COLL-088 above.
- SPEC-008 AC 23: `lock-actions.spec.ts:114`, `:127`, `:168`, `:183` (reason line, "Locking in…", snacks, no Undo, failed save).
- SPEC-005 ACs 16–19: `deck-ownership-view.spec.ts:220`, `runes-are-cards.spec.ts:90`, `:129`, `:149`.
- SPEC-005 ACs 23, 24, 25, 26, 32: `decks-list.spec.ts:144-295` and `:381`, `deck-list.spec.ts:122`. They assert the fill (34/66 exact), "51%", the accessible text, the 1% / 99% / 98% / 100% edges in the H-311 engine tests, the empty-deck and no-Legend cases, locked 54 → 100% / 92%, the tournament tile fields, the single-link tile and the ban notice. Neutrality: sort offers three options and nothing sorts by %.
- SPEC-008 AC 11 (locked deck blocks card edits, Duplicate unlocked): no test. It needs a card editor (DECK-080 deferred, RJ #14) and Duplicate (H-254). Note 4 asks for a carve-out on the board.

## Non-blocking notes
1. `app-lock-badge` and `local-date.ts` have no test of their own, and the badge is used nowhere yet. SHARE-041 "Locked in on <date>" (AC 19), the no-date case (AC 20: unparseable `lockedAt`), and "short" styling are unasserted. H-254 is the first user.
2. State L2 (loading skeleton, `aria-busy`, "Loading your decks…") and L11 (recompute in place keeping scroll and focus) are built but have no test. L12 is covered by `decks-import-save.spec.ts:100`.
3. `decks-page.scss` is 7.84 kB against an 8 kB error limit. A small addition (H-254 reuse, dark tweaks) will break the build.
4. H-060 row says SPEC-008 "ACs 1–16"; AC 11 and the AC 9 Collection-edit warning cannot be shown until the card editor / Collection steppers exist. The row should say so.

## Playwright
Not run (optional). The builder's screenshots at 1440 and 375 were read. Cards, chips, percentage and Legend fill render; no overlap or clipping seen. The Import deck button overlapping the last tile at 375 is the existing FAB behaviour.

## Failure items I would file
None blocking. Proposed, for the orchestrator to place (IDs H-380…H-382):
- H-380 · P2 · builder · `todo` · depends H-060 · from validator: "Add a spec for `app-lock-badge` (SHARE-041 "Locked in on Nov 23, 2026" local date, SHARE-030 no date when `lockedAt` doesn't parse (SPEC-008 AC 20), SHARE-033 "Locked · 2 cards short" warning style, SHARE-053 (b) label "Locked" while ownership is unavailable (AC 19)); add tests for loading state L2 and in-place recompute L11 of [[Decks]] §10." Accept: those tests pass; lint, build, tests pass.
- H-381 · P2 · builder · `todo` · depends H-060 · from validator: "`decks-page.scss` is 7.84 kB of the 8 kB budget error: move shared tile / toolbar rules into the shared components or global styles so H-254 and later UI changes keep room." Accept: build with no style-budget warning.
- H-382 · P2 · spec-writer / orchestrator · row text: add to H-060 Accept "SPEC-008 AC 11 and the Collection-edit part of AC 9 are covered by H-254 and the deferred Collection edit item".

## Round 2 (follow-up, RJ H-382 answers)

2026-11-25 · H-060 follow-up (uncommitted on c995ab1) · PASS · lint, build, tests, V-009, screenshots · 0 blocking failures

| Check | Result |
|---|---|
| `npm run lint` | All files pass |
| `npm run build` | Passes, no warnings and no budget message (`anyComponentStyle` now 10 / 12 kB in both configurations of `web/angular.json`) |
| `npm test -- --watch=false` | 83 files, 1,201 tests pass (was 82 / 1,196; new `lock-badge.spec.ts`, 5 tests) |
| V-009 on changed notes | `API Contracts.md` version 1.27 with a v1.27 changelog line; `Decks Components.md` notes added; no new broken wikilinks |

- **(1) One-row toolbar:** PASS. `toolbar-1440-light.png` shows search, 4 chips, Lock, Filters and Sort on one row, no clipping. Phone unchanged: `decks-375-light.png` is as before, and the 375 `flex-basis: 14rem` / `max-width: none` are kept in `decks-page.scss`. The extra trims (gap 12 to 8 px, chip padding 12 to 8 px, Lock min 9 to 7.5rem, Sort 10 to 8.5rem, `:placeholder-shown` padding) are desktop-only (`decks-page.scss:130`, `:247`, `:327`, `:331`; the placeholder rule is behind `min-width: 40.0625rem`). They stay within RJ's "fit on one row" and the [[Decks]] / [[Decks Components]] §4 brief ("same row when it fits"), and the brief now records them. Not blocking; mention to RJ in the summary.
- **(2) Separate lock badge:** PASS. `deck-tile.ts:94-96` binds the chip with `filter` only and `app-lock-badge [label] [showDate]="false"`. Tests in `decks-list.spec.ts:208-243`, `:407`, `:417`, `:438` cover: locked complete deck, no chip and "Locked"; short deck, "Partly available" chip then "Locked · 2 cards short" badge in warning style, in that order; no date; ownership unavailable, no chip and "Locked", never "short" (SHARE-053 (b), OWN-065). `tiles-1440-light-short.png` shows it.
- **(3) Lock in / Unlock:** unchanged, `lock-actions` not in the diff.
- **(4) Budget:** PASS, see build.
- **`app-lock-badge.lock` optional:** compatible. `lock-badge.ts:79` is now `input<DeckLockState | null>(null)`; `@if (label() && lock()?.locked !== false)`. A bound `[lock]` with `locked: false` still hides; a null `lock` no longer hides (new, intended). The only user of the badge is `deck-tile.ts`, which passes no `lock`; H-254 reuse with `[lock]` and `[label]` works. `lock-badge.spec.ts` covers the date (SHARE-041), unparseable date (SHARE-030), short style (SHARE-033), label-only, and not-rendered cases. This closes non-blocking note 1 of round 1.

### Finding (non-blocking): spec text still describes the lock inside the chip
- `brain/02-Specs/Your Decks Ownership View.md:253` (OWN-102: "`locked` → **Locked**; a locked deck that is short → **Locked · n cards short** (the `lockBadge`...)" as one chip) and `:140` (OWN-002), AC 25 (SPEC-005) and SHARE-041 / SHARE-050 in `Shared Cards and Lock-in.md:178` read as the lock being the chip, while RJ's 2026-11-25 answer and the build make it a separate badge: a locked complete deck has no chip, a short one has its group chip plus the badge.
- `brain/04-UI/Decks.md:92-93, 161-163` (wireframe and chip table) show the same old behaviour; `Decks Components.md` has the new note (§3) but the table above it still lists "locked" rows.
- The tests assert the new behaviour, so the spec is the stale side.

### Items I would file
- H-383 · P2 · spec-writer · `todo` · from validator · depends none: "Update SPEC-005 OWN-002, OWN-102 and AC 25, SPEC-008 SHARE-041 / SHARE-050 and `brain/04-UI/Decks.md` (wireframe line 92-93, chip table lines 158-163) to RJ's 2026-11-25 answer (H-382 (2)): on the deck tile the lock is a separate badge next to the ownership chip, no date. A locked complete deck (group `locked`) shows no chip, only "Locked"; a short locked deck shows its Partly / None available chip plus "Locked · n cards short"; ownership unavailable shows no chip and "Locked". Keep the date in the Deck detail header." Accept: those notes agree with `deck-tile.ts` and `decks-list.spec.ts:208-243`; V-009 passes.

Not blocking. The follow-up may be committed.
