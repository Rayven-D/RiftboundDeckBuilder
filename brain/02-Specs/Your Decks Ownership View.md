---
tags: [spec]
id: SPEC-005
version: 0.11.1
status: draft
depends_on: [SPEC-001, SPEC-002, SPEC-004, SPEC-006, SPEC-007, SPEC-008]
research: ["[[Ban List]]", "[[Deck Construction Rules]]", "[[Physical Copies Across Decks]]", "[[Card Data & Images]]", "[[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]]", "[[2026-11 RC Europe - 5 - CTCG DZiden - Kai'Sa]]"]
decisions: ["[[ADR-0003 Tournament Results Only]]", "[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
ui: ["[[Decks]]", "[[Decks Components]]"]
board: H-007, H-097, H-076, H-174, H-244, H-252, H-320, H-157, H-256, H-330, H-383, H-481, H-476
as_of: 2026-11-26
---
# SPEC-005: Your Decks Ownership View

## Summary
- **Purpose:** the **Decks** screen. Lists the user's decks (Deck Import or "Add to your decks")
  and shows each deck card by card with full card info, ban status, and how many copies are
  **available** to this deck: **full colour** (available ≥ required), **darkened but readable** (0), or a
  **left-to-right partial colour fill** of available / required (ADR-0006). v0.3: availability accounts for
  decks the user **locked in** (SPEC-008). **v0.5 (RJ, 2026-11-24): runes are cards like any other**
  (OWN-028): counted, filled, missing and summed like every zone; SPEC-009 is withdrawn.
- **Key requirements:** deck list and tiles OWN-001…008 and OWN-100…105 (v0.9); deck view and card info OWN-010…017 and OWN-110…119 (v0.9);
  ownership and **zone allocation** OWN-020…027; visuals and accessibility OWN-030…039; grouping and
  card panel / dialog and printings OWN-040…045 (045 withdrawn); deck summary and missing list OWN-050…055; unknown data OWN-060…064;
  recalculation OWN-070…073; performance OWN-080…083; display rules and neutrality OWN-090…093.
- **Ownership rule:** per deck, per `cardKey`: the pool is SPEC-008 **available(D, k)** = SPEC-007
  `ownedForDecks` (COLL-081; "exclude from decks" copies never count) minus copies held by other **locked**
  decks (SHARE-011). The pool is shared across zones and allocated in Riot decklist order, Main before
  Sideboard: **Legend → Champion → Main → Battlefields → Runes → Sideboard** (OWN-022). Rune entries are
  allocated like every other entry (OWN-028). Sections are shown in the same order (OWN-011, ADR-0006 "Your
  decks view decisions"). Labels read "`<a>` of `<q>` available" / "… locked in" (SHARE-040). v0.4: every
  deck has exactly one ownership filter group (SHARE-051); an empty deck reads "No cards to count" and is
  "None available". OWN-029 (v0.5): no data migration; runes the user hasn't imported show as missing.
- **Legality label:** same labels as SPEC-004 CAT-045 and SPEC-006 DECK-051, format name from
  `FormatDef.name` per SPEC-002 LEGAL-R08: "Legal in Standard as of Nov 23, 2026", "Not legal in Standard
  today", "Not fully checked" (OWN-004).
- **Shared types:** reads `UserDeck`, `DeckCard`, `DeckZone`, `DeckSource` (SPEC-006), `DeckOwnershipInput`,
  `DeckOwnership`, `CollectionCatalogView`, `StoredTags`/`Tag` (SPEC-007), `BanStatus`, `LegalityResult`,
  `FormatDef` (SPEC-002), `PlayableCard`, `Printing` (SPEC-001), `SharedPool`, `CardAvailability`,
  `DeckLockState` (SPEC-008). Defines `computeDeckOwnership()` →
  `DeckOwnershipView`, `OwnershipCard`, `DeckTileSummary`. Excluding tag names come from
  `DeckOwnershipInput.tags` (SPEC-007 `TagStore`).
- **Ownership unavailable (v0.5.1; RJ 2026-11-25, in chat, H-157: keep showing the lock, OWN-065):** locked decks keep their badge and lock filter, the
  tile line reads "Ownership unavailable", and the deck is in its own filter group `unavailable`.
- **Sign-in gate (v0.5.2, OWN-066; account-only since v0.6):** the Decks page and deck detail always sit behind the SPEC-010 SYNC-009 gate (sign-in panel under the page header while it is not open); ownership rules unchanged.
- **Smooth scrolling (v0.6, OWN-084):** the deck list scrolls continuously: no page numbers, no Previous / Next, load as you scroll (rule: SPEC-007 COLL-093).
- **Import deck entry (v0.7, OWN-008, OWN-094, H-174):** a floating **Import deck** button at the bottom right of Decks (like Collection's, SPEC-007 COLL-094), hidden on the empty state, which has its own **Import deck** button (and a Tournaments link); a saved deck stays on Decks; no `/import` page. **v0.8 (H-244, RJ 2026-11-25 "the FAB should never overlap the footer"):** the button docks 16 px above the footer and the page reserves its room above the footer, not below it (OWN-094, COLL-094 (d)).
- **Decks and Deck detail design (v0.9, H-252, RJ 2026-11-25, [[Decks]] brief + H-260 answers):** new section K (list, OWN-100…105) and L (detail, OWN-110…119). The tile shows the **Legend** with its art **filled left to right by the deck's own copies** (A of R) and a **completion %** next to it (OWN-100, OWN-101; OWN-054 changes for the user's own completion only, "no meta comparison" stays, ADR-0003). Deck detail: header with name, description and "X of Y copies available" **followed by the same completion % (v0.10, RJ 2026-11-25, H-320: "34 of 66 copies available · 51%"; OWN-010 (f), OWN-101 (d); not on the Missing tab)** (OWN-010); on desktop a **persistent right panel** with two tabs, **Card** (the selected card, first card selected on load) and **Missing** (summary + missing list); on phones a dialog (OWN-111…113). **Card view / List view** (OWN-114). Cards open in the panel or dialog, not an inline expand (OWN-038, 041…045 reworded). Rename works on every deck, locked ones too (OWN-118, SPEC-008 SHARE-025). The card editor is deferred (RJ #14). OWN-082 is rewritten, OWN-013 and OWN-039 are deferred, OWN-045 is withdrawn. **v0.10 (H-320, RJ 2026-11-25): Open questions 10–15 are answered (resolved at the end).** Q10 is the one change: the % is also in the Deck detail header, next to "X of Y copies available" (OWN-010 (f), OWN-101 (d), AC 33); the other five keep the written defaults (rounding and copy weighting, 64rem panel threshold, Card view first and remembered per device, player name alone, older messages unchanged).
- **Deck detail section bar, not-found page, tile % size (v0.11, H-481, RJ 2026-11-26, H-392 answers (4), (6) and the tile %):** the sticky section bar shows "Legend 0" / "Champion 0" only when that slot is empty and no count when it holds its card (OWN-110, AC 34); the deck-not-found page has no "Deck detail" heading and its H1 is "This deck isn't in your decks" (OWN-119 (b), AC 35); the deck tile's completion % is 16 px, weight 600, like the deck name (OWN-101 (d), AC 36). H-392 (1), (2), (3), (5) stay as built (Open question 18). Build: H-482.
- **Depends on:** SPEC-001 v0.4.1, SPEC-002 v0.4, SPEC-004 v0.7, SPEC-006 v0.14.1 (pin-only, H-454; v0.13 pin: H-479; v0.12 pin: H-342), SPEC-007 v0.14.1, SPEC-008 v0.4.7.
  Nothing is stored by this spec; everything is computed on display.
- **Blocked / open:** foil as its own printing (SPEC-007 open question 1, H-020); card image aspect
  ratio and battlefield orientation in the API (OWN-081). Unknown card = 0 owned is a Claude default RJ
  may change (Open questions). Open question 7 resolved (RJ, 2026-11-24): no notice about the rune change.

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
- **Counted entry**: every zone entry, in every zone including Runes (SPEC-008 SHARE-006). *(v0.4.1 and
  earlier left out "rune entries", SPEC-009 RUNE-001; withdrawn in v0.5, OWN-028.)*
- **Required (zone)**: the zone entry's `qty`. **Required (card)**: Σ `qty` of that `cardKey` over the deck's
  counted entries (= SPEC-008 need(D, k)).
- **Ownership input**: the SPEC-007 `DeckOwnershipInput` (collection, tags, printing codes, catalog as
  `CollectionCatalogView`), passed unchanged to `deckOwnership(input, cardKey)` (COLL-081) and to SPEC-008
  `computeSharedPool()`.
- **Owned for decks**: `ownedForDecks` from SPEC-007 `deckOwnership(input, cardKey)` (COLL-081) = copies of
  the card's printing, unassigned and missing-printing entries that carry **no** excluded tag. 0 when the card
  is not in the collection, and 0 for an unknown card (OWN-061).
- **Pool**: SPEC-008 `available(D, k)` = owned for decks minus copies held by other locked decks
  (SHARE-011). Equal to owned for decks when no other deck is locked.
- **Excluded copies**: `ownedExcluded` from COLL-081. Shown, never counted.
- **Allocated (zone)**: the copies of the pool assigned to one zone entry by OWN-022.
- **Fill**: `min(allocated, required) / required`, a number in [0, 1], exact (1/3 is 0.3333…, not 0.33).
- **State**: `full` (fill = 1), `partial` (0 < fill < 1), `none` (fill = 0).
- **Card tile**: one zone entry as shown in the deck view: one tile per `cardKey` per zone, never one per
  copy and never one per printing (ADR-0006 H-036 #5).
- **Deck tile**: one deck in the Decks list.
- **Deck fill** (v0.9): `A / R` for the whole deck (OWN-050; exact, 0..1), the fraction the Legend art on the deck tile is filled by (OWN-100). Not the Legend card's own fill.
- **Completion percentage** (v0.9): the whole number OWN-101 derives from `A / R`.
- **Card panel** (v0.9): the persistent right-hand panel of Deck detail at 64rem and wider, with the tabs **Card** and **Missing** (OWN-111). **Card dialog**: the same card content in a dialog below 64rem (OWN-113).
- **Selected card** (v0.9): the one tile or list row whose card the panel shows (OWN-111).
- **Today**: the local calendar date, used as `asOf` for `banStatus()` and legality (SPEC-002 LEGAL-R02).
- **Unknown card**: a `cardKey` in the deck that the current catalog does not contain (DECK-088).

## Design decisions (summary)
1. **Ownership is per deck total by `cardKey`; the display is per zone from one shared pool.** A card in
   Main ×2 and Sideboard ×1 needs 3 copies in total, because a physical deck with a sideboard holds all 3
   at once. Showing each zone against the full pool would show both zones as full with 2 copies and
   overstate ownership. So the pool is allocated zone by zone in a fixed order, and the card-level label
   always shows the deck total ("2 of 3 in this deck").
2. **Allocation order Legend → Champion → Main → Battlefields → Runes → Sideboard** (RJ, ADR-0006 "Your
   decks view decisions": main deck first, the sideboard shows what remains; sections follow Riot's
   decklist order). It fills what a legal game needs first (Legend and Chosen Champion are mandatory
   single cards; Main is the 40) and the optional Sideboard last. In practice only Champion/Main/Sideboard
   can share a `cardKey` (runes, battlefields and legends are other categories), so the order between
   Battlefields and Runes never changes a result; it follows the display order so one list
   (`ZONE_ORDER`) serves both and the function is fully deterministic. *(v0.3–v0.4.1 skipped rune entries,
   SPEC-009; since v0.5 they are allocated like any entry, OWN-028.)*
3. **Darkening is for ownership only.** Ban status is a label and icon, never a dim or a fill, so a
   banned card the user owns in full is shown in full colour with a ban label.
4. **Only the card image is darkened.** Text the app renders (name, counts, type, ban label, rules text)
   is never darkened, so a missing card stays readable.
5. **Copies above required are not shown on the tile face** (label caps at "3 of 3 available"); the card panel or dialog
   says how many extra copies are available.
6. **Counts, plus the user's own completion %** (changed in v0.9; RJ, 2026-11-25). The summary uses copy and
   card counts. The deck tile also shows one **completion percentage**: the user's own share of this deck's
   copies that are available, from the same A and R as the copies line (OWN-101). **v0.10 (RJ 2026-11-25, H-320):** the same value is also shown in the **Deck detail header**, next to "X of Y copies available" (OWN-010 (f)); nowhere else (not on the Missing tab, not on Collection). Before v0.9 this rule said
   "no percentages"; that was **our own rule, not Riot's**: ADR-0003 records only that Riot's developer policy
   forbids metagame-defining data (play rates, win rates, matchup data) and rules out tier lists, archetype
   shares and a "meta score". A percentage of the user's own cards is none of those. What still stands: no
   score, rank or ranking of decks, and no comparison with other users, the meta or tournament results
   (OWN-007, OWN-054, ADR-0003).
7. **Available, not owned** (v0.3, RJ, ADR-0006 "Shared cards, lock in and runes"). Copies another deck has
   locked in are not available here, so the fill, labels and summary use SPEC-008 `available(D, k)`.
   Unlocked decks don't reserve copies from each other; instead each tile says "Also in N other decks".
8. **Runes are cards** (v0.5, RJ, 2026-11-24: "Allow users to import runes as well and treat them like any
   other card."). No zone or category is special-cased in ownership. A rune name can need more than 3
   copies (e.g. `Chaos Rune` ×9), because the Rune Deck has no per-name limit
   ([[Physical Copies Across Decks]] fact 10); the computation already takes `qty` as it is (SPEC-008 SHARE-003).

## Requirements
### A. Decks list
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-001 | MUST | The Decks screen lists **every** `UserDeck` in the `DeckStore` (SPEC-006 DECK-090): decks imported with Deck Import and decks added from Tournaments with "Add to your decks" (DECK-060). Tournament Top 8 decks the user has not added are **not** listed. | [[ADR-0006 Two Imports - Collection and Decks]] ("Your decks", follow-up decisions); [[Deck Import]] DECK-060, DECK-090 |
| OWN-002 | MUST | **Each deck tile (rewritten in v0.9)** shows: the **Legend art** with the deck fill (OWN-100); the **completion percentage** (OWN-101); deck **name**; **source** line (OWN-003) and, for a tournament deck, the **player** (OWN-104); the **ownership chip** (OWN-102) and **ownership summary** "`<allocated>` of `<required>` copies available", or "… copies locked in" for a locked deck (OWN-050, SPEC-008 SHARE-050); the **lock badge** when locked, a **separate** badge (`app-lock-badge`) next to the chip, not a chip variant ("Locked" / "Locked · `<n>` cards short", SHARE-050), **without a date** (the lock date is in the Deck detail header, SHARE-041); **legality verdict** label (OWN-004); the **ban flag** (OWN-103); a "Read-only" tag after the name for a read-only deck (DECK-091); and "Updated `<date>`" (`updatedAt`, local date, OWN-090). **The whole tile is one link** to the deck view `/decks/:id` (RJ 2026-11-25: clicking the tile opens Deck detail). Tiles sit in a grid: columns of at least 22rem, so 3 columns at 1440 px, 2 at 1024 and 768 px, 1 on phones; tiles in one row have the same height. | [[ADR-0006 Two Imports - Collection and Decks]] (incl. "Shared cards, lock in and runes"); board H-007; RJ 2026-11-25 (H-260, [[Decks]] §13a, §13 choices 1–4, 6); [[Decks]] §4 |
| OWN-003 | MUST | Source line: for `source.kind === 'tournament'`: "`<placingLabel>`, `<eventName>` · `<eventStartDate>` – `<eventEndDate>`" (one date when equal; values verbatim, DECK-061), e.g. "1st, Riftbound Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026". For `kind: 'user'`: the source text if any, else the URL as **plain text** (no fetch, no favicon, DECK-072), else "Imported". Wording stays neutral (no "top deck", "best", "meta"). The player of a tournament deck is added by OWN-104. | [[Deck Import]] DECK-061, DECK-071, DECK-072; [[Tournament Deck Catalog]] CAT-035, CAT-037 |
| OWN-004 | MUST | Legality label from SPEC-002 evaluation of the deck (`toDeckInput`, `format`, region `global`, `asOf` = today), with **the same labels as SPEC-004 CAT-045 and SPEC-006 DECK-051**, rendered per SPEC-002 LEGAL-R08: `<format>` is the `FormatDef.name` of `deck.format` (**"Standard"** for `standard`; the id is never shown) and `<asOf>` uses the OWN-090 date format. Checked in this order: `illegal` → **"Not legal in `<format>` today"**; `incomplete` → **"Not fully checked"** (DECK-052; never shown as legal or with a legal colour/icon, LEGAL-R04); `legal` → **"Legal in `<format>` as of `<asOf>`"**, e.g. "Legal in Standard as of Nov 23, 2026". The CAT-045 historical label does not apply: a user deck is always checked as of today. If legality cannot be computed (catalog, ban or format data not loaded, so no `LegalityResult` or no `FormatDef`) the label is "Not fully checked". The verdict is computed on display, never stored (DECK-055). | [[Deck Legality]] LEGAL-R02, LEGAL-R04, LEGAL-R08, `FormatDef`; [[Tournament Deck Catalog]] CAT-045; [[Deck Import]] DECK-051, DECK-052, DECK-055; [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7 |
| OWN-005 | MUST | Default order: `updatedAt` descending (most recently changed first); ties by `createdAt` descending, then `id`. | design rule |
| OWN-006 | SHOULD | Sort options: Last updated (default), Name A–Z (SPEC-007 COLL-034 name comparison), Date added (`createdAt`, newest first). Filters: text search on deck name (case- and accent-insensitive substring); legality (verdict `legal` / `illegal` / `incomplete`, options labelled with the OWN-004 labels without the date: "Legal in Standard", "Not legal in Standard today", "Not fully checked"); source (Imported / From Tournaments); ownership per SPEC-008 SHARE-051 (Ready to build / Partly available / None available, by the deck's `ownershipFilter` group; each deck is in exactly one group, and a locked deck that is not short, or any deck while ownership is unavailable (OWN-065), is in none of the three options) and lock (Locked / Not locked). Sort and filters are reflected in the URL query (e.g. `?sort=name&legality=legal&own=ready`). Where each control sits is OWN-105 (v0.9). | design rule; [[Shared Cards and Lock-in]] SHARE-051 |
| OWN-007 | MUST NOT | The list offers no sort, filter, badge or label based on meta or community data: no play rate, win rate, popularity, tier, "trending", or comparison with other users' ownership. | [[ADR-0003 Tournament Results Only]] |
| OWN-008 | MUST | Empty state (no decks; v0.7): heading "No decks yet", the line "Import a deck list to see which of its cards you own.", a filled button **Import deck** (opens the SPEC-006 dialog, DECK-001) and a link to **Tournaments**; no floating button while it shows (OWN-094). A filter with no matches shows "No decks match these filters" and a "Clear filters" action. | design rule |

### B. Deck view and card info
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-010 | MUST | **The deck view header (rewritten in v0.9; layout and lock badge position as built, v0.11.1)**: (a) a back link "Decks" on its own line at the top, then a two-part block: the **title side** (b)–(g) top to bottom and the **actions** (h). **From 40rem** the actions sit in the header's **top-right, beside the title side** (level with the name); the title side shrinks to a minimum of 20rem, and the actions **wrap under the status lines (f) only when the two don't fit** side by side (a narrow tablet). **Below 40rem** the header is a **single column**: the title side, then the actions. In both layouts the actions come after the title side in reading and focus order. The title side, top to bottom: (b) the deck **name** as the page heading; (c) the **description** (OWN-118): the deck's `notes` text, plain text, clamped to 3 lines with a "Show more" control when longer; when `notes` is empty **nothing is shown** (no placeholder, no empty line); (d) the **source line** (OWN-003) and, for a tournament deck, the player (OWN-104) and a plain "Source" link to `sourceUrl` (DECK-072); (e) the **meta row**, which holds, left to right, (g) the **lock badge** (SHARE-041; nothing when the deck is unlocked), the **legality label** (OWN-004) and a **Rule check** control that opens the dialog of OWN-117 (so the badge sits in this row before the legality label, **above** the summary (f), not after it); (f) the **deck summary at the top** (OWN-050): "`<A>` of `<R>` copies available" ("… copies locked in" in a locked deck) and "`<F>` of `<C>` cards fully available", **shown in the header on every screen size, whatever the panel shows**. **v0.10 (RJ 2026-11-25, H-320): the copies line ends with the completion percentage of OWN-101, joined by " · ", e.g. "34 of 66 copies available · 51%" ("54 of 54 copies locked in · 100%" in a locked deck).** It is the same value as on the deck's list tile (`view.summary.completionPercent`), plain text next to the copies line (no bar or ring), and its accessible text reads "51 percent". When OWN-101 (c) gives no value (R = 0, ownership unavailable) the " · 51%" part is **absent** (no placeholder, no "0%"), and the copies line is whatever OWN-050 / OWN-062 shows. The "N of M cards fully available" line has no percentage; (g) is the lock badge, placed in the meta row of (e) as described there; (h) the **actions**, in the top-right block (from 40rem) or under the title side (below 40rem): **Lock in** / **Unlock** (SHARE-020…023), **Copy missing list** (OWN-052, 053) and a **More** menu with Export (DECK-085), Duplicate (DECK-084), **Rename** (OWN-118) and Delete (DECK-082). **There is no Edit cards action** in v0.9: the card editor is deferred (SPEC-006 DECK-080; RJ 2026-11-25, H-260 #14). | [[Deck Import]] DECK-080…085; [[Deck Legality]]; [[Shared Cards and Lock-in]]; RJ 2026-11-25 (H-260: header with name, description, "X of Y copies available" at the top; #14 Rename only; H-320, Open question 10: the completion % also in this header, "34 of 66 copies available · 51%") |
| OWN-011 | MUST | Zones are shown as sections in **Riot's decklist order**: **Legend, Chosen Champion, Main Deck, Battlefields, Runes, Sideboard** (the same order as the DECK-085 export and pasted Riot lists). Each heading shows its card count and its available count, e.g. "Main Deck · 39 cards · 12 available" or "Runes · 12 cards · 6 available" ("… locked in" in a locked deck); the Runes heading follows the same pattern as every other section (v0.5; the v0.4 "not tracked" heading of SPEC-009 RUNE-006 is withdrawn). Every section is shown; an empty one says "No cards in this zone". | [[ADR-0006 Two Imports - Collection and Decks]] "Your decks view decisions"; [[Deck Import]] (zones), DECK-085; [[Deck Construction Rules]] |
| OWN-012 | MUST | Within a section, card tiles are in the deck's **stored order** (as imported). | [[Deck Import]] DECK-085 (stored order); design rule |
| OWN-013 | MAY, **deferred (v0.9)** | **Deferred (RJ 2026-11-25, [[Decks]] choice 20 default): not built, shown or reachable.** A per-view control sorts tiles within each section by name or by cost (`stats.energy`, nulls last); it does not change the stored deck. | design rule |
| OWN-014 | MUST | **Every** card tile shows, whatever the ownership state: image (OWN-016), canonical name (from the catalog, DECK-088), `type` verbatim and `category`, domains, the non-null stats (energy, might, cost, power), and its rules text (`text`, verbatim, plain text). Name, counts, type and ban label are visible on the tile face; rules text MAY be in a details area opened from the tile, but MUST be reachable for every card. | [[ADR-0006 Two Imports - Collection and Decks]] ("every card … with all its information … whether or not the user owns it"); [[Card Data Model]] CARD-015, CARD-028 |
| OWN-015 | MUST | **Ban status on every card** from SPEC-002 `banStatus(cardKey, deck.format, 'global', today)` (LEGAL-B10), never re-derived: `banned` → label "Banned since `<bannedSince>`" (e.g. "Banned since Nov 23, 2026") with an icon; `upcoming` → "Banned from `<effective>`"; `not-banned` → no label; ban data not loaded → the status is **unknown** (never "not banned"). **v0.9 (RJ 2026-11-25, [[Decks]] choice 11 default):** when ban data is not loaded the page shows **one notice** "The ban list couldn't load, so ban status is unknown." (not one label per tile); each card's accessible name and its Card tab or dialog say "Ban status unknown", and the tile shows no ban label and the deck tile no ban flag (OWN-103). Same wording as SPEC-007 COLL-008/009 otherwise. The ban label never changes the ownership colouring (design decision 3). | [[ADR-0006 Two Imports - Collection and Decks]]; [[Deck Legality]] LEGAL-B10; [[My Collection]] COLL-008, COLL-009 |
| OWN-016 | MUST | The tile image is the card's `defaultPrintingId` printing (SPEC-001 CARD-016), regardless of which printings the user owns, `art.thumbnailUrl` on the tile and `art.fullUrl` in the details view, loaded from the Riot URLs (CARD-005). A missing URL shows a text placeholder with the card name. | [[ADR-0006 Two Imports - Collection and Decks]] "Your decks view decisions"; [[Card Data Model]] CARD-005, CARD-016 |
| OWN-017 | SHOULD | A preview card (`isPreview === true`) carries a "Preview" label. | [[Card Data & Images]] #3; [[My Collection]] COLL-005 |

### C. Ownership computation and zone allocation
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-020 | MUST | Ownership is per **`cardKey`** across all printings and variants (ADR-0005 decision 2, H-036 #5). The pool for a card in deck D is SPEC-008 **`availability(shared, D.id, cardKey).available`** (SHARE-011) = SPEC-007 `ownedForDecks` (COLL-081) minus copies held by other locked decks. `ownedForDecks` comes from `deckOwnership(input, cardKey)` with the SPEC-007 `DeckOwnershipInput` passed through unchanged; this spec never reads `quantity` directly, never re-implements tag logic and never re-derives holds. Copies carrying an "exclude from decks" tag (`ownedExcluded`) never count. Rune cards get their pool the same way (OWN-028). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5, #6 and Note; "Shared cards, lock in and runes"; [[My Collection]] COLL-003, COLL-081; [[Shared Cards and Lock-in]] SHARE-011 |
| OWN-021 | MUST | A card's requirement is the **deck total**: Σ `qty` of its `cardKey` over the deck's **counted** entries (every zone, Runes included, v0.5), = SPEC-008 need(D, k). A card is **fully available** when pool ≥ card required. | design rule (design decision 1); RJ decision 2026-11-24 (runes are cards) |
| OWN-022 | MUST | **Allocation.** For each `cardKey`, the pool is assigned to its counted zone entries in zone order **legend, champion, main, battlefields, runes, sideboard** (`ZONE_ORDER`, the OWN-011 section order; Main before Sideboard): `allocated(zone) = min(remaining, qty)`, then `remaining −= allocated(zone)`. The result is deterministic and the same in every view (tile, section heading, summary, missing list). *(v0.3–v0.4.1: `ZONE_ORDER` without runes.)* | [[ADR-0006 Two Imports - Collection and Decks]] "Your decks view decisions" (main deck first; sideboard shows what remains); design decision 2 |
| OWN-022a | — | **Withdrawn in v0.5 (2026-11-24).** Rune entries were not allocated and always read "Assumed owned" (SPEC-009 RUNE-002, RUNE-006). Replaced by OWN-028. | RJ decision 2026-11-24 |
| OWN-023 | MUST | Per tile: `fill = allocated / qty` (exact, 0..1); `state` = `full` if `allocated = qty`, `none` if `allocated = 0`, else `partial`. | [[ADR-0006 Two Imports - Collection and Decks]] (1 of 3 → ⅓, 1 of 2 → ½, 2 of 3 → ⅔) |
| OWN-024 | MUST | `extra = max(0, pool − card required)`: available copies above what this deck needs. Not shown on the tile face; shown in the card panel or dialog (OWN-042). | design rule (design decision 5) |
| OWN-025 | MUST | The computation is a **pure function** `computeDeckOwnership(deck, ownership, catalog, banData, today)` (Data contract): same inputs, same output; no network calls, no storage writes, no clock reads (today is an input). `ownership` carries the SPEC-008 `SharedPool` computed from all decks. | [[Deck Legality]] LEGAL-R01 (same principle); [[Shared Cards and Lock-in]] SHARE-070; design rule |
| OWN-026 | MUST | Ownership is **never stored**: not in the `UserDeck` (DECK-096), not in a cache that outlives the inputs it was computed from. | [[Deck Import]] DECK-096; [[ADR-0006 Two Imports - Collection and Decks]] |
| OWN-027 | MUST | Ownership never changes the deck: a missing card is never removed, replaced or marked in the stored deck. | design rule |
| OWN-028 | MUST | **Runes are cards** (v0.5). A rune entry (a `DeckCard` in the `runes` zone, or a card with `category: 'rune'` in any zone) is a counted entry like any other: it gets its pool from SPEC-008 `availability()` (OWN-020), is allocated by OWN-022, has fill, state, count label, state icon, shared indicator, card panel content and breakdown like any tile (OWN-023, OWN-033, OWN-041…043), is in R, A, C and F (OWN-050), in the missing list (OWN-051) and in the "Copy missing list" text under `Rune Pool:` (OWN-052), and is shown full colour without count labels only when ownership is unavailable for every card (OWN-062/063). No label, icon, heading or note on this screen says runes are assumed, untracked or special. | RJ decision 2026-11-24 ("Allow users to import runes as well and treat them like any other card."); [[Physical Copies Across Decks]] facts 10, 11, 14 |
| OWN-029 | MUST | **No migration** (v0.5). Stored decks, collection, tags and locks are unchanged and keep their `schemaVersion`s: runes were always stored as ordinary `DeckCard`s in the `runes` zone (SPEC-006 DECK-020) and, when imported, as ordinary collection cards (SPEC-003 IMP-071). The first computation after this change reads them as they are, so a deck whose runes are not in the collection shows them as missing ("0 of 9 available") until the user imports them, and a locked deck whose runes are not owned becomes short and stays locked (SPEC-008 SHARE-033). No one-time notice is shown (RJ, 2026-11-24: "No notice"; open question 7, resolved). | RJ decision 2026-11-24 ("No notice"); [[Deck Import]] DECK-020, DECK-096; [[Shared Cards and Lock-in]] SHARE-033 |

### D. Ownership visuals and accessibility
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-030 | MUST | `full`: the card image in **full colour**, no overlay. | [[ADR-0006 Two Imports - Collection and Decks]] |
| OWN-031 | MUST | `none`: the card image **darkened/faded but still readable**: default treatment grayscale 100 % and brightness 55 % (design tokens; the H-023 design direction may tune them), such that the name printed on the card image stays legible at 100 % zoom. App-rendered text on the tile is not darkened (OWN-034). | [[ADR-0006 Two Imports - Collection and Decks]] ("darkened/faded but still readable") |
| OWN-032 | MUST | `partial`: the **left** `fill × 100 %` of the image width is in full colour, the rest has the `none` treatment. The split is a straight vertical edge at exactly `fill` of the width (not rounded to steps), with a 1 px light divider line so the edge is visible on dark art. The fill always runs **left to right**, also in right-to-left page layouts. | [[ADR-0006 Two Imports - Collection and Decks]] follow-up decisions ("left to right") |
| OWN-033 | MUST | **Not colour alone.** Every counted tile shows a text label of the count for that zone entry, "`<allocated>` of `<qty>` available" (e.g. "1 of 3 available", "0 of 2 available", "3 of 3 available"), or "`<allocated>` of `<qty>` locked in" in a locked deck (SHARE-040), plus a state icon (full: check; partial: half circle; none: empty circle), and the shared indicator when other decks use the card (SHARE-042). The tile's accessible name includes name, zone, count label, shared indicator and ban label, e.g. "Lightning Rush, Main Deck, 1 of 3 available" or "Hextech Ray, Main Deck, 0 of 3 available, also in 1 other deck, 1 locked". When the card's copies are split across entries (the `cardKey` has more than one counted entry in the deck: entries in more than one zone, or two entries of it in one zone), the label on **every counted tile of that card** adds the card total, e.g. "2 of 2 available · 2 of 3 in this deck" and "0 of 1 available · 2 of 3 in this deck"; a card with a single counted entry gets no suffix. Rune tiles follow this rule too (OWN-028), e.g. "Chaos Rune, Runes, 6 of 9 available". **v0.9:** the label has two named parts: the **count part** ("2 of 2 available") and the optional **deck-total part** ("2 of 3 in this deck"), joined by " · ". A tile may show them on two lines (a 9rem tile is too narrow for one), but the accessible name always carries the whole label. | design rule (WCAG 2.2 SC 1.4.1 Use of Color); [[Shared Cards and Lock-in]] SHARE-040, SHARE-042, SHARE-044 |
| OWN-034 | MUST | Text the app renders on or beside a tile (name, counts, type, domains, stats, ban label, rules text) meets **4.5:1** contrast against its background in every state; the darkened treatment applies to the image only. Icons and the fill divider meet **3:1** (non-text contrast). | design rule (WCAG 2.2 SC 1.4.3, 1.4.11) |
| OWN-035 | MUST | With `prefers-reduced-motion: reduce`, fill and state changes apply instantly. Otherwise a change MAY animate for at most 200 ms. Nothing flashes. **v0.9 (RJ 2026-11-25, [[Decks]] choice 28 default):** a fill that changes **while the view is open** (e.g. an import in another tab) SHOULD animate over 180 ms, on cards and on the deck tile's Legend art (OWN-100); the first render never animates. | design rule (WCAG 2.2 SC 2.3.3) |
| OWN-036 | MUST | A placeholder tile (missing image, unknown card) gets the same fill treatment on its placeholder surface, so state is still visible. | design rule |
| OWN-037 | SHOULD | Windows High Contrast / `forced-colors: active`: the image treatment may be lost, so the count label, icon and a visible border on the coloured part (solid) vs. the darkened part (dashed) carry the state. | design rule |
| OWN-038 | MUST | **Reworded in v0.9 (RJ 2026-11-25, choice 8 default and H-260 #8: there is no inline expand).** Each tile or list row of a card is **one button** that selects the card (desktop, OWN-111) or opens the card dialog (below 64rem, OWN-113). Tiles are keyboard reachable in reading order, focus is visible; the button has `aria-haspopup="dialog"` where it opens the dialog and `aria-current="true"` while it is the selected card in the panel. Each section's grid is one Tab stop with arrow-key roving (← → by one, ↑ ↓ by a row, Home / End); Enter or Space presses it. *(v0.8: "expand control with `aria-expanded`".)* | design rule (WCAG 2.2 SC 2.1.1, 2.4.7); [[Decks]] §11 |
| OWN-039 | MAY, **deferred (v0.9)** | **Deferred (RJ 2026-11-25, [[Decks]] choice 20 default): not built, shown or reachable.** A view toggle "Show ownership colouring" off shows every image in full colour, keeping labels and icons. | design rule |

### E. Grouping by card name and the card's printings (the inline expand was replaced in v0.9)
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-040 | MUST | One tile per `cardKey` per zone, showing the zone's required quantity as a `×N` badge **when N is 2 or more** (v0.9, RJ 2026-11-25, [[Decks]] choice 10 default: no `×1`; the count label carries it). Copies are never shown as separate tiles, and printings never split a tile. The same holds for List view rows (OWN-114). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5 |
| OWN-041 | MUST | **v0.9: shown in the Card tab of the card panel (OWN-111, OWN-112) and in the card dialog (OWN-113), not in an inline expand.** Each card's panel or dialog shows the card's owned entries from `deckOwnership(input, cardKey).entries` in their given order (`printingSortKey`, COLL-081), in two groups: **"Counts toward this deck"** (entries with `excluded = false`) and **"Owned · excluded from decks"** (entries with `excluded = true`, with the names of their excluding tags). Tag names are looked up from the same `DeckOwnershipInput.tags` (SPEC-007 `StoredTags`, loaded through the `TagStore`, COLL-070): each `excludedByTagIds` id is shown as that `Tag.label`, in `excludedByTagIds` order, joined by ", " (e.g. "· Collector"); an id with no matching `Tag` is not shown. Each row shows printing code (or "Printing not specified" for unassigned copies, "Printing no longer found (`<code>`)" for missing-printing entries), variant label when known, and the count (`×N`). Excluded rows are visually separate and never add to any count. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5, #6; [[My Collection]] COLL-012, COLL-014, COLL-070, COLL-080, COLL-081 |
| OWN-042 | MUST | The card panel or dialog (OWN-112) also shows the SPEC-008 **card breakdown** (SHARE-043): "Owned for decks: `<X>`" (+ " (`<E>` more excluded from decks)"), "Locked by other decks: `<Y>`", "Available to this deck: `<Z>`", "This deck needs: `<card required>`", "Locked in by this deck: `<H>`" in a locked deck, then "(`<extra>` extra)" after the available line when `extra > 0`, the allocation per zone when the card is in more than one zone (e.g. "Main Deck 2 of 2 · Sideboard 0 of 1"), and the list "Other decks using this card" (SHARE-043, SHARE-015). The content is the same from every zone tile of that card. | design rule (OWN-022, OWN-024); [[Shared Cards and Lock-in]] SHARE-043 |
| OWN-043 | MUST | A card the user does not own at all shows "You don't own this card" (plus any excluded rows), followed by the SHARE-043 breakdown and other-decks list. | design rule |
| OWN-044 | SHOULD | Each printing row links to that entry in Collection (SPEC-007), so the user can change tags or counts there. Decks itself never edits the collection or tags. | [[My Collection]]; design rule |
| OWN-045 | — | **Withdrawn in v0.9.** The inline expand and its per-session state no longer exist (OWN-111…113). The selected card is not stored either. | RJ 2026-11-25 (H-260 #8) |

### F. Deck-level summary and missing list
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-050 | MUST | Deck summary: "`<A>` of `<R>` copies available" ("… copies locked in" in a locked deck, SHARE-050), where `R` = Σ qty over all **counted** zone entries (every zone, Runes included, OWN-028) and `A` = Σ allocated (= Σ over cards of `min(pool, card required)`); and "`<F>` of `<C>` cards fully available", where `C` = number of distinct counted `cardKey`s in the deck and `F` those with pool ≥ card required (OWN-021). When any deck card has `ownedExcluded > 0`, add "`<X>` copies excluded from decks" (Σ `min(ownedExcluded, card required − allocated card total)`, i.e. excluded copies that would have filled a gap). When R = 0 (the deck has no entries) the summary and the deck tile line read **"No cards to count"** instead of both count lines (SHARE-050), and the deck is "None available" (SHARE-051). **v0.9:** the summary is shown in the deck header (OWN-010 (f)) and again at the top of the Missing tab (OWN-111); both come from the same `view.summary`. **v0.10:** the header's copies line also carries the completion percentage (OWN-010 (f)); the Missing tab shows the counts only, **no percentage** (RJ 2026-11-25, H-320). | [[ADR-0006 Two Imports - Collection and Decks]]; board H-007; [[Shared Cards and Lock-in]] SHARE-050, SHARE-051 |
| OWN-051 | MUST | **Missing list:** every counted zone entry with `allocated < qty` (Runes included, OWN-028; copies locked by other decks count as missing here), quantity `qty − allocated`, grouped by zone in the deck view section order, each line "`<missing>` `<canonical name>`". **v0.9:** shown in the **Missing** tab (desktop, OWN-111) or, below 64rem, under the header summary; collapsed by default when it has more than 10 lines (phones and tablets; the Missing tab scrolls instead). "All cards available" when empty. | board H-007; design rule; RJ 2026-11-25 (H-260 #12) |
| OWN-052 | MUST | **Copy missing list** puts Riot-style text on the clipboard in the SPEC-006 DECK-085 layout (labels `Legend:`, `Champion:`, `Main Deck:`, `Battlefields:`, `Rune Pool:`, `Sideboard:` in that order, one blank line between sections, `<qty> <canonical name>` lines in stored order, empty sections omitted, `\n` line endings), so it can be pasted into Deck Import or another tool. Missing runes are written under `Rune Pool:` like any section (v0.5, OWN-028). Confirmation "Missing list copied". | [[Deck Import]] DECK-085; [[Collection Import Formats]] fact 1 |
| OWN-053 | SHOULD | A second copy option "Copy as one list" merges the missing list per `cardKey` (`<total missing> <name>`, deck order of first appearance, no section labels). **v0.9 (RJ 2026-11-25, choice 19 default):** it is the second item in the menu of the Copy missing list split button (the button's main action is OWN-052). | design rule; [[Decks]] §9 |
| OWN-054 | MUST NOT | **Rewritten in v0.9 (RJ, 2026-11-25).** The only percentage the app computes or shows is the **user's own completion** of one deck (OWN-101), and only where OWN-101 (d) puts it (the deck tile and the Deck detail header, v0.10). No other percentage, no score or rating, no ranking or ordering of decks by it (no sort and no filter on it), and **no comparison** against other users, the meta or tournament results is shown or computed. "No meta comparison" is [[ADR-0003 Tournament Results Only]]'s rule (no play rates, win rates, matchup data, tier lists, archetype shares or meta score); the old "no completion percentage" was this spec's own wording, not ADR-0003's and not a Riot rule. | RJ 2026-11-25 (H-260 #1); [[ADR-0003 Tournament Results Only]]; design decision 6 |
| OWN-055 | MUST NOT | The missing list has no prices, shop or buying links. | Out of scope; design rule |

### G. Unknown data
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-060 | MUST | **Null means Unknown** (SPEC-001 CARD-029): `domains: null` → "Domains: Unknown" (`[]` → "No domain"); `category: 'unknown'` → category "Unknown" with the verbatim `type`; null `isChampionUnit`, `championTag`, `isSignature`, `isPreview` are shown as Unknown where displayed (CARD-026, CARD-027). Stats are different: CARD-028 stores `null` when a stat is absent, so a null stat is omitted, not shown as Unknown. | [[Card Data Model]] CARD-026, CARD-027, CARD-028, CARD-029 |
| OWN-061 | MUST | **Unknown card** (cardKey not in the current catalog, DECK-088): a placeholder tile with the stored `DeckCard.name`, the flag **"Card no longer in the card data"**, no image, no card info, ban status from `banStatus()` by `cardKey` as for any card, and ownership **0** (state `none`, pool 0, no printing rows). It counts in `R` and in the missing list. | [[Deck Import]] DECK-088; [[Card Data Model]] CARD-033 (a lookup with no exact key returns "not found"; no fuzzy or alias fallback), CARD-012 (`cardKey` = key of the canonical name); [[Deck Legality]] LEGAL-019; [[ADR-0006 Two Imports - Collection and Decks]] "Your decks view decisions" (0 owned, placeholder tile) |
| OWN-062 | MUST | If the collection cannot be read (SPEC-003 store unreadable or newer version, COLL-071), or the `StoredTags` from the `TagStore` cannot be read (so exclusions are unknown and a `DeckOwnershipInput` cannot be built), the deck view still shows every card with info and ban status, all tiles in full colour without count labels, and a banner "Ownership unavailable: your collection could not be read." No tile is darkened on missing data, and Lock in is disabled (SHARE-020). If only the **lock store** cannot be read, ownership is still shown with all locks ignored, per SPEC-008 SHARE-061. | design rule; [[Shared Cards and Lock-in]] SHARE-061 |
| OWN-063 | MUST | If the catalog is not loaded, tiles show stored names only and the banner "Card data not loaded" is shown. `DeckOwnershipInput.catalog` (a `CollectionCatalogView`) is required by COLL-081, so ownership is not computed: tiles are shown as in OWN-062 (full colour, no count labels, nothing darkened). | [[My Collection]] COLL-081, `DeckOwnershipInput`; design rule |
| OWN-064 | MUST | A deck record shown read-only by DECK-091 (newer schema) is still shown with ownership; edit actions are disabled. | [[Deck Import]] DECK-091 |
| OWN-065 | MUST | **Locks and the deck tile when ownership is unavailable** (v0.5.1; RJ 2026-11-25, in chat, H-157: keep showing the lock; applies in the OWN-062 and OWN-063 states). Locks come from the lock store, not from ownership: (a) `DeckOwnershipView.lock` is the SPEC-008 SHARE-053 state `{ locked: true, lockedAt, complete: false, short: false, cardsShort: [] }` for a deck with a stored lock, and `null` for a deck without one or when the lock store is unreadable (SHARE-061); it is **not** `null` just because ownership is unavailable. (b) The deck view and tile show the "Locked" badge (never "cards short") and the lock filter OWN-006 lists the deck under Locked. (c) The tile ownership line reads **"Ownership unavailable"** (OWN-002 replaces the "copies available" text; the tile has no count, and a locked deck does not read "locked in"). (d) `ownershipFilter` is **`unavailable`** for every deck (SHARE-051 rule 0): it matches none of Ready to build, Partly available, None available, so those three filters list no deck while ownership is unavailable; with no ownership filter chosen the deck is listed. (e) Lock in is disabled with `ownership-unavailable` and Unlock stays enabled (SHARE-020, SHARE-053). | RJ 2026-11-25 (in chat, H-157; was the H-076 gate); [[Shared Cards and Lock-in]] SHARE-020, SHARE-051, SHARE-053; OWN-062/063 |
| OWN-066 | MUST | **Sign-in gate (SYNC-009, always on).** While the gate is not open (signed out, session lost, or first sync running), the Decks page `/decks` and the deck detail `/decks/:id` keep their page header and show the SPEC-010 sign-in panel below it instead of the deck list or deck view, and read nothing from the browser cache (so no deck, tile or ownership is computed or shown). This is a gate, not the OWN-062 / OWN-063 "ownership unavailable" states: it hides the whole page, those keep it. Once the gate opens the page shows its content without a reload. There is no mode without the gate (v0.6). The ownership rules in this spec are unchanged; panel text and gate rules are SPEC-010's. | [[Accounts and Sync]] SYNC-009 (amendment 2) |

### H. Recalculation
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-070 | MUST | The view recomputes when any input changes: the deck, **any other deck** (added, edited, deleted), a **lock** (lock in, unlock, SPEC-008), the collection (import, quantity edit), tags or a tag's "exclude from decks" flag (COLL-084), printing codes, the catalog (`catalogVersion`), ban data (`dataVersion`), format data (`FormatsFile.dataVersion`), or today's date. No re-import or reload is needed. | [[My Collection]] COLL-084; [[ADR-0006 Two Imports - Collection and Decks]] |
| OWN-071 | SHOULD | Changes made in another browser tab (storage events) are picked up within 1 s while the view is open. | design rule |
| OWN-072 | SHOULD | When the date changes while the view is open, ban status and legality update on the next focus or visibility change. | [[Deck Legality]] LEGAL-R02 |
| OWN-073 | MUST | Deck tiles in the list use the same function and the same `SharedPool` (SHARE-071), so a tile's summary always equals the deck view's summary for the same inputs. | design rule; [[Shared Cards and Lock-in]] SHARE-071 |

### I. Performance
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-080 | MUST | `computeDeckOwnership` for the largest allowed deck (150 entries, 300 copies, DECK-092) finishes in under 20 ms, and the list of 200 decks (DECK-092) computes all tile summaries in under 300 ms on a mid-range laptop, including one `computeSharedPool` run (SHARE-072). | [[Deck Import]] DECK-092; design rule |
| OWN-081 | MUST | Card images lazy-load (only tiles near the viewport request images) inside a box with **reserved aspect ratio**, so the layout does not shift when they load. Default ratio 63:88 (portrait). BLOCKED: needs research: the image dimensions the Riot API returns and whether battlefield images are landscape; until then every image is fitted (`contain`) into the 63:88 box. | [[Card Data & Images]]; design rule (no layout shift) |
| OWN-082 | MUST | **Rewritten in v0.9** (v0.8: "The Decks list shows no card images, only text tiles"). The Decks list shows **exactly one card image per deck tile: the Legend's thumbnail** (OWN-100), lazy-loaded (OWN-081). No other card image is on the list. | design rule; RJ 2026-11-25 (H-260 #1) |
| OWN-083 | SHOULD | Recomputation reuses unchanged inputs (e.g. one `deckOwnership(input, cardKey)` call per `cardKey` per `DeckOwnershipInput`), but results are never persisted (OWN-026). | design rule |
| OWN-084 | MUST | **Smooth scrolling, no pagination (v0.6, RJ 2026-11-24).** The Decks list (OWN-001…008) is one continuous scrolling list: no page numbers, no Previous / Next page controls, no "Page n of m", and no button that must be pressed to reveal more decks. Its default order (OWN-005), sort and filters (OWN-006) apply to the whole list, not to a page of it. The deck view's section lists (OWN-011) are shown whole in one scrolling page with sections in order; the card tiles of a long section render as the user scrolls. The behaviour (load or render as you scroll, placeholders so nothing jumps, scroll position kept on back-navigation, performance target) is defined once in [[My Collection]] COLL-093 and applies here unchanged. Tile summaries (OWN-073, OWN-080) are computed for the whole list before display, so a deck's tile never changes because it scrolled into view. **v0.9 (spec-writer default for [[Decks]] §14 gap 12, not an RJ choice):** with at most 200 decks (DECK-092) the list MAY render every tile at once (no windowing) if off-screen tiles are skipped by the browser and keep a reserved height, so nothing jumps; that meets this rule. | RJ 2026-11-24 ("No physical pagination, more like an infinite scroll"); [[My Collection]] COLL-093 |
| OWN-094 | MUST | **"Import deck" entry on Decks** (v0.7, H-174; RJ 2026-11-24, gate H-178 decision 4: "behaves exactly like the collection button"). The Decks page has a floating button **Import deck** (an upload icon and the label) that behaves as [[My Collection]] COLL-094 (a) to (f) say for "Add to your collection": the same form, size, position at the bottom right (above the phone tab bar at 40rem and below), layering below the header, tab bar, menus, dialogs and snack bars, collapse to an icon-only button while scrolling **down** on phones (accessible name unchanged), clearance **as COLL-094 (d) and (e) say since v0.14 (H-244; RJ 2026-11-25: "the FAB should never overlap the footer")**: the button never overlaps the footer at any scroll position (it docks 16 px above the footer, the page reserves its room above the footer, no empty band below it) and snack bars stay above it, docked or not; scrolled to the end the last deck tile is fully above it; tab order right after the page header and before the list's controls, `aria-haspopup="dialog"`. It is shown only when the gate is open (SYNC-009) and the deck list is shown (not while loading, not on the sign-in panel or the first-sync text, not on the empty state, OWN-008). Pressing it opens the SPEC-006 dialog titled **Import deck** (DECK-001); focus returns to it on close; a saved deck **stays on Decks** (the list updates in place, no navigation). `/decks?import=1` opens the same dialog once when the gate is open and the page is ready (SPEC-010 SYNC-159). Dropping a file on the page behaves as COLL-094 (i) with the overlay text "Drop to import a deck" (SHOULD). | RJ 2026-11-24 ([[ADR-0006 Two Imports - Collection and Decks]] follow-up, H-178); [[Brief H-175]] §7 as changed by RJ decision 4 |

### J. Shared display rules and neutrality
| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-090 | MUST | Every date shown is `MMM D, YYYY` with an English short month, e.g. `Nov 23, 2026`; event ranges as in CAT-037. Stored data stays ISO. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7; [[Tournament Deck Catalog]] CAT-037 |
| OWN-091 | MUST | An `incomplete` legality result is labelled **"Not fully checked"** everywhere in this spec. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7; [[Deck Legality]] LEGAL-R04 |
| OWN-092 | MUST | Card names, types and rules text are shown verbatim from the catalog; no Riot logos (Current State constraints). | [[Card Data Model]] CARD-031; [[Riot Developer Rules]] |
| OWN-093 | MUST | **What this screen sends (v0.6).** Decks, the collection, tags and locks come from the signed-in account through its browser cache ([[Accounts and Sync]] SYNC-140…); this screen only reads them. The **ownership result** (owned, available, missing, locked counts, tile fill) is computed on the device and is never stored or sent anywhere (OWN-026). The screen makes no request of its own for it, and nothing about what the user owns is shared with anyone else (SYNC-102). | [[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2); [[Deck Import]] DECK-090; [[Accounts and Sync]] SYNC-102 |

### K. The Decks list page (v0.9, H-252)
Design is the [[Decks]] brief and [[Decks Components]]; the behaviour and data rules are here. **Source key:** *RJ* = said or answered by RJ (cited); *RJ default* = RJ answered "default for all" (2026-11-25, H-251 session, confirmed in the H-260 row) to the recommended default of a [[Decks]] §13 choice; *proposal* = a default chosen here that RJ has **not** been asked (since v0.10 the former Open questions 10–15 are answered by RJ, 2026-11-25, H-320, and cited as such in the rows they touch).

| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-100 | MUST | **Legend art with the deck fill.** (a) Each tile shows the deck's **Legend** card art: the `art.thumbnailUrl` of its `defaultPrintingId` printing (OWN-016), lazy-loaded (OWN-081), decorative (empty alt text; the name and counts are the tile's text). (b) The art is **filled left to right by the whole deck's ownership**, not by the Legend card's own state: `f` = **deck fill** = `A / R` (OWN-101, exact, 0..1). `f = 1`: full colour, no overlay; `f = 0`: the `none` treatment (OWN-031); `0 < f < 1`: the left `f × 100 %` of the image width in full colour, the rest darkened, a straight vertical edge with the 1 px divider, left to right also in right-to-left layouts (the same drawing rule as OWN-032, applied to `f`). (c) In a **locked** deck `A` is the locked-in copies, so a locked complete deck is full colour (SHARE-040, SHARE-041). (d) **No Legend** (the deck has none, it is an unknown card, OWN-061, or the catalog is not loaded, OWN-063): the deck mark in the same box, no fill. (e) **Ownership unavailable** (OWN-062/063/065): the Legend art in full colour, no fill, no percentage. (f) `R = 0`: no fill. (g) The fill is never the only carrier of the state: OWN-101's text, the copies line and the chip say the same (WCAG 1.4.1); forced-colors and reduced-motion follow OWN-037 and OWN-035. | RJ 2026-11-25 (H-260 #1, option c: "the Legend's art fills left to right like a progress bar as the user owns more of the deck"); replaces [[Decks]] §13 choice 1 default (b) |
| OWN-101 | MUST | **Completion percentage (the user's own, v0.9).** (a) **Basis:** `A` and `R` exactly as OWN-050: `R` = Σ `qty` over all counted entries (every zone: Legend, Chosen Champion, Main Deck, Battlefields, **Runes** and **Sideboard**; SHARE-001, SHARE-006); `A` = Σ allocated = Σ over cards of `min(pool, card required)`, where the pool is `available(D, k)` for an unlocked deck and the holds-based pool of a locked deck (so a locked deck's `A` is its copies locked in). It counts **copies**, not cards, and weights every copy the same, so 9 `Chaos Rune` count 9 times. (b) **Value:** `p` = the whole number: **0** when `A = 0`; **100** when `A = R`; otherwise `min(99, max(1, floor(100 × A / R)))`. So it is never 100 unless every copy is available and never 0 unless none is. (c) **No value (`null`, nothing shown)** when `R = 0` ("No cards to count", OWN-050) or when ownership is unavailable (OWN-062/063/065). (d) **Where (v0.10, RJ 2026-11-25, H-320: two places, no more):** (1) on the deck tile, next to the Legend art (OWN-100), as "`p`%", set at **16 px, weight 600, the same size and weight as the deck name** (**v0.11, RJ 2026-11-26, H-392: not larger or bolder than the name; before this the built tile used 20 px, weight 700**); colour and position are unchanged and, being under large-text size, it meets 4.5:1 (OWN-034); the accessible text reads "`p` percent of copies available" ("… of copies locked in" in a locked deck); this size rule is for the tile only; the header's percentage is as OWN-010 (f) says, unchanged; (2) in the **Deck detail header**, at the end of the copies line (OWN-010 (f)), e.g. "34 of 66 copies available · 51%", accessible text "51 percent" after the copies text. It is the same `p` in both, so a deck's tile and its header never differ (OWN-073). It is **not** shown on the Missing tab, in the Card tab, in a dialog or on the section bar, and never on Collection. When (c) gives no value, neither place shows it. (e) **Computed, never stored** (OWN-026): `completionFill = A / R` and `completionPercent = p` come from `computeDeckOwnership` (`view.summary`) and `summarizeDeck` (`DeckTileSummary`), so the list and the detail agree (OWN-073). (f) It is the user's own share of the user's own deck against the user's own collection. It is not a score, rating or ranking, and nothing sorts or filters by it (OWN-054). Examples: 34 of 66 → 51 %; 65 of 66 → 98 %; 1 of 300 → 1 %; 299 of 300 → 99 %; 66 of 66 → 100 %; 0 of 66 → 0 %. | RJ 2026-11-25 (H-260 #1: the Decks list tile "shows a completion percentage"; H-320 Q10: also in the Deck detail header; H-320 Q11: rounding down, copies over copies needed across all six zones, 1–99 unless empty or complete); tile size and weight: RJ 2026-11-26 (H-392, option (b) of [[Decks Review]] "Open choices" 3) |
| OWN-102 | MUST | **Ownership chip, lock badge and copies line (v0.10.3).** (a) **Chip:** from `DeckTileSummary.ownershipFilter` (SHARE-051), one chip with an icon and text, never colour alone: `ready` → **Ready to build**; `partial` → **Partly available**; `none` → **None available**; `locked` (a locked deck that is not short) → **no chip**; `unavailable` → **no chip** (OWN-065). (b) **Lock badge:** when `DeckTileSummary.lockBadge` is not null, the tile shows it as its own badge (`app-lock-badge`, lock icon, or warning icon when short, plus text) **next to the chip**, never inside it and **without a date** (the lock date, "Locked in on `<date>`", is only in the Deck detail header, SHARE-041): **Locked** for a locked deck that is not short; **Locked · `<n>` cards short** (warning colour, warning icon) for a short one. (c) **Combinations:** a locked complete deck shows no chip, only **Locked**; a short locked deck shows its **Partly available** or **None available** chip (its `ownershipFilter`, SHARE-051 rules 4, 5) plus **Locked · `<n>` cards short**; while ownership is unavailable a locked deck shows no chip and **Locked**, never "cards short" (OWN-065, SHARE-053 (b)); an unlocked deck shows its chip and no badge. The copies line is `ownershipLine` verbatim ("34 of 66 copies available", "54 of 54 copies locked in", "No cards to count", "Ownership unavailable"). The chip words are the SHARE-051 filter option names, so tile and filter use the same words. The ownership filter chips in the toolbar show their **deck counts** ("Ready to build 1"; the user's own counts, not meta). | [[Decks]] §4, §13 choices 3, 6 (RJ default: text, no separate bar; counts shown); (a)–(c): RJ 2026-11-25 (H-382 (2): the lock is a separate badge next to the chip, no date on the tile) |
| OWN-103 | MUST | **Ban flag on the tile.** From the deck's cards' `banStatus()` (OWN-015), counting distinct `cardKey`s, not copies: "1 banned card" / "`<n>` banned cards" (ban icon, danger colour) for status `banned`, and "1 card banned from `<date>`" / "`<n>` cards banned from `<date>`" (schedule icon, warning colour; `<date>` = the **earliest** `effective` among the `upcoming` ones, OWN-090 format) for `upcoming`; both lines when both apply; nothing when neither applies, and nothing when ban data is not loaded (the page notice of OWN-015 covers it). The legality label (OWN-004) is unchanged. | RJ default ([[Decks]] §13 choice 2); the engine does not return these counts yet (Data contract) |
| OWN-104 | MUST | **Tournament decks on the tile.** For `source.kind === 'tournament'` the tile shows the **player** (`pilot`, verbatim, DECK-061) on its own line below the source line (OWN-003, which carries placing, event and dates). Wording stays neutral (CAT-035). For `kind: 'user'` there is no player line. The source URL is not a link on the tile (the tile is one link, OWN-002); it is on Deck detail (OWN-010 (d)). | RJ 2026-11-25 ([[Decks]] §13a #1: "the deck grid will show the legend and some player/tournament info if coming from tournaments"); the player line is the name alone, RJ 2026-11-25 (H-320, Open question 14) |
| OWN-105 | MUST | **Toolbar, count line and notices.** (a) **Inline:** search, the ownership chips (OWN-102 counts), the Lock filter (All decks / Locked / Not locked) and Sort. **In a "Filters" menu:** Legality and Source (OWN-006); on phones (40rem and below) "Filters" opens a full-screen dialog holding Ownership, Lock, Legality and Source, with "Show `<n>` decks" and "Clear filters". (b) **Count line** (polite status): "`<n>` decks" / "1 deck"; with a search or filter "Showing `<x>` of `<y>` decks" (replaces the placeholder "`<n>` decks saved."). (c) **Active filters** show as removable chips under the toolbar with a "Clear filters" action. (d) **Locked complete decks and "Ready to build":** when `own=ready` hides at least one locked complete deck (SHARE-051 group `locked`), a muted line "Locked decks are under Locked." with a "Show locked decks" action (sets `lock=locked`, clears `own`) shows under the count line. (e) **Unknown URL values** (`own`, `lock`, `legality`, `source`, `sort`) are ignored with the notice "1 filter value not found and was ignored" (as COLL-062). (f) **While ownership is unavailable** the ownership chips are disabled with the hint "Not available while ownership is unavailable" (OWN-065 (d)). (g) The page lede reads "Decks you want to build. Cards you own are shown in full color." | RJ default ([[Decks]] §13 choices 5, 6, 7, 26); (e), (f): RJ 2026-11-25 (H-330), accepted as written ([[Decks]] §14 gap 6, brief L6/L13) |

**Status of the Decks list requirements under v0.9:** OWN-001, 004…008, 015…017 (OWN-015 notice wording changed), 020…029, 030…037, 060…066, 070…073, 080, 081, 083, 084 (sentence added), 090…094 **active, unchanged** (except as noted in each row). OWN-002, 003, 054, 082 **rewritten**. OWN-100…105 **new**.

### L. Deck detail (v0.9, H-252)
Same source key as section K.

| ID | Level | Requirement | Source |
|---|---|---|---|
| OWN-110 | MUST | **One scrolling page, with a section bar.** Deck detail scrolls like Collection (OWN-084 applies): one page, the header (OWN-010) on top, then the six sections in Riot order (OWN-011), each as a heading and a grid (Card view) or list (List view, OWN-114). The header's copies line carries the completion percentage (OWN-010 (f), v0.10). A **section bar** sits sticky under the page header with an in-page link to each section; the section in view has `aria-current="location"`; an empty section stays in the bar, muted; on phones the bar scrolls sideways. A missing section still shows "No cards in this zone" (OWN-011). **Counts in the bar (v0.11, RJ 2026-11-26, H-392 (4)):** (a) **Main, Battlefields, Runes and Sideboard** show their card count always, including 0 ("Main 39", "Battlefields 0"). (b) **Legend and Champion** (single slots) show **no count when the slot holds its card**, and show **"Legend 0" / "Champion 0" only when that slot is empty**. (c) The count is visible text, so an empty slot differs from a full one by words and not by the muted colour alone (WCAG 1.4.1); the muted style of an empty section (above) stays as well. | RJ 2026-11-25 ([[Decks]] §13a #4 "layout similar to collections when you just scroll"; choice 13 default); counts in the bar: RJ 2026-11-26 (H-392 (4), recommendation of [[Decks Review]]) |
| OWN-111 | MUST | **Card panel (desktop).** (a) **When:** at **64rem and wider** Deck detail has a **persistent panel on the right** (a column about 20rem wide; sticky under the headers, with its own scroll when taller than the viewport). It replaces the v0.8 brief's "sticky summary aside". (b) **Selected card:** the panel shows one card, the **selected card**. When Deck detail loads, the **first card in section order** is selected and shown, which is normally the Legend (when the Legend section is empty, the first card of the next section that has one). A tile or row press (OWN-038) selects that card; the selection is kept while the page is open and is **not stored**. A selected card that leaves the deck (changed in another tab) is replaced by the first card, with the polite status "That card is no longer in this deck." A deck with no card shows "This deck has no cards." in the Card tab. The selected tile or row is marked (a visible outline and `aria-current="true"`). (c) **Two tabs, "Card" and "Missing"** (a tab list: Left / Right arrows move, Home / End, the panel is the tab panel): **Card** (default, and selected again whenever a card is selected) shows OWN-112; **Missing** shows the deck summary (OWN-050), the missing list (OWN-051) and Copy missing list (OWN-052, 053), or "All cards available"; **it shows no percentage** (v0.10: the percentage is in the header only, OWN-010 (f)). The tab labels are exactly "Card" and "Missing". (d) **Below 64rem** (tablets and phones) there is no panel: a press opens the card dialog (OWN-113) and the summary and missing list sit under the header (OWN-051). | RJ 2026-11-25 (H-260 #8: "a persistent panel on the right; when Deck detail loads, the first card (usually the Legend) is selected and shown"; #12: "two tabs, Card and Missing"). (d) for tablets: RJ 2026-11-25 (H-320, Open question 12): the dialog below 64rem, the panel from 64rem |
| OWN-112 | MUST | **Card content (Card tab and dialog).** In this order: (a) the card art (`art.fullUrl`, OWN-016, alt text = card name) with the same fill as its tile; (b) the ban label (OWN-015); (c) the zone and count label (OWN-033), with the per-zone allocation when the card is in more than one zone (OWN-042); (d) **This deck**: the SHARE-043 breakdown lines, word for word (OWN-042); (e) **Your printings**: the OWN-041 groups, or "You don't own this card" (OWN-043); rows link to Collection (OWN-044); (f) **Other decks using this card** (SHARE-043, each linking to that deck); (g) **Card**: type · category, domains, the non-null stats, `text` (OWN-014, OWN-060). An unknown card shows only "Card no longer in the card data" (OWN-061). While ownership is unavailable, (c) to (f) are replaced by "Ownership unavailable: your collection could not be read." (OWN-062). | [[Decks]] §8; OWN-014…017, 041…044; SHARE-043 |
| OWN-113 | MUST | **Card dialog (below 64rem).** The same content as OWN-112 in a dialog (full screen on phones): title = card name, Escape or the close button closes it and focus returns to the pressed tile or row, previous / next buttons step through the deck's cards in section order (SHOULD). While open it follows store changes (OWN-070); if the card has left the deck it closes with the notice "This card is no longer in this deck." Other-deck links go to that deck and close the dialog. | RJ 2026-11-25 (H-260 #8: "Phones: a dialog"); [[Decks]] §8 |
| OWN-114 | MUST | **Card view and List view.** A two-button toggle ("Card view", "List view") sits in the deck toolbar under the header. **Card view** (default) is the tile grid of OWN-115. **List view** shows the same cards in the same sections as short rows: `<thumbnail> <qty>× <Card Name>` (for example "2× Lightning Rush"; "1×" is shown in List view because the row has no `×N` badge), where the thumbnail carries the **same fill** as the Card view tile (OWN-030…032, OWN-036) and the row also shows the count label "`<allocated>` of `<qty>` available" (or "… locked in", OWN-033, with its deck-total part when split), the shared line (SHARE-042) and the ban label (OWN-015). Desktop: several rows per line in a grid of rows; phone: one column; every row is at least 44 px tall. Both views use the same data (`OwnershipCard`), the same press target (OWN-038) and the same selection (OWN-111). The choice is remembered on this device (like Collection's view settings) and is not stored in the account. | RJ 2026-11-25 ([[Decks]] §13a #5: "Card view and List view ... `<thumbnail image> 2× <Card Name>` ... still shows the '2 of 3 ...' availability text"); the default view (Card view), "remembered on this device", the 44 px row and "1×" in List view: RJ 2026-11-25 (H-320, Open question 13) |
| OWN-115 | MUST | **Card tile face (Card view).** Art (63:88; a battlefield letterboxed, OWN-081), the `×N` badge (OWN-040), name (two lines at most), type verbatim (OWN-014), the count label's first part as a chip with its state icon (OWN-033) and its deck-total part on its own muted line, the shared line (SHARE-042), the ban label (OWN-015) and the "Preview" flag (OWN-017). Ownership unavailable: full colour, no chip, no shared line (OWN-062). Grid columns: at least 9rem each. | RJ default ([[Decks]] §13 choices 9, 10); [[Decks]] §7 |
| OWN-116 | MUST | **Lock in, Unlock and the reason line.** Lock in is an `aria-disabled` button (focus kept) while `canLock()` is not ok, with the reason of SHARE-020 shown as **visible text** under the actions and tied to the button (`aria-describedby`); a tooltip alone is not enough. Unlock needs no confirmation (SHARE-023). Lock in asks the SHARE-021 confirmation; the feedback texts and the "Locking in…" state are SHARE-029. Copy missing list is hidden when nothing is missing or ownership is unavailable. | RJ default ([[Decks]] §13 choices 16, 19, 22); [[Shared Cards and Lock-in]] SHARE-020, SHARE-021, SHARE-029 |
| OWN-117 | MUST | **Rule check dialog.** The legality label's Rule check control opens a dialog listing the SPEC-002 failed rules with their LEGAL-R07 messages (LEGAL-R08 display rules) and every banned or upcoming-banned card with its zone and date (the DECK-051 wording, e.g. "Nocturne, Horrifying, banned since Nov 23, 2026"). Not fully checked shows its `notEvaluatedReason`s (DECK-052). It changes nothing in the deck. | RJ default ([[Decks]] §13 choice 24); [[Deck Import]] DECK-051, DECK-052 |
| OWN-118 | MUST | **Rename, and the description.** (a) **More → Rename** opens a dialog with **Name** (required, 1–80 characters after trimming, DECK-070), **Description** (optional plain text, up to 4,000 characters, stored in the deck's existing `notes` field, DECK-073) and, for a deck with `source.kind === 'user'`, **Source** (text and URL, DECK-071); a tournament deck's source is shown, not editable (DECK-061 copies values verbatim). (b) **Rename works on every deck at any time**: imported decks, tournament decks, duplicates, and **locked decks** (a lock freezes the cards, not the name; SHARE-025). Only a read-only deck (DECK-091) cannot be renamed. (c) Saving sets `updatedAt` (DECK-074), changes no lock, hold, ownership figure or allocation, and shows "Deck renamed." as a snack bar when the name changed. An empty name is refused with the dialog open and the old name kept. (d) The header shows the new name and description at once; the list tile shows the new name. (e) **No card editor** in v0.9 (OWN-010; SPEC-006 DECK-080 deferred). | RJ 2026-11-25 ([[Decks]] §13a #2 "All deck names can be changed by the user at any time", also while locked; H-260 #14: "Rename only (name, source, notes)"; header "a short description (may be empty)"). That the description **is** `notes`: RJ 2026-11-25 (H-320, SPEC-006 open question (a)); that saving a rename sets `updatedAt` and moves the deck to the top: RJ 2026-11-25 (H-320, SPEC-006 open question (c)) |
| OWN-119 | MUST | **States and feedback.** (a) **Loading** (longer than 200 ms): a title bar placeholder and two skeleton sections, no shimmer. (b) **Deck not found (v0.11, RJ 2026-11-26, H-392 (6)):** the page has **no "Deck detail" heading**; its **H1 is "This deck isn't in your decks"**, followed by "It may have been deleted on another device." and a "Back to Decks" link; also shown, with a polite status, when the open deck is deleted elsewhere. There is exactly one H1 on the page. The link's look and target size are the H-467 back-link fix ([[Decks Review]] S7), not decided here. (c) **Read-only deck** (DECK-091): an info banner "This deck was saved by a newer version of Rift Builder. You can view it, but not change it."; Lock in, Rename and Delete are disabled with that reason; Copy and Export work (OWN-064). (d) **Changed in another tab:** recompute in place (OWN-070/071); the panel follows (OWN-111) and so does the header's percentage (OWN-010 (f), OWN-101). (e) **Other texts:** "Missing list copied" (OWN-052), "Deck duplicated." with Open (DECK-084), "Deck deleted." with Undo for 10 s (DECK-082/083), "Deck renamed." (OWN-118), the lock texts (SHARE-029). (f) Data states (ownership unavailable, card data not loaded, locks unreadable, ban data not loaded) are OWN-062/063/065, SHARE-061 and OWN-015, shown as a banner or notice in the same place as on the list. | RJ default ([[Decks]] §13 choices 16, 21, 23 and §10 D1…D18); (b) heading: RJ 2026-11-26 (H-392 (6)); the wording of (a) (loading state) and the polite status: RJ 2026-11-25 (H-330), accepted as written |

**Status under v0.11 (H-481):** OWN-101 (d) gains the tile % size, OWN-110 the section bar counts, OWN-119 (b) the not-found heading; nothing else in K or L changed. **Status of the Deck detail requirements under v0.10:** OWN-010 (f) gains the completion percentage (H-320); OWN-050, 101, 110, 111, 119 carry a sentence about it; the rest as under v0.9. **Under v0.9:** OWN-010 **rewritten**; OWN-011, 012, 014, 016, 017 **active, unchanged**; OWN-013 and OWN-039 **deferred**; OWN-038, 040, 041…044, 050…053 **reworded** (see each row); OWN-045 **withdrawn**; OWN-110…119 **new**.

## Data contract
```ts
// shapes only; no implementation
import type { UserDeck, DeckCard, DeckZone, DeckSource } from './deck-import';   // SPEC-006 v0.14.1
import type {
  DeckOwnership, DeckOwnershipInput, CollectionCatalogView, StoredTags, Tag, TagId,
} from './my-collection';                                                       // SPEC-007 v0.11, COLL-081
import type { SharedPool, CardUse, DeckLockState } from './shared-cards';     // SPEC-008 v0.4.7
// v0.5: no isRuneEntry() (SPEC-009 withdrawn); rune entries are counted entries (OWN-028)
import type { BanStatus, BanListFile, LegalityResult, FormatDef } from './deck-legality'; // SPEC-002 v0.4
import type { PlayableCard, Printing, CardCategory } from './card-data-model';   // SPEC-001 v0.4.1
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
  | { status: 'ok'; input: DeckOwnershipInput;  // input.catalog is the same snapshot as `catalog` below
      shared: SharedPool }                      // SPEC-008 computeSharedPool({ decks: all decks, locks, ownership: input })
  | { status: 'unavailable' };                  // collection or tags unreadable (OWN-062), or catalog not loaded (OWN-063)

// computeDeckOwnership(deck, ownership, catalog, banData, today): DeckOwnershipView
//   deck: UserDeck; ownership: CollectionOwnership; catalog: CollectionCatalogView | null (null = not loaded, OWN-063);
//   banData: BanListFile | null (null = not loaded → ban 'unknown'); today: IsoDate.
//   Pure (OWN-025). For each distinct counted deck cardKey: SPEC-008 availability(ownership.shared, deck.id,
//   cardKey) for the pool, and deckOwnership(ownership.input, cardKey) for the printing rows (an unknown card,
//   OWN-061, is 0 without a call). Rune entries are handled like every entry (OWN-028). Excluding tag names: Tag.label looked up by TagId in
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
  // v0.5: `isRune` removed (OWN-022a withdrawn); a rune tile is an ordinary tile (OWN-028)
  required: number;                           // this zone's qty
  allocated: number;                          // OWN-022, 0..required
  fill: number;                               // allocated / required, exact, 0..1 (OWN-023)
  state: OwnershipState;
  label: string;                              // '1 of 3 available' / '3 of 3 locked in' (OWN-033, SHARE-040); '' when ownership unavailable
  sharedLabel: string | null;                 // 'Also in 1 other deck · 1 locked' (SHARE-042); null when none
  // card-level (same on every zone tile of this cardKey)
  cardRequired: number;                       // Σ qty over counted zones (OWN-021) = SPEC-008 need
  ownedForDecks: number;                      // X, COLL-081; 0 for unknown card or unavailable ownership
  ownedExcluded: number;                      // E, COLL-081; never counted
  lockedByOthers: number;                     // Y, SHARE-010
  available: number;                          // Z = pool, SHARE-011
  heldByThisDeck: number | null;              // H in a locked deck (SHARE-043), else null
  otherUses: CardUse[];                       // 'Other decks using this card' (SHARE-015, SHARE-043)
  extra: number;                              // max(0, available − cardRequired) (OWN-024)
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
  locksIgnored: boolean;                      // SHARE-061 banner
  lock: DeckLockState | null;                 // SPEC-008; null = no lock or lock store unreadable. With ownership
                                              // unavailable a stored lock still gives the SHARE-053 state (OWN-065)
  sections: ZoneSection[];                    // ZONE_ORDER, all six (OWN-011)
  summary: {                                  // counted entries = every zone entry, Runes included (OWN-028)
    copiesRequired: number;                   // R
    copiesAvailable: number;                  // A
    cardsTotal: number;                       // C, distinct counted cardKeys
    cardsFullyAvailable: number;              // F
    copiesExcludedRelevant: number;           // OWN-050 excluded line
    completionFill: number | null;            // v0.9: A / R exact, 0..1 (OWN-100); null when R = 0 or ownership unavailable
    completionPercent: number | null;         // v0.9: OWN-101 (0 if A = 0, 100 if A = R, else floor clamped to 1..99); null as above.
                                              // v0.10: the Deck detail header reads this same field (OWN-010 (f)); no new field
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
  ownershipLine: string;                      // '34 of 66 copies available' / '54 of 54 copies locked in' /
                                              // 'No cards to count' when R = 0 (SHARE-050, OWN-050)
  ownershipFilter: 'ready' | 'partial' | 'none' | 'locked' | 'unavailable'; // exactly one per deck, first match (SHARE-051):
                                              // 'unavailable' = ownership unavailable (OWN-065; line 'Ownership unavailable');
                                              // 'locked' = locked, not short, R > 0; 'none' = R = 0;
                                              // 'ready' = unlocked and complete; 'none' = A = 0; else 'partial'
  lockBadge: string | null;                   // 'Locked' / 'Locked · 1 card short' (SHARE-050)
  updatedAt: string;                          // shown per OWN-090
  // v0.9 (OWN-100…104); all computed from the same DeckOwnershipView, never stored:
  legend: { name: string; imageUrl: string | null } | null; // Legend card of the deck; null = none / unknown / catalog not loaded (deck mark)
  completionFill: number | null;              // = view.summary.completionFill (OWN-100)
  completionPercent: number | null;           // = view.summary.completionPercent (OWN-101)
  bans: { banned: number; upcoming: number; upcomingFrom: IsoDate | null } | null; // distinct cardKeys (OWN-103); null = ban data not loaded
  pilot: string | null;                       // tournament decks only (OWN-104)
  readOnly: boolean;                          // DECK-091 (OWN-002 "Read-only" tag)
}
// summarizeDeck(deck, view: DeckOwnershipView, legality: LegalityResult | null, format: FormatDef | null): DeckTileSummary — pure
// The deck's `notes` (the description, OWN-118) is read from the UserDeck by the page; SPEC-006's UserDeck shape is unchanged.
//   format = the FormatDef whose id is deck.format; its `name` fills <format> (LEGAL-R08). null legality or format → 'Not fully checked'.
```

## Acceptance criteria
Card names are from [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] (`KENNEN_1`) and
[[2026-11 RC Europe - 5 - CTCG DZiden - Kai'Sa]] (`KAISA_5`). Printing ids (`p_lr_regular`, `p_lr_foil`)
are placeholders until the live payload (H-020). Today = 2026-11-23 unless stated. Unless stated, no other
deck uses the cards and no deck is locked, so available = `ownedForDecks`.

1. **Partial fill 1 of 3** (OWN-022, OWN-023, OWN-032, OWN-033)
   **Given** `KENNEN_1` with `Lightning Rush` ×3 in Main, and `deckOwnership(input, 'lightning rush')` =
   `{ owned: 1, ownedForDecks: 1, ownedExcluded: 0 }` **When** the deck view opens **Then** the
   Lightning Rush tile has `allocated 1`, `fill 1/3`, `state 'partial'`; the left third of the image is
   in full colour and the right two thirds darkened, with a divider at 33.33 % of the width; the label
   reads "1 of 3 available" and the accessible name "Lightning Rush, Main Deck, 1 of 3 available"; Lightning
   Rush appears in the missing list as `2 Lightning Rush` under `Main Deck:`.
2. **Excluded foil** (OWN-020, OWN-041, OWN-042, OWN-050)
   **Given** `KENNEN_1` and the user owns `Lightning Rush` 2 × `p_lr_regular` + 1 × `p_lr_foil`, the foil
   tagged `Collector` (tag id `t_col`, `excludeFromDecks: true` in `input.tags`), so
   `deckOwnership(input, 'lightning rush')` gives `owned 3, ownedForDecks 2, ownedExcluded 1` and the foil
   entry has `excludedByTagIds: ['t_col']` **When** the deck view opens **Then** the tile shows `fill 2/3`,
   "2 of 3 available"; selecting it (its Card tab or dialog, OWN-112) shows "Counts toward this deck: <regular code> ×2" and "Owned · excluded
   from decks: <foil code> ×1 · Collector" (`excludedByTagNames: ['Collector']`, looked up in `input.tags`), and
   the breakdown "Owned for decks: 2 (1 more excluded from decks)", "Locked by other decks: 0", "Available to
   this deck: 2", "This deck needs: 3"; the summary adds "1 copy excluded from decks". **When** the user turns the `Collector`
   flag off in Collection **Then**, without reload, the tile is full colour, "3 of 3 available", and the
   excluded line disappears.
3. **Banned card owned in full** (OWN-015, OWN-030, design decision 3)
   **Given** `KENNEN_1` with `Nocturne, Horrifying` ×3, the user owns 3 for decks, and ban data with wave
   `std-2026-11-23` **When** the view opens on 2026-11-23 **Then** the tile is in full colour, "3 of 3
   available", and shows "Banned since Nov 23, 2026" with a ban icon; the deck tile says "Not legal in Standard
   today". **When**
   today is 2026-11-20 **Then** the same tile shows "Banned from Nov 23, 2026" and stays full colour.
4. **Main ×2 + Sideboard ×1 with 2 owned** (OWN-021, OWN-022, OWN-033, OWN-042, OWN-051)
   **Given** `KAISA_5` with `The Empyrean` ×2 in Main and ×1 in Sideboard, `ownedForDecks 2` **When**
   the view opens **Then** the Main tile is `allocated 2, fill 1, full`, "2 of 2 available · 2 of 3 in this deck"; the Sideboard
   tile is `allocated 0, fill 0, none`, "0 of 1 available · 2 of 3 in this deck"; the card panel or dialog of either tile shows "Main
   Deck 2 of 2 · Sideboard 0 of 1"; The Empyrean is not fully available (2 < 3); the missing list has
   `Sideboard:` / `1 The Empyrean`. **Given** `ownedForDecks 1` instead **Then** Main is `fill 1/2,
   partial` and Sideboard `none`.
5. **Champion before Main** (OWN-022)
   **Given** a deck with `Kai'Sa, Survivor` as Chosen Champion ×1 and also ×2 in Main, and
   `ownedForDecks 2` **When** allocated **Then** Champion is `1 of 1` (full) and Main `1 of 2` (partial).
6. **Extra copies** (OWN-024, OWN-042)
   **Given** `KAISA_5` (Chosen Champion `Kai'Sa, Survivor` ×1) and the user owns 2 base + 1
   `RAD-SP1/005` tagged `Collector` (excluded) as in SPEC-007 AC 22 **When** the view opens **Then** the
   Champion tile is full, "1 of 1 available" (no extra on the face); its card panel or dialog shows "Owned for decks: 2
   (1 more excluded from decks)", "Locked by other decks: 0", "Available to this deck: 2 (1 extra)", "This
   deck needs: 1", with the base row ×2 and the Showcase row ×1 under "Owned · excluded from decks".
7. **Nothing owned, still readable** (OWN-031, OWN-034, OWN-050)
   **Given** `KENNEN_1` (66 copies in 32 cards, of which 12 rune copies in 2 rune cards) and an empty
   collection **When** the deck tile and view are shown **Then** the tile reads "0 of 66 copies available";
   the view summary reads "0 of 66 copies available" and "0 of 32 cards fully available"; every image,
   the two rune tiles included, has the darkened treatment (OWN-028); every name, count and ban label meets
   4.5:1 contrast; the missing list has 66 copies and "Copy missing list" yields text with a `Rune Pool:`
   section (`9 Chaos Rune`, `3 Order Rune`) that imports back via Deck Import into the same zones and
   quantities (DECK-086).
8. **Zone sections in Riot decklist order** (OWN-011, OWN-051)
   **Given** `KENNEN_1` **When** the view opens **Then** sections are Legend (1: `Kennen, Heart of the
   Tempest`), Chosen Champion (1: `Kennen, Storm of Shuriken`), Main Deck (39 cards), Battlefields (3),
   Runes (12: `Chaos Rune` ×9, `Order Rune` ×3), Sideboard (10), in that order (Battlefields before Runes,
   as in the DECK-085 export); `Fizz, Trickster` has a tile in Main (×1) and in Sideboard (×1). **Given**
   an empty collection **Then** the missing list groups are in the same order: Legend, Chosen Champion,
   Main Deck, Battlefields, Runes, Sideboard (OWN-028).
9. **Unknown card** (OWN-061)
   **Given** a deck whose stored entry `1 Zaun Warrens` has a `cardKey` the current catalog no longer has
   (hypothetical removal; the lookup returns "not found", CARD-033) **When** the view opens **Then** the Battlefields section shows a
   placeholder tile "Zaun Warrens" flagged "Card no longer in the card data", "0 of 1 available", state
   `none`; it is in the missing list, and the deck is "Not legal in Standard today" via LEGAL-019.
10. **Null attributes** (OWN-060)
    **Given** a card with `domains: null`, `category: 'unknown'`, `type: 'Spell'`, `stats.might: null`
    **When** its tile is shown **Then** it reads "Spell · Unknown", "Domains: Unknown", and shows no
    might value.
11. **Deck list** (OWN-002, OWN-003, OWN-004, OWN-005)
    **Given** two decks: `Kennen: ASC Evansrhim (1st, Riftbound Regional Championship: Europe)` added from
    Tournaments on Nov 20, 2026 and `Kai'Sa, Daughter of the Void` imported and edited on Nov 22, 2026
    **When** Decks opens **Then** the Kai'Sa deck is first; the Kennen tile's source line reads
    "1st, Riftbound Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026"; both tiles show "Not legal in
    Standard today" (banned cards as of 2026-11-23), the same label SPEC-004 CAT-045 shows for the Kennen
    list in Tournaments; no tile shows a rank, score or meta statistic (the one percentage a tile shows, and the Deck detail header too, is the
    user's own completion, OWN-101, AC 23, AC 33).
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
    **Given** also a stored `DeckLock` for `Kennen Tempo` (readable lock store) and none for `Kennen Control`
    **Then** (OWN-065; SPEC-008 AC 19) `Kennen Tempo` has `lock.locked = true`, badge "Locked", `ownershipLine`
    "Ownership unavailable", `ownershipFilter: 'unavailable'` and is listed with `lock=locked`; `Kennen Control`
    has `lock: null`, the same line and group; `own=ready|partial|none` list neither deck.
14. **Reduced motion** (OWN-035)
    **Given** `prefers-reduced-motion: reduce` **When** an import raises Lightning Rush from 1 to 2 owned
    **Then** the fill changes from 1/3 to 2/3 with no animation.
15. **Purity** (OWN-025, OWN-026)
    **Given** the same deck, ownership, catalog, ban data and today **When** `computeDeckOwnership` runs
    twice **Then** the outputs are deep-equal, and the stored `UserDeck`, collection, tags and locks (cache and account) are
    unchanged and nothing is sent anywhere (OWN-093).
16. **Copies locked by another deck** (OWN-020, OWN-033, OWN-042, OWN-051; SPEC-008 AC 2)
    **Given** two decks that each need `Hextech Ray` ×3 in Main, `ownedForDecks 3`, and the other deck locked
    in **When** this deck's view opens **Then** the Hextech Ray tile is `allocated 0`, `none`, "0 of 3
    available", accessible name "Hextech Ray, Main Deck, 0 of 3 available, also in 1 other deck, 1 locked";
    the card panel or dialog shows "Owned for decks: 3", "Locked by other decks: 3", "Available to this deck: 0", "This
    deck needs: 3" and the other deck "· needs 3 · Locked, holds 3"; the missing list has `3 Hextech Ray`.
    The other deck's view shows the "Locked" badge and "3 of 3 locked in".
17. **Runes are counted like any card** (OWN-011, OWN-022, OWN-028, OWN-033, OWN-050…052; v0.5, replaces
    the v0.4 "Assumed owned" AC)
    **Given** `KENNEN_1`, a collection holding every non-rune card of the deck in full and `Chaos Rune` ×6
    (unassigned, no excluded tag), no `Order Rune`, and no other deck **When** the deck view opens **Then**
    the Runes heading reads "Runes · 12 cards · 6 available"; the `Chaos Rune` tile is `allocated 6`, fill
    6/9, `partial`, label "6 of 9 available", accessible name "Chaos Rune, Runes, 6 of 9 available"; the
    `Order Rune` tile is `allocated 0`, `none`, darkened, "0 of 3 available"; the summary reads "60 of 66
    copies available" and "30 of 32 cards fully available"; the missing list has a Runes group with
    `3 Chaos Rune` and `3 Order Rune`; "Copy missing list" yields exactly
    the lines `Rune Pool:`, `3 Chaos Rune`, `3 Order Rune` (DECK-085 layout, no other section); no tile, heading or note says "Assumed owned" or "not
    tracked". **When** the user imports `3 Chaos Rune` and `3 Order Rune` (SPEC-003 Add) **Then**, without
    reload, both rune tiles are full colour, the summary reads "66 of 66 copies available", and the missing
    list reads "All cards available".
18. **A rune outside its zone is allocated like any card** (OWN-022, OWN-028; SPEC-002 LEGAL-015)
    **Given** a deck with `Chaos Rune` ×1 in Main and ×9 in Runes, a catalog where `Chaos Rune` has
    `category: 'rune'`, and `ownedForDecks('chaos rune') = 9` **When** the deck view opens **Then** the Main
    tile is "1 of 1 available · 9 of 10 in this deck" (full) and the Runes tile "8 of 9 available · 9 of 10
    in this deck" (partial, fill 8/9); the missing list has `1 Chaos Rune` under Runes; SPEC-002 LEGAL-015
    still reports the rune in Main.
19. **No migration; unimported runes show as missing** (OWN-029)
    **Given** a signed-in account (and its cache) whose collection, decks, tags and locks were written before v0.5, `KENNEN_1`
    stored with its `runes` zone and no rune in the collection **When** the deck view opens after the update
    **Then** no stored record is rewritten and no `schemaVersion` changes, the rune tiles read "0 of 9
    available" and "0 of 3 available", the runes are in the missing list, and no one-time notice is shown.
20. **Deck list scrolls without pages** (OWN-084; v0.6) **Given** a signed-in account with 120 decks (fixture) **When** `/decks`
    opens **Then** the first decks show at once in OWN-005 order, no element reads "Page", "Next" or "Previous" or
    shows a page number, and no button exists whose only job is to reveal more decks; **When** the user scrolls to
    the bottom **Then** the remaining decks appear continuously in the same order, every tile already shows its
    final ownership line and fill (no tile changes after it scrolls into view), and the tiles already on screen do
    not move. **When** the user changes the ownership filter **Then** the list shows the matching decks from the top.
21. **Gate always on** (OWN-066; v0.6) **Given** a signed-out visitor **When** they open `/decks` or `/decks/<id>` **Then** the
    page header and the SPEC-010 sign-in panel show, no deck or ownership is read or shown, and no setting changes this.
22. **"Import deck" button** (OWN-094, OWN-008; v0.7) **Given** a signed-in user with 3 decks **When** `/decks` opens at 1440 **Then** a button "Import deck" is fixed at the bottom right and no text on the page says "Import → Deck Import"; **When** they scroll the last 400 px in 10 px steps at 1440 × 900, 1024 × 768, 768 × 1024, 375 × 812 and 812 × 375 **Then** at every step the button's bottom edge is at least 16 px (±1 px) above the footer's top edge (v0.8, H-244); **When** they scroll to the end **Then** no deck tile is under it, it sits fully above the footer, and there is no empty band below the footer; **When** they press it **Then** the dialog titled "Import deck" opens, Escape returns focus to the button, and after Save the new deck is in the list and the page is still `/decks`. **Given** 390 px wide **Then** it sits above the tab bar, collapses to an icon while scrolling down and expands on scrolling up, with the accessible name "Import deck" in both states. **Given** no decks **Then** no floating button shows; the empty state reads "No decks yet" / "Import a deck list to see which of its cards you own." with an **Import deck** button and a Tournaments link. **Given** the sign-in panel or the first-sync text **Then** no button shows. **Given** `/decks?import=1` with the gate open **Then** the dialog opens once and the address becomes `/decks`.
23. **Legend art filled by the deck, and the completion percentage** (OWN-100, OWN-101, OWN-054; v0.9, RJ 2026-11-25)
    **Given** `KENNEN_1` (R = 66 copies, Legend `Kennen, Heart of the Tempest`) and a collection that gives A = 34 **When** `/decks` opens **Then**
    the tile's Legend art is full colour on its left 51.5 % (34 / 66, exact) with the 1 px divider and darkened on
    the rest, whatever the Legend card's own count; next to it the tile reads "51%" (accessible text "51 percent of
    copies available"), the copies line "34 of 66 copies available" and the chip "Partly available". **When** an
    import raises A to 66 **Then**, without reload, the art is full colour, the tile reads "100%", "66 of 66 copies
    available" and "Ready to build". **Given** an empty collection **Then** the art has the `none` treatment, "0%",
    "0 of 66 copies available", "None available". The Legend is the only card image on the tile (OWN-082).
24. **Percentage edges** (OWN-101 (b), (c))
    **Given** a deck with R = 300 copies and A = 1 **Then** the tile reads "1%" (never 0 %). **Given** R = 300 and A = 299 **Then**
    "99%" (never 100 %). **Given** R = 66 and A = 65 **Then** "98%". **Given** A = R **Then** "100%". **Given** an empty deck (R = 0)
    **Then** no percentage and no fill, the line "No cards to count", the deck mark. **Given** ownership is unavailable (OWN-062) **Then**
    no percentage, the Legend art in full colour with no fill, the line "Ownership unavailable". **Given** a deck without a Legend and A = 20 of
    R = 40 **Then** the deck mark is shown with "50%".
25. **Locked decks and the percentage** (OWN-100 (c), OWN-101 (a); SPEC-008 AC 2)
    **Given** a locked complete deck that needs 54 copies **Then** the Legend art is full colour, the tile reads "100%", "54 of 54 copies locked in"
    and the badge "Locked" (a separate `app-lock-badge`, no date), with **no ownership chip** (v0.10.3, OWN-102). **Given** the same deck after a Replace import leaves it 4 copies short in 2 cards **Then**
    the fill is 50 / 54, the tile reads "92%", "50 of 54 copies locked in", the chip "Partly available" and, next to it, the badge "Locked · 2 cards short" (no date); the deck stays locked. **Given** a
    second, unlocked deck that needs the same cards **Then** its A counts only the copies the first deck does not hold.
26. **Tournament deck on the list; the tile opens the deck** (OWN-002, OWN-003, OWN-104, OWN-103)
    **Given** the AC 11 Kennen deck added from Tournaments (pilot `ASC Evansrhim`) and one banned card (`Nocturne, Horrifying`, banned since Nov 23, 2026) and
    one upcoming ban from Dec 15, 2026 **When** Decks opens on 2026-11-25 **Then** its tile shows the Legend art, the source line
    "1st, Riftbound Regional Championship: Europe · Nov 6, 2026 – Nov 8, 2026", the player "ASC Evansrhim", "Not legal in Standard today", "1 banned card"
    and "1 card banned from Dec 15, 2026", "Updated Nov 20, 2026"; a deck imported from text has no player line. **When** the user presses
    anywhere on the tile **Then** the app opens `/decks/<id>`. **Given** ban data is not loaded **Then** no ban flag shows on any tile and the page shows one notice
    "The ban list couldn't load, so ban status is unknown."
27. **Deck detail opens with the Legend selected; two tabs** (OWN-111, OWN-112, OWN-051, OWN-052)
    **Given** `KENNEN_1` and a signed-in user at 1440 px **When** `/decks/<id>` opens **Then**, with no click, the right panel shows the **Card** tab for
    `Kennen, Heart of the Tempest` (art with its fill, "This deck" lines, printings, other decks, card info) and the Legend tile is marked as the selected card;
    **When** the user presses the `Lightning Rush` tile **Then** the panel shows that card and the Legend tile loses the mark; **When** the user chooses the
    **Missing** tab **Then** the panel shows "34 of 66 copies available", "18 of 32 cards fully available" (no percentage; OWN-111 (c)) and the missing list grouped by section
    with Copy missing list; **When** they press a tile again **Then** the Card tab shows. **Given** a deck with an empty Legend section **Then** the first card of the next
    section that has one is selected. **Given** an empty deck **Then** the Card tab reads "This deck has no cards."
28. **Header** (OWN-010, OWN-118)
    **Given** a deck whose `notes` are "Budget list, swap the sideboard later." **Then** the header shows the name, that text as the description, the source line, the legality
    label with "Rule check", and "34 of 66 copies available · 51%" with "18 of 32 cards fully available" **in the header** (v0.10; AC 33), and the actions Lock in, Copy missing list and More (Export, Duplicate,
    Rename, Delete); there is no Edit cards action. **Given** `notes` is empty **Then** no description and no placeholder show. **Given** a 600-character description **Then** the header clamps it to 3 lines with "Show more".
29. **Below 64rem: a dialog, not a panel** (OWN-111 (d), OWN-113)
    **Given** `/decks/<id>` at 375 px and at 768 px **Then** no card panel shows, the summary and the missing list sit under the header (collapsed when the list has more than 10 lines), **When** the user presses a
    tile **Then** a dialog with the same content as the Card tab opens (full screen at 375 px), Escape closes it and focus returns to that tile. The section bar scrolls sideways at 375 px and the current section has `aria-current="location"`.
30. **List view** (OWN-114, OWN-033, OWN-040)
    **Given** `KENNEN_1` **When** the user chooses **List view** **Then** each card is a short row "[thumbnail] 3× Lightning Rush" with the thumbnail filled 1/3 from the left, the label "1 of 3 available", the shared line and the ban label; `Fizz, Trickster` has a row in Main Deck and one in
    Sideboard; the sections are the same; at 1440 px several rows share a line and at 375 px there is one column with rows at least 44 px high; pressing a row selects the card (panel) or opens the dialog as in Card view; **When** the page is reloaded **Then** List view is still on, on this device.
31. **Rename any deck, locked or not** (OWN-118; SPEC-006 DECK-081; SPEC-008 SHARE-025)
    **Given** a locked tournament deck `Kennen: ASC Evansrhim (1st, Riftbound Regional Championship: Europe)` **When** the user chooses More → Rename, sets the name to `Kennen budget`, the description to "Budget list" and saves **Then** the header and the tile read `Kennen budget`, the lock badge, holds and every count are unchanged, the deck's `source` is unchanged, `updatedAt` is newer, and the snack bar says "Deck renamed."; **When** the name is emptied **Then** saving is refused and the old name stays. **Given** a read-only deck (`schemaVersion: 2`) **Then** Rename is disabled with the read-only banner showing.
32. **Neutrality kept** (OWN-007, OWN-054)
    **Given** Decks with three decks **Then** the sort menu offers only Last updated, Name A–Z and Date added, no control sorts or filters by the percentage, and no tile or header shows a rank, score or comparison with other users, the meta or tournament results.
33. **Completion percentage in the Deck detail header** (OWN-010 (f), OWN-101 (c), (d), OWN-111 (c), OWN-119 (d); v0.10, RJ 2026-11-25, H-320)
    **Given** `KENNEN_1` (A = 34, R = 66) **When** `/decks/<id>` opens at 1440 px and at 375 px **Then** the header's copies line reads "34 of 66 copies available · 51%" (accessible text "34 of 66 copies available" then "51 percent"), the
    line below it reads "18 of 32 cards fully available" with no percentage, and the deck's tile on `/decks` reads "51%" (the same value). **When** the user opens the **Missing** tab
    **Then** it shows "34 of 66 copies available" and "18 of 32 cards fully available" and **no** percentage; the Card tab and the card dialog show none either. **When** an import in another tab raises A to 66 **Then**,
    without reload, the header reads "66 of 66 copies available · 100%". **Given** a locked complete deck that needs 54 copies (AC 25) **Then** the header reads "54 of 54 copies locked in · 100%"; after a Replace import leaves it 4 copies short
    in 2 cards, "50 of 54 copies locked in · 92%", the same as its tile. **Given** R = 300 and A = 1 **Then** "· 1%"; **given** A = 299 **Then** "· 99%"; **given** A = 0 of 66 **Then** "0 of 66 copies available · 0%". **Given** an empty deck (R = 0)
    **Then** the header shows "No cards to count" and no percentage and no " · ". **Given** ownership is unavailable (OWN-062) **Then** the header shows no percentage (the OWN-062 banner "Ownership unavailable: your collection could not be read." shows, as before). **Given** a read-only deck with
    ownership readable **Then** the percentage shows like any deck.
34. **Section bar counts for Legend and Champion** (OWN-110; v0.11, RJ 2026-11-26, H-392 (4))
    **Given** `KENNEN_1` (a Legend, a Chosen Champion, 39 Main Deck cards) **When** `/decks/<id>` opens at 1440 px and at 390 px **Then** the section bar links read "Legend", "Champion" and "Main 39" (Legend and
    Champion have no count; Main, Battlefields, Runes and Sideboard always have one, each with that section's card count). **Given** a deck with no Legend and no Chosen Champion **Then** the bar reads "Legend 0" and "Champion 0" as visible text, the two links are still muted, and the text differs from the full-slot case by words, not by colour alone;
    **Given** a deck with a Legend and no Champion **Then** "Legend" has no count and "Champion 0" does. **Given** a deck with no Battlefields **Then** the link reads "Battlefields 0". **When** the empty slot's card is added by an import in another tab **Then**,
    without reload, "Legend 0" becomes "Legend". The `aria-current="location"` and sideways scroll rules of OWN-110 are unchanged.
35. **Deck not found has one H1, "This deck isn't in your decks"** (OWN-119 (b); v0.11, RJ 2026-11-26, H-392 (6))
    **Given** `/decks/does-not-exist` **When** the page opens **Then** its only H1 reads "This deck isn't in your decks", no element reads "Deck detail", the line "It may have been deleted on another device." and a "Back to Decks" link show under it, and the link goes to `/decks`.
    **Given** the open deck is deleted on another device **Then** the same page shows, with the polite status of OWN-119 (b).
36. **Deck tile completion % is 16 px, weight 600** (OWN-101 (d); v0.11, RJ 2026-11-26, H-392)
    **Given** `/decks` with a deck whose A = 34 and R = 66 (51 %) at 1440 px and at 390 px, light and dark **Then** the tile's "51%" has computed `font-size` 16 px and `font-weight` 600, the same as the deck name on that tile, its text still contrasts 4.5:1 or more with the tile
    background, and its accessible text is unchanged ("51 percent of copies available"). **Then** the Deck detail header's "34 of 66 copies available · 51%" (AC 33) is not changed by this item.

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
   and the printing rows (OWN-041) follow whatever entries COLL-081 returns.
2. **BLOCKED: needs research (H-020):** image dimensions and battlefield orientation in the API (OWN-081).
3. **Resolved (RJ, 2026-11-23, ADR-0006 "Your decks view decisions"):** tiles show the default printing
   art regardless of owned printings (OWN-016); copies are allocated main deck first, sideboard last
   (OWN-022); sections follow Riot's decklist order, Battlefields before Runes (OWN-011); unowned cards are
   grayscale and dimmed to about 55 % brightness with app text kept readable (OWN-031, OWN-034).
4. **Default chosen by Claude (RJ may change, ADR-0006):** an unknown card is always 0 owned with a
   placeholder tile (OWN-061), even if Collection still records copies under that `cardKey`.
5. **Time zone of "today"** follows SPEC-002's open question (LEGAL-R02).
6. **Resolved (RJ, 2026-11-23, ADR-0006 "Shared cards, lock in and runes"):** the pool is availability after
   other decks' locks (OWN-020, SPEC-008). RJ also accepted SPEC-008's lock-order and shortfall defaults and
   decided there is no force lock on 2026-11-23 (SPEC-008 open questions 1 and 2, both resolved). The
   2026-11-23 "runes are assumed owned" part was **reversed by RJ on 2026-11-24** ("Allow users to import
   runes as well and treat them like any other card."): OWN-028, OWN-022a withdrawn, SPEC-009 withdrawn.
7. **Resolved (RJ, 2026-11-24): "No notice".** No one-time message explains that runes now count as
   missing until imported (OWN-029). This keeps the Claude default: no released screen ever showed "Assumed
   owned" (the Decks page is a placeholder in production; H-060 and H-086 are not shipped). The proposed
   dismissible notice and its wording were **not used**, and no "seen" flag is stored.
8. **Research (H-099, needs H-020):** whether the Riot API lists rune cards with their own printings, set
   codes and collector numbers (and the foil / alt-art rune printings of [[Physical Copies Across Decks]]
   fact 11). OWN-016's default-printing art for rune tiles depends on it; the ownership rules here don't.
9. **Resolved 2026-11-25 (RJ, H-260):** the Legend art fills by the user's deck ownership and the tile shows a completion % (OWN-100, OWN-101); OWN-054 changed for the user's own completion only. RJ asked whether the "no percentage" rule was Riot's: it was not (it was this spec's own); ADR-0003 and Riot's policy forbid metagame data only. Deck detail's persistent right panel with tabs Card and Missing replaces the sticky aside (OWN-111, OWN-112); phones get a dialog (OWN-113). Every other [[Decks]] §13 choice is the recommended default (RJ, "default for all").
10. **Resolved 2026-11-25 (RJ, H-320; was "For RJ (H-252, OWN-101)"): the completion percentage is also shown on Deck detail, in the header, next to "X of Y copies available"**, e.g. "34 of 66 copies available · 51%" (RJ chose option (b) in the header; **not** on the Missing tab). Same OWN-101 value as the tile, absent when ownership can't be read or R = 0 (OWN-010 (f), OWN-101 (d), AC 33). This changed the spec; the recommended default (tile only) was **not** used.
11. **Resolved 2026-11-25 (RJ, H-320; was "For RJ (H-252, OWN-101)"): rounding and basis as written (option (a)).** Copies available over copies needed across all six sections (runes and sideboard included), rounded **down**, shown 1…99 unless A = 0 (0) or A = R (100) (OWN-101 (a), (b)).
12. **Resolved 2026-11-25 (RJ, H-320; was "For RJ (H-252, OWN-111 (d))"): tablets as written (option (a)).** The card dialog below 64rem, the persistent panel from 64rem; between 40rem and 64rem there is no panel (OWN-111 (d)).
13. **Resolved 2026-11-25 (RJ, H-320; was "For RJ (H-252, OWN-114)"): List view defaults as written (option (a)).** Card view first; the choice is remembered on this device, not in the account; List view rows are at least 44 px high; List view writes "1×" for a single copy while Card view hides ×1 (OWN-114, OWN-040).
14. **Resolved 2026-11-25 (RJ, H-320; was "For RJ (H-252, OWN-104)"): the player line is the player's name alone (option (a)).** The tournament deck's default name (DECK-062) is kept; see SPEC-006 open question (b), also resolved by RJ 2026-11-25 (OWN-104).
15. **Resolved 2026-11-25 (RJ, H-320; was "Default chosen here (RJ may change)"): older messages stay as written.** Message style: new strings in this version use contractions as the brief does; the older strings OWN-062 and SHARE-061 ("could not") and SHARE-021's straight quotes around the deck name are unchanged. Original note: new strings in this version use contractions as the brief does ("couldn't", "isn't"); the older strings OWN-062 and SHARE-061 ("could not") and SHARE-021's straight quotes around the deck name are left as written ([[Decks]] §14 gaps 5 and 13). No behaviour changes; one wording pass can unify them later.
16. **Resolved 2026-11-25 (RJ, in chat, H-157; was SPEC-008 open question 5, "RJ to confirm" on OWN-065): while ownership is unavailable a locked deck keeps showing its lock** (OWN-065 (a)…(e) as written: "Locked" badge, lock filter, Unlock enabled, Lock in disabled "Ownership unavailable", tile line "Ownership unavailable", filter group `unavailable`). No text changed except the attribution.
17. **Resolved 2026-11-25 (RJ, in chat, H-330; was "still `review`, the three *proposal* defaults"): RJ accepted all three as written.** OWN-105 (e): unknown URL filter values are ignored with "1 filter value not found and was ignored"; OWN-105 (f): while ownership is unavailable the ownership chips are disabled with "Not available while ownership is unavailable"; OWN-119 (a): the loading state (title bar placeholder and two skeleton sections, no shimmer, after 200 ms) and the polite status when the open deck is deleted elsewhere. No text changed except the Source cells. No *proposal* marker is left in a live requirement, so nothing in this spec waits on RJ.
18. **Resolved 2026-11-26 (RJ, H-392 answers, filed as H-481): H-392's six points.** (4), (6) and the tile % change the spec (OWN-110, OWN-119 (b), OWN-101 (d); ACs 34, 35, 36; build H-482). **(1), (2), (3), (5) stay as built, no SPEC-005 text change** (as of the [[Decks Review]] of 2026-11-25): (1) the actions layout follows RJ's H-475 layout, with Copy missing list beside Lock in ([[Decks Components]]); (2) the shared "none" chip keeps its stronger border (`--color-border-strong`, measured 3.28:1 light, 3.95:1 dark); (3) "Ownership unavailable" replaces the copies line (OWN-102, OWN-062); (5) on phones the Card view / List view toggle is icon-only, 44×44, with accessible names "Card view" / "List view", `aria-pressed`, in a group "Show cards as" (OWN-114).
19. **Not decided (not asked of RJ, H-481):** the not-found page's document title (the reviewer proposed "Deck not found · Rift Builder", not RJ's answer) and the look of its back link (H-467). A builder keeps the built title and applies H-467 until told otherwise.

## Changelog
Pin-only fix 2026-11-26 (H-291, no version bump, no requirement change): the OWN-003 example and ACs 11 and 15 now read `1st, Riftbound Regional Championship: Europe`, the official name ([[Tournament Deck Catalog]] CAT-001; RJ 2026-11-25: official name everywhere). Current: 0.11.1 (2026-11-26, H-476, source: the build, H-475, [[Validation H-460 H-461 H-475]]; no new RJ decision): OWN-010 text matches the built header: from 40rem the actions sit top-right beside the title side and wrap under it only when they don't fit, below 40rem one column; the lock badge (g) sits in the meta row before the legality label, above the summary. **Wording only: no requirement, rule, data field or AC changed** (OWN-116 and SPEC-008 AC 23 already agreed); no pin to this spec needs a behaviour change, SPEC-008 and the Spec Index pins move to 0.11.1; build none. Previous: 0.11 (2026-11-26, H-481, source: RJ 2026-11-26, H-392 answers): (4) the Deck detail section bar shows "Legend 0" / "Champion 0" only when that slot is empty and no count otherwise, never colour alone (OWN-110, AC 34); (6) the deck-not-found page has no "Deck detail" heading and its H1 is "This deck isn't in your decks" (OWN-119 (b), AC 35); the deck tile's completion % is 16 px, weight 600, like the deck name (OWN-101 (d), AC 36; the built tile used 20 px, 700). H-392 (1), (2), (3), (5) recorded as settled as built (Open question 18); Open question 19 (not-found document title) added. **No ownership rule, data field or filter changed**; pins to this spec in SPEC-008 and the Spec Index move to 0.11; build H-482; status stays `draft`. Previous: 0.10.3 (2026-11-25, H-383, source: RJ 2026-11-25, H-382 (2)): on the deck tile the lock is a **separate badge** (`app-lock-badge`) next to the ownership chip, **no date** (the lock date stays in the Deck detail header). OWN-102 rewritten (a locked complete deck shows no chip, only "Locked"; a short locked deck shows its Partly / None available chip plus "Locked · `<n>` cards short"; ownership unavailable shows no chip and "Locked"), OWN-002 says the badge is separate and dateless, AC 25 updated, Source cell of OWN-102 cites RJ; pin SPEC-008 0.4.7. **No ownership rule, filter group or data field changed** (`ownershipFilter` and `lockBadge` are as before; the built tile already behaves this way, H-060). Previous: 0.10.2 (2026-11-25, H-330, RJ 2026-11-25 in chat): RJ accepted the three *proposal* defaults as written (OWN-105 (e), OWN-105 (f), OWN-119 (a) with its polite status); their Source cells now cite him, Open question 17 resolved. **No requirement or behaviour changed.** Status `review` → `draft`: no *proposal* or "RJ to confirm" marker is left in a live requirement; `draft`, not `approved`, because RJ has not approved the whole spec. Previous: 0.10.1 (2026-11-25, H-256, RJ 2026-11-25 in chat, H-157): OWN-065 and the Summary line "Ownership unavailable" now cite RJ's answer (the lock stays shown, tile line "Ownership unavailable", filter group `unavailable`) instead of "RJ to confirm"; Open question 16 added (resolved), 17 notes why `review` stays; pin SPEC-008 0.4.6. **No requirement or behaviour changed.** Status stayed `review` then (Open question 17, closed in 0.10.2). Previous: 0.10 (2026-11-25, H-320, RJ 2026-11-25 answers to Open questions 10…15): **Q10 changes the spec:** the completion percentage is also in the Deck detail header, at the end of the copies line ("34 of 66 copies available · 51%"), not on the Missing tab (OWN-010 (f) rewritten; OWN-101 (d) two places; OWN-050, OWN-054, OWN-110, OWN-111 (c), OWN-119 (d) one sentence each; design decision 6; AC 11 note; ACs 27, 28 updated, **AC 33 new**; data contract comment: the header reads `view.summary.completionPercent`, no new field); Q11 to Q15 closed as written (rounding and copy weighting, panel from 64rem, Card view first and remembered per device, rows ≥ 44 px, "1×" in List view, player name alone, older messages unchanged), their *proposal* markers in OWN-101, 104, 111, 114 replaced by RJ's attribution; Open questions 10…15 resolved; pin SPEC-006 0.11.1; no ownership rule (OWN-020…029) changed; status stays `review`. Previous: 0.9 (2026-11-25, H-252, RJ 2026-11-25 (H-260 answers and "default for all" on [[Decks]] §13, plus §13a); [[Decks]], [[Decks Components]]): new sections K and L, OWN-100…105 (tile: Legend art filled by the deck's copies, the user's own completion %, chip and counts, ban flag, tournament player, toolbar) and OWN-110…119 (Deck detail: scrolling page and section bar, persistent right card panel with tabs Card and Missing, dialog below 64rem, Card view / List view, tile face, lock reason line, Rule check, Rename and description, states and feedback); **rewritten:** OWN-002, 003 (player added), 010 (header: name, description, "X of Y copies available" at the top, no Edit), 054 (the user's own completion % allowed, no meta comparison), 082 (one image: the Legend); **reworded:** OWN-015 (one notice when ban data is missing), 033 (two named label parts), 035 (180 ms fill animation), 038 (button, no expand), 040 (no `×1`), 041…044 (card panel or dialog), 050, 051, 053, 084; **deferred:** OWN-013, OWN-039 (RJ default, choice 20); **withdrawn:** OWN-045; design decision 6; ACs 2, 4, 6, 11 reworded, 23…32 new; data contract: `completionFill`, `completionPercent` on `view.summary`, `legend`, `bans`, `pilot`, `readOnly` on `DeckTileSummary`; pins SPEC-006 0.11, SPEC-008 0.4.5; Open questions 9…15; no ownership rule (OWN-020…029) changed; status stays `review`. Previous: 0.8 (2026-11-25, H-244, RJ 2026-11-25 "the FAB should never overlap the footer"; [[Brief H-245 H-246 H-247]]; build H-245): OWN-094 clearance now follows [[My Collection]] COLL-094 (d) and (e) at v0.14 (docks 16 px above the footer, room reserved above the footer, snack bars follow it), summary line, AC 22; pin SPEC-007 0.14; no ownership rule changed; status stays `review`). Previous: 0.7 (2026-11-25, H-174, RJ 2026-11-24 header decision / gate H-178: OWN-008 empty state now has an **Import deck** button and the copy "No decks yet" / "Import a deck list to see which of its cards you own." (no "Import → Deck Import" link); new OWN-094 floating **Import deck** button on Decks (as COLL-094; collapses on phones, hidden on the empty state, a saved deck stays on Decks, `/decks?import=1`); AC 22; pins SPEC-006 0.9, SPEC-007 0.12; no ownership rule changed; status stays `review`). Previous: 0.6 (2026-11-24, H-171, ADR-0007 amendment 2, account-only: OWN-066 gate always on; OWN-093 reworded (data comes from the account, ownership result is computed on the device and never sent); new OWN-084 smooth scrolling, no pagination; ACs 20, 21; pins SPEC-004 0.6, SPEC-006 0.8, SPEC-007 0.11, SPEC-008 0.4.4; no ownership rule changed; status stays `review`). Previous: 0.5.2 (2026-11-25, H-160). Earlier: 0.5.1 (2026-11-24, H-076: OWN-065 ownership unavailable: lock state, tile line, filter group `unavailable`; status `review`, RJ to confirm, SPEC-008 open question 5). Earlier: 0.5 (2026-11-24, H-097: runes are cards). Pin-only fix 2026-11-24 (H-071 attempt 2, no version bump): "Depends on" and import comments now pin SPEC-006 0.7, SPEC-007 0.9, SPEC-008 0.4.1. Full history: [[Your Decks Ownership View changelog]] (archived). New entries go in the archive note.
