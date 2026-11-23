---
tags: [spec]
id: SPEC-005
version: 0.2
status: draft
depends_on: [SPEC-001, SPEC-002, SPEC-004, SPEC-006, SPEC-007]
research: ["[[Ban List]]", "[[Deck Construction Rules]]", "[[Card Data & Images]]", "[[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]]", "[[2026-11 RC Europe - 5 - CTCG DZiden - Kai'Sa]]"]
decisions: ["[[ADR-0003 Tournament Results Only]]", "[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-007
as_of: 2026-11-23
---
# SPEC-005: Your Decks Ownership View

## Summary
- **Purpose:** the **Decks** screen. Lists the user's decks (Deck Import or "Add to your decks")
  and shows each deck card by card with full card info, ban status, and how many copies the user
  owns for decks: **full colour** (owned ≥ required), **darkened but readable** (0 owned), or a
  **left-to-right partial colour fill** of owned / required (ADR-0006).
- **Key requirements:** deck list and tiles OWN-001…008; deck view and card info OWN-010…017;
  ownership and **zone allocation** OWN-020…027; visuals and accessibility OWN-030…039; grouping and
  printing expand OWN-040…045; deck summary and missing list OWN-050…055; unknown data OWN-060…064;
  recalculation OWN-070…073; performance OWN-080…083; display rules and neutrality OWN-090…093.
- **Ownership rule:** per deck, per `cardKey`: the pool is SPEC-007 `deckOwnership(input, cardKey).ownedForDecks`
  (COLL-081; printings with an "exclude from decks" tag never count). The pool is shared across zones and
  allocated in Riot decklist order, Main before Sideboard: **Legend → Champion → Main → Battlefields → Runes
  → Sideboard** (OWN-022). Sections are shown in the same order (OWN-011, ADR-0006 "Your decks view decisions").
- **Legality label:** same labels as SPEC-004 CAT-045 and SPEC-006 DECK-051, format name from
  `FormatDef.name` per SPEC-002 LEGAL-R08: "Legal in Standard as of Nov 23, 2026", "Not legal in Standard
  today", "Not fully checked" (OWN-004).
- **Shared types:** reads `UserDeck`, `DeckCard`, `DeckZone`, `DeckSource` (SPEC-006), `DeckOwnershipInput`,
  `DeckOwnership`, `CollectionCatalogView`, `StoredTags`/`Tag` (SPEC-007), `BanStatus`, `LegalityResult`,
  `FormatDef` (SPEC-002), `PlayableCard`, `Printing` (SPEC-001). Defines `computeDeckOwnership()` →
  `DeckOwnershipView`, `OwnershipCard`, `DeckTileSummary`. Excluding tag names come from
  `DeckOwnershipInput.tags` (SPEC-007 `TagStore`).
- **Depends on:** SPEC-001 v0.3, SPEC-002 v0.3, SPEC-004 v0.4, SPEC-006 v0.3, SPEC-007 v0.3. Nothing is
  stored by this spec; everything is computed on display.
- **Blocked / open:** foil as its own printing (SPEC-007 open question 1, H-020); card image aspect
  ratio and battlefield orientation in the API (OWN-081). Unknown card = 0 owned is a Claude default RJ
  may change (Open questions).

## Purpose
Decks is the screen where a user sees how close they are to building the decks they want. A deck is a
community or tournament list the user may not own at all ([[ADR-0006 Two Imports - Collection and Decks]]).
For every card it shows the card itself (art, name, type, domains, stats, rules text), its ban status,
and how many copies the user owns that may go into decks, using a colour treatment RJ defined: full
colour, darkened, or partly coloured from the left.

This spec owns the Decks list, the deck view and the pure ownership computation. Importing and
editing decks is SPEC-006 ([[Deck Import]]); the owned-card list, tags and the "exclude from decks"
flag are SPEC-007 (the Collection screen, [[My Collection]]); legality and `banStatus()` are SPEC-002 ([[Deck Legality]]);
card fields are SPEC-001 ([[Card Data Model]]).

## Definitions
- **Deck**: a SPEC-006 `UserDeck`. Its zones, in Riot decklist order, are `legend`, `champion` (single
  slots), `main` (excludes the Chosen Champion), `battlefields`, `runes`, `sideboard`. Entries are `DeckCard { cardKey, name, qty }`,
  merged per zone (DECK-021), never by printing (DECK-096).
- **Zone entry**: one `DeckCard` in one zone. A `cardKey` appears at most once per zone, but may appear in
  several zones (e.g. Main and Sideboard).
- **Required (zone)**: the zone entry's `qty`. **Required (card)**: Σ `qty` of that `cardKey` over all six
  zones of the deck.
- **Ownership input**: the SPEC-007 `DeckOwnershipInput` (collection, tags, printing codes, catalog as
  `CollectionCatalogView`), passed unchanged to `deckOwnership(input, cardKey)` (COLL-081).
- **Pool**: `ownedForDecks` from SPEC-007 `deckOwnership(input, cardKey)` (COLL-081) = copies of the card's
  printing, unassigned and missing-printing entries that carry **no** excluded tag. 0 when the card is not
  in the collection, and 0 for an unknown card (OWN-061).
- **Excluded copies**: `ownedExcluded` from COLL-081. Shown, never counted.
- **Allocated (zone)**: the copies of the pool assigned to one zone entry by OWN-022.
- **Fill**: `min(allocated, required) / required`, a number in [0, 1], exact (1/3 is 0.3333…, not 0.33).
- **State**: `full` (fill = 1), `partial` (0 < fill < 1), `none` (fill = 0).
- **Card tile**: one zone entry as shown in the deck view: one tile per `cardKey` per zone, never one per
  copy and never one per printing (ADR-0006 H-036 #5).
- **Deck tile**: one deck in the Decks list.
- **Today**: the local calendar date, used as `asOf` for `banStatus()` and legality (SPEC-002 LEGAL-R02).
- **Unknown card**: a `cardKey` in the deck that the current catalog does not contain (DECK-088).

## Design decisions (summary)
1. **Ownership is per deck total by `cardKey`; the display is per zone from one shared pool.** A card in
   Main ×2 and Sideboard ×1 needs 3 copies in total, because a physical deck with a sideboard holds all 3
   at once. Showing each zone against the full pool would show both zones as full with 2 copies and
   overstate ownership. So the pool is allocated zone by zone in a fixed order, and the card-level label
   always shows the deck total ("2 of 3 owned in this deck").
2. **Allocation order Legend → Champion → Main → Battlefields → Runes → Sideboard** (RJ, ADR-0006 "Your
   decks view decisions": main deck first, the sideboard shows what remains; sections follow Riot's
   decklist order). It fills what a legal game needs first (Legend and Chosen Champion are mandatory
   single cards; Main is the 40) and the optional Sideboard last. In practice only Champion/Main/Sideboard
   can share a `cardKey` (runes, battlefields and legends are other categories), so the order between
   Battlefields and Runes never changes a result; it follows the display order so one list
   (`ZONE_ORDER`) serves both and the function is fully deterministic.
3. **Darkening is for ownership only.** Ban status is a label and icon, never a dim or a fill, so a
   banned card the user owns in full is shown in full colour with a ban label.
4. **Only the card image is darkened.** Text the app renders (name, counts, type, ban label, rules text)
   is never darkened, so a missing card stays readable.
5. **Copies above required are not shown on the tile face** (label caps at "3 of 3 owned"); the expand
   says how many extra copies the user has for decks.
6. **Counts, no percentages.** The summary uses copy and card counts. There is no completion %, score,
   rank or comparison with other users or the meta (ADR-0003).

## Requirements
### A. Decks list
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-001 | MUST | The Decks screen lists **every** `UserDeck` in the `DeckStore` (SPEC-006 DECK-090): decks imported with Deck Import and decks added from Tournaments with "Add to your decks" (DECK-060). Tournament Top 8 decks the user has not added are **not** listed. | [[ADR-0006 Two Imports - Collection and Decks]] ("Your decks", follow-up decisions); [[Deck Import]] DECK-060, DECK-090 |
| OWN-002 | MUST | Each deck tile shows: deck **name**; **source** line (OWN-003); **legality verdict** label (OWN-004); **ownership summary** "`<allocated>` of `<required>` copies owned for decks" (OWN-050); and "Updated `<date>`" (`updatedAt`, local date, OWN-090). Clicking the tile opens the deck view. | [[ADR-0006 Two Imports - Collection and Decks]]; board H-007 |
| OWN-003 | MUST | Source line: for `source.kind === 'tournament'`: "`<placingLabel>`, `<eventName>` · `<eventStartDate>` – `<eventEndDate>`" (one date when equal; values verbatim, DECK-061), e.g. "1st, Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026". For `kind: 'user'`: the source text if any, else the URL as **plain text** (no fetch, no favicon, DECK-072), else "Imported". Wording stays neutral (no "top deck", "best", "meta"). | [[Deck Import]] DECK-061, DECK-071, DECK-072; [[Tournament Deck Catalog]] CAT-035, CAT-037 |
| OWN-004 | MUST | Legality label from SPEC-002 evaluation of the deck (`toDeckInput`, `format`, region `global`, `asOf` = today), with **the same labels as SPEC-004 CAT-045 and SPEC-006 DECK-051**, rendered per SPEC-002 LEGAL-R08: `<format>` is the `FormatDef.name` of `deck.format` (**"Standard"** for `standard`; the id is never shown) and `<asOf>` uses the OWN-090 date format. Checked in this order: `illegal` → **"Not legal in `<format>` today"**; `incomplete` → **"Not fully checked"** (DECK-052; never shown as legal or with a legal colour/icon, LEGAL-R04); `legal` → **"Legal in `<format>` as of `<asOf>`"**, e.g. "Legal in Standard as of Nov 23, 2026". The CAT-045 historical label does not apply: a user deck is always checked as of today. If legality cannot be computed (catalog, ban or format data not loaded, so no `LegalityResult` or no `FormatDef`) the label is "Not fully checked". The verdict is computed on display, never stored (DECK-055). | [[Deck Legality]] LEGAL-R02, LEGAL-R04, LEGAL-R08, `FormatDef`; [[Tournament Deck Catalog]] CAT-045; [[Deck Import]] DECK-051, DECK-052, DECK-055; [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7 |
| OWN-005 | MUST | Default order: `updatedAt` descending (most recently changed first); ties by `createdAt` descending, then `id`. | design rule |
| OWN-006 | SHOULD | Sort options: Last updated (default), Name A–Z (SPEC-007 COLL-034 name comparison), Date added (`createdAt`, newest first). Filters: text search on deck name (case- and accent-insensitive substring); legality (verdict `legal` / `illegal` / `incomplete`, options labelled with the OWN-004 labels without the date: "Legal in Standard", "Not legal in Standard today", "Not fully checked"); source (Imported / From Tournaments); ownership (All owned / Partly owned / None owned, by the deck's summary). Sort and filters are reflected in the URL query (e.g. `?sort=name&legality=legal`). | design rule |
| OWN-007 | MUST NOT | The list offers no sort, filter, badge or label based on meta or community data: no play rate, win rate, popularity, tier, "trending", or comparison with other users' ownership. | [[ADR-0003 Tournament Results Only]] |
| OWN-008 | MUST | Empty state (no decks): "No decks yet" with links to **Import → Deck Import** and **Tournaments**. A filter with no matches shows "No decks match these filters" and a "Clear filters" action. | design rule |

### B. Deck view and card info
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-010 | MUST | The deck view header shows the deck name, source line (OWN-003; for tournament decks also the pilot and a plain link to `sourceUrl`), the legality label (OWN-004) with a link to the full SPEC-002 rule results, the deck summary (OWN-050), and actions Edit, Export (DECK-085), Duplicate, Delete (SPEC-006 section I). | [[Deck Import]] DECK-080…085; [[Deck Legality]] |
| OWN-011 | MUST | Zones are shown as sections in **Riot's decklist order**: **Legend, Chosen Champion, Main Deck, Battlefields, Runes, Sideboard** (the same order as the DECK-085 export and pasted Riot lists). Each heading shows its card count and its owned count, e.g. "Main Deck · 39 cards · 12 owned". Every section is shown; an empty one says "No cards in this zone". | [[ADR-0006 Two Imports - Collection and Decks]] "Your decks view decisions"; [[Deck Import]] (zones), DECK-085; [[Deck Construction Rules]] |
| OWN-012 | MUST | Within a section, card tiles are in the deck's **stored order** (as imported). | [[Deck Import]] DECK-085 (stored order); design rule |
| OWN-013 | MAY | A per-view control sorts tiles within each section by name or by cost (`stats.energy`, nulls last); it does not change the stored deck. | design rule |
| OWN-014 | MUST | **Every** card tile shows, whatever the ownership state: image (OWN-016), canonical name (from the catalog, DECK-088), `type` verbatim and `category`, domains, the non-null stats (energy, might, cost, power), and its rules text (`text`, verbatim, plain text). Name, counts, type and ban label are visible on the tile face; rules text MAY be in a details area opened from the tile, but MUST be reachable for every card. | [[ADR-0006 Two Imports - Collection and Decks]] ("every card … with all its information … whether or not the user owns it"); [[Card Data Model]] CARD-015, CARD-028 |
| OWN-015 | MUST | **Ban status on every card** from SPEC-002 `banStatus(cardKey, deck.format, 'global', today)` (LEGAL-B10), never re-derived: `banned` → label "Banned since `<bannedSince>`" (e.g. "Banned since Nov 23, 2026") with an icon; `upcoming` → "Banned from `<effective>`"; `not-banned` → no label; ban data not loaded → "Ban status unknown" (never "not banned"). Same wording as SPEC-007 COLL-008/009. The ban label never changes the ownership colouring (design decision 3). | [[ADR-0006 Two Imports - Collection and Decks]]; [[Deck Legality]] LEGAL-B10; [[My Collection]] COLL-008, COLL-009 |
| OWN-016 | MUST | The tile image is the card's `defaultPrintingId` printing (SPEC-001 CARD-016), regardless of which printings the user owns, `art.thumbnailUrl` on the tile and `art.fullUrl` in the details view, loaded from the Riot URLs (CARD-005). A missing URL shows a text placeholder with the card name. | [[ADR-0006 Two Imports - Collection and Decks]] "Your decks view decisions"; [[Card Data Model]] CARD-005, CARD-016 |
| OWN-017 | SHOULD | A preview card (`isPreview === true`) carries a "Preview" label. | [[Card Data & Images]] #3; [[My Collection]] COLL-005 |

### C. Ownership computation and zone allocation
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-020 | MUST | Ownership is per **`cardKey`** across all printings and variants (ADR-0005 decision 2, H-036 #5). The pool for a card is **`deckOwnership(input, cardKey).ownedForDecks`** (SPEC-007 COLL-081), where `input` is the SPEC-007 `DeckOwnershipInput` passed through unchanged; this spec never reads `quantity` directly and never re-implements tag logic. Copies carrying an "exclude from decks" tag (`ownedExcluded`) never count. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5, #6 and Note; [[My Collection]] COLL-003, COLL-081 |
| OWN-021 | MUST | A card's requirement is the **deck total**: Σ `qty` of its `cardKey` over all six zones. A card is **fully owned** when pool ≥ card required. | design rule (design decision 1) |
| OWN-022 | MUST | **Allocation.** For each `cardKey`, the pool is assigned to its zone entries in zone order **legend, champion, main, battlefields, runes, sideboard** (`ZONE_ORDER`, the OWN-011 section order; Main before Sideboard): `allocated(zone) = min(remaining, qty)`, then `remaining −= allocated(zone)`. The result is deterministic and the same in every view (tile, section heading, summary, missing list). | [[ADR-0006 Two Imports - Collection and Decks]] "Your decks view decisions" (main deck first; sideboard shows what remains); design decision 2 |
| OWN-023 | MUST | Per tile: `fill = allocated / qty` (exact, 0..1); `state` = `full` if `allocated = qty`, `none` if `allocated = 0`, else `partial`. | [[ADR-0006 Two Imports - Collection and Decks]] (1 of 3 → ⅓, 1 of 2 → ½, 2 of 3 → ⅔) |
| OWN-024 | MUST | `extra = max(0, pool − card required)`: copies for decks above what this deck needs. Not shown on the tile face; shown in the expand (OWN-042). | design rule (design decision 5) |
| OWN-025 | MUST | The computation is a **pure function** `computeDeckOwnership(deck, ownership, catalog, banData, today)` (Data contract): same inputs, same output; no network calls, no storage writes, no clock reads (today is an input). | [[Deck Legality]] LEGAL-R01 (same principle); design rule |
| OWN-026 | MUST | Ownership is **never stored**: not in the `UserDeck` (DECK-096), not in a cache that outlives the inputs it was computed from. | [[Deck Import]] DECK-096; [[ADR-0006 Two Imports - Collection and Decks]] |
| OWN-027 | MUST | Ownership never changes the deck: a missing card is never removed, replaced or marked in the stored deck. | design rule |

### D. Ownership visuals and accessibility
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-030 | MUST | `full`: the card image in **full colour**, no overlay. | [[ADR-0006 Two Imports - Collection and Decks]] |
| OWN-031 | MUST | `none`: the card image **darkened/faded but still readable**: default treatment grayscale 100 % and brightness 55 % (design tokens; the H-023 design direction may tune them), such that the name printed on the card image stays legible at 100 % zoom. App-rendered text on the tile is not darkened (OWN-034). | [[ADR-0006 Two Imports - Collection and Decks]] ("darkened/faded but still readable") |
| OWN-032 | MUST | `partial`: the **left** `fill × 100 %` of the image width is in full colour, the rest has the `none` treatment. The split is a straight vertical edge at exactly `fill` of the width (not rounded to steps), with a 1 px light divider line so the edge is visible on dark art. The fill always runs **left to right**, also in right-to-left page layouts. | [[ADR-0006 Two Imports - Collection and Decks]] follow-up decisions ("left to right") |
| OWN-033 | MUST | **Not colour alone.** Every tile shows a text label of the deck-level count for that zone entry, "`<allocated>` of `<qty>` owned" (e.g. "1 of 3 owned", "0 of 2 owned", "3 of 3 owned"), plus a state icon (full: check; partial: half circle; none: empty circle). The tile's accessible name includes name, zone, count label and ban label, e.g. "Lightning Rush, Main Deck, 1 of 3 owned". When the card's copies are split across zones, the label adds the card total, e.g. "0 of 1 owned · 2 of 3 in this deck". | design rule (WCAG 2.2 SC 1.4.1 Use of Color) |
| OWN-034 | MUST | Text the app renders on or beside a tile (name, counts, type, domains, stats, ban label, rules text) meets **4.5:1** contrast against its background in every state; the darkened treatment applies to the image only. Icons and the fill divider meet **3:1** (non-text contrast). | design rule (WCAG 2.2 SC 1.4.3, 1.4.11) |
| OWN-035 | MUST | With `prefers-reduced-motion: reduce`, fill and state changes apply instantly. Otherwise a change MAY animate for at most 200 ms. Nothing flashes. | design rule (WCAG 2.2 SC 2.3.3) |
| OWN-036 | MUST | A placeholder tile (missing image, unknown card) gets the same fill treatment on its placeholder surface, so state is still visible. | design rule |
| OWN-037 | SHOULD | Windows High Contrast / `forced-colors: active`: the image treatment may be lost, so the count label, icon and a visible border on the coloured part (solid) vs. the darkened part (dashed) carry the state. | design rule |
| OWN-038 | MUST | Tiles and their expand controls are keyboard reachable in reading order; focus is visible; the expand control is a button with `aria-expanded`. | design rule (WCAG 2.2 SC 2.1.1, 2.4.7) |
| OWN-039 | MAY | A view toggle "Show ownership colouring" off shows every image in full colour, keeping labels and icons. | design rule |

### E. Grouping by card name and printing expand
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-040 | MUST | One tile per `cardKey` per zone, showing the zone's required quantity (e.g. `×3`). Copies are never shown as separate tiles, and printings never split a tile. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5 |
| OWN-041 | MUST | Each tile can **expand** to show the card's owned entries from `deckOwnership(input, cardKey).entries` in their given order (`printingSortKey`, COLL-081), in two groups: **"Counts toward this deck"** (entries with `excluded = false`) and **"Owned · excluded from decks"** (entries with `excluded = true`, with the names of their excluding tags). Tag names are looked up from the same `DeckOwnershipInput.tags` (SPEC-007 `StoredTags`, loaded through the `TagStore`, COLL-070): each `excludedByTagIds` id is shown as that `Tag.label`, in `excludedByTagIds` order, joined by ", " (e.g. "· Collector"); an id with no matching `Tag` is not shown. Each row shows printing code (or "Printing not specified" for unassigned copies, "Printing no longer found (`<code>`)" for missing-printing entries), variant label when known, and the count (`×N`). Excluded rows are visually separate and never add to any count. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5, #6; [[My Collection]] COLL-012, COLL-014, COLL-070, COLL-080, COLL-081 |
| OWN-042 | MUST | The expand also shows the card-level line "You own `<pool>` for decks; this deck needs `<card required>`" plus "(`<extra>` extra)" when `extra > 0`, "(`<ownedExcluded>` more excluded from decks)" when `ownedExcluded > 0`, and the allocation per zone when the card is in more than one zone, e.g. "Main Deck 2 of 2 · Sideboard 0 of 1". The expand content is the same from every zone tile of that card. | design rule (OWN-022, OWN-024) |
| OWN-043 | MUST | A card the user does not own at all expands to "You don't own this card" (plus any excluded rows). | design rule |
| OWN-044 | SHOULD | Each printing row links to that entry in Collection (SPEC-007), so the user can change tags or counts there. Decks itself never edits the collection or tags. | [[My Collection]]; design rule |
| OWN-045 | MAY | The expand state is kept per deck for the browser session; it is not persisted. | design rule |

### F. Deck-level summary and missing list
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-050 | MUST | Deck summary: "`<A>` of `<R>` copies owned for decks", where `R` = Σ qty over all zone entries and `A` = Σ allocated (= Σ over cards of `min(pool, card required)`); and "`<F>` of `<C>` cards fully owned", where `C` = number of distinct `cardKey`s in the deck and `F` those with pool ≥ card required (OWN-021). When any deck card has `ownedExcluded > 0`, add "`<X>` copies excluded from decks" (Σ `min(ownedExcluded, card required − allocated card total)`, i.e. excluded copies that would have filled a gap). | [[ADR-0006 Two Imports - Collection and Decks]]; board H-007 |
| OWN-051 | MUST | **Missing list:** every zone entry with `allocated < qty`, quantity `qty − allocated`, grouped by zone in the deck view section order, each line "`<missing>` `<canonical name>`". Shown below the summary, collapsed by default when it has more than 10 lines. "All cards owned" when empty. | board H-007; design rule |
| OWN-052 | MUST | **Copy missing list** puts Riot-style text on the clipboard in the SPEC-006 DECK-085 layout (labels `Legend:`, `Champion:`, `Main Deck:`, `Battlefields:`, `Rune Pool:`, `Sideboard:` in that order, one blank line between sections, `<qty> <canonical name>` lines in stored order, empty sections omitted, `\n` line endings), so it can be pasted into Deck Import or another tool. Confirmation "Missing list copied". | [[Deck Import]] DECK-085; [[Collection Import Formats]] fact 1 |
| OWN-053 | SHOULD | A second copy option "Copy as one list" merges the missing list per `cardKey` (`<total missing> <name>`, deck order of first appearance, no section labels). | design rule |
| OWN-054 | MUST NOT | No completion percentage, score, progress ranking, or comparison against other users, the meta or tournament results is shown or computed. | [[ADR-0003 Tournament Results Only]]; design decision 6 |
| OWN-055 | MUST NOT | The missing list has no prices, shop or buying links. | Out of scope; design rule |

### G. Unknown data
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-060 | MUST | **Null means Unknown** (SPEC-001 CARD-029): `domains: null` → "Domains: Unknown" (`[]` → "No domain"); `category: 'unknown'` → category "Unknown" with the verbatim `type`; null `isChampionUnit`, `championTag`, `isSignature`, `isPreview` are shown as Unknown where displayed (CARD-026, CARD-027). Stats are different: CARD-028 stores `null` when a stat is absent, so a null stat is omitted, not shown as Unknown. | [[Card Data Model]] CARD-026, CARD-027, CARD-028, CARD-029 |
| OWN-061 | MUST | **Unknown card** (cardKey not in the current catalog, DECK-088): a placeholder tile with the stored `DeckCard.name`, the flag **"Card no longer in the card data"**, no image, no card info, ban status from `banStatus()` by `cardKey` as for any card, and ownership **0** (state `none`, pool 0, no expand rows). It counts in `R` and in the missing list. | [[Deck Import]] DECK-088; [[Card Data Model]] CARD-033 (a lookup with no exact key returns "not found"; no fuzzy or alias fallback), CARD-012 (`cardKey` = key of the canonical name); [[Deck Legality]] LEGAL-019; [[ADR-0006 Two Imports - Collection and Decks]] "Your decks view decisions" (0 owned, placeholder tile) |
| OWN-062 | MUST | If the collection cannot be read (SPEC-003 store unreadable or newer version, COLL-071), or the `StoredTags` from the `TagStore` cannot be read (so exclusions are unknown and a `DeckOwnershipInput` cannot be built), the deck view still shows every card with info and ban status, all tiles in full colour without count labels, and a banner "Ownership unavailable: your collection could not be read." No tile is darkened on missing data. | design rule |
| OWN-063 | MUST | If the catalog is not loaded, tiles show stored names only and the banner "Card data not loaded" is shown. `DeckOwnershipInput.catalog` (a `CollectionCatalogView`) is required by COLL-081, so ownership is not computed: tiles are shown as in OWN-062 (full colour, no count labels, nothing darkened). | [[My Collection]] COLL-081, `DeckOwnershipInput`; design rule |
| OWN-064 | MUST | A deck record shown read-only by DECK-091 (newer schema) is still shown with ownership; edit actions are disabled. | [[Deck Import]] DECK-091 |

### H. Recalculation
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-070 | MUST | The view recomputes when any input changes: the deck, the collection (import, quantity edit), tags or a tag's "exclude from decks" flag (COLL-084), printing codes, the catalog (`catalogVersion`), ban data (`dataVersion`), format data (`FormatsFile.dataVersion`), or today's date. No re-import or reload is needed. | [[My Collection]] COLL-084; [[ADR-0006 Two Imports - Collection and Decks]] |
| OWN-071 | SHOULD | Changes made in another browser tab (storage events) are picked up within 1 s while the view is open. | design rule |
| OWN-072 | SHOULD | When the date changes while the view is open, ban status and legality update on the next focus or visibility change. | [[Deck Legality]] LEGAL-R02 |
| OWN-073 | MUST | Deck tiles in the list use the same function, so a tile's summary always equals the deck view's summary for the same inputs. | design rule |

### I. Performance
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-080 | MUST | `computeDeckOwnership` for the largest allowed deck (150 entries, 300 copies, DECK-092) finishes in under 20 ms, and the list of 200 decks (DECK-092) computes all tile summaries in under 300 ms on a mid-range laptop. | [[Deck Import]] DECK-092; design rule |
| OWN-081 | MUST | Card images lazy-load (only tiles near the viewport request images) inside a box with **reserved aspect ratio**, so the layout does not shift when they load. Default ratio 63:88 (portrait). BLOCKED: needs research: the image dimensions the Riot API returns and whether battlefield images are landscape; until then every image is fitted (`contain`) into the 63:88 box. | [[Card Data & Images]]; design rule (no layout shift) |
| OWN-082 | MUST | The Decks list shows no card images, only text tiles. | design rule |
| OWN-083 | SHOULD | Recomputation reuses unchanged inputs (e.g. one `deckOwnership(input, cardKey)` call per `cardKey` per `DeckOwnershipInput`), but results are never persisted (OWN-026). | design rule |

### J. Shared display rules and neutrality
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-090 | MUST | Every date shown is `MMM D, YYYY` with an English short month, e.g. `Nov 23, 2026`; event ranges as in CAT-037. Stored data stays ISO. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7; [[Tournament Deck Catalog]] CAT-037 |
| OWN-091 | MUST | An `incomplete` legality result is labelled **"Not fully checked"** everywhere in this spec. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7; [[Deck Legality]] LEGAL-R04 |
| OWN-092 | MUST | Card names, types and rules text are shown verbatim from the catalog; no Riot logos (Current State constraints). | [[Card Data Model]] CARD-031; [[Riot Developer Rules]] |
| OWN-093 | MUST | Nothing on this screen is sent to a server: decks, collection and ownership stay in the browser. | [[ADR-0005 MVP Product Defaults]] #1; [[Deck Import]] DECK-090 |

## Data contract
```ts
// shapes only; no implementation
import type { UserDeck, DeckCard, DeckZone, DeckSource } from './deck-import';   // SPEC-006 v0.3
import type {
  DeckOwnership, DeckOwnershipInput, CollectionCatalogView, StoredTags, Tag, TagId,
} from './my-collection';                                                       // SPEC-007 v0.3, COLL-081
import type { BanStatus, BanListFile, LegalityResult, FormatDef } from './deck-legality'; // SPEC-002 v0.3
import type { PlayableCard, Printing, CardCategory } from './card-data-model';   // SPEC-001 v0.3
type CardKey = string;
type IsoDate = string;                       // 'YYYY-MM-DD'

// Riot decklist order (ADR-0006 "Your decks view decisions"): the display section order (OWN-011)
// and the allocation order (OWN-022) are this one list.
const ZONE_ORDER: DeckZone[] = ['legend', 'champion', 'main', 'battlefields', 'runes', 'sideboard'];

// ---- Inputs ----
// SPEC-007 types are reused unchanged: DeckOwnershipInput { collection, tags, printingCodes, catalog },
// CollectionCatalogView { catalogVersion, sets, cards, printings }, and
// deckOwnership(input: DeckOwnershipInput, cardKey: CardKey): DeckOwnership (COLL-081).
type CollectionOwnership =
  | { status: 'ok'; input: DeckOwnershipInput } // input.catalog is the same snapshot as `catalog` below
  | { status: 'unavailable' };                  // collection or tags unreadable (OWN-062), or catalog not loaded (OWN-063)

// computeDeckOwnership(deck, ownership, catalog, banData, today): DeckOwnershipView
//   deck: UserDeck; ownership: CollectionOwnership; catalog: CollectionCatalogView | null (null = not loaded, OWN-063);
//   banData: BanListFile | null (null = not loaded → ban 'unknown'); today: IsoDate.
//   Pure (OWN-025). For each distinct deck cardKey: deckOwnership(ownership.input, cardKey) when status 'ok'
//   (an unknown card, OWN-061, is 0 without a call). Excluding tag names: Tag.label looked up by TagId in
//   ownership.input.tags.tags (StoredTags from the SPEC-007 TagStore, OWN-041).
//   Ban status per card via SPEC-002 banStatus(cardKey, deck.format, 'global', today).

// ---- Output ----
type OwnershipState = 'full' | 'partial' | 'none';
type CardBan = BanStatus | { status: 'unknown' };   // 'unknown' = ban data not loaded (OWN-015)

interface OwnedPrintingRow {                  // from DeckOwnership.entries (OWN-041)
  kind: 'printing' | 'unassigned' | 'missing-printing';
  printingId: string | null;
  printingCode: string | null;
  variantLabel: string | null;
  count: number;
  excludedByTagIds: TagId[];                  // [] in printingsOwned
  excludedByTagNames: string[];               // Tag.label per id from input.tags (OWN-041); ids with no Tag dropped
}

interface OwnershipCard {                     // one tile = one cardKey in one zone (OWN-040)
  cardKey: CardKey;
  zone: DeckZone;
  name: string;                               // catalog canonical name, else DeckCard.name (DECK-088)
  required: number;                           // this zone's qty
  allocated: number;                          // OWN-022, 0..required
  fill: number;                               // allocated / required, exact, 0..1 (OWN-023)
  state: OwnershipState;
  label: string;                              // '1 of 3 owned' (OWN-033)
  // card-level (same on every zone tile of this cardKey)
  cardRequired: number;                       // Σ qty over all zones (OWN-021)
  ownedForDecks: number;                      // pool, deckOwnership(input, cardKey) (COLL-081); 0 for unknown card or unavailable ownership
  ownedExcluded: number;                      // COLL-081; never counted
  extra: number;                              // max(0, ownedForDecks − cardRequired) (OWN-024)
  allocationByZone: Partial<Record<DeckZone, { allocated: number; required: number }>>;
  printingsOwned: OwnedPrintingRow[];         // excluded = false, printingSortKey order
  excludedPrintings: OwnedPrintingRow[];      // excluded = true ('Owned · excluded from decks')
  banStatus: CardBan;
  card: PlayableCard | null;                  // null = unknown card or catalog not loaded
  imageUrl: string | null;                    // defaultPrintingId art.thumbnailUrl (OWN-016)
  flags: ('unknown-card' | 'preview')[];
}

interface ZoneSection {
  zone: DeckZone;
  cards: OwnershipCard[];                     // stored order (OWN-012)
  required: number;                           // Σ qty
  allocated: number;                          // Σ allocated
}

interface MissingLine { zone: DeckZone; cardKey: CardKey; name: string; missing: number }

interface DeckOwnershipView {
  deckId: string;
  asOf: IsoDate;                              // today
  catalogVersion: string | null;
  ownershipAvailable: boolean;                // false → OWN-062 banner, no darkening
  sections: ZoneSection[];                    // ZONE_ORDER, all six (OWN-011)
  summary: {
    copiesRequired: number;                   // R
    copiesOwned: number;                      // A
    cardsTotal: number;                       // C, distinct cardKeys
    cardsFullyOwned: number;                  // F
    copiesExcludedRelevant: number;           // OWN-050 excluded line
  };
  missing: MissingLine[];                     // OWN-051
  missingText: string;                        // DECK-085 layout (OWN-052)
}

// ---- Deck list tile (OWN-002) ----
interface DeckTileSummary {
  deckId: string;
  name: string;
  sourceLine: string;                         // OWN-003
  legalityVerdict: 'legal' | 'illegal' | 'incomplete'; // OWN-004; 'incomplete' also when legality could not be computed
  legalityLabel: string;                      // OWN-004 = CAT-045 / DECK-051 labels, e.g. 'Legal in Standard as of Nov 23, 2026',
                                              // 'Not legal in Standard today', 'Not fully checked'
  ownershipLine: string;                      // '34 of 66 copies owned for decks'
  ownershipFilter: 'all' | 'partial' | 'none';
  updatedAt: string;                          // shown per OWN-090
}
// summarizeDeck(deck, view: DeckOwnershipView, legality: LegalityResult | null, format: FormatDef | null): DeckTileSummary — pure
//   format = the FormatDef whose id is deck.format; its `name` fills <format> (LEGAL-R08). null legality or format → 'Not fully checked'.
```

## Acceptance criteria
Card names are from [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] (`KENNEN_1`) and
[[2026-11 RC Europe - 5 - CTCG DZiden - Kai'Sa]] (`KAISA_5`). Printing ids (`p_lr_regular`, `p_lr_foil`)
are placeholders until the live payload (H-020). Today = 2026-11-23 unless stated.

1. **Partial fill 1 of 3** (OWN-022, OWN-023, OWN-032, OWN-033)
   **Given** `KENNEN_1` with `Lightning Rush` ×3 in Main, and `deckOwnership(input, 'lightning rush')` =
   `{ owned: 1, ownedForDecks: 1, ownedExcluded: 0 }` **When** the deck view opens **Then** the
   Lightning Rush tile has `allocated 1`, `fill 1/3`, `state 'partial'`; the left third of the image is
   in full colour and the right two thirds darkened, with a divider at 33.33 % of the width; the label
   reads "1 of 3 owned" and the accessible name "Lightning Rush, Main Deck, 1 of 3 owned"; Lightning
   Rush appears in the missing list as `2 Lightning Rush` under `Main Deck:`.
2. **Excluded foil** (OWN-020, OWN-041, OWN-042, OWN-050)
   **Given** `KENNEN_1` and the user owns `Lightning Rush` 2 × `p_lr_regular` + 1 × `p_lr_foil`, the foil
   tagged `Collector` (tag id `t_col`, `excludeFromDecks: true` in `input.tags`), so
   `deckOwnership(input, 'lightning rush')` gives `owned 3, ownedForDecks 2, ownedExcluded 1` and the foil
   entry has `excludedByTagIds: ['t_col']` **When** the deck view opens **Then** the tile shows `fill 2/3`,
   "2 of 3 owned"; expanding it shows "Counts toward this deck: <regular code> ×2" and "Owned · excluded
   from decks: <foil code> ×1 · Collector" (`excludedByTagNames: ['Collector']`, looked up in `input.tags`), and "You own 2 for decks; this deck needs 3 (1 more excluded from
   decks)"; the summary adds "1 copy excluded from decks". **When** the user turns the `Collector`
   flag off in Collection **Then**, without reload, the tile is full colour, "3 of 3 owned", and the
   excluded line disappears.
3. **Banned card owned in full** (OWN-015, OWN-030, design decision 3)
   **Given** `KENNEN_1` with `Nocturne, Horrifying` ×3, the user owns 3 for decks, and ban data with wave
   `std-2026-11-23` **When** the view opens on 2026-11-23 **Then** the tile is in full colour, "3 of 3
   owned", and shows "Banned since Nov 23, 2026" with a ban icon; the deck tile says "Not legal in Standard
   today". **When**
   today is 2026-11-20 **Then** the same tile shows "Banned from Nov 23, 2026" and stays full colour.
4. **Main ×2 + Sideboard ×1 with 2 owned** (OWN-021, OWN-022, OWN-033, OWN-042, OWN-051)
   **Given** `KAISA_5` with `The Empyrean` ×2 in Main and ×1 in Sideboard, `ownedForDecks 2` **When**
   the view opens **Then** the Main tile is `allocated 2, fill 1, full`, "2 of 2 owned"; the Sideboard
   tile is `allocated 0, fill 0, none`, "0 of 1 owned · 2 of 3 in this deck"; both expands show "Main
   Deck 2 of 2 · Sideboard 0 of 1"; The Empyrean is not fully owned (2 < 3); the missing list has
   `Sideboard:` / `1 The Empyrean`. **Given** `ownedForDecks 1` instead **Then** Main is `fill 1/2,
   partial` and Sideboard `none`.
5. **Champion before Main** (OWN-022)
   **Given** a deck with `Kai'Sa, Survivor` as Chosen Champion ×1 and also ×2 in Main, and
   `ownedForDecks 2` **When** allocated **Then** Champion is `1 of 1` (full) and Main `1 of 2` (partial).
6. **Extra copies** (OWN-024, OWN-042)
   **Given** `KAISA_5` (Chosen Champion `Kai'Sa, Survivor` ×1) and the user owns 2 base + 1
   `RAD-SP1/005` tagged `Collector` (excluded) as in SPEC-007 AC 22 **When** the view opens **Then** the
   Champion tile is full, "1 of 1 owned" (no extra on the face); the expand shows "You own 2 for decks;
   this deck needs 1 (1 extra) (1 more excluded from decks)" with the base row ×2 and the Showcase row ×1
   under "Owned · excluded from decks".
7. **Nothing owned, still readable** (OWN-031, OWN-034, OWN-050)
   **Given** `KENNEN_1` and an empty collection **When** the deck tile and view are shown **Then** the
   tile reads "0 of 66 copies owned for decks"; the view summary reads "0 of 66 copies owned for decks"
   and "0 of 32 cards fully owned"; every image has the darkened treatment, every name, count and ban
   label meets 4.5:1 contrast; the missing list has 66 copies and "Copy missing list" yields text that
   imports back via Deck Import into the same zones and quantities (DECK-086).
8. **Zone sections in Riot decklist order** (OWN-011, OWN-051)
   **Given** `KENNEN_1` **When** the view opens **Then** sections are Legend (1: `Kennen, Heart of the
   Tempest`), Chosen Champion (1: `Kennen, Storm of Shuriken`), Main Deck (39 cards), Battlefields (3),
   Runes (12: `Chaos Rune` ×9, `Order Rune` ×3), Sideboard (10), in that order (Battlefields before Runes,
   as in the DECK-085 export); `Fizz, Trickster` has a tile in Main (×1) and in Sideboard (×1). **Given**
   an empty collection **Then** the missing list groups are in the same order: Legend, Chosen Champion,
   Main Deck, Battlefields, Runes, Sideboard.
9. **Unknown card** (OWN-061)
   **Given** a deck whose stored entry `1 Zaun Warrens` has a `cardKey` the current catalog no longer has
   (hypothetical removal; the lookup returns "not found", CARD-033) **When** the view opens **Then** the Battlefields section shows a
   placeholder tile "Zaun Warrens" flagged "Card no longer in the card data", "0 of 1 owned", state
   `none`; it is in the missing list, and the deck is "Not legal in Standard today" via LEGAL-019.
10. **Null attributes** (OWN-060)
    **Given** a card with `domains: null`, `category: 'unknown'`, `type: 'Spell'`, `stats.might: null`
    **When** its tile is shown **Then** it reads "Spell · Unknown", "Domains: Unknown", and shows no
    might value.
11. **Deck list** (OWN-002, OWN-003, OWN-004, OWN-005)
    **Given** two decks: `Kennen: ASC Evansrhim (1st, Regional Championship: Europe)` added from
    Tournaments on Nov 20, 2026 and `Kai'Sa, Daughter of the Void` imported and edited on Nov 22, 2026
    **When** Decks opens **Then** the Kai'Sa deck is first; the Kennen tile's source line reads
    "1st, Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026"; both tiles show "Not legal in
    Standard today" (banned cards as of 2026-11-23), the same label SPEC-004 CAT-045 shows for the Kennen
    list in Tournaments; no tile shows a percentage, rank or meta statistic.
12. **Legality labels** (OWN-004, OWN-091)
    **Given** a deck with no errors but a rule `not_evaluated` (e.g. domains `null`) **When** listed
    **Then** the label is "Not fully checked", never a "Legal in …" label or a legal colour/icon.
    **Given** a deck whose `LegalityResult` is `legal` with `asOf = 2026-11-23` and the `standard`
    `FormatDef` with `name: "Standard"` **Then** the label is "Legal in Standard as of Nov 23, 2026" (the id
    `standard` is never shown). **Given** the formats file is not loaded (`format = null`) **Then** the
    label is "Not fully checked".
13. **Collection unreadable** (OWN-062)
    **Given** the collection store has a newer `schemaVersion` **When** a deck view opens **Then** all
    cards are shown in full colour with info and ban status, no count labels, and the banner "Ownership
    unavailable: your collection could not be read."
14. **Reduced motion** (OWN-035)
    **Given** `prefers-reduced-motion: reduce` **When** an import raises Lightning Rush from 1 to 2 owned
    **Then** the fill changes from 1/3 to 2/3 with no animation.
15. **Purity** (OWN-025, OWN-026)
    **Given** the same deck, ownership, catalog, ban data and today **When** `computeDeckOwnership` runs
    twice **Then** the outputs are deep-equal, and the stored `UserDeck` and browser storage are
    unchanged.

## Out of scope
- Prices, buying or shop links, trade suggestions.
- Meta statistics of any kind (play rate, win rate, tiers, popularity) and comparing ownership with other
  users (ADR-0003).
- Sharing decks or ownership (links, social, export of ownership).
- Importing and editing decks (SPEC-006), editing the collection or tags (SPEC-007).
- Choosing a printing per deck slot ("build with my foils"): decks stay by `cardKey` (DECK-096).

## Open questions / BLOCKED
1. **BLOCKED: needs research (via SPEC-007 open question 1, H-020):** whether a foil is its own Riot API
   printing. AC 2 assumes it is; if not, excluding only the foil needs a finish dimension in SPEC-001/003/007,
   and the expand rows (OWN-041) follow whatever entries COLL-081 returns.
2. **BLOCKED: needs research (H-020):** image dimensions and battlefield orientation in the API (OWN-081).
3. **Resolved (RJ, 2026-11-23, ADR-0006 "Your decks view decisions"):** tiles show the default printing
   art regardless of owned printings (OWN-016); copies are allocated main deck first, sideboard last
   (OWN-022); sections follow Riot's decklist order, Battlefields before Runes (OWN-011); unowned cards are
   grayscale and dimmed to about 55 % brightness with app text kept readable (OWN-031, OWN-034).
4. **Default chosen by Claude (RJ may change, ADR-0006):** an unknown card is always 0 owned with a
   placeholder tile (OWN-061), even if Collection still records copies under that `cardKey`.
5. **Time zone of "today"** follows SPEC-002's open question (LEGAL-R02).

## Changelog
Current: 0.2 (2026-11-23). Full history: [[Your Decks Ownership View changelog]] (archived). New entries go in the archive note.
