---
tags: [spec]
id: SPEC-007
version: 0.1
status: draft
depends_on: ["SPEC-001", "SPEC-002", "SPEC-003"]
research: ["[[Sets]]", "[[Card Data & Images]]", "[[Deck Construction Rules]]", "[[Ban List]]", "[[Collection Import Formats]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-031
as_of: 2026-11-23
---
# SPEC-007: My Collection

## Purpose
Define the **My Collection** screen and its data: a full list of the cards the user owns, user tags
on cards, and sorting, ordering and filtering by name, any card attribute, or tag. RJ's words
([[ADR-0006 Two Imports - Collection and Decks]]):

> In My Collection, there will just be a full list of cards they own. However, they can tag cards
> with whatever tags the user would like. There can be list sorting, ordering and filtering based on
> name or any attribute of the card and the user assigned tag. However, if no filter is applied, it
> will be ordered by set number order and the card number in that set — even accounting for overnumbered.

The collection itself is produced by [[Collection Import]] (SPEC-003) and stored in the browser
([[ADR-0005 MVP Product Defaults]] decision 1). This spec adds manual editing, tags, the list view
and its query model. The other consumer of the collection is [[Your Decks Ownership View]] (SPEC-005),
which reads per-`cardKey` totals only.

## Definitions
- **`cardKey`**: the playable-card key from [[Card Data Model]] (SPEC-001). All printings and variants
  that share a name share one `cardKey` ([[ADR-0005 MVP Product Defaults]] decision 2).
- **Printing**: one printing from SPEC-001 (set code, collector number, `variant.kind`, image URLs).
- **`printingSortKey`**: the **normative** printing order defined in SPEC-001 v0.2: set order, then
  numeric collector number, then suffix / variant, with overnumbered printings placed by numeric value
  after the regular range. This spec never redefines it; it only references it by name.
- **`catalogVersion`**: the card-catalog version from SPEC-001, recorded with the stored collection (IMP-054).
- **Collection entry**: the owned record for one `cardKey`: a total quantity plus per-printing counts
  where the import source identified printings (SPEC-003 IMP-048).
- **Known-printing count**: copies of an entry attributed to a specific printing.
- **Unassigned count**: `total − Σ known-printing counts`. Copies owned but with no known printing
  (e.g. imported from `3 Lightning Rush` plain text).
- **Row**: one line in the list. In **Printings** view (default) a row is one owned printing of a
  card, or the unassigned copies of a card. In **Cards** view ("group by card") a row is one `cardKey`.
- **Representative printing** (of a row): the printing whose image, set, number and printing-level
  attributes the row shows and sorts by (COLL-012, COLL-013).
- **Tag**: a user-created free-text label. **Tag key**: the case-insensitive identity of a tag label (COLL-021).
- **Unknown**: a card attribute that SPEC-001 gives as `null` (null = unknown). Shown as the
  **Unknown** bucket in filters and sorts; never silently dropped.
- **Today**: the local calendar date used as `asOf` for ban status (SPEC-002 LEGAL-R02).
- **Query**: the current view mode + text search + filters + sort (`CollectionQuery`, data contract).
  The **default query** has no text, no filters, no explicit sort, Printings view.

## Design decisions (summary)
1. **Default rows are per printing, with a "group by card" option.** RJ's default order is
   "set order, then collector number in the set, overnumbered included". Set and collector number
   belong to a printing, not to a card name: `Kai'Sa, Survivor` may be owned as a base printing and as
   a Showcase printing (e.g. `RAD-SP1/005`), which sit in different places in set order. One row per
   printing is the only way the default order is literally true. Cards view is one click away for
   users who think in names (and is what SPEC-005 matches on).
2. **Unassigned copies get their own row**, positioned at the card's `defaultPrintingId`
   (SPEC-001 CARD-016) in `printingSortKey` order, right after that printing's own row if both are owned.
   So a name-only import still lands in a sensible place in set order.
3. **Tags are on `cardKey`, not on printings.** Variants count as the same card (ADR-0005); many
   imports have no printing info, so printing-level tags could not be applied to unassigned copies;
   re-imports may change which printings are known (name-only Replace after a CSV import), and tags
   keyed by `cardKey` survive that. Per-printing tags are an open question for a later version.
4. **Tags live in their own store**, separate from quantities, so SPEC-003 Add/Replace never touches them.
5. **Unknown is a value.** Null attributes form an "Unknown" bucket that can be filtered on and sorts
   last in both directions.

## Requirements

### A. Collection entries and display
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-001 | MUST | My Collection lists **every** entry of the stored collection with total quantity ≥ 1. Entries with quantity 0 do not exist (they are removed, COLL-052). | [[ADR-0006 Two Imports - Collection and Decks]] ("a full list of the cards the user owns") |
| COLL-002 | MUST | An entry is keyed by `cardKey` and holds `total` (integer ≥ 1) and `byPrinting` (printing → integer ≥ 1). Invariant: `Σ byPrinting ≤ total`; the difference is the unassigned count. A stored record that breaks the invariant is repaired on load by raising `total` to `Σ byPrinting`, with a one-time notice. | [[Collection Import]] IMP-047, IMP-048; design rule |
| COLL-003 | MUST | Ownership for all other features is `total` per `cardKey`; `variant.kind` and printing never change it. SPEC-005 reads `total` only. | [[ADR-0005 MVP Product Defaults]] decision 2; [[Card Data Model]] CARD-013, CARD-043 |
| COLL-004 | MUST | Each row shows: card image (COLL-006), canonical card name (verbatim, SPEC-001 CARD-031), set code and set name, collector number (verbatim string) or "Printing not specified" for an unassigned row, variant label when `variant.kind` is not `base`/`unknown`, quantity for that row, and ban status (COLL-008). In Cards view the row also shows the per-printing breakdown on expand. | [[ADR-0006 Two Imports - Collection and Decks]]; [[Card Data & Images]] #10 |
| COLL-005 | SHOULD | Each row also shows the card's tags as chips (max 3 visible + "+N"), category/type, domains, and cost. Cards Riot marks as preview carry a "Preview" label. | [[Card Data & Images]] #3 (previews labelled); design rule |
| COLL-006 | MUST | Images are the official Riot API URLs from SPEC-001 (`art.thumbnailUrl` in the list, `art.fullUrl` in the detail view). No other image source, no re-hosting. If the URL is null or fails to load, the row shows a text placeholder with the card name; the row is still listed. | [[Card Data & Images]] #3, #7; [[Card Data Model]] CARD-005 |
| COLL-007 | MUST | Card data shown here (names, attributes, text) comes only from the SPEC-001 catalog (Riot API). No hand-curated tables. | [[ADR-0005 MVP Product Defaults]] decision 4; [[Card Data Model]] CARD-001 |
| COLL-008 | MUST | Ban status per `cardKey` is computed with SPEC-002's banned set for format `standard`, region `global`, **as of today** (LEGAL-B02: effective date inclusive). A banned row shows "Banned" with the wave's effective date, e.g. "Banned since 2026-11-23". If ban data cannot be loaded, status is `unknown` (shown as "Ban status unknown"), never "not banned". | [[Deck Legality]] LEGAL-016, LEGAL-B02, LEGAL-R02; [[Ban List]] |
| COLL-009 | SHOULD | A card on an announced-but-not-yet-effective ban wave shows "Banned from <date>" as a separate, non-blocking notice (SPEC-002 `upcomingBans`). | [[Deck Legality]] LEGAL-B08 |
| COLL-010 | MUST | The screen shows a summary: distinct cards (`cardKey`s), total copies, and, when a query is active, "showing X of Y rows". | design rule |

### B. Rows, views and position of unassigned copies
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-011 | MUST | **Printings view is the default**: one row per (`cardKey`, owned printing) with that printing's count, plus one **unassigned row** per `cardKey` whose unassigned count > 0. | [[ADR-0006 Two Imports - Collection and Decks]] (default order by set + collector number, a printing-level concept); design rule |
| COLL-012 | MUST | The representative printing of an **unassigned row** is the card's `defaultPrintingId` (SPEC-001 CARD-016). The row sorts by that printing's `printingSortKey`; if the same printing also has its own row, the printing row comes first and the unassigned row directly after it. The unassigned row shows that printing's image with the label "Printing not specified". | [[Card Data Model]] CARD-016; design rule |
| COLL-013 | MUST | **Cards view** ("group by card", a toggle) shows one row per `cardKey` with `total`. Its representative printing is the owned known printing with the lowest `printingSortKey`; if the entry has no known printings, the `defaultPrintingId`. Printing-level attributes (set, collector number, variant kind, rarity, image) of a Cards-view row come from the representative printing. | design rule |
| COLL-014 | MUST | A printing reference in `byPrinting` that does not resolve in the current catalog (e.g. after a catalog update) is counted as unassigned for display and ordering, and the entry is flagged "Printing no longer found: OGN-007a". The stored count is not deleted. | [[Card Data Model]] CARD-066; design rule |
| COLL-015 | MUST | An entry whose `cardKey` does not resolve in the current catalog is **not dropped**: it is shown in an "Unresolved cards" section at the end of the list (after all sorted rows, in `cardKey` order), with its stored name, quantity and tags, and a hint to re-import. It is excluded from attribute filters other than text search and tags. | [[Collection Import]] IMP-054; design rule |

### C. Tags
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-020 | MUST | Users can create tags with any free text and assign **many tags to a card**. Tags are assigned to a **`cardKey`** (not a printing), so in Printings view a tag shows on every row of that card. | [[ADR-0006 Two Imports - Collection and Decks]]; [[ADR-0005 MVP Product Defaults]] decision 2; design rule (decision 3) |
| COLL-021 | MUST | Tag labels are trimmed, internal whitespace collapsed to one space, and NFC-normalized. Uniqueness is **case-insensitive**: the tag key is the Unicode case fold of the normalized label. Creating `trade binder` when `Trade Binder` exists reuses the existing tag. Display keeps the label as the user typed it. | design rule |
| COLL-022 | MUST | Limits: label length 1–40 characters after normalization; no control characters; at most **200 tags** per browser; at most **20 tags per card**. Exceeding a limit shows an inline error and changes nothing. | design rule |
| COLL-023 | MUST | **Rename** a tag: the new label is validated as in COLL-021/022. Renaming to the key of another existing tag offers **merge** instead (COLL-024). Renaming keeps the tag's id, so assignments and saved views stay valid. | design rule |
| COLL-024 | MUST | **Merge** tag A into tag B: every card that had A gets B (no duplicates), A is deleted, B keeps its label and colour. A confirmation states how many cards change. | design rule |
| COLL-025 | MUST | **Delete** a tag: removes it and all its assignments after a confirmation naming the number of cards affected. Cards themselves are not affected. | design rule |
| COLL-026 | MUST | Assign / unassign tags from a row (and from a multi-selection of rows, COLL-027). Assigning a tag label that does not exist creates it (type-ahead suggests existing tags by tag-key prefix). | design rule |
| COLL-027 | SHOULD | Bulk tagging: select several rows (or "select all rows matching the current query") and add or remove one tag for all their `cardKey`s in one action. | design rule |
| COLL-028 | MAY | A tag may have a colour from a fixed palette of at least 8 colours with sufficient text contrast; default is a neutral colour. Colour is never the only way a tag is identified (label always shown). | design rule (accessibility) |
| COLL-029 | MUST | Tag assignments are stored by `cardKey` independently of quantities (COLL-070). When a card leaves the collection (quantity → 0, removal, or a Replace import), its assignments are **kept dormant** and reappear if the card is owned again. A "Remove tags from cards I no longer own" action MAY clean them up. | design rule (decision 4) |
| COLL-030 | SHOULD | A tag manager lists all tags with the number of owned cards carrying each, and offers rename, merge, colour and delete. | design rule |

### D. Sort and order
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-031 | MUST | **Default order: with no explicit sort and no filter, rows are ordered by `printingSortKey` ascending** (set order, then numeric collector number, then suffix/variant; overnumbered printings by numeric value after the regular range). This also holds in Cards view (by representative printing) and when only filters/search are active and no sort is chosen. | [[ADR-0006 Two Imports - Collection and Decks]] (default order); [[Card Data Model]] v0.2 `printingSortKey` |
| COLL-032 | MUST | Sortable fields: `name`, `set`, `collectorNumber`, `category`, `type`, `domain`, `cost`, `energy`, `might`, `power`, `rarity`, `variantKind`, `quantity`, `banStatus`, `tag`, plus `default` (= COLL-031). Each sort has a direction `asc` / `desc`. One primary sort at a time. | [[ADR-0006 Two Imports - Collection and Decks]] ("any attribute of the card and the user assigned tag"); [[Card Data & Images]] #9 (attribute list) |
| COLL-033 | MUST | **Tie-breaker:** rows with equal primary sort values are ordered by `printingSortKey` ascending (Cards view: of the representative printing), then unassigned-after-printing (COLL-012), then `cardKey`. The tie-breaker does **not** flip with `desc`. Sorting is therefore total and stable across reloads. | design rule |
| COLL-034 | MUST | Comparison rules: `name` compares canonical names with locale `en`, base sensitivity (case and accents ignored), numeric segments as numbers; `set` uses the set order inside `printingSortKey`; `collectorNumber` sorts by `printingSortKey` within the chosen direction; numeric stats compare numerically; `category` and `variantKind` use the enum order of SPEC-001; `type` and `rarity` compare verbatim strings alphabetically (BLOCKED: rarity rank order needs research); `domain` compares the card's domain list sorted alphabetically and joined (a card with **no domain** `[]` is the value "No domain", which sorts before any domain; this is not Unknown); `quantity` uses the row's quantity; `banStatus` order asc is not-banned, upcoming, banned; `tag` compares the alphabetically first tag label of the card (tag key), untagged cards last. | [[Card Data Model]] CARD-024, CARD-025, CARD-028, CARD-040; design rule |
| COLL-035 | MUST | **Unknown sorts last in both directions.** A row whose sort value is null (or ban status `unknown`) is placed after all rows with known values, ordered among themselves by the tie-breaker. Unknown rows are never hidden by sorting. | design rule (null = unknown) |
| COLL-036 | SHOULD | Choosing "Default (set & number)" or "Clear sort" returns to COLL-031 order. | design rule |
| COLL-037 | MAY | A secondary sort field may be offered; if present, the tie-breaker of COLL-033 applies after it. | design rule |

### E. Filter and search
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-040 | MUST | **Name search:** the query text is normalized with SPEC-001 `nameKey`; a row matches when **every** space-separated token of `nameKey(query)` is a substring of the card's `cardKey`. E.g. `zhonya` and `ZHONYA’S hour` both match `Zhonya's Hourglass`. Empty query = no filter. Search SHOULD update within 150 ms after typing stops. | [[Card Data Model]] CARD-030, CARD-031; design rule |
| COLL-041 | MUST | **Attribute filters** (multi-select): set, category, type, domain, cost, energy, might, power, rarity, variant kind. Within one attribute, selected values are OR; across attributes, AND. The option list shows only values present in the collection, each with its row count, and includes **Unknown** when at least one row has null for that attribute. Selecting Unknown matches null values. | [[ADR-0006 Two Imports - Collection and Decks]]; design rule |
| COLL-042 | MUST | Domain filter: a multi-domain card matches if **any** of its domains is selected; "No domain" is its own option (cards with `domains: []`), distinct from Unknown. | [[Card Data Model]] CARD-025; [[Deck Construction Rules]] #2 |
| COLL-043 | MUST | Printing-level filters (set, rarity, variant kind) apply per row in Printings view. An **unassigned row** matches on its representative printing (COLL-012), and additionally the variant-kind filter offers "Printing not specified" to select unassigned rows. In Cards view a card matches if **any** of its owned printings matches (or the representative printing for unassigned-only entries). | design rule |
| COLL-044 | MUST | **Tag filter:** select one or more tags with mode **any** (card has at least one) or **all** (card has every selected tag); default mode any. An **Untagged** option matches cards with no tags (combined with other selected tags in mode any = OR; mode all with Untagged plus a tag matches nothing and the UI says so). | [[ADR-0006 Two Imports - Collection and Decks]]; design rule |
| COLL-045 | MUST | **Ban filter:** `all` (default), `banned only`, `hide banned`. `banned only` matches cards banned as of today; `hide banned` keeps not-banned **and** ban-status-unknown rows (unknown is never treated as banned or as not banned silently: unknown rows show their label). | [[Deck Legality]] LEGAL-B02; design rule |
| COLL-046 | MAY | A **quantity filter** may offer "owned ≥ N"; if offered, N is an integer 1–9999. | design rule |
| COLL-047 | MUST | Active filters are visible as removable chips, with a single "Clear all" that restores the default query (COLL-031). When no row matches, the list shows an empty state naming the active filters, not a blank screen. | design rule |
| COLL-048 | MUST | Filters never alter stored data; tags, quantities and dormant entries are unaffected by any query. | design rule |

### F. Editing quantities and removing cards
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-050 | MUST | Each row has **+** and **−** controls. In Printings view, + / − on a printing row changes that printing's count and `total` by 1; on an unassigned row it changes the unassigned count (`total` only). | design rule |
| COLL-051 | MUST | In Cards view, **+** adds one unassigned copy. **−** removes one unassigned copy if any exist; otherwise it asks which printing to decrement (listing owned printings in `printingSortKey` order). | design rule |
| COLL-052 | MUST | When a row's count reaches 0 the row disappears; when an entry's `total` reaches 0 the entry is removed from the collection (tags stay dormant, COLL-029). Quantities are integers 0–9999 per printing and per entry total; + is disabled at 9999. | design rule |
| COLL-053 | SHOULD | A user can set a quantity directly by typing a number on a row (same rules as COLL-050/052). | design rule |
| COLL-054 | MUST | **Remove card** removes the whole entry (all printings and unassigned copies) after a confirmation, or with an Undo notice available for at least 8 seconds. | design rule |
| COLL-055 | SHOULD | **Add card** manually: search the catalog by name (COLL-040 matching against all catalog cards), pick a card and optionally a printing, choose a quantity; it is added as with an SPEC-003 Add import (unassigned if no printing chosen). | design rule |
| COLL-056 | MUST | Manual edits are saved through the same `CollectionStore` as imports, update `updatedAt`, and keep `catalogVersion`. They do not create a SPEC-003 import record. | [[Collection Import]] IMP-053, IMP-054 |
| COLL-057 | MUST | Interaction with SPEC-003 commits: **Add** increases totals and per-printing counts as in IMP-049; **Replace** sets the collection to exactly the imported set. In both modes, **tags are untouched** and remain attached by `cardKey` (cards no longer owned keep dormant tags, COLL-029). A Replace confirmation (IMP-050) also states "Tags are kept". | [[Collection Import]] IMP-049, IMP-050; design rule (decision 4) |
| COLL-058 | MUST | Undoing the last import (IMP-052) restores quantities only. If manual edits were made after that import, the undo confirmation warns that those edits will be lost. Tags are not affected by undo. | [[Collection Import]] IMP-052; design rule |
| COLL-059 | SHOULD | The collection CSV export (IMP-055) includes a `Tags` column (tags joined with `; `, labels containing `;` quoted). Import ignores that column unless a later SPEC-003 version defines tag import. | [[Collection Import]] IMP-055; design rule |

### G. View state and URL
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-060 | MUST | The current query (view mode, search text, filters, tag mode, ban filter, sort, direction) is remembered **per browser** and restored when the user returns to My Collection. | design rule; [[ADR-0005 MVP Product Defaults]] decision 1 |
| COLL-061 | MUST | The query is mirrored in URL query parameters (`view`, `q`, `sort`, `dir`, `set`, `cat`, `type`, `domain`, `cost`, `energy`, `might`, `power`, `rarity`, `variant`, `tag`, `tagMode`, `ban`, `minQty`), with comma-separated multi-values, so a filtered view can be bookmarked or reopened in the same browser. The unknown bucket is the token `_unknown`, "No domain" is `_none`, Untagged is `_untagged`, unassigned rows `_unassigned`. Defaults are omitted, so the default query has a clean URL. | design rule |
| COLL-062 | MUST | Tags are referenced in the URL by **tag id**, so a bookmark survives a rename. A URL that names a tag id, set code or value that does not exist in this browser drops that value and shows a one-line notice ("1 filter value not found and was ignored"). URLs never contain anything but query state (no quantities, no personal data). | design rule; privacy |
| COLL-063 | MUST | On load, URL parameters (if any) win over the remembered state; the result becomes the remembered state. Changes to the query update the URL in place (no new history entry per keystroke). | design rule |
| COLL-064 | MAY | A user may save named views (e.g. "Kennen deck – unowned trades") that store a query. | design rule |

### H. Performance
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-065 | MUST | The list works with at least **5,000 rows** (all ~1,900 Riftcodex-counted printings across current sets plus growth, [[Sets]]) without blocking input. | [[Sets]] (card counts); design rule |
| COLL-066 | SHOULD | The list uses virtual scrolling (only visible rows plus a small buffer are rendered). On RJ's PC, with 5,000 rows, a sort or filter change SHOULD show results within 200 ms and first render within 1 s after data is loaded. | design rule |
| COLL-067 | MUST | Card images load lazily: only for rows in or near the viewport, thumbnails in the list, with fixed-size placeholders so the list does not jump. | [[Card Data & Images]] #7 (hotlink only); design rule |
| COLL-068 | SHOULD | Query evaluation is a pure function of (collection, tags, catalog, ban data, today, query), so it can be unit-tested and moved off the main thread if needed. | [[Deck Legality]] LEGAL-R01 (same pattern) |

### I. Storage
| ID | Level | Requirement | Source |
|---|---|---|---|
| COLL-070 | MUST | All My Collection data is stored **in the browser only**, no account, no server copy: quantities through SPEC-003's `CollectionStore`, tags through a `TagStore`, view state through a `CollectionViewStateStore`. Each is an interface with a browser adapter, so a server store can replace it later without changing behaviour. | [[ADR-0005 MVP Product Defaults]] decision 1; [[ADR-0006 Two Imports - Collection and Decks]] (tags in the browser); [[Collection Import]] IMP-053 |
| COLL-071 | MUST | Every stored record has a `schemaVersion`; `StoredTags` and `StoredViewState` start at `1`. A loader that finds an older version migrates it; a newer or unreadable version is not overwritten and the user is told the data could not be read. | [[Collection Import]] IMP-054; design rule |
| COLL-072 | MUST | A failed save (e.g. browser storage full) shows an error, keeps the in-memory change visible as "not saved", and does not corrupt the previously stored record. | design rule |
| COLL-073 | SHOULD | Changes made in another tab of the same browser are picked up (reload of stores on change) so two tabs do not overwrite each other silently. | design rule |
| COLL-074 | MUST | The user can delete all local collection, tag and view data from a settings action, after confirmation. | [[Card Data & Images]] #7 (data removal); design rule |

## Data contract
```ts
// shapes only; no implementation
import type { NameKey, PrintingKey, StoredCollection, CollectionStore } from './collection-import'; // SPEC-003
type CardKey = NameKey;            // SPEC-001 cardKey
type PrintingId = string;          // SPEC-001 printingId
type IsoDate = string;             // YYYY-MM-DD
type TagId = string;               // opaque, stable across rename (e.g. 't_01H…')

// ---- Collection (stored by SPEC-003 CollectionStore; shape repeated for reference) ----
// StoredCollection.cards: Record<CardKey, { quantity: number; byPrinting: Record<PrintingKey, number> }>
// SPEC-007 resolves PrintingKey -> Printing via SPEC-001's printing lookup (CARD-036).

// ---- Tags ----
interface Tag {
  id: TagId;
  label: string;                   // as typed, normalized per COLL-021, 1..40 chars
  key: string;                     // case-folded label; unique
  colour: TagColour | null;        // COLL-028
  createdAt: string;               // ISO 8601
}
type TagColour = 'grey' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple';

interface StoredTags {
  schemaVersion: 1;
  updatedAt: string;
  tags: Tag[];                                   // max 200
  assignments: Record<CardKey, TagId[]>;         // max 20 per card; may include dormant cardKeys (COLL-029)
}

interface TagStore {               // MVP adapter: browser storage
  load(): Promise<StoredTags | null>;
  save(t: StoredTags): Promise<void>;
}

// ---- View model (derived, not stored) ----
type BanStatus = 'banned' | 'upcoming' | 'not-banned' | 'unknown';

interface CollectionRow {
  rowId: string;                   // `${cardKey}|${printingId}` or `${cardKey}|_unassigned` or `${cardKey}` (Cards view)
  kind: 'printing' | 'unassigned' | 'card';
  cardKey: CardKey;
  name: string;                    // canonical
  representativePrintingId: PrintingId | null;  // null only for unresolved entries
  sortKey: string;                 // printingSortKey of the representative printing (SPEC-001 v0.2)
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;  // null for unassigned rows in display ("Printing not specified")
  variantKind: string | null;
  rarity: string | null;
  category: string | null; type: string | null; domains: string[] | null;
  stats: { energy: number | null; might: number | null; cost: number | null; power: number | null };
  quantity: number;                // this row's count
  total: number;                   // entry total
  byPrinting?: { printingId: PrintingId; quantity: number }[]; // Cards view expand
  tagIds: TagId[];
  ban: { status: BanStatus; effective?: IsoDate; waveId?: string };
  imageUrl: string | null;         // art.thumbnailUrl
  flags: ('printing-not-found' | 'preview')[];
}

// ---- Query (stored + URL) ----
type SortField =
  'default' | 'name' | 'set' | 'collectorNumber' | 'category' | 'type' | 'domain' |
  'cost' | 'energy' | 'might' | 'power' | 'rarity' | 'variantKind' | 'quantity' | 'banStatus' | 'tag';
type UNKNOWN = '_unknown';

interface CollectionQuery {
  view: 'printings' | 'cards';                     // default 'printings'
  text: string;                                    // COLL-040
  filters: {
    set?: string[]; category?: string[]; type?: string[];
    domain?: (string | '_none' | UNKNOWN)[];
    cost?: (number | UNKNOWN)[]; energy?: (number | UNKNOWN)[];
    might?: (number | UNKNOWN)[]; power?: (number | UNKNOWN)[];
    rarity?: (string | UNKNOWN)[]; variantKind?: (string | '_unassigned' | UNKNOWN)[];
    minQuantity?: number;
  };
  tags: { ids: (TagId | '_untagged')[]; mode: 'any' | 'all' };
  ban: 'all' | 'banned-only' | 'hide-banned';
  sort: { field: SortField; dir: 'asc' | 'desc' };  // default { 'default', 'asc' }
}

interface StoredViewState {
  schemaVersion: 1;
  updatedAt: string;
  query: CollectionQuery;
  savedViews?: { id: string; name: string; query: CollectionQuery }[]; // COLL-064
}

interface CollectionViewStateStore {
  load(): Promise<StoredViewState | null>;
  save(s: StoredViewState): Promise<void>;
}

// ---- Pure query function (COLL-068) ----
interface CollectionQueryInput {
  collection: StoredCollection;
  tags: StoredTags;
  catalogVersion: string;          // SPEC-001
  today: IsoDate;                  // asOf for SPEC-002
  query: CollectionQuery;
}
interface CollectionQueryResult {
  rows: CollectionRow[];           // sorted per COLL-031..035
  unresolved: { cardKey: CardKey; quantity: number; tagIds: TagId[] }[]; // COLL-015
  totals: { distinctCards: number; totalCopies: number; rowsShown: number; rowsTotal: number };
  facets: Record<string, { value: string; count: number }[]>; // option counts, incl. '_unknown'
  notices: string[];               // e.g. ignored URL values, repaired invariant
}
```

## Acceptance criteria
Card names below are real cards from research notes. Collector numbers, variant kinds and set
membership are **illustrative** until the live Riot payload is inspected (H-020). Set order is
assumed to be OGN, OGS, SFD, UNL, VEN, RAD as SPEC-001 v0.2's `printingSortKey` will define.

1. **Default order, numeric and overnumbered** (COLL-011, COLL-031)
   **Given** a collection with printings `SFD-012`, `OGN-100`, `OGN-010`, `OGN-298` (`variant.kind:
   overnumbered`, OGN regular range ends below 298), `OGN-007a` (suffix variant of `OGN-007`),
   `OGN-007`, `RAD-SP1/005` and `OGS-003` **When** My Collection opens with the default query
   **Then** rows are in `printingSortKey` order: `OGN-007`, `OGN-007a`, `OGN-010`, `OGN-100`,
   `OGN-298`, `OGS-003`, `SFD-012`, `RAD-SP1/005` (Showcase position within RAD per `printingSortKey`).
   `OGN-010` comes before `OGN-100` (numeric, not text) and the overnumbered `OGN-298` comes after
   the regular OGN numbers and before any OGS card.
2. **Printings view vs. Cards view** (COLL-011, COLL-013, COLL-003)
   **Given** `Kai'Sa, Survivor` owned as 2 × base printing and 1 × Showcase `RAD-SP1/005`
   **When** the default view is shown **Then** there are two rows (qty 2 and qty 1) in different
   places in set order. **When** the user turns on "group by card" **Then** there is one row with
   quantity 3, positioned at the base printing (lowest `printingSortKey`), and SPEC-005 sees `total = 3`.
3. **Unassigned copies are placed in order** (COLL-012)
   **Given** `3 Lightning Rush` imported from plain text (no printing) and `Lightning Rush`'s
   `defaultPrintingId` is its OGN base printing **When** the list is shown **Then** one row "Lightning
   Rush – Printing not specified ×3" appears where that OGN printing sorts. **And Given** the user
   later also owns 1 × that base printing via a CSV Add **Then** the printing row (×1) appears first
   and the unassigned row (×3) directly after it; `total = 4`.
4. **Tag filter, any vs. all** (COLL-020, COLL-044)
   **Given** tags `Kennen deck` on `Lightning Rush` and `Kennen, Storm of Shuriken`, and `Trade binder`
   on `Lightning Rush` and `Nocturne, Horrifying` **When** the tag filter is `Kennen deck, Trade
   binder` with mode **any** **Then** all three cards show. **When** mode is **all** **Then** only
   `Lightning Rush` shows. **When** the filter is `Untagged` **Then** none of the three shows.
5. **Tags survive a Replace import** (COLL-029, COLL-057)
   **Given** `Nocturne, Horrifying` ×1 tagged `Trade binder` **When** the user commits a Replace
   import that does not contain Nocturne **Then** Nocturne leaves the list, the confirmation said
   "Tags are kept", and the tag manager shows `Trade binder` on 0 owned cards. **When** a later Add
   import contains `1 Nocturne, Horrifying` **Then** the card is listed again with `Trade binder`.
6. **Case-insensitive tags, rename and merge** (COLL-021, COLL-023, COLL-024)
   **Given** a tag `Trade Binder` **When** the user types `trade binder` on `Gust` **Then** the existing
   tag is assigned and no new tag is created. **Given** tags `Trades` (3 cards) and `Trade Binder`
   (2 cards, 1 overlapping) **When** `Trades` is renamed to `TRADE BINDER` **Then** the app offers a
   merge; on confirm, `Trade Binder` is on 4 cards and `Trades` no longer exists.
7. **Tag limits** (COLL-022)
   **Given** a card with 20 tags **When** the user adds a 21st **Then** an inline error appears and the
   card still has 20 tags. **Given** a label of 41 characters **Then** it is rejected.
8. **Ban status as of today** (COLL-008, COLL-045)
   **Given** today is 2026-11-23 and the collection has `Zhonya's Hourglass` ×1, `Emperor's Dais` ×1,
   `Stealthy Pursuer` ×2 and `Lightning Rush` ×3 **When** the list is shown **Then** Zhonya's Hourglass
   and Emperor's Dais show "Banned since 2026-11-23", Stealthy Pursuer shows "Banned since 2026-07-24",
   Lightning Rush shows no ban label. **When** the ban filter is "banned only" **Then** 3 cards show;
   "hide banned" shows only Lightning Rush. **And Given** today is 2026-11-22 **Then** Zhonya's
   Hourglass is not banned and (COLL-009) shows "Banned from 2026-11-23".
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
    **Given** `Kai'Sa, Survivor` 2 × base + 1 × `RAD-SP1/005`, no unassigned **When** in Cards view the
    user presses − **Then** the app asks which printing to decrement. **When** in Printings view the
    user presses − on the `RAD-SP1/005` row **Then** that row disappears and the entry total is 2.
    **When** the user presses − twice more on the base row **Then** the card leaves the collection,
    and its tags remain dormant.
15. **URL round-trip** (COLL-060..063)
    **Given** the user filters set `OGN,SFD`, tag `Kennen deck` (id `t_7`), sort cost descending
    **Then** the URL is `…/collection?set=OGN,SFD&tag=t_7&sort=cost&dir=desc`. **When** that URL is
    opened in a new tab of the same browser **Then** the same rows show in the same order. **When**
    the URL contains `tag=t_999` (unknown) **Then** that value is ignored with a notice and the rest
    applies. **When** the user clears all filters **Then** the URL is `…/collection`.
16. **Remembered view** (COLL-060, COLL-063)
    **Given** the user left My Collection in Cards view sorted by name **When** they return via the nav
    link (no URL params) **Then** Cards view sorted by name is restored and mirrored in the URL.
17. **Catalog update** (COLL-014, COLL-015)
    **Given** a stored entry `Lightning Rush` with `byPrinting {"OGN-007a": 1}` and a new catalog in
    which `OGN-007a` no longer resolves **Then** that copy shows as unassigned with the flag "Printing
    no longer found: OGN-007a" and the stored count is unchanged. **Given** an entry whose `cardKey`
    no longer resolves **Then** it is listed under "Unresolved cards" with its quantity and tags.
18. **Performance** (COLL-065..067)
    **Given** a generated collection of 5,000 rows **When** the user changes the sort from default to
    name **Then** the new order shows without the page freezing (SHOULD within 200 ms), only rows near
    the viewport have rendered DOM, and image requests are made only for those rows.
19. **Storage separation** (COLL-070, COLL-071)
    **Given** stored quantities, tags and view state **When** the browser storage is inspected
    **Then** there are three records (collection, tags, view state), each with `schemaVersion`, and
    none contains any API key or card image data.

## Out of scope
- Importing cards (SPEC-003) and decks (SPEC-006); deck ownership visuals (SPEC-005).
- Prices, trade/wishlist features, condition, language, foil tracking beyond printings.
- Sharing a collection or tags with other people or other browsers (no accounts in the MVP);
  "shareable" URLs work in the same browser only, because the data is local.
- Per-printing tags (open question 2).
- Importing tags from CSV.

## Open questions / BLOCKED
1. **Depends on SPEC-001 v0.2** (in progress): `printingSortKey` (normative), `defaultPrintingId`,
   category enum order, and nullable attributes. Re-check COLL-012, COLL-013, COLL-031, COLL-034 and
   AC 1 against v0.2 when it lands.
2. **Needs RJ:** tags on `cardKey` (chosen) vs. per printing. Per-printing tags would let a user tag
   "the Showcase Kai'Sa" separately, but cannot apply to unassigned copies. Proposed: keep `cardKey`
   for v0.1.
3. **Needs RJ:** default rows per printing (chosen) vs. per card name. Proposed: per printing, with
   the Cards view toggle remembered per browser.
4. **BLOCKED: needs research:** rarity values and their rank order in the Riot API (COLL-034 sorts
   rarity alphabetically until then).
5. **BLOCKED: needs research:** full domain list and API strings (SPEC-001 CARD-025); the domain filter
   lists only values present in data until then.
6. **BLOCKED: needs research:** how variants/overnumbered printings are represented in the Riot API
   (SPEC-001 open question 2). Until then many printings may have `variant.kind: unknown`, which the
   variant filter shows as Unknown; `printingSortKey` still orders them by number.
7. **SPEC-003 alignment:** `byPrinting` is keyed by `PrintingKey` (`OGN-007a`), not `printingId`.
   This spec resolves keys through SPEC-001 (CARD-036). If SPEC-003 v0.2 switches to `printingId`,
   update the data contract.
8. **Time zone of "today"** for ban status follows SPEC-002's open question (LEGAL-R02).

## Changelog
- 0.1 (2026-11-23): first draft (H-031). Printings view by default with Cards view toggle; unassigned
  copies placed at the default printing; tags on `cardKey` in a separate `TagStore`; sort by any
  attribute with `printingSortKey` default and tie-breaker; Unknown bucket; ban status as of today;
  manual quantity edits; URL and per-browser view state. 66 requirements (COLL-001…COLL-074: 51 MUST, 11 SHOULD, 4 MAY).
