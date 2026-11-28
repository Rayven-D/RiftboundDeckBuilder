---
tags: [ui, handoff, collection, components]
status: proposed
date: 2026-11-24
owner: ui-engineer
for: H-086
brief: "[[Collection]]"
---
# Collection components: handoff spec for `builder`

> This is the component-level spec for H-086. It's built from the approved brief [[Collection]]
> (rev 3 plus RJ's decisions) and adds nothing to the behavior. Where this note and the brief
> disagree on behavior, the brief wins; on a pixel or token value, this note wins. Show every
> piece on `/styleguide` with sample data before it goes on the page.
> Breakpoints match the app: **phone `< 40rem`**, **tablet `40–64rem`**, **desktop `≥ 64rem`**.

## 0. Tokens

### Existing tokens to reuse (`web/src/styles.scss`)
| Need | Token |
|---|---|
| Page / panel / raised surfaces | `--color-bg`, `--color-surface`, `--color-surface-raised` |
| Text | `--color-text`, `--color-text-muted` |
| Dividers (not control edges) | `--color-border` |
| Focus | `--color-focus` via the global `:focus-visible` (2px solid, 2px offset) |
| Ban / warning text | `--color-danger`, `--color-warning` |
| Spacing | `--space-1` 4px · `--space-2` 8px · `--space-3` 12px · `--space-4` 16px · `--space-5` 24px · `--space-6` 32px · `--space-7` 48px |
| Radius | `--radius-sm` 4px (badge, chips, inputs) · `--radius-md` 6px (art, buttons) · `--radius-lg` 8px (dialog, panels) |
| Type | `--font-display` (H1, dialog title), `--font-sans` body, `--font-size-xs` 12px · `-sm` 14px · `-md` 16px · `-lg` 20px · `-xl` 28px |
| Layout | `--content-max-width`, `--content-gutter`, `--header-height` (4rem, 3.5rem on phones), `--tabbar-height` 4rem |
| Motion | `--ease-out`, `--ease-enter`, `--dur-fast` 120ms, `--dur-med` 220ms, `--shadow-rest`, `--shadow-lift`, `.lift` |
| Card shape | `--card-aspect-ratio` 63 / 88, `.card-image` |

### New tokens (add to `:root` and the light block)
| Token | Dark | Light | Measured contrast | Use |
|---|---|---|---|---|
| `--color-border-strong` | `#727D89` | `#7F8994` | dark: bg 3.95, surface 3.45, raised 3.00 · light: white 3.55, bg 3.28, raised 3.02 | Every **control edge** on this page: search field, sort trigger, badge outline, dashed frame, keyword chips. `--color-border` is only 1.29:1 (dark) / 1.42:1 (light) on the surface and fails WCAG 1.4.11 for controls. Map Material's `--mat-sys-outline` to it on this page. |
| `--lock-scrim` | `rgb(0 0 0 / 72%)` | same | white text on it is ≥ 9.1:1 over **any** art (worst case, pure white art, gives `#474747`) | Lock band background |
| `--tile-min` | `9rem` (144px) | same | — | Grid column minimum. Exception (H-086 review): 2 columns are kept down to 288px of content, so phone tiles can be ~136–143px |

New icons for `app-icon` (Material Symbols, outlined 400, same pipeline as today): `search`, `close`,
`sort`, `lock`, `download`, `more_vert`, `schedule`, `help`, `chevron_left`, `chevron_right` (exists),
`warning` (exists), `block` (exists).

## 1. Count line (page header)
- **Where:** under the H1 "Collection", in place of the lede once there's data.
- **Element:** `<p class="count-line" role="status" aria-live="polite">`.
- **Type:** `--font-size-sm`, `--color-text-muted`, `tabular-nums`, margin-top `--space-1`.
- **Copy, word for word:**
  - Default: `1,204 copies of 412 cards` (singular: `1 copy of 1 card`, `2 copies of 1 card`). Numbers use `toLocaleString('en-US')`.
  - While a search is active: `Showing 12 of 538` (tiles shown of all tiles).
- It updates after the 150ms search debounce, never on every keystroke.

## 2. Toolbar (search + sort)
**Layout:** a sticky bar at `top: var(--header-height)`, `z-index` below the header. Background
is the same translucent slate and blur as the header (reuse its rule). Padding is `--space-2` on
top and bottom, and it sits on the content edges. A bottom border (`--color-border`) fades in
once the bar is stuck (`--dur-fast`, `--ease-out`). Use an IntersectionObserver sentinel, the
same trick as the header.

| | Desktop / tablet | Phone |
|---|---|---|
| Row | search (flex 1, max 28rem) on the left · Sort on the right | search (flex 1) · Sort icon button |
| Height of controls | 40px | 44px |

**Search field.** Use Material outlined `mat-form-field` with the subscript hidden, or the plain
`<input type="search">` styled like the Import dialog's text box.
- Role and name: `<input type="search">`, visible placeholder `Search by name`, plus `aria-label="Search by name"`.
- Leading `search` icon (decorative). Trailing clear button only while there's text: icon `close`, `aria-label="Clear search"`, 40×40 hit area (44×44 on phones).
- Border: 1px `--color-border-strong`, `--radius-sm`, background `--color-surface`, text `--font-size-md` (16px, so iOS doesn't zoom).
- **States:** default · hover (border `--color-text-muted`) · focus (global focus ring) · disabled (loading or unreadable store: 50% opacity, `disabled` attribute).
- **Keyboard:** `/` anywhere (when focus isn't in a text field) focuses it. Escape with text clears it; Escape when empty blurs. Typing filters after 150ms.

**Sort.**
- Desktop/tablet: `mat-select` with visible label `Sort by` (label left of the trigger, `--font-size-sm` muted). Trigger 40px tall, min-width 11rem, 1px `--color-border-strong`.
- Phone: an icon button (`sort`), `aria-label="Sort by"`, `aria-haspopup="menu"`, 44×44, opening a `mat-menu` of radio items (`role="menuitemradio"`, `aria-checked`).
- Options, word for word and in this order: `Set & number` (default) · `Name` · `Copies`.
- The URL holds `sort=name` / `sort=copies`. The default is omitted.

## 3. Count badge, `app-count-badge`
- **Input:** `count: number`. It renders **nothing when count < 2** (RJ decision 3).
- **Position:** absolute, top-right of the art, inset `--space-1` (4px). Above the art, below the focus ring.
- **Box:** height 20px (22px on phones), min-width 28px, padding 0 `--space-1`, `--radius-sm`, background `--color-surface-raised`, 1px solid `--color-border-strong`, `--shadow-rest`.
- **Text:** `×N` (U+00D7, no space), `--font-size-xs` (12px) weight 700, `--color-text`, `tabular-nums`, centered. Contrast: 10.26:1 dark, 14.1:1 light.
- **Accessibility:** the visible `×3` is `aria-hidden="true"`. When used alone, add a visually hidden `3 copies`. Inside the tile, the tile's accessible name already says "3 copies", so the badge is wholly `aria-hidden`.
- **States:** only one. No hover, and no motion when the count changes.
- **Forced colors:** border `CanvasText`, background `Canvas`.

## 4. Lock band, `app-lock-band`
- **Inputs:** `copies: number` (sum of `hold` over the card's locked uses), `decks: string[]` (the locked deck names holding ≥ 1 copy, in lock order). It renders nothing when `copies === 0`.
- **Position:** absolute, bottom of the art, full art width, inside the art's rounded clip (bottom corners `--radius-md`).
- **Box:** background `var(--lock-scrim)`, padding `--space-1` `--space-2`, `display: flex; gap: --space-1; align-items: flex-start`.
- **Text:** `#FFFFFF`, `--font-size-xs`, weight 600, line-height 1.3, **at most 2 lines** (`-webkit-line-clamp: 2`). The deck name is what gets cut, with an ellipsis. Icon `lock` 14px, white, decorative.
- **Copy, word for word:**
  - One deck: `2 of this card locked in Jinx Aggro`
  - Several decks: `3 of this card locked in 2 decks`
  - (copies is always ≥ 1; "1 of this card locked in Jinx Aggro".)
- **Accessibility:** `aria-hidden="true"` inside the tile, because the tile's accessible name carries the full text with every deck name (§5). Never color alone: it's text plus an icon.
- **Same band on every printing tile of the card.** It is never assigned to a printing: the engine holds copies per `cardKey` only.
- **Forced colors:** background `Canvas`, text `CanvasText`, top border 1px `CanvasText`.
- **States:** present / absent. No motion.

## 5. Collection tile, `app-collection-tile`
**Structure:**
```
<li role="listitem" aria-setsize=N aria-posinset=i>
  <button type="button" class="tile" [attr.aria-label]="name" tabindex=0|-1>
    <div class="frame">  ← app-card-art state="full" fill=1 decorative
      app-count-badge (top-right)
      app-lock-band (bottom)
    </div>
  </button>
</li>
```
- **Reuse:** `app-card-art` with `state="full"`, `[fill]="1"`, `decorative`, `imageUrl` = the thumbnail. **Never** `partial` or `none`. Missing image: its existing placeholder (the color is fixed by H-088).
- **Size:** fills its grid cell. The grid is `repeat(auto-fill, minmax(var(--tile-min), 1fr))`.
  | | Desktop 1440 | Desktop 1024 | Tablet 768 | Phone 390 |
  |---|---|---|---|---|
  | Columns (content width) | 7 (1152px) | 6 (992px) | 4 (736px) | 2 (358px) |
  | Column gap / row gap | `--space-4` / `--space-4` | `--space-4` / `--space-4` | `--space-3` / `--space-3` | `--space-3` / `--space-3` |
  | Tile width | ~151px | ~152px | ~175px | ~173px |
  The art height follows `--card-aspect-ratio` (63/88), so each row's height = tile width × 88/63 + gap. Measure it once per resize for the virtual scroll.
- **Button reset:** no background, border or padding, `display:block; width:100%`, `border-radius: var(--radius-md)`, `cursor: pointer`.
- **Variants:**
  | Variant | Art | Extra |
  |---|---|---|
  | `printing` | that printing's thumbnail | — |
  | `unassigned` | the card's default printing thumbnail | **dashed frame**: `outline: 1px dashed var(--color-border-strong); outline-offset: 2px` on `.frame` (doesn't change the size) |
  | `missing` | the card's default printing thumbnail | the same dashed frame |
- **States:**
  | State | Visual | Tokens |
  |---|---|---|
  | default | art at rest | `--shadow-rest` |
  | hover (fine pointer only) | `.lift`: rises 2px, `--shadow-lift` | `--dur-med`, `--ease-out` |
  | active | press `translateY(1px) scale(.98)`, 90ms (same as buttons) | — |
  | focus-visible | global ring on the button: 2px `--color-focus`, 2px offset, following `--radius-md`. For dashed-frame variants, the ring sits outside the dashed outline (outline-offset 4px on the button) | never animated |
  | loading image | the `.card-image` box keeps the 63:88 space, background `--color-surface-raised` | — |
  | image failed / null | `app-card-art` text placeholder with the name | — |
- **Accessible name** (`aria-label` on the button), built in this order and joined with ", ":
  1. card name: `Kai'Sa, Survivor`
  2. printing: `OGN-007a Showcase` (code + variant label when not base/unknown) · or `Printing not specified` · or `Printing no longer found: OGN-005` / `Printing no longer found (id <printingId>)`
  3. copies: `1 copy` / `3 copies` (always, even at 1, since there's no badge then)
  4. locks, if any: `2 of this card locked in Jinx Aggro` · several decks: `3 of this card locked in Jinx Aggro and Kennen Tempo` (three or more: `A, B and C`)
  5. ban, only when `banned`: `banned` (SPEC-007 0.18.1 COLL-101 (e); "banned from" and "ban status unknown" are dialog-only)
  Example: "Kai'Sa, Survivor, OGN-007a Showcase, 3 copies, 2 of this card locked in Jinx Aggro, banned".
- **Grid keyboard (roving tabindex):** the grid is one Tab stop, and the last focused tile (or the first one) has `tabindex=0`. ← → move by one, ↑ ↓ by one row (the current column count), Home / End go to the row's first / last tile, Ctrl+Home / Ctrl+End to the first / last tile overall. Enter / Space opens the dialog. When virtual scroll would recycle the focused tile's row, keep that row rendered (or `scrollIntoView({block:'nearest'})` before moving focus).
- **Container:** `<ul role="list" aria-label="Your cards" aria-describedby="count-line">` (reset the list style).

## 6. Card dialog, `app-card-dialog`
**Shell:** `MatDialog`, `role="dialog"`, `aria-labelledby` = the title id, `autoFocus` on the
close button, `restoreFocus: true` (back to the tile).
| | Desktop ≥ 64rem | Tablet | Phone < 40rem |
|---|---|---|---|
| Size | width `min(56rem, 100vw − 2 × --content-gutter)`, max-height `min(90svh, 52rem)`, body scrolls | same, width `min(40rem, …)` | full screen (`100vw × 100svh`, no radius), padding-bottom `env(safe-area-inset-bottom)` |
| Layout | 2 columns: art 20rem · info flex 1, gap `--space-6` | 2 columns: art 14rem · info | 1 column: art centered, `width: min(60vw, 16rem)`, then info |
| Radius | `--radius-lg` | `--radius-lg` | 0 |
| Padding | `--space-6` | `--space-5` | `--space-4` |

**Header row** (sticky at the top of the dialog body on phones): the title
`<h2 id="…">Kai'Sa, Survivor</h2>` (`--font-display`, `--font-size-lg` on phones, `--font-size-xl`
on desktop). On the right: desktop has `Previous card` / `Next card` icon buttons (`chevron_left`
/ `chevron_right`, `aria-label` with those exact words, 40×40, disabled at the ends), then
`Close` (`close` icon, `aria-label="Close"`, 40×40 desktop / 44×44 phone).

**Art column:** `app-card-art` `state="full"` `fill=1`, **not** decorative (alt = card name),
`imageUrl` = `fullUrl`. The thumbnail shows first at the same size and swaps when the full image
loads, with no layout shift. Unassigned and missing entries show the default printing with the
dashed frame. **Ban label** under the art, margin-top `--space-3` (see §7).

**Info column** (sections are separated by `--space-5`; each section heading is `<h3>` at
`--font-size-sm`, weight 600, `--color-text-muted`, margin-bottom `--space-2`):

1. **Printing line** (no heading): `<p class="printing">` at `--font-size-lg`, weight 600, `--color-text`.
   - Copy: `OGN-007a Showcase · 3 copies` · `OGN-007 · 1 copy` · `Printing not specified · 3 copies` · `Printing no longer found: OGN-005 · 1 copy`.
   - Excluded copies (old or synced data only): a second line `1 not counted in your decks`, `--font-size-sm` muted.
2. **All printings** (only when the card has ≥ 2 entries): heading `You own 6 across all printings`, then `<ul>` of rows in set order.
   - Each row reads `2 × OGN-007` / `3 × OGN-007a Showcase` / `1 × Printing not specified`.
   - The clicked one shows ` (this one)` and is plain text with `aria-current="true"`.
   - The others are `<button>`s styled as text links (`--color-accent-text`, underline on hover), min-height 32px on desktop / 44px on phones, with `aria-label` "Show OGN-007, 2 copies".
   - Activating one swaps the art, printing line and title focus in place (no animation), keeps the dialog open, and moves focus to the printing line (`tabindex=-1`).
3. **Locked in** (only when ≥ 1 locked deck holds copies): heading `Locked in`, help line `Decks lock copies by card name, any printing.` (`--font-size-xs` muted).
   - Rows: `lock` icon (14px, muted) · deck name (a link to `/decks/:id` when that route renders a deck, otherwise plain text) · right-aligned `2 copies`. When the deck is short on this card, append ` · short` (muted).
   - Rows are `--space-2` tall gaps with a 1px `--color-border` divider between them.
4. **Could fit in** (always shown, for every card, runes included, COLL-089): heading `Could fit in`.
   - Rows: deck name (link as above) · right-aligned existing **`app-ownership-chip`** with `[state]` and `[label]` from `tileOwnership(min(available, need), need)`. The label is `1 of 3 available` / `2 of 2 available`.
   - Order: fully available first, then by deck name.
   - Empty: `None of your decks use this card.`, or `None of your other decks use this card.` when the Locked in section shows (`--font-size-sm` muted; H-086 review).
   - Runes get sections 3 and 4 like any card (COLL-089, H-098); the dialog has no rune-specific line.
5. **Keywords:** **hidden** until H-089 / H-090 land. Reserve the component (`app-keyword-list`, rows of an outlined chip + definition + `Source: <source>, as of <date>`) but don't render it.

**Keyboard:** Tab cycles inside the dialog (focus trap). Escape closes it, and focus returns to
the tile. On desktop `[` / `]` = Previous / Next card through the current results; the grid
scrolls so the tile is in view, and focus returns to that tile on close.

**Motion:** open fades and scales from `.98` to `1` over `--dur-med` with `--ease-enter`. On phones
it rises 24px instead of scaling. Close fades out over `--dur-fast`. The backdrop is Material's
default. Under reduced motion it just appears (the global block covers this).

## 7. Status label, `app-status-label` (ban, in the dialog)
Extract the `.ban` style from `app-card-tile` into this component, and switch `app-card-tile` to it.
| Variant | Icon | Color | Copy, word for word |
|---|---|---|---|
| `banned` | `block` | `--color-danger` (6.51 dark surface / 7.07 light white) | `Banned since Nov 23, 2026` |
| `upcoming` | `schedule` | `--color-warning` (6.66 / 6.73) | `Banned from Nov 23, 2026` |
| `unknown` | `help` | `--color-text-muted` (5.66 / 6.40) | `Ban status unknown` |
Inline-flex with gap 2px, `--font-size-xs` 600, icon 14px, dates from `formatIsoDate()`. It's text,
so it needs no role. Not-banned shows nothing.

## 8. Page states
All use the existing **`app-empty-state`** (deck mark, h2, message, actions) or a banner. The banner
is a new small pattern; you can reuse the Import dialog's issue box style if it fits: 1px border in
the status color, `--radius-md`, `--space-3` padding, icon + text + action, `--color-surface`
background.

| State | Component | Role | Copy, word for word | Actions |
|---|---|---|---|---|
| Empty collection | `app-empty-state`, no toolbar | region (existing) | lede above: `Every card you own.` · heading `Your collection is empty` · message `Import the cards you own and they will appear here.` | link button `Import collection` → `/import?type=collection` |
| Loading (> 200ms) | count line placeholder (1em tall, 10rem wide, `--color-surface-raised`, `--radius-sm`), toolbar disabled, **12 skeleton tiles**: 63:88 boxes in `--color-surface-raised`, `--radius-md`, no shimmer | the grid gets `aria-busy="true"`, plus a visually hidden `Loading your collection…` | — | — |
| Search finds nothing | `app-empty-state` in place of the grid | region | heading `No cards match “zhonya”.` (curly quotes, the user's text) · no message | `.button` `Clear search` (focus goes to the search field) |
| Unreadable collection | banner, `--color-danger` | `role="alert"` | `Your collection couldn't be read. It may have been saved by a newer version of Rift Builder. Nothing was changed or deleted.` | `Reload` |
| Card data didn't load (COLL-090, as built; H-158) | banner, `--color-warning`, no grid | `role="alert"` | `Card data couldn't load. Your cards are safe. Names and images will show once it loads.` | `Try again` |
| Ban list didn't load | notice line under the count line, muted with the `help` icon | `role="status"` | `The ban list couldn't load, so ban status is unknown.` | dismiss ✕ `aria-label="Dismiss"` |
| Locks unreadable | notice line | `role="status"` | `Locked decks couldn't be read, so locked copies aren't shown.` | dismiss |
| Unknown URL value | notice line | `role="status"` | `1 filter value not found and was ignored` (verbatim, COLL-062) | dismiss |
| Card gone while its dialog is open | the dialog closes, then a snack bar | polite | `This card is no longer in your collection.` | — |
| Unresolved cards | section after the grid: `<h2>Unresolved cards</h2>` (`--font-size-lg`), text, then a `<ul>` of rows `<cardKey> · ×3` (`--font-size-sm`, `--font-mono` only for the key) | — | `These cards aren't in the current card data. Import them again to match them.` | — |
| Export done | `MatSnackBar`, 6s | polite | `Exported 1,204 copies of 412 cards.` plus, as separate snack bars or lines, the spec notices verbatim: `<n> copies were saved without their printing.` · `<n> cards not in the card data were left out.` · `<card> may not import back as written.` | — |

**Export button:** desktop/tablet, a `.button` (secondary, outlined) with the `download` icon and
the label `Export CSV`, at the right of the H1 row, with `title` set to `Exports your whole
collection.` On phones it's under ⋯ (`more_vert`, `aria-label="More"`), as the menu item
`Export CSV`. It's hidden in the empty state.

## 9. Motion summary (existing tokens only)
| Element | Trigger | Motion | Tokens |
|---|---|---|---|
| Tile | hover (fine pointer) | `.lift` rise 2px + `--shadow-lift` | `--dur-med`, `--ease-out` |
| Tile | press | `translateY(1px) scale(.98)` | 90ms (as buttons) |
| Toolbar border | stuck | fades in | `--dur-fast`, `--ease-out` |
| Dialog | open / close | fade + scale .98 (phone: rise 24px) / fade out | `--dur-med` `--ease-enter` / `--dur-fast` |
| Results, badge, band, printing switch | change | none, instant | — |
All of this goes through the global reduced-motion block. Nothing plays on load.

## 10. Reviewer checklist (adds to brief A1–A14)
- Control edges measure ≥ 3:1 (search field, sort trigger, badge outline, dashed frame) in both themes.
- The lock band is legible over the lightest fixture art, and its 2-line clamp holds at 390.
- No tile's art is ever `partial` / `none`, and there's no grayscale anywhere on the page.
- The tile accessible names match §5 exactly, in that order.
- The grid is one Tab stop. Arrows move focus, Enter opens the dialog, and Escape returns focus to the same tile.
- 44×44 targets on phones: clear search, sort, close, the printing switcher rows and More.
- `/styleguide` shows: the badge (×2, ×12, ×999), the band (one deck, long deck name, several decks), tiles (printing, unassigned, missing, no image, focused), the dialog (multi-printing, locked + short, no decks, a rune in a locked and an unlocked deck, shown like any card) and the status labels.
