---
tags: [ui, handoff, decks, components]
status: proposed
date: 2026-11-25
owner: ui-engineer
for: H-251 (builds H-060, H-254)
brief: "[[Decks]]"
---
# Decks components: handoff spec for `builder`

> The component-level spec for the Decks list (H-060) and Deck detail (H-254), from the brief
> [[Decks]]. It adds no behavior. Where the two disagree on behavior, the brief wins; on a pixel or
> token value, this note wins. Defaults assume RJ accepts the brief's recommended open choices;
> sections tied to a choice say which. Show every piece on `/styleguide` with sample data first.
> Breakpoints as in the app: **phone `max-width: 40rem`**, tablet 40–64rem, desktop ≥ 64rem.

## Summary
- **Reuse:** `app-card-art`, `app-count-badge`, `app-status-label`, `app-ownership-chip` (one
  token fix), `app-empty-state` + `app-deck-mark`, `app-page-fab`, `app-file-drop`,
  `app-sign-in-panel`, the Collection toolbar rule, notice line, banner, the `app-card-dialog` shell
  and `formatIsoDate()`.
- **New:** `app-deck-tile`, `app-deck-status-chip`, `app-deck-toolbar` (+ filter sheet on phones),
  `app-deck-header`, `app-lock-badge`, `app-lock-actions` (+ confirm dialog), `app-deck-section-nav`,
  `app-deck-section`, `app-deck-card-tile` (replaces `app-card-tile`), `app-deck-card-dialog`,
  `app-deck-summary` (summary + missing list + copy), `app-rule-check-dialog`,
  `app-shortfall-warning`.
- **Engine inputs only:** `DeckTileSummary`, `DeckOwnershipView`, `ZoneSection`, `OwnershipCard`,
  `MissingLine`, `LockCheck`, `CardUse`, `OwnedPrintingRow`, `CardBan`, plus `lockCheckMessage()`,
  `cardsShortText()`, `shortfallWarning()` / `shortfallNotice()` from `core/decks`.
- **Tokens:** no new color tokens. Two new layout tokens (`--deck-tile-min`, `--deck-aside`) and one
  motion value (`--dur-fill` 180ms).

## 0. Tokens
Reuse everything in [[Collection Components]] §0 (surfaces, text, `--color-border-strong`,
`--color-danger`, `--color-warning`, `--color-accent*`, spacing, radii, type, layout, motion,
`--tile-min` 9rem, `--card-aspect-ratio`).

**New (add to `:root`; same in light):**
| Token | Value | Use |
|---|---|---|
| `--deck-tile-min` | `22rem` | Deck list grid minimum: 3 columns at 1440, 2 at 1024 / 768, 1 on phones |
| `--deck-aside` | `20rem` | Deck detail aside width at ≥ 64rem |
| `--dur-fill` | `180ms` | Card fill change while the view is open (OWN-035 caps it at 200ms) |

**Token fixes (existing components):**
- `app-ownership-chip` `none` state: border `--color-border` → **`--color-border-strong`**
  (1.29:1 dark / 1.42:1 light fails WCAG 1.4.11; strong is ≥ 3.00:1 on every surface).
- Darkened art (`.dimmed` in `app-card-art`): keep `grayscale(1) brightness(.55)` (OWN-031) but give
  the none / partial art frame a 1px `--color-border-strong` outline, so a dark card keeps its edge on
  the dark page. Builder measures the printed name on the darkest fixture art in both themes; if
  it's illegible at 100%, propose a brightness for RJ (the token may be tuned, OWN-031).

**New icons** (Material Symbols outlined 400, same pipeline): `lock_open`, `filter_list`,
`open_in_new`, `arrow_back`, `edit`, `delete`. Existing ones used: `lock`, `warning`, `block`,
`schedule`, `help`, `check_circle`, `contrast`, `radio_button_unchecked`, `content_copy`, `stacks`,
`download`, `more_vert`, `search`, `sort`, `close`, `chevron_left/right`, `expand_more`, `upload`.

## 1. Deck list page shell (`pages/decks`)
Order in the DOM: page header (H1 "Decks", lede or count line) → `app-page-fab` (as built, OWN-094
(f)) → banners / notice lines → `app-deck-toolbar` → active filter chips → `<ul>` grid →
`app-file-drop` (as built).
- **Count line:** `<p class="count-line" role="status" aria-live="polite">`, `--font-size-sm`
  muted, tabular-nums. `3 decks` / `1 deck`; filtered: `Showing 2 of 3 decks`. Replaces "3 decks
  saved." (update the H-060 placeholder test).
- **Lede:** the brief's choice 26 wording; shown only on the empty state, as Collection does.
- **Grid:** `<ul role="list" aria-label="Your decks" aria-describedby="count-line">`, `display:
  grid; grid-template-columns: repeat(auto-fill, minmax(min(var(--deck-tile-min), 100%), 1fr));
  gap: var(--space-4)`. Each `<li>` gets `content-visibility: auto; contain-intrinsic-size: auto
  10rem`.
- **Data:** compute **one** `SharedPool`, then `computeDeckOwnership` + `summarizeDeck` for every
  deck before the first render (OWN-073, OWN-084). Recompute on every store change (OWN-070).
  Keep the scroll position on Back (restore it after render).

## 2. Deck tile, `app-deck-tile`
**Inputs:** `summary: DeckTileSummary`; `legend: OwnershipCard | null` (the Legend section's
first card); `banned: { count: number; upcoming: number; upcomingFrom: IsoDate | null } | null`
(null = ban data not loaded); `readOnly: boolean`. (If H-252 adds these to `DeckTileSummary`, take
them from there; brief §14.10.)

**Structure:**
```
<li>
  <a class="deck-tile lift" [routerLink]="['/decks', id]"
     [attr.aria-labelledby]="nameId" [attr.aria-describedby]="detailsId">
    <div class="art">app-card-art (decorative) | app-deck-mark</div>
    <div class="body">
      <h3 id=nameId class="name">Kennen Tempo <span class="tag">Read-only</span></h3>
      <div id=detailsId>
        <p class="source">…</p>
        <p class="ownership">app-deck-status-chip · <span>34 of 66 copies available</span></p>
        <p class="legality">icon + legalityLabel</p>
        <p class="bans">icon + 1 banned card</p>
        <p class="updated">Updated Nov 22, 2026</p>
      </div>
    </div>
  </a>
</li>
```
- **Box:** `display: grid; grid-template-columns: 6rem 1fr; gap: var(--space-4)`; padding
  `--space-4`; background `--color-surface`; 1px `--color-border`; `--radius-lg`; full height of the
  grid row. Phone: columns `4.5rem 1fr`, padding `--space-3`, gap `--space-3`.
- **Art:** `app-card-art` `[state]="legend.state" [fill]="legend.fill" [imageUrl]="legend.imageUrl"
  decorative`, top-aligned. No Legend (or catalog not loaded): `app-deck-mark` centered in a 63:88
  box with `--color-surface-raised` and `--radius-md`. Ownership unavailable: `state="full"`.
- **Text:**
  | Line | Style | Rule |
  |---|---|---|
  | name | `--font-size-md` 600, `--color-text`, 2-line clamp | `summary.name` |
  | Read-only tag | `--font-size-xs` muted, 1px `--color-border-strong`, `--radius-sm`, padding 0 `--space-1` | only `readOnly` |
  | source | `--font-size-xs` muted, 1 line, ellipsis (full text in `title`) | `summary.sourceLine` |
  | ownership | chip (§3) + `ownershipLine` `--font-size-sm` `--color-text`, tabular-nums; wraps under the chip when narrow; on phones (≤ 40rem) always its own line under the chip / lock badge, in every state (H-468 (8), H-478) | §3 |
  | legality | `--font-size-sm` muted; `illegal`: `block` 14px `--color-danger`; `incomplete`: `help` muted; `legal`: no icon | `legalityLabel` verbatim |
  | bans | `--font-size-sm`; `banned` count: `block` + text in `--color-danger`; upcoming: `schedule` + text in `--color-warning` | `1 banned card` / `3 banned cards` · `1 card banned from Dec 15, 2026` / `2 cards banned from Dec 15, 2026`; both lines when both; hidden when 0 or null |
  | updated | `--font-size-xs` muted | `Updated ${formatIsoDate(updatedAt)}` |
- **States:**
  | State | Visual |
  |---|---|
  | default | `--shadow-rest` |
  | hover (fine pointer) | `.lift`: rise 2px, `--shadow-lift`, border `--color-border-strong`, `--dur-med` `--ease-out` |
  | active | `translateY(1px) scale(.99)`, 90ms |
  | focus-visible | 2px `--color-focus` ring drawn **inside** the link (`outline-offset: -2px`, over the 1px border, following `--radius-lg`), because the grid `li`'s `content-visibility: auto` (OWN-084) clips anything outside it (H-460). Outer edge on the page, inner edge on the surface: 5.05 / 5.47 light, 8.90 / 7.78 dark |
- **Screen reader:** "Kennen Tempo, link" then the description: "1st, Regional Championship: Europe
  · Nov 6, 2026 – Nov 8, 2026. Partly available, 34 of 66 copies available. Not legal in Standard
  today. 1 banned card. Updated Nov 22, 2026." Icons are `aria-hidden`.

## 3. Deck status chip, `app-deck-status-chip`
**Inputs:** `filter: OwnershipFilter` (incl. `'unavailable'` after H-155), `lockBadge: string |
null`, `short: boolean`. It renders nothing for `unavailable` without a lock.

Same box as `app-ownership-chip` (inline-flex, gap `--space-1`, padding 1px `--space-2` 1px
`--space-1`, `--radius-sm`, `--font-size-xs` 600, icon 14px).
| Case | Icon | Text | Colors |
|---|---|---|---|
| `ready` | `check_circle` | Ready to build | fill `--color-accent`, text `--color-accent-contrast` (5.81 dark / 5.47 light) |
| `partial`, unlocked | `contrast` | Partly available | border `--color-accent`, bg `--color-surface-raised`, icon accent, text `--color-text` |
| `none`, unlocked | `radio_button_unchecked` | None available | border `--color-border-strong`, bg raised, icon muted |
| locked, not short | `lock` | `lockBadge` ("Locked") | border `--color-border-strong`, bg raised, text `--color-text` |
| ~~locked, short~~ | | | **removed in v0.6 (H-664)**: a locked deck is never short; `lockBadge` is "Locked" or null |
| `unavailable`, locked | `lock` | Locked | as locked |
Forced colors: border `CanvasText`. Never color alone: always icon + text.

> **RJ 2026-11-25 (H-382 (2), built in the H-060 follow-up):** on the deck tile the lock is a
> **separate badge next to the chip**: `app-lock-badge` (§6) with `label` = `lockBadge` and no date
> (the "Locked in on <date>" stays in the Deck detail header, SHARE-041), sized like the chip
> (`--font-size-xs`, icon 14px). The tile binds the chip with `filter` only, so the chip shows the
> ownership group: a locked deck (group `locked`, every name locked) has **no chip, only "Locked"**; a short
> locked deck no longer exists (v0.6, H-664); a deck with only some names locked has no badge; ownership unavailable
> shows **no chip + "Locked"** (SHARE-053 (b), OWN-065). The locked rows above still work when a
> caller passes `lockBadge`.

## 4. Toolbar, `app-deck-toolbar`
Reuse Collection's sticky toolbar rule (top `--header-height`, translucent bar + blur, sentinel
border). Controls are 40px tall on desktop and 44px on phones; control edges use
`--color-border-strong`.
- **One row at 1440** (RJ 2026-11-25, H-382 (1)): search, Ownership chips, Lock, Filters and Sort
  share one row at 1440 (content 1152px). Desktop only: search `flex: 1 1 10rem` (max 20rem; the
  right padding for the clear button only while it has text), toolbar gap `--space-2`, Ownership
  chip side padding `--space-2`. Narrower desktop widths still wrap (Sort keeps `margin-left:
  auto`). Phone (≤ 40rem) unchanged. **Worst case (H-463):** Lock and Sort are `flex: none` with
  fixed select widths for their longest option at 14px (Lock 7.25rem for "Not locked", Sort 8rem
  for "Last updated"; padding 12px left / 8px right, 8px gap before the arrow), values 14px
  (`--mat-select-trigger-text-size: var(--font-size-sm)`), so only search gives way (165px at
  1440 with a Filters badge, Lock "Not locked" and a search).
- **Search:** as Collection's search field. Placeholder `Search decks`, `aria-label="Search decks
  by name"`, clear button `Clear search`. `/` focuses it.
- **Ownership segmented chips** (desktop/tablet): `role="radiogroup" aria-label="Ownership"`, 4
  `role="radio"` buttons: `All`, `Ready to build`, `Partly available`, `None available`, each with
  its count in tabular-nums (`aria-label` "Ready to build, 1 deck"). Arrow keys move and select
  inside the group (one Tab stop). Selected: accent fill + `--color-accent-contrast`; others:
  outlined `--color-border-strong`. Disabled while ownership is unavailable (`aria-disabled`, with
  the hint below the toolbar).
- **Lock:** `mat-select` labeled `Lock`, options `All decks` · `Locked` · `Not locked`. Disabled
  when locks are unreadable.
- **Filters** (`filter_list`, label `Filters`, a badge with the active count): a `mat-menu` with two
  radio groups, **Legality** (`Any`, `Legal in Standard`, `Not legal in Standard today`, `Not fully
  checked`) and **Source** (`Any`, `Imported`, `From Tournaments`). Format name from
  `FormatDef.name`. Each set is a `role="group"` named by its visible heading (`aria-labelledby`;
  the heading is `aria-hidden` so it is heard once, H-465).
- **Sort:** `mat-select` labeled `Sort by`: `Last updated` · `Name A–Z` · `Date added`.
- **Phone:** row = search (flex 1) · `Filters` icon button (`filter_list`, `aria-label="Filters"`,
  with a count badge) · `Sort by` icon button (`sort`, menu of `menuitemradio`). Filters opens a
  full-screen `MatDialog` titled `Filters`, holding Ownership, Lock, Legality and Source as native
  radio fieldsets (44px rows), with `Clear filters` (text) and `Show 2 decks` (filled, live count) in
  a sticky footer. Applying closes it and returns focus to the Filters button. The Ownership options
  show their deck count like the desktop chips (muted, tabular-nums; heard as "Ready to build, 1
  deck"), live for the draft (H-468 (7)).
- **Active chips row** (only when a filter is on): one chip per filter, `<button>` with `close`
  icon, `aria-label="Remove filter: Ready to build"`, then text button `Clear filters`. Removing a
  chip moves focus to the next chip, or to the search field. Chips are 32px tall with a fine pointer on
  desktop and 44px on phones (`max-width: 40rem`) and touch (H-461).
- **URL:** `q`, `own`, `lock`, `legality`, `source`, `sort`; defaults omitted; `replaceUrl` while
  typing. Unknown values → notice line `1 filter value not found and was ignored` (dismissible).
- **Locked hint** (brief choice 7): under the count line when `own=ready` hides locked complete
  decks: `Locked decks are under Locked.` + text button `Show locked decks`.

## 5. Deck header, `app-deck-header`
**Inputs:** `deck: UserDeck`, `summary: DeckTileSummary`, `view: DeckOwnershipView`, `lockCheck:
LockCheck`, `readOnly: boolean`. **Outputs:** `lockIn`, `unlock`, `copyMissing(mode: 'sections' |
'merged')`, `exportDeck(mode: 'copy' | 'download')`, `duplicate`, `rename`, `delete`, `ruleCheck`.

> **v0.17 (H-668 to H-671, RJ 2026-11-26, in chat; SPEC-005 0.17), supersedes items 2, 5 and 6, the Phone paragraph and the Placement paragraph below:**
> - **Title row (item 2 + 5):** `<h1>` name · lock toggle (§7) · `More actions` ⋮ on **one row at every width**, never wrapping. The toggle and ⋮ are 44 × 44 and keep their place at the right (builder default); the name takes the remaining width. **Name clamp:** `-webkit-line-clamp: 2` / `line-clamp: 2`, `overflow-wrap: anywhere`, full name in the `<h1>` text and `title`. When a ResizeObserver measure says the clamp cuts it, an inner span gets `role="button"`, `tabindex="0"` and `aria-expanded`; tap, Enter or Space expands it, blur or Escape collapses it; a name that fits is not interactive (builder defaults for the mechanics; RJ's words: "wrap the long names. If the name exceeds two lines, use ellipses"; "tapping it will reveal the full name. Losing its focus will revert it back to two lines with ellipses"). Checked at 320, 375 and 1280.
> - **No actions row** (the "Actions row" item 5 and the "Placement from 40rem" paragraph are history). **Copy missing list** is in `app-deck-missing` (§11) at every width: `copyPlacement="heading"` on the Missing panel's heading row, right-aligned, from 64rem; under the list below 64rem. At 1280 the panel (about 290 px) is too narrow for heading and button on one line, so the flex row wraps and the button drops under the heading, right-aligned.
> - **No reason line (item 6 removed):** the text from `lockCheckMessage(lockCheck)` is a visually hidden element that is the toggle's `aria-describedby`. `incomplete` is not `aria-disabled`: pressing the toggle shows the info notice "Can't lock. Missing {x} cards." / "Missing 1 card." (x = missing copies of the deck's Missing list). Other reasons keep `aria-disabled`.
> - **Notices open at the top**, centred, under the sticky header: `NOTICE_POSITION = { verticalPosition: 'top', horizontalPosition: 'center' }` in `shared/sync/notice.ts` via `noticeOptions()`; top margin = `--header-height` + `env(safe-area-inset-top)` + `--space-2`; the pane is click-through; the H-101 phone tab-bar lift and the floating-button clearance are removed (SPEC-010 SYNC-161).

Extends `app-deck-heading` (keep it for the name + source):
1. Back link `← Decks` (`arrow_back` icon + text, `routerLink="/decks"`, 44px tall on phones).
2. `<h1>` deck name, `--font-display`, `--font-size-xl` (`-lg` on phones), wraps, no clamp.
3. Source line (OWN-003; tournament decks: `· <pilot>` and, when `sourceUrl`, a link `Source` +
   `open_in_new` 12px, `target="_blank" rel="noopener noreferrer nofollow"`; user decks with a URL:
   the URL as plain text, no link, DECK-072). `--font-size-xs` muted.
4. Meta row (wraps, gap `--space-2`): `app-lock-badge` (§6) · legality (icon + label as §2) · text
   button `Rule check` (`aria-haspopup="dialog"`).
5. Actions row (gap `--space-2`): `app-lock-actions` (§7) · Copy missing list split button (§11) ·
   `More actions` icon button (`more_vert`, `aria-haspopup="menu"`) with a `mat-menu`: `Copy deck
   list` · `Download .txt` · `Duplicate` · `Rename` (`edit`) · divider · `Delete` (`delete`, danger
   text).
6. Reason line (only when Lock in is disabled): `<p id="lock-reason">` `--font-size-sm` muted with
   the `help` icon; text = `lockCheckMessage(lockCheck)`.

Phone: the actions row puts Lock in / Unlock at full width (flex 1) + More (44×44). Copy missing
list moves into the summary panel (§11).

**Placement from 40rem (H-475, RJ 2026-11-25):** two columns under the back link. Left (`.header-main`): name,
source, meta row and summary, `flex: 1 1 20rem; min-width: 0` so a long name wraps. Right (the actions row,
`flex: 0 0 auto`): top-aligned with the name, right-aligned, in this order: Lock in / Unlock · Copy missing list
+ chevron · More. The reason line goes under the **whole** actions row (start-aligned under Lock in, box =
the row's width, wraps inside it; decided in H-477, see [[Decks]] §6, built in H-520), so Copy sits right next
to Lock in (answers H-392 (1)); `app-lock-actions` takes class `in-row` for
this (`display: contents` from 40rem). Built as a wrapping flex row (`.header-top`): when the two can't fit
side by side (about 768 and below) the actions drop under the summary, never overlapping. The actions stay
after the status in the DOM, so focus goes Rule check → Lock in → Copy missing list → chevron → More.
Notices stay under the header. Phones (< 40rem) keep the one-column layout above.

## 6. Lock badge, `app-lock-badge`
> **H-662 (RJ 2026-11-26):** the badge is on the deck **tile** only, and no lock date is shown
> anywhere (the `· Locked in on <date>` part below is gone). Deck detail shows the lock as the
> title-row icon toggle in §7.

**Inputs:** `lock: DeckLockState | null`, `label: string | null` (`summary.lockBadge`). It renders
nothing when not locked.
- Not short: `lock` icon + `Locked` (600) + muted ` · Locked in on Nov 23, 2026`
  (`formatIsoDate(lockedAt)`; omitted when `lockedAt` doesn't parse, SHARE-030). Box as the status
  chip's `locked` row, `--font-size-sm`.
- ~~Short: `warning` icon + `Locked · 2 cards short`~~ **removed in v0.6 (H-664)**; the badge is `Locked` only and is shown only for a deck whose every name is locked (SHARE-083). It carries no date (H-383, H-662).
- It's plain text (no role); screen readers read it in order (SHARE-044).

## 7. Lock actions, `app-lock-actions` + Lock in dialog
> **H-662 (RJ 2026-11-26), Deck detail:** `variant="icon"`, one icon-only native button right after
> the deck name (`.title-row`): closed `lock` (accent colour) when locked, open `lock_open` (muted)
> when not; `aria-label` and tooltip `Lock deck` / `Unlock deck`; `aria-pressed` = locked; 44 x 44
> on every width; the global focus ring. Same logic, confirmation, snack bars and (interactive)
> disabled states as the text buttons below; the reason line wraps under the title row. The
> actions row no longer has Lock in / Unlock. The text buttons stay in the component (and the
> styleguide) but no page uses them now.

- **Lock in:** Material filled button, `lock` icon, label `Lock in`. When `lockCheck.ok` is false
  and the reason isn't `already-locked`: `disabledInteractive` (`aria-disabled="true"`, focusable),
  `aria-describedby="lock-reason"`. While saving: label `Locking in…`, `aria-disabled`, min-width
  kept.
- **Unlock** (when `view.lock?.locked`): outlined, `lock_open` icon, `Unlock`. Disabled
  (interactive) only when `view.locksIgnored` / the lock store is unreadable, with the reason
  `Locked decks could not be read`. While saving: `Unlocking…`.
- **Dialog** (`MatDialog`, the shared confirm style, width `min(28rem, 100vw − 2 × gutter)`):
  - Title `<h2>`: `Lock in 'Kennen Tempo'?`
  - Body: `Its cards won't count toward your other decks until you unlock or delete it.`
  - Optional line: `2 other decks use some of these cards: Jinx Aggro, Draven Midrange` (from the
    union of `otherUses` over the deck's cards, unique deck names in SHARE-015 order, 3 max, then `and
    <r> more`).
  - Actions: `Cancel` (text) · `Lock in` (filled, `autoFocus`). Escape = Cancel. Focus returns to
    the Lock in / Unlock button (whichever now exists).
- **Results:** snack bars (success kind, 6s, polite): `Kennen Tempo is locked in.` / `Kennen Tempo
  is unlocked. Its cards count toward your other decks again.` Failure (error kind, stays until
  OK): `Couldn't save the lock. Try again.`

## 8. Section nav, `app-deck-section-nav`
**Input:** `sections: ZoneSection[]`. `<nav aria-label="Deck sections">` with a `<ul>` of six links
`#zone-<zone>`: `Legend`, `Champion`, `Main 39`, `Battlefields 3`, `Runes 12`, `Sideboard 10`
(counts = `required`; hidden at 0 for the single-card zones). Empty sections are muted but still
links. Sticky under the header, the same translucent bar as the toolbar. Links are 36px tall on
desktop and 44px on phones, `--font-size-sm`. The current one is accent text + a 2px accent
underline + `aria-current="location"` (IntersectionObserver on the section headings). Phone:
`overflow-x: auto`, `scroll-snap-type: x proximity`, no visible scrollbar, and the current link is
scrolled into view. Clicking scrolls smoothly (instant under reduced motion), with
`scroll-margin-top` = header + nav + `--space-3`, and focus moves to the section heading
(`tabindex="-1"`).

## 9. Section and card tile
### `app-deck-section`
**Inputs:** `section: ZoneSection`, `locked: boolean`, `ownershipAvailable: boolean`.
- `<section [attr.aria-labelledby]="'zone-' + zone">`, `<h2 id="zone-main">` `--font-size-lg` 700:
  the label (`Legend`, `Chosen Champion`, `Main Deck`, `Battlefields`, `Runes`, `Sideboard`) then
  muted `· 39 cards · 12 available` (`locked in` when locked; only `· 39 cards` when ownership is
  unavailable; `1 card` singular). Bottom border `--color-border`, margin `--space-6` above.
- Empty: `<p>` `No cards in this zone`, `--font-size-sm` muted.
- Grid: `<ul role="list" [attr.aria-label]="label">`, `repeat(auto-fill, minmax(var(--tile-min),
  1fr))`, gap `--space-4` (phones `--space-3`); roving tabindex as Collection §5 (one Tab stop per
  section). Items get `content-visibility: auto` with an intrinsic size of one tile.

### `app-deck-card-tile` (replaces `app-card-tile`)
> **H-663 (RJ 2026-11-26):** card tiles (Card view) and rows (List view) show **no other-deck
> information**: no `shared` line and no `sharedLabel` part in the accessible name. Only this
> deck's counts stay on the face. "Other decks using this card" and the "Locked by other decks"
> breakdown stay in the card dialog / panel. The `shared` rows below are superseded.

**Input:** `card: OwnershipCard`, `zoneLabel: string`, `eager: boolean`. **Output:** `open`.
```
<li>
  <button type="button" class="tile" aria-haspopup="dialog" [attr.aria-label]="name" tabindex=0|-1>
    <div class="frame">app-card-art [state] [fill] [imageUrl] [landscape] decorative
         app-count-badge [count]="required" (top-right)</div>
    <span class="name">…</span>
    <span class="type">…</span>
    <span class="labels">app-ownership-chip [state] [label]=chipLabel</span>
    <span class="split">2 of 3 in this deck</span>
    <!-- H-663: no `.shared` line (stacks icon + sharedLabel). Removed; SHARE-042 MUST NOT -->
    <!-- H-664: when this name is locked in this deck (card.nameLocked): a small lock icon, see below -->
    <app-status-label …/>   <span class="flag">Preview</span>
  </button>
</li>
```
- **Art:** `state` / `fill` from the card; `imageUrl` = `card.imageUrl`; `landscape` = `card.card?.category
  === 'battlefield' ? true : null`; `eager` for the first row of the first non-empty section only.
  Frame: `--radius-md`; `none` / `partial` add a 1px `--color-border-strong` outline (§0).
  Placeholder (no image, unknown card): the existing placeholder, which gets the same fill
  (OWN-036).
- **Count badge:** `app-count-badge [count]="card.required"` (hidden below 2, brief choice 10).
- **Text** (every line app-rendered, never darkened):
  | Line | Style | Source |
  |---|---|---|
  | name | `--font-size-sm` 600, 2-line clamp, `title` = full | `card.name` |
  | type | `--font-size-xs` muted, 1 line | `card.card?.type`; unknown card: `Card no longer in the card data` in `--color-text` (not muted) |
  | chip | `app-ownership-chip`, now allowed to wrap (`white-space: normal`) | `chipLabel` = `card.label.split(' · ')[0]`; hidden when `card.label === ''` |
  | split | `--font-size-xs` muted | the part after ` · ` when present |
  | ~~shared~~ | **removed (H-663, RJ 2026-11-26):** no other-deck line on the tile; `card.sharedLabel` is not rendered | ~~`card.sharedLabel`~~ |
  | ban | `app-status-label` | `banned` → `Banned since <date>`; `upcoming` → `Banned from <date>`; `unknown` → nothing on the face (brief choice 11; the page notice covers it) |
  | lock icon (v0.6, H-664) | `lock` Material icon, 16 px, `--color-text-muted`, at the end of the count-label line (Card view tile and List view row), decorative with the accessible name part below; **no text**, no button, no other-deck info | `card.nameLocked` (SPEC-008 `CardAvailability.nameLocked`); absent when the name is not locked in this deck |
  | flag | 1px `--color-border-strong` `--radius-sm` xs tag `Preview` | `flags.includes('preview')` |
- **Accessible name** (joined with ", "): name · `zoneLabel` · `card.label` (the whole label) ·
  ban (`banned since Nov 23, 2026` / `banned from …` / `ban status unknown`) · `preview` · unknown:
  `card no longer in the card data` placed after the zone. **H-663: no `sharedLabel` part.** **H-664:
  a locked name adds `Locked in this deck` (proposal wording) after the label.** Examples:
  "Hextech Ray, Main Deck, 0 of 3 available" (SPEC-005 AC 16, AC 40); "Hextech Ray, Main Deck, 3 of 3
  locked in, Locked in this deck" (SPEC-005 AC 41).
- **States:** default · hover `.lift` (fine pointer) · active press · focus-visible ring (2px offset,
  `--radius-md`, around the whole button) · fill change (`clip-path` and divider `left` transition
  `--dur-fill` `--ease-out`, only after first render; none under reduced motion).
- **Size:** fills its cell; 5 columns in the desktop main column (≈150px), 4 at 1024 and 768, 2 on
  phones (≈160px at 375).

## 10. ~~Shortfall warning, `app-shortfall-warning`~~ → Lock removal notice, `app-lock-removal-notice` (v0.6, H-664, RJ 2026-11-26)
**The "will be 2 cards short. It stays locked." warning and the after-Undo notice are removed**
(a locked name is never short; SPEC-008 SHARE-033 and SHARE-034 withdrawn). `shortfallWarning()`,
`shortfallNotice()`, `LockedShortfall` and `lockedShortfalls()` are retired.

For the Collection **Replace** and **Undo** confirmations (SPEC-003 IMP-050a, SPEC-007 COLL-088), not
for Decks pages. **Input:** `losses: LockLoss[]` (SPEC-008 `lockLosses(before, after)`: deck, card,
copies, `deckUnlocks`). **Rendered only when `losses` is not empty** (free copies are taken first, so a
removal that touches no lock shows nothing and adds no dialog).
- Box: 1px `--color-warning`, `--radius-md`, padding `--space-3`, `--color-surface`; `lock_open` icon
  16px; inside the dialog content so it is read with the dialog; no `role="alert"`.
- Sentence (RJ-approved as built, 2026-11-26): **"Some of the cards you are removing are locked in your decks. Going on unlocks them:"**
- One `<p>` per deck, `--font-size-sm`: **"'Kennen Tempo': 3 Hextech Ray, 2 Gust"** (card names in
  lock order; copies first, `<n> <card name>`). A deck that stops being locked gets a second line
  **"'Kennen Tempo' will no longer be locked."**
- A standalone confirmation (future edit paths, SPEC-008 SHARE-089): title **"Unlock cards in your decks?"**,
  actions **Cancel** (text, default focus) · **Unlock and continue** (filled). **Cancel** changes nothing.
- **Sync notice** (no dialog; SPEC-010 SYNC-074): one notice, info kind, stays until OK, **"Locks removed after a change on another device."** with one line per deck, built by the same helper from the same `LockLoss[]` (RJ-approved as built, 2026-11-26).

## 11. Summary and missing list, `app-deck-summary`
**Inputs:** `view: DeckOwnershipView`, `locked: boolean`. **Output:** `copy(mode)`.
- Desktop: inside `<aside aria-label="Summary and missing cards">`, sticky, `max-height: calc(100svh
  − header − section nav − 2 × --space-4)`, `overflow: auto`, background `--color-surface`, 1px
  `--color-border`, `--radius-lg`, padding `--space-4`. Tablet / phone: the same panel in the flow,
  under the header.
- **Summary** `<h2 class="visually-hidden">Summary</h2>` (visible heading `Summary`, `--font-size-sm`
  600 muted on phones only):
  - `34 of 66 copies available` (`locked in` when locked) – `--font-size-md` 600, tabular-nums.
  - `18 of 32 cards fully available` – `--font-size-sm`.
  - `1 copy excluded from decks` (only when `copiesExcludedRelevant > 0`; `copies` plural) – xs muted.
  - R = 0: `No cards to count` only.
  - Ownership unavailable: only `Ownership unavailable: your collection could not be read.`
- **Missing list** `<h2>` `Missing` + muted `· 32 copies` (Σ `missing`):
  - Grouped by zone in section order, an `<h3>` per group (xs 600 muted: `Main Deck`), a `<ul>`
    of `2 Lightning Rush` lines (`--font-size-sm`, qty in tabular-nums, right-aligned 2ch column).
  - More than 10 lines: show the first 10 and a text button `Show all 14 lines` (`aria-expanded`,
    `aria-controls`); expanded: `Show fewer`. Phone: the whole list is a `<details>` closed by default
    when > 10 lines, `<summary>` `Missing: 14 lines, 32 copies`.
  - Empty: `All cards available` with `check_circle` in accent text.
- **Copy missing list** (split button: Material outlined + an attached `expand_more` menu button,
  `aria-label="More copy options"`): main `Copy missing list` (`content_copy`) copies
  `view.missingText`; menu item `Copy as one list` copies the merged list (per `cardKey`, deck order
  of first appearance, `<total> <name>`; built from `view.missing`). Both snack `Missing list copied`.
  Both halves are 40px with a fine pointer on desktop and 44px on phones (`max-width: 39.99rem`) and
  touch, always the same height (H-461; the main half via `--mat-button-outlined-container-height`).
  Clipboard failure: `Couldn't copy. Select the list and copy it yourself.` (proposed; the spec is
  silent). Hidden when `missing` is empty or ownership is unavailable.

## 12. Card dialog, `app-deck-card-dialog`
Use the `app-card-dialog` shell from Collection (sizes, phone full screen, header row with
Previous / Next / Close, focus trap, `restoreFocus`, motion). **Data:** `card: OwnershipCard`,
`zoneLabel`, `locked`, `ownershipAvailable`, `cards: OwnershipCard[]` (the whole deck in section
order, for `[` / `]`).
- **Title** `<h2>` `card.name`. Under it (`--font-size-lg` 600): `Main Deck · 1 of 3 available`
  (`card.label` first part). When split, a muted line: `2 of 3 in this deck · Main Deck 2 of 2 ·
  Sideboard 0 of 1` (from `allocationByZone` in `ZONE_ORDER`, using section labels).
- **Art column:** `app-card-art` not decorative (alt = name), `state` / `fill` as the tile, the
  `fullUrl` of the default printing (thumbnail first, then swapped). Under it: the ban label in every
  case including `Ban status unknown`, and `Preview` when flagged.
- **Sections** (`<h3>` xs 600 muted, `--space-5` apart):
  1. **This deck** – `<dl>`-style lines, word for word:
     `Owned for decks: 2` (+ ` (1 more excluded from decks)`), `Locked by other decks: 1`,
     `Available to this deck: 1` (+ ` (1 extra)` when `extra > 0`), `This deck needs: 3`, and when this
     name is locked in this deck `Locked in by this deck: 3` (v0.6: per name, not only in a locked deck).
     **Lock control (v0.6, H-664, RJ 2026-11-26: "the card dialog (full card info) only"):** directly
     below these lines, one outlined button, 44 px target, `lock` icon + **`Lock these copies`**, or
     `lock_open` + **`Unlock these copies`** when `CardAvailability.nameLocked` (labels RJ-approved as built, 2026-11-26;
     SPEC-008 Open question 9). Pressing it while locking is blocked shows the "Can't lock. ..." notice (SPEC-008 SHARE-096, SHARE-097). Disabled with `aria-disabled="true"` (focusable) and `aria-describedby`
     a visible muted line, using the SPEC-008 SHARE-081 text of `canLockName()`: **`Lock needs every
     copy available: 2 of 3`** / `This deck is read-only` / `Locked decks could not be read` /
     `Ownership unavailable`; hidden for an unknown card. Press: the name lock is saved at once, no
     confirmation; failure shows `Couldn't save the lock. Try again.`; the label and the tile's lock icon
     change with no reload. A failed press never closes the dialog.
  2. **Your printings** – group `Counts toward this deck` (`printingsOwned`) and group `Owned ·
     excluded from decks` (`excludedPrintings`, each row + ` · Collector`). Row: `OGN-012 ×1`,
     `OGN-012a Foil ×1`, `Printing not specified ×2`, `Printing no longer found (OGN-005) ×1`. Each
     row is a link to `/collection?q=<card name>` (`aria-label` "Show in Collection: OGN-012, 1 copy").
     No rows at all: `You don't own this card` (OWN-043), with any excluded rows below it.
  3. **Other decks using this card** – rows: `Jinx Aggro · needs 2 · Locked, holds 2` /
     `Draven Midrange · needs 3 · Not locked`, each a link to `/decks/<id>` (`lock` icon on locked
     rows). Empty: `No other deck uses this card.`
  4. **Card** – `Spell · Spell` (type · category; `Unknown` category), `Domains: Fury, Calm` /
     `Domains: Unknown` / `No domain`, stats `Energy 2 · Might 3` (non-null only), then `text` in a
     `<p>` with `white-space: pre-line`. Unknown card: only `Card no longer in the card data`.
  - Ownership unavailable: sections 1–3 are replaced by `Ownership unavailable: your collection
    could not be read.`
  - Links and rows are ≥ 44px tall on phones.
- **Keyboard:** as Collection; `[` / `]` step through `cards` across sections; on close, focus goes
  back to the tile of the card shown last (scroll it into view).

## 13. Rule check dialog, `app-rule-check-dialog`
**Input:** the deck's `LegalityResult` (SPEC-002), the banned cards (`card.name`, zone, `banStatus`).
Title `Rule check`. First line = the legality label (icon as §2). Then `Rules not met` with one
`<li>` per failed rule (LEGAL-R07 message, LEGAL-R08 rendering), `Not checked` with
`notEvaluatedReason`s (DECK-052; **v0.18, RJ 2026-11-26: a reason that lists cards is one count line, "Missing champion data for 31 cards", with a "Show cards" / "Hide cards" button that reveals the names, collapsed on open; DECK-107, LEGAL-R09; button text and phrasing are builder defaults**), and `Banned cards` lines `Nocturne, Horrifying, banned since Nov
23, 2026` / upcoming `… will be banned from Dec 15, 2026` (DECK-051/053 wording). Legal with nothing
to list: `Every rule checked passes as of Nov 25, 2026.` (proposed). Close button only.

## 14. Page states (components and copy)
All banners reuse Collection's banner pattern (§8 there); notice lines reuse its notice line.
| State | Component | Role | Copy, word for word | Action |
|---|---|---|---|---|
| Loading list | 6 skeleton deck tiles (art box + 3 bars, `--color-surface-raised`) after 200ms | list `aria-busy`, hidden `Loading your decks…` | — | — |
| Loading deck | header placeholder + 2 × 5 skeleton card tiles | `aria-busy`, hidden `Loading this deck…` | — | — |
| Empty list | existing (OWN-008) | region | `No decks yet` · `Import a deck list to see which of its cards you own.` | `Import deck` · `Tournaments` |
| No match | `app-empty-state` | region | `No decks match these filters` | `Clear filters` |
| Deck not found | `app-empty-state` | region | `This deck isn't in your decks` · `It may have been deleted on another device.` | `Back to Decks` (link button) |
| Ownership unavailable | banner, warning | `alert` | `Ownership unavailable: your collection could not be read.` | — |
| Card data not loaded | banner, warning | `alert` | `Card data not loaded` | `Try again` (reloads the catalog) |
| Locks unreadable | banner, warning | `alert` | `Locked decks could not be read; counts ignore locks.` | — |
| Ban data not loaded | notice line, `help` | `status` | `The ban list couldn't load, so ban status is unknown.` | dismiss |
| Read-only deck | banner, info (`--color-border-strong` edge, `help` icon) | `status` | `This deck was saved by a newer version of Rift Builder. You can view it, but not change it.` | — |
| Card gone while its dialog is open | dialog closes, snack | polite | `This card is no longer in this deck.` | — |
| Deck saved (import) | snack, success | polite | `Deck saved.` | `View deck` |
| Deleted | snack, 10 s | polite | `Deck deleted.` | `Undo` |
| Duplicated | snack | polite | `Deck duplicated.` | `Open` |

## 15. Motion (existing tokens)
| Element | Trigger | Motion | Tokens |
|---|---|---|---|
| Deck tile, card tile | hover (fine pointer) / press | `.lift` / press | `--dur-med` `--ease-out` / 90ms |
| Toolbar, section nav border | stuck | fades in | `--dur-fast` |
| Card fill | value changes after first render | `clip-path` + divider `left` | `--dur-fill` `--ease-out` |
| Dialogs | open / close | as Collection | `--dur-med` / `--dur-fast` |
| Section nav click | — | smooth scroll | instant under reduced motion |
Nothing plays on load; the global reduced-motion block covers everything.

## 16. Reviewer checklist (adds to brief A1–A10)
- No number or label on screen differs from the engine output for the same deck (list tile =
  header summary).
- The none chip edge and the darkened-art frame measure ≥ 3:1 in both themes.
- The split chip never overflows a 150px tile; its full label is in the accessible name.
- One Tab stop per section grid; arrows move; Enter opens the dialog; Escape returns to the tile.
- Lock in disabled = `aria-disabled` + visible reason with `aria-describedby`.
- `/styleguide` shows: deck tiles for ready, partial, none, empty deck, locked, locked short,
  unavailable, read-only, no Legend; card tiles for full, partial 1/3, none, split, locked by another deck (H-663: no other-deck line),
  banned, upcoming, preview, unknown, placeholder, battlefield; the lock badge (both); the summary
  with > 10 missing lines; the card dialog (owned + excluded printings, other decks, unknown card).
  **On `/styleguide` since H-391** (section "Decks (H-060, H-254)", `pages/styleguide/decks-preview.ts` on engine-built
  sample data in `deck-samples.ts`): deck tiles (all of the above, plus ownership unavailable unlocked / locked), the
  status chip rows, the lock badge (date, short, tile size), lock actions (Lock in that works on a preview-only lock
  store, disabled with reason, Unlock, locks unreadable) and the Lock in dialog, card tiles and list rows (as above,
  plus ownership unavailable), the desktop panel (Card / Missing tabs), the collapsed missing list, ownership
  unavailable, and the card dialog. Not yet: excluded printings in the dialog.
