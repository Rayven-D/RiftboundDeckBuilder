---
tags: [validation, loop]
item: H-254
---
# Validation H-254 (Deck detail `/decks/:id`)

2026-11-25 · H-254 · **PASS on attempt 2** (attempt 1 FAIL, see the end of this note) · attempt 1 · checks run: `ng lint`, `npm run build`, `npm test -- --watch=false` (web/), acceptance mapping (SPEC-005 ACs 2, 4, 6, 7, 8, 17, 27…31, 33; SPEC-008 ACs 22, 23; SPEC-006 ACs 27…29), hard constraints, Playwright on the emulators (1440 and 375, light and dark) · failures: one blocking (section bar jump links stop at the first section boundary, filed H-390); two non-blocking (filed H-391).

Branch `loop/H-254-deck-detail` at 12b6ce9, validated clean. Specs: [[Your Decks Ownership View]] 0.10.2, [[Shared Cards and Lock-in]], [[Deck Import]]. Briefs: [[Decks]], [[Decks Components]], [[Deck Detail Build H-254]].

## Commands run (real)
| Check | Result |
|---|---|
| `npm run lint` | All files pass |
| `npm run build` | Passes. One warning: `decks-page.scss` 7.84 kB over the 6 kB warning (H-060's file, point (c); the error limit is 8 kB; filed as H-381 by the H-060 pass) |
| `npm test -- --watch=false` | 84 files, 1,273 tests pass |
| `npm run test:rules` | SKIPPED (no change to `firestore.rules` or `rules-tests/`; `git diff c995ab1..HEAD --stat` shows none) |

## Hard constraints
- Completion % read from `view.summary.completionPercent`, never recomputed: PASS. `detail-view.ts:109` (`percent: s.completionPercent`) is the only source; no `Math.floor`/`Math.round` in `pages/deck-detail/` or `shared/deck-detail/`. Test: `detail-view.spec.ts:68` (34 of 66 → 51, 299 of 300 → 99, never recomputed).
- Shown nowhere except the header: PASS. Browser check: `body.innerText` of the page had exactly one `%` match ("83%"), the Missing tab text has none, the Card tab and the card dialog have none. Tests: `deck-detail.spec.ts:245` asserts `not.toMatch(/%|percent/)` on the panel and the Missing tab.
- Null percentage renders nothing: PASS (`deck-detail.spec.ts:177`, `:185`; `detail-view.spec.ts:82`, `:87`).
- Rename on locked and tournament decks: PASS. Test `deck-detail.spec.ts:449` (locked tournament deck: name, description change, lock and source untouched, `updatedAt` newer, "Deck renamed."). Browser: locked "Generated Locked A" renamed with a description; it stayed Locked ("66 of 66 copies locked in · 100%"), the snack read "Deck renamed.", and the Decks list put it first.
- Tests named by requirement ID: PASS (`deck-detail.spec.ts`, `detail-view.spec.ts` titles all carry OWN-/SHARE-/DECK-/AC IDs).

## Browser checks (Edge via playwright-core, signed in by email link on the Auth emulator, Test Data Large: "Generated Locked A", "Generated Locked B", "Generated Open")
| Check | Result |
|---|---|
| Panel at 64rem | PASS. At 1023 px no `aside.panel` and no tabs; at 1024 px the panel with tabs "Card" and "Missing" |
| First card selected on load | PASS. Legend "Gilded Gambit 37" has `aria-current="true"` and fills the Card tab |
| Missing tab | PASS. "55 of 66 copies available", "28 of 31 cards fully available", "Missing · 11 copies" by zone, Copy missing list, no percentage |
| Dialog below 64rem | PASS. At 375 a tile press opens the card dialog (previous / next, close); Escape returns focus to the pressed tile. The missing list sits under the header, no panel |
| Sections in Riot order | PASS. Legend, Chosen Champion, Main Deck, Battlefields, Runes, Sideboard, with counts |
| Sticky bar | PASS for stickiness (bar stays at 71.5 px under the site header after scroll; Card view / List view toggle in it). **FAIL for the jump links (below)** |
| Card view / List view | PASS. List view rows "1× Gilded Gambit 37 / 3× Cinder Recruit 13" with chip, "Also in 2 other decks · 2 locked", 44 px+ rows; the choice survives a reload |
| Header | PASS. Name, description (after rename), source line, legality "Not fully checked" + Rule check, "55 of 66 copies available · 83%" with hidden ", 83 percent", cards line without %, lock badge, actions |
| Lock in / Unlock via `app-lock-actions`, `app-lock-badge` | PASS. Locked deck shows "Locked · Locked in on Nov 20, 2026" and Unlock; Unlock is immediate, snack "… is unlocked. Its cards count toward your other decks again.", focus moves to Lock in; Lock in asks "Lock in '…'? … 2 other decks use some of these cards: …", then badge, "locked in · 100%" and the snack. An incomplete deck shows the disabled Lock in with the visible reason "Lock in needs every card available: 3 cards short" |
| Not found | PASS. "This deck isn't in your decks / It may have been deleted on another device. / Back to Decks" |
| Read-only, ownership unavailable, loading skeleton | Not reachable in this browser session (no newer-schema deck, ownership always readable); covered by `deck-detail.spec.ts:483`, `:185`, and the skeleton markup at `deck-detail.html:6-16` (no spec asserts the 200 ms skeleton: see note) |
| Light and dark at 1440 and 375 | PASS. No console errors, no overlap or clipping; contrast of chips, tabs, badge and notice looked right in both. Screenshots were read |

## Failure
1. **OWN-110 section bar: a jump link stops at the first section boundary (blocking, filed H-390).** Input: click "Runes 12" in the sticky bar of "Generated Open". Expected: the Runes heading scrolls under the bar and Runes is `aria-current="location"`. Actual, 1440: scroll stops at y 800 with Runes still ~2,900 px below, "Champion" current. Actual, 375: stops at y 1,060, "Legend" current. Cause: `deck-detail.ts:483-484` `scrollIntoView({block:'nearest',inline:'nearest'})` on the nav link inside `onScroll()` cancels the smooth scroll started by `jump()` (`:495-502`). With that call suppressed in the page, the jump reached Runes. A second symptom: after a completed jump to Runes at 1440 the bar showed "Battlefields 3" current (the heading lands 200 px from the top; `onScroll()` at `:473-478` tests the section's `top <= header + bar + 8`). jsdom has no smooth scrolling, so the unit tests could not see this.

## Known points, judged
- (a) No `app-shortfall-warning` on Deck detail: **accepted.** [[Decks Components]] §10 says "not for Decks pages" and [[Decks]] §9 puts SHARE-034 warnings in Collection's Replace and Undo confirmations, because the warning is about a Collection change. Deck detail changes no collection copies; Delete releases a lock and cannot create a shortfall. A short locked deck shows "Locked · n cards short" (SHARE-033, D8; `deck-detail.spec.ts:583`).
- (b) `lock-actions.ts` one-line `viewChild('action', { read: ElementRef<HTMLButtonElement> })`: **accepted.** It is H-060's file but the change is a type-safe read fix; lint, build, `lock-actions.spec.ts` and the focus-after-Unlock check in the browser all pass.
- (c) `decks-page.scss` budget warning: accepted, already H-381.
- (d) `/styleguide` entries missing: **non-blocking**, filed with other small items as H-391.

## Non-blocking notes
1. "Copy missing list" shows its icon touching the label (no gap) at 1440 in both themes (filed in H-391).
2. The 200 ms loading skeleton (OWN-119 (a), D2) has no test, as with H-060's L2.
3. Not-found keeps the page `h1` "Deck detail" above the empty state (build choice 7 in [[Deck Detail Build H-254]]); OWN-119 (b) does not forbid it.
4. The Playwright run used the Auth and Firestore emulators already running on this machine (ports 9099 and 8080); starting a second pair failed on "port taken". I did not stop them (not started by this run). I stopped the `ng serve` I started.

## Rows filed
- H-390 · P1 · builder · section bar jump links (OWN-110).
- H-391 · P2 · builder · `/styleguide` entries, Copy button icon gap.

## Attempt 2 (2026-11-25) · H-254 · PASS
Checks run: `ng lint` (passes), `npm run build` (passes; only the known `decks-page.scss` warning), `npm test -- --watch=false` (84 files, 1,275 tests pass), Playwright on the emulators (Edge, signed in, Test Data Large, "Generated Open") on the uncommitted fix. Failures: none.
- **H-390 fixed (PASS).** For each of the six section links (and back to Legend), at 1440 and 375, light and dark (24 clicks): the heading ends under the bar (1440: heading top 129 px, bar bottom 116 px; 375: 124 and 111) and exactly that link has `aria-current="location"`.
- **Copy icon gap fixed (PASS).** Screenshot shows the icon spaced from "Copy missing list".
- **No regressions:** bar still sticky (top 64 px after scrolling 1,500 px); panel absent at 1023 px and present at 1024 px with tabs Card / Missing; Legend selected on load; the percentage appears only in the header ("55 of 66 copies available · 83%"), not in the Missing tab; List view and Card view both switch; the 375 card dialog opens.
- Servers: I stopped the `ng serve` I started; the Auth and Firestore emulators were not mine and are still running.
- Board: H-390 moved to Done. H-391 keeps only the `/styleguide` entries (non-blocking).
