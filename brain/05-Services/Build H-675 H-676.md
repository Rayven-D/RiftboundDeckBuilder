---
tags: [services, build]
board: H-675, H-676
specs: ["[[Shared Cards and Lock-in]] 0.8 (SHARE-097, ACs 40, 41)", "[[Deck Legality]] 0.7 (LEGAL-R09, AC 28)", "[[Deck Import]] 0.18 (DECK-107, AC 42)", "[[Your Decks Ownership View]] 0.18 (OWN-116 (iii), OWN-117, ACs 46, 47)"]
branch: loop/H-674-rj-answers
as_of: 2026-11-26
---
# Build H-675 H-676

**H-675.** Pressing the deck lock toggle (`app-lock-actions variant="icon"`) or the card dialog's "Lock these copies"
while locking is blocked shows an info notice "Can't lock. " + the first failing reason's existing sentence + ".".
Both controls stay `aria-disabled` and focusable. Strings come from `lockCheckMessage` / `nameLockCheckMessage`
(`shared-pool.ts`) through `cantLockReasonNotice` in `deck-locks.ts`: "This deck is read-only", "Locked decks could not
be read", "Ownership unavailable", "Lock in needs at least one card" (deck only). Missing cards keep H-670. A save in
progress ignores the press. Unlock never shows it. The card-name control is not rendered while ownership is
unavailable (Open question 20), so that string has no UI test for the name control; the deck toggle has one.

**H-676.** The engine adds `RuleResult.notEvaluatedItems` (LEGAL-R09); `notEvaluatedReason` is unchanged. The display
(`app-not-checked-list`, used by the Deck Import review and the Rule check dialog) shows a count line from the item
(never by parsing the text, so "Fizz, Trickster" is one card) and a "Show cards" / "Hide cards" button
(`aria-expanded`, `aria-controls`, 44 px, collapsed by default, not stored). Contract: [[API Contracts]] (Legality).

Behaviour chosen (not in the spec): the engine registers each list reason's label and names in a module map
(`LISTED_REASONS`) keyed by the reason text, so the rules keep returning strings; the Deck detail dialog passes its
fixed reasons as items with no names (the page has no engine run yet, H-194 wiring).

Tests: `lock-actions.spec.ts` (H-675 AC 40, 41; icon toggle), `deck-detail.spec.ts` (name control, read-only toggle),
`not-checked-list.spec.ts` (H-676 AC 42, 47), `deck-import-legality.spec.ts` (AC 42 in the review), `legality.spec.ts`
(AC 28). `npm run lint`, `npm run build` and `ng test` in `web/` pass (97 files, 1551 tests).
