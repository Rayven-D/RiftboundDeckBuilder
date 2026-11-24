---
tags: [ui, brief, collection]
status: approved
date: 2026-11-24
revised: 2026-11-24 (RJ review: much simpler; then RJ: one tile per printing; approved with all open choices answered)
owner: ui-engineer
builds: H-086
specs: ["[[My Collection]]", "[[Collection Import]]", "[[Shared Cards and Lock-in]]", "[[Accounts and Sync]]"]
---
# Collection: design brief (revision 3, simplified, per printing)

> **Status: approved by RJ, 2026-11-24** (see "RJ's decisions" at the end). Revised after RJ's review on 2026-11-24. RJ's words: "the collections screen is
> just ALL cards available. and all in full color. However, if a card is in a locked deck it should
> at least say (X are locked in <deck name>). When you click on a card here it just pulls up a dialog
> with the card, how many you have and what deck(s) it's locked in and what decks it could fit in.
> And maybe explain certain effects (Ganking, Accelerate, etc.) Try to keep each card in the
> grid/list just the card image (with maybe a badge to show the total count in the collection
> regardless of locked status or not) (x4 example)".
>
> This revision is much smaller than SPEC-007 v0.7 ([[My Collection]]). §9 lists every spec
> requirement it no longer covers and where each one went. Those parts wait for `spec-writer` and RJ
> (H-091). `builder` builds H-086 from this brief now; the import-landing and missing-catalog parts wait on H-087, and the §9 parts on H-091.
>
> **Revision 3 (RJ, 2026-11-24):** **one tile per printing.** Each printing style is its own tile,
> as SPEC-007 already says (COLL-011/013/016; RJ's H-036 decision 3 stands). Locks stay per card
> name (§4).

> **Component spec:** [[Collection Components]] (tokens, sizes, states, accessible names, keyboard, motion and copy per component, for H-086). Its pixel and token values win over the sketches here (e.g. 7 columns at 1440).

## 1. Purpose
A wall of the cards you own, in full color. Each card shows its image and how many copies you
have. When copies are locked into a deck, the card says so. Clicking a card opens a dialog that
answers: how many do I have, where are they locked, which of my decks could use them, and what do
its keywords mean.

Direction A still applies ([[Design Direction]]): slate chrome, teal accent, Archivo headings. This
page is nearly all art, which suits "card art is the centrepiece".

### "ALL cards available" (decided by RJ, 2026-11-24)
**Every card the user owns**, each in full color. Not the catalog: there are no ×0 tiles. The catalog reading
(every card, unowned at ×0) was considered and rejected. The catalog reading would need its own
spec (unowned cards, how ×0 looks, and whether those cards are dimmed, which RJ's "all in full
color" argues against).

## 2. Principles
- **Tile = image.** No name, set, tags or status text under the art. The name is the image's alt
  text and the tile's accessible name.
- **Always full color.** Collection never uses the Decks dimming. Locked copies are shown with text
  and an icon, never with color or dimming.
- **One tile per printing** (RJ, 2026-11-24; SPEC-007 COLL-011): regular, foil, Showcase,
  overnumbered and signature are each their own tile. Unassigned copies ("Printing not specified")
  and missing printings are their own tiles too (COLL-012/014). Locks and shared copies are per card
  **name** (SPEC-008 SHARE-002), so the lock band speaks about the card, never about one printing
  (§4).
- **Quiet chrome.** One title, one short count line, a search field and a sort menu. Nothing else
  competes with the art.

## 3. Layout
Content uses the existing edges (`--content-max-width` 72rem, `--content-gutter`).
```
Desktop 1440 / 1024
Rift Builder   Decks  [Collection]  Tournaments                [Sign in] [⇧ Import]
──────────────────────────────────────────────────────────────────────────────────
Collection                                                    [⇩ Export CSV]
1,204 copies of 412 cards
┌ sticky toolbar ─────────────────────────────────────────────────────────────────┐
│ [⌕ Search by name ......................]                Sort [Set & number ▾]   │
└─────────────────────────────────────────────────────────────────────────────────┘
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│      │ │   ×4 │ │      │ │   ×2 │ │      │ │   ×3 │
│ art  │ │ art  │ │ art  │ │ art  │ │ art  │ │ art  │
│      │ │      │ │      │ │🔒2 of this card…  │ │🔒3 of this card…    │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
(one tile per printing: a regular and a Showcase of one card are two tiles; virtual-scrolled by rows)
                                                    Unresolved cards (only if any)
```
- **Grid:** `repeat(auto-fill, minmax(var(--tile-min), 1fr))` with `--tile-min: 9rem`, gap
  `--space-3`. That gives 6 columns at 1440, 5 at 1024, 4 at 768 and 2 at 390 (about 171px each).
- **Toolbar:** sticky under the header (`top: var(--header-height)`), the same translucent slate
  and blur as the header, with a bottom border once stuck. Search on the left, Sort on the right.
- **Tablet 40–64rem:** the same, with 4 columns.
- **Phone < 40rem:**
```
Rift Builder                       [Sign in]
Collection                              [⋯]
1,204 copies of 412 cards
┌ sticky ──────────────────────────────────┐
│ [⌕ Search by name ...........] [Sort ▾]  │
└──────────────────────────────────────────┘
┌────────┐ ┌────────┐
│     ×4 │ │        │   2 columns
│  art   │ │  art   │
│🔒2 of this card  │ │
│ locked in Jinx…  │ │
└────────┘ └────────┘
[ Decks | Collection | Tournaments | Import ]   existing tab bar
```
  Export CSV moves into ⋯ More. Sort is an icon button with the accessible name "Sort by" that
  opens a menu.

No List layout. With image-only tiles, a list would be the same thing in one column.

## 4. The tile (one per printing)
```
┌───────────────┐
│           ×3  │  count badge: copies of THIS printing
│               │
│     art       │  full color, 63:88, --radius-md
│               │
│🔒 2 of this   │  lock band: about the CARD NAME (all printings),
│ card locked in│  shown on every printing tile of that card
│ Jinx Aggro    │
└───────────────┘
```
- **One tile per entry** (COLL-001/011): one per owned printing, one per card for unassigned
  copies, and one per missing printing, in `printingSortKey` order (COLL-012/014/031).
- **Art:** `app-card-art` with `state="full"` and `fill=1`, always, using that printing's thumbnail.
  Unassigned and missing-printing tiles use the card's default printing image (COLL-012/014) and get
  a 1px dashed `--color-border-strong` outline around the art. That way the stand-in image is
  marked without adding text; the label is in the accessible name and the dialog. Lazy-loaded, the
  aspect ratio reserved by `--card-aspect-ratio`, and a missing or failed image shows the existing
  text placeholder with the card name (COLL-006). The image is decorative inside the button, which
  carries the name.
- **Count badge** `app-count-badge`: copies of **this printing** (the entry's count, locked
  copies included, since locks don't touch Collection counts, COLL-086), e.g. `×3`. Solid pill over
  the art: `--color-surface-raised` background, `--color-text`, 1px `--color-border-strong`,
  `--radius-sm`, `--font-size-xs` 700, `tabular-nums`, inset `--space-1`. Visible text is `×3`, and
  the accessible text is "3 copies". **At 1 copy: no badge** (COLL-016; decided by RJ).
  Per printing, most tiles will be single copies, and a `×1` on most of the grid would be noise.
  The card's total across printings is in the dialog.
- **Lock band: card-level, on every printing tile of that card.** The engine holds copies **per
  card name only**. `computeSharedPool()` gives each locked deck a `hold` per `cardKey` (`CardUse
  { deckName, need, locked, hold }`), and `availability()` works per `cardKey`. Nothing says
  *which printing* a locked deck holds, and SPEC-008 SHARE-002 / SPEC-007 COLL-086 define the pool
  per name. So the band never allocates locked copies to a printing. It appears on **every**
  printing tile of a card that has locked copies, worded so it clearly counts the card, not that
  tile:
  - **One deck:** "2 of this card locked in Jinx Aggro".
  - **Several decks:** "3 of this card locked in 2 decks" (the dialog lists every deck).
  - Numbers are the sum of `hold` over the card's locked uses.
  - Style: a strip across the bottom of the art, two lines at most, the deck name truncated with an
    ellipsis. Background `--lock-scrim` (`rgb(0 0 0 / 72%)`), text `#FFFFFF`, `--font-size-xs` 600,
    `lock` icon, `--space-1` / `--space-2` padding. White on the scrim stays at 9:1 or more over any
    art. In forced colors it's a `Canvas` / `CanvasText` band with a border.
  - Why not show it only on one printing: there's no data to pick one, and choosing the first
    printing would tell the user that the Showcase copy is in the deck when the engine never said
    so. Allocating locks to printings would be a SPEC-008 change, and nothing on this page needs
    it.
- **Hover** (fine pointer): `.lift` (2px rise, `--shadow-lift`, `--dur-fast`). **Focus:** 2px
  `--color-focus` ring with a 2px offset around the art.
- **Accessible name** of the tile button: "Kai'Sa, Survivor, OGN-007a Showcase, 3 copies, 2 of this
  card locked in Jinx Aggro". Use "Printing not specified" or "Printing no longer found: OGN-005"
  in place of the code for those entries. Several decks: "3 of this card locked in Jinx Aggro and
  Kennen Tempo". Add ", banned" when the card is banned.

## 5. The card dialog
A click, Enter or Space on a tile opens a `MatDialog` (`aria-labelledby` = card name) **for the
clicked printing**. The art and the first count are that printing's. Everything about decks is at
card-name level, because that's how the pool and locks work. Desktop and
tablet: centered, `min(56rem, 100vw − 2 × gutter)`, `--radius-lg`. Phone: full screen.
```
┌ Kai'Sa, Survivor                                          [✕] ┐
│ ┌──────────────┐   OGN-007a Showcase · 3 copies               │
│ │              │   You own 6 across all printings             │
│ │  large art   │   2 × OGN-007 · 3 × OGN-007a Showcase (this)  │
│ │ (this print) │   1 × Printing not specified                 │
│ │  (fullUrl)   │                                              │
│ │   20rem      │   Locked in                                  │
│ │              │   🔒 Jinx Aggro ............ 2 copies        │
│ └──────────────┘                                              │
│                    Could fit in                               │
│ ⛔ Banned since     Kennen Tempo        [◐ 1 of 3 available]  │
│    Nov 23, 2026     Draven Midrange     [✓ 2 of 2 available]  │
│                                                               │
│                    Keywords                                   │
│                    [Ganking]  <official short definition>     │
│                               Source: <name>, as of <date>    │
│                    [Accelerate] …                             │
└───────────────────────────────────────────────────────────────┘
Phone: art on top (max 60vw wide, centered), sections stacked below.
```
Sections, in order (empty sections are hidden, except where noted):
1. **Art:** the clicked printing's `art.fullUrl` (COLL-006; for unassigned and missing entries the
   default printing's, with the dashed frame), alt = card name, with the thumbnail shown until it loads at
   the same reserved size. The ban label sits under the art when the card is banned, upcoming or
   unknown (COLL-008/009): "Banned since Nov 23, 2026" / "Banned from Nov 23, 2026" / "Ban status
   unknown", as icon + text in `app-status-label`.
2. **This printing, then the card:** first line (Archivo, `--font-size-lg`): the printing and its
   count, "OGN-007a Showcase · 3 copies" (or "Printing not specified · 3 copies" / "Printing no
   longer found: OGN-005 · 1 copy"; COLL-004/012/014 labels verbatim; variant label when not
   base/unknown). Then "You own 6 across all printings" and one muted line per owned entry of the
   card in set order ("2 × OGN-007", "3 × OGN-007a Showcase", "1 × Printing not specified"), with
   the clicked one marked "(this one)" (visually hidden "current"). Each other line is a button that
   switches the dialog to that printing. The line is hidden when the card has only one entry. Copies excluded from decks by a tag (none can be created in
   this version, but synced or older data may have them) add "1 not counted in your decks"
   (COLL-083).
3. **Locked in** (card level; help text under the heading: "Locked decks count copies by card name,
   any printing."): one row per locked deck holding copies: `lock` icon, deck name (a link to
   `/decks/:id` once the Decks page exists), "2 copies" right-aligned. A locked deck that is short
   on this card adds "· short" (SHARE-033) as muted text. Hidden when nothing is locked.
4. **Could fit in** (decided by RJ): **your unlocked decks that include this
   card**. Each row shows the deck name and the existing **`app-ownership-chip`** with SPEC-008
   SHARE-040's label "`<a>` of `<q>` available". `q` = the deck's need for this card and `a` =
   `min(available(D, k), q)` from `availability()`, so it says whether your free copies would
   complete that deck's need. Rows that are fully available come first, then by deck name. If you
   have no unlocked deck that uses this card, the section reads "None of your decks use this card." (or, when the card is locked in a deck, "None of your other decks use this
   card.") and stays visible, so the question is answered. Runes are cards (COLL-089): they get
   Locked in and Could fit in like any card, with no rune-specific line.
5. **Keywords:** one row per keyword found on the card: a keyword chip (the term, `--radius-sm`,
   outlined with `--color-border-strong`), a short definition, and a muted source line "Source:
   `<source>`, as of `<date>`". **The definitions are game facts and must come from research, not
   from this brief.** Until the glossary exists (H-089 research, H-090 spec), hide the section.
   Never show a keyword without its definition and source. If a keyword has no definition yet,
   show only the chip with "No definition yet".
6. **Close:** ✕ in the header ("Close"), and Escape. Desktop only: "Previous card" / "Next card"
   buttons and the `[` / `]` keys step through the current results (tiles, so printings) without
   closing.

The dialog is **read only**. No steppers, tags or Remove (see §9).

## 6. States
| # | State | What shows | IDs |
|---|---|---|---|
| S1 | **Empty collection** | The current empty state, unchanged: deck mark, "Your collection is empty", "Import the cards you own and they will appear here.", "Import collection" → `/import?type=collection`. Lede "Every card you own." above. No toolbar | COLL-001 |
| S2 | **Loading** | H1, a count line of reserved height, toolbar disabled, 12 static skeleton tiles (art box in `--color-surface-raised`). Only after 200ms, so fast loads don't flash | COLL-066 |
| S3 | **Populated** | Grid in set → number order (COLL-031) | COLL-001/031 |
| S4 | **Search finds nothing** | "No cards match “zhonya”." with a "Clear search" button, in `app-empty-state` | COLL-047 |
| S5 | **Locked copies** | The lock band on the tile, and the "Locked in" section in the dialog | SHARE-033/040 |
| S6 | **No decks yet** | Dialog: Locked in hidden; Could fit in reads "None of your decks use this card." | — |
| S7 | **Locks unreadable** (SHARE-061) | No lock bands. Notice line: "Locked decks couldn't be read, so locked copies aren't shown." Counts still show | SHARE-061 |
| S8 | **Unreadable collection** | `role="alert"` banner: "Your collection couldn't be read. It may have been saved by a newer version of Rift Builder. Nothing was changed or deleted." with "Reload" | COLL-071, SYNC-033 |
| S9 | **Ban data didn't load** | Tiles unchanged. In the dialog: "Ban status unknown". Notice line: "The ban list couldn't load, so ban status is unknown." | COLL-008 |
| S10 | **Card data didn't load** (GAP, H-087) | Banner: "Card data couldn't load. Your cards are safe. Names and images will show once it loads." with "Try again" | — |
| S11 | **Unresolved cards** | After the grid: H2 "Unresolved cards" (verbatim) and "These cards aren't in the current card data. Import them again to match them.", as plain text rows (card key, ×N) | COLL-015 |
| S12 | **Import just happened** (GAP, H-087) | Proposed: land here with a snack bar "Added 42 copies of 30 cards." / "Collection replaced: 412 cards." and Undo | IMP-049…052 |
| S13 | **Another tab changed data** | Refresh in place, keep the scroll position, and keep an open dialog in sync (it closes with "This card is no longer in your collection." if the card is gone) | COLL-073 |
| S14 | **Very large collection** | Virtual scroll (§8) | COLL-065…067 |
| S15 | **URL notice** | "1 filter value not found and was ignored" (verbatim) if the URL has an unknown sort value | COLL-062 |

## 7. Interactions and keyboard
- **Search** (COLL-040): "Search by name", debounced 150ms, with a clear ✕. While a search is on,
  the count line reads "Showing 12 of 538" (tiles shown of all tiles, COLL-010). `/` focuses it and Escape clears it.
- **Sort** (COLL-031/032, cut down): "Set & number" (default), "Name", "Copies". Copies sorts
  most-first, with set & number as the tie-breaker (COLL-033). The direction is fixed per option,
  so there's no direction toggle.
- **URL / memory** (COLL-060…063): only `q` and `sort` go in the URL and memory. The default is a
  clean `/collection`.
- **Export CSV** (IMP-055): it exports the whole collection. Tooltip: "Exports your whole
  collection." Afterwards a snack bar "Exported 1,204 copies of 412 cards." shows, plus the spec
  notices verbatim ("`<n>` copies were saved without their printing.", "`<n>` cards not in the card
  data were left out.", "`<card>` may not import back as written.").
- **Keyboard:**

| Key | Where | Does |
|---|---|---|
| Tab | page | skip link → header → Export → search → sort → grid (one Tab stop) → Unresolved |
| Arrow keys, Home / End | grid | roving focus: ←→ by one, ↑↓ by a row |
| Enter / Space | tile | open the dialog |
| Escape | dialog / search | close (focus returns to the tile) / clear |
| `[` `]` | dialog, desktop | previous / next card |
| `/` | page | focus search |

## 8. Components, tokens, performance, motion
**Reuse:** `app-card-art` (full state only), `app-ownership-chip` (Could fit in rows), `app-empty-state`
+ `app-deck-mark`, `app-icon`, `MatDialog`, `MatSnackBar`, `mat-select` / `mat-menu`,
`formatIsoDate()`, `banStatus()`, `computeSharedPool()`, `availability()` and the `CardUse` list
(`pool.byCard[cardKey].uses`: `deckName`, `need`, `locked`, `hold`), all in `core/decks/`.
`@angular/cdk/scrolling` is already a dependency.

**New (show them on `/styleguide` first):** `app-collection-tile` (art, badge, lock band; states
default / hover / focus / locked / no image), `app-count-badge`, `app-status-label` (ban variants,
also replacing the `.ban` style in `app-card-tile`), `app-card-dialog`, `app-keyword-chip` (built
later, when the glossary exists).

**Tokens:** add `--color-border-strong` (dark `#727D89`: bg 3.95, surface 3.45, raised 3.00; light
`#7F8994`: white 3.55, bg 3.28, raised 3.02). `--color-border` is only 1.29:1 / 1.42:1 against
the surface, which fails WCAG 1.4.11 for control edges like the search field, the badge outline and
keyword chips. Also add `--tile-min: 9rem` and `--lock-scrim: rgb(0 0 0 / 72%)`. New icons: `search`,
`sort`, `lock`, `download`, `more_vert`, `schedule`, `help`, `close`, `chevron_left`.

**Performance:** `cdk-virtual-scroll-viewport` with `scrollWindow`. Virtualize **rows of tiles**:
work out the column count from the container width (ResizeObserver), chunk the cards into rows, and
use a fixed row height per breakpoint. Buffer 2 rows. Thumbnails are requested only for rendered
rows (COLL-067), and the grid never loads `fullUrl`. The target is 5,000 entries (tiles) with no frozen input
(AC 18).

**Motion** (existing tokens): tile `.lift` on hover (fine pointer). The dialog fades and scales
from 0.98 (`--dur-med`, `--ease-enter`), and on phones rises 24px. Results swap instantly. Nothing
plays on load. The global reduced-motion block stops all of it.

## 9. Spec requirements this design no longer covers
None of these are dropped silently. Each is either kept in a small form here or sent to
`spec-writer` / RJ in **H-091** (defer, move, or change the spec).

| Requirement | Level | In this design | Recommendation |
|---|---|---|---|
| COLL-011/013/016 per-printing entries, group-by-card view, badge per entry | MUST/SHOULD | **Kept** (RJ, rev 3): one tile per printing, badge per entry. The group-by-card *view* (COLL-013, SHOULD) isn't offered; the dialog lists the card's printings | Defer COLL-013 (SHOULD) |
| COLL-004 each entry shows name, ban, set, number, code, rarity, variant | MUST | **Moved** to the dialog. The tile shows the image only, and the name and ban are in its accessible name | Spec change: the entry *dialog* shows them |
| COLL-005 tags, category, domains, cost on the entry | SHOULD | Not shown | Defer |
| COLL-008/009 ban status per entry | MUST | In the dialog, and in the tile's accessible name ("banned") | Spec change (H-091): RJ decided ban status is dialog-only plus the accessible name; no grid icon |
| COLL-010 summary (cards, entries, copies, showing X of Y) | MUST | **Kept, shorter:** "1,204 copies of 412 cards" / "Showing 12 of 538". It earns its place as the only number on the page. The word "entries" isn't shown | Spec change: no entry count |
| COLL-019…030 tags (create, assign, rename, merge, delete, limits, bulk, manager, dormant) | MUST/SHOULD | **Not covered** | Defer to a later version. The stores and sync keep supporting tags |
| COLL-080…085 exclude-from-decks tags, confirmations, summary | MUST/SHOULD | Only displayed when data already has them ("1 not counted in your decks" in the dialog). No way to set them | Defer with tags. The engine keeps honoring the flag |
| COLL-032…037 sort by any attribute, direction, tie-breaker | MUST | **Kept, small:** Set & number, Name, Copies. Tie-breaker kept | Spec change: three sorts |
| COLL-035 Unknown sorts last | MUST | Applies to Name only (rarely null) | keep |
| COLL-040 name search | MUST | **Kept** | — |
| COLL-041…049 attribute, tag, ban, decks and quantity filters, chips, Clear all | MUST/SHOULD | **Not covered** (only search remains) | Defer. A later "Locked" or "Could fit" filter would be more useful than attribute filters |
| COLL-050…054 + / −, typed quantity, Remove card with Undo | MUST/SHOULD | **Not covered.** Counts change only through Import (Add / Replace / Undo) | Defer, or later put a stepper in the dialog. Note the COLL-088 shortfall confirmations go with it |
| COLL-055 Add a card manually | SHOULD | Not covered | Defer (also needs H-020) |
| COLL-058 / IMP-050a / SHARE-034 Undo-import confirmation and locked-deck warnings | MUST/SHOULD | Only where the import lands (S12, GAP H-087) | Keep, placement per H-087 |
| COLL-061 URL params | MUST | `q` and `sort` only | Spec change to match |
| COLL-064 saved views | MAY | Not covered | Defer |
| COLL-074 delete all local data | MUST | Not on this page | Already H-075 (settings) |
| IMP-055 CSV export | SHOULD | **Kept** (header button / More menu) | — |
| COLL-015 unresolved cards, COLL-065…068 performance, COLL-070…073 storage | MUST | **Kept** | — |
| **New, not in any spec:** lock band on tiles, dialog "Locked in" / "Could fit in", keyword explanations | — | This brief | Spec them in SPEC-007 (H-091). The keywords also need H-089 and H-090 |

## 10. Copy (American spelling; **bold = spec text, use verbatim**)
| Where | String |
|---|---|
| H1 / lede (empty only) | Collection / Every card you own. |
| Empty | Your collection is empty · Import the cards you own and they will appear here. · Import collection |
| Count line | `1,204 copies of 412 cards` (1 copy / 1 card) · `Showing 12 of 538` |
| Toolbar | Search by name · Clear search · Sort by · Set & number · Name · Copies |
| Search empty | No cards match “zhonya”. · Clear search |
| Badge (SR) | **4 copies** |
| Lock band | 2 of this card locked in Jinx Aggro · 3 of this card locked in 2 decks |
| Dialog | OGN-007a Showcase · 3 copies · You own 6 across all printings · (this one) · Locked decks count copies by card name, any printing. · 2 × OGN-007 · **Printing not specified** · **Printing no longer found: OGN-005** · 1 not counted in your decks · Locked in · 2 copies · short · Could fit in · **`<a>` of `<q>` available** · None of your decks use this card. / None of your other decks use this card. (only when Locked in shows) · Keywords · Source: `<source>`, as of `<date>` · No definition yet · Previous card · Next card · Close |
| Ban | **Banned since Nov 23, 2026** · **Banned from Nov 23, 2026** · **Ban status unknown** |
| Export | Export CSV · Exports your whole collection. · Exported 1,204 copies of 412 cards. · spec export notices verbatim |
| Notices / errors | **1 filter value not found and was ignored** · Locked decks couldn't be read, so locked copies aren't shown. · The ban list couldn't load, so ban status is unknown. · Your collection couldn't be read. … · Card data couldn't load. … · This card is no longer in your collection. |
| Unresolved | **Unresolved cards** · These cards aren't in the current card data. Import them again to match them. |

## 11. Accessibility requirements (WCAG 2.1 AA + the 44px rule)
1. The grid is `role="list"`. Each tile is a `listitem` holding one button with the §4 accessible
   name, plus `aria-setsize` / `aria-posinset`, because virtual scroll renders only some tiles.
2. The count line is `role="status"` and updates after the search debounce.
3. Locked state is text plus the `lock` icon. Ban is text plus an icon. Nothing relies on color.
4. Contrast: text tokens ≥ 4.5:1, the lock band ≥ 9:1, control edges ≥ 3:1 with
   `--color-border-strong`, and focus `--color-focus`.
5. Tiles are at least 144px wide on desktop and tablet; on phones 2 columns win down to 288px of content, so tiles may be as narrow as 136px (H-086 review). The dialog's close and nav buttons and the toolbar controls are
   ≥ 44×44 on coarse pointers.
6. The dialog traps focus, Escape closes it and focus returns to the tile. Keep the focused tile
   rendered while virtual scroll recycles rows.
7. At 320px and at 200% zoom: 2 columns (1 below 18rem), with no sideways scroll.
8. Reduced motion: no lift and no dialog movement.

## 12. Requirement map (what this build covers)
COLL-001 grid · COLL-006/067 art · COLL-008/009/017 dialog ban label · COLL-010 count line (short
form) · COLL-012/014 dialog printing lines · COLL-011 one tile per printing · COLL-015 Unresolved ·
COLL-016 badge (per printing) · COLL-031/033 order · COLL-040 search · COLL-060…063 `q` + `sort` ·
COLL-065…068 performance · COLL-070…073 storage states · COLL-083 display only · COLL-089 runes are
cards (listed, counted toward decks, Locked in and Could fit in like any card) · IMP-055 export ·
SHARE-033/040/061 lock band, Locked in, availability chip. Everything else is in §9.

## 13. Acceptance points
Checked at 1440, 1024, 768 and 390, dark and light, on the fixture and on a generated 5,000-entry
collection with two locked decks.
1. **A1** One tile per entry: each owned printing, each card's unassigned copies and each missing printing has its own tile, in `printingSortKey` order (COLL-011/012/014, SPEC-007 AC 1, 2, 3, 20). Tiles are image only (no visible text except the badge and the lock band). Every image is full color, and nothing is grayscale or dimmed. Unassigned and missing tiles have the dashed frame.
2. **A2** The badge shows the copies of that printing (locked included), e.g. a foil ×3 and its regular ×1 show `×3` and no badge (AC 20), read as "3 copies".
3. **A3** A card with copies held by one locked deck shows "2 of this card locked in Jinx Aggro" with a lock icon on **every** printing tile of that card, and the numbers are the card-level `hold` sum. Two or more decks: "3 of this card locked in 2 decks". No band when nothing is locked. No band is ever tied to a single printing. Band text is ≥ 4.5:1 over the lightest art in the fixture.
4. **A4** The tile button's accessible name includes the name, the printing (or its verbatim label), copies, the card-level lock text and "banned" when it applies.
5. **A5** The dialog opens on the clicked printing: its full art (alt = name) and "<printing> · N copies", then "You own N across all printings" with the other printings as buttons that switch the dialog, Locked in (deck + copies, card level), Could fit in (unlocked decks using the card, with "`a` of `q` available" chips matching `availability()`), and the ban label.
6. **A6** No decks: Could fit in shows "None of your decks use this card." (with a Locked in section: "None of your other decks use this card.") A rune card behaves the same (COLL-089).
7. **A7** The Keywords section stays hidden until the glossary exists. When shown, every definition has a source and an as-of date.
8. **A8** Search and the "Showing X of Y" line behave as in SPEC-007 AC 10. Sort has three options, and the URL holds only `q` and `sort`.
9. **A9** States S1–S15 render as specified (empty, loading after 200ms, unreadable stores, missing ban, missing catalog, unresolved).
10. **A10** Export CSV writes the whole collection and shows the spec notices (AC 24).
11. **A11** 5,000 entries: only rows near the viewport are in the DOM, images load only for them, and typing in search never freezes.
12. **A12** Keyboard: the grid is one Tab stop with arrow keys, Enter opens the dialog, Escape returns focus to the tile, and `/` focuses search.
13. **A13** Contrast and targets as in §11, measured in both themes. Reduced motion rests.
14. **A14** No console errors. Lint, build and tests pass. `/styleguide` shows the tile (plain, ×N, one-deck lock, many-deck lock, no image), the badge and the dialog.

## RJ's decisions (2026-11-24)
All open choices answered; the brief is approved.
1. **"ALL cards available"** = every card the user owns, in full color (not the catalog, no ×0 tiles).
2. **Tiles:** one per printing (SPEC-007 COLL-011; H-036 decision 3 stands).
3. **Badge at 1 copy:** no badge (`×N` only from 2 copies).
4. **"Could fit in":** your unlocked decks that use the card, each with the "a of q available" chip.
5. **Ban on the grid:** dialog only, plus the tile's accessible name; no grid icon.
6. **Where an import lands:** Collection, with an Undo snack bar (H-087 specs the details).
