---
tags: [ui, brief, decks]
status: proposed
date: 2026-11-25
owner: ui-engineer
for: H-251
builds: H-060 (Decks list), H-254 (Deck detail), with H-155 (engine) and H-253 (Import deck save)
specs: ["[[Your Decks Ownership View]]", "[[Shared Cards and Lock-in]]", "[[Deck Import]]", "[[My Collection]]", "[[Accounts and Sync]]"]
---
# Decks and Deck detail: design brief

> **Status: proposed, waiting on RJ** (H-251). The answers to §13 "Open choices for RJ" go to
> `spec-writer` in **H-252**, which writes them into SPEC-005 / SPEC-006 / SPEC-008 before
> `builder` starts H-060 and H-254. Until RJ answers, every recommended default below is the
> working assumption. Nothing here changes an ownership rule: the engine
> (`web/src/app/core/decks/`) stays the single source of numbers and labels.
>
> **Component spec:** [[Decks Components]] (tokens, sizes, states, accessible names, keyboard,
> motion and copy per component). Its pixel and token values win over the sketches here; this
> note wins on behavior.

## Summary
- **Decks (`/decks`)** becomes a grid of **deck tiles**: Legend art on the left (with that card's
  own ownership treatment, choice 1), then name, source line, an **ownership chip** (Ready to build /
  Partly available / None available, or a Locked badge), the copies line ("34 of 66 copies
  available"), legality and ban flags, and "Updated Nov 22, 2026". A sticky toolbar holds search,
  ownership and lock filters (SHARE-051) and sort (OWN-006). The Import deck FAB stays as built (OWN-094).
- **Deck detail (`/decks/:id`)** = header (name, source, legality, lock badge, summary, **Lock in /
  Unlock**, Copy missing list, ⋯ menu) and the six sections in Riot order (OWN-011) as card-tile
  grids with the full / darkened / left-to-right fill (OWN-030…036). On desktop a **sticky aside**
  holds the summary and the missing list. On phones the missing list sits under the summary and
  is collapsed when it has more than 10 lines (OWN-051).
- **Card details open in a dialog** (as on Collection), not an inline expand (choice 8). It holds the
  card info, the SHARE-043 breakdown, the owned printings (OWN-041) and the other decks.
- Locked decks: "Locked" badge with a lock icon, "Locked in on <date>", labels "… locked in",
  and "Locked · n cards short" in the warning color when short (SHARE-041).
- Every state is covered (§9, §10): gate, loading, empty, no filter match, ownership unavailable,
  locks unreadable, card data not loaded, ban data not loaded, read-only, deck not found, empty
  deck, unknown card, preview card.
- **28 open choices for RJ** (§13). **Spec gaps and contradictions** for H-252 are in §14.

## 1. Purpose and user goals
Decks answers the product's main question ([[Product Vision]]): *which decks can I build right
now, which are close, and exactly which cards am I missing?* A deck is a list someone else built
that the user wants to own ([[ADR-0006 Two Imports - Collection and Decks]]).

| Goal | Where it's answered |
|---|---|
| "Which of my decks can I build today?" | Deck list: ownership chip + Ready to build filter (SHARE-051) |
| "How close is this deck?" | Deck tile copies line; deck header summary (OWN-050) |
| "What exactly am I missing?" | Deck detail missing list + Copy missing list (OWN-051…053) |
| "Which cards are contested between my decks?" | Shared line on each card tile, Other decks in the card dialog (SHARE-042/043) |
| "I've built this one, stop counting its cards elsewhere" | Lock in / Unlock (SHARE-020…023) |
| "Is this deck legal, is anything banned?" | Legality label and ban flags on the tile; ban label per card (OWN-004/015) |

Direction A holds ([[Design Direction]]): calm, dense, slate chrome, teal accent, Archivo
headings, art as the centrepiece. **App screens stay a dense tool**: no hero, no motion on load.
Collection is all full-color art. Decks is where the darkening and the partial fill live, so the
contrast between the two pages is the point. Owned cards glow, missing ones recede.

## 2. Principles
1. **The engine speaks, the UI renders.** Every number and label comes from `DeckTileSummary`,
   `DeckOwnershipView`, `OwnershipCard`, `canLock()` and `lockCheckMessage()`. The UI never
   re-derives a count (OWN-073, SHARE-071).
2. **Ownership is never color alone** (OWN-033): every fill has a text label and a state icon.
   Every badge has an icon and text.
3. **Only the art is darkened** (OWN-031/034). Names, counts, ban labels and rules text keep full
   contrast in every state.
4. **Same patterns as Collection:** the same toolbar, count line, notice lines, banners, dialog
   shell, FAB, empty state, status label and count badge. A user who learned Collection already
   knows Decks.
5. **Counts, never percentages, scores or meta** (OWN-007, OWN-054, ADR-0003). No progress bar
   unless RJ picks it (choice 3).

## 3. Decks list: layout
Content uses the app edges (`--content-max-width` 72rem, `--content-gutter`).
```
Desktop 1440 (content 1152px)
Rift Builder   [Decks]  Collection  Tournaments                    ☀  (T) Tester ▾
──────────────────────────────────────────────────────────────────────────────────
Decks
Decks you want to build. Cards you own are shown in full color.        (lede, choice 26)
3 decks                                                     (count line, role=status)
┌ sticky toolbar ─────────────────────────────────────────────────────────────────┐
│ [⌕ Search decks ............]  [All] [✓ Ready to build 1] [◐ Partly 1] [○ None 0] │
│                                [🔒 Locked ▾]  [Filters ▾]          Sort [Last updated ▾] │
└─────────────────────────────────────────────────────────────────────────────────┘
 Ready to build ✕   Legal in Standard ✕   Clear filters        (active filter chips, only when any)
┌───────────────────────────────┐ ┌───────────────────────────────┐ ┌──────────────── …
│┌──────┐ Kennen Tempo          │ │┌──────┐ Kai'Sa, Daughter of…  │ │
││Legend│ 1st, Regional Champ… │ ││Legend│ Imported              │ │
││ art  │ [◐ Partly available]  │ ││ art  │ [🔒 Locked]            │ │
││ 63:88│ 34 of 66 copies avail.│ ││(dim) │ 54 of 54 copies locked│ │
│└──────┘ Not legal in Standard │ │└──────┘ Legal in Standard as… │ │
│         ⛔ 1 banned card      │ │         Updated Nov 22, 2026  │ │
│         Updated Nov 22, 2026  │ │                               │ │
└───────────────────────────────┘ └───────────────────────────────┘ └──────────────── …
                                                              [⇧ Import deck]  (FAB, as built)
```
- **Grid** (choice 4): `repeat(auto-fill, minmax(22rem, 1fr))`, gap `--space-4`: 3 columns at 1440
  (1152px), 2 at 1024 and 768, 1 on phones. Tiles in one row share a height (grid stretch).
- **Toolbar:** sticky under the header, the same translucent bar as Collection's (its rule
  reused). Desktop row 1: search (max 20rem), then the ownership segmented chips. Row 2 (or the same
  row when it fits): Lock filter, Filters menu (Legality, Source; choice 5), Sort on the right.
- **Phone < 40rem:**
```
Rift Builder                                ☾
Decks
3 decks
┌ sticky ───────────────────────────────────┐
│ [⌕ Search decks ..........] [⚲ Filters 1] [⇅] │
└───────────────────────────────────────────┘
 Ready to build ✕   Clear filters
┌───────────────────────────────────────────┐
│┌─────┐ Kennen Tempo                       │
││art  │ 1st, Regional Championship: Eu…    │
││4.5rem│ [◐ Partly available]               │
│└─────┘ 34 of 66 copies available          │
│        Not legal in Standard today         │
│        ⛔ 1 banned card · Nov 22, 2026     │
└───────────────────────────────────────────┘
                              [⇧ Import deck]   (collapses to icon while scrolling down)
[ Decks | Collection | Tournaments | (T) ]
```
  The Filters button opens a full-screen dialog (phone) holding Ownership, Lock, Legality and
  Source as radio groups, with "Show N decks" and "Clear filters". Sort is an icon button with a
  menu, as on Collection.
- **No virtual scroll** (at most 200 decks, DECK-092): render every tile, with
  `content-visibility: auto` and a reserved `contain-intrinsic-size` so it stays smooth (OWN-084,
  COLL-093). The scroll position is kept on Back from a deck (COLL-093). Filter or sort changes go
  back to the top.

## 4. The deck tile (OWN-002, SHARE-050/051)
```
┌──────────────────────────────────────────┐
│┌────────┐  Kennen Tempo                   │  name: --font-size-md 600, 2 lines max
││        │  1st, Regional Championship: …  │  source line: xs muted, 1 line (OWN-003)
││ Legend │  [◐ Partly available] 34 of 66  │  ownership chip + copies line (choice 1/3)
││  art   │      copies available           │
││        │  Not legal in Standard today    │  legality label, sm muted (OWN-004)
│└────────┘  ⛔ 1 banned card              │  ban flag (choice 2)
│            Updated Nov 22, 2026          │  xs muted (OWN-002, OWN-090)
└──────────────────────────────────────────┘
```
- **Whole tile is one link** to `/decks/:id` (OWN-002 "clicking the tile opens the deck view").
  Hover: `.lift`. Focus: the global ring around the tile.
- **Legend art** (choice 1, recommended): the deck's Legend card, `app-card-art` with **that card's
  own** `state` / `fill` from the Legend section's `OwnershipCard`, decorative. So the art follows
  the page rule "cards you own are in full color". No Legend → `app-deck-mark` on
  `--color-surface-raised` in the same 63:88 box. Width 6rem on desktop and 4.5rem on phones,
  thumbnail URL only, lazy-loaded. **This needs OWN-082 changed** ("The Decks list shows no card
  images") in H-252.
- **Ownership chip** (`app-deck-status-chip`), from `ownershipFilter`:

| `ownershipFilter` | Chip | Copies line (verbatim `ownershipLine`) |
|---|---|---|
| `ready` | filled accent, `check_circle`, **Ready to build** | "66 of 66 copies available" |
| `partial` (unlocked) | accent outline, `contrast`, **Partly available** | "34 of 66 copies available" |
| `none` (unlocked, R > 0) | neutral outline, `radio_button_unchecked`, **None available** | "0 of 66 copies available" |
| `none` with R = 0 | neutral outline, **None available** | "No cards to count" |
| `locked` | raised neutral, `lock`, **Locked** (`lockBadge`) | "54 of 54 copies locked in" |
| locked + short (`partial`/`none`) | warning outline, `warning`, **Locked · 2 cards short** (`lockBadge`) | "50 of 54 copies locked in" |
| `unavailable` (after H-155) | no chip; a locked deck still shows **Locked** | "Ownership unavailable" |

  The chip text for `ready` / `partial` / `none` uses the SHARE-051 filter option names, so the tile
  and the filter use the same words.
- **Legality:** `legalityLabel` verbatim, `--font-size-sm` muted. `illegal` gets the `block` icon in
  `--color-danger`. `incomplete` ("Not fully checked") gets `help`, muted, never a legal color
  (LEGAL-R04, OWN-091). `legal` gets no icon and no color: "legal" is not shown as success, so it
  isn't read as an endorsement.
- **Ban flag** (choice 2, recommended): from the deck view's cards, "1 banned card" / "3 banned
  cards" (`block`, `--color-danger`) and "1 card banned from Dec 15, 2026" (`schedule`,
  `--color-warning`, earliest upcoming date). Hidden when nothing is banned or upcoming, and when the
  ban data didn't load (the page notice covers it, §9).
- **Read-only deck** (DECK-091): a small "Read-only" text tag after the name (no icon, muted).
- **Accessible name:** the link's content read in order, with the decorative art hidden. Name as
  `aria-labelledby`, everything else via `aria-describedby`, so a screen reader announces "Kennen
  Tempo, link" and then the details. See [[Decks Components]] §2.

## 5. Filters, search and sort (OWN-005, OWN-006, SHARE-051)
- **Search** "Search decks" (placeholder) / accessible name "Search decks by name": case- and
  accent-insensitive substring on the deck name, debounce 150ms, `/` focuses it, Escape clears it.
- **Ownership** (single select, segmented chips with counts, choice 6): **All** · **Ready to build**
  · **Partly available** · **None available**. URL `own=ready|partial|none`.
- **Lock** (single select menu or 3-way chip): **All decks** · **Locked** · **Not locked**. URL
  `lock=locked|unlocked`. It's independent of Ownership (a short locked deck matches both).
- **Filters menu** (choice 5): **Legality**: "Legal in Standard", "Not legal in Standard today",
  "Not fully checked" (OWN-006 wording, no date); **Source**: "Imported", "From Tournaments". URL
  `legality=legal|illegal|incomplete`, `source=user|tournament`.
- **Sort:** **Last updated** (default) · **Name A–Z** · **Date added**. URL `sort=name|added`, and
  the default is omitted.
- **Count line** (`role="status"`): "3 decks" (singular "1 deck"); with any filter or search:
  "Showing 2 of 3 decks". This replaces the placeholder "3 decks saved."
- **Active filter chips** under the toolbar: one removable chip per active filter, with
  `aria-label` "Remove filter: Ready to build", then a text button **Clear filters**.
- **Hint for a locked deck under Ready to build** (choice 7): when `own=ready` hides one or more
  locked complete decks, a muted line under the count says "Locked decks are under Locked." with
  a link button **Show locked decks** (sets `lock=locked`, clears `own`).
- Unknown URL values are dropped with the notice line **"1 filter value not found and was
  ignored"** (COLL-062 wording; the spec is silent for Decks, §14).

## 6. Deck detail: layout (OWN-010, OWN-011)
```
Desktop 1440 (content 1152px): main column + sticky aside 20rem
← Decks
Kennen Tempo                                                          (H1, Archivo xl)
1st, Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026 · ASC Evansrhim · Source ↗
[🔒 Locked · Locked in on Nov 23, 2026]   ⛔ Not legal in Standard today  [Rule check]
[ 🔒 Lock in ]  [⧉ Copy missing list ▾]  [⋯]            (actions; ⋯ = Export, Duplicate, Rename, Delete)
Lock in needs every card available: 3 cards short       (reason line, only while disabled)
┌ sticky section bar ───────────────────────────────────┐
│ Legend · Champion · Main 39 · Battlefields 3 · Runes 12 · Sideboard 10 │
└───────────────────────────────────────────────────────┘
Legend · 1 card · 1 available                          ┌ aside (sticky) ──────────────┐
┌─────┐                                                │ Summary                      │
│ art │                                                │ 34 of 66 copies available    │
└─────┘                                                │ 18 of 32 cards fully available│
Chosen Champion · 1 card · 0 available                 │ 1 copy excluded from decks   │
…                                                      │ ──────────────────────────── │
Main Deck · 39 cards · 12 available                    │ Missing (32 copies)          │
┌────┐┌────┐┌────┐┌────┐┌────┐   5 columns             │ Main Deck                    │
│ ×3 ││    ││ ×2 ││    ││ ×3 │                          │ 2 Lightning Rush             │
│art ││art ││art ││art ││art │                          │ 3 Hextech Ray                │
└────┘└────┘└────┘└────┘└────┘                          │ … Show all 14 lines          │
Lightning…  Hextech…                                   │ [⧉ Copy missing list]        │
Spell       Spell                                      └──────────────────────────────┘
[◐ 1 of 3 available]
⧉ Also in 2 other decks · 1 locked
⛔ Banned since Nov 23, 2026
```
- **Desktop ≥ 64rem** (choice 12): two columns, `minmax(0,1fr) 20rem`, gap `--space-6`. The aside is
  sticky at `top: header + section bar + --space-4`, with `max-height` set to the rest of the
  viewport and its own scroll.
- **Tablet 40–64rem:** one column. Summary and missing list go in one panel under the header,
  with the missing list collapsed when it has more than 10 lines (OWN-051).
- **Phone < 40rem:**
```
← Decks
Kennen Tempo
1st, Regional Championship: Europe · Nov 6 – 8, 2026 (wraps)
[🔒 Locked · Nov 23, 2026]
⛔ Not legal in Standard today · Rule check
[        🔒 Lock in        ] [⋯]          full-width primary + More
┌ Summary ─────────────────────────┐
│ 34 of 66 copies available        │
│ 18 of 32 cards fully available   │
│ ▸ Missing: 14 lines, 32 copies   │   details, collapsed > 10 lines
│ [⧉ Copy missing list]            │
└──────────────────────────────────┘
┌ sticky, scrolls sideways ────────┐
│ Legend · Champion · Main 39 · Ba…│
└──────────────────────────────────┘
Main Deck · 39 cards · 12 available
┌──────┐ ┌──────┐   2 columns
│ ×3   │ │      │
└──────┘ └──────┘
[ Decks | Collection | Tournaments | (T) ]
```
  No FAB on the detail page (OWN-094 is the list only).
- **Section bar** (choice 13): in-page links to each section (`#zone-main` etc.) with counts, sticky
  under the header, sideways scroll on phones. The current section gets `aria-current="location"`
  (IntersectionObserver). Empty sections stay in the bar, muted.
- **Document title:** "<deck name> · Rift Builder".

## 7. Sections and card tiles (OWN-011…017, OWN-030…040, SHARE-040/042)
- **Six sections always, in this order:** Legend, Chosen Champion, Main Deck, Battlefields, Runes,
  Sideboard (`view.sections`, `ZONE_ORDER`). Heading `<h2>`: "Main Deck · 39 cards · 12 available",
  or "… locked in" in a locked deck (OWN-011). Counts are `section.required` and
  `section.allocated`. While ownership is unavailable, only "Main Deck · 39 cards". An empty
  section shows the muted line **"No cards in this zone"**.
- **Card grid:** `repeat(auto-fill, minmax(var(--tile-min), 1fr))` (9rem), gap `--space-4`
  (`--space-3` on phones): 5 columns in the desktop main column at 1440, 4 at 1024 and 768, 2 on
  phones. Tiles keep the deck's stored order (OWN-012).
- **The card tile** (`app-deck-card-tile`, which replaces today's `app-card-tile`):
```
┌──────────────┐
│          ×3  │  count badge: required in this zone (OWN-040; hidden at 1, choice 10)
│    art       │  full / partial (left→right, 1px divider) / none (grayscale, 55%)
│  (63:88)     │  OWN-030…032; placeholder gets the same treatment (OWN-036)
└──────────────┘
Lightning Rush               name, sm 600, 2 lines max
Spell · Unit?                type verbatim (OWN-014); "Card no longer in the card data" for unknown
[◐ 1 of 3 available]          chip: tile label first part (OWN-033, SHARE-040)
2 of 3 in this deck          split suffix on its own muted line (only when split)
⧉ Also in 2 other decks · 1 locked     shared line (SHARE-042), xs muted + icon
⛔ Banned since Nov 23, 2026  ban label (OWN-015), app-status-label
[Preview]                    OWN-017 flag chip, when isPreview
```
  - The whole tile is **one button** that opens the card dialog (§8). Hover `.lift`, focus ring.
  - **Chip label split:** the engine's `label` is "2 of 2 available · 2 of 3 in this deck" for split
    cards. The chip shows the part before " · ". The "2 of 3 in this deck" part is a muted line
    under it, because the full string doesn't fit a 150px tile. The accessible name keeps the whole
    label.
  - **Battlefields:** the same 63:88 box with `landscape` set from `card.category ===
    'battlefield'`, so the art is letterboxed, never cropped (OWN-081 BLOCKED on H-020; the
    `app-card-art` landscape input exists).
  - **Ownership unavailable** (OWN-062/063): full color, no chip, no split line, no shared line,
    nothing darkened (`label === ''`).
- **Never** a darkened ban: a banned card you own in full is full color with the ban label (design
  decision 3).
- **Fill motion** (OWN-035): when the fill changes while the view is open (import in another tab),
  `clip-path` animates over `--dur-med` (220ms is over the 200ms cap, so use **180ms**) with
  `--ease-out`. It's instant under reduced motion and on first render.

## 8. Card dialog (OWN-014, OWN-041…045, SHARE-043)
Recommended in place of the inline expand (choice 8). It uses the same shell as Collection's
`app-card-dialog` (size, phone full screen, focus, Escape, `[` / `]` stepping through the deck's
tiles on desktop). The opener is the tile button with `aria-haspopup="dialog"`, so OWN-038's
`aria-expanded` turns into this (H-252).
```
┌ Lightning Rush                                       [‹][›] [✕] ┐
│ ┌──────────┐   Main Deck · 1 of 3 available                      │
│ │ full art │   (2 of 3 in this deck · Main Deck 2 of 2 ·          │
│ │ with the │    Sideboard 0 of 1)          ← only when split     │
│ │ same fill│                                                     │
│ └──────────┘   This deck                                          │
│ ⛔ Banned since  Owned for decks: 2 (1 more excluded from decks)   │
│   Nov 23, 2026  Locked by other decks: 1                          │
│                 Available to this deck: 1                          │
│                 This deck needs: 3                                 │
│                 Locked in by this deck: 3        (locked deck only)│
│                 Available … (1 extra)            (when extra > 0) │
│                                                                    │
│                 Your printings                                     │
│                 Counts toward this deck                            │
│                   OGN-012 ×1 ↗            (link to Collection, OWN-044)│
│                 Owned · excluded from decks                        │
│                   OGN-012a Foil ×1 · Collector                     │
│                 (or "You don't own this card", OWN-043)            │
│                                                                    │
│                 Other decks using this card                        │
│                   Jinx Aggro · needs 2 · Locked, holds 2 ↗         │
│                   Draven Midrange · needs 3 · Not locked ↗         │
│                 (or "No other deck uses this card.")               │
│                                                                    │
│                 Card                                               │
│                 Spell · Spell   Domains: Fury   Energy 2           │
│                 <rules text, verbatim, plain>                      │
└────────────────────────────────────────────────────────────────────┘
```
- The art shows the same `state` / `fill` as the tile, at `fullUrl` (OWN-016), alt = card name.
- Breakdown lines are the SHARE-043 strings word for word, built from `OwnershipCard`
  (`ownedForDecks`, `ownedExcluded`, `lockedByOthers`, `available`, `cardRequired`,
  `heldByThisDeck`, `extra`, `allocationByZone`).
- Printing rows (OWN-041): `printingsOwned` / `excludedPrintings` in the given order. Each row is
  "<printingCode> <variantLabel> ×N", or **"Printing not specified"** / **"Printing no longer found
  (<code>)"**. Excluded rows add " · <tag names>". Each row links to `/collection?q=<name>` (OWN-044;
  a deep link to the printing's dialog is a later nicety).
- Other decks (SHARE-043): `otherUses` in their given order. Each row links to `/decks/:id`, which
  closes the dialog.
- **Card** section (OWN-014, OWN-060): "`type` · `category`" ("Unknown" for `category: 'unknown'`),
  "Domains: Fury, Calm" / "Domains: Unknown" / "No domain", the non-null stats in the order Energy,
  Might, Cost, Power, then `text` as plain text with line breaks kept. Unknown card: only "Card no
  longer in the card data" (OWN-061).
- Ownership unavailable: the "This deck", printings and other-deck sections are replaced by one
  line, "Ownership unavailable: your collection could not be read."
- Keywords: hidden until the glossary exists (same rule as Collection §5.5).

## 9. Header actions and lock flow (SHARE-020…026, DECK-080…085)
| Action | Look | Rules |
|---|---|---|
| **Lock in** | filled primary, `lock` icon | `canLock()`. Disabled = `aria-disabled="true"` with focus kept, plus the visible reason line from `lockCheckMessage()` under the actions (choice 22), tied with `aria-describedby` |
| **Unlock** | outlined, `lock_open` icon | Only on a locked deck. No confirmation (SHARE-023). Works while ownership is unavailable (SHARE-053c). Disabled only when locks are unreadable (SHARE-061) |
| **Copy missing list** | outlined split button: main = copy (OWN-052); ▾ menu = "Copy as one list" (OWN-053, choice 19) | Hidden when nothing is missing or ownership is unavailable. "Missing list copied" snack |
| **⋯ More** (`more_vert`, "More actions") | menu | **Export deck**: "Copy deck list" and "Download .txt" (DECK-085) · **Duplicate** (DECK-084) · **Rename** (name, source, notes; DECK-081; choice 14) · divider · **Delete** (danger) |

**Lock in confirmation** (SHARE-021, a Material dialog like the other confirmations):
- Title: **Lock in 'Kennen Tempo'?**
- Body: **Its cards won't count toward your other decks until you unlock or delete it.**
- When other decks share cards: **2 other decks use some of these cards: Jinx Aggro, Draven
  Midrange** (3 names max, then "and 2 more").
- Buttons: **Cancel** (text) · **Lock in** (filled). Focus starts on Lock in. Escape = Cancel.
- After saving: the header badge appears, tiles switch to "… locked in", and a success snack bar
  says **"Kennen Tempo is locked in."** (choice 16). While saving: the button reads "Locking in…" and
  stays `aria-disabled`. A failed save shows the error notice **"Couldn't save the lock. Try
  again."** (SHARE-063) and nothing changes.
- **Unlock:** done at once, with the snack bar **"Kennen Tempo is unlocked. Its cards count toward
  your other decks again."** No Undo (re-locking needs `canLock` and a new `lockedAt`).

**Lock badge** in the header (SHARE-041): `lock` icon + **Locked** + muted "Locked in on Nov 23,
2026". Short: `warning` icon + **Locked · 2 cards short** in `--color-warning` on a warning outline;
the short tiles are partial or darkened by their holds. An unparseable `lockedAt` shows the badge
without the date (SHARE-030).

**Delete confirmation** (DECK-082, SHARE-024; copy depends on choice 15): title **Delete 'Kennen
Tempo'?**, body for a locked deck adds **Its locked cards will count toward your other decks
again.**, buttons Cancel · **Delete** (danger fill). After deleting: navigate to `/decks`, snack
"Deck deleted." with **Undo** for 10 s (DECK-083; the restored deck is unlocked). Focus goes to the
list's first tile, or to the empty state's Import deck button.

**Duplicate:** creates "<name> (copy)" (DECK-084), shows the snack "Deck duplicated." with **Open**,
and stays on the page.

**Card edits while locked** (SHARE-025): if RJ keeps card editing in scope (choice 14), the editor's
card controls are disabled with **"Unlock this deck to change its cards"**. Rename stays enabled.

**Shortfall warnings** (SHARE-034) live in Collection's confirmations, not on Decks: the Replace
import (IMP-050a) and the Undo confirmation (H-158 / H-060). They use one shared block,
`app-shortfall-warning` ([[Decks Components]] §10): a warning icon, one line per deck **"'Kennen
Tempo' (locked) will be 2 cards short. It stays locked."**, and after a confirmed Undo the notice
**"'Kennen Tempo' (locked) is now 2 cards short."** Note: `shortfallWarning()` returns the line
without " It stays locked." The block appends it, or H-060 fixes the helper.

## 10. Screen states
### Decks list
| # | State | What shows | IDs |
|---|---|---|---|
| L1 | Gate closed | Page header + `app-sign-in-panel` (as built). No FAB, no toolbar | OWN-066, SYNC-009 |
| L2 | Loading (> 200ms) | Count line placeholder, toolbar disabled, 6 skeleton tiles (art box + 3 text bars, `--color-surface-raised`, no shimmer), `aria-busy` on the list, a visually hidden "Loading your decks…" | — (spec silent) |
| L3 | Empty | As built: deck mark, **No decks yet**, **Import a deck list to see which of its cards you own.**, **Import deck** + **Tournaments**. No toolbar, no FAB | OWN-008 |
| L4 | Populated | Toolbar, count line, grid, FAB | OWN-001…006, OWN-094 |
| L5 | No match | `app-empty-state`: **No decks match these filters** + **Clear filters** (focus → search field). The count line reads "Showing 0 of 3 decks" | OWN-008 |
| L6 | Ownership unavailable | `role="alert"` banner **Ownership unavailable: your collection could not be read.** Tiles: no chip, line "Ownership unavailable", the Locked badge kept on locked decks. The ownership chips in the toolbar are disabled with the hint "Not available while ownership is unavailable" | OWN-062, OWN-065, SHARE-053 |
| L7 | Card data not loaded | Banner **Card data not loaded**. Tiles as in L6. Legend art falls back to the deck mark | OWN-063 |
| L8 | Locks unreadable | Banner **Locked decks could not be read; counts ignore locks.** No lock badges. The Lock filter is disabled | SHARE-061 |
| L9 | Ban data not loaded | Notice line (as Collection S9): **The ban list couldn't load, so ban status is unknown.** No ban flags on tiles | OWN-015 |
| L10 | Read-only deck | "Read-only" tag on that tile | DECK-091, OWN-064 |
| L11 | Another tab or device changed data | Recompute in place, keep the scroll position and focus (OWN-070/071) | OWN-070 |
| L12 | Just imported (H-253) | Dialog closes, the new deck is first (by `updatedAt`), snack **"Deck saved."** + **View deck** (choice 17) | OWN-094 |
| L13 | Unknown URL value | Notice line **1 filter value not found and was ignored** | (COLL-062 by analogy) |

### Deck detail
| # | State | What shows | IDs |
|---|---|---|---|
| D1 | Gate closed | Header with the back link only + sign-in panel (as built) | OWN-066 |
| D2 | Loading (> 200ms) | Back link, a title bar placeholder, 2 section skeletons (5 tiles each) | — |
| D3 | Deck not found | `app-empty-state`: **This deck isn't in your decks** · **It may have been deleted on another device.** · **Back to Decks** (choice 21) | — (spec silent) |
| D4 | Populated | §6–§8 | OWN-010…055 |
| D5 | Complete, unlocked | Lock in enabled; missing list reads **All cards available**; Copy missing list hidden | SHARE-020, OWN-051 |
| D6 | Incomplete | Lock in disabled + reason **Lock in needs every card available: 3 cards short** | SHARE-020 |
| D7 | Locked | Badge, "… locked in" labels, Unlock. Card-edit controls disabled if editing exists | SHARE-041, SHARE-025 |
| D8 | Locked and short | Warning badge **Locked · 2 cards short**; short tiles partial or darkened | SHARE-033, SHARE-041 |
| D9 | Empty deck (R = 0) | Summary **No cards to count**; every section "No cards in this zone"; Lock in disabled **Lock in needs at least one card** | OWN-050, SHARE-020 |
| D10 | Ownership unavailable | L6 banner; tiles full color, no labels; Lock in disabled **Ownership unavailable**; Unlock still works; aside shows only the banner sentence | OWN-062, OWN-065, SHARE-053 |
| D11 | Card data not loaded | Banner **Card data not loaded**; tiles are placeholders with stored names, full color, no labels | OWN-063 |
| D12 | Locks unreadable | L8 banner; Lock in disabled **Locked decks could not be read**; Unlock disabled | SHARE-061 |
| D13 | Ban data not loaded | L9 notice; per-tile label per choice 11 | OWN-015 |
| D14 | Read-only | Info banner **This deck was saved by a newer version of Rift Builder. You can view it, but not change it.** (choice 23); Lock in disabled **This deck is read-only**; Rename and Delete disabled; Copy and Export work | DECK-091, OWN-064 |
| D15 | Unknown card | Placeholder tile with the stored name, **Card no longer in the card data**, "0 of N available", darkened placeholder; in the missing list | OWN-061 |
| D16 | Preview card | **Preview** chip on the tile | OWN-017 |
| D17 | Deleted elsewhere while open | Switch to D3 with a polite status | — |
| D18 | Changed in another tab | Recompute in place; an open card dialog follows (or closes with **This card is no longer in this deck.**) | OWN-070/071 |

## 11. Interactions and keyboard
| Key | Where | Does |
|---|---|---|
| Tab | list page | skip link → header → **FAB** (OWN-094 f) → search → ownership chips → lock → filters → sort → active chips → tiles (each tile is a link, one stop each) |
| `/` | list page | focus search |
| Escape | search / dialog / menu | clear / close (focus returns to the opener) |
| Tab | detail page | back link → H1 (not focusable) → Rule check → Lock in → Copy → More → section bar links → **each section grid is one Tab stop** → aside |
| Arrow keys, Home / End | card grid | roving focus within the section (as Collection): ← → by one, ↑ ↓ by a row |
| Enter / Space | card tile | open the card dialog |
| `[` `]` | card dialog, desktop | previous / next card through the whole deck in section order |

## 12. Accessibility (WCAG 2.1 AA + 44px)
1. Ownership, lock, ban and legality are each text + icon, never color alone (OWN-033, SHARE-041).
2. Card tile button name (OWN-033, SHARE-044): "Lightning Rush, Main Deck, 1 of 3 available, also
   in 2 other decks, 1 locked, banned since Nov 23, 2026". Split cards include the full label.
   Unknown: "Zaun Warrens, Battlefields, card no longer in the card data, 0 of 1 available".
3. Text on or beside tiles ≥ 4.5:1 in every state. Icons, the fill divider and control edges ≥ 3:1
   (OWN-034). The none-state chip edge moves from `--color-border` (1.29:1, fails) to
   `--color-border-strong` (≥ 3.00:1).
4. **Darkened art must stay readable** (OWN-031): measure the printed card name on the darkened
   fixture art at 100% zoom in both themes. Today's `brightness(.55)` makes a dark card nearly merge
   with the dark page (seen on `/styleguide`, Void Gate). The tile keeps its 1px
   `--color-border-strong` frame in the none state so its edge is still visible.
5. Forced colors (OWN-037): the full part gets a solid `CanvasText` border, the darkened part a
   dashed one. The chip and icon carry the state.
6. Targets ≥ 44×44 on coarse pointers: toolbar controls, chips, section bar links, header actions,
   dialog buttons and the printing / other-deck rows in the dialog.
7. The section headings are `<h2>`, the dialog title `<h2>` and its sections `<h3>`. The section
   bar is a `<nav aria-label="Deck sections">`. The aside is `<aside aria-label="Summary and
   missing cards">`.
8. Status updates: the count line is `role="status"`; lock and copy results are snack bars (polite);
   banners are `role="alert"` once.
9. 320px and 200% zoom: one-column list, 2-column card grid (1 below 18rem), no sideways scroll
   except the section bar.
10. Reduced motion: no lift, no fill animation, no dialog movement.

## 13. Open choices for RJ
Each one has a recommended default; `builder` uses the defaults if RJ says "go with your
recommendations".

1. **Deck tile art.** SPEC-005 OWN-082 says the list has no card images; the H-251 request says
   "Legend art". Options: (a) text only, as the spec says; (b) Legend art with **that card's own**
   ownership treatment; (c) Legend art filled left to right by the deck's copies (A of R); (d)
   Legend art always in full color. **Recommended: (b).** Decks are recognized by their Legend, the
   art is the centrepiece, and it keeps the page rule "full color = you own it". (c) is pretty but
   reads as a progress meter (OWN-054).
2. **Ban flag on the deck tile.** (a) the legality label only; (b) add "N banned cards" and "1
   card banned from <date>". **Recommended: (b).** "Not legal in Standard today" doesn't say why, and
   a ban is the most common reason. Needs a count the engine doesn't return yet (§14).
3. **A visual bar for copies on the tile.** (a) text only, "34 of 66 copies available"; (b) a thin
   A/R bar. **Recommended: (a).** OWN-054 bans completion percentages, and a bar is one in all but
   name.
4. **List layout.** (a) a grid of tiles (3 / 2 / 1 columns); (b) a one-column list of rows.
   **Recommended: (a).** It matches the Collection grid and uses desktop width. Rows waste it with
   short text.
5. **Which filters ship.** (a) all of OWN-006 inline; (b) search + Ownership chips + Lock + Sort
   inline, with Legality and Source in a Filters menu; (c) search + sort only. **Recommended: (b).**
   Ownership is the page's job (SHARE-051); legality and source are rarer.
6. **Counts on the ownership chips** ("Ready to build 1"). (a) show; (b) hide. **Recommended:
   (a).** It answers "can I build anything?" without clicking. These are the user's own counts, not
   meta.
7. **Locked complete decks and "Ready to build".** SHARE-051 puts them in their own `locked`
   group, so "Ready to build" hides them. (a) keep the spec and add the "Locked decks are under
   Locked." hint; (b) count locked complete decks as Ready to build too. **Recommended: (a).** A
   locked deck is already built; "Ready to build" means "next to build".
8. **Card details: inline expand or dialog.** OWN-038/041 describe an expand with `aria-expanded`.
   (a) inline expand inside the grid; (b) a dialog like Collection's. **Recommended: (b).**
   Expanding a 150px tile in a 5-column grid reflows the whole section; the dialog has room, matches
   Collection and is already built. Needs an OWN-038/041 wording change.
9. **What's on the card tile face.** (a) the spec face: art, name, type, chip, shared line, ban
   label; (b) image only like Collection, everything else in the dialog. **Recommended: (a).**
   OWN-014 and SHARE-042 require them on the face, and in a deck the text is the point (what's
   missing), unlike Collection.
10. **Quantity badge ×N on deck tiles.** (a) hide at 1, as Collection does; (b) always show.
    **Recommended: (a).** The chip already says "1 of 1"; ×1 on every Legend and Champion is noise.
11. **"Ban status unknown" when the ban list didn't load.** OWN-015 puts it on every card. Today
    the ban list never loads in dev, so all 66 tiles would say it. (a) per tile, as the spec says;
    (b) one page notice, plus the tile's accessible name and the dialog. **Recommended: (b).** Same
    information, no wall of repeated text; it matches Collection S9.
12. **Desktop deck detail layout.** (a) one column, summary and missing list under the header; (b)
    sections on the left, a sticky aside with the summary and missing list on the right (≥ 64rem).
    **Recommended: (b).** The missing list stays in view while you scan the cards.
13. **Section jump bar.** (a) none; (b) a sticky bar with the six sections and their counts.
    **Recommended: (b).** A 66-card deck is long on phones, and the bar also shows the deck's
    shape.
14. **Editing in H-254.** DECK-080 (add / move / remove cards, quantities) has no design yet. (a)
    build the full editor now; (b) ship Rename (name, source, notes) only and brief the card editor
    later; (c) no editing. **Recommended: (b).** The core loop is read-only; the editor deserves its
    own brief.
15. **Delete copy.** DECK-082 says "This can't be undone." but DECK-083 offers Undo for 10 s. (a)
    keep the spec text; (b) drop "This can't be undone." and keep the Undo snack bar. **Recommended:
    (b).** The current text is false while Undo exists.
16. **Feedback after Lock in / Unlock.** (a) the badge change only; (b) also a snack bar ("… is
    locked in." / "… is unlocked. Its cards count toward your other decks again."), without Undo.
    **Recommended: (b).** Locking changes other decks' numbers out of sight, so say so.
17. **After an imported deck is saved** (H-253). (a) stay on the list, snack **"Deck saved."** with
    **View deck**; (b) open the new deck; (c) silent. **Recommended: (a).** OWN-094 says the page
    stays on Decks, and the action gives a quick path in.
18. **Missing list on phones.** (a) under the summary, collapsed above 10 lines (OWN-051); (b) at
    the end of the page. **Recommended: (a).** It's the answer people come for.
19. **"Copy as one list"** (OWN-053, SHOULD). (a) a second item in the Copy split button's menu;
    (b) defer. **Recommended: (a).** It's cheap, and shopping lists are usually merged.
20. **The MAY items:** the "Show ownership coloring" toggle (OWN-039) and sort within sections
    (OWN-013). **Recommended: defer both.**
21. **Deck not found** (spec silent). Copy: **This deck isn't in your decks** · **It may have been
    deleted on another device.** · **Back to Decks**. **Recommended: yes, as written.**
22. **Disabled Lock in.** (a) `aria-disabled` button plus a visible reason line; (b) hide the
    button; (c) tooltip only. **Recommended: (a).** The reason ("3 cards short") is useful, and
    tooltips don't work on touch.
23. **Read-only deck copy** (spec silent): **This deck was saved by a newer version of Rift Builder.
    You can view it, but not change it.** **Recommended: yes**, mirroring the Collection unreadable
    banner.
24. **Rule check.** OWN-010 wants the legality label to link to the full rule results, but there's
    no page for them. (a) a "Rule check" dialog listing failed rules (LEGAL-R07 messages) and banned
    cards (DECK-051 wording); (b) an inline expandable list in the header. **Recommended: (a).** It
    keeps the header short.
25. **Source URL on tournament decks** (OWN-010, DECK-072). Show "Source ↗" as a plain link with
    `rel="noopener noreferrer nofollow"` and the pilot name in the source line. **Recommended:
    yes.**
26. **Page lede.** Today it's "Decks you've imported. Cards you own are shown in full color.", but
    decks also come from Tournaments. (a) keep; (b) "Decks you want to build. Cards you own are shown
    in full color." **Recommended: (b).**
27. **Test data decks.** The three test decks (SPEC-013) have only a Main Deck, no Legend,
    Champion, Battlefields, Runes or Sideboard, so H-254 can't be checked on them (no Legend art,
    five empty sections). (a) extend the test decks to full 66-card shapes with one split card and
    one rune; (b) leave them. **Recommended: (a)**, as a small SPEC-013 + builder item before H-255.
28. **Fill animation on change** (OWN-035 MAY animate ≤ 200ms). (a) animate the clip at 180ms when a
    fill changes while the view is open; (b) always instant. **Recommended: (a).** It's the product's
    signature moment, and it's rare and short.

## 14. Spec gaps and contradictions (candidates for H-252)
1. **OWN-082 vs the H-251 request:** "no card images" on the list vs "Legend art" (choice 1).
2. **OWN-038 / OWN-041 "expand" with `aria-expanded`** vs the recommended dialog (choice 8).
3. **DECK-082 "This can't be undone."** contradicts **DECK-083 Undo** (choice 15).
4. **OWN-015 "Ban status unknown" on every card** is noisy while ban data is missing (choice 11).
5. **Wording drift between specs:** SHARE-061 "Locked decks could not be read; counts ignore
   locks." vs Collection's built "Locked decks couldn't be read, so locked copies aren't shown."; and
   OWN-062 / SHARE-020 use "could not" while the rest of the app uses contractions. Pick one style.
6. **Silent states:** loading, deck not found, read-only copy, lock save in progress, feedback after
   Lock in / Unlock / Duplicate / save, unknown URL filter values (no COLL-062 equivalent), a deck
   deleted while open.
7. **OWN-010 rule-results "link"** has no destination (choice 24).
8. **OWN-033 label is too long for a tile chip** when split ("2 of 2 available · 2 of 3 in this
   deck"): the brief splits it visually. The spec could name the two parts.
9. **Engine vs spec** (already filed as H-155 / H-060, listed so the UI isn't built on the old
   shape): `OwnershipFilter` has no `'unavailable'`; `computeDeckOwnership` sets `lock = null`
   whenever ownership is unavailable (OWN-065 wants the stored lock); `canLock(pool, deck,
   readOnly)` lacks `isLocked`; `shortfallWarning()` omits " It stays locked." (SHARE-034).
10. **Data the tile needs but `DeckTileSummary` lacks** (if choices 1 and 2 are accepted): the
    Legend's `imageUrl` / `state` / `fill`, banned and upcoming counts with the earliest upcoming
    date, and a `readOnly` flag. Either `summarizeDeck` grows these fields or the page builds a view
    model from the `DeckOwnershipView` it already computes. Recommended: new fields on
    `DeckTileSummary`, so the list and detail can't disagree (OWN-073).
11. **OWN-050 tile line** has "copies available" only; the chip names ("Ready to build" etc.) on
    the tile are new display text. Say so in OWN-002.
12. **OWN-084 / COLL-093** were written for long lists. With ≤ 200 decks and ≤ 150 entries the
    brief renders everything with `content-visibility`, which meets the rule; the spec could say a
    non-virtual list is fine below a size.
13. **SHARE-021** quotes the deck name with straight single quotes; the app uses curly quotes
    elsewhere (Collection "No cards match “zhonya”."). Decide once.

## 15. Acceptance points (for the H-255 review)
Checked at 1440, 1024, 768 and 375, dark and light, on the test decks (extended per choice 27) and
the styleguide samples.
1. **A1** The list shows every deck in `updatedAt` order. Each tile has a name, source line, chip
   or badge per the §4 table, copies line, legality, ban flag (if accepted), Updated date, and one
   link to the deck. No percentage, rank or meta anywhere.
2. **A2** Ownership chips filter by `ownershipFilter`. Lock is independent. URL `own`, `lock`,
   `legality`, `source`, `sort` round-trip. "Showing X of Y decks" and Clear filters work. No-match
   state per L5.
3. **A3** The deck detail shows six sections in Riot order with "N cards · M available"
   headings and "No cards in this zone" for empty ones.
4. **A4** Tiles show full / partial (divider at exactly `fill` of the width) / none art, and the
   chip, shared line and ban label match the engine's `label`, `sharedLabel`, `banStatus`. The
   accessible name follows §12.2.
5. **A5** The card dialog shows the SHARE-043 lines verbatim, the printing groups, other decks
   with links, and the card info. Unknown and unavailable variants per §8.
6. **A6** The summary and missing list match `view.summary` / `view.missing`. Copy missing list
   puts `missingText` on the clipboard and shows "Missing list copied". It's collapsed above 10 lines.
7. **A7** Lock in is enabled only when `canLock` is ok; otherwise the reason line shows. The
   confirmation copy is verbatim. Lock and Unlock update the header, labels, list tile and other
   decks without a reload.
8. **A8** States L1–L13 and D1–D18 render as specified.
9. **A9** Contrast: text ≥ 4.5:1, chip edges and icons ≥ 3:1 in both themes. The darkened art's
   printed name is legible at 100%. Targets ≥ 44px on phones. Keyboard per §11. Reduced motion
   rests.
10. **A10** FAB as built (OWN-094 AC 22 still passes). No console errors. `/styleguide` shows the
    deck tile (each chip row of the §4 table), the card tile (full, partial, none, split, shared,
    banned, unknown, preview, placeholder, battlefield) and the dialog.

## What I looked at (2026-11-25)
Running app on `dev` @ `6bc2e65` (port 4291, Auth + Firestore emulators, signed in as a test user,
Small test data loaded): `/decks` empty and with 3 decks (placeholder count line "3 decks saved.",
FAB), `/decks/:id` placeholder, `/collection` with the test data, `/styleguide` deck samples, at
1440 and 375, light and dark. Seen: the none-state chip edge is nearly invisible in dark (uses
`--color-border`); darkened art on the dark page loses its edge; the deck sample header already
has "Copy missing list" + "Edit"; the test decks are Main-only. Screenshots stayed in the session
scratchpad, not the repo.
