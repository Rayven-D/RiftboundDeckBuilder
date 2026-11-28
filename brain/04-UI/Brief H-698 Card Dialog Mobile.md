---
title: Brief H-698 - Card dialogs on phones become a bottom sheet
status: ready (RJ request 2026-11-28; behaviour items B1 and B2 are RJ's decisions, the visual design is ui-engineer's recommendation)
board: H-698
source: "RJ 2026-11-28 (in chat, via the orchestrator): 'clean up the card dialog for mobile ... Make it look cleaner for mobile devices.' Decided by RJ: the Android/Samsung system back gesture closes the dialog and stays on the page; swipe down from the top of the dialog closes it. [[Design Direction]], [[Collection Components]] §6, [[Decks Components]] §12, SPEC-005 OWN-112/OWN-113, [[Accounts and Sync]] SYNC-161 (notices)"
date: 2026-11-28
tags: [ui, brief, rj-requested, mobile]
---

# Brief H-698: card dialogs on phones become a bottom sheet

**Scope:** the two card dialogs, on phones only (`max-width: 40rem`, the shared `PHONE` query):
- Collection: `web/src/app/shared/collection/card-dialog.ts` + `card-dialog.scss`, opened by `pages/collection/collection-page.ts`.
- Deck detail: `web/src/app/shared/deck-detail/deck-card-dialog.ts` (content in `deck-card-content.ts`), opened by `pages/deck-detail/deck-detail.ts`.
- The shared shell is the global `.card-dialog-panel` in `web/src/styles.scss`.

**Out of scope:** tablet and desktop (above 40rem) stay exactly as they are. Content, wording and the order of sections stay as specced (OWN-112, Collection Components §6). This brief changes how the dialogs are presented and laid out on phones, not what they say.

## RJ's decisions (built as stated, not up for debate)
- **B1 Back gesture:** on phones the Android/Samsung system back gesture (and the browser Back button) closes an open card dialog and leaves the user on the same page. The route does not change and the page does not scroll.
- **B2 Swipe down:** swiping down from the top of the dialog closes it. So on phones the dialog is a **sheet with a visible grab handle**. The presentation below is designed around that.

## What is wrong today on phones (seen 2026-11-28)
Looked at with Playwright at 375 x 812 and 360 x 780, light and dark, through the `/styleguide` previews ("Several printings, locked + short", "Banned, no image, two decks", Decks preview "Card dialog (below 64rem)"). The styleguide opens the dialogs with desktop sizes, so I forced the pane to the phone config the real pages use (`100vw` x `100svh`) before taking the screenshots. Console: no errors. Screenshots (scratchpad, not committed):
- `C:/Users/rjder/AppData/Local/Temp/claude/84c2691213623cb3/33682a63-5e49-42bf-a7d0-22db5da30af3/scratchpad/h698-coll-375-dark-top.png` (light, despite the name)
- `C:/Users/rjder/AppData/Local/Temp/claude/84c2691213623cb3/33682a63-5e49-42bf-a7d0-22db5da30af3/scratchpad/h698-coll-375-light-scrolled.png`
- `C:/Users/rjder/AppData/Local/Temp/claude/84c2691213623cb3/33682a63-5e49-42bf-a7d0-22db5da30af3/scratchpad/h698-deck-375-dark-top.png`
- `C:/Users/rjder/AppData/Local/Temp/claude/84c2691213623cb3/33682a63-5e49-42bf-a7d0-22db5da30af3/scratchpad/h698-deck-375-dark-bottom.png`
- `C:/Users/rjder/AppData/Local/Temp/claude/84c2691213623cb3/33682a63-5e49-42bf-a7d0-22db5da30af3/scratchpad/h698-coll-360-dark-banned.png`

Findings:
1. **It reads as a blank page, not as something you can dismiss.** The dialog fills the whole screen edge to edge with square corners and no backdrop showing. Nothing says "this sits on top of the page and goes away". There is no handle, and nothing invites the swipe RJ wants.
2. **The sticky header is offset by 16 px (bug).** In both dialogs, `.head` is `position: sticky; top: calc(-1 * var(--space-4))`. The scroll container is the Material surface, which has no padding, so once the content scrolls the header slides up 16 px. The title then touches the top edge of the screen and the Close button sits at y = 0 (measured: head top = -16 px after scrolling). See `h698-coll-375-light-scrolled.png` and `h698-deck-375-dark-bottom.png`.
3. **There is no divider under the sticky header.** When scrolled, the art and text slide under the title with no edge, so the two blend together.
4. **The top safe area is ignored.** `index.html` sets `viewport-fit=cover` and the pane is `100svh` from y = 0. On a notched or punch-hole phone the title and Close button sit under the status bar. Only the bottom inset is padded.
5. **The header is crowded.** In the deck dialog (always), and in the Collection dialog wherever stepping is on, three 44 px buttons (Previous, Next, Close = 140 px with the gaps) leave about 180 px for the card name at 375 px. Long names wrap to 2–3 lines next to the buttons. The Previous and Next buttons also sit in the top-right corner, which is the hardest place to reach with a thumb.
6. **A focus ring shows on open.** `autoFocus: '.close-button'` draws the teal focus ring around Close as soon as the dialog opens after a tap. On touch this looks like a stray highlighted button (visible in every screenshot).
7. **The two dialogs don't match** (same shell, different insides):

   | | Collection | Deck detail |
   |---|---|---|
   | Section heading (h3) | `--font-size-sm` (14 px) | `--font-size-xs` (12 px) |
   | Gap between sections | `--space-5` (24 px) | `--space-4` (16 px) |
   | Lead line under the art | `--font-size-lg` (20 px, same size as the title) | `--font-size-md` (16 px) |
   | Link rows | accent text, no underline, no separators | accent text, underlined, no separators |
   | Deck rows | hairline separators | no separators |
   | Art width | `min(60vw, 16rem)` (216–225 px) | `min(100%, 14rem)` (224 px) |
   | Phone query | `max-width: 40rem` | `max-width: 39.99rem` |
8. **The Collection printings list looks like loose links.** Each printing row is 44 px tall with no separators, so "You own 7 across all printings" turns into four widely spaced accent lines that read as unrelated links (`h698-coll-375-dark-top.png`). The "Locked in" rows right below do have hairlines, so the dialog mixes two list styles.
9. **The Collection lead line is as large as the title** (both 20 px), so the hierarchy flattens right under the art.

What works and stays: the art is centred and is the first thing you see. The thumbnail swaps for the full image with no layout shift. Close is 44 x 44. Link rows are 44 px tall on touch. The bottom safe area is padded. Ban labels sit under the art. Focus goes back to the tile on close.

## Target: one sheet for both dialogs

### S1 Presentation (phones only)
A **full-height bottom sheet**. It always uses the same height, whatever the content, so it doesn't jump when the user steps to another card or when the full image loads.

```
 ┌─────────────────────────────────┐  ← status bar (safe-area-inset-top)
 │░░░░░░░░ dimmed page ░░░░░░░░░░░░│  ← gap: --space-3 (12 px), backdrop visible, tap = close
 ╭─────────────────────────────────╮  ← top corners --radius-lg (8 px), bottom corners square
 │              ────               │  ← grab handle 36 × 4, 8 px from the sheet top
 │ Storm Caller               [ ✕ ]│  ← title + Close (44 × 44)
 ├─────────────────────────────────┤  ← hairline, only once the body has scrolled
 │          ┌───────────┐          │
 │          │           │          │
 │          │    art    │          │  ← min(60vw, 15rem), centred
 │          │           │          │
 │          └───────────┘          │
 │      ⦸ Banned since Nov 23      │
 │                                 │
 │ SGP-007a Showcase · 3 copies    │  ← lead, md / 600
 │ Preview (SGP) · #007a           │
 │─────────────────────────────────│
 │ You own 7 across all printings  │  ← h3 sm / 600 / muted
 │ 2 × SGP-007                     │  ← 44 px rows, hairlines
 │ 1 × Printing not specified      │
 │ ...                             │
 │                                 │  ← bottom pad: --space-6 + safe-area-inset-bottom
 └─────────────────────────────────┘
```

- **Pane:** width `100vw`, height `calc(100dvh - env(safe-area-inset-top) - var(--space-3))`, anchored to the bottom of the viewport (`align-items: flex-end` on the overlay, or `position: bottom` in the MatDialog config). Use `dvh` here, not `svh`, so the sheet's bottom edge follows the browser bar. If the builder sees a jump on Samsung Internet when its toolbar hides, fall back to `svh` and note it in the item.
- **Shape:** `--mat-dialog-container-shape` gives `--radius-lg` on the top corners and 0 on the bottom corners. Material's shape token is one value for all four corners, so set `border-radius: var(--radius-lg) var(--radius-lg) 0 0` on the surface inside `.card-dialog-panel` at the phone query.
- **Surface:** `--color-surface`, as today. Keep the existing lift shadow. Above 40rem nothing changes.
- **Backdrop:** the existing Material scrim. The dimmed strip at the top (status bar + 12 px) is a tap target that closes the sheet (`backdropClick` already routes through `close()`).
- **Scrolling:** only the sheet **body** scrolls. The sheet head (handle + title row) and, in the deck dialog, the step bar (S5) stay fixed. Build it as a three-row layout (head / scrolling body / optional footer), not with `position: sticky` and negative margins. That removes finding 2 at the root. The body gets `overscroll-behavior: contain`, so scrolling to the end doesn't scroll the page behind it or trigger the browser's pull-to-refresh.

### S2 Sheet head (both dialogs, identical)
- **Grab handle:** a 36 x 4 px bar with fully rounded ends, colour `--color-border-strong` (measured 3.45:1 on the dark surface `#242a31`, 3.55:1 on the light `#ffffff`), centred, `--space-2` (8 px) from the sheet top. It is decorative (`aria-hidden="true"`) and never focusable. Its parent row is the drag zone (S6).
- **Title row:** padding `--space-2` top, `--space-4` sides, `--space-3` bottom. Title on the left: `--font-size-lg`, Archivo as today, `line-height: 1.2`. It wraps and is never truncated (the card name is what the user tapped). **Close** on the right: 44 x 44, `close` icon, `aria-label="Close"`, aligned to the title's first line.
- **No Previous or Next buttons in the head on phones.** The head holds only the handle, the title and Close. Collection already turns stepping off on phones (`stepping: this.isDesktop()`); the deck dialog moves them to the step bar (S5).
- **Divider:** a 1 px `--color-border` line under the head, shown **only while the body is scrolled away from the top** (a CSS scroll-driven timeline or a scroll listener toggling a class; builder's choice). At rest the head and art share one surface with no line.

### S3 Body layout and hierarchy (both dialogs, phones)
One rhythm for both, so the dialogs look like the same component:
- **Side padding** `--space-4` (16 px); **top** `--space-2`; **bottom** `--space-6` + `env(safe-area-inset-bottom)` (Collection). The deck dialog uses `--space-4` because the step bar carries the inset (S5).
- **Art:** centred, width `min(60vw, 15rem)` in both dialogs (225 px at 375, 216 px at 360). Reserved aspect ratio, thumbnail then full image, as today. Ban label `--space-2` below the art, centred. The deck dialog's "Preview" flag goes in the same place.
- **Lead block** (`--space-4` below the art column): the first line is `--font-size-md`, weight 600. That's the Collection printing line ("SGP-007a Showcase · 3 copies") and the deck dialog's "Main Deck · 1 of 3 available". The second line is `--font-size-sm`, muted. **Collection drops from 20 px to 16 px on phones only** (finding 9). Desktop keeps `lg`.
- **Sections:** each section after the lead block starts with a 1 px `--color-border` rule, then `--space-4` above the heading. `h3` is `--font-size-sm`, weight 600, `--color-text-muted`, `--space-2` below. That gives the same heading size in both dialogs (the deck dialog goes from 12 px to 14 px on phones). The help lines ("Decks lock copies by card name, any printing.", "Counts toward this deck") stay `--font-size-xs`, muted.
- **One list row style for every list in both dialogs:** row `min-height: 44px`, `align-items: center`, text `--font-size-sm`, a 1 px `--color-border` between rows (not above the first). The whole row width is the tap target for link rows (the `<a>` / `<button>` fills the row). Link text uses `--color-accent-text` and **no underline** inside these lists (each row is plainly a list item, and the accent colour and full-row target carry it; links in running text keep their underline). Trailing values (`2 copies`, ownership chips) stay right-aligned with `tabular-nums`. The non-link "(this one)" row stays muted text.
- Rows that **leave the dialog** (deck dialog: printing rows go to `/collection`, deck rows to `/decks/:id`) get a trailing 20 px `chevron_right` in `--color-text-muted`, `aria-hidden`. Rows that switch the printing in place (Collection) get no chevron. That way the user can see which taps leave.
- "Card" facts (deck dialog) stay plain paragraphs inside a section; rules text keeps `pre-line`.

### S4 Collection dialog specifics
- On phones: no stepping (already the case on the page). Nothing else is added.
- The `#printingLine` focus target (after switching printings) keeps its `tabindex="-1"` and focus behaviour.

### S5 Deck dialog: step bar (phones only)
OWN-113 keeps Previous and Next through the deck. On phones they move from the head to a **bar fixed to the bottom of the sheet**, where the thumb is:

```
 ├─────────────────────────────────┤  ← 1 px --color-border
 │ ‹ Previous                Next › │  ← 56 px row + safe-area-inset-bottom
 └─────────────────────────────────┘
```
- Two text buttons (Material text buttons, the existing style), each at least 44 px tall and 96 px wide, at the left and right ends with `--space-2` side padding. They read "Previous" and "Next" with `chevron_left` / `chevron_right` icons and keep their accessible names "Previous card" / "Next card". At the ends they are disabled as today.
- Bar background `--color-surface`, padding-bottom `env(safe-area-inset-bottom)`.
- `[` / `]` keys keep working.
- When the card changes, the body scrolls back to the top. The sheet does not move or animate. Only the content swaps, with the existing `animateChange` on the art.

### S6 Swipe down to close (B2)
- **Drag zone:** the sheet head (handle + title row, the full width). Close is a normal button inside it: a tap on Close closes, and a drag that starts on Close still drags. ~~Dragging inside the body is **not** a close gesture, even at scroll top.~~ **Changed by RJ 2026-11-28 (after trying the preview):** a downward drag in the body also moves the sheet once the body is at its top (scrollTop 0), with the same follow, threshold, flick and snap-back. A drag that starts mid-scroll scrolls the body first; the rest of the same drag moves the sheet, measured from where the top was reached (no jump). Upward drags, drags while scrollTop > 0 and sideways drags scroll as usual; taps on rows still work; no pull-to-refresh or overscroll glow while the sheet moves (built in H-699).
- **Follow:** with pointer events (`touch-action: none` on the drag zone), the sheet moves 1:1 with the finger downward (`transform: translateY(dy)`, no transition while dragging). Upward drag is clamped to 0, or to a small rubber band of at most 8 px. The backdrop opacity fades in proportion (`1 - dy / sheetHeight`).
- **Release:** close when `dy > min(120px, 25% of sheet height)` **or** the release velocity is above 0.5 px/ms downward. Otherwise snap back to 0.
- A drag that closes the sheet returns the same result as Close (`{ entryId|cardId, gone: false }`), so focus goes back to the tile exactly as it does today.

### S7 Back gesture (B1)
- System back / browser Back closes the sheet with the **same exit animation** as Close. The URL, the route and the page's scroll position stay as they were.
- Every other way of closing (Close, swipe, backdrop tap, Escape, a deck dialog link that navigates) must leave the history as if the dialog had never opened. One Back after closing goes to the previous **page**, not to an invisible "dialog open" step, and doesn't jump twice. The mechanism is the builder's choice (for example a history state pushed on open and consumed on close). The acceptance checks below test the behaviour.
- A deck dialog link (`/collection?q=…`, `/decks/:id`) lands on the target page. ~~One Back from there returns to the deck page with the sheet closed.~~ **Changed by RJ 2026-11-28: the dialog is part of the history stack.** One Back from the linked page returns to the deck page with the **same dialog open again** (same card, the deck dialog's current step, the page scroll underneath); the next Back closes it and stays on the page; Forward from it returns to the linked page. A reload on that entry reopens nothing; a card that has left the deck meanwhile opens nothing. Applies at every width that has the dialog (built in H-699).
- Applies on phones. Above 40rem: the builder decides whether Back also closes the centred dialog. If it does, the same history rules apply. Nothing visual changes there.

## Motion
All durations and curves come from the tokens in `styles.scss`.
| Moment | Motion |
|---|---|
| Open | Sheet `translateY(100%) → 0` over `--dur-med` with `--ease-enter`; backdrop fades in over the same time. **Turn off Material's default scale/fade on phones** (e.g. `enterAnimationDuration` / `exitAnimationDuration` = 0 plus our own transform, or a phone-only animation override) so only the slide runs. |
| Close (Close, Back, backdrop, Escape) | `0 → translateY(100%)` over `--dur-med` with `--ease-out`; backdrop fades out. The result is reported after the animation ends. |
| Drag | Follows the finger with no transition (S6). |
| Release, snap back | `translateY(dy) → 0` over `--dur-med` with `--ease-out`. |
| Release, close | From `dy` to `100%` over `--dur-fast` (it's already partly off screen), then the close path. |
| Head divider | Fades in over `--dur-fast`. |
| Reduced motion | The global block already sets transitions to their end state. Check that the sheet **appears and disappears with no slide** and that a release snaps back or closes **instantly**. Dragging still follows the finger (it's direct manipulation, not an animation). |

Only `transform` and `opacity` animate. Nothing animates `height` or `top`. Focus rings never animate.

## Accessibility
- **Role and name:** unchanged. A MatDialog with `aria-modal`, named by `ariaLabelledBy` (the title id).
- **Focus on open, phones:** move focus to the **sheet container** (`autoFocus: 'dialog'` in the phone branch of both `dialog.open` calls) instead of `.close-button`. A screen reader still announces the dialog name, and no focus ring shows after a tap (finding 6). Keyboard users get the ring on their first Tab. Desktop keeps `.close-button`.
- **Focus trap and return:** as today. Every close path (Close, swipe, Back, backdrop, Escape, and the deck dialog's "gone" close) returns focus to the tile, or follows the page's existing "gone" rule.
- **The swipe is never the only way to close:** Close (44 x 44, always visible), system Back, a tap on the dimmed strip, and Escape with a hardware keyboard all close the sheet. The handle is `aria-hidden` and not announced. Don't add a "swipe to close" hint.
- **Touch targets:** Close 44 x 44; every list row ≥ 44 px tall and full width; step bar buttons ≥ 44 x 96; the drag zone is the full head width and ≥ 60 px tall (handle row + title row).
- **Tab order:** Close → body links/buttons in reading order (including the deck dialog's Lock / Unlock control) → Previous → Next (deck). The step bar comes last in the DOM.
- **Contrast:** text tokens are unchanged (already AA). Handle 3.45:1 dark / 3.55:1 light (non-text, ≥ 3:1). Head divider and row hairlines are decorative.
- **Ownership** stays text (plus the chip icon where the chip is used). Never colour alone (OWN-033).
- **Reduced motion** as in Motion.
- **Notices** raised while the sheet is open still show above it at the top (SYNC-161). The sheet's top gap must not cover them (check the overlay order).

## Copy
No new strings. "Previous" and "Next" become visible labels in the deck step bar; the accessible names stay "Previous card" / "Next card". "Close" stays.

## Acceptance checklist (builder self-check, validator)
Check on the real `/collection` and `/decks/:id` pages (signed in, test data loaded) at **375 x 812** and **360 x 780**, dark and light. Also do one pass at **768** and **1440** to confirm nothing changed there.
1. Phones: both card dialogs open as a bottom sheet with 8 px rounded top corners, square bottom corners, and a dimmed strip of the page visible above it (status bar inset + 12 px).
2. A 36 x 4 px grab handle is centred 8 px from the sheet top, coloured `--color-border-strong`, and has `aria-hidden="true"`.
3. The head holds only the handle, the title and a 44 x 44 Close. No Previous or Next buttons in the head on phones, in either dialog.
4. Scroll the body to the bottom: the head doesn't move (its top = sheet top, measured ±1 px), the title never touches the screen edge, and a 1 px divider appears under the head. Scroll back to the top: the divider is gone.
5. With a simulated top inset (e.g. DevTools with a notch device, or `env()` overridden), the title row sits below the inset.
6. The last line of content clears the bottom inset by at least `--space-6` (Collection) or sits above the step bar (deck). Nothing hides behind the gesture bar.
7. Both dialogs on phones: section headings are 14 px / 600 / muted; every section after the lead starts with a hairline; the lead line is 16 px / 600; art width is `min(60vw, 15rem)` (225 px at 375, 216 px at 360).
8. Every list row in both dialogs is ≥ 44 px tall with hairlines between rows. Link rows aren't underlined and the whole row is tappable. The deck dialog's leave-the-dialog rows show a trailing chevron; Collection's printing rows don't.
9. Deck dialog on phones: a step bar fixed at the bottom with "Previous" / "Next" (names "Previous card" / "Next card"), each ≥ 44 x 96 px, disabled at the ends, padded for the bottom inset. Stepping scrolls the body to the top and doesn't move the sheet.
10. Open: the sheet slides up in `--dur-med` / `--ease-enter`, with no Material scale or fade on phones. Close by the button: it slides down in `--dur-med`.
11. Drag from the handle or title row: the sheet follows the finger and the backdrop fades. Release after a short drag (< 120 px, slow): it snaps back. Release past 120 px or after a quick flick: it closes. A drag in the body scrolls it; once the body is at its top, the rest of a downward drag moves the sheet (RJ 2026-11-28) with the same snap-back and close rules.
12. Android Chrome (or a Back press in DevTools mobile emulation) with a sheet open: the sheet closes, the URL is unchanged, and the page's scroll position is unchanged.
13. Open a sheet, close it with Close (also with the swipe, the backdrop and Escape), then press Back once: the browser goes to the previous page, with no "nothing happened" Back and no double jump.
14. Deck dialog: tap an "Other decks using this card" (or "Your printings") row. The target page opens; one Back returns to the original deck page with the same dialog open on the same card, the page scrolled as before; one more Back closes it and stays; Forward from the reopened dialog returns to the target page (RJ 2026-11-28).
15. After every close path in 10–13, focus is on the tile that opened the sheet (or the page's "gone" behaviour applies).
16. Opening by tap shows no focus ring on Close. Pressing Tab once puts a visible ring on Close. Tab order: Close → body controls → Previous → Next. A screen reader announces the card name as the dialog's name on open.
17. Reduced motion: no slide on open or close; a release snaps back or closes instantly; dragging still follows the finger.
18. The body's `overscroll-behavior` is `contain`: scrolling past the end doesn't move the page behind it and doesn't trigger pull-to-refresh.
19. A notice raised while the sheet is open (e.g. sign-out, or the deck dialog's lock action) shows above the sheet.
20. 768 and 1440: both dialogs look and behave exactly as before this item (centred, size from the MatDialog config, Previous / Next in the head on desktop where they are today). Compare with screenshots taken before the change.
21. Lint, build and web tests green. The existing dialog specs still pass (result objects, focus return, `gone`, `[` / `]`).

## Notes for builder
- The styleguide previews open both dialogs with desktop sizes on every width. Give them the same phone branch as the pages (or a shared `cardDialogConfig(isPhone)` helper used by all four call sites), so reviewers can check the sheet on `/styleguide` without signing in.
- Prefer one shared piece for the sheet chrome (head with handle + title + Close, drag handling, history handling) used by both dialogs, over copying the logic twice. A directive or small shared component in `shared/` is fine. The existing `close()` / result contract of each dialog stays.
- Use the shared `PHONE` query in TS and `max-width: 40rem` in SCSS (SPEC-010 0.17.1). Remove the 39.99rem copies in `deck-card-dialog.ts` and `card-dialog.scss` while you're there.
- Landscape phones (wider than 40rem, short) keep the centred dialog with `maxHeight: min(90svh, 52rem)`. Not in scope.
