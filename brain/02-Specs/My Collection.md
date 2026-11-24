---
tags: [spec]
id: SPEC-007
version: 0.6
status: draft
depends_on: ["SPEC-001", "SPEC-002", "SPEC-003", "SPEC-008", "SPEC-009"]
research: ["[[Sets]]", "[[Card Data & Images]]", "[[Deck Construction Rules]]", "[[Physical Copies Across Decks]]", "[[Ban List]]", "[[Collection Import Formats]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-034
as_of: 2026-11-23
---
# SPEC-007: My Collection

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** the Collection screen: every owned printing as its own entry with a count badge, user tags on printings, sort and filter by any attribute or tag, and the `deckOwnership()` contract that Decks reads.

**Key requirements**
- COLL-001/011: one entry per owned printing, one unassigned entry per card, plus missing-printing entries.
- COLL-016: `×N` count badge when N ≥ 2.
- COLL-008: ban status from SPEC-002 `banStatus(…, today)`; no ban data → "Ban status unknown".
- COLL-012/014: unassigned and missing-printing entries sit at the card's `defaultPrintingId` (CARD-016).
- COLL-019/020: tags attach to a printing (`p:<printingId>`) or a card's unassigned copies (`u:<cardKey>`), never a whole card.
- COLL-031/033: default order `printingSortKey`; total, stable tie-breaker.
- COLL-035/041: Unknown is its own filter/sort bucket and sorts last.
- COLL-060/061: the query is remembered per browser and mirrored in the URL.
- COLL-070: browser-only stores (`CollectionStore`, `TagStore`, `PrintingCodeStore`, view state).
- COLL-080/081: "exclude from decks" tag flag; `deckOwnership(input, cardKey)` → `owned`, `ownedForDecks`, `ownedExcluded`, per-entry breakdown.
- COLL-086…088 (v0.4): one per-name pool for decks: `ownedForDecks` sums every printing of a name, and SPEC-008 subtracts locked decks from it (Collection itself is unchanged by locks); runes are never needed (SPEC-009); changes that make a locked deck short warn first, inside their confirmation (v0.5: also inside the SPEC-003 Replace confirmation; v0.6: also inside the Undo of an import, which asks for a confirmation only then unless COLL-058 already gives one, and is followed by a "… is now `<n>` cards short." notice once confirmed).

**Shared types:** `DeckOwnership` / `DeckOwnershipInput` (read by SPEC-005, SPEC-008) · `CollectionCatalogView` (catalog view read by the pure functions) · `Tag`, `TagTarget`, `StoredTags` · `CollectionEntry`, `EntryBan` · `CollectionQuery`, `CollectionQueryInput`.
**Depends on:** [[Card Data Model]] v0.3, [[Deck Legality]] v0.3, [[Collection Import]] v0.7, [[Shared Cards and Lock-in]] v0.3 (`lockedShortfalls()`, SHARE-034), [[Runes Assumed Owned]] v0.2 (RUNE-008). **Consumers:** [[Your Decks Ownership View]], [[Shared Cards and Lock-in]].
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

The collection itself is produced by [[Collection Import]] (SPEC-003) and stored in the browser
([[ADR-0005 MVP Product Defaults]] decision 1). This spec adds manual editing, tags, the list view
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

## Requirements

### A. Collection entries and display
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-001 | MUST | Collection lists **every** entry derived from the stored collection: one printing entry per `byPrinting` printing with count ≥ 1, one unassigned entry per card with unassigned count ≥ 1, and missing-printing entries (COLL-014). Excluded entries are listed too (COLL-083). Entries with count 0 do not exist (COLL-052). | [[ADR-0006 Two Imports - Collection and Decks]] ("a full list of the cards the user owns"); H-036 #3, #6 |
| COLL-002 | MUST | A collection record is keyed by `cardKey` and holds `quantity` (integer ≥ 1) and `byPrinting` (**`printingId`** → integer ≥ 1), exactly as SPEC-003 `StoredCollection`. Invariant: `Σ byPrinting ≤ quantity`; the difference is the unassigned count. A stored record that breaks the invariant is repaired on load by raising `quantity` to `Σ byPrinting`, with a one-time notice. | [[Collection Import]] IMP-047, IMP-048, `StoredCollection`; design rule |
| COLL-003 | MUST | `quantity` is the number of copies of a card the user owns, across all its printings; printing and `variant.kind` never change **which card** a copy counts toward (CARD-013). Ownership for **Decks** (SPEC-005) is `ownedForDecks(cardKey)` from section J (COLL-081), i.e. `quantity` minus copies carrying an excluded tag; SPEC-005 reads COLL-081 and never re-derives it. | [[ADR-0005 MVP Product Defaults]] decision 2; [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5, #6; [[Card Data Model]] CARD-013, CARD-043 |
| COLL-004 | MUST | Each entry shows: card image (COLL-006), canonical card name (verbatim, SPEC-001 CARD-031), the count badge (COLL-016), ban status (COLL-008) and, for a **printing entry**: set code and set name, collector number (verbatim string), printing code, rarity, and the variant label when `variant.kind` is not `base`/`unknown` (e.g. "Showcase", "Overnumbered", "Signature"). An **unassigned entry** shows "Printing not specified" instead of set and number; a **missing-printing entry** shows the COLL-014 label. | [[ADR-0006 Two Imports - Collection and Decks]]; H-036 #3; [[Card Data & Images]] #10 |
| COLL-005 | SHOULD | Each entry also shows its tags as chips (max 3 visible + "+N"; excluded tags marked per COLL-082), category/type, domains, and cost. Cards Riot marks as preview carry a "Preview" label. | [[Card Data & Images]] #3 (previews labelled); design rule |
| COLL-006 | MUST | Images are the official Riot API URLs from SPEC-001 (`art.thumbnailUrl` in the list, `art.fullUrl` in the detail view). No other image source, no re-hosting. If the URL is null or fails to load, the row shows a text placeholder with the card name; the row is still listed. | [[Card Data & Images]] #3, #7; [[Card Data Model]] CARD-005 |
| COLL-007 | MUST | Card data shown here (names, attributes, text) comes only from the SPEC-001 catalog (Riot API). No hand-curated tables. | [[ADR-0005 MVP Product Defaults]] decision 4; [[Card Data Model]] CARD-001 |
| COLL-008 | MUST | Ban status per entry is SPEC-002's **`banStatus(cardKey, 'standard', 'global', today)`** (LEGAL-B10); Collection never re-derives it from waves. All entries of one card show the same status. `banned` shows "Banned since" + `bannedSince` formatted per COLL-017, e.g. "Banned since Nov 23, 2026". If ban data cannot be loaded, no `BanStatus` exists and the entry's status is the local value `unknown`, shown as "Ban status unknown", never "not banned". | [[Deck Legality]] LEGAL-B10, LEGAL-B02, LEGAL-R02; [[Ban List]] |
| COLL-009 | SHOULD | When `banStatus()` returns `upcoming`, the entry shows "Banned from" + `effective` (COLL-017), e.g. "Banned from Nov 23, 2026", as a separate, non-blocking notice. | [[Deck Legality]] LEGAL-B10, LEGAL-B08 |
| COLL-010 | MUST | The screen shows a summary: distinct cards (`cardKey`s), entries, total copies, and, when a query is active, "showing X of Y entries" (rows in group-by-card view). | design rule |
| COLL-016 | MUST | **Count badge:** an entry with count N ≥ 2 shows the badge `×N` (e.g. `×3`) with accessible text "3 copies". An entry with count 1 shows no badge. Copies of one printing are never shown as several entries. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #3 |
| COLL-017 | MUST | **Dates** are displayed as `MMM D, YYYY` with the English month abbreviation, e.g. `Nov 23, 2026`. Stored data, URLs and contracts keep ISO `YYYY-MM-DD`. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7 (shared display rule) |
| COLL-018 | MUST | Collection shows no deck legality verdict. Any SPEC-002 `incomplete` result shown here in a later version is labelled **"Not fully checked"**, never "Legal"; unknown ban status is "Ban status unknown", never "Not banned". | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7; [[Deck Legality]] LEGAL-R04 |

### B. Entries, views and position of unassigned copies
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-011 | MUST | **Entries view is the default:** one entry per owned printing, so every printing type (regular, foil, alt-art, Showcase, overnumbered, signature, promo) that the catalog lists as its own `printingId` is its own entry, plus one **unassigned entry** per `cardKey` whose unassigned count > 0. Two printings of one card are never merged in the default view. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #3; [[ADR-0006 Two Imports - Collection and Decks]] (default order) |
| COLL-012 | MUST | The representative printing of an **unassigned entry** is the card's `defaultPrintingId` (SPEC-001 CARD-016). The entry sorts by that printing's `printingSortKey`; if the same printing also has its own entry, the printing entry comes first, then the unassigned entry, then any missing-printing entries of that card (COLL-014). The unassigned entry shows that printing's image with the label "Printing not specified". Its printing-level attributes (set, collector number, rarity, variant kind) are Unknown for filters and explicit sorts (COLL-043). | [[Card Data Model]] CARD-016; design rule |
| COLL-013 | SHOULD | An optional **"Group by card"** view (off by default, remembered per browser, COLL-060) shows one row per `cardKey` with `quantity`, expandable to its entries (each with badge and tags). Its representative printing is the owned printing entry with the lowest `printingSortKey`, else the `defaultPrintingId`. The group row shows the union of its entries' tags; tags are assigned only on entries (in the expand), never on the group. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #3 (default stays per printing); design rule |
| COLL-014 | MUST | A `byPrinting` `printingId` that does not resolve in the current catalog (e.g. after a catalog update, SPEC-001 CARD-066) stays its **own missing-printing entry**: its count is not deleted or moved, its tags stay attached by `printingId`, and it is labelled "Printing no longer found: " + its remembered printing code (COLL-075), e.g. "Printing no longer found: OGN-007a" (if no code was ever remembered: "Printing no longer found (id <printingId>)"). It sorts at the card's `defaultPrintingId` position after the unassigned entry (COLL-012); its printing-level attributes are Unknown. Its copies still count toward the card (and toward `ownedForDecks` unless excluded). | [[Card Data Model]] CARD-066; [[Collection Import]] `StoredCollection`; design rule |
| COLL-015 | MUST | A record whose `cardKey` does not resolve in the current catalog is **not dropped**: it is shown in an "Unresolved cards" section at the end of the list (after all sorted rows, in `cardKey` order), with its `cardKey`, quantity and the tags of its tag targets, and a hint to re-import. It is excluded from attribute filters other than text search and tags. | [[Collection Import]] IMP-054; design rule |

### C. Tags
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-019 | MUST | **Unassigned copies are one tag target per `cardKey`**, tagged separately from every printing of that card; their tags show on the unassigned entry only. When a card's unassigned count reaches 0 (e.g. a CSV Replace now identifies every printing), those tags become dormant (COLL-029) and, if the card has printing entries, the app offers once "Copy tags from unassigned copies to …" listing the entries; nothing is copied without the user's choice. | design rule (decision 3) |
| COLL-020 | MUST | Users can create tags with any free text and assign **many tags to an entry**. Tags attach to **tag targets**: a `printingId` (printing and missing-printing entries) or the unassigned copies of a `cardKey` (COLL-019), never to a whole card. A tag on the foil printing of a card does not show on, filter or exclude its regular printing. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #4; [[ADR-0006 Two Imports - Collection and Decks]] |
| COLL-021 | MUST | Tag labels are trimmed, internal whitespace collapsed to one space, and NFC-normalized. Uniqueness is **case-insensitive**: the tag key is the Unicode case fold of the normalized label. Creating `trade binder` when `Trade Binder` exists reuses the existing tag. Display keeps the label as the user typed it. | design rule |
| COLL-022 | MUST | Limits: label length 1–40 characters after normalization; no control characters; at most **200 tags** per browser; at most **20 tags per tag target**. Exceeding a limit shows an inline error and changes nothing. | design rule |
| COLL-023 | MUST | **Rename** a tag: the new label is validated as in COLL-021/022. Renaming to the key of another existing tag offers **merge** instead (COLL-024). Renaming keeps the tag's id, so assignments and saved views stay valid. | design rule |
| COLL-024 | MUST | **Merge** tag A into tag B: every tag target that had A gets B (no duplicates), A is deleted, B keeps its label, colour and `excludeFromDecks` flag. A confirmation states how many entries change and, if A and B differ in the flag, that the merged tag is (or is not) excluded from decks. | design rule |
| COLL-025 | MUST | **Delete** a tag: removes it and all its assignments after a confirmation naming the number of entries affected (and, for an excluded tag, the copies that will count in Decks again). Quantities are not affected. | design rule |
| COLL-026 | MUST | Assign / unassign tags from an entry (and from a multi-selection of entries, COLL-027). Assigning a tag label that does not exist creates it (type-ahead suggests existing tags by tag-key prefix). | design rule |
| COLL-027 | SHOULD | Bulk tagging: select several entries (or "select all entries matching the current query") and add or remove one tag for all their tag targets in one action. In group-by-card view, selecting a group selects all its entries. | design rule |
| COLL-028 | MAY | A tag may have a colour from a fixed palette of at least 8 colours with sufficient text contrast; default is a neutral colour. Colour is never the only way a tag is identified (label always shown). | design rule (accessibility) |
| COLL-029 | MUST | Tag assignments are stored by tag target independently of quantities (COLL-070). When an entry leaves the collection (count → 0, removal, or a Replace import), its assignments are **kept dormant** and reappear if the same `printingId` (or unassigned copies of the same `cardKey`) is owned again. A "Remove tags from printings I no longer own" action MAY clean them up. | design rule (decision 5) |
| COLL-030 | SHOULD | A tag manager lists all tags with the number of owned entries and copies carrying each, its "Exclude from decks" toggle (COLL-082), and offers rename, merge, colour and delete. | design rule; [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6 |

### D. Sort and order
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-031 | MUST | **Default order: with no explicit sort and no filter, entries are ordered by `printingSortKey` ascending** of their representative printing (SPEC-001 CARD-070/071: set order, then regular numbers, overnumbered after the regular range, block form such as `SP1/005`, other codes; then suffix). This also holds in group-by-card view (by representative printing) and when only filters/search are active and no sort is chosen. | [[ADR-0006 Two Imports - Collection and Decks]] (default order), H-036 #3; [[Card Data Model]] CARD-070, CARD-071 |
| COLL-032 | MUST | Sortable fields: `name`, `set`, `collectorNumber`, `category`, `type`, `domain`, `cost`, `energy`, `might`, `power`, `rarity`, `variantKind`, `quantity`, `banStatus`, `tag`, plus `default` (= COLL-031). Each sort has a direction `asc` / `desc`. One primary sort at a time. | [[ADR-0006 Two Imports - Collection and Decks]] ("any attribute of the card and the user assigned tag"); [[Card Data & Images]] #9 (attribute list) |
| COLL-033 | MUST | **Tie-breaker:** rows with equal primary sort values are ordered by `printingSortKey` ascending of the representative printing, then entry kind (printing, unassigned, missing-printing; COLL-012), then `cardKey`, then `printingId`. The tie-breaker does **not** flip with `desc`. Sorting is therefore total and stable across reloads. | design rule |
| COLL-034 | MUST | Comparison rules: `name` compares canonical names with locale `en`, base sensitivity (case and accents ignored), numeric segments as numbers; `set` uses `setOrder` (CARD-071); `collectorNumber` sorts by `printingSortKey` within the chosen direction; numeric stats compare numerically; `category` uses the SPEC-001 `CardCategory` enum order (`legend`, `champion`, `unit`, `spell`, `gear`, `rune`, `battlefield`, `token`) and `variantKind` the `VariantKind` order, with `unknown` treated as Unknown (COLL-035); `type` and `rarity` compare verbatim strings alphabetically (BLOCKED: rarity rank order needs research); `domain` compares the card's domain list sorted alphabetically and joined (a card with **no domain** `[]` is the value "No domain", which sorts before any domain; this is not Unknown); `quantity` uses the entry's count (group view: the card's `quantity`); `banStatus` order asc is not-banned, upcoming, banned; `tag` compares the alphabetically first tag label (tag key) of the entry, untagged entries last. | [[Card Data Model]] CARD-024, CARD-025, CARD-028, CARD-040, CARD-070, CARD-071; design rule |
| COLL-035 | MUST | **Unknown sorts last in both directions.** A row whose sort value is null or `unknown` (including `category: 'unknown'`, `variant.kind: 'unknown'`, the printing-level attributes of unassigned and missing-printing entries, and ban status `unknown`) is placed after all rows with known values, ordered among themselves by the tie-breaker. Unknown rows are never hidden by sorting. | design rule (null = unknown); [[Card Data Model]] CARD-029 |
| COLL-036 | SHOULD | Choosing "Default (set & number)" or "Clear sort" returns to COLL-031 order. | design rule |
| COLL-037 | MAY | A secondary sort field may be offered; if present, the tie-breaker of COLL-033 applies after it. | design rule |

### E. Filter and search
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-040 | MUST | **Name search:** the query text is normalized with SPEC-001 `nameKey`; a row matches when **every** space-separated token of `nameKey(query)` is a substring of the card's `cardKey`. E.g. `zhonya` and `ZHONYA’S hour` both match `Zhonya's Hourglass`. Empty query = no filter. Search SHOULD update within 150 ms after typing stops. | [[Card Data Model]] CARD-030, CARD-031; design rule |
| COLL-041 | MUST | **Attribute filters** (multi-select): set, category, type, domain, cost, energy, might, power, rarity, variant kind. Within one attribute, selected values are OR; across attributes, AND. The option list shows only values present in the collection, each with its entry count, and includes **Unknown** (token `_unknown`) when at least one entry has null or `unknown` for that attribute; selecting Unknown matches those. For `category`, SPEC-001's `'unknown'` is shown only as the Unknown bucket, never as a value named "unknown". | [[ADR-0006 Two Imports - Collection and Decks]]; [[Card Data Model]] CARD-024, CARD-029; design rule |
| COLL-042 | MUST | Domain filter: a multi-domain card matches if **any** of its domains is selected; "No domain" is its own option (cards with `domains: []`), distinct from Unknown. | [[Card Data Model]] CARD-025; [[Deck Construction Rules]] #2 |
| COLL-043 | MUST | Printing-level filters (set, rarity, variant kind) apply per entry. Unassigned and missing-printing entries have Unknown printing-level attributes, so they match the Unknown option; the variant-kind filter additionally offers "Printing not specified" (`_unassigned`) and "Printing no longer found" (`_missing`) to select those entries. In group-by-card view a group matches if **any** of its entries matches, and its expand shows only matching entries. | design rule |
| COLL-044 | MUST | **Tag filter:** select one or more tags with mode **any** (entry has at least one) or **all** (entry has every selected tag); default mode any. Matching is per entry (tag target), so a tag on the foil printing does not match the regular printing. An **Untagged** option matches entries with no tags (combined with other selected tags in mode any = OR; mode all with Untagged plus a tag matches nothing and the UI says so). | [[ADR-0006 Two Imports - Collection and Decks]], H-036 #4; design rule |
| COLL-045 | MUST | **Ban filter:** `all` (default), `banned only`, `hide banned`. `banned only` matches cards banned as of today; `hide banned` keeps not-banned **and** ban-status-unknown rows (unknown is never treated as banned or as not banned silently: unknown rows show their label). | [[Deck Legality]] LEGAL-B02; design rule |
| COLL-046 | MAY | A **quantity filter** may offer "owned ≥ N"; if offered, N is an integer 1–9999. | design rule |
| COLL-047 | MUST | Active filters are visible as removable chips, with a single "Clear all" that restores the default query (COLL-031). When no row matches, the list shows an empty state naming the active filters, not a blank screen. | design rule |
| COLL-048 | MUST | Filters never alter stored data; tags, quantities and dormant entries are unaffected by any query. | design rule |
| COLL-049 | SHOULD | **Decks filter:** `all` (default), `counted in decks` (entries without an excluded tag), `excluded from decks` (entries with at least one excluded tag). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6; design rule |

### F. Editing quantities and removing cards
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-050 | MUST | Each entry has **+** and **−** controls. On a printing entry they change `byPrinting[printingId]` and `quantity` by 1; on an unassigned entry, `quantity` only; on a missing-printing entry only **−** is available (the printing is not in the catalog). | design rule |
| COLL-051 | MUST | In group-by-card view (COLL-013), **+** on a group row adds one unassigned copy. **−** removes one unassigned copy if any exist; otherwise it asks which entry to decrement (listing the card's entries in `printingSortKey` order). | design rule |
| COLL-052 | MUST | When an entry's count reaches 0 the entry disappears; when a card's `quantity` reaches 0 its record is removed from the collection (tags stay dormant, COLL-029). Quantities are integers 0–9999 per printing and per card; + is disabled at 9999. | design rule |
| COLL-053 | SHOULD | A user can set a quantity directly by typing a number on a row (same rules as COLL-050/052). | design rule |
| COLL-054 | MUST | **Remove card** removes the whole record of a card (all its entries) after a confirmation, or with an Undo notice available for at least 8 seconds. Tags stay dormant (COLL-029). | design rule |
| COLL-055 | SHOULD | **Add card** manually: search the catalog by name (COLL-040 matching against all catalog cards), pick a card and optionally a printing, choose a quantity; it is added as with an SPEC-003 Add import (unassigned if no printing chosen). | design rule |
| COLL-056 | MUST | Manual edits are saved through the same `CollectionStore` as imports, update `updatedAt`, and keep `catalogVersion`. They do not create a SPEC-003 import record. | [[Collection Import]] IMP-053, IMP-054 |
| COLL-057 | MUST | Interaction with SPEC-003 commits: **Add** increases `quantity` and per-printing counts as in IMP-049; **Replace** sets the collection to exactly the imported set. In both modes **tags are untouched**: they stay attached by `printingId` (and by `cardKey` for unassigned copies), so a printing present after the import keeps its tags, and printings no longer owned keep dormant tags (COLL-029). A Replace confirmation (IMP-050) also states "Tags are kept". | [[Collection Import]] IMP-049, IMP-050; design rule (decision 5) |
| COLL-058 | MUST | Undoing the last import (IMP-052) restores quantities only. If manual edits were made after that import, the undo confirmation warns that those edits will be lost. Tags are not affected by undo. *(v0.6)* Where an undo also gets SPEC-008's locked-deck warning, that is COLL-088 (SHOULD): it goes inside this same confirmation. | [[Collection Import]] IMP-052, IMP-050a; design rule |
| COLL-059 | SHOULD | The collection CSV export (IMP-055) includes a `Tags` column: on a printing line, the tags of that `printingId`; on a name-only line for unassigned copies, the unassigned tags (tags joined with `; `, labels containing `;` quoted). Import ignores that column unless a later SPEC-003 version defines tag import. | [[Collection Import]] IMP-055; design rule |

### G. View state and URL
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-060 | MUST | The current query (view mode, search text, filters, tag mode, ban filter, sort, direction) is remembered **per browser** and restored when the user returns to Collection. | design rule; [[ADR-0005 MVP Product Defaults]] decision 1 |
| COLL-061 | MUST | The query is mirrored in URL query parameters (`view`, `q`, `sort`, `dir`, `set`, `cat`, `type`, `domain`, `cost`, `energy`, `might`, `power`, `rarity`, `variant`, `tag`, `tagMode`, `ban`, `decks`, `minQty`), with comma-separated multi-values, so a filtered view can be bookmarked or reopened in the same browser. `view=cards` selects group-by-card view. The unknown bucket is the token `_unknown`, "No domain" is `_none`, Untagged is `_untagged`, unassigned entries `_unassigned`, missing-printing entries `_missing`. Defaults are omitted, so the default query has a clean URL. | design rule |
| COLL-062 | MUST | Tags are referenced in the URL by **tag id**, so a bookmark survives a rename. A URL that names a tag id, set code or value that does not exist in this browser drops that value and shows a one-line notice ("1 filter value not found and was ignored"). URLs never contain anything but query state (no quantities, no personal data). | design rule; privacy |
| COLL-063 | MUST | On load, URL parameters (if any) win over the remembered state; the result becomes the remembered state. Changes to the query update the URL in place (no new history entry per keystroke). | design rule |
| COLL-064 | MAY | A user may save named views (e.g. "Kennen deck – unowned trades") that store a query. | design rule |

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
| COLL-070 | MUST | All Collection data is stored **in the browser only**, no account, no server copy: quantities through SPEC-003's `CollectionStore`, tags through a `TagStore`, printing codes through a `PrintingCodeStore` (COLL-075), view state through a `CollectionViewStateStore`. Each is an interface with a browser adapter, so a server store can replace it later without changing behaviour. | [[ADR-0005 MVP Product Defaults]] decision 1; [[ADR-0006 Two Imports - Collection and Decks]] (tags in the browser); [[Collection Import]] IMP-053 |
| COLL-071 | MUST | Every stored record has a `schemaVersion`: `StoredTags` is `2`, `StoredViewState` is `2`, `StoredPrintingCodes` is `1`. A loader that finds an older version migrates it: `StoredTags` 1 (0.1 draft, assignments by `cardKey`) → each card's tags are copied to every printing entry currently owned for that card and to its unassigned target, `excludeFromDecks` = false; `StoredViewState` 1 → `view: 'printings'` becomes `'entries'`. A newer or unreadable version is not overwritten and the user is told the data could not be read. | [[Collection Import]] IMP-054; design rule |
| COLL-072 | MUST | A failed save (e.g. browser storage full) shows an error, keeps the in-memory change visible as "not saved", and does not corrupt the previously stored record. | design rule |
| COLL-073 | SHOULD | Changes made in another tab of the same browser are picked up (reload of stores on change) so two tabs do not overwrite each other silently. | design rule |
| COLL-074 | MUST | The user can delete all local collection, tag, printing-code and view data from a settings action, after confirmation. | [[Card Data & Images]] #7 (data removal); design rule |
| COLL-075 | MUST | **Printing-code memory:** whenever the collection is loaded or saved against a catalog, for every `byPrinting` `printingId` that resolves, Collection records `printingId → printingCode` (SPEC-001 `publicCode`, or `SET-collectorNumber` if `publicCode` is null) with the `cardKey` and the `catalogVersion` it was seen in. A code is kept while its `printingId` is in the collection or in a tag assignment. It is display data only and never used as a key. | [[Collection Import]] `StoredCollection` (keys by `printingId` only); [[Card Data Model]] `Printing.publicCode`, CARD-066; design rule (decision 6) |

### J. Exclude from decks and the Decks contract
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-080 | MUST | Each tag has a boolean **`excludeFromDecks`**, default `false` (e.g. a `Collector` tag on an expensive printing). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6 |
| COLL-081 | MUST | **Deck-ownership contract** (read by SPEC-005): `deckOwnership(input, cardKey)` returns `owned` (= SPEC-003 `quantity`, 0 if absent), `ownedExcluded` = Σ counts of that card's entries (printing, unassigned, missing-printing) that carry at least one excluded tag, `ownedForDecks = owned − ownedExcluded`, and the per-entry breakdown (entry kind, `printingId`, printing code, count, excluded, the excluding tag ids) in `printingSortKey` order, for SPEC-005's "show exact printings" expand and its "owned but excluded" display. An entry counts once however many excluded tags it carries; dormant assignments have no copies and count nothing. It is a pure function of (collection, tags, printing codes, catalog), all carried by `DeckOwnershipInput`. | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #5, #6 and Note (owned(cardKey) excludes excluded printings); [[Collection Import]] IMP-058 |
| COLL-082 | MUST | The tag create/edit dialog and the tag manager show a toggle **"Exclude from decks"** with the help text "Cards with this tag stay in your collection but don't count as owned in your decks." Chips of excluded tags carry a marker with accessible text "excluded from decks" (not colour alone). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6; design rule (accessibility) |
| COLL-083 | MUST | An excluded entry still appears in Collection at its normal position with its count and badge, plus the label **"Not counted in your decks"**. Sorting and filtering treat it like any other entry (COLL-049 can select it). | [[ADR-0006 Two Imports - Collection and Decks]] H-036 #6 |
| COLL-084 | MUST | Turning the flag on or off, assigning or removing an excluded tag, and merging or deleting a tag take effect on the next read of COLL-081, without re-import. Toggling the flag asks for confirmation stating the effect, e.g. "2 copies of 1 card will no longer count in your decks". | design rule |
| COLL-085 | SHOULD | The summary (COLL-010) shows "N copies excluded from decks" when N > 0. | design rule |
| COLL-086 | MUST | **Per-printing Collection, per-name pool for decks.** Collection stays per printing (COLL-011) and tags stay on printings (COLL-020), but decks see one number per card name: `ownedForDecks(cardKey)` sums every non-excluded printing, unassigned and missing-printing entry of that `cardKey` (COLL-081). SPEC-008 builds its cross-deck pool on that number and subtracts copies held by locked decks; the exclude-from-decks tag applies first, so an excluded copy is never available to any deck, locked or not (SHARE-004). Locks never change quantities, entries or tags here. | [[Physical Copies Across Decks]] facts 2, 14; [[Shared Cards and Lock-in]] SHARE-002, SHARE-004; [[ADR-0006 Two Imports - Collection and Decks]] "Shared cards, lock in and runes" |
| COLL-087 | MUST | **Runes are never needed.** Collection never asks for runes or warns that runes are missing; runes the user imports are listed, tagged and edited like any card, but never affect Decks (SPEC-009 RUNE-008). | [[Runes Assumed Owned]] RUNE-008 |
| COLL-088 | SHOULD | When an edit would lower what a **locked deck** holds (− on an entry, a typed lower quantity (COLL-053), Remove card, turning on an exclude flag, assigning an excluded tag), SPEC-008's warning "'`<deck name>`' (locked) will be `<n>` cards short. It stays locked." is shown **before** the edit, inside its confirmation (COLL-084, COLL-054); an edit with no confirmation of its own (−, typed quantity, tag assignment, Remove card with Undo) asks for one only in that case, and Cancel leaves everything unchanged. A **Replace** Owned Cards Import shows the same warning inside its SPEC-003 IMP-050 confirmation, computed on the parsed import; an **Undo** of an import commit (IMP-052), computed on the snapshot it would restore, shows it inside the COLL-058 undo confirmation when manual edits followed the import, and otherwise asks for a confirmation only in that case, like the edits above (v0.6; SHARE-034, IMP-050a). After a confirmed Undo (only), the notice "'`<deck name>`' (locked) is now `<n>` cards short." follows; Cancel shows no notice. No change shows the warning only after it has run. | [[Shared Cards and Lock-in]] SHARE-033, SHARE-034; [[Collection Import]] IMP-050, IMP-050a, IMP-052; RJ decision 2026-11-23 (H-049 follow-up: Undo warns before and notifies after) |

## Data contract
```ts
// shapes only; no implementation
import type { CardKey, PrintingId, PrintingCode, StoredCollection, CollectionStore } from './collection-import'; // SPEC-003 v0.7
import type { CardCategory, VariantKind, CardSet, PlayableCard, Printing } from './card-data-model';  // SPEC-001
import type { BanStatus, BanListFile } from './deck-legality';       // SPEC-002, LEGAL-B10
type IsoDate = string;             // YYYY-MM-DD (display per COLL-017: 'Nov 23, 2026')
type TagId = string;               // opaque, stable across rename (e.g. 't_01H…')

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
  schemaVersion: 2;                              // 1 = 0.1 draft (assignments by cardKey), migrated per COLL-071
  updatedAt: string;
  tags: Tag[];                                   // max 200
  assignments: Record<TagTarget, TagId[]>;       // max 20 per target; may include dormant targets (COLL-029)
}

interface TagStore {               // MVP adapter: browser storage
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
Card names below are real cards from research notes. Collector numbers, variant kinds and set
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
    **Given** the user filters set `OGN,SFD`, tag `Kennen deck` (id `t_7`), sort cost descending
    **Then** the URL is `…/collection?set=OGN,SFD&tag=t_7&sort=cost&dir=desc`. **When** that URL is
    opened in a new tab of the same browser **Then** the same rows show in the same order. **When**
    the URL contains `tag=t_999` (unknown) **Then** that value is ignored with a notice and the rest
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
    **Given** stored quantities, tags, printing codes and view state **When** the browser storage is
    inspected **Then** there are four records (collection, tags, printing codes, view state), each with
    `schemaVersion`, and none contains any API key or card image data.
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

## Out of scope
- Importing cards (SPEC-003) and decks (SPEC-006); deck ownership visuals (SPEC-005).
- Prices, trade/wishlist features, condition, language; foil/finish tracking beyond what the catalog
  lists as separate printings (open question 1).
- Sharing a collection or tags with other people or other browsers (no accounts in the MVP);
  "shareable" URLs work in the same browser only, because the data is local.
- Importing tags from CSV.

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

## Changelog
Current: 0.6 (2026-11-23, H-049). Full history: [[My Collection changelog]] (archived). New entries go in the archive note.
