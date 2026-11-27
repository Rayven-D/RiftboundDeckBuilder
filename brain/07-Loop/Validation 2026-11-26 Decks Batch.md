---
tags: [loop, validation]
board: H-148, H-233, H-486, H-662, H-663, H-600, H-485, H-652, H-645, H-660
as_of: 2026-11-26
---
# Validation 2026-11-26 Decks Batch

One bulk pass (RJ's rule). **A** = code on `loop/H-662-deck-lock-icon` (058cd26). **B** = specs at `loop/spec-batch-2026-11-26` commit `1264142`, read only through `git show` and `git diff 33a1411 1264142` (the worktree was being edited).

## A. Code (Node 22.23.5)
| Check | Result |
|---|---|
| `npm run lint` | PASS ("All files pass linting") |
| `npm run build` (prod) | PASS |
| `npm test` run 1 / 2 / 3 | PASS x3: 94 files, **1483 tests** each, exit 0, 0 "unhandled" lines in each log |
| `npm run e2e` | PASS 5 / 5 (no sign-in needed; Vite dev-server "Failed to fetch dynamically imported module" lines are server noise during navigation, tests green) |
| Servers left running | none (no listener on 4310 / 4200) |

| Item | Result | Reason |
|---|---|---|
| H-148 | PASS | Accept met: engine test "two locked decks going short in one sync get exactly one info notice naming both" passes; one deck gives the exact AC 13 sentence; none gives no notice. Combined wording is the builder's (RJ to confirm). H-664 will change it later; not judged. |
| H-233 | PASS | TEST-033 / AC 12 test (Replace removes test decks and locks, real catalogVersion, banner marker gone) and `loadApiCatalog` test pass; Add never removes decks. |
| H-486 | PASS | Three consecutive full runs, 0 unhandled errors each; leaked-log regression test present. |
| H-662 | PASS | `app-lock-actions variant="icon"` after the name; `aria-label` Lock deck / Unlock deck, `aria-pressed`, 44 px; no badge, date or Lock/Unlock button; `lock-badge` lost the date; same lockIn()/unlock() logic; tests green. |
| H-663 | PASS | Tile and row render no other-deck line; `cardAccessibleName` has no shared part; dialog still has "Other decks using this card"; new `H-663` test passes. |

## B. Specs at 1264142
| Item | Result | Reason |
|---|---|---|
| H-600 | PASS | SPEC-006 0.16.1 AC 8 matches today's build: `Lightnig Rush` gives an `UNKNOWN_CARD` line with the message "No card named \"Lightnig Rush\" in the card data."; fix by typing or Remove line (tests in `deck-import.spec.ts`, `decks-import-save.spec.ts`); the accept-suggestion half is marked as waiting for H-272. Status stays `review`, pins agree. |
| H-485 | PASS | SPEC-002 0.6 LEGAL-B11 and "2v2 content" match the Ban List 2v2 reading (1 Legend, 14 cards, 7 battlefields, hub spellings normalised) and `data/banlist.json`: snapshot wave 1 Legend + 6 cards + 5 battlefields, Radiance wave 8 + 2, hub `sourceUrl`, notes say "not one Riot wave" and the dates are placeholders. Status `approved` to `review` (not upgraded). |
| H-652 | PASS | LEGAL-C05: second rotation start of 2029, Set 14, Sets 6-9, as in Formats fact 8 (FAQ re-read 2026-11-26); `partial` kept; every `legalUntil` stays `null`. |
| H-645 | PASS | SPEC-001 0.4.2 closes OQ17 and points to LEGAL-C07; the ARC note is `unverified`, "not an official ruling", matches Formats #10 and Sets #7. SPEC-001 stays `review`. |
| H-660 | PASS | OWN-050 / SHARE-050 / AC 38: singular "copy" when R = 1 (depends on R only), plural otherwise; matches `deck-ownership-view.ts` (H-521) and is labelled as the build's, "RJ has not reverted it", not as RJ's words. |
| H-662 spec | PASS (one follow-up) | SPEC-005 0.14 (in 0.15) and SPEC-008 0.4.9 (in 0.5) quote RJ's words exactly; the icon name, `aria-pressed`, 44 px and reason line are listed in Open question 21 as the builder's, not RJ's. Matches the build (short locked deck shows only the closed lock; badge, date and button gone). Follow-up below. |
| H-663 spec | PASS | SPEC-005 0.15 and SPEC-008 0.5 (SHARE-042 MUST NOT, SHARE-044, AC 40, OQ22 scope) quote RJ's words exactly and match the build, including the accessible name "Hextech Ray, Main Deck, 0 of 3 available". `sharedLabel` kept but unrendered, as the spec allows. Status `draft` kept. |

Pins and versions: SPEC-005 0.15, SPEC-008 0.5, SPEC-006 0.16.1, SPEC-002 0.6, SPEC-001 0.4.2 in headers, Spec Index and Depends lines agree; old versions appear only as labelled history pins. No status upgraded (SPEC-002 went down to `review`).

## Follow-ups (not failures)
1. **spec-writer, P1 (wording):** SPEC-005 OWN-116 still says "the feedback texts and the 'Locking in...' state are SHARE-029", but SHARE-029 (c) now says the icon toggle has no "Locking in..." text (only `aria-disabled`). Reword OWN-116 to match.
2. **SPEC-005 0.15 Summary bullet** puts "(closed lock = locked)" under the RJ-attributed H-662 line; RJ only said "just the icon" and "lock/unlocked status". Harmless, but could say "builder default" like Open question 21.
3. For RJ: the combined H-148 notice wording ("'A' (locked) is now 2 cards short. 'B' (locked) is now 1 card short.") and the H-233 note that Undo of a Replace over test data does not bring the test decks back.
