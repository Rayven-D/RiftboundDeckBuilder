---
tags: [ui, review, decks]
status: done
date: 2026-11-25
owner: ui-engineer
reviews: H-060, H-254
item: H-255
brief: "[[Decks]]"
components: "[[Decks Components]]"
fixes: H-460, H-461, H-462, H-463, H-464, H-465, H-466, H-467, H-468
---
# Decks review: H-255 (built `/decks` and `/decks/:id`)

## Summary
- **Verdict: close, not ready to call done.** Both pages match the [[Decks]] brief and RJ's H-260 / H-382 answers
  well: Legend art filled by the deck, the % on the tile and in the header only, the separate lock badge, the
  one-link tile, the panel with Card / Missing tabs from 64rem with the first card selected, the phone dialog with
  Previous / Next, the sticky section bar, Card view / List view, Rename on locked decks, Delete + Undo, the Lock in
  flow and every snack bar word for word. Contrast passes everywhere I measured, in both themes.
- **2 blocking** (H-460, H-461): the deck tile's keyboard focus ring is clipped to nothing (WCAG 2.4.7), and two
  phone targets are under 44px (house rule A13).
- **7 should-fix**, filed as H-462 to H-467: focus lost after Rename / Delete / Undo, the 1440 toolbar no longer
  fits one row once a filter is on (RJ's H-382 (1)), headings show through the translucent section bar, the
  Filters menu's two "Any" items have no group, the tile % is missing from the link's description, a plural copy
  bug ("1 of 1 cards"), and the not-found page's old back link.
- **Nice to have**, one bundle: H-468.
- **H-392's six questions:** my findings bear on (1), (4), (5), (6); recommendations below. Nothing re-asked.
- Not reachable in this session (no data for them): ownership unavailable, card data not loaded, locks
  unreadable, read-only deck, locked-and-short deck, ban flags, tournament decks. Their unit tests exist
  ([[Validation H-060]], [[Validation H-254]]); the styleguide entries for them are H-391.

## How I checked
- **App:** the dev build on `http://localhost:4208` (worktree `loop/H-255-decks-review` = `dev` @ `51fdde4`).
  The sign-in gate needs a session, so I started the Auth and Firestore emulators (ports 9099 / 8080), signed in by
  email link as a throwaway emulator user, and loaded **Test data → Large** on Collection (3 decks: Generated Open,
  Generated Locked A / B). I also imported one deck without a Legend through the Import deck FAB ("Imported deck
  Nov 25, 2026", a complete unlocked deck), and renamed Generated Open with a long description. I stopped the
  emulators afterwards; the app and the `/api` server belong to another session and were left running.
- **Widths / themes:** 1440, 1024, 768 and 390; light and dark (`prefers-color-scheme`), plus reduced motion.
- **Keyboard:** Tab order from the DOM and real Tab / Arrow / Enter / Escape presses on the toolbar, tiles,
  section grids, panel tabs and dialogs; focus after each dialog and after Delete / Undo.
- **Measured in the browser:** computed colors (contrast table below), target sizes, the console, timing of search.
- **Skills:** `design:design-critique` and `design:accessibility-review` (WCAG 2.1 AA).
- The sample art is the fixture SVGs on generated names, so the printed name on the art ("Varrow, Ember Warden")
  doesn't match the tile name ("Gilded Gambit 37"). That's the test data, not a bug.

**Screenshots** (in `.playwright-mcp/`, untracked, as in [[Collection Review H-086]]):
`h255-decks-1440-light.png`, `h255-decks-1440-light-tilefocus.png`, `h255-tilefocus-zoom-light.png`,
`h255-decks-1440-dark-filters.png`, `h255-decks-1440-dark-toolbar-wrap.png`, `h255-decks-1440-dark-filtersmenu.png`,
`h255-decks-1440-dark-nomatch.png`, `h255-decks-1440-dark-readyhint.png`, `h255-deleted-1440-dark.png`,
`h255-decks-1024-light.png`, `h255-decks-768-light.png`, `h255-decks-390-dark-b.png`, `h255-decks-390-dark-bottom.png`,
`h255-decks-390-dark-filtered.png`, `h255-filters-dialog-390-dark.png`, `h255-filters-radios-390-dark.png`,
`h255-detail-1440-light.png`, `h255-detail-1440-dark.png`, `h255-detail-1440-dark-full.png`,
`h255-detail-1440-dark-focus.png`, `h255-detail-1440-dark-missing.png`, `h255-detail-1440-dark-list.png`,
`h255-detail-1440-dark-battlefields.png`, `h255-detail-1440-dark-more.png`, `h255-rename-1440-dark.png`,
`h255-rulecheck-1440-dark.png`, `h255-detail-nolegend-1440-light.png`, `h255-detail-768-light.png`,
`h255-detail-390-dark.png`, `h255-detail-390-dark-scrolled.png`, `h255-card-dialog-390-dark.png`,
`h255-detail-locked-390-light-b.png`, `h255-lockin-dialog-390-light.png`, `h255-notfound-1440-light.png`.

## What works (keep it)
- **Deck tile:** Legend art filled left to right by the deck (Generated Open 83% shows the dark right strip), the
  % under the art, name as the link's name (`aria-labelledby`), details as its description, chip for the
  ownership group and the separate `Locked` badge with no date (RJ H-382 (2)), legality with icon, Updated date.
  No Legend → the deck mark in the same box. 3 / 2 / 2 / 1 columns at 1440 / 1024 / 768 / 390, no sideways scroll.
- **Toolbar:** search, ownership radiogroup with counts (`"Ready to build, 1 deck"`), Lock, Filters with an
  `"Filters, 1 on"` name and a badge, Sort; active filter chips with `"Remove filter: …"`; count line
  `role="status"` ("Showing 0 of 3 decks"); the "Locked decks are under Locked. / Show locked decks" hint;
  No-match empty state. Search answers in 192ms (150ms debounce), with no view transition. The URL round-trips
  `q`, `own`, `lock`, `legality`, `source`, `sort`.
- **Phone list:** search + Filters icon (with badge) + Sort icon; the full-screen Filters dialog has proper
  fieldset groups, 44px rows and a live "Show 2 decks"; applying returns focus to Filters. The FAB shrinks to its
  icon while scrolling and docks above the footer.
- **Import (L12):** after saving, the dialog closes, the new deck is first, the snack says "Deck saved." with
  **View deck**, focus returns to the Import deck FAB.
- **Deck detail header:** back link, H1, description clamped to 3 lines with Show more, source line, legality +
  Rule check (dialog closes on Escape and gives focus back to Rule check), "55 of 66 copies available · 83%" with
  the % `aria-hidden` and ", 83 percent" for screen readers, "28 of 31 cards fully available", Lock in disabled
  with `aria-disabled`, still focusable and described by the reason line.
- **Lock flow:** confirmation copy word for word incl. "2 other decks use some of these cards: …", focus starts on
  Lock in, snack "… is locked in.", focus moves to Unlock; Unlock is immediate with the long snack and focus moves to
  Lock in. The badge reads "Locked · Locked in on Nov 20, 2026".
- **Sections and tiles:** six sections in Riot order with "· 39 cards · 38 available", "No cards in this zone" for
  empty ones, landscape battlefields letterboxed (not cropped), runes with partial fill and divider, split label in
  the name ("2 of 2 available · 3 of 3 in this deck"), `×N` only from 2. One Tab stop per grid; arrows move;
  focus ring visible (2px teal, 4px offset) on card tiles in both themes.
- **Panel (≥ 64rem):** Card / Missing tabs (`tablist "Deck panel"`), Legend selected on load (`aria-current`),
  Enter on a tile updates the Card tab and switches back to it from Missing; Missing tab lists by zone and has no %.
- **Phone detail:** Lock in full width + More, missing panel above the sections with Copy, card dialog full screen
  with Previous / Next / Close (44×44), Escape returns focus to the tile last shown (scrolled into view). Section
  bar links and the view toggle are 44px.
- **More menu:** Copy deck list, Download .txt, Duplicate, Rename, divider, Delete (danger). Delete asks
  "Delete 'Generated Open'?" with focus on **Cancel**, goes to `/decks` with "Deck deleted." + **Undo**; Undo
  restores the deck. Rename on a deck saves "Changes saved." for a description-only change.
- **Reduced motion:** tile transitions are 1e-5 s, hover has no lift, `scroll-behavior: auto`.
- **Console:** 0 errors across the session; one dev warning (NG0956, in H-468).

## Contrast (measured from computed styles)
| Element | Foreground | Background | Ratio | Need | Pass |
|---|---|---|---|---|---|
| Ownership radio selected, light / dark | `#FFFFFF` / `#042F2E` | `#0F766E` / `#14B8A6` | 5.47 / 5.81 | 4.5 | yes |
| Ownership radio edge (unselected), light / dark | `#7F8994` / `#727D89` | `#F4F6F8` / `#1B1F25` | 3.28 / 3.95 | 3 | yes |
| Radio count, light | `#56606B` | `#FFFFFF` | 6.40 | 4.5 | yes |
| Tile chip "Ready to build", light | `#FFFFFF` | `#0F766E` | 5.47 | 4.5 | yes |
| Tile chip "Partly available" text / edge, light | `#1A1F24` / `#0F766E` | `#E9EDF1` / `#FFFFFF` | 14.11 / 5.47 | 4.5 / 3 | yes |
| Tile badge "Locked" text / edge, light | `#1A1F24` / `#7F8994` | `#E9EDF1` / `#FFFFFF` | 14.11 / 3.55 | 4.5 / 3 | yes |
| Tile source, Updated, light / dark | `#56606B` / `#9AA3AD` | `#FFFFFF` / `#242A31` | 6.40 / 5.66 | 4.5 | yes |
| Tile % (20px 700), light / dark | `#1A1F24` / `#E6E8EB` | `#FFFFFF` / `#242A31` | 16.60 / 11.79 | 3 | yes |
| Count line, Lock / Sort labels, dark | `#9AA3AD` | `#1B1F24` | 6.48 | 4.5 | yes |
| Clear filters, Rule check, dark | `#2DD4BF` | `#1B1F24` | 8.90 | 4.5 | yes |
| Rule check, light | `#0F766E` | `#F4F6F8` | 5.05 | 4.5 | yes |
| Header source / reason line / section count, light | `#56606B` | `#F4F6F8` | 5.91 | 4.5 | yes |
| Same, dark | `#9AA3AD` | `#1B1F24` | 6.48 | 4.5 | yes |
| Card chip "1 of 1 available", dark | `#042F2E` | `#14B8A6` | 5.81 | 4.5 | yes |
| Card chip "2 of 3 available" (partial), light | `#1A1F24` | `#E9EDF1` | 14.11 | 4.5 | yes |
| Shared line "Also in …", light / dark | `#56606B` / `#9AA3AD` | page | 5.91 / 6.48 | 4.5 | yes |
| Panel tab "Missing" (unselected), light / dark | `#56606B` / `#9AA3AD` | `#FFFFFF` / `#242A31` | 6.40 / 5.66 | 4.5 | yes |
| View toggle selected, light / dark | `#FFFFFF` / `#042F2E` | `#0F766E` / `#14B8A6` | 5.47 / 5.81 | 4.5 | yes |
| Section bar current link, dark | `#2DD4BF` | `#1B1F25` | 8.89 | 4.5 | yes |
| Darkened-art frame outline, light | `#7F8994` (0.8px) | `#FFFFFF` | 3.55 | 3 | yes |
| Disabled Lock in label, light / dark | `#8F9393` / `#73797A` | `#D9DCDD` / `#33373B` | 2.25 / 2.72 | exempt (inactive) | n/a |
| Native radios in the phone Filters dialog, unselected edge, dark | by eye only (native rendering) | `#2D343C` | looks < 3 | 3 | **check** (H-465) |

## Findings
Severity: **blocking** = fails WCAG 2.1 AA or a house rule the brief calls an acceptance point (A9 / A13);
**should** = a real usability, consistency or AA-adjacent problem; **nice** = polish.

### Blocking
| # | Finding | Evidence | Fix item |
|---|---|---|---|
| B1 | **Deck tile focus ring is clipped away.** Tabbing onto a tile shows only faint teal corners; the 2px ring around the link is invisible. Cause: each `li` has `content-visibility: auto` (`decks-page.scss:456`), which adds paint containment, and the link fills the `li`, so the ring drawn at `outline-offset` outside the link is cut off. Fails **2.4.7 Focus Visible** on the page's main control | `h255-decks-1440-light-tilefocus.png`, `h255-tilefocus-zoom-light.png` (1440 light; same mechanism in dark). Computed: `outline 1.6px solid #0F766E, offset 1.6px`, `li content-visibility: auto`, `li` rect = link rect | **H-460** |
| B2 | **Phone targets under 44px.** At 390: the active filter chips ("Remove filter: Locked") are **83×32**; the main half of the Copy missing list split button is **184×40** while its menu half is 44 tall, so the pair is uneven | DOM measure at 390 (`h255-decks-390-dark-filtered.png`, `h255-detail-390-dark-scrolled.png`); brief §12.6, A9 | **H-461** |

### Should fix
| # | Finding | Evidence | Fix item |
|---|---|---|---|
| S1 | **Focus is lost after dialogs and navigation from the More menu.** Rename → Save: focus lands on `<main>` (not the More actions button). Delete → `/decks`: focus is on `<body>`; the brief says the first tile (or the empty state's Import deck). Undo in the snack: focus on `<body>`. Fails the spirit of **2.4.3 Focus Order** (keyboard users restart at the top) | 1440 dark, `document.activeElement` after each step | **H-462** |
| S2 | **The 1440 toolbar breaks RJ's one-row rule once anything is set.** With any Filters value (badge) or Lock "Not locked" / "Locked", Sort drops to a second row on the right and search stretches to 320px. Also: the two `mat-select` values are 16px while every other toolbar control is 14px; "Not locked" touches its arrow; the active filter chips' text is 16px | `h255-decks-1440-dark-toolbar-wrap.png` (`?lock=unlocked&legality=incomplete`), `h255-decks-1440-dark-filters.png`; computed `font-size` 16px vs 14px | **H-463** |
| S3 | **Section headings show through the sticky section bar.** The bar is `rgba(surface, .82)` with a 12px blur; the 22px Archivo section heading scrolling under it reads as a ghost behind "Legend  Champion" | `h255-detail-1440-dark-focus.png`, `h255-detail-1440-dark-missing.png` (top bar) | **H-464** |
| S4 | **Filters menu (desktop): no groups.** "Legality" and "Source" are `<p role="presentation">`, so a screen reader hears "Any" twice with no context. **1.3.1 / 4.1.2** | `decks-page.html:218`, `:239`; snapshot of the open menu | **H-465** |
| S5 | **The tile % isn't in the link's description.** The visible % is `aria-hidden` and its hidden text "83 percent of copies available" sits in `.art-col`, outside both `aria-labelledby` and `aria-describedby`, so a screen reader on the link never hears it | DOM of `a.deck-tile` (1440) | **H-465** |
| S6 | **Copy:** "1 of 1 cards fully available" (plural with 1) in the header and the Missing tab; "Missing · 0 copies" above "All cards available" (the 0 is noise) | `h255-detail-nolegend-1440-light.png`, `h255-detail-locked-390-light-b.png`; `detail-view.ts:110`, `deck-missing.ts:34` | **H-466** |
| S7 | **Deck-not-found uses the old placeholder header:** an underlined "← Decks" text arrow pressed against an H1 "Deck detail", unlike the populated page's icon back link. On a phone that link is a small text target | `h255-notfound-1440-light.png`; `deck-detail.html:40-43` | **H-467** |
| S8 | Header actions are three heights at desktop: Lock in 44px, Copy missing list and More 40px | DOM measure at 1440 | **H-467** |
| S9 | Native radios in the phone Filters dialog: in dark the unselected circle's edge looks faint against `#2D343C`. Couldn't measure native rendering; needs a check, and a styled edge with `--color-border-strong` if it's under 3:1 (**1.4.11**). The Load test data dialog uses the same radios | `h255-filters-radios-390-dark.png` | **H-465** |

### Nice to have (bundled in H-468)
1. Angular dev warning **NG0956** (track by identity re-creates a collection of size 1) on Deck detail.
2. The detail back link is a 1120px-wide hit strip at 1440 (the whole row is clickable); make it inline.
3. The sticky section bar runs 16px past the content edges on each side at 1440 (136–1288 vs 152–1272).
4. More menu icons sit a few px above the text's center (by eye, `h255-detail-1440-dark-more.png`).
5. Duplicate uses the `stacks` icon, which already means "Also in other decks" on card tiles.
6. Empty sections read "Legend · 0 cards · 0 available": drop "· 0 available" when the section has 0 cards.
7. The phone Filters dialog's Ownership options have no counts, unlike the desktop chips.
8. On phones the tile's ownership row lays out two ways (chip on its own line on unlocked decks; badge and copies
   line on one line on locked ones), so tiles don't share a rhythm. Put the copies line on its own line always.
9. The "Ready to build" no-match state could repeat **Show locked decks** inside the empty state, where the eye is.
10. At ≥ 64rem, choosing a card updates the panel silently; a polite status ("Showing Ashen Warden 1") would tell
    screen-reader users where the result went.

### Seen, no action
- Main Deck grid is 4 columns of 180px at 1440 (brief said 5 at ≈150px). Bigger art reads better; accept.
- The section bar keeps "Legend" current while Main Deck fills the view when the Legend / Champion sections are
  short; this follows the built landing-line rule (H-390) and is fine.
- Disabled Lock in measures 2.25 / 2.72:1; inactive controls are exempt, and the reason line carries the meaning.
- Import review step: after "Remove line" focus fell to `<body>`. That screen is H-341's; noted here only.

## H-392's six points (RJ deferred; not re-asked)
1. **Lock in block as wide as its reason line, gap before Copy missing list.** Seen at 1440 and 768
   (`h255-detail-1440-light.png`, `h255-detail-768-light.png`): a ~200px hole between the disabled Lock in and Copy.
   **Recommend:** put the reason line under the whole actions row (full width), so Lock in, Copy and More sit
   together; keep `aria-describedby`. Only on an incomplete deck, and it's RJ's call, so not filed. S8 (heights) is
   filed separately because it's wrong either way.
2. **Stronger border on the shared "none" chip.** Measured `--color-border-strong` edges at 3.28 (light) and 3.95
   (dark), which pass 1.4.11 where the old border failed (1.29). **Recommend: keep**; it also helps Collection.
3. **"Ownership unavailable" replaces the copies line.** Not reachable in this session. **Recommend: keep**; it
   matches the list tile (L6) and the brief's D10.
4. **Legend and Champion show no count in the section bar.** Fine when present. But in a deck without a Legend the
   empty "Legend" / "Champion" differ from full ones by color only (muted `#56606B` vs `#1A1F24`), while empty
   Battlefields say "0" (`h255-detail-nolegend-1440-light.png`). **Recommend:** no count when 1, "Legend 0" /
   "Champion 0" when empty (1.4.1, never color alone).
5. **Icon-only Card / List toggle on phones.** 44×44, `aria-label` "Card view" / "List view", `aria-pressed`, in a
   group "Show cards as"; grid and list icons are familiar. **Recommend: keep.**
6. **Not-found keeps the heading "Deck detail".** **Recommend:** drop the "Deck detail" H1 and make the empty
   state's "This deck isn't in your decks" the page's H1 (title "Deck not found · Rift Builder"), with the same
   back link as the populated header. The back-link part is objective and filed (H-467); the heading is RJ's.

**H-382 (Decks list), where relevant:** (1) one-row toolbar holds only with nothing set; filed as H-463.
(2) separate lock badge: built as answered and reads well. (3) Lock in / Unlock on Deck detail only: fine, the
tile is one link.

## Open choices for RJ
1. **H-392 (1) and (6)**: my recommendations above (reason line under the whole row; promote the not-found
   heading to H1).
2. **H-392 (4)**: show "Legend 0" / "Champion 0" only when empty.
3. **The tile % is the loudest text on the tile** (20px 700 vs the deck name's 16px 600). It answers "how close
   am I?" at a glance, which is what RJ asked for, but it pulls the eye from the name. Options: (a) keep; (b) 16px
   600, same as the name; (c) move it beside the copies line ("55 of 66 copies available · 83%", as in the header).
   **Recommend (b)**: still scannable, and the name leads.

## Board items filed (builder, `todo`, source `ui-engineer (H-255)`)
H-460 (blocking), H-461 (blocking), H-462 to H-467 (should), H-468 (nice). Each has its accept check on the
[[Handoff Board]]. Re-check after the fixes: B1 and B2 at 1440 and 390, both themes.
