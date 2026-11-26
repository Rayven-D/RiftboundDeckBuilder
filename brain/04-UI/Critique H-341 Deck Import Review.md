---
tags: [ui, review]
date: 2026-11-25
board: H-341
spec: SPEC-006
status: done
---
# Critique H-341: Deck Import review step

Post-build review by `ui-engineer` of the **Import deck** review step on `/decks` (built in H-253 without a brief), against [[Deck Import]] (SPEC-006 0.11.1, DECK-030…044, 070…073, 098), [[Validation H-253]] and [[Design Direction]]. Code read: `web/src/app/shared/import/deck-review.ts` (`DECK_REVIEW_WORDS` lives here, not in `deck-import.ts`), `shared/import/deck-import.ts` (`DECK_REVIEW_TEXT`, incl. `championNotPicked` / `championExtraToMain`), `shared/import/import-dialog.ts` + `import-dialog.scss`, `core/import/deck-import.ts` (`DECK_SAVE_TEXT`).

**How it was tested:** Playwright (Chromium), dev build on `:4207`, signed in by email link on the Auth emulator (new throwaway account), fixture catalog. Widths 1440, 1024, 768, 390; light and dark; reduced motion; keyboard (Tab, Enter, Escape); a11y tree snapshots; contrast measured from computed colours. Inputs:
1. `data/samples/fixture/imports/deck-varrow-legal.txt` (clean, saved).
2. Variant A: no sections at the top, two Legends, unknown-type cards, a typo line, an unknown code-only line, a Battlefield under `Main Deck:` (all question kinds, Lines to fix, Move to).
3. Variant B: a precon-style `Champion:` section with 3 options (2× the pick) (the two champion reason lines).
4. RJ's real lists (2026-11-25): **Evelynn** (sectioned, `MainDeck:`, `Runes:`, `Sideboard:`) and **Kai'Sa** (no headers for the main block, `Name - Subtitle (SET-NNN)`, `VEN-SP1`, `RAD-R03`, `Side Board:`). See §5.

**Verdict:** the step works and the flow order is sensible (name → status → fix → questions → checks → placed lines → source). One **blocker** (a select shows an answer it does not hold) and a cluster of **major** focus, Save-state and wording problems, the worst of which tells the user champion cards are "left out" when they actually go to the Main Deck. Contrast and touch targets pass.

## 1. What works
- Clean list (fixture): name defaults to the Legend (`Varrow, Ember Warden`), the zone counts line reads like the deck (`Legend 1 · Champion 1 · Main Deck 39 · Battlefields 3 · Rune Pool 12 · Sideboard 2`), and nothing else shows. Save → dialog closes, you stay on `/decks`, "Deck saved." + **View deck** is announced politely (6 s success notice, H-116 pattern), focus lands on the **Import deck** FAB. Matches DECK-098.
- The paste step parses RJ's formats well: `MainDeck:`, `Side Board:`, blank lines between sections, `(OGN-247)` bracket codes are all recognised.
- "Lines to fix" items carry the line number and a per-line **Remove line** with a unique accessible name (`Remove line 9`).
- "Placed by card type" selects have unique names (`Section for Cinder Recruit`).
- `Legend` and `Chosen Champion` selects are real comboboxes with listboxes; Enter picks, Escape closes only the list, not the dialog.
- Cancel and Escape close the dialog and return focus to the FAB. The dialog traps focus (Tab from a lost focus re-enters the dialog).
- Reduced motion: the dialog transitions resolve to ~0 s.

## 2. Findings

| # | Sev | Finding (what I saw) | Why it matters | Fix (builder item) |
|---|---|---|---|---|
| 1 | **blocker** | **A zone-question select shows another question's answer.** Variant A: answering the first `PICK_ZONE` (`Varrow, Ashen Blade` → Champion) removes that question; the next question (`Line 6: Ember Volley`) now shows **Champion** in its select while it is still unanswered (orange border, "2 questions to answer", Save blocked). Cause: `@for (q of v.questions; track $index)` plus a constant `[value]="null"` on `.pick-zone`, so the old `mat-select` instance (and its value) is reused for a different question. Screenshot `h341-1440-stale-select.png`. | The user sees every question answered and can't tell why Save does nothing. Also a 4.1.2 Name/Role/Value failure (the value announced is not the real one). | H-450 |
| 2 | major | **Focus is lost to `<body>` after every step change**: after Continue, Back, Remove line, Move to <zone>, Put all in Main Deck, and when an answered question leaves the list. | WCAG 2.4.3 Focus Order. A screen-reader user hears nothing after Continue and has to Tab from the top of the dialog; after Back the text box they were told to fix isn't focused. | H-450 |
| 3 | major | **Save looks enabled when it is blocked.** `button.save-deck` has `aria-disabled="true"` but full teal fill, white label, opacity 1. Clicking does nothing and says nothing. Not linked to the reason (`aria-describedby` none). | Sighted users press a button that ignores them; a name-only error ("Give the deck a name.") is not in the summary at all. | H-451 |
| 4 | major | **Champion prompt is factually wrong.** With 2+ cards under `Champion:` the prompt says "Pick the deck's Chosen Champion. **The other Champion lines are left out.**" but the build (RJ 2026-11-25, re-checked in [[Validation H-253]]) puts them in the **Main Deck** (Variant B: Main Deck 7 → 10). | Users will think they lose cards, or re-add them by hand and double-count. | H-452 (string §4) |
| 5 | major | **The two champion reason lines are never shown.** `championNotPicked` / `championExtraToMain` are set as `zoneReason`, but `zoneReason` is only rendered in "Placed by card type", which lists only lines *without* a section. Lines under `Champion:` have one, so the reasons are dead text. | Nothing on screen tells the user where the unpicked options and extra copies went. | H-452 |
| 6 | major | **Question selects have no context.** Every `PICK_ZONE` select is named just "Section" (three identical "Section" comboboxes in Variant A); the prompt paragraph ("Line 5: Flashfire. Its card type isn't known…") is not linked (`aria-describedby` none). Questions are plain `div`s with no group role and no heading above them; open vs answered is shown **only by border colour** (warning orange vs grey). | 1.3.1, 2.4.6, 1.4.1 Use of Color, 4.1.2. A screen-reader user tabbing through hears "Section, combobox" ×3. | H-451 |
| 7 | major | **"This list has no Legend" when it has one.** RJ's Evelynn and Kai'Sa lists both name a Legend; when that line is unresolved (it sits in Lines to fix), `PICK_LEGEND` still opens with "This list has no Legend. Pick one, or leave it empty." | Factually wrong, and it asks the same thing twice (fix line 2, *and* pick a Legend). DECK-036 is written for "no Legend in the input at all". | H-452 (wording) + spec gap S3 |
| 8 | major | **A printing code can swap a card silently.** Kai'Sa list: `3 Noxus Hopeful (OGN-012)` became **3 Quiet Harbor** (a Battlefield, 3 copies) and `2 Bilgewater Tracker (RAD-003)` became Forge Sprinter, each with only a muted warning line under the questions ("OGN-012 is Quiet Harbor, so that card was used."). The codes clash here only because the fixture codes are invented, but the same path runs for a real typo'd name plus a valid code. | A wrong card enters the deck with a warning that's easy to miss; there is no Remove action on it. | H-452 (presentation) + spec gap S7 |
| 9 | minor | "Placed by card type" also lists lines the **user** placed (the picked Legend, a `PICK_ZONE` answer) with no reason text, so the heading is wrong for them. | Ambiguous label. | H-452 (string §4) |
| 10 | minor | "N lines are left out of the deck **and listed on it**." "It" is unclear, and the note doesn't say *which* lines (Variant A: Sorrel, the unpicked Legend, plus removed lines). | Ambiguity. | H-452 (string §4) |
| 11 | minor | No persistent live region: the `role="status"` blockers line is removed when the last blocker clears, so nothing announces that the deck is ready. Errors (name, link) are not in it. | 4.1.3 Status Messages. | H-451 |
| 12 | minor | Name field: cleared name shows "Give the deck a name." as a hint, but `aria-invalid="false"`, not `required`, no error outline. Link: `SOURCE_URL_INVALID` shows in the warnings list *above* the fields, not under Link, and fires on each keystroke (typing `h` of `https://` already warns). | 3.3.1 Error Identification, 3.3.2. | H-451 |
| 13 | minor | **The floating label on the first field is clipped** ("Deck name" cut by the top of the scroll area) at every width and in both themes; outline notch seams (0.8px borders) show as small fragments under each outlined field. | Looks broken on the first thing you read. | H-453 |
| 14 | minor | **Nested scroll boxes**: `.issues` (max 12rem) and `.inferred` (max 16rem) scroll inside the dialog's own scroll. RJ's Evelynn list (catalog gap) gives 30 lines to fix in a 192px box showing 2.5 rows (`h341-1440-evelynn.png`). On a phone this is a scroll inside a scroll inside a 343px dialog. | Hard to scan, easy to miss lines, poor on touch. | H-453 |
| 15 | minor | Phone (390): the dialog is a 343×688 card over the page with the tab bar visible under it; "Placed by card type" rows give the name ~110px next to an 11rem select, so `Cinder Recruit` wraps to 2 lines and `Card type is Battlefield` to 2 more. Long real names (`Thousand-Tailed Watcher`) wrap to 3–4. Our other big phone dialogs (Filters, card dialog) are full screen. | Cramped; much scrolling. | H-453 |
| 16 | minor | The counts line, Section selects and `Move to` use **"Champion"**; the question, its label and the spec say **"Chosen Champion"** (DECK-034). | Two names for one slot. | H-453 |
| 17 | minor | The review step has no heading of its own: the title stays "Import deck" and nothing marks the move from paste to review. Warnings (mismatch, code used, token) have no heading either. | 2.4.6, orientation for SR users. | H-451 |
| 18 | obs | `PICK_CHAMPION` with no section offers the catalog as a plain `mat-select` ("From this list" / "Other cards"). With the fixture it held only "Leave empty" (no fixture card has `category: 'champion'`). With real data this is a long list; DECK-034 says "catalog search". | Fine for now; revisit with live data (H-020). | H-452 (optional part) |
| 19 | obs | Back throws away every review answer ("the deck review's choices start over"); Cancel / Escape after answering asks nothing. | Possible lost work on long lists. | Open choice for RJ (§6) |
| 20 | obs | **Section selects can put 3 copies in the single Chosen Champion slot.** Variant A: `PICK_ZONE` → Champion on a 3-copy line gives "Champion 3" and closes `PICK_CHAMPION`. The `Champion:`-section path moves extras to Main; this path doesn't. | Behaviour, not layout. | Spec gap S4 (H-342 (d)) |

Severity: **blocker** = wrong data on screen or the task can't be finished with confidence; **major** = WCAG AA failure or a misleading message; **minor** = polish / AA-adjacent; **obs** = no change now.

## 3. Accessibility audit (WCAG 2.1 AA)

**Contrast (measured on the dialog surface):**

| Text / part | Dark (surface `#2D343C`) | Light (white) |
|---|---|---|
| Muted (counts line, notes) | 4.93:1 | 6.40:1 |
| Danger (blockers, error icon) | 5.66:1 | 7.07:1 |
| Step heading, hints | 10.26:1 | 16.60:1 |
| Accent text buttons (Remove line, Cancel, Back) | 6.76:1 | 5.47:1 |
| Save deck label on fill | 5.81:1 | 5.47:1 |
| Field outline (1.4.11) | 3.98:1 | 4.48:1 |
| Open question border (warning) | ≥ 3:1 | ≈ 7:1 (`#854F0B`) |

All pass. The answered-question border (1.44:1 dark) is decorative and fine, but see finding 6: state must not rely on it.

**Keyboard and focus:** dialog traps focus; Escape on an open list closes the list only; Escape on the dialog closes it and returns focus to the FAB. Failures: focus lost on step changes (finding 2), stale select (1). Save is reachable while blocked (good, `aria-disabled`), but gives no feedback (3).

**Screen-reader flow (from the a11y tree):** dialog "Import deck" → h2 "Import deck" → textbox "Deck name" → paragraph of counts → status ("2 cards need attention 4 questions to answer") → h3 "Lines to fix" → list → (questions: unlabelled groups, "Legend" / "Chosen Champion" / "Section" comboboxes) → list of warnings (no heading) → h3 "Placed by card type" → list → Source / Link textboxes with hints as descriptions. Gaps: findings 6, 11, 12, 17.

**Target size at 390:** every button's touch target is 48px tall (Material touch target; the visible button is 40px); outlined selects and inputs are 56px. Pass the 44px rule.

**Reflow / reduced motion:** no horizontal scroll at 390; transitions ~0 s under `prefers-reduced-motion`. Pass.

**Console:** two `NG0956` track-by-identity warnings appeared on the page after a theme switch (Decks list, not this dialog). Note only.

## 4. Wording (current → proposed + reason)

RJ approved the review and error strings on 2026-11-25 (H-342 adopts them into SPEC-006). Only changes with a stated reason are proposed. Everything not listed stays as written.

| Key | Current | Proposed | Reason |
|---|---|---|---|
| `DECK_REVIEW_WORDS.championMany` | Pick the deck's Chosen Champion. The other Champion lines are left out. | **Pick the deck's Chosen Champion. The other Champion cards go in the Main Deck.** | Factual mismatch with the built rule (RJ 2026-11-25; [[Validation H-253]] re-check). |
| `DECK_REVIEW_TEXT.championNotPicked` *(post-approval, in scope)* | Not picked as the Chosen Champion, so it is in the Main Deck | **Not picked as Chosen Champion, so it moves to the Main Deck** | The card was listed under `Champion:`; "moves to" says something changed. Same fragment style as "Card type is Unit" (no full stop). |
| `DECK_REVIEW_TEXT.championExtraToMain` *(post-approval, in scope)* | One copy is the Chosen Champion; the other copies are in the Main Deck | **1 copy is the Chosen Champion; the other copy moves to the Main Deck** (n = 1) / **…; the other {n} move to the Main Deck** (n > 1) | Concrete count; parallel to the line above. Becomes a function of the extra copies. |
| `DECK_REVIEW_WORDS.legendNone` (new variant, no change to the approved line) | This list has no Legend. Pick one, or leave it empty. *(also shown when the Legend line is unresolved)* | Keep for the real "no Legend" case. Add **`legendUnresolved`: "The Legend on line {n} isn't in the card data. Fix that line, or pick a Legend here."** | Factual mismatch (finding 7). Until S3 is decided, this is the honest wording. |
| `DECK_REVIEW_WORDS.inferred` / `inferredNote` | Placed by card type / Change a section if it is wrong. | **Lines without a section** / **These lines had no section label, so they were placed by card type or by your answers. Change any that are wrong.** | The list also holds user-placed lines (finding 9). |
| `DECK_REVIEW_WORDS.removed` | {n} line(s) is/are left out of the deck and listed on it. | **1 line is left out of the deck: {list}. It will be listed on the deck's page.** / **{n} lines are left out of the deck: {list}. They will be listed on the deck's page.** ({list} = "line 2 (Sorrel, Tide Reader)", …) | "It" is ambiguous and the lines aren't named (finding 10). DECK-042 shows them on the saved deck. |
| `DECK_REVIEW_TEXT.needAttention` *(spec-worded, DECK-041)* | {n} cards need attention | Proposal for H-342 / RJ only: **{n} lines need fixing** | It counts **lines**, not cards (Evelynn: "30 cards need attention" for 30 lines, 66 cards). Matches the heading "Lines to fix". Not filed for builder until the spec changes. |
| `DECK_REVIEW_TEXT.mismatch` *(spec-worded, DECK-022)* | Gallows Market is a Battlefield | Proposal for H-342 / RJ only: **Gallows Market is a Battlefield, but it's under Main Deck.** | Says what's wrong, not just a fact. Optional. |
| New: ready line | (none) | **Ready to save.** | Persistent status region needs a "clear" state (finding 11). |
| New: open-question tag | (none) | **Needs an answer** | Open state as text, not colour only (finding 6). |
| New: review heading | (none) | **Check the deck** (h3, first in the review) | Orientation and a focus target after Continue (findings 2, 17). |
| New: checks heading | (none) | **Check these** (h3 above the warnings list; same words as the Owned Cards review's `REVIEW_TEXT.notes` without the colon) | Finding 17; reuses an existing string. |
| New: champion follow-up | (none) | **Also in the Main Deck:** followed by the reason lines | Finding 5. |
| New: code-used action | (none) | Button **Remove line** (same as Lines to fix) next to "`<code>` is `<card>`, so that card was used." | Finding 8; reuses an existing string. |

`DECK_SAVE_TEXT`: no changes. `tooLarge` says "different entries"; "entries" is a bit technical but correct (DECK-092 counts entries after merging) and rare. Keep.

## 5. RJ's real lists (2026-11-25)

The fixture catalog has 52 invented cards, so almost none of the real names resolve. The table splits **catalog gap** (would resolve with live data, H-020) from **format gap** (would fail even with live data).

| List | Paste step | Review step | Catalog gap | Format gap |
|---|---|---|---|---|
| **Evelynn** (sectioned) | "66 cards from 32 lines"; Legend 1, Champion 1, Main Deck 39, Battlefields 3, Rune Pool 12, Sideboard 10. `MainDeck:` and blank lines fine. | Rune Pool 12 resolves (Body Rune, Chaos Rune exist in the fixture). **30 lines to fix**, all "No card named "…" in the card data." Then `PICK_LEGEND` "This list has no Legend…" (wrong, finding 7). Name falls back to "Imported deck Nov 25, 2026". | All 30 (fixture only). | None. The parser handles this layout. |
| **Kai'Sa** (no headers, hyphen names, codes) | "66 cards from 31 lines"; "No section 56", Sideboard 10. `Side Board:` (with space) maps to Sideboard. | 28 lines to fix; 2 questions (Legend "no Legend", `PICK_ZONE` for one line); 3 warnings "`<code>` is `<card>`, so that card was used" (finding 8). Placement by type only exercised on 3 lines (Unit → Main, Battlefield → Battlefields), which behaved per DECK-032. | Most names. | **(a)** `5 Mind Rune (RAD-R03)` / `7 Fury Rune (RAD-R01)`: `R03` is not a code shape in IMP-064 (number must start with a digit, or be a block with `/`), so the code stays in the name and **`Mind Rune` fails although the card exists**. **(b)** `1 Kai'Sa - Survivor (VEN-SP1)`: `SP1` without `/005` is CARD-037 form (d), also kept in the name. **(c)** `Kai'Sa - Daughter of the Void`: ` - ` as the name/subtitle separator; catalog names use a comma (`Varrow, Ember Warden`), so even with live data this falls to fuzzy suggestions (IMP-025 (3), not built, H-272). |

Do the zone questions make sense on these lists? Mostly not yet, because the Legend line is unresolved: the user gets "no Legend" plus a Legend select whose options come from the whole catalog, while the real Legend sits in Lines to fix. With no headers (Kai'Sa), DECK-032 inference would place most cards correctly once they resolve, and `PICK_CHAMPION` would ask for the Chosen Champion. That is the right model, but it only works after the names resolve.

Does the wording say what to do? Per line, no. "No card named "X" in the card data." states the problem; the one general note under the list ("Remove a line here, or go Back and fix it in the list.") carries the instruction. Fine for 2 lines, weak for 30. A bulk **Remove all lines to fix** would be the practical answer for a set the catalog doesn't have yet, but it is new behaviour (see S6).

### Spec gaps found (for spec-writer, not filed as builder items)
- **S1** Rune and promo code shapes in text lines: `RAD-R03`, `VEN-SP1` (IMP-064 / CARD-037). Needs research on the real collector-number formats first (H-020 / H-099 already ask this for runes and `SP`).
- **S2** ` - ` as the name/subtitle separator (`Kai'Sa - Daughter of the Void` for `Kai'Sa, Daughter of the Void`): treat as the comma (IMP-019 / CARD-030), or leave it to fuzzy suggestions (H-272)?
- **S3** `PICK_LEGEND` when the input *has* a Legend line that didn't resolve: DECK-036 says "no Legend in the input at all". Hold the question until the line is fixed, or ask with the new wording?
- **S4** A `PICK_ZONE` / Section choice of Legend or Chosen Champion on a line with quantity > 1 (finding 20): extra copies to Main (as the `Champion:` path does), or hide single-slot zones from Section selects? Belongs with H-342 (d).
- **S5** `needAttention` counts lines but says "cards" (DECK-041, AC wording).
- **S6** Bulk "Remove all lines to fix" (DECK-041 allows removing one line at a time).
- **S7** A line whose **name isn't in the catalog** but whose code is: today it resolves to the code's card with a warning (DECK-015 / IMP-068). Should it be `needs-review` instead, so a wrong card can't slip in?

## 6. Open choices for RJ
1. **Back keeps answers?** (a) as built: Back clears every answer; (b) keep answers for lines whose text didn't change. **Recommend (b)** for long lists; it is behaviour, so spec-writer first.
2. **Confirm on Cancel / Escape after answers?** (a) as built, no; (b) "Discard this import?" only when an answer or removal was made. **Recommend (a)** for now: the text box keeps nothing anyway, and Collection's import doesn't confirm either.
3. **Phone layout:** full-screen dialog at ≤ 40rem (like Filters and the card dialog). **Recommended** and included in H-453; say no if you want the floating card.

## 7. Builder items filed
- **H-450** (P1, blocker) Review step: stale select and focus after every step change.
- **H-451** (P2, major) Save state, live status and screen-reader structure of the review.
- **H-452** (P2, major) Champion and placement wording, show where cards went, code-used checks.
- **H-453** (P3, minor) Layout polish: clipped label, nested scrolls, phone full screen, row stacking, "Chosen Champion" label.

## 8. Screenshots (scratch, outside the repo)
In `C:\Users\rjder\AppData\Local\Temp\claude\3f5173f149181b3f\8da30c36-4b3a-4804-8008-8e2954c1fbd1\scratchpad\`: `h341-1440-legal-light.png`, `h341-1440-legal-content.png`, `h341-1440-questions-light.png`, `h341-1440-stale-select.png`, `h341-1440-champion-dark.png`, `h341-1024-champion-light.png`, `h341-768-champion-light.png`, `h341-390-questions-light.png`, `h341-390-placed-light.png`, `h341-1440-evelynn.png`, `h341-1440-kaisa.png`.

## 9. Built (builder, 2026-11-26, H-451…H-453, H-469; RJ approved the §4 strings and §6 (b) and (c) on 2026-11-26)
Agreed decisions as built in `web/src/app/shared/import/` (branch `loop/H-410-H-480-deck-import-review`):
- **Save deck** (H-451): Material `disabled` + `disabledInteractive` (12 % fill, 38 % label, still focusable), `aria-describedby="deck-review-status"`. A press while blocked focuses the first open item, in this order: a line to fix (its first button), an open question's select, the name field, the Source field.
- **Status** (H-451): one `role="status"` `p#deck-review-status`, always in the DOM: blockers, "Give the deck a name.", the source error, or **"Ready to save."** (muted, not red).
- **Questions** (H-451): `role="group"` labelled by the prompt `p`; every select is `aria-describedby` the prompt; `PICK_ZONE` selects are named "Section for <name> (line <n>)". Open questions show the text tag **"Needs an answer"** (`--color-warning` text with a 1px border in the same colour, 12px / 600): **5.79:1** dark on `#2d343c`, **6.73:1** light on white (measured in Chromium).
- **Headings** (H-451): h3 "Check the deck" (first), "Lines to fix", **"Check these"** (above the warnings list), "Lines without a section".
- **Name / Link** (H-451): name `required` with Material's error state and `aria-invalid="true"` when empty (Material leaves `aria-invalid` off an empty required field, so the review sets it after render); `SOURCE_URL_INVALID` shows under Link as its description, checked on blur (typing hides it until the next blur) and no longer in "Check these".
- **Where cards went** (H-452): "Also in the Main Deck:" lists each moved line with the copies that went to Main and its reason, under the `Champion:` question once answered, and on its own when a single champion line had extra copies (DECK-027, no question). The left-out note names each line as "line 2 (Sorrel, Tide Reader)" (unresolved lines show their text). Code-used warnings carry **Remove line** (accessible name "Remove line <n>"; focus moves to the next one, else "Check the deck"). User-placed rows read "You picked this section". ~~`legendUnresolved` is used when a line under `Legend:` is in Lines to fix~~ **Replaced by H-500 (SPEC-006 0.14 DECK-104, RJ 2026-11-26):** the string is removed; while a line under `Legend:` is in Lines to fix, no Legend question is shown at all (an unsectioned unresolved line can't be known to be a Legend, so it doesn't hold the question). Item (7), catalog search for `PICK_CHAMPION`, was not built: the catalog has no champion data yet (fixture: 0).
- **Layout** (H-453): content top padding `--space-3` (label whole); one scroll (inner `max-height` removed from the deck review's lists); desktop width 45rem (720px), `max-width: calc(100vw - 2rem)`; at ≤ 40rem the dialog fills the screen (`.import-deck-panel` in `styles.scss`, radius 0), the content scrolls and the actions are pinned with safe-area padding; "Lines without a section" rows stack (select full width under the name). The review says "Chosen Champion" for the `champion` zone (counts, Section options, Move to); the paste step's section summary still uses the parser label "Champion". The 0.8px outline seams did not reproduce: the outline is the theme's 1px in Chromium at 1×, so nothing was changed there.
- **Focus ring on a script-focused heading** (H-469, checked with H-451 / H-453): **kept as built**. "Check the deck" and the Owned Cards review's new **"Check the cards"** are `tabindex="-1"` headings: after a keyboard Continue they match `:focus-visible` and show the app's ring; after a mouse click they don't (Chromium's heuristic), which is wanted, since a ring on a non-interactive heading after a click is noise and screen readers announce the heading either way.
- **Back keeps answers** (H-480, SPEC-006 0.13 DECK-100, DECK-101): Back → edit → Continue keeps zone and Section picks (incl. Move to, Put all in Main Deck), the Legend and Chosen Champion answers (incl. Leave empty) and removed lines on unchanged lines (trimmed text + section context + occurrence). Name, Source, Link and "Use X" picks start over (the spec's open-question defaults). No visual change.
- **Legend question held** (H-500, DECK-104): see the `legendUnresolved` note above. No new wording.

## Not tested
- Real screen readers (NVDA / VoiceOver): announcements are inferred from the Chromium a11y tree and the live-region markup.
- Save failures (`DECK_LIMIT` with 200 decks, `STORAGE_FULL`, `DECK_TOO_LARGE`) and the signed-out-mid-dialog path: read from code only.
- Upload of `.csv` / `.xlsx` into the deck dialog, and drag-and-drop of a file.
- 200% browser zoom (390 width covers most of the reflow risk).
- Zone placement on real card data (fixture spells and champions are `category: 'unknown'`, so most unsectioned non-units become `PICK_ZONE`).

Links: [[Deck Import]] · [[Validation H-253]] · [[Collection Import]] · [[Design Direction]] · [[UI Index]]
