---
tags: [ui, review, collection]
status: done
date: 2026-11-24
owner: ui-engineer
reviews: H-086
brief: "[[Collection]]"
components: "[[Collection Components]]"
fixes: H-095
---
# Collection review: H-086 (built page)

**Verdict (re-check, 2026-11-24): ready for RJ.** All nine H-095 fixes pass (see "Re-check" at the end). First-pass verdict, kept for history: close, but not ready for RJ yet. The page matches the brief well: image-only tiles,
the per-printing badge, the card-level lock band, the read-only dialog, search, sort, the sticky
toolbar and virtual scroll. Four blocking fixes come first, all small (H-095, fixes 1–4). The
polish fixes (5–9) can ride along or follow.

## How I checked
- **Setup:** branch `loop/H-086-collection-page` (uncommitted) in this checkout. Ran `services`
  `npm run dev` and `web` `npm start`, loaded the fixture sample and then 5,000 generated entries
  from `/styleguide`. I stopped both servers afterwards.
- **Widths and themes:** 1440, 1024, 768, 390 and 320, in dark and light, plus reduced motion.
- **Keyboard:** Tab order, arrow keys, Enter, Escape, `/`, `[` and `]`.
- **Measured in the browser:** computed colors, sizes, the console and the DOM row counts.
- **Skills:** `design:accessibility-review` (WCAG 2.1 AA) and `design:design-critique`.

**Screenshots** (in `.playwright-mcp/`, untracked):
- `h086-styleguide-1440-dark.png` (the browser was actually in light mode for this one)
- `h086-collection-1440-light.png`, `h086-collection-1440-dark.png`
- `h086-focus-1440-dark.png`
- `h086-dialog-1440-dark.png`, `h086-dialog-locked-1440-dark.png`, `h086-dialog-two-decks-1440-dark.png`
- `h086-search-empty-1440-dark.png`
- `h086-collection-1024-dark.png`, `h086-collection-768-dark.png`
- `h086-collection-390-dark.png`, `h086-collection-390-light-scrolled.png`
- `h086-collection-320-dark.png`
- `h086-dialog-390-light.png`

## What works (keep it)
- Every tile is full color, image only, and one per printing. The badge only shows from ×2 and reflects copies of that printing. Stand-in tiles have the dashed frame.
- The lock band is on every printing tile of a locked card, with card-level numbers. "2 of this card locked in Jinx Aggro" and "3 of this card locked in 2 decks" are word for word. The 2-line clamp holds at 390.
- Tile accessible names follow the Components §5 order exactly, e.g. "Ashfall Crossing, Printing no longer found: OGN-099, 1 copy, 2 of this card locked in Jinx Aggro, ban status unknown". The list has `aria-setsize` and `aria-posinset`.
- **Keyboard:** the grid is one Tab stop (search → sort → grid). Arrows move by tile and by row, and Enter opens the dialog. `]` steps to the next card, Escape closes, and focus returns to the tile you stepped to. `/` focuses search.
- **Dialog:** clicked printing first, "You own N across all printings" with switch buttons, card-level "Locked in" with "· short", and "Could fit in" with the existing ownership chip ("0 of 3 available", "3 of 3 available"). Runes show "Runes are assumed owned". The ban label sits under the art. On phones it's full screen.
- **Toolbar:** sticky under the header, with the border appearing once stuck. The search field and sort trigger are 40px on desktop and 44px on phones.
- **Columns and virtual scroll:** 7 / 6 / 4 / 2 columns. With 5,000 entries there are 8 rows (56 tiles) in the DOM and 6 after scrolling to the end. Images are requested only for rendered rows. A search over 5,000 entries returned within 0.4s, including the 150ms debounce.
- **States seen:** the ban notice (S9), Unresolved cards (S11), search with no results (S4) with focus going back to the search field after "Clear search", and the remembered query restored into the URL (COLL-060).

## Contrast (measured from computed styles)
| Element | Foreground / edge | Background | Ratio | Need | Pass |
|---|---|---|---|---|---|
| Search field edge, dark | `#727D89` | surface `#242A31` | 3.45 | 3:1 | yes |
| Search field edge, light | `#7F8994` | `#FFFFFF` | 3.55 | 3:1 | yes |
| Sort trigger and Export edge, dark | `#727D89` | bg `#1B1F24` | 3.95 | 3:1 | yes |
| Dashed frame, dark / light | `#727D89` / `#7F8994` | bg | 3.95 / 3.28 | 3:1 | yes |
| Badge text, dark | `#E6E8EB` | `#2D343C` | 10.26 | 4.5:1 | yes |
| Badge text, light | `#1A1F24` | `#E9EDF1` | 14.1 | 4.5:1 | yes |
| Lock band text | `#FFFFFF` | scrim 72% black over the lightest art (≈ `#474747`) | ≥ 9.1 | 4.5:1 | yes |
| Count line, notice, "Sort by", dark | `#9AA3AD` | bg | 6.48 | 4.5:1 | yes |
| Printing switch link, dark / light | `#2DD4BF` / `#0F766E` | surface / white | 7.78 / 5.47 | 4.5:1 | yes |
| "· short", dark | `#9AA3AD` | surface | 5.66 | 4.5:1 | yes |
| Dialog icon buttons, focus indicator | Material state layer (grey) | surface | ≈ 1.3, by eye | 3:1 (house rule: teal ring) | **no** (fix 6) |

## Findings → H-095 fixes
| # | Finding | Why it matters | Severity |
|---|---|---|---|
| 1 | **Every search or sort change runs a route view transition.** The URL is mirrored with `router.navigate(…, { replaceUrl: true })`, and `withViewTransitions()` cross-fades `<main>` on each one (2 transitions measured for 2 debounced searches). Under reduced motion the skip logs `AbortError: Transition was skipped` in the console, and the same happens when the remembered query is restored on entry. | `<main>` blinks while the user types, which breaks the brief's "results swap instantly; nothing moves unless the user moved it". It's also a console error, so A14 fails | **blocking** |
| 2 | **Landscape art is cropped.** Battlefield cards (fixture `OGN-011` etc., 670×480) are forced into 63:88 with `object-fit: cover`, which cuts the card's name and text ("ssing", "ueduct"). This happens in the tiles **and** in the dialog | Tiles are image only, so the art is the only way to recognize a card. A cropped battlefield can't be identified | **blocking** |
| 3 | **`<button class="button">` shows the browser's 2px white outset border.** Seen on "Clear search" in the search-empty state. The `.button` class was styled for links | A visible defect on a reachable state | **blocking** (small) |
| 4 | **Phone targets under 44px:** dialog Close is 40×40, the printing switch buttons are 32px tall, and notice Dismiss is 40×40 at 390 | Components §2/§6 and the brief's §11.5 ask for 44×44 on coarse pointers (A13) | **blocking** (A13) |
| 5 | **320px column rule:** see the verdict below. Keep 2 columns, but the lock band must stay legible at 138px | — | polish |
| 6 | Material icon buttons (dialog Close, Previous, Next, notice Dismiss) show Material's grey state layer on focus, not the app's 2px `--color-focus` ring | The focus indicator is faint (≈ 1.3:1 by eye) and inconsistent with every other control | polish (do it with fix 4) |
| 7 | "None of your **other** decks use this card." shows even when the card isn't locked in any deck. In that case there's no "other" | My own copy only fits when a Locked in section is shown | polish (copy) |
| 8 | The page width jumps by the scrollbar width (7px at 1440) when results go from many to none, so the header and content shift sideways | It looks unstable while searching | polish |
| 9 | Angular dev warning NG0913: the first tile image is the LCP element but is `loading="lazy"` | It slows the first paint of the page | polish |

## Builder's own choices: verdicts
The H-086 Result and [[API Contracts]] "Collection page" list these choices. I couldn't find a
numbered list of 11, so here are verdicts on the ones that affect design:
| Choice | Verdict |
|---|---|
| **320px wide: 2 columns at ~138px tiles** (`columnsFor`: at least 2 columns once the content is ≥ 288px) | **Keep 2 columns. The column rule wins over "tiles at least 144px".** At 320 a single column makes each card about 380px tall: one card per screen and ten times the scrolling, for a page whose job is scanning. 138px card art is still recognizable. My two rules conflicted (brief §11.7 says 2 columns down to 18rem = 288px; §11.5 says tiles ≥ 144px); the 144px figure was a desktop minimum, not an accessibility rule. I'm updating it to "≥ 136px on phones". Condition (fix 5): at 138px the lock band must still show the count and at least the start of the deck name within its 2 lines. Note that a desktop window at 320px with a 15px scrollbar has 273px of content and gets 1 column; that's fine |
| Catalog from `/api/sets` + `/api/cards`; production has no API, so it shows the S10 banner | Fine for H-086. **RJ should know:** deployed to production today, Collection shows "Card data couldn't load" until ADR-0004 decides how card data ships |
| Ban data seam returns null, so the S9 notice and "Ban status unknown" show everywhere | Correct, honest behavior per COLL-008. The notice is dismissible, which is fine |
| Stored sort uses the SPEC-007 `quantity` field for Copies, and the rest of a stored query is left untouched | No design effect. Fine |
| Notices use the `help` icon for all three | Fine. The brief said muted with `help` |
| Export is an outlined `.button` 44px tall on desktop, in the More menu on phones | Matches Components §8 |
| Search-empty state has no message line, only the heading and "Clear search" | Matches the spec |
| Dev-only sample loader on `/styleguide` uses `confirm()` | Fine for dev. It never ships in production builds, so keep it dev-only |

## Accessibility summary (WCAG 2.1 AA)
- **Perceivable:** text and control-edge contrast pass (table above). Status never uses color alone. The tile art is decorative inside a named button, and the dialog art has alt = card name. The landscape crop (fix 2) hides card identity visually.
- **Operable:** keyboard map complete. Focus is visible on tiles and fields, faint on Material icon buttons (fix 6). Phone targets need fix 4. Reduced motion is respected: tile transitions are 0, but see fix 1 for the console error.
- **Understandable:** copy matches the brief, except fix 7.
- **Robust:** the list and listitem roles hold through generic wrappers. The dialog is `role="dialog"` with `aria-labelledby`. Material leaves `aria-modal="false"` but hides the rest of the page from assistive tech; acceptable.

## After the fixes
Re-check fixes 1–4 at 1440 and 390, then the RJ review gate. I can re-run this review on request.

## Re-check after H-095 (2026-11-24)
Builder applied all 9 fixes on `loop/H-086-collection-page` (uncommitted). I re-ran `services`
(`npm run dev`) and `web` (`npm start`) with the fixture sample, at 1440 and 390, dark and light,
and with reduced motion on and off. I didn't run lint, build or tests; those run separately.
Both servers are stopped.

| # | Accept check | Result |
|---|---|---|
| 1 | Search and sort start no view transition; a tab change still does; console clean, including on entry with a remembered query | **pass.** I counted `document.startViewTransition` calls: 1 for the nav click into Collection, then 0 for 4 searches and a sort change. The URL updates in place (`?q=rune&sort=copies`). With reduced motion on: tab changes, entry with a remembered query, and searches give 0 console errors |
| 2 | Landscape battlefields show the whole card in tiles and the dialog | **pass.** `object-fit: contain` on `--color-surface-raised`; Ashfall Crossing and the other battlefields are fully visible with readable names, and portrait cards are unchanged |
| 3 | No browser border on `button.button` | **pass.** "Clear search": `border: none 0px`, weight 600 like the other buttons |
| 4 | Phone targets 44px at 390 | **pass.** Dialog Close 44×44; printing switch 44 tall; notice Dismiss, Sort, More and Clear search 44×44 |
| 5 | 2 columns down to 288px of content; the band keeps the count and deck name | **pass.** At 288px of content (a 320px phone; tested as a 335px viewport because the desktop browser shows a 15px scrollbar): 2 columns at 138px. "2 of this card locked in Jinx Aggro" and "4 of this card locked in 2 decks" fit in 2 lines with nothing cut off (scrollHeight = height) |
| 6 | Teal focus ring on icon buttons | **pass.** Sort (390) and dialog Close: `2px solid #2DD4BF` on `:focus-visible` |
| 7 | "None of your decks…" when the card isn't locked anywhere | **pass.** Stonehide Pup reads "None of your decks use this card."; Ashfall Crossing (locked) reads "None of your other decks use this card." |
| 8 | No sideways shift when results go to none | **pass.** H1 stays at x = 152.5 before and after searching "zzqq"; `scrollbar-gutter: stable` |
| 9 | No NG0913 | **pass.** No warnings at all in the console across the session |

**Small notes (no action needed):**
- With `scrollbar-gutter: stable`, a desktop browser narrowed below 40rem shows a strip of empty gutter beside the full-screen dialog. Phones use overlay scrollbars, so the strip doesn't appear there.
- `?sort=set` (not a valid value) correctly shows "1 filter value not found and was ignored".

**Re-check screenshots** (`.playwright-mcp/`):
- `h095-landscape-1440-dark.png`
- `h095-dialog-landscape-1440-dark.png`
- `h095-search-empty-1440-dark.png`
- `h095-dialog-390-light.png`
- `h095-320-equivalent-light.png`, `h095-320-equivalent-band-light.png`
- `h095-collection-390-dark-reduced.png`
