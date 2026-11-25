---
tags: [spec]
id: SPEC-007
version: 0.14.1
status: review
depends_on: ["SPEC-001", "SPEC-002", "SPEC-003", "SPEC-008", "SPEC-011"]
research: ["[[Sets]]", "[[Card Data & Images]]", "[[Deck Construction Rules]]", "[[Physical Copies Across Decks]]", "[[Ban List]]", "[[Collection Import Formats]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
ui: ["[[Collection]]", "[[Collection Components]]"]
board: H-034, H-097, H-087, H-171, H-174, H-091, H-244
as_of: 2026-11-25
---
# SPEC-007: My Collection

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** the Collection screen: every owned printing as its own entry with a count badge, user tags on printings, sort and filter by any attribute or tag, and the `deckOwnership()` contract that Decks reads. **Since v0.13 the page shows only the simplified part** (image tiles, card dialog, search, three sorts); tags, filters and editing stay specified below as **deferred**.

**Key requirements**
- **v0.13 (H-091, `status: review`): the Collection page is simplified** ([[Collection]] rev 3, RJ 2026-11-24: "just ALL cards available … in full color", one image per card, a dialog on click). **Active:** owned cards only (COLL-100); one image-only tile per printing with the `×N` badge (COLL-101, COLL-016); a **card-level lock band** on every printing tile of a locked card (COLL-102); a **read-only card dialog** with the entry's details, "You own N across all printings", **Locked in** and **Could fit in** (COLL-103…107; COLL-004 and the ban label of COLL-008/009 moved here); summary "N copies of M cards" / "Showing X of Y" (COLL-010); search, three sorts and the URL `q` + `sort` (COLL-108, COLL-060/061); lock and ban data states (COLL-109). **Deferred, not deleted** (text kept; not built or shown; data, stores, sync and `deckOwnership()` unchanged): group-by-card, tags and exclude-from-decks UI, filters, manual edits and the other sorts (status table under COLL-109). RJ decided ban in the dialog, owned-only, Could fit in, badge at 1 copy and per-printing tiles; the deferrals and the three-sort cut are a **proposal pending RJ** (Open questions 11–15).
- COLL-001/011: one entry per owned printing, one unassigned entry per card, plus missing-printing entries.
- COLL-016: `×N` count badge when N ≥ 2.
- COLL-008: ban status from SPEC-002 `banStatus(…, today)`; no ban data → "Ban status unknown".
- COLL-012/014: unassigned and missing-printing entries sit at the card's `defaultPrintingId` (CARD-016).
- COLL-019/020: tags attach to a printing (`p:<printingId>`) or a card's unassigned copies (`u:<cardKey>`), never a whole card.
- COLL-031/033: default order `printingSortKey`; total, stable tie-breaker.
- COLL-035/041: Unknown is its own filter/sort bucket and sorts last.
- COLL-060/061: the query is remembered per browser and mirrored in the URL.
- COLL-070 (v0.11, account-only): quantities, tags and their assignments belong to the signed-in account; `CollectionStore`, `TagStore`, `PrintingCodeStore` and view state are the browser side (SPEC-010 SYNC-140…: a cache of the account, cleared on sign-out; printing codes and view state are never synced). COLL-071: `StoredTags` `schemaVersion` 3, `TagId` = `t_` + 6 base-62 characters, migrated on load. **COLL-074 withdrawn (v0.11):** "Delete all local data" went with local-only mode; deleting data is "Delete account and data" (SYNC-095). COLL-092: the Collection page is always behind the SYNC-009 sign-in gate.
- COLL-093 (v0.11, RJ 2026-11-24): **smooth scrolling, no pagination** for every card and deck list (rule defined here, applied by SPEC-005 OWN-084 and SPEC-004 CAT-079): no page numbers, no Previous / Next, nothing to press to reveal more; rows render and images load as you scroll, nothing jumps, filter / sort changes return to the top.
- COLL-080/081: "exclude from decks" tag flag; `deckOwnership(input, cardKey)` → `owned`, `ownedForDecks`, `ownedExcluded`, per-entry breakdown.
- COLL-086…088 (v0.4): one per-name pool for decks: `ownedForDecks` sums every printing of a name, and SPEC-008 subtracts locked decks from it (Collection itself is unchanged by locks); changes that make a locked deck short warn first, inside their confirmation (v0.5: also inside the SPEC-003 Replace confirmation; v0.7: also inside the Undo of an import, which asks for a confirmation only then unless COLL-058 already gives one, and is followed by a "… is now `<n>` cards short." notice once confirmed).
- COLL-090/091 (v0.10, H-087): card data unavailable → banner "Card data couldn't load. …" with Try again, no list, nothing written (COLL-015 does not apply); arriving from an import commit needs nothing extra, the Undo notice is SPEC-003's (IMP-073…075).
- COLL-094 (v0.12, H-174, RJ 2026-11-24): the **"Add to your collection"** floating button at the bottom right of Collection opens SPEC-003's import in a dialog; it collapses to an icon on phones while scrolling down, is hidden on the empty state (which has its own button) and whenever the list isn't shown, **never overlaps the footer** (v0.14, RJ 2026-11-25: it docks 16 px above the footer, and the page reserves its room above the footer, not below it), keeps the Undo snack bar clear of it, and a drop of a file opens the dialog; a commit stays on Collection. There is no `/import` page ([[Accounts and Sync]] SYNC-159).
- COLL-089 (v0.8, RJ 2026-11-24): **runes are cards**: listed, tagged, edited, exported and counted toward decks like any card, with no rune-specific text or section (COLL-087 withdrawn; SPEC-009 withdrawn).

**Shared types:** `DeckOwnership` / `DeckOwnershipInput` (read by SPEC-005, SPEC-008) · `CollectionCatalogView` (catalog view read by the pure functions) · `Tag`, `TagTarget`, `StoredTags` · `CollectionEntry`, `EntryBan` · `CollectionQuery`, `CollectionQueryInput`.
**Depends on:** [[Card Data Model]] v0.4.1, [[Deck Legality]] v0.4, [[Collection Import]] v0.14, [[Shared Cards and Lock-in]] v0.4.6 (`lockedShortfalls()`, SHARE-034; `hold`, `availability()`, SHARE-040; pin-only, H-252), [[Keyword Explanations]] v0.2.1 (the dialog's Keywords section, COLL-107). **Consumers:** [[Your Decks Ownership View]], [[Shared Cards and Lock-in]].
**BLOCKED (needs research):**
- Whether a foil is its own Riot API printing (COLL-011/016/020).
- Rarity order (COLL-034); domain list (CARD-025); variant representation (CARD-040/041); API set order (CARD-071).

## Purpose
Define the **Collection** screen and its data: a full list of the cards the user owns, user tags
on cards, and sorting, ordering and filtering by name, any card attribute, or tag. RJ's words
([[ADR-0006 Two Imports - Collection and Decks]]):

> In My Collection, there will just be a full list of cards they own. However, they can tag cards
> with whatever tags the user would like. There can be list sorting, ordering and filtering based on
> name or any attribute of the card and the user assigned tag. However, if no filter is applied, it
> will be ordered by set number order and the card number in that set — even accounting for overnumbered.

RJ's gate H-036 answers ([[ADR-0006 Two Imports - Collection and Decks]], "Gate H-036 decisions"
3, 4, 6, 7) refine this: every printing type (regular, foil, alt-art, overnumbered, signature) is its
own entry with a **count badge** when more than one copy is owned; **tags attach to printings**, not
to card names; a tag can be marked **"exclude from decks"**, so tagged printings stay in Collection
but do not count as owned in Decks.

The collection itself is produced by [[Collection Import]] (SPEC-003) and saved in the signed-in
user's account, with the browser holding a cache of it ([[Accounts and Sync]] SYNC-140…;
[[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2); ADR-0005 decision 1 is superseded). This spec adds manual editing, tags, the list view
and its query model, and the **deck-ownership contract** (section J) that [[Your Decks Ownership View]]
(SPEC-005) reads: per-`cardKey` owned copies, minus copies carrying an excluded tag.

## Definitions
- **`cardKey`** (SPEC-003 type `CardKey`): the playable-card key from [[Card Data Model]] (SPEC-001).
  All printings and variants that share a name share one `cardKey` ([[ADR-0005 MVP Product Defaults]]
  decision 2). Ownership for Decks is counted per `cardKey` (section J).
- **`printingId`** (SPEC-003 type `PrintingId`): the Riot API id of one printing (SPEC-001 CARD-010).
  Each printing the catalog lists separately (base/regular, foil, alt-art, Showcase, overnumbered,
  signature, promo) has its own `printingId`. Foil depends on research (open question 1).
- **Printing code** (SPEC-003 type `PrintingCode`): the public code `SET-NUMBER[suffix]` of a printing,
  i.e. SPEC-001 `Printing.publicCode` (e.g. `OGN-007a`, `RAD-SP1/005`). Display only, never a key.
- **`printingSortKey`** (SPEC-001 CARD-070) and **`setOrder`** (CARD-071): the **normative** printing
  order: set order (API `sets[]` order), then group (regular numbers; overnumbered; block form such as
  `SP1/005`; other codes), then number, suffix and `printingId`. This spec never redefines it.
- **`catalogVersion`**: the card-catalog version from SPEC-001 (CARD-068), recorded with the stored collection (IMP-054).
- **Collection record**: SPEC-003 `StoredCollection.cards[cardKey]` = `{ quantity, byPrinting }`, where
  `quantity` is the total copies of the card and `byPrinting` maps `printingId` → copies (IMP-048).
- **Unassigned count**: `quantity − Σ byPrinting`. Copies owned but with no known printing
  (e.g. imported from `3 Lightning Rush` plain text).
- **Entry**: one owned item in Collection. Three kinds:
  - **printing entry**: one `printingId` of `byPrinting` that resolves in the current catalog, with its count;
  - **unassigned entry**: the unassigned copies of one `cardKey` (at most one per card);
  - **missing-printing entry**: one `printingId` of `byPrinting` that no longer resolves (COLL-014).
- **Count badge**: the `×N` label on an entry whose count N is 2 or more (COLL-016).
- **Row**: one displayed line: an entry, or in the optional group-by-card view (COLL-013) one card group.
  Where requirements below say "row", they mean entry unless the group-by-card view is on.
- **Tile** (v0.13): how the Collection page shows one entry: its card image with the count badge and, when
  the card has locked copies, the lock band (COLL-101). One tile per entry, so "row" and "entry" below mean a
  tile on the page. **Card dialog**: the read-only dialog a tile opens (COLL-103).
- **Deferred** (v0.13): a requirement that keeps its ID and text but is **not built, shown or reachable on the
  Collection page** until a later version makes it active again (COLL-100). Deferral never touches stored data,
  the stores, sync, the migrations (COLL-071) or the pure functions (`deckOwnership()`, the query function).
- **Locked copies of a card** (v0.13): Σ `hold` over the card's **locked** uses (`pool.byCard[cardKey].uses`,
  SPEC-008 SHARE-015, `hold ≥ 1`). SPEC-008 holds copies per `cardKey` only, so they are **never allocated to a
  printing** (SHARE-002).
- **Representative printing** (of an entry): for a printing entry, its own printing; for an unassigned
  or missing-printing entry, the card's `defaultPrintingId` (SPEC-001 CARD-016), used only for position
  and image (COLL-012, COLL-014).
- **Tag**: a user-created free-text label. **Tag key**: the case-insensitive identity of a tag label (COLL-021).
- **Tag target**: what a tag is assigned to: a **`printingId`** (printing and missing-printing entries)
  or the **unassigned copies of a `cardKey`** (COLL-019). Never a whole `cardKey`.
- **Excluded tag**: a tag with `excludeFromDecks: true` (COLL-080). **Excluded entry**: an entry whose
  tag target carries at least one excluded tag.
- **`ownedForDecks(cardKey)`**: Σ counts of that card's entries that are **not** excluded.
  **`ownedExcluded(cardKey)`**: Σ counts of that card's excluded entries. `ownedForDecks + ownedExcluded =
  quantity` (COLL-081).
- **Unknown**: a card attribute that SPEC-001 gives as `null` (null = unknown, CARD-029), or the enum
  value `unknown` (`category: 'unknown'`, `variant.kind: 'unknown'`). Shown as the **Unknown** bucket in
  filters and sorts; never silently dropped.
- **Today**: the local calendar date used as `asOf` for ban status (SPEC-002 LEGAL-R02).
- **Query**: the current view mode + text search + filters + sort (`CollectionQuery`, data contract).
  The **default query** has no text, no filters, no explicit sort, entries view.

## Design decisions (summary)
1. **One entry per printing, with a count badge** (RJ, H-036 decision 3). Regular, foil, alt-art,
   overnumbered and signature printings are each their own entry; several copies of the same printing
   are **one** entry with a badge such as `×3`. Default order is `printingSortKey`. A "group by card"
   view remains as an optional SHOULD (COLL-013) but is never the default. This replaces v0.1's
   "Printings view / Cards view" toggle.
2. **Unassigned copies are one entry per card**, positioned at the card's `defaultPrintingId`
   (SPEC-001 CARD-016) in `printingSortKey` order, right after that printing's own entry if both are owned.
   So a name-only import still lands in a sensible place in set order.
3. **Tags attach to printings** (RJ, H-036 decision 4), keyed by `printingId`, so a tag on the foil does
   not apply to the regular copy. **Unassigned copies are their own tag target per `cardKey`**
   ("unassigned copies of Lightning Rush"), tagged separately from every printing. Why: (a) tagging the
   default printing instead would tag a printing the user may not own and would merge with a real owned
   copy of that printing that the user tagged differently; (b) making them untaggable would leave
   name-only imports (plain text, the simplest format) without tags and without a way to exclude them
   from decks; (c) keyed by `cardKey`, the target stays stable across re-imports that still lack
   printings. When unassigned copies later become printing-identified (e.g. a CSV Replace), nobody
   knows which printing the tagged copies were, so their tags are **not** moved automatically; the user
   is offered to copy them (COLL-019).
4. **"Exclude from decks" is a tag property** (RJ, H-036 decision 6). Collection computes the
   per-`cardKey` ownership for Decks once and exposes it as a pure contract (section J,
   `deckOwnership`), so SPEC-005 does not re-implement tag logic.
5. **Tags live in their own store**, keyed by tag target and separate from quantities, so SPEC-003
   Add/Replace never touches them and they survive re-imports by `printingId`.
6. **Printing codes are remembered locally.** SPEC-003 stores `byPrinting` by `printingId` only. To still
   show "Printing no longer found: OGN-007a" after a catalog update drops a printing, Collection keeps
   a small `printingId → printingCode` memory (COLL-075).
7. **Unknown is a value.** Null attributes and `unknown` enum values form an "Unknown" bucket that can be
   filtered on and sorts last in both directions.
8. **Shared display rules** (H-036 decision 7): dates are shown as `Nov 23, 2026`; an `incomplete`
   legality result is labelled "Not fully checked" (COLL-017, COLL-018).
9. **A wall of images, details in a dialog** (v0.13; RJ 2026-11-24, [[Collection]] rev 3: "the collections screen
   is just ALL cards available. and all in full color. … When you click on a card here it just pulls up a dialog
   with the card, how many you have and what deck(s) it's locked in and what decks it could fit in … Try to keep
   each card in the grid/list just the card image (with maybe a badge to show the total count …)"). So the tile
   is the image plus the badge, locked copies get a short text band, and everything else (COLL-004 fields, ban
   status, printings, decks) moves into the read-only dialog. Per-printing tiles stay (RJ, rev 3: COLL-011/016
   and H-036 decision 3 unchanged).
10. **Locks speak about the card, not a printing** (RJ, rev 3; SPEC-008 SHARE-002). The engine holds copies per
    card name, so the lock band and the dialog's Locked in never say which printing a locked deck holds.
11. **Deferred, not deleted** (v0.13, proposal pending RJ for items c–f of H-091). Features the simplified page does
    not offer stay in the spec with their IDs so they can return without re-deriving them; the data model they
    need (tags, flags, `deckOwnership()`) stays live.

## Requirements

### A. Collection entries and display
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-001 | MUST | Collection lists **every** entry derived from the stored collection: one printing entry per `byPrinting` printing with count ≥ 1, one unassigned entry per card with unassigned count ≥ 1, and missing-printing entries (COLL-014). Excluded entries are listed too (COLL-083). Entries with count 0 do not exist (COLL-052). | [[ADR-0006 Two Imports - Collection and Decks]] ("a full list of the cards the user owns"); H-036 #3, #6 |
| COLL-002 | MUST | A collection record is keyed by `cardKey` and holds `quantity` (integer ≥ 1) and `byPrinting` (**`printingId`** → integer ≥ 1), exactly as SPEC-003 `StoredCollection`. Invariant: `Σ byPrinting ≤ quantity`; the difference is the unassigned count. A stored record that breaks the invariant is repaired on load by raising `quantity` to `Σ byPrinting`, with a one-time notice. | [[Collection Import]] IMP-047, IMP-048, `StoredCollection`; design rule |
| COLL-003 | MUST | `quantity` is the number of copies of a card the user owns, across all its printings; printing and `variant.kind` never change **which card** a copy counts toward (CARD-013). Ownership for **Decks** (SPEC-005) is `ownedForDecks(cardKey)` from section J (COLL-081), i.e. `quantity` minus copies carrying an excluded tag; SPEC-005 reads COLL-081 and never re-derives it. | [[ADR-0005 MVP Product Defaults]] decision 2; [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5, #6; [[Card Data Model]] CARD-013, CARD-043 |
| COLL-004 | MUST | **Moved to the card dialog (v0.13; RJ: the grid shows "just the card image").** These fields are shown in the card dialog for the entry (COLL-103 (c)), not on its tile; the tile shows only the image, the badge and the lock band, and its accessible name carries the name, printing label, count, lock text and "banned" (COLL-101). Each entry shows: card image (COLL-006), canonical card name (verbatim, SPEC-001 CARD-031), the count badge (COLL-016), ban status (COLL-008) and, for a **printing entry**: set code and set name, collector number (verbatim string), printing code, rarity, and the variant label when `variant.kind` is not `base`/`unknown` (e.g. "Showcase", "Overnumbered", "Signature"). An **unassigned entry** shows "Printing not specified" instead of set and number; a **missing-printing entry** shows the COLL-014 label. | [[ADR-0006 Two Imports - Collection and Decks]]; H-036 #3; [[Card Data & Images]] #10 |
| COLL-005 | SHOULD, **deferred (v0.13)** | **Deferred (COLL-100; proposal pending RJ): tags, category/type, domains, cost and the "Preview" label are not shown on the page.** Each entry also shows its tags as chips (max 3 visible + "+N"; excluded tags marked per COLL-082), category/type, domains, and cost. Cards Riot marks as preview carry a "Preview" label. | [[Card Data & Images]] #3 (previews labelled); design rule |
| COLL-006 | MUST | Images are the official Riot API URLs from SPEC-001 (`art.thumbnailUrl` in the list, `art.fullUrl` in the detail view). No other image source, no re-hosting. If the URL is null or fails to load, the row shows a text placeholder with the card name; the row is still listed. | [[Card Data & Images]] #3, #7; [[Card Data Model]] CARD-005 |
| COLL-007 | MUST | Card data shown here (names, attributes, text) comes only from the SPEC-001 catalog (Riot API). No hand-curated tables. | [[ADR-0005 MVP Product Defaults]] decision 4; [[Card Data Model]] CARD-001 |
| COLL-008 | MUST | **Where it shows (v0.13; RJ decision 5, [[Collection]] "RJ's decisions"):** in the card dialog under the art (COLL-103 (b)), and as ", banned" in the tile's accessible name when the status is `banned` (COLL-101); **no ban icon or text on the tile**. Ban status per entry is SPEC-002's **`banStatus(cardKey, 'standard', 'global', today)`** (LEGAL-B10); Collection never re-derives it from waves. All entries of one card show the same status. `banned` shows "Banned since" + `bannedSince` formatted per COLL-017, e.g. "Banned since Nov 23, 2026". If ban data cannot be loaded, no `BanStatus` exists and the entry's status is the local value `unknown`, shown as "Ban status unknown", never "not banned". | [[Deck Legality]] LEGAL-B10, LEGAL-B02, LEGAL-R02; [[Ban List]] |
| COLL-009 | SHOULD | When `banStatus()` returns `upcoming`, the entry shows (in the card dialog only, v0.13; not in the tile's accessible name) "Banned from" + `effective` (COLL-017), e.g. "Banned from Nov 23, 2026", as a separate, non-blocking notice. | [[Deck Legality]] LEGAL-B10, LEGAL-B08 |
| COLL-010 | MUST | **Changed in v0.13 (the word "entries" is not shown).** The page shows one count line (`role="status"`, updated after the search debounce). With no search text: "`<N>` copies of `<M>` cards", N = total copies, M = distinct cards (`CollectionQueryResult.totals.totalCopies`, `distinctCards`), numbers with thousands separators and singular forms "1 copy of 1 card", e.g. "1,204 copies of 412 cards". With search text: "Showing `<X>` of `<Y>`", X = tiles shown, Y = all tiles (`rowsShown`, `rowsTotal`), e.g. "Showing 12 of 538". It counts tiles, never says "entries", and does not count the "Unresolved cards" section. (Before v0.13: distinct cards, entries, total copies, and "showing X of Y entries".) | design rule; [[Collection]] §7, §10 (H-091 b, proposal pending RJ for the wording) |
| COLL-016 | MUST | **Count badge:** an entry with count N ≥ 2 shows the badge `×N` (e.g. `×3`) with accessible text "3 copies". An entry with count 1 shows no badge. Copies of one printing are never shown as several entries. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #3 |
| COLL-017 | MUST | **Dates** are displayed as `MMM D, YYYY` with the English month abbreviation, e.g. `Nov 23, 2026`. Stored data, URLs and contracts keep ISO `YYYY-MM-DD`. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7 (shared display rule) |
| COLL-018 | MUST | Collection shows no deck legality verdict. Any SPEC-002 `incomplete` result shown here in a later version is labelled **"Not fully checked"**, never "Legal"; unknown ban status is "Ban status unknown", never "Not banned". | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7; [[Deck Legality]] LEGAL-R04 |

### B. Entries, views and position of unassigned copies
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-011 | MUST | **Entries view is the default:** one entry per owned printing, so every printing type (regular, foil, alt-art, Showcase, overnumbered, signature, promo) that the catalog lists as its own `printingId` is its own entry, plus one **unassigned entry** per `cardKey` whose unassigned count > 0. Two printings of one card are never merged in the default view. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #3; [[ADR-0006 Two Imports - Collection and Decks]] (default order) |
| COLL-012 | MUST | The representative printing of an **unassigned entry** is the card's `defaultPrintingId` (SPEC-001 CARD-016). The entry sorts by that printing's `printingSortKey`; if the same printing also has its own entry, the printing entry comes first, then the unassigned entry, then any missing-printing entries of that card (COLL-014). The unassigned entry shows that printing's image with the label "Printing not specified". Its printing-level attributes (set, collector number, rarity, variant kind) are Unknown for filters and explicit sorts (COLL-043). | [[Card Data Model]] CARD-016; design rule |
| COLL-013 | SHOULD, **deferred (v0.13)** | **Deferred (COLL-100; proposal pending RJ, H-091 c): the page has no group-by-card view; the card dialog lists the card's printings instead (COLL-104).** An optional **"Group by card"** view (off by default, remembered per browser, COLL-060) shows one row per `cardKey` with `quantity`, expandable to its entries (each with badge and tags). Its representative printing is the owned printing entry with the lowest `printingSortKey`, else the `defaultPrintingId`. The group row shows the union of its entries' tags; tags are assigned only on entries (in the expand), never on the group. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #3 (default stays per printing); design rule |
| COLL-014 | MUST | A `byPrinting` `printingId` that does not resolve in the current catalog (e.g. after a catalog update, SPEC-001 CARD-066) stays its **own missing-printing entry**: its count is not deleted or moved, its tags stay attached by `printingId`, and it is labelled "Printing no longer found: " + its remembered printing code (COLL-075), e.g. "Printing no longer found: OGN-007a" (if no code was ever remembered: "Printing no longer found (id <printingId>)"). It sorts at the card's `defaultPrintingId` position after the unassigned entry (COLL-012); its printing-level attributes are Unknown. Its copies still count toward the card (and toward `ownedForDecks` unless excluded). | [[Card Data Model]] CARD-066; [[Collection Import]] `StoredCollection`; design rule |
| COLL-015 | MUST | A record whose `cardKey` does not resolve in the current catalog is **not dropped**: it is shown in an "Unresolved cards" section at the end of the list (after all sorted rows, in `cardKey` order), with its `cardKey`, quantity and the tags of its tag targets, and a hint to re-import. It is excluded from attribute filters other than text search and tags. | [[Collection Import]] IMP-054; design rule |

### C. Tags
> **v0.13 (proposal pending RJ, H-091 d): the tag UI is DEFERRED**: COLL-021…028 and COLL-030 (create, normalize, limits, rename, merge, delete, assign, bulk, colour, manager) and the "offer to copy tags" part of COLL-019. **Still active as data rules:** the tag-target model of COLL-019 / COLL-020 (`p:<printingId>` / `u:<cardKey>`), COLL-029 (assignments are kept dormant), the `StoredTags` store, its migration (COLL-071) and sync. No screen creates, edits or shows tags; tags that already exist in the account (older data or another build) are kept untouched.

| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-019 | MUST, **target rule active; copy-offer UI deferred (v0.13)** | **Unassigned copies are one tag target per `cardKey`**, tagged separately from every printing of that card; their tags show on the unassigned entry only. When a card's unassigned count reaches 0 (e.g. a CSV Replace now identifies every printing), those tags become dormant (COLL-029) and, if the card has printing entries, the app offers once "Copy tags from unassigned copies to …" listing the entries; nothing is copied without the user's choice. | design rule (decision 3) |
| COLL-020 | MUST, **target rule active; creating and assigning UI deferred (v0.13)** | Users can create tags with any free text and assign **many tags to an entry**. Tags attach to **tag targets**: a `printingId` (printing and missing-printing entries) or the unassigned copies of a `cardKey` (COLL-019), never to a whole card. A tag on the foil printing of a card does not show on, filter or exclude its regular printing. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #4; [[ADR-0006 Two Imports - Collection and Decks]] |
| COLL-021 | MUST, **deferred (v0.13)** | Tag labels are trimmed, internal whitespace collapsed to one space, and NFC-normalized. Uniqueness is **case-insensitive**: the tag key is the Unicode case fold of the normalized label. Creating `trade binder` when `Trade Binder` exists reuses the existing tag. Display keeps the label as the user typed it. | design rule |
| COLL-022 | MUST, **deferred (v0.13)** | Limits: label length 1–40 characters after normalization; no control characters; at most **200 tags** per account; at most **20 tags per tag target**. Exceeding a limit shows an inline error and changes nothing. | design rule |
| COLL-023 | MUST, **deferred (v0.13)** | **Rename** a tag: the new label is validated as in COLL-021/022. Renaming to the key of another existing tag offers **merge** instead (COLL-024). Renaming keeps the tag's id, so assignments and saved views stay valid. | design rule |
| COLL-024 | MUST, **deferred (v0.13)** | **Merge** tag A into tag B: every tag target that had A gets B (no duplicates), A is deleted, B keeps its label, colour and `excludeFromDecks` flag. A confirmation states how many entries change and, if A and B differ in the flag, that the merged tag is (or is not) excluded from decks. | design rule |
| COLL-025 | MUST, **deferred (v0.13)** | **Delete** a tag: removes it and all its assignments after a confirmation naming the number of entries affected (and, for an excluded tag, the copies that will count in Decks again). Quantities are not affected. | design rule |
| COLL-026 | MUST, **deferred (v0.13)** | Assign / unassign tags from an entry (and from a multi-selection of entries, COLL-027). Assigning a tag label that does not exist creates it (type-ahead suggests existing tags by tag-key prefix). | design rule |
| COLL-027 | SHOULD, **deferred (v0.13)** | Bulk tagging: select several entries (or "select all entries matching the current query") and add or remove one tag for all their tag targets in one action. In group-by-card view, selecting a group selects all its entries. | design rule |
| COLL-028 | MAY, **deferred (v0.13)** | A tag may have a colour from a fixed palette of at least 8 colours with sufficient text contrast; default is a neutral colour. Colour is never the only way a tag is identified (label always shown). | design rule (accessibility) |
| COLL-029 | MUST | Tag assignments are stored by tag target independently of quantities (COLL-070). When an entry leaves the collection (count → 0, removal, or a Replace import), its assignments are **kept dormant** and reappear if the same `printingId` (or unassigned copies of the same `cardKey`) is owned again. A "Remove tags from printings I no longer own" action MAY clean them up. | design rule (decision 5) |
| COLL-030 | SHOULD, **deferred (v0.13)** | A tag manager lists all tags with the number of owned entries and copies carrying each, its "Exclude from decks" toggle (COLL-082), and offers rename, merge, colour and delete. | design rule; [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6 |

### D. Sort and order
> **v0.13 (proposal pending RJ, H-091 f): the page offers three sorts, "Set & number" (default, COLL-031), "Name" and "Copies" (COLL-108).** COLL-031, COLL-033, COLL-035 (Name only) and COLL-036 stay active. In COLL-032 / COLL-034 only `default`, `name` and `quantity` are active; the other sort fields (`set`, `collectorNumber`, `category`, `type`, `domain`, `cost`, `energy`, `might`, `power`, `rarity`, `variantKind`, `banStatus`, `tag`), the `dir` choice and COLL-037 are **deferred**. No direction control: Name is ascending, Copies is most first.

| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-031 | MUST | **Default order: with no explicit sort and no filter, entries are ordered by `printingSortKey` ascending** of their representative printing (SPEC-001 CARD-070/071: set order, then regular numbers, overnumbered after the regular range, block form such as `SP1/005`, other codes; then suffix). This also holds in group-by-card view (by representative printing) and when only filters/search are active and no sort is chosen. | [[ADR-0006 Two Imports - Collection and Decks]] (default order), H-036 #3; [[Card Data Model]] CARD-070, CARD-071 |
| COLL-032 | MUST, **narrowed (v0.13): only `default`, `name`, `quantity` active** | Sortable fields: `name`, `set`, `collectorNumber`, `category`, `type`, `domain`, `cost`, `energy`, `might`, `power`, `rarity`, `variantKind`, `quantity`, `banStatus`, `tag`, plus `default` (= COLL-031). Each sort has a direction `asc` / `desc`. One primary sort at a time. | [[ADR-0006 Two Imports - Collection and Decks]] ("any attribute of the card and the user assigned tag"); [[Card Data & Images]] #9 (attribute list) |
| COLL-033 | MUST | **Tie-breaker:** rows with equal primary sort values are ordered by `printingSortKey` ascending of the representative printing, then entry kind (printing, unassigned, missing-printing; COLL-012), then `cardKey`, then `printingId`. The tie-breaker does **not** flip with `desc`. Sorting is therefore total and stable across reloads. | design rule |
| COLL-034 | MUST, **narrowed (v0.13): only `name` and `quantity` comparisons active** | Comparison rules: `name` compares canonical names with locale `en`, base sensitivity (case and accents ignored), numeric segments as numbers; `set` uses `setOrder` (CARD-071); `collectorNumber` sorts by `printingSortKey` within the chosen direction; numeric stats compare numerically; `category` uses the SPEC-001 `CardCategory` enum order (`legend`, `champion`, `unit`, `spell`, `gear`, `rune`, `battlefield`, `token`) and `variantKind` the `VariantKind` order, with `unknown` treated as Unknown (COLL-035); `type` and `rarity` compare verbatim strings alphabetically (BLOCKED: rarity rank order needs research); `domain` compares the card's domain list sorted alphabetically and joined (a card with **no domain** `[]` is the value "No domain", which sorts before any domain; this is not Unknown); `quantity` uses the entry's count (group view: the card's `quantity`); `banStatus` order asc is not-banned, upcoming, banned; `tag` compares the alphabetically first tag label (tag key) of the entry, untagged entries last. | [[Card Data Model]] CARD-024, CARD-025, CARD-028, CARD-040, CARD-070, CARD-071; design rule |
| COLL-035 | MUST | **Unknown sorts last in both directions.** A row whose sort value is null or `unknown` (including `category: 'unknown'`, `variant.kind: 'unknown'`, the printing-level attributes of unassigned and missing-printing entries, and ban status `unknown`) is placed after all rows with known values, ordered among themselves by the tie-breaker. Unknown rows are never hidden by sorting. | design rule (null = unknown); [[Card Data Model]] CARD-029 |
| COLL-036 | SHOULD | Choosing "Default (set & number)" or "Clear sort" returns to COLL-031 order. | design rule |
| COLL-037 | MAY, **deferred (v0.13)** | A secondary sort field may be offered; if present, the tie-breaker of COLL-033 applies after it. | design rule |

### E. Filter and search
> **v0.13 (proposal pending RJ, H-091 e): all filters are DEFERRED: COLL-041…049** (attribute, domain, printing-level, tag, ban, quantity and decks filters, filter chips and "Clear all", the empty state that names filters). **Active: COLL-040 (name search).** The page's own empty-search state is COLL-108 (e). Nothing in COLL-048 is at risk: no filter exists to alter data.

| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-040 | MUST | **Name search:** the match is SPEC-001 CARD-038 (v0.14.1, RJ 2026-11-25): the query is normalized with `nameKey`, and a row matches when **every** space-separated token of `nameKey(query)` is a substring of the card's `cardKey`, **or** every token of the query with its leading article (`a` / `the`) dropped is. E.g. `zhonya` and `ZHONYA’S hour` both match `Zhonya's Hourglass`; `the` and `dreaming` both match `The Dreaming Tree`, and `the dreaming tree` also matches a card the API names `Dreaming Tree`. Empty query = no filter. Search SHOULD update within 150 ms after typing stops. | [[Card Data Model]] CARD-030, CARD-031, CARD-038; design rule; RJ decision 2026-11-25 (H-165) |
| COLL-041 | MUST, **deferred (v0.13)** | **Attribute filters** (multi-select): set, category, type, domain, cost, energy, might, power, rarity, variant kind. Within one attribute, selected values are OR; across attributes, AND. The option list shows only values present in the collection, each with its entry count, and includes **Unknown** (token `_unknown`) when at least one entry has null or `unknown` for that attribute; selecting Unknown matches those. For `category`, SPEC-001's `'unknown'` is shown only as the Unknown bucket, never as a value named "unknown". | [[ADR-0006 Two Imports - Collection and Decks]]; [[Card Data Model]] CARD-024, CARD-029; design rule |
| COLL-042 | MUST, **deferred (v0.13)** | Domain filter: a multi-domain card matches if **any** of its domains is selected; "No domain" is its own option (cards with `domains: []`), distinct from Unknown. | [[Card Data Model]] CARD-025; [[Deck Construction Rules]] #2 |
| COLL-043 | MUST, **deferred (v0.13)** | Printing-level filters (set, rarity, variant kind) apply per entry. Unassigned and missing-printing entries have Unknown printing-level attributes, so they match the Unknown option; the variant-kind filter additionally offers "Printing not specified" (`_unassigned`) and "Printing no longer found" (`_missing`) to select those entries. In group-by-card view a group matches if **any** of its entries matches, and its expand shows only matching entries. | design rule |
| COLL-044 | MUST, **deferred (v0.13)** | **Tag filter:** select one or more tags with mode **any** (entry has at least one) or **all** (entry has every selected tag); default mode any. Matching is per entry (tag target), so a tag on the foil printing does not match the regular printing. An **Untagged** option matches entries with no tags (combined with other selected tags in mode any = OR; mode all with Untagged plus a tag matches nothing and the UI says so). | [[ADR-0006 Two Imports - Collection and Decks]], H-036 #4; design rule |
| COLL-045 | MUST, **deferred (v0.13)** | **Ban filter:** `all` (default), `banned only`, `hide banned`. `banned only` matches cards banned as of today; `hide banned` keeps not-banned **and** ban-status-unknown rows (unknown is never treated as banned or as not banned silently: unknown rows show their label). | [[Deck Legality]] LEGAL-B02; design rule |
| COLL-046 | MAY, **deferred (v0.13)** | A **quantity filter** may offer "owned ≥ N"; if offered, N is an integer 1–9999. | design rule |
| COLL-047 | MUST, **deferred (v0.13)** | Active filters are visible as removable chips, with a single "Clear all" that restores the default query (COLL-031). When no row matches, the list shows an empty state naming the active filters, not a blank screen. | design rule |
| COLL-048 | MUST, **deferred (v0.13)** | Filters never alter stored data; tags, quantities and dormant entries are unaffected by any query. | design rule |
| COLL-049 | SHOULD, **deferred (v0.13)** | **Decks filter:** `all` (default), `counted in decks` (entries without an excluded tag), `excluded from decks` (entries with at least one excluded tag). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6; design rule |

### F. Editing quantities and removing cards
> **v0.13 (the H-091 row calls "no on-page editing" part of RJ's simplification, but RJ never named these IDs, so the deferral of each is a proposal pending RJ, H-091 e): manual edits are DEFERRED: COLL-050…056** (+ / − , removing at 0, typing a quantity, Remove card with Undo, Add card, saving manual edits). On the page, counts change **only** through the SPEC-003 import (Add, Replace, Undo). **Active:** COLL-057 (imports leave tags untouched) and COLL-058 (Undo of an import). COLL-002's invariant and COLL-052's "no entry with count 0 / a record at 0 is removed" still hold for what imports write. COLL-059 stays withdrawn.

| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-050 | MUST, **deferred (v0.13)** | Each entry has **+** and **−** controls. On a printing entry they change `byPrinting[printingId]` and `quantity` by 1; on an unassigned entry, `quantity` only; on a missing-printing entry only **−** is available (the printing is not in the catalog). | design rule |
| COLL-051 | MUST, **deferred (v0.13)** | In group-by-card view (COLL-013), **+** on a group row adds one unassigned copy. **−** removes one unassigned copy if any exist; otherwise it asks which entry to decrement (listing the card's entries in `printingSortKey` order). | design rule |
| COLL-052 | MUST, **deferred (v0.13)** | When an entry's count reaches 0 the entry disappears; when a card's `quantity` reaches 0 its record is removed from the collection (tags stay dormant, COLL-029). Quantities are integers 0–9999 per printing and per card; + is disabled at 9999. | design rule |
| COLL-053 | SHOULD, **deferred (v0.13)** | A user can set a quantity directly by typing a number on a row (same rules as COLL-050/052). | design rule |
| COLL-054 | MUST, **deferred (v0.13)** | **Remove card** removes the whole record of a card (all its entries) after a confirmation, or with an Undo notice available for at least 8 seconds. Tags stay dormant (COLL-029). | design rule |
| COLL-055 | SHOULD, **deferred (v0.13)** | **Add card** manually: search the catalog by name (COLL-040 matching against all catalog cards), pick a card and optionally a printing, choose a quantity; it is added as with an SPEC-003 Add import (unassigned if no printing chosen). | design rule |
| COLL-056 | MUST, **deferred (v0.13)** | Manual edits are saved through the same `CollectionStore` as imports, update `updatedAt`, and keep `catalogVersion`. They do not create a SPEC-003 import record. | [[Collection Import]] IMP-053, IMP-054 |
| COLL-057 | MUST | Interaction with SPEC-003 commits: **Add** increases `quantity` and per-printing counts as in IMP-049; **Replace** sets the collection to exactly the imported set. In both modes **tags are untouched**: they stay attached by `printingId` (and by `cardKey` for unassigned copies), so a printing present after the import keeps its tags, and printings no longer owned keep dormant tags (COLL-029). A Replace confirmation (IMP-050) also states "Tags are kept". | [[Collection Import]] IMP-049, IMP-050; design rule (decision 5) |
| COLL-058 | MUST | Undoing the last import (IMP-052) restores quantities only. If manual edits were made after that import, the undo confirmation warns that those edits will be lost. Tags are not affected by undo. *(v0.10)* The undo is offered by the SPEC-003 IMP-073 snack bar (IMP-075 gives the full behaviour, including that quantities changed in another tab or device count as edits made after the import); this screen has no other undo entry point. *(v0.7)* Where an undo also gets SPEC-008's locked-deck warning, that is COLL-088 (SHOULD): it goes inside this same confirmation. | [[Collection Import]] IMP-052, IMP-050a; design rule |
| COLL-059 | — | **Withdrawn in v0.6.** v0.5 added a `Tags` column to the collection CSV export (IMP-055). Under SPEC-003's positional row rule (IMP-040) every cell after the name is joined into the name, so that export did not round-trip. The export is now `Quantity,Card Name` only: **tags and "exclude from decks" flags are not in the CSV backup**; they are expected to survive through the planned sign-in sync ([[ADR-0007 Firebase Accounts and Firestore]]). Per-printing counts do round-trip (one row per printing with its code, one name-only row per card for unassigned, missing-printing and no-code copies, COLL-002, COLL-014): the format and the guarantee are SPEC-003 IMP-055 and its "Collection CSV export" rules; see AC 24. | RJ decision 2026-11-23 (H-045); [[Collection Import]] IMP-055 |

### G. View state and URL
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-060 | MUST | **v0.13: only the search text and the sort are part of the query the page uses** (view mode, filters, tag mode, ban filter and direction are deferred; stored values for them are ignored, need not be preserved, and never change what the page shows). The current query (view mode, search text, filters, tag mode, ban filter, sort, direction) is remembered **per browser** (a device preference, not account data: never synced, SYNC-019) and restored when the user returns to Collection. | design rule |
| COLL-061 | MUST | **v0.13 (proposal pending RJ, H-091 f): the page reads and writes only `q` and `sort`** (COLL-108 (c)); every other parameter listed below is deferred, ignored without a notice. The query is mirrored in URL query parameters (`view`, `q`, `sort`, `dir`, `set`, `cat`, `type`, `domain`, `cost`, `energy`, `might`, `power`, `rarity`, `variant`, `tag`, `tagMode`, `ban`, `decks`, `minQty`), with comma-separated multi-values, so a filtered view can be bookmarked or reopened in the same browser. `view=cards` selects group-by-card view. The unknown bucket is the token `_unknown`, "No domain" is `_none`, Untagged is `_untagged`, unassigned entries `_unassigned`, missing-printing entries `_missing`. Defaults are omitted, so the default query has a clean URL. | design rule |
| COLL-062 | MUST | **v0.13: the tag-id part is deferred; the notice stays** for an unknown `sort` value (COLL-108 (c)). Tags are referenced in the URL by **tag id**, so a bookmark survives a rename. A URL that names a tag id, set code or value that does not exist for this account drops that value and shows a one-line notice ("1 filter value not found and was ignored"). URLs never contain anything but query state (no quantities, no personal data). | design rule; privacy |
| COLL-063 | MUST | On load, URL parameters (if any) win over the remembered state; the result becomes the remembered state. Changes to the query update the URL in place (no new history entry per keystroke). | design rule |
| COLL-064 | MAY, **deferred (v0.13)** | **Deferred (COLL-100).** A user may save named views (e.g. "Kennen deck – unowned trades") that store a query. | design rule |

### H. Performance
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-065 | MUST | The list works with at least **5,000 entries** without blocking input. Basis: the Riot API catalog (SPEC-001) is the only card source; the community count is roughly 1,451 printings incl. promos ([[Card Data & Images]] #13, approximate, excludes RAD), so 5,000 leaves room for new sets and unassigned/missing entries. | [[Card Data & Images]] #13; [[Card Data Model]] CARD-001; design rule |
| COLL-066 | SHOULD | The list uses virtual scrolling (only visible rows plus a small buffer are rendered). On RJ's PC, with 5,000 entries, a sort or filter change SHOULD show results within 200 ms and first render within 1 s after data is loaded. | design rule |
| COLL-067 | MUST | Card images load lazily: only for rows in or near the viewport, thumbnails in the list, with fixed-size placeholders so the list does not jump. | [[Card Data & Images]] #7 (hotlink only); design rule |
| COLL-068 | SHOULD | Query evaluation is a pure function of (collection, tags, printing codes, catalog, ban data, today, query), all carried by `CollectionQueryInput`, so it can be unit-tested and moved off the main thread if needed. | [[Deck Legality]] LEGAL-R01 (same pattern) |

### I. Storage
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-070 | MUST | **Account-only storage (v0.11).** Quantities and tags (with their assignments and "exclude from decks" flags) belong to the signed-in account: its `state/collection` and `state/tags` documents are the record of truth ([[Accounts and Sync]] SPEC-010 SYNC-013, SYNC-015). The screen reads and writes them through interfaces backed by the **browser cache** of the account (SYNC-140…SYNC-145): quantities through SPEC-003's `CollectionStore`, tags through a `TagStore`. Two stores hold no account data and are never synced (SYNC-019): printing-code memory through a `PrintingCodeStore` (COLL-075), which is display data the cache rebuilds, and view state through a `CollectionViewStateStore`, which is a per-device preference (COLL-060). The cache is cleared on sign-out, on account deletion and when a different account signs in (SYNC-142); the view state and printing-code memory are cleared with it, as built. Nothing in the cache is ever uploaded into an account (SYNC-143). | [[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2); [[ADR-0006 Two Imports - Collection and Decks]] (tags); [[Collection Import]] IMP-053; [[Accounts and Sync]] |
| COLL-071 | MUST | Every stored record has a `schemaVersion`: `StoredTags` is `3`, `StoredViewState` is `2`, `StoredPrintingCodes` is `1`. A loader that finds an older version migrates it: `StoredTags` 1 (0.1 draft, assignments by `cardKey`) → each card's tags are copied to every printing entry currently owned for that card and to its unassigned target, `excludeFromDecks` = false (then continues as 2); `StoredTags` 2 → 3 (short ids, [[Accounts and Sync]] SYNC-016): every tag whose id is not a valid short `TagId` (`t_` + 6 base-62 characters `[0-9A-Za-z]`, see the `TagId` type) is given a new one, once, on load, and every reference is rewritten in the same save: `assignments`, the view state's tag filter and saved views (COLL-060, COLL-064); the record shape is otherwise unchanged. Example: tag `t_01HZX8K2M4QW` becomes `t_k3F9aZ`, and `assignments['p:OGN-001-1'] = ['t_01HZX8K2M4QW']` becomes `['t_k3F9aZ']`. `StoredViewState` 1 → `view: 'printings'` becomes `'entries'`. A newer or unreadable version is not overwritten and the user is told the data could not be read. | [[Collection Import]] IMP-054; design rule |
| COLL-072 | MUST | A failed save to the browser cache (e.g. device storage full) shows an error, keeps the in-memory change visible as "not saved", and does not corrupt the previously stored record. | design rule |
| COLL-073 | SHOULD | Changes made in another tab of the same browser are picked up (reload of stores on change) so two tabs do not overwrite each other silently. | design rule |
| COLL-074 | — | **Withdrawn in v0.11 (2026-11-24, H-171; RJ: local-only mode dropped, [[ADR-0007 Firebase Accounts and Firestore]] amendment 2).** It offered "Delete all local collection data" (built in H-154) in local-only mode, which no longer exists. There is no action that deletes only the collection, tags or the browser's copy: sign-out clears this device's cache and never deletes account data ([[Accounts and Sync]] SYNC-091); deleting everything in the account, and the cache with it, is **Delete account and data** (SYNC-095). Removing single cards stays COLL-054; replacing the whole collection stays an Owned Cards Import in Replace mode (SPEC-003 IMP-050). The ID is retired and not reused. H-162 and H-170 (its copy and warning work) are withdrawn with it. | RJ decision 2026-11-24 (amendment 2); [[Accounts and Sync]] SYNC-091, SYNC-095 |
| COLL-092 | MUST | **Sign-in gate (SYNC-009, always on).** While the gate is not open (signed out, session lost, or first sync running), the Collection page `/collection` keeps its page header and shows the SPEC-010 sign-in panel below it instead of the list, and reads nothing from the browser cache (no tiles, counts, tags or ban data are shown or loaded). Once the gate opens the page shows its content without a reload. There is no mode without the gate (v0.11). This is separate from COLL-090 (card data unavailable). Panel text and gate rules are SPEC-010's. | [[Accounts and Sync]] SYNC-009 (amendment 2) |
| COLL-093 | MUST | **Smooth scrolling, no pagination (v0.11, RJ 2026-11-24: "As users scroll through their decks / cards it should feel smooth. No physical pagination, more like an infinite scroll").** This is the rule for **every card or deck list** (Collection here; SPEC-005 OWN-084 Decks; SPEC-004 CAT-079 Tournaments), which refer to it. (a) **No pagination:** no page numbers, no Previous / Next page controls, no "Page n of m", no page-size picker, and no button whose only job is to reveal more rows ("Load more" is not enough). The user reaches any entry by scrolling alone. (b) **Load as you scroll:** only the rows near the viewport are rendered (COLL-066) and card images are requested only for them (COLL-067); the data is already in the browser cache (SPEC-010 SYNC-141: the whole collection is one cached document), so scrolling makes **no Firestore read and no network request** except image requests, and never shows a loading state for rows whose data is cached. (c) **Nothing jumps:** rows and image slots have fixed or reserved size, so content already in view does not move while more rows appear or images arrive. (d) **Filter, sort or search changes** show the result from the top of the list. (e) **Position is kept:** returning to a list from a card dialog or from another page with the browser Back button restores the scroll position and the query (COLL-063) (SHOULD; the interaction design is [[Collection]] brief work, board H-173). (f) **Total is visible:** the list always shows how many entries match (COLL-010 summary) so a user can tell the list is not cut off, and assistive technology can read the position and total of the focused row. (g) **Performance (SHOULD):** with 5,000 entries (COLL-065) scrolling holds 60 frames per second at a 390 px wide viewport on a mid-range phone; if that cannot be met, it must still never block input (COLL-065). | RJ 2026-11-24 ([[ADR-0007 Firebase Accounts and Firestore]] amendment 2, board H-171, H-173); COLL-065…067 |
| COLL-075 | MUST | **Printing-code memory:** whenever the collection is loaded or saved against a catalog, for every `byPrinting` `printingId` that resolves, Collection records `printingId → printingCode` (SPEC-001 `publicCode`, or `SET-collectorNumber` if `publicCode` is null) with the `cardKey` and the `catalogVersion` it was seen in. A code is kept while its `printingId` is in the collection or in a tag assignment. It is display data only and never used as a key. | [[Collection Import]] `StoredCollection` (keys by `printingId` only); [[Card Data Model]] `Printing.publicCode`, CARD-066; design rule (decision 6) |

### J. Exclude from decks and the Decks contract
> **v0.13 (proposal pending RJ, H-091 d): the exclude-from-decks UI is DEFERRED: COLL-082, COLL-083 (replaced by the dialog line in COLL-103 (e)), COLL-084 and COLL-085.** **Active (data and Decks contract, unchanged): COLL-080 (the flag), COLL-081 (`deckOwnership()`), COLL-086, COLL-089.** COLL-088 is **split**: the **Replace** and **Undo** warnings stay active (they belong to import actions, which stay); the warnings for edits (−, typed quantity, Remove card, turning on the flag, assigning an excluded tag) are deferred with the edits and tags.

| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-080 | MUST | Each tag has a boolean **`excludeFromDecks`**, default `false` (e.g. a `Collector` tag on an expensive printing). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6 |
| COLL-081 | MUST | **Deck-ownership contract** (read by SPEC-005): `deckOwnership(input, cardKey)` returns `owned` (= SPEC-003 `quantity`, 0 if absent), `ownedExcluded` = Σ counts of that card's entries (printing, unassigned, missing-printing) that carry at least one excluded tag, `ownedForDecks = owned − ownedExcluded`, and the per-entry breakdown (entry kind, `printingId`, printing code, count, excluded, the excluding tag ids) in `printingSortKey` order, for SPEC-005's "show exact printings" expand and its "owned but excluded" display. An entry counts once however many excluded tags it carries; dormant assignments have no copies and count nothing. It is a pure function of (collection, tags, printing codes, catalog), all carried by `DeckOwnershipInput`. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5, #6 and Note (owned(cardKey) excludes excluded printings); [[Collection Import]] IMP-058 |
| COLL-082 | MUST, **deferred (v0.13)** | The tag create/edit dialog and the tag manager show a toggle **"Exclude from decks"** with the help text "Cards with this tag stay in your collection but don't count as owned in your decks." Chips of excluded tags carry a marker with accessible text "excluded from decks" (not colour alone). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6; design rule (accessibility) |
| COLL-083 | MUST, **replaced (v0.13) by the dialog line in COLL-103 (e)** | An excluded entry still appears in Collection at its normal position with its count and badge, plus the label **"Not counted in your decks"**. Sorting and filtering treat it like any other entry (COLL-049 can select it). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6 |
| COLL-084 | MUST, **deferred (v0.13)** | Turning the flag on or off, assigning or removing an excluded tag, and merging or deleting a tag take effect on the next read of COLL-081, without re-import. Toggling the flag asks for confirmation stating the effect, e.g. "2 copies of 1 card will no longer count in your decks". | design rule |
| COLL-085 | SHOULD, **deferred (v0.13)** | The summary (COLL-010) shows "N copies excluded from decks" when N > 0. | design rule |
| COLL-086 | MUST | **Per-printing Collection, per-name pool for decks.** Collection stays per printing (COLL-011) and tags stay on printings (COLL-020), but decks see one number per card name: `ownedForDecks(cardKey)` sums every non-excluded printing, unassigned and missing-printing entry of that `cardKey` (COLL-081). SPEC-008 builds its cross-deck pool on that number and subtracts copies held by locked decks; the exclude-from-decks tag applies first, so an excluded copy is never available to any deck, locked or not (SHARE-004). Locks never change quantities, entries or tags here. | [[Physical Copies Across Decks]] facts 2, 14; [[Shared Cards and Lock-in]] SHARE-002, SHARE-004; [[ADR-0006 Two Imports - Collection and Decks]] "Shared cards, lock in and runes" |
| COLL-087 | — | **Withdrawn in v0.8 (2026-11-24).** "Runes are never needed": imported runes were listed but never affected Decks (SPEC-009 RUNE-008). Replaced by COLL-089. | RJ decision 2026-11-24 |
| COLL-088 | SHOULD, **split (v0.13): the Replace and Undo warnings stay active; the edit warnings are deferred** | When an edit would lower what a **locked deck** holds (− on an entry, a typed lower quantity (COLL-053), Remove card, turning on an exclude flag, assigning an excluded tag), SPEC-008's warning "'`<deck name>`' (locked) will be `<n>` cards short. It stays locked." is shown **before** the edit, inside its confirmation (COLL-084, COLL-054); an edit with no confirmation of its own (−, typed quantity, tag assignment, Remove card with Undo) asks for one only in that case, and Cancel leaves everything unchanged. A **Replace** Owned Cards Import shows the same warning inside its SPEC-003 IMP-050 confirmation, computed on the parsed import; an **Undo** of an import commit (IMP-052), computed on the snapshot it would restore, shows it inside the COLL-058 undo confirmation when manual edits followed the import, and otherwise asks for a confirmation only in that case, like the edits above (v0.7; SHARE-034, IMP-050a). After a confirmed Undo (only), the notice "'`<deck name>`' (locked) is now `<n>` cards short." follows; Cancel shows no notice. No change shows the warning only after it has run. | [[Shared Cards and Lock-in]] SHARE-033, SHARE-034; [[Collection Import]] IMP-050, IMP-050a, IMP-052; RJ decision 2026-11-23 (H-049 follow-up: Undo warns before and notifies after) |
| COLL-090 | MUST | **Card data unavailable** (v0.10, H-087). When the stored collection is readable and has at least one card, but the card catalog (SPEC-001 snapshot) cannot be loaded (request fails, unusable response, unsupported schema): (a) Collection shows one `role="alert"` banner: "Card data couldn't load. Your cards are safe. Names and images will show once it loads." with a **Try again** button; (b) it shows **no tiles, no skeleton, no count line, no search or sort, no Export CSV, no "Unresolved cards" section**: COLL-015 does not apply, because without a catalog no card can be told apart from an unknown one; (c) it writes nothing: the collection, tags, locks and printing-code memory (COLL-075) are untouched, and no entry is dropped or re-resolved; (d) **Try again** reloads the catalog only, shows the page's loading state again (as on first load; its look and 200 ms delay are the [[Collection]] brief's S2, not a SPEC-007 requirement), then the list or the same banner again; (e) an empty collection shows its empty state (it needs no catalog); (f) a ban-list failure is independent (COLL-008). | design decision (brief rev 3 S10, as built in H-086); [[Card Data Model]] CARD-068 |
| COLL-091 | MUST | **Arriving from an import** (v0.10, H-087). After an Owned Cards Import commit (SPEC-003 IMP-072) Collection is **already open** (the dialog is opened on it, COLL-094): it stays on the query the user had (COLL-063), the committed record is read from the store and the grid updates in place (COLL-073), no extra banner and no navigation. The "Added …" / "Collection replaced: …" notice and its Undo are owned by SPEC-003 IMP-073…075, shown by the app (not by this screen), and survive leaving Collection. When Undo restores the previous collection while Collection is open, the list refreshes in place as for a change in another tab (COLL-073). | [[Collection Import]] IMP-072…075; design decision |
| COLL-094 | MUST | **"Add to your collection" entry on Collection** (v0.12, H-174; [[Brief H-175]] §6 with RJ's H-178 decisions 3 and 4; the look is the brief's, the behaviour is here). (a) **The button:** an extended floating button with a plus icon and the label **Add to your collection**, 56 px tall, in the accent colour, fixed at the **bottom right**: above 40rem its right edge is on the page's content edge and it sits one spacing step above the bottom; at 40rem and below it is the content gutter from the right edge and **above the phone tab bar** (tab bar height, its border, the safe-area inset and one step). It is drawn above page content and **below** the header, tab bar, menus, dialogs and snack bars. It is the page's only accent-filled control. (b) **When it is shown:** only when the gate is open (SYNC-009) **and** the list is shown: not while the sign-in panel or the first-sync text shows, not while loading, not on the COLL-071 unreadable-store banner (a commit could overwrite data it cannot read), not on the COLL-090 card-data banner (the import needs the catalog to resolve names), and **not on the empty collection**, where the empty state's own button replaces it (see (g)). (c) **Phones:** at 40rem and below it collapses to a 56 × 56 icon-only button while the user scrolls **down** the list and expands again on scrolling up or at the top; the label stays in the page for assistive technology so its accessible name never changes; with reduced motion the change has no animation; above 40rem it is always extended. (d) **Clearance: the button never overlaps the footer (v0.14, H-244; RJ 2026-11-25: "the FAB should never overlap the footer").** At every scroll position, at every width and in landscape, the button's rectangle does not intersect the footer's: while the footer is off screen the button is at its rest position of (a); when the footer's top edge comes within reach, the button **docks**, moving up with the footer so that its bottom edge stays **16 px above the footer's top edge** (the 16 px is the brief's value, not RJ's; checked to ±1 px) and returns to rest as the footer scrolls away, tracking the scroll with no lag. The room for it is reserved **above** the footer (the page content ends 88 px above the footer: the 56 px button plus 16 px each side), **not below it**: there is **no empty band below the footer** (the footer ends at the page bottom, or at the tab bar on phones). Scrolled to the very end, the last row of tiles is fully above the button and the button fully above the footer. A tile focused by keyboard is scrolled clear of the button (COLL-093, roving focus). How it is done (a dock offset on the root element, `translate`, observers) is [[Brief H-245 H-246 H-247]] D1 to D3 and is the builder's. (e) **Snack bars:** while the button is shown, snack bars (SPEC-003 IMP-073 Undo, the CSV export notice) sit **above** it at every width, **including when it is docked**; Undo is never hidden behind it. (f) **Keyboard and screen reader:** a native button whose text is the label, `aria-haspopup="dialog"`, the icon decorative; in the page order it comes right after the page header (title and count line) and **before** the toolbar and the grid, so Tab reaches it before search and sort. (g) **Opening:** pressing it opens the SPEC-003 dialog titled **Add to your collection** (IMP-060); the button stays in place under the backdrop; on close (Cancel, Escape or a commit) focus returns to it; a commit **stays on Collection** (IMP-072). **Empty state** (gate open, no cards): heading **Your collection is empty**, the line "Add the cards you own and they'll show up here.", and one filled button **Add to your collection** that opens the same dialog; no floating button while it shows. (h) **Opened by address:** `/collection?add=1` opens the same dialog once when the page is ready to import and the gate is open (SPEC-010 SYNC-159); when the page cannot import ((b)) nothing opens. (i) **Drop a file (SHOULD, keeps the H-085 feature):** while the gate is open and the page is showing the list or the empty state, dragging a file over the page shows a drop overlay over the content with the text "Drop to add to your collection"; dropping opens the dialog with the file loaded through the single upload path (IMP-062); in any other state a dropped file is ignored without opening the browser's own file view. (j) **Phone header (SHOULD):** with COLL-074 withdrawn the phone header's More menu holds only Export CSV, so it is replaced by one icon button with the accessible name "Export CSV" (44 px); the desktop More button disappears. | RJ 2026-11-24 ([[ADR-0006 Two Imports - Collection and Decks]] "Header and import entry points", follow-up H-178: FAB, collapses on phones, hidden on the empty page); [[Brief H-175]] F1…F9, "Collection empty state", "Phone header on Collection" |
| COLL-089 | MUST | **Runes are cards** (v0.8). A rune card (`category: 'rune'`) and its printings get entries, count badges, tags, "exclude from decks", sort, filter, search, edits and the CSV export (SPEC-003 IMP-055, IMP-071) exactly like any card. Its copies count toward decks through `deckOwnership()` (COLL-081) like any card, so SPEC-008 holds, locked-deck warnings (COLL-088) and the card's deck information (locked decks holding it, unlocked decks using it) cover runes too. Nothing in Collection says runes are assumed, untracked or not needed, and Collection never warns that runes are missing (it has no missing-card warnings for any card). | RJ decision 2026-11-24 ("Allow users to import runes as well and treat them like any other card."); [[Physical Copies Across Decks]] facts 10, 11, 14 |

### K. The simplified Collection page (v0.13, H-091)
Design is the [[Collection]] brief rev 3 and [[Collection Components]]; the behaviour and data rules are here. **Source key:** *RJ* = decided by RJ (cited); *proposal* = recommended default from the H-091 row / brief §9 that **RJ has not yet confirmed** (Open questions 11–15).

| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-100 | MUST | **Page scope.** (a) **Owned cards only:** the page lists the cards the user owns, never the catalog; there is no tile for a card with 0 copies and no `×0`. (b) **Always full colour:** nothing on the page is dimmed or greyscale (the Decks darkening does not apply); locked copies are shown by text and an icon, never by colour or dimming. (c) **Active** on the page: COLL-001/002/003, 006/007, 008/009 (dialog), 010 (v0.13 text), 011/012/014/015/016/017/018, 031/033/035/036, 040, 057/058, 060…063 (`q`, `sort`), 065…068, 070…073, 075, 080/081/086/089 (data), 088 (Replace and Undo), 090…094, and COLL-101…109. (d) **Deferred, not deleted:** COLL-005, 013, 021…028, 030, 037, 041…049, 050…056, 064, 082, 084, 085, the filter / tag / direction parts of 032, 034 and 061/062, the edit part of 088, and the UI parts of 019, 020 and 083. A deferred requirement keeps its ID and text, is **not built, shown or reachable** on the page (no control, menu item, shortcut or URL parameter), and is never silently re-activated; bringing one back needs a spec version that marks it active. (e) **Data is unchanged:** quantities, `StoredTags` (with `excludeFromDecks`), `PrintingCodeStore`, view state, migrations (COLL-071), sync (SYNC-013/015) and `deckOwnership()` (COLL-081) keep working and tested; existing tags and excluded flags keep their effect in Decks and are not removed, but no screen shows, creates or changes them. A status table is under COLL-109. | *RJ*: (a) 2026-11-24 brief decision 1 ("ALL cards available" = every card the user owns, in full colour; the catalog reading was rejected), (b) "all in full color". *Proposal*: (d), (e) (H-091 c–e, brief §9) |
| COLL-101 | MUST | **Tile = image + badge + lock band.** One tile per entry (COLL-001/011/012/014) in the active sort order. (a) **Image:** `art.thumbnailUrl` of the entry's representative printing (COLL-006, COLL-067); a missing or failed image shows the text placeholder with the card name. Unassigned and missing-printing tiles use the default printing's image and are marked with a dashed outline around the art (no text on the tile). (b) **Badge:** `×N` for N ≥ 2 copies **of that printing** (locked copies included, COLL-086), accessible text "N copies"; **no badge at 1 copy** (COLL-016). (c) **Lock band:** COLL-102. (d) **Nothing else is visible:** no name, set, number, rarity, tags, ban or status text, and no steppers, menus or checkboxes. (e) **Accessible name** (one button per tile): `<card name>, <printing label>, <N copies>` + `, <lock text>` when the card has locked copies + `, banned` when `banStatus()` is `banned`, where the printing label is the printing code plus the variant label when it is not base/unknown ("OGN-007a Showcase"), "Printing not specified", or "Printing no longer found: OGN-005" (COLL-012/014); the lock text is the band's text with the deck names in full (two decks: "…locked in Jinx Aggro and Kennen Tempo"; three or more: all names joined with commas and "and"). "banned from" (upcoming), unknown ban status and COLL-004 details are in the dialog only. Example: "Kai'Sa, Survivor, OGN-007a Showcase, 3 copies, 2 of this card locked in Jinx Aggro, banned". (f) Click, Enter or Space opens the dialog (COLL-103); hover and focus states are the design's. | *RJ* 2026-11-24: tile is "just the card image (with maybe a badge …)", badge at 1 copy none (decision 3), ban in dialog plus accessible name only (decision 5), per-printing tiles (decision 2). *Proposal*: the exact accessible-name composition (brief §4) |
| COLL-102 | MUST | **Card-level lock band.** (a) **When:** the card has at least one **locked** use with `hold ≥ 1` (SPEC-008 `pool.byCard[cardKey].uses`, SHARE-015); L = Σ `hold` over those uses, K = their number. (b) **Where:** on **every** tile of that card (each printing tile, the unassigned tile and any missing-printing tile), because holds exist per `cardKey` only; a locked copy is **never allocated to a printing**, so the band never implies which printing a deck holds. (c) **Text:** K = 1: "`<L>` of this card locked in `<deck name>`" (e.g. "2 of this card locked in Jinx Aggro"; "1 of this card locked in Jinx Aggro"); K ≥ 2: "`<L>` of this card locked in `<K>` decks" (e.g. "3 of this card locked in 2 decks"). A long deck name is cut with an ellipsis on screen only; the full name is in the tile's accessible name (COLL-101 (e)). (d) **Not a count of the tile:** L may exceed that tile's `×N` (a `×1` tile can say "2 of this card locked in …"); the badge and the page totals never change with locks (COLL-086). (e) **No lock text** when nothing is locked, when a locked deck has `hold = 0`, or while locks cannot be read (COLL-109). (f) The band is text plus a lock icon, readable over any art, and is not shown by colour alone. | *RJ* 2026-11-24: "if a card is in a locked deck it should at least say (X are locked in <deck name>)"; locks stay per card name (rev 3). *Proposal*: the exact wording of the two lines (brief §4, approved with the brief) |
| COLL-103 | MUST | **Card dialog (read only).** Opening a tile shows a dialog **for the clicked entry**; its art and first count are that entry's, everything about decks is per card name. **No control edits anything**: no stepper, tag, exclude flag or Remove. Sections in this order, a section with nothing to show is hidden except where stated: (a) **Art:** `art.fullUrl` of the entry's representative printing (COLL-006), alt text = card name, the thumbnail until it loads; unassigned and missing entries show the default printing's image. (b) **Ban label** under the art when `banStatus()` is `banned`, `upcoming` or the status is unknown: "Banned since Nov 23, 2026" / "Banned from Nov 23, 2026" / "Ban status unknown" (COLL-008/009/017). (c) **Entry details** (COLL-004 moved here): a heading line "`<printing label>` · `<N copies>`" (e.g. "OGN-007a Showcase · 3 copies", "Printing not specified · 3 copies", "Printing no longer found: OGN-005 · 1 copy"), and for a **printing entry** one muted line with set name and code, collector number (verbatim) and rarity; the variant label is part of the printing label. Unassigned and missing-printing entries show no set, number or rarity (they are Unknown, COLL-012/014). (d) **You own N across all printings** (COLL-104). (e) **Excluded copies:** when the entry carries an excluded tag (existing data only, COLL-100 (e)), the line "`<n>` not counted in your decks" (n = the entry's count; display only, replaces COLL-083). (f) **Locked in** (COLL-105). (g) **Could fit in** (COLL-106, always visible). (h) **Keywords** (COLL-107). **Behaviour:** Escape or the close button closes it and focus returns to the tile; Enter or Space on a printing line (COLL-104) switches the dialog to that entry without closing; on a desktop pointer, Previous card / Next card and the `[` / `]` keys step through the tiles of the current result without closing (SHOULD); while open it follows changes to the stores (COLL-073) and, if its entry is gone, closes with the notice "This card is no longer in your collection."; it never loads data the list did not already have (no new request but the large image). | *RJ* 2026-11-24: "pulls up a dialog with the card, how many you have and what deck(s) it's locked in and what decks it could fit in" (and decision 5 for the ban label). *Proposal*: the details line (set name, rarity) for COLL-004, which the brief's sketch omits; Previous / Next (brief §5.6) |
| COLL-104 | MUST | **"You own N across all printings."** N = the card's SPEC-003 `quantity` (every printing, unassigned and missing-printing copies, excluded copies included). Shown **only when the card has two or more entries**; then one muted line per entry in `printingSortKey` order (COLL-031/033), "`<n>` × `<printing label>`" (e.g. "2 × OGN-007", "3 × OGN-007a Showcase", "1 × Printing not specified"), the clicked entry marked "(this one)" (visually hidden "current"); every other line is a button that switches the dialog to that entry (COLL-103). A card with one entry shows neither the heading nor the lines (the count is already in the heading line). This **replaces the group-by-card view** (COLL-013 deferred). | *RJ* 2026-11-24 (rev 3: badge is per printing, "the card's total across printings is in the dialog"). *Proposal*: hiding it at one entry |
| COLL-105 | MUST | **Locked in** (card level). One row per locked use with `hold ≥ 1`, in lock order (SHARE-015): lock icon, deck name, "`<hold>` copies" ("1 copy"), and " · short" when that deck is short on this card (SHARE-033, `hold < need`). Help text under the heading: "Locked decks count copies by card name, any printing." The deck name is a link to `/decks/:id` once that page exists (MAY until then). The section is hidden when nothing is locked and while locks cannot be read (COLL-109). Rows are the same data as the lock band: Σ of the rows' copies = L (COLL-102). | *RJ* 2026-11-24 ("what deck(s) it's locked in"). *Proposal*: the "short" suffix and help text (brief §5.3) |
| COLL-106 | MUST | **Could fit in.** The user's **unlocked** decks that use the card (SPEC-008 `uses` with `locked = false` and `need ≥ 1`); locked decks are in Locked in, not here. Each row: deck name and the SPEC-005 ownership chip with the SPEC-008 SHARE-040 label "`<a>` of `<q>` available", where `q` = the deck's `need` for the card and `a` = `min(available(D, k), q)` (SHARE-011, `availability()`; the user's free copies of this card name, any printing), so the chip says whether the free copies would complete that deck's line (full, partial or darkened per SPEC-005 OWN-023). Order: fully available rows first, then by deck name (COLL-034 comparison), then deck id. **Empty:** the section stays visible and reads "None of your decks use this card." or, when Locked in is shown, "None of your other decks use this card." Runes get both sections like any card (COLL-089). Unlocked decks reserve nothing (SHARE-012), so two unlocked decks can both read the same free copies. | *RJ* 2026-11-24 decision 4 (Could fit in = your unlocked decks that use the card, each with the "a of q available" chip) |
| COLL-107 | MUST | **Keywords section.** The dialog ends with a Keywords section whose content, wording, hiding and sources are **entirely** [[Keyword Explanations]] (SPEC-011, KW-001); this spec adds nothing but its place (last section, after Could fit in). Until SPEC-011 shows a verified entry, the section is hidden (KW-003, KW-056). | SPEC-011 KW-001 (closes the "SPEC-007 pointer missing" note there); *RJ* 2026-11-24 ("maybe explain certain effects") |
| COLL-108 | MUST | **Search, sort and URL.** (a) **Search** is COLL-040 with the visible label "Search by name", a clear control, a 150 ms debounce; it also filters the "Unresolved cards" section (COLL-015). (b) **Sort** has exactly three options, "Set & number" (default, COLL-031), "Name" (`name` comparison of COLL-034, ascending; Unknown last, COLL-035) and "Copies" (the entry's count, **most first**), with the COLL-033 tie-breaker (ascending `printingSortKey`, not reversed); no direction control, and "Unknown last" matters only for Name. (c) **URL:** only `q` (the search text, omitted when empty) and `sort` (`name` or `copies`; the default is omitted, and `set` is read as the default). The default query is a clean `/collection`. An unknown `sort` value (e.g. `sort=cost`) falls back to the default with the notice "1 filter value not found and was ignored" (COLL-062); any other parameter is ignored without a notice. URL and remembered view state hold nothing else (COLL-060/063), and the view-state record stores the sort as `{ field: 'default' \| 'name' \| 'quantity', dir }` (Copies = `quantity`, `desc`; Name = `asc`) so `StoredViewState` v2 is unchanged. (d) The page opens at the top after a query change (COLL-093 (d)). (e) **Nothing matches:** "No cards match “zhonya”." with a "Clear search" button; when the collection itself is empty the empty state of COLL-094 (g) shows and there is no toolbar. | *RJ*: only "no on-page editing/filters" direction; sort set = *proposal* (H-091 f, brief §7, §9: Set & number / Name / Copies, `q` + `sort`) |
| COLL-109 | MUST | **Data states on the page.** (a) **Ban data not loaded** (COLL-008): tiles unchanged; the dialog shows "Ban status unknown" and the page shows the notice "The ban list couldn't load, so ban status is unknown." (b) **Locks unreadable** (SHARE-061): no lock bands, no Locked in section, Could fit in computed without locks as SHARE-061 says, and the notice "Locked decks couldn't be read, so locked copies aren't shown."; counts still show. (c) **Decks unreadable:** the dialog's Could fit in shows "Your decks couldn't be read, so Could fit in isn't shown." instead of rows (as built, H-086). (d) Card data and store states are COLL-071 and COLL-090; empty state and gate are COLL-094 and COLL-092. | Brief S7, S9; [[Shared Cards and Lock-in]] SHARE-061; built H-086 (c). *Proposal*: wording of the notices (brief §10) |

**Status of every v0.12 requirement under v0.13** (so a builder can check a requirement without reading each section):

| IDs | Status in v0.13 | Decided by |
|---|---|---|
| COLL-001…003, 006, 007, 011, 012, 014…018, 031, 033, 035, 036, 040, 057, 058, 063, 065…075, 080, 081, 086, 089…094 | **Active, unchanged** (COLL-035: Name only; COLL-036: the "Set & number" option) | RJ (per-printing tiles, owned only, runes are cards) |
| COLL-004 | **Moved** to the dialog (COLL-103 (c)) | *RJ* (tile = image only) |
| COLL-008, 009 | **Moved** to the dialog + "banned" in the tile's accessible name | *RJ* (decision 5) |
| COLL-010 | **Changed:** "N copies of M cards" / "Showing X of Y", no "entries" | *Proposal* (wording) |
| COLL-016 | **Kept** (badge `×N` from 2, per printing) | *RJ* (decision 3) |
| COLL-032, 034, 060, 061, 062 | **Narrowed** to Set & number / Name / Copies, `q` + `sort` (COLL-108) | *Proposal* |
| COLL-013 | **Deferred** (the dialog lists printings, COLL-104) | *Proposal* |
| COLL-005, 019…030 (UI parts), 082…085 (COLL-083 replaced by COLL-103 (e)) | **Deferred** (tags, exclude UI); data, sync and COLL-080/081 unchanged | *Proposal* |
| COLL-037, 041…049, 064 | **Deferred** (other sorts, filters, saved views) | *Proposal* |
| COLL-050…056, 088 (edit parts) | **Deferred** (manual edits and their confirmations); COLL-088 Replace and Undo stay | *Proposal* |
| COLL-059, 074, 087 | Withdrawn (unchanged) | RJ |
| COLL-100…109 | **New** in v0.13 (lock band and dialog: *RJ*-decided content, wording as *proposal*) | see each row |

## Data contract
```ts
// shapes only; no implementation
import type { CardKey, PrintingId, PrintingCode, StoredCollection, CollectionStore } from './collection-import'; // SPEC-003 v0.11
import type { CardCategory, VariantKind, CardSet, PlayableCard, Printing } from './card-data-model';  // SPEC-001
import type { BanStatus, BanListFile } from './deck-legality';       // SPEC-002, LEGAL-B10
type IsoDate = string;             // YYYY-MM-DD (display per COLL-017: 'Nov 23, 2026')
type TagId = string;               // 't_' + 6 chars from [0-9A-Za-z] (8 chars, e.g. 't_k3F9aZ'); opaque, stable across rename; unique among the user's tags (a collision is drawn again); SPEC-010 SYNC-016

// ---- Collection (stored by SPEC-003 CollectionStore; shape repeated for reference) ----
// StoredCollection.cards: Record<CardKey, { quantity: number; byPrinting: Record<PrintingId, number> }>
// unassigned(cardKey) = quantity − Σ byPrinting (COLL-002)
// A byPrinting key that does not resolve in the catalog → missing-printing entry (COLL-014)

// ---- Tags (COLL-019..030, COLL-080) ----
interface Tag {
  id: TagId;
  label: string;                   // as typed, normalized per COLL-021, 1..40 chars
  key: string;                     // case-folded label; unique
  colour: TagColour | null;        // COLL-028
  excludeFromDecks: boolean;       // COLL-080, default false
  createdAt: string;               // ISO 8601
}
type TagColour = 'grey' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple';

// Tag target: a printing, or the unassigned copies of a card. Never a whole cardKey.
type TagTarget = `p:${PrintingId}` | `u:${CardKey}`;

interface StoredTags {
  schemaVersion: 3;                              // 1 = 0.1 draft (assignments by cardKey), 2 = long ids; both migrated per COLL-071
  updatedAt: string;
  tags: Tag[];                                   // max 200
  assignments: Record<TagTarget, TagId[]>;       // max 20 per target; may include dormant targets (COLL-029)
}

interface TagStore {               // adapter: the browser cache of the account's tags (COLL-070)
  load(): Promise<StoredTags | null>;
  save(t: StoredTags): Promise<void>;
}

// ---- Printing-code memory (COLL-075) ----
interface StoredPrintingCodes {
  schemaVersion: 1;
  updatedAt: string;
  codes: Record<PrintingId, { code: PrintingCode; cardKey: CardKey; lastSeenCatalogVersion: string }>;
}
interface PrintingCodeStore {
  load(): Promise<StoredPrintingCodes | null>;
  save(c: StoredPrintingCodes): Promise<void>;
}

// ---- View model (derived, not stored) ----
type EntryKind = 'printing' | 'unassigned' | 'missing-printing';
// SPEC-002 BanStatus, or 'unknown' when ban data could not be loaded (COLL-008). Not a SPEC-002 type.
type EntryBan = BanStatus | { status: 'unknown' };

interface CollectionEntry {
  entryId: TagTarget;              // 'p:<printingId>' (printing, missing-printing) or 'u:<cardKey>' (unassigned)
  kind: EntryKind;
  cardKey: CardKey;
  name: string;                    // canonical (SPEC-001 CARD-031)
  printingId: PrintingId | null;   // null for unassigned
  printingCode: PrintingCode | null; // catalog publicCode; for missing-printing from COLL-075; null for unassigned
  representativePrintingId: PrintingId; // itself, or the card's defaultPrintingId (COLL-012, COLL-014)
  sortKey: string;                 // printingSortKey of the representative printing (CARD-070)
  // printing-level attributes: null for unassigned and missing-printing entries (= Unknown, COLL-043)
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;  // verbatim
  variantKind: VariantKind | null; // 'unknown' and null are both the Unknown bucket
  rarity: string | null;
  // card-level attributes (SPEC-001 PlayableCard)
  category: CardCategory;          // 'unknown' → Unknown bucket (COLL-041)
  type: string;                    // verbatim
  domains: string[] | null;        // [] = No domain, null = Unknown (COLL-042)
  stats: { energy: number | null; might: number | null; cost: number | null; power: number | null };
  count: number;                   // copies in this entry; badge `×count` when ≥ 2 (COLL-016)
  cardQuantity: number;            // SPEC-003 quantity of the card
  tagIds: TagId[];
  excluded: boolean;               // carries ≥ 1 tag with excludeFromDecks (COLL-083)
  ban: EntryBan;
  imageUrl: string | null;         // art.thumbnailUrl of the representative printing
  flags: ('preview')[];
}

interface CardGroupRow {           // optional group-by-card view (COLL-013)
  cardKey: CardKey;
  name: string;
  quantity: number;
  representativePrintingId: PrintingId;
  sortKey: string;
  tagIds: TagId[];                 // union of its entries' tags (display only)
  entries: CollectionEntry[];      // printingSortKey order
}

// ---- Catalog view read by the pure functions (COLL-068, COLL-081) ----
interface CollectionCatalogView {  // read-only view of the SPEC-001 snapshot (CardSnapshot)
  catalogVersion: string;                    // SPEC-001 CARD-068
  sets: CardSet[];                           // set names, setOrder (COLL-004, COLL-034)
  cards: Record<CardKey, PlayableCard>;      // names, attributes, defaultPrintingId (COLL-012, COLL-014)
  printings: Record<PrintingId, Printing>;   // resolution, printingSortKey, publicCode, art (COLL-014, COLL-031, COLL-075)
}

// ---- Decks contract (COLL-081), read by SPEC-005 ----
interface DeckOwnershipInput {   // everything COLL-081 reads; ownership needs no ban data or date
  collection: StoredCollection;
  tags: StoredTags;
  printingCodes: StoredPrintingCodes;
  catalog: CollectionCatalogView;  // printing resolution (missing-printing entries) and printingSortKey order
}
interface DeckOwnership {
  cardKey: CardKey;
  owned: number;                   // = quantity (0 if absent)
  ownedForDecks: number;           // Σ count of entries with excluded = false
  ownedExcluded: number;           // Σ count of entries with excluded = true; owned = ownedForDecks + ownedExcluded
  entries: {
    entryId: TagTarget;
    kind: EntryKind;
    printingId: PrintingId | null;
    printingCode: PrintingCode | null;
    count: number;
    excluded: boolean;
    excludedByTagIds: TagId[];
  }[];                             // printingSortKey order (unassigned, then missing, at the default printing)
}
// deckOwnership(input, cardKey): DeckOwnership — pure (shape only)

// ---- Query (stored + URL) ----
// v0.13: the page uses only `text` and `sort` (`default`, `name`, `quantity`); every other field is deferred (COLL-100,
// COLL-108). The shapes are unchanged so deferred features, stored view state and the pure function keep working.
type SortField =
  'default' | 'name' | 'set' | 'collectorNumber' | 'category' | 'type' | 'domain' |
  'cost' | 'energy' | 'might' | 'power' | 'rarity' | 'variantKind' | 'quantity' | 'banStatus' | 'tag';
type UNKNOWN = '_unknown';

interface CollectionQuery {
  view: 'entries' | 'cards';                       // default 'entries'; 'cards' = group by card (COLL-013)
  text: string;                                    // COLL-040
  filters: {
    set?: (string | UNKNOWN)[];
    category?: (Exclude<CardCategory, 'unknown'> | UNKNOWN)[];
    type?: string[];
    domain?: (string | '_none' | UNKNOWN)[];
    cost?: (number | UNKNOWN)[]; energy?: (number | UNKNOWN)[];
    might?: (number | UNKNOWN)[]; power?: (number | UNKNOWN)[];
    rarity?: (string | UNKNOWN)[];
    variantKind?: (Exclude<VariantKind, 'unknown'> | '_unassigned' | '_missing' | UNKNOWN)[];
    minQuantity?: number;
  };
  tags: { ids: (TagId | '_untagged')[]; mode: 'any' | 'all' };
  ban: 'all' | 'banned-only' | 'hide-banned';
  decks: 'all' | 'counted' | 'excluded';           // COLL-049
  sort: { field: SortField; dir: 'asc' | 'desc' };  // default { 'default', 'asc' }
}

interface StoredViewState {
  schemaVersion: 2;                                // 1 had view 'printings' | 'cards' (COLL-071)
  updatedAt: string;
  query: CollectionQuery;
  savedViews?: { id: string; name: string; query: CollectionQuery }[]; // COLL-064
}

interface CollectionViewStateStore {
  load(): Promise<StoredViewState | null>;
  save(s: StoredViewState): Promise<void>;
}

// ---- Pure query function (COLL-068) ----
interface CollectionQueryInput {   // everything COLL-068 reads
  collection: StoredCollection;
  tags: StoredTags;
  printingCodes: StoredPrintingCodes;
  catalog: CollectionCatalogView;  // card and printing attributes, order (SPEC-001)
  banData: BanListFile | null;     // SPEC-002 data/banlist.json; null = could not be loaded → EntryBan 'unknown' (COLL-008)
  today: IsoDate;                  // asOf for SPEC-002 banStatus(cardKey, 'standard', 'global', today)
  query: CollectionQuery;
}
interface CollectionQueryResult {
  rows: CollectionEntry[] | CardGroupRow[]; // sorted per COLL-031..035
  unresolved: { cardKey: CardKey; quantity: number; tagIds: TagId[] }[]; // COLL-015
  totals: { distinctCards: number; entries: number; totalCopies: number; copiesExcluded: number;
            rowsShown: number; rowsTotal: number };
  facets: Record<string, { value: string; count: number }[]>; // option counts, incl. '_unknown'
  notices: string[];               // e.g. ignored URL values, repaired invariant, copy-tags offer (COLL-019)
}
```

## Acceptance criteria
**v0.13 status of ACs 1–31 (H-091).** Active as written: 1, 3, 10, 13 (Copies sort), 17 (except the tag chip), 18, 19, 20, 24, 26…31. Active in part: 2 (the entries and `deckOwnership` parts; the "Group by card" part is **deferred**), 8 and 9 (the ban label now shows in the **dialog**, COLL-103 (b); the ban filter and ban sort parts are **deferred**), 25 (runes listed, counted, locked; the tagging part is **deferred**), 22 (only the `deckOwnership()` result is active; the tag, filter and confirmation parts are **deferred**), 5 and 23 (tags stay dormant across imports is a **store-level** check; the screens are deferred). **Deferred (UI not built; keep for when they return):** 4, 6, 7, 11, 12, 14, 15, 16, 21. ACs 15 and 16 are replaced by AC 37. Card names below are real cards from research notes. Collector numbers, variant kinds and set
membership are **illustrative** until the live Riot payload is inspected (H-020); so are ids such as
`p_lr_foil`. Set order is assumed to be OGN, OGS, SFD, UNL, VEN, RAD (SPEC-001 CARD-071 `setOrder` =
API `sets[]` order, BLOCKED until the live payload is seen). A foil printing is assumed to be its own
catalog printing (open question 1).

1. **Default order, numeric and overnumbered** (COLL-011, COLL-031)
   **Given** a collection with printings `SFD-012`, `OGN-100`, `OGN-010`, `OGN-298` (`variant.kind:
   overnumbered`, OGN regular range ends below 298), `OGN-007a` (suffix variant of `OGN-007`),
   `OGN-007`, `RAD-SP1/005` and `OGS-003` **When** Collection opens with the default query
   **Then** rows are in `printingSortKey` order: `OGN-007`, `OGN-007a`, `OGN-010`, `OGN-100`,
   `OGN-298`, `OGS-003`, `SFD-012`, `RAD-SP1/005` (Showcase position within RAD per `printingSortKey`).
   `OGN-010` comes before `OGN-100` (numeric, not text) and the overnumbered `OGN-298` comes after
   the regular OGN numbers and before any OGS card.
2. **One entry per printing; optional group by card** (COLL-011, COLL-013, COLL-016, COLL-081)
   **Given** `Kai'Sa, Survivor` owned as 2 × base printing and 1 × Showcase `RAD-SP1/005`, no tags
   **When** Collection opens with the default query **Then** there are two entries in different
   places in set order: the base entry with badge `×2` and the Showcase entry with no badge.
   **When** the user turns on "Group by card" **Then** there is one row with quantity 3 at the base
   printing's position, expanding to the two entries. **And** `deckOwnership(input, 'kaisa survivor')` gives
   `owned = 3`, `ownedForDecks = 3`, `ownedExcluded = 0`.
3. **Unassigned copies are placed in order** (COLL-012)
   **Given** `3 Lightning Rush` imported from plain text (no printing) and `Lightning Rush`'s
   `defaultPrintingId` is its OGN base printing **When** the list is shown **Then** one row "Lightning
   Rush – Printing not specified ×3" appears where that OGN printing sorts. **And Given** the user
   later also owns 1 × that base printing via a CSV Add **Then** the printing row (×1) appears first
   and the unassigned row (×3) directly after it; `total = 4`.
4. **Tag filter, any vs. all** (COLL-020, COLL-044)
   **Given** tag `Kennen deck` on the entries of `Lightning Rush` (base printing) and `Kennen, Storm of
   Shuriken`, and `Trade binder` on the `Lightning Rush` base entry and the `Nocturne, Horrifying` entry
   **When** the tag filter is `Kennen deck, Trade binder` with mode **any** **Then** all three entries
   show. **When** mode is **all** **Then** only the `Lightning Rush` base entry shows. **When** the
   filter is `Untagged` **Then** none of the three shows.
5. **Tags survive re-imports by printing** (COLL-029, COLL-057)
   **Given** `Nocturne, Horrifying` ×1 of its base printing (`p_noct`) tagged `Trade binder` **When**
   the user commits a Replace import that does not contain Nocturne **Then** Nocturne leaves the list,
   the confirmation said "Tags are kept", and the tag manager shows `Trade binder` on 0 owned entries.
   **When** a later Add import is a CSV row for that same printing **Then** the entry is listed again
   with `Trade binder`. **When** instead the Add import is plain text `1 Nocturne, Horrifying` (no
   printing) **Then** an unassigned entry appears **without** `Trade binder` (the tag is on `p_noct`,
   which stays dormant).
6. **Case-insensitive tags, rename and merge** (COLL-021, COLL-023, COLL-024)
   **Given** a tag `Trade Binder` **When** the user types `trade binder` on `Gust` **Then** the existing
   tag is assigned and no new tag is created. **Given** tags `Trades` (3 entries) and `Trade Binder`
   (2 entries, 1 overlapping) **When** `Trades` is renamed to `TRADE BINDER` **Then** the app offers a
   merge; on confirm, `Trade Binder` is on 4 entries and `Trades` no longer exists.
7. **Tag limits** (COLL-022)
   **Given** an entry with 20 tags **When** the user adds a 21st **Then** an inline error appears and the
   entry still has 20 tags. **Given** a label of 41 characters **When** the user saves it **Then** it is
   rejected.
8. **Ban status as of today** (COLL-008, COLL-045)
   **Given** today is 2026-11-23 and the collection has `Zhonya's Hourglass` ×1, `Emperor's Dais` ×1,
   `Stealthy Pursuer` ×2 and `Lightning Rush` ×3 **When** the list is shown **Then** Zhonya's Hourglass
   and Emperor's Dais show "Banned since Nov 23, 2026", Stealthy Pursuer shows "Banned since Jul 24, 2026"
   (all from SPEC-002 `banStatus()`),
   Lightning Rush shows no ban label. **When** the ban filter is "banned only" **Then** 3 cards show;
   "hide banned" shows only Lightning Rush. **And Given** today is 2026-11-22 **Then** Zhonya's
   Hourglass is not banned and (COLL-009, `banStatus()` = `upcoming`) shows "Banned from Nov 23, 2026".
9. **Ban data missing** (COLL-008, COLL-045)
   **Given** the ban data fails to load **When** the list is shown **Then** every row shows "Ban status
   unknown", "hide banned" keeps them all, "banned only" shows none, and sorting by ban status puts
   them last.
10. **Name search uses nameKey** (COLL-040)
    **Given** `Zhonya's Hourglass` and `Kai'Sa, Survivor` are owned **When** the search is `ZHONYA’S`
    **Then** only Zhonya's Hourglass shows. **When** the search is `kaisa surv` **Then** only
    `Kai'Sa, Survivor` shows. **When** it is `survivor kai` **Then** it still matches (token order free).
    **Given** `The Dreaming Tree` is owned **When** the search is `the` or `dreaming` **Then** it shows
    in both cases. **Given** the catalog names it `Dreaming Tree` **When** the search is `the dreaming
    tree` **Then** it shows (CARD-038).
11. **Unknown attributes are a bucket, not dropped** (COLL-035, COLL-041)
    **Given** 10 owned rows of which 2 have `cost: null` **When** the user sorts by cost ascending
    **Then** the 8 known-cost rows come first by cost, then the 2 null rows; **When** descending
    **Then** the 2 null rows are still last. **When** the cost filter is opened **Then** it lists
    "Unknown (2)", and selecting only Unknown shows exactly those 2 rows.
12. **No domain ≠ Unknown** (COLL-042)
    **Given** `Calm Rune` (`domains: ["Calm"]`), a card with `domains: []` and a card with
    `domains: null` **When** the domain filter is opened **Then** it offers `Calm (1)`, `No domain (1)`
    and `Unknown (1)` as three separate options.
13. **Stable tie-breaker** (COLL-033)
    **Given** `Lightning Rush` ×3 (OGN printing) and `Gust` ×3 (in a later set than OGN) **When** sorted by
    quantity descending **Then** Lightning Rush comes before Gust (tie broken by `printingSortKey`
    ascending, not reversed) and the order is the same after a reload.
14. **Quantity edits** (COLL-050, COLL-051, COLL-052)
    **Given** `Kai'Sa, Survivor` 2 × base + 1 × `RAD-SP1/005`, no unassigned **When** in group-by-card
    view the user presses − on the group **Then** the app asks which entry to decrement. **When** in the
    default entries view the user presses − on the `RAD-SP1/005` entry **Then** that entry disappears and
    the card's quantity is 2; the base entry still shows `×2`. **When** the user presses − twice more on
    the base entry **Then** the card leaves the collection, and its tags remain dormant.
15. **URL round-trip** (COLL-060..063)
    **Given** the user filters set `OGN,SFD`, tag `Kennen deck` (id `t_k3F9aZ`), sort cost descending
    **Then** the URL is `…/collection?set=OGN,SFD&tag=t_k3F9aZ&sort=cost&dir=desc`. **When** that URL is
    opened in a new tab of the same browser **Then** the same rows show in the same order. **When**
    the URL contains `tag=t_zzzzzz` (unknown) **Then** that value is ignored with a notice and the rest
    applies. **When** the user clears all filters **Then** the URL is `…/collection`.
16. **Remembered view** (COLL-060, COLL-063)
    **Given** the user left Collection in group-by-card view sorted by name **When** they return via
    the nav link (no URL params) **Then** group-by-card view sorted by name is restored and mirrored in
    the URL (`view=cards&sort=name`).
17. **Catalog update** (COLL-014, COLL-015, COLL-075)
    **Given** a stored record `Lightning Rush` `{ quantity: 1, byPrinting: { "p_lr_007a": 1 } }`, the
    printing-code memory holds `p_lr_007a → OGN-007a`, and that printing is tagged `Trade binder`
    **When** the app loads a new catalog in which `p_lr_007a` no longer resolves **Then** the copy shows
    as its own entry "Printing no longer found: OGN-007a" with `Trade binder`, at the card's default
    printing position, the stored count is unchanged, and `deckOwnership(input, 'lightning rush').owned = 1`.
    **Given** a record whose `cardKey` no longer resolves **When** the app loads the new catalog
    **Then** it is listed under "Unresolved cards" with its quantity and tags.
18. **Performance** (COLL-065..067)
    **Given** a generated collection of 5,000 entries **When** the user changes the sort from default to
    name **Then** the new order shows without the page freezing (SHOULD within 200 ms), only rows near
    the viewport have rendered DOM, and image requests are made only for those rows.
19. **Storage separation** (COLL-070, COLL-071, COLL-075)
    **Given** a signed-in account with quantities, tags, printing codes and view state **When** the browser cache is
    inspected **Then** there are four records (collection, tags, printing codes, view state), each with
    `schemaVersion`, and none contains any API key or card image data; only the collection and tags records
    are account data (synced), the printing codes and view state are never uploaded (COLL-070, SYNC-019).
20. **Count badge on a foil** (COLL-011, COLL-016)
    **Given** the user owns 3 copies of the foil printing of `Lightning Rush` (`p_lr_foil`) and 1 copy of
    its regular printing **When** Collection opens with the default query **Then** there are exactly
    2 entries for Lightning Rush: the foil entry with badge `×3` and the regular entry with no badge; the
    foil is never shown as 3 entries; the summary counts 4 copies of 1 card.
21. **A tag on the foil does not apply to the regular printing** (COLL-020, COLL-044)
    **Given** the collection of AC 20 **When** the user tags the foil entry `Trade binder` **Then** the
    regular entry shows no tag, the tag filter `Trade binder` shows only the foil entry (`×3`), and the
    tag manager shows `Trade binder` on 1 entry, 3 copies.
22. **Excluded tag keeps the card listed but not counted for decks** (COLL-080..084, COLL-049)
    **Given** `Kai'Sa, Survivor` 2 × base + 1 × `RAD-SP1/005`, and a tag `Collector` with "Exclude from
    decks" on, assigned to the `RAD-SP1/005` entry **When** Collection is shown **Then** both entries
    are listed in their normal positions; the Showcase entry shows the `Collector` chip with the
    "excluded from decks" marker and "Not counted in your decks"; and `deckOwnership(input, 'kaisa survivor')`
    gives `owned = 3`, `ownedExcluded = 1`, `ownedForDecks = 2`, with the Showcase entry marked
    `excluded` and `excludedByTagIds = [<Collector id>]`. **When** the Decks filter is "excluded from
    decks" **Then** only the Showcase entry shows. **When** the user turns the flag off and confirms
    "1 copy of 1 card will count in your decks again" **Then** `ownedForDecks = 3`, without re-import.
23. **Unassigned copies are tagged separately** (COLL-019, COLL-029)
    **Given** `3 Lightning Rush` from plain text plus 1 × its foil printing, and the user tags the
    unassigned entry `Binder page 4` **When** the list is shown **Then** `Binder page 4` shows only on
    the unassigned entry, not on the foil. **When** the user later commits a Replace CSV import with
    3 × the regular printing and 1 × the foil **Then** the unassigned entry disappears, `Binder page 4`
    is dormant on the unassigned target, and the app offers to copy it to the regular and/or foil
    entries; no tag is copied until the user chooses.
24. **CSV export keeps counts per printing, not tags** (COLL-059 withdrawn, COLL-002, COLL-014, COLL-057; SPEC-003 IMP-055, AC 35)
    **Given** `Lightning Rush` `{ quantity: 6, byPrinting: { p_lr_001: 2, p_lr_001a: 1, p_lr_old: 1 } }`, where
    `p_lr_old` is a missing-printing entry ("Printing no longer found: RAD-002") and the unassigned entry
    (×2) is tagged `Binder page 4`, and `Kennen, Heart of the Tempest` ×1 on `p_kn_299`, with the
    hypothetical orders of SPEC-003 AC 35 (OGN before RAD, per the preamble's set order; `Lightning Rush`'s
    `defaultPrintingId` = `p_lr_001`) **When** the user exports the collection **Then** the file has only
    the columns `Quantity,Card Name` and, in this order (COLL-031/033 `printingSortKey`; the unassigned row
    right after the `p_lr_001` printing row, COLL-012; no suffix before suffix, CARD-070),
    `1,"Kennen, Heart of the Tempest OGN 299"`, `2,Lightning Rush RAD 001`, `3,Lightning Rush`,
    `1,Lightning Rush RAD 001a` (no tag text anywhere). **When** that file is re-imported
    with Replace **Then** Collection shows, in this order, the Kennen `OGN 299` entry, the `RAD 001`
    entry ×2, one unassigned `Lightning Rush` entry ×3 (the missing-printing entry is gone; its copy is
    now unassigned) and the `RAD 001a` entry; `deckOwnership(input, 'lightning rush').owned = 6`; `Binder page 4` is still
    on the unassigned entry, because tags are kept by the import (COLL-057), not restored from the file.
25. **Runes are listed and counted like any card** (COLL-081, COLL-088, COLL-089; v0.8)
    **Given** an Owned Cards Import of `9 Chaos Rune` and `3 Order Rune` (by name, no printing code) committed
    with Add, and `KENNEN_1` ([[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]]) in Decks, locked, with every
    other card owned in full **When** Collection is shown **Then** `Chaos Rune` has an unassigned entry `×9`
    and `Order Rune` one with `×3`, in `printingSortKey` order at their `defaultPrintingId` (COLL-012), and
    the card information for `Chaos Rune` names `KENNEN_1` as a locked deck holding 9 copies; nothing on the
    screen says "Runes are assumed owned"; `deckOwnership(input, 'chaos rune')` gives `owned = 9`,
    `ownedForDecks = 9`. **When** the user tags the `Chaos Rune` entry with an "Exclude from decks" tag
    **Then** before the change the confirmation warns "'`<KENNEN_1 name>`' (locked) will be 1 card short. It
    stays locked." (COLL-088, SHOULD), and after confirming `ownedForDecks = 0`. **Given** a collection with
    no runes **When** Collection opens **Then** it shows no rune warning of any kind.

**ACs 26–27 (v0.10, H-087)**

26. **Card data didn't load** (COLL-090) **Given** a stored collection `lightning rush ×3`, `gust ×2` and a catalog request that fails **When** Collection opens **Then** a banner (`role="alert"`) reads "Card data couldn't load. Your cards are safe. Names and images will show once it loads." with a **Try again** button; no tiles, count line, search, sort, Export CSV or "Unresolved cards" section are shown; and the stored collection, tags and printing-code memory are byte-for-byte unchanged. **When** the user taps **Try again** and the catalog now loads **Then** the grid shows in default order with "5 copies of 2 cards". **When** it fails again **Then** the same banner returns. **Given** instead an empty collection and the same failure **Then** the empty state shows, not the banner.

27. **After an import commit** (COLL-091, SPEC-003 IMP-072…075, AC 43) **Given** an Add commit of `3 Lightning Rush` / `2 Gust` from the dialog opened on Collection **When** the commit finishes **Then** the page did not navigate and the grid shows the committed cards in default order with "5 copies of 2 cards", the snack bar "Added 5 copies of 2 cards." with **Undo** is showing, and no other banner. **When** the user taps Undo (nothing changed since) **Then** Collection shows its empty state without a reload.

**ACs 28–30 (v0.11, H-171)**

28. **Collection scrolls without pages** (COLL-093) **Given** a signed-in account whose collection has 3,000 entries (generated, cached) **When** Collection opens **Then** the first rows show at once; no element reads "Page", "Next", "Previous", a page number or a page-size choice, and no "Load more" button exists; **When** the user scrolls to the end **Then** every entry has been reachable by scrolling alone, in the same order, the summary still shows the total, the rows already in view did not move while images loaded (reserved slots, COLL-067), and no Firestore read or other network request was made except image requests (Firestore request log empty during the scroll). **When** the user types a search **Then** the result list starts at the top. **When** the user opens a card dialog, closes it and goes Back **Then** the scroll position and query are as they were (SHOULD).
29. **Gate always on** (COLL-092) **Given** a signed-out visitor **When** they open `/collection` **Then** the page header and the SPEC-010 sign-in panel show and no tile, count, tag or ban status is shown or read; **Given** the production configuration or any other, **Then** no build setting turns the gate off.
30. **No local delete action** (COLL-074 withdrawn) **Given** a signed-in user **When** they open the Collection page and its menus on desktop and phone **Then** there is no "Delete all local collection data" or similar action; "Delete account and data" is only in the Account Information dialog, opened from the account menu (SPEC-010 SYNC-095, SYNC-152).
31. **The "Add to your collection" button** (COLL-094; v0.12) **Given** a signed-in user (gate open) with 3,000 entries **When** Collection opens at 1440 **Then** a button "Add to your collection" is fixed at the bottom right, its right edge lines up with the grid's right edge, and Tab from the page header reaches it before the search box; **When** they scroll the last 400 px in 10 px steps at 1440 × 900, 1024 × 768, 768 × 1024, 375 × 812 and 812 × 375 **Then** at every step the button's bottom edge is at least 16 px (±1 px) above the footer's top edge, and while the footer is off screen the button is at its rest position (v0.14, H-244); **When** they scroll to the very end **Then** no tile is under it, it sits fully above the footer, and there is no empty band below the footer; **When** they press it **Then** the dialog titled "Add to your collection" opens, **Escape** returns focus to the button, and after a commit the page is still at `/collection` and the Undo snack bar is fully above the button. **Given** 390 px wide **Then** the button sits at least 16 px above the tab bar's top edge, collapses to an icon-only button while scrolling down and expands on scrolling up (no width animation under reduced motion), and its accessible name is "Add to your collection" in both states. **Given** an empty collection **Then** no floating button shows and the empty state shows "Your collection is empty" with one "Add to your collection" button. **Given** the COLL-071 unreadable banner, the COLL-090 card-data banner, loading, the sign-in panel, or the first-sync text **Then** no button shows. **Given** a file dragged over the page **Then** "Drop to add to your collection" shows, and dropping opens the dialog with the file loaded; **Given** the same drop on the card-data banner **Then** nothing opens.

**ACs 32–41 (v0.13, H-091).** Shared data for 32–35 (card names real; printings, collector numbers and deck names illustrative until H-020): `Kai'Sa, Survivor` owned 2 × `OGN-007`, 3 × `OGN-007a` (Showcase) and 1 unassigned copy (card quantity 6); catalog has 5 more cards the user does not own; decks: `Jinx Aggro` (locked, uses 2), `Kennen Tempo` (unlocked, uses 5), `Draven Midrange` (unlocked, uses 2).

32. **Tiles are image + badge + lock band, per printing** (COLL-100, COLL-101, COLL-102, COLL-016) **Given** the shared data **When** Collection opens **Then** there are exactly three `Kai'Sa, Survivor` tiles (no tile for any unowned catalog card, no `×0`) in `printingSortKey` order: `OGN-007` with badge `×2`, `OGN-007a` with `×3`, and the unassigned tile with no badge and a dashed art outline. **And** each of the three shows the band "2 of this card locked in Jinx Aggro". **And** no tile shows a name, set, number, rarity, tag, ban or status text, nothing is dimmed, and the Showcase tile's accessible name is "Kai'Sa, Survivor, OGN-007a Showcase, 3 copies, 2 of this card locked in Jinx Aggro". **When** Kai'Sa, Survivor is banned as of today **Then** each tile's accessible name ends ", banned" and no tile shows a ban icon or text.
33. **Several locked decks** (COLL-102 (c), COLL-101 (e)) **Given** AC 32 and `Kennen Tempo` is now also locked and holds 1 copy **Then** each tile shows "3 of this card locked in 2 decks" and its accessible name ends "3 of this card locked in Jinx Aggro and Kennen Tempo". **Given** a locked deck whose hold of the card is 0 **Then** it is not counted: with only that deck locked no band shows.
34. **Card dialog on the Showcase tile** (COLL-103, COLL-104, COLL-105, COLL-106) **Given** AC 32 **When** the user opens the `OGN-007a` tile **Then** the dialog shows that printing's large art, the heading "OGN-007a Showcase · 3 copies" and a details line with its set name and code, collector number and rarity; "You own 6 across all printings" with the lines "2 × OGN-007", "3 × OGN-007a Showcase (this one)" and "1 × Printing not specified" (the other two are buttons); **Locked in** with one row `Jinx Aggro · 2 copies` and the help text "Locked decks count copies by card name, any printing."; **Could fit in** with `Draven Midrange` "2 of 2 available" first and `Kennen Tempo` "4 of 5 available" second (6 owned − 2 locked = 4 free); no Keywords section while the glossary is empty (SPEC-011); and no control that changes a count, a tag or the collection. **When** the user presses the "2 × OGN-007" line **Then** the dialog shows the `OGN-007` printing without closing; **When** they press Escape **Then** it closes and focus is on the tile they opened it from. **Given** a card with one entry **Then** "You own N across all printings" and its lines are not shown.
35. **Empty Could fit in** (COLL-106) **Given** the user owns `Gust` ×2 and no deck uses it **When** its dialog opens **Then** Locked in is hidden and Could fit in reads "None of your decks use this card." **Given** instead `Gust` is used only by a locked deck **Then** Locked in shows it and Could fit in reads "None of your other decks use this card." The same holds for a rune card (COLL-089).
36. **Count line** (COLL-010) **Given** a collection of 1,204 copies of 412 cards in 538 tiles **When** Collection opens **Then** the line reads "1,204 copies of 412 cards" and never contains the word "entries". **When** the user searches `kai` and 12 tiles match **Then** it reads "Showing 12 of 538". **Given** one copy of one card **Then** "1 copy of 1 card".
37. **Sort and URL** (COLL-108, COLL-060…063) **Given** `Lightning Rush` ×3 (OGN printing) and `Gust` ×3 (a later set), and `Zhonya's Hourglass` ×1 **When** the user chooses "Copies" **Then** the order is Lightning Rush, Gust, Zhonya's Hourglass (most first; the tie broken by ascending `printingSortKey`) and the URL is `/collection?sort=copies`; **When** they type `gust` **Then** it is `/collection?q=gust&sort=copies`; **When** they choose "Name" **Then** `…?q=gust&sort=name`; **When** they choose "Set & number" and clear the search **Then** the URL is `/collection`. The page offers no other sort and no direction control. **When** `/collection?sort=cost` is opened **Then** the default order shows with "1 filter value not found and was ignored"; **When** `/collection?set=OGN&view=cards&tag=t_k3F9aZ` is opened **Then** the default list shows with no notice and no filter or group view. **When** the user returns to Collection from another page **Then** the last search and sort are restored (COLL-060).
38. **No deferred controls** (COLL-100 (d)) **Given** a signed-in user with a collection, on desktop and on a phone **When** they use every control on Collection and in the dialog **Then** there is no tag control, exclude-from-decks control, filter, filter chip, "Group by card" switch, + / − control, quantity field, Remove card, Add card, saved view or tag-manager, in the page, its menus, its dialogs and its URL. **Given** the account has a tag `Collector` marked "Exclude from decks" on `OGN-007a` (synced from older data) **Then** the `OGN-007a` dialog shows "3 not counted in your decks", the tile is unchanged, and `deckOwnership(input, 'kaisa survivor')` gives `owned = 6`, `ownedExcluded = 3`, `ownedForDecks = 3` (COLL-081).
39. **Import actions keep their locked-deck warnings** (COLL-088 split, COLL-058) **Given** `Jinx Aggro` locked and holding 2 Kai'Sa **When** the user commits a Replace import that leaves 1 Kai'Sa **Then** the SPEC-003 confirmation still warns that `Jinx Aggro` (locked) will be 1 card short, and the Undo of that import still follows COLL-058 / COLL-088; no other action on the page can lower the collection's counts.
40. **Lock and ban data states** (COLL-109) **Given** the ban list fails to load **Then** tiles are unchanged, the dialog shows "Ban status unknown" and the notice "The ban list couldn't load, so ban status is unknown." shows. **Given** the lock record is unreadable (SHARE-061) **Then** no tile has a lock band, the dialog has no Locked in section, the notice "Locked decks couldn't be read, so locked copies aren't shown." shows and the counts and badges are unchanged. **Given** the deck list cannot be read **Then** Could fit in shows "Your decks couldn't be read, so Could fit in isn't shown."
41. **Accessible lock text without colour** (COLL-102 (f), COLL-101 (e)) **Given** a locked card **When** the page is used with a screen reader and in forced-colours mode **Then** the lock is announced in the tile's name and drawn as text with an icon, and the tile art is full colour in every case.

## Out of scope
- Importing cards (SPEC-003) and decks (SPEC-006); deck ownership visuals (SPEC-005).
- Prices, trade/wishlist features, condition, language; foil/finish tracking beyond what the catalog
  lists as separate printings (open question 1).
- Sharing a collection or tags with other people (the account is private to its owner, SYNC-102);
  "shareable" URLs carry only query state (COLL-062) and show the viewer's own collection, so they work
  only for the same account.
- Importing tags from CSV, and tags in the CSV export (COLL-059 withdrawn, H-045).

## Open questions / BLOCKED
1. **BLOCKED: needs research: is a foil its own Riot API printing?** RJ wants foil as its own entry
   (H-036 #3). Entries and tags are keyed by `printingId`, which works only if the API lists foils with
   their own id. SPEC-001 `VariantKind` has no `foil`, and [[Card Data & Images]] says how variants
   (foil included) appear in the API is unknown. If a foil shares the regular printing's id, SPEC-001
   and SPEC-003 need a finish dimension (entry key `printingId` + finish) before COLL-011/016/020 can
   separate foils. → researcher (live payload, H-020), then SPEC-001/SPEC-003.
2. **SPEC-003 (optional):** `StoredCollection` keeps only `printingId`, so Collection keeps its own
   printing-code memory (COLL-075). If a later SPEC-003 version stores the printing code beside
   `byPrinting`, COLL-075 can be dropped.
3. **Needs RJ (low):** unassigned copies are a separate tag target per card (COLL-019, chosen) rather
   than untaggable, and their tags are not moved automatically when the printings become known.
   Proposed: keep.
4. **BLOCKED: needs research:** rarity values and their rank order in the Riot API (COLL-034 sorts
   rarity alphabetically until then).
5. **BLOCKED: needs research:** full domain list and API strings (SPEC-001 CARD-025); the domain filter
   lists only values present in data until then.
6. **BLOCKED: needs research:** how variants/overnumbered printings are represented in the Riot API
   (SPEC-001 CARD-040/041). Until then many printings have `variant.kind: unknown`, which the variant
   filter shows as Unknown; `printingSortKey` still orders them by number.
7. **BLOCKED: needs research:** whether the API returns `sets[]` in release order (SPEC-001 CARD-071,
   open question 13); the default order of COLL-031 depends on it.
8. **Time zone of "today"** for ban status follows SPEC-002's open question (LEGAL-R02).
9. **Research (H-099, needs H-020):** whether the Riot API lists rune cards with their own printings, set
   codes and collector numbers, and the foil / alt-art rune printings ([[Physical Copies Across Decks]]
   fact 11). Until then a rune imported by name is an unassigned entry (COLL-012), like any card imported
   without a code. COLL-089 doesn't depend on the answer.
10. **Resolved 2026-11-24 (RJ):** runes are cards ("Allow users to import runes as well and treat them like
   any other card."): COLL-087 withdrawn, COLL-089 added, SPEC-009 withdrawn.
11. **Needs RJ (H-091 c): defer group-by-card (COLL-013)?** Proposed: yes; the dialog lists the card's printings (COLL-104). Cost: no one-row-per-card overview.
12. **Needs RJ (H-091 d): defer the tag and exclude-from-decks UI (COLL-019…030, 082…085)?** Proposed: yes; data, sync and `deckOwnership()` unchanged. **Consequence to confirm:** a tag marked "exclude from decks" that already exists in an account keeps reducing Decks' counts, and with no UI there is no way to remove or change it (the dialog only says "n not counted in your decks"). No build ever offered tag creation, so this applies only to data from older or test builds.
13. **Needs RJ (H-091 e): defer filters (COLL-041…049) and manual edits (COLL-050…056, with the edit part of COLL-088)?** Proposed: yes. **Consequence to confirm:** counts change only by import, so fixing one wrong count or removing one card means an Add or Replace import. A later "Locked" or "Could fit" filter is the ui-engineer's suggestion, not specified.
14. **Needs RJ (H-091 b, f): sort cut to Set & number / Name / Copies, URL `q` + `sort`, and the count-line wording** ("N copies of M cards" / "Showing X of Y", no "entries"). Proposed: as the brief §7, §10 (COLL-010, COLL-108).
15. **Needs RJ (small, in COLL-101 / COLL-103):** (a) COLL-004 moves to the dialog **in full**, so the dialog gets a details line with set name, collector number and rarity that the brief's sketch does not draw; (b) COLL-005's "Preview" label and the type, domain and cost lines are deferred with it; (c) the tile's accessible name adds ", banned" only for `banned` (upcoming and unknown are dialog only). Proposed: as written.
16. **Resolved 2026-11-24 (RJ, [[Collection]] "RJ's decisions" 1):** "ALL cards available" means every card the user owns, not the whole catalog (COLL-100 (a)). A catalog view with `×0` tiles, if ever wanted, needs its own spec.

## Changelog
Current: 0.14.1 (2026-11-25, H-165, RJ decision 2026-11-25: COLL-040 name search uses SPEC-001 CARD-038 (a leading "a" / "the" is optional in the query; `the` and `dreaming` both find The Dreaming Tree); AC 10 extended; pin SPEC-003 0.13, SPEC-001 0.4; no data-contract change). Previous: 0.14 (2026-11-25, H-244, RJ 2026-11-25 "the FAB should never overlap the footer"; [[Brief H-245 H-246 H-247]] D1 to D4; build H-245): COLL-094 (d) rewritten (the button docks 16 px above the footer, room reserved above the footer, no band below it), (e) snack bars follow the docked button, summary line, AC 31; no other requirement changed; [[Accounts and Sync]] 0.17.2 and [[Your Decks Ownership View]] 0.8 match; H-248 rewords the 40rem boundary in (a) and (c) only ("above 40rem" / "at 40rem and below"), no version bump; status stays `review`). Previous: 0.13 (2026-11-25, H-091, `status: review`: Collection page simplified per [[Collection]] rev 3. New section K, COLL-100…109 (owned-only page scope and the deferral rule; image-only tile with accessible name; card-level lock band; read-only card dialog with the moved COLL-004 details and ban label; "You own N across all printings"; Locked in; Could fit in; Keywords pointer to SPEC-011; search, three sorts and `q` + `sort`; lock / ban / deck data states) and a status table of every v0.12 ID; COLL-004, 008, 009 moved to the dialog; COLL-010 reworded (no "entries"); COLL-032, 034, 060, 061, 062 narrowed; **deferred, not deleted:** COLL-005, 013, 019…030 (UI parts), 037, 041…049, 050…056, 064, 082…085, the edit part of 088; ACs 32–41 added, v0.13 status of ACs 1–31; Open questions 11–16 (RJ to confirm the deferrals, sorts and wording; per-printing tiles, owned-only, Could fit in, ban in the dialog and the badge rule are RJ's); no data-contract change). Previous: 0.12 (2026-11-25, H-174: COLL-094 "Add to your collection" button). Earlier: 0.11 (2026-11-24, H-171, ADR-0007 amendment 2, account-only: COLL-070 account-only storage; **COLL-074 withdrawn** (local-only delete action, ID retired); COLL-092 gate always on; new COLL-093 smooth scrolling, no pagination; ACs 28–30; AC 19 and Out of scope reworded; pins SPEC-003 0.11, SPEC-008 0.4.4). Previous: 0.10.1 (2026-11-25, H-160). Earlier: 0.10 (2026-11-24, H-087: COLL-090 card data unavailable, COLL-091 arriving from an import, COLL-058 names the Undo entry point; ACs 26–27; pins SPEC-003 0.10; attempt 2, H-159: COLL-090 (d) no longer cites COLL-066, the loading state is the brief's). Previous: 0.9 (2026-11-24, H-071: short `TagId`, `StoredTags` schemaVersion 3, COLL-070/074 with sync). Full history: [[My Collection changelog]] (archived). New entries go in the archive note.
