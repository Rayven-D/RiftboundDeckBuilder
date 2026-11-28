---
tags: [spec]
id: SPEC-014
version: 0.4.1
status: draft
depends_on: [SPEC-001, SPEC-002, SPEC-003, SPEC-007, SPEC-008, SPEC-015]
consumers: [SPEC-006, SPEC-007, SPEC-016]
research: ["[[Card Data & Images]]", "[[Deck Construction Rules]]", "[[Card Keywords]]", "[[Sets]]", "[[Format Catalog]]"]
decisions: ["[[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]]", "[[ADR-0005 MVP Product Defaults]]"]
ui: ["[[Direction H-706 Search and Deck Editor]]"]
board: H-701, H-706, H-709, H-717, H-719
as_of: 2026-11-28
---
# SPEC-014: Card Search and Filters

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** one card search with filters, shared by the **deck editor** ([[Deck Import]] section P), **Collection** ([[My Collection]] COLL-111) and the **Wishlist** ([[Wishlist]] SPEC-016, SEARCH-062). RJ: search "by card name, rarity, domain, type, cost, might, just about anything", the same search in the editor and Collection (ADR-0010 §2.1, §2.2). Card data is still the **fixture** until the Riot API key (H-020): everything is built and tested on the fixture; a filter group whose field has no values in the data is **hidden** (ADR-0010 §2.3).

**Key requirements**
- SEARCH-001…007: one query model for every host; the host picks the result unit (**card** in the editor, **entry per printing** in Collection), the groups shown, the sort and the tile. Riot data only; `null` is Unknown, never a value (CARD-029). Pure function, never changes data.
- SEARCH-010/011: name search is SPEC-001 CARD-038 unchanged. **Rules text is off by default, behind an "Include rules text" toggle (RJ 2026-11-28, chat, H-706 Q1).**
- SEARCH-020…037: groups Domain, Type, Rarity, Cost (Energy and Power rows, v0.2), Might, Set, Keywords (main row); Champion Unit, Signature, Champion tag, Preview, Variant, Artist, Card tags, Ban status (More); host extras Owned (editor, Wishlist), Your tags (Collection, still deferred). **Location is not a group (v0.4, SEARCH-035): it is the Collection location rail of SPEC-015 COPY-075.**
- SEARCH-021 (**H-706 Q2, decided from research**): Domain has two modes: **Any of** (default, COLL-042) and **Fits these domains** (the Domain Identity rule, [[Deck Construction Rules]] #2, Core 103.2.b, `verified`).
- SEARCH-026 (**v0.2, RJ 2026-11-28, chat: "Cost means the energy and power costs"; v0.3: one group with Energy and Power rows is RJ's decision, "Yes to 717"**): **Cost is one group with an Energy row and a Power row** (Might stays its own group); chips name the row ("Energy 2–4", "Power 1"); OR within a row, AND between rows. Which payload fields they read is still **`unverified`**: [[Card Data & Images]] #9 lists `stats{energy, might, cost, power}` (community mirror) but not what `stats.cost` holds; Energy reads `stats.energy`, Power reads `stats.power`, until H-020 confirms.
- SEARCH-050 (v0.2): Clear all keeps the typed search text, now RJ's decision (H-715, "Yes to all").
- SEARCH-040…043: OR within a group, AND across groups; Unknown and No domain are their own options.
- SEARCH-050…055: removable chips + Clear all, count line, no-match state; desktop menus apply at once, the phone **Filters** sheet applies on **Show n cards**. Domains are text, never symbols or colour alone.
- SEARCH-060…063: the three hosts (v0.4.1: the Wishlist host has a page mode over the user's entries and an add mode over the whole catalog, SEARCH-062); the editor excludes tokens and searches the whole catalog (ADR-0010 §1.3); Collection stays owned-only (**RJ 2026-11-28, chat, H-706 Q3**).
- SEARCH-070…072: Collection keeps the query in the URL (extends COLL-061); the editor keeps it in its own state.

**Waiting on H-020 (live Riot payload):** domains (CARD-025), Champion Unit / Signature / champion tag (CARD-026/027), preview (CARD-006), most category strings (CARD-024), variant kinds (CARD-040), rarity order (SPEC-007 Open question 4), keyword string format ([[Keyword Explanations]]), what `stats.cost`, `stats.energy` and `stats.power` hold (SEARCH-026). Until then those groups are hidden on real data and tested on fixture values.
**Shared types:** `CardSearchQuery`, `CardSearchHost`, `CardSearchInput`, `CardSearchResult`, `FilterGroupId`, `FilterOption`.

## Purpose
ADR-0010 §2 (RJ, 2026-11-28, chat): users search for cards "by card name, rarity, domain, type, cost,
might, just about anything"; the same search is used in the deck editor and in Collection (and the
Wishlist); which fields exist depends on the live Riot data (H-020), so until then it is built and
tested on the fixture cards. This spec is the one contract for matching, filter groups, chips and URL
keys. Hosts add their own result tile and a few host-only groups.

## Definitions
- **Host:** a screen that embeds the search: `deck-editor` (SPEC-006 section P), `collection` (SPEC-007), `wishlist` (H-705, reserved).
- **Result unit:** a **card** (one result per SPEC-001 `PlayableCard`, keyed by `cardKey`) in a card-level host; an **entry** (SPEC-007 COLL-001/011/012/014: one per owned printing, plus unassigned and missing-printing entries) in Collection.
- **Base set:** what a host searches before any filter: deck editor = every catalog card except tokens and SAMPLE-only cards (SEARCH-037); Collection = the user's entries (COLL-100 (a)).
- **Card-level field:** a SPEC-001 `PlayableCard` field: `name`, `text`, `category`, `type`, `domains`, `stats.{cost, might, energy, power}`, `keywords`, `tags`, `isChampionUnit`, `isSignature`, `championTag`, `isPreview`.
- **Printing-level field:** a SPEC-001 `Printing` field: `setCode`, `rarity`, `variant.kind`, `art.artist`.
- **Unknown:** a `null` field, or `category: 'unknown'` / `variant.kind: 'unknown'` (CARD-029).
- **Group:** one filter (e.g. Domain). **Option:** one selectable value in a group.

## Requirements

### A. The search model
| ID | Level | Requirement | Source |
|---|---|---|---|
| SEARCH-001 | MUST | **One search, several hosts.** The deck editor, Collection and (later) the Wishlist use the same query model, matching rules, groups, chips, phone sheet and URL keys defined here. A host decides only: its result unit and base set (SEARCH-002), which groups it shows (SEARCH-060…062), its sorts, its result tile, and where the query is kept (SEARCH-070…072). | ADR-0010 §2.2 (RJ 2026-11-28); [[Direction H-706 Search and Deck Editor]] §2 (draft) |
| SEARCH-002 | MUST | **Result units.** Card-level hosts return one result per `cardKey`; Collection returns one result per entry. A card-level field filter tests the result's card. A printing-level filter tests: in a card-level host, **any** of the card's printings (a card matches when at least one printing matches); in Collection, the entry's own printing; unassigned and missing-printing entries have Unknown printing-level fields and match only the Unknown option, as COLL-043 says. | [[My Collection]] COLL-001, COLL-043; [[Card Data Model]] CARD-012, CARD-015 |
| SEARCH-003 | MUST | **Riot data only.** Every option list comes from the values in the host's base set (no curated list of domains, rarities, keywords, sets or tags), and labels show the value verbatim except where this spec names a label (SEARCH-023, SEARCH-026). | [[ADR-0005 MVP Product Defaults]] #4; [[Card Data Model]] CARD-001, CARD-004 |
| SEARCH-004 | MUST | **A group with no data is hidden.** When every result in the base set has the group's field Unknown (or, for lists, empty), the group is not shown: no button, no menu, no sheet section, no chip, and its URL key is ignored without a notice. It appears without a code change once the data has values. | ADR-0010 §2.3; [[Direction H-706 Search and Deck Editor]] §2.2 |
| SEARCH-005 | MUST | **Unknown is not a value.** A result whose field is Unknown never matches a known option and never matches a "No" option; it matches only the group's **Unknown** option (SEARCH-041). | [[Card Data Model]] CARD-029 |
| SEARCH-006 | MUST | **Pure and read-only.** Evaluation is a pure function `searchCards(input, query)` of the catalog, the host's base set, ban data, ownership data, today and the query (Data contract). It never changes stored data (as COLL-048). | [[My Collection]] COLL-048, COLL-068 |
| SEARCH-007 | MUST | **Fixture first.** Until the Riot API key (H-020) the search runs on the fixture catalog (`data/samples/fixture/`). Tests may give fixture cards invented values for fields the live data leaves Unknown, so every group is testable; no behaviour depends on a fixture-specific value. | ADR-0010 §2.3; [[Current State]] (fixture cards) |

### B. Name and text
| ID | Level | Requirement | Source |
|---|---|---|---|
| SEARCH-010 | MUST | **Name search** is SPEC-001 CARD-038 exactly (tokens of `nameKey(q)` or `looseKey(q)`, optional leading "a" / "the"). The field is always visible, has a clear control, updates the results 150 ms after typing stops, and an empty field is no filter. Label: **"Search cards by name"** in card-level hosts; Collection keeps "Search by name" (COLL-108 (a)). | [[Card Data Model]] CARD-038 (RJ 2026-11-25); [[My Collection]] COLL-040, COLL-108 |
| SEARCH-011 | MUST | **Rules text (RJ 2026-11-28, chat, H-706 Q1).** By default the field searches names only. More holds a toggle **"Include rules text"** (off by default); when on, a result also matches when every token of `nameKey(q)` is a substring of `nameKey(card.text)` (the CARD-038 token rule applied to the verbatim rules text, CARD-004). Keyword names are found with the Keywords group, not through free text. The toggle shows as a chip "Rules text" while on. | RJ 2026-11-28, chat ("Yes to all decks recommendations", ADR-0010 answers part 2 item 6: [[Direction H-706 Search and Deck Editor]] Q1); ADR-0010 §2.1 ("just about anything") |
| SEARCH-012 | SHOULD | `/` focuses the field when focus is not in a text input; Escape in the field clears it. | [[Direction H-706 Search and Deck Editor]] §2.1 (as on Decks) |
| SEARCH-013 | MUST | No relevance ranking: results follow the host's chosen sort (CARD-038 specifies no ranking). | [[Card Data Model]] CARD-038 |

### C. Filter groups
Main row: Domain, Type, Rarity, Cost, Might, Set, Keywords (the attributes RJ named first). Everything else is under **More**. "Status" says whether real data has the field today.

| ID | Level | Requirement | Source |
|---|---|---|---|
| SEARCH-020 | MUST | **Domain** (card-level `domains`), multi-select text options: each domain name in the data, plus **No domain** (`domains: []`, token `_none`) and **Unknown** (`null`). **Mode "Any of" (default):** a card matches when any of its domains is selected; No domain matches `[]`. Status: `domains` is `null` until H-020 (CARD-025), so the group is hidden on real data (SEARCH-004). | [[My Collection]] COLL-042; [[Card Data Model]] CARD-025 |
| SEARCH-021 | MUST | **Domain mode "Fits these domains" (H-706 Q2, decided from research).** A second mode treats the selected domains as a Domain Identity: a card matches when it **fits** it: a card with no domain (`[]`) always fits; a card with one domain fits when that domain is selected; a card with several domains fits only when **all** of them are selected. Unknown (`null`) never fits (SEARCH-005). In this mode the No domain option is not offered (no-domain cards always match). The chip reads "Fits: Fury, Calm". | [[Deck Construction Rules]] #2 (Core 103.2.b, `verified`, as of 2026-11-23); [[Deck Legality]] Definitions (Domain Identity) |
| SEARCH-022 | MAY | **Fits my Legend** (deck editor only): one action that sets Domain to the draft's Legend's domains in Fits mode. Offered only when the draft has a Legend whose `domains` is known and non-empty. | [[Deck Construction Rules]] #2 (the Legend sets the identity) |
| SEARCH-023 | MUST | **Type** (card-level `category`), options in SPEC-001 `CardCategory` order with these labels: Legend, Champion, Unit, Spell, Gear, Rune, Battlefield, Token (Token only in Collection, SEARCH-037). **Champion** matches `category === 'champion'` **or** `isChampionUnit === true` (the SPEC-006 Champion Unit definition), so a unit with `isChampionUnit: true` matches both Unit and Champion. `category: 'unknown'` matches only Unknown. Status: only `legend`, `unit`, `rune`, `battlefield` are mapped (CARD-024); spells, gear, champion and token strings wait on H-020. | [[Card Data Model]] CARD-024, CARD-026; [[Deck Import]] Definitions |
| SEARCH-024 | MAY | **Card type as printed** (card-level `type`, verbatim) under More, options = the distinct strings in the base set. | [[Card Data Model]] CARD-024 |
| SEARCH-025 | MUST | **Rarity** (printing-level `rarity`, verbatim), options sorted alphabetically until a rarity order is researched; `null` → Unknown. | [[My Collection]] COLL-034, Open question 4; [[Card Data Model]] CARD-011 |
| SEARCH-026 | MUST | **Cost and Might** (main row). **RJ 2026-11-28, chat: "Cost means the energy and power costs."** **Cost** is **one group with two number rows, Energy and Power** (RJ, H-717, "Yes to 717"; the alternative of two separate groups is not used). **Might** is its own group, as before. The old "Energy, Power" groups under More are gone (they are the Cost group's rows). Each row shows number options: `0` to `6` and **`7+`** (matches any value ≥ 7) when the base set has a value ≥ 7, otherwise `0` to the largest value present; values match exactly; `null` → Unknown. Multi-select within a row, a contiguous run of selected numbers is one chip, and **the chip names its row**: "Energy 2", "Energy 2–4", "Power 1", "Power 7+", "Might 3". **Rows combine like groups (SEARCH-040): OR within a row, AND between Energy and Power** ("Energy 2" and "Power 1" = cards costing 2 energy and 1 power). A row with no values in the base set is hidden, and the Cost group is hidden when both are (SEARCH-004). **Fields (`unverified`, waits on H-020):** [[Card Data & Images]] #9 (community mirror of the docs, not confirmed on developer.riotgames.com) lists `stats{energy, might, cost, power}` and #10 (official Card Gallery) shows energy, power and might on the card, but **neither says what `stats.cost` holds or which field is the printed power cost**. So: the Energy row reads `stats.energy`, the Power row reads `stats.power`, Might reads `stats.might`, and `stats.cost` gets **no row of its own**; if the live payload shows `stats.cost` is the energy cost under another name (or `stats.energy` is empty), the Energy row reads it instead. **What would confirm it:** the live payload (H-020) compared with the printed cards in the Card Gallery for a few cards (a card costing energy 2 and power 1 shows `energy: 2`, `power: 1`). | ADR-0010 §2.1 (RJ: "cost, might"); RJ 2026-11-28, chat (meaning of Cost); [[Card Data Model]] CARD-028; [[Card Data & Images]] #9, #10 (fields `unverified`); `7+` bucket: [[Direction H-706 Search and Deck Editor]] §2.2 (design rule); one group with two rows: RJ 2026-11-28, chat, H-717, "Yes to 717" (was *default, proposed*; the two-groups alternative is not used) |
| SEARCH-027 | MUST | **Set** (printing-level `setCode`), multi-select, labelled "`<set name>` (`<CODE>`)", listed newest first (`setOrder` descending, CARD-071; whether the API's order is release order is BLOCKED there). | [[Card Data Model]] CARD-020, CARD-071 |
| SEARCH-028 | MUST | **Keywords** (card-level `keywords[]`): a searchable multi-select of the distinct strings in the base set, shown verbatim (not mapped to the glossary, ADR-0008 open). Mode **Has any** (default); **Has all** SHOULD be offered. A card with `keywords: []` matches no keyword option. Status: the keyword string format waits on H-020 ([[Keyword Explanations]]). | [[Card Data Model]] CARD-028; [[Keyword Explanations]]; [[Card Keywords]] |
| SEARCH-029 | MUST | **Under More, card flags:** **Champion Unit** (`isChampionUnit`), **Signature** (`isSignature`), **Preview** (`isPreview`), each Yes / No / Unknown; **Champion tag** (`championTag`, MAY) with the tags in the data. Status: all `null` until H-020 (CARD-006, CARD-026, CARD-027), so hidden on real data. | [[Card Data Model]] CARD-006, CARD-026, CARD-027 |
| SEARCH-030 | MUST | **Variant** (printing-level `variant.kind`) under More, **Collection and Wishlist only** (a deck stores no printing, DECK-096). Options in SPEC-001 `VariantKind` order; `unknown` → Unknown. Status: every printing is `unknown` until CARD-040/041 rules exist. | [[Card Data Model]] CARD-040; [[Deck Import]] DECK-096 |
| SEARCH-031 | MAY | **Artist** (printing-level `art.artist`) under More. | [[Card Data Model]] CARD-011 |
| SEARCH-032 | MAY | **Card tags** (card-level `tags[]` from the API) under More, labelled "Card tags" so it is never confused with the user's own tags (SPEC-007 COLL-019). | [[Card Data Model]] CARD-028; [[Card Data & Images]] #9 |
| SEARCH-033 | MUST | **Ban status** under More: **All** (default), **Hide banned**, **Banned only**, from SPEC-002 `banStatus(cardKey, format, 'global', today)` where `format` is the draft's format in the deck editor and `standard` elsewhere. Banned only = `banned` today; Hide banned keeps `not-banned`, `upcoming` and unknown (as COLL-045). While ban data is not loaded the group is hidden and the host shows its own ban notice. | [[My Collection]] COLL-045; [[Deck Legality]] LEGAL-B10 |
| SEARCH-034 | MUST | **Owned** (host extra: deck editor, Wishlist) under More: **All** (default), **Owned**, **Not owned**. Owned = the user's SPEC-003 `quantity` for the `cardKey` ≥ 1 (any printing; copies tagged "exclude from decks" included). | ADR-0010 §1.3 (any card, owned or not); [[Direction H-706 Search and Deck Editor]] §2.2 |
| SEARCH-035 | MUST | **Location is the Collection location rail itself, not a filter group (v0.4, H-719).** The rail of [[Physical Copies and Folders]] SPEC-015 COPY-075 (SPEC-007 COLL-112: Master collection, Not in a folder, In decks, then each folder) is what narrows the Collection by place; there is **no Location group** in the query model (`CardSearchQuery` has no location part), no Location chip and no Location row in the filters menu or the phone Filters sheet. The rail's URL key (`in=none`, `in=decks`, `in=<folderId>`, COLL-112) sits next to the SEARCH-070 keys; the search, the filter groups and the sorts then apply **inside the chosen place** (COLL-112), and Clear all (SEARCH-050) does not change the place. The editor and the Wishlist have no Location. | ADR-0010 §3; SPEC-015 COPY-075 (Open question 18 there: Location filter = the rail); [[My Collection]] COLL-112 |
| SEARCH-036 | MUST | **Your tags** (host extra: Collection) is SPEC-007 COLL-044 and stays **deferred** with the tag UI (SPEC-007 Open question 12). When it returns it sits under More with this spec's chip rules. | [[My Collection]] COLL-044 |
| SEARCH-037 | MUST | **Tokens and SAMPLE.** The deck editor's base set leaves out `category: 'token'` cards (they can't be in a deck, DECK-026) and cards that exist only as SAMPLE printings (DECK-106; no effect until SPEC-001 CARD-044 exists). Collection shows what the user owns (COLL-100, COLL-110). | [[Deck Import]] DECK-026, DECK-106; [[My Collection]] COLL-110 |

### D. Combining and options
| ID | Level | Requirement | Source |
|---|---|---|---|
| SEARCH-040 | MUST | **OR within a group, AND across groups and with the name field** (as COLL-041). Keywords in Has all mode is the one exception (AND within the group). | [[My Collection]] COLL-041 |
| SEARCH-041 | MUST | **Unknown option** (token `_unknown`) is listed last in a group, and only when at least one result in the base set has that field Unknown. **No domain** (`_none`) is distinct from Unknown. | [[My Collection]] COLL-035, COLL-041, COLL-042 |
| SEARCH-042 | SHOULD | Each option shows how many results in the base set have that value (the user's own counts; no meta data, ADR-0003). | [[My Collection]] COLL-041; [[ADR-0003 Tournament Results Only]] |
| SEARCH-043 | MUST | Options list only values present in the base set; a value that disappears from the data (e.g. after an import) drops out of the query with the notice "1 filter value not found and was ignored" (COLL-062). | [[My Collection]] COLL-062 |

### E. Display
| ID | Level | Requirement | Source |
|---|---|---|---|
| SEARCH-050 | MUST | **Chips.** Every active option shows as a removable chip ("Fury", "Fits: Fury, Calm", "Unit", "Energy 2", "Energy 2–4", "Power 1", "Not owned", "Rules text", "Unknown domain"). Each chip is a button with accessible name "Remove filter: `<chip text>`". **Clear all** removes every filter and mode back to the defaults and keeps the name text (the field has its own clear). **RJ's decision (RJ 2026-11-28, chat, H-715, "Yes to all"; it was the spec-writer's reading of the draft's "Clear all restores the default").** | [[My Collection]] COLL-047; [[Direction H-706 Search and Deck Editor]] §2.2 |
| SEARCH-051 | MUST | **Count line** (`role="status"`, polite): card-level hosts "Showing `<x>` of `<y>` cards" ("`<y>` cards" with no query); Collection keeps COLL-010. | [[My Collection]] COLL-010; [[Direction H-706 Search and Deck Editor]] §2.1 |
| SEARCH-052 | MUST | **Nothing matches** with at least one filter: "No cards match these filters." with **Clear all**, chips still shown above it. With only name text: the host's own message (Collection COLL-108 (e); deck editor "No cards match “`<q>`”." with **Clear search**). | [[My Collection]] COLL-047, COLL-108 |
| SEARCH-053 | MUST | **Desktop and phone.** Above 40rem each group is a button opening a menu of checkbox rows (number rows for stats); changes apply at once. At 40rem and below one **Filters** button (accessible name "Filters, `<n>` active" when n > 0) opens a full-height sheet with every shown group; changes apply only on its **Show `<n>` cards** button, whose number updates live ("No cards match", `aria-disabled`, at 0); closing the sheet by Close, Back or swipe without Show keeps the query as it was. The sheet's look and gestures are the H-706 brief's. **Wording here is the ui-engineer's draft, not RJ's.** | [[Direction H-706 Search and Deck Editor]] §2.1, §2.2 (draft); [[Brief H-698 Card Dialog Mobile]] (sheet shell) |
| SEARCH-054 | MUST | **Domains as text.** Domain options and chips are text labels; no domain symbols, and colour is never the only way a value is shown. | [[Design Direction]] ("Not copied on purpose"); WCAG 1.4.1 |
| SEARCH-055 | MUST | Every control is at least 44 px on touch; the field and the group buttons are reachable by keyboard in reading order; only the count line is a live region (no announcement per tap). | [[Direction H-706 Search and Deck Editor]] §8 |

### F. Hosts
| ID | Level | Requirement | Source |
|---|---|---|---|
| SEARCH-060 | MUST | **Deck editor host.** Card-level; base set = the whole catalog minus tokens and SAMPLE-only cards (SEARCH-037), owned or not (ADR-0010 §1.3); groups: Domain (with SEARCH-022 MAY), Type, Rarity, Cost, Might, Set, Keywords; More: Energy, Power, Champion Unit, Signature, Champion tag, Preview, Ban status, Owned, Include rules text (SEARCH-011), and the MAY groups; **no** Variant or Artist. Sorts: **Name** (default, COLL-034 name comparison, ascending) and **Set & number** (`printingSortKey` of the card's `defaultPrintingId`, CARD-070). Every result is shown in **full colour** (ADR-0010 §1.4); the tile is SPEC-006 DECK-125. | ADR-0010 §1.3, §1.4; [[Deck Import]] DECK-125 |
| SEARCH-061 | MUST | **Collection host.** Entry-level; base set = the user's entries only. **Owned-only (RJ 2026-11-28, chat, H-706 Q3):** Collection never lists unowned catalog cards (as COLL-100 (a)); browsing the catalog is the editor's and the Wishlist's. Groups: as SEARCH-060 plus Variant (SEARCH-030) and Artist (MAY), **without** Owned; Your tags as SEARCH-036; Location is the rail, not a group (SEARCH-035). Sorts stay COLL-108 (b). The tile stays COLL-101. | [[My Collection]] COLL-100, COLL-108, COLL-111; RJ 2026-11-28, chat (ADR-0010 answers part 2 item 6: [[Direction H-706 Search and Deck Editor]] Q3) |
| SEARCH-062 | MUST | **Wishlist host** (v0.4.1; the host settings are [[Wishlist]] SPEC-016 WISH-020 and WISH-021, which own them; this row says which host mode uses which query model). Two modes. **(a) Page search:** entry-level over the user's wishlist entries only (WISH-020); the groups are the shared groups plus **Owned** (SEARCH-034, the user's `quantity` ≥ 1, any printing) and **Variant** (SEARCH-030, the entry's `printingId`; an Any entry matches on its default printing); **Ban status** (SEARCH-033) uses `standard`, as elsewhere; the query lives in the URL with the same keys as Collection (SEARCH-070). **(b) Add mode (WISH-021):** card-level over the **whole catalog**, owned or not, **tokens included, SAMPLE-only cards never** (so the base set differs from the editor's SEARCH-037 only by keeping tokens); results show the default printing's art **in full colour**; the Owned group is offered; the query is kept in the add dialog's own state, not the URL (as SEARCH-072). The result tile, the Add button and the "Want `<n>`" badge are WISH-021 and WISH-005. | [[Wishlist]] WISH-020, WISH-021; ADR-0010 §2.2, §4.2 |
| SEARCH-063 | MUST | A host that hides a group also ignores its URL key or stored value without a notice. | design rule |

### G. Where the query is kept
| ID | Level | Requirement | Source |
|---|---|---|---|
| SEARCH-070 | MUST | **Collection URL keys** (extends COLL-061; defaults omitted; multi-values comma-separated): `q`, `sort`, `domain` (names, `_none`, `_unknown`), `domainMode` (`fits`; Any of is the default), `cat` (category values or `_unknown`), `type` (verbatim, MAY group), `rarity`, `cost`, `might`, `energy`, `power` (integers, `7plus`, `_unknown`), `set` (codes), `kw`, `kwMode` (`all`), `champ`, `sig`, `preview` (`yes`, `no`, `_unknown`), `ctag`, `variant`, `artist`, `ctags`, `ban` (`hide`, `only`), `rules` (`1`). A value not in the data is dropped with COLL-062's notice; a key of a hidden group is ignored silently (SEARCH-063). | [[My Collection]] COLL-061, COLL-062, COLL-063 |
| SEARCH-071 | MUST | Collection remembers the query per browser (COLL-060, a device preference, never synced) and restores it; URL wins on load (COLL-063). | [[My Collection]] COLL-060, COLL-063 |
| SEARCH-072 | MUST | **Deck editor:** the query lives in the editor's own state, not the URL and not stored; it starts empty each time the editor opens and is kept while the editor stays open (including while the phone Add cards sheet closes and reopens). | [[Direction H-706 Search and Deck Editor]] §2.2 |

### H. Performance
| ID | Level | Requirement | Source |
|---|---|---|---|
| SEARCH-080 | SHOULD | With 5,000 printings (COLL-065) on RJ's PC, results update within 150 ms after the last keystroke or tap. | [[My Collection]] COLL-065, COLL-066 |
| SEARCH-081 | MUST | Results scroll with no pagination and lazy images (COLL-093, COLL-067); a query change returns to the top. | [[My Collection]] COLL-093 |

## Data contract
```ts
// shapes only; no implementation
import type { PlayableCard, Printing, CardCategory, VariantKind, CardSet } from './card-data-model'; // SPEC-001
import type { FormatId, BanStatus } from './deck-legality';                                          // SPEC-002

type CardSearchHost = 'deck-editor' | 'collection' | 'wishlist';
type Tri = 'yes' | 'no' | '_unknown';
type StatValue = number | '7plus' | '_unknown';

type FilterGroupId =
  | 'domain' | 'cat' | 'type' | 'rarity' | 'cost' | 'might' | 'energy' | 'power' | 'set' | 'kw'
  | 'champ' | 'sig' | 'ctag' | 'preview' | 'variant' | 'artist' | 'ctags' | 'ban' | 'owned'
  | 'location' | 'tag';   // 'location' (H-703/H-707) and 'tag' (COLL-044) reserved

interface CardSearchQuery {
  text: string;                         // SEARCH-010
  includeRulesText: boolean;            // SEARCH-011, default false (RJ 2026-11-28, H-706 Q1)
  domain: { values: string[]; mode: 'any' | 'fits' }; // values may hold '_none', '_unknown'
  cat: (CardCategory | '_unknown')[];
  type: string[];
  rarity: string[];                     // '_unknown' allowed
  cost: StatValue[]; might: StatValue[]; energy: StatValue[]; power: StatValue[];
  set: string[];
  kw: { values: string[]; mode: 'any' | 'all' };
  champ: Tri[]; sig: Tri[]; preview: Tri[];
  ctag: string[]; variant: (VariantKind | '_unknown')[]; artist: string[]; ctags: string[];
  ban: 'all' | 'hide' | 'only';
  owned: 'all' | 'owned' | 'not-owned'; // deck editor, wishlist only
  sort: string;                         // host-defined ids (SEARCH-060, COLL-108)
}

interface CardSearchInput {
  host: CardSearchHost;
  cards: PlayableCard[]; printings: Printing[]; sets: CardSet[]; catalogVersion: string;
  entries?: unknown[];                  // Collection: SPEC-007 CollectionEntry[]
  ownedQuantity: (cardKey: string) => number;            // SPEC-003 quantity
  banStatus: ((cardKey: string) => BanStatus) | null;    // null = ban data not loaded
  format: FormatId;                     // deck editor: the draft's format; else 'standard'
  legendDomains?: string[] | null;      // SEARCH-022
  today: string;                        // 'YYYY-MM-DD'
}

interface FilterOption { value: string; label: string; count: number }
interface CardSearchResult {
  results: string[];                    // cardKeys (card-level) or entry ids (Collection), in sort order
  total: number;                        // size of the base set
  groups: { id: FilterGroupId; options: FilterOption[] }[]; // only groups with data (SEARCH-004)
  droppedValues: number;                // SEARCH-043 notice
}
```

## Acceptance criteria
Card names are fixture or research names; **attribute values are invented test values** (SEARCH-007), since the live data leaves most of them Unknown.

1. **Name search is CARD-038** (SEARCH-010) **Given** the catalog holds `The Dreaming Tree` and `Lightning Rush` **When** the user types `dreaming` and, separately, `the` **Then** `The Dreaming Tree` is in the results both times; **When** they type `rush light` **Then** `Lightning Rush` matches (token order free); **When** the field is empty **Then** every base-set card is shown.
2. **Domain, Any of vs Fits** (SEARCH-020, SEARCH-021, SEARCH-005) **Given** fixture cards A `[Fury]`, B `[Fury, Calm]`, C `[]`, D `null`, E `[Mind]` **When** Domain = Fury and Calm in Any of mode **Then** A and B match. **When** the mode is Fits **Then** A, B and C match and the chip reads "Fits: Fury, Calm". **When** Fits with Fury only **Then** A and C match (B also needs Calm). **When** Unknown is selected **Then** D matches; D never matches any other option, in either mode. **When** No domain is selected in Any of **Then** C matches; in Fits mode No domain is not offered.
3. **Energy numbers and 7+** (SEARCH-026) **Given** cards with `stats.energy` 0, 2, 2, 3, 4, 9 and one `null` **When** the Energy row of the Cost group shows **Then** it offers 0 to 6, 7+ and Unknown; **When** 2 is selected **Then** 2 cards match; **When** 2, 3 and 4 are selected **Then** 4 cards match and one chip reads "Energy 2–4"; **When** 7+ **Then** the 9-energy card matches. **Given** instead a largest value of 5 **Then** the row is 0 to 5 with no 7+.
3a. **Energy and Power together** (SEARCH-026) **Given** cards A (`energy` 2, `power` 1), B (`energy` 2, `power` 0), C (`energy` 3, `power` 1) **When** Energy 2 is selected **Then** A and B match; **When** Power 1 is added **Then** only A matches, and the chips are "Energy 2" and "Power 1"; **When** "Remove filter: Energy 2" is pressed **Then** A and C match. **Given** no card has a `power` value **Then** the Power row is hidden and the Cost group shows only Energy.
4. **Combining** (SEARCH-040) **Given** Domain = Fury (Any of), Type = Unit and Spell, Cost = 2 **Then** a result must be Fury **and** (Unit **or** Spell) **and** cost 2; **When** the user also types `bolt` **Then** its name must match too.
5. **Printing-level filters per host** (SEARCH-002, SEARCH-025, SEARCH-027) **Given** `Lightning Rush` has an `OGN` printing (rarity `Common`) and an `SFD` printing (rarity `Rare`), and the user owns 2 × OGN and 1 × SFD **When** the deck editor filters Set = SFD **Then** `Lightning Rush` is one result. **When** Collection filters Rarity = Rare **Then** only the SFD entry tile shows ("Showing 1 of …"); an unassigned `Lightning Rush` entry would match only Rarity = Unknown.
6. **Groups without data are hidden** (SEARCH-004, SEARCH-063) **Given** a catalog where every card has `domains: null`, `isChampionUnit: null` and `stats.might: null` **Then** there is no Domain, Champion Unit or Might button, menu, sheet section or chip; **When** `/collection?domain=Fury&might=3` opens **Then** the list is unfiltered and no notice shows.
7. **Type: Champion matches Champion Units** (SEARCH-023) **Given** card F `category: 'unit'`, `isChampionUnit: true` and card G `category: 'unit'`, `isChampionUnit: null` **When** Type = Champion **Then** F matches, G does not; **When** Type = Unit **Then** both match.
8. **Ban status** (SEARCH-033) **Given** today 2026-11-23, `Nocturne, Horrifying` banned since Nov 23, 2026 in Standard, a card with an upcoming ban and a card with ban status unknown **When** Banned only **Then** only Nocturne; **When** Hide banned **Then** the upcoming and the unknown cards stay. **Given** ban data didn't load **Then** the group is hidden.
9. **Owned in the editor** (SEARCH-034, SEARCH-060) **Given** the user owns 3 `Lightning Rush` (2 tagged "exclude from decks") and 0 `Gust` **When** Owned **Then** `Lightning Rush` shows and `Gust` doesn't; **When** Not owned **Then** the reverse. Collection offers no Owned group.
10. **Rules text toggle** (SEARCH-011; RJ 2026-11-28) **Given** a card named `Ion Arc` whose text contains "deal 2 damage" **When** the user types `damage` **Then** it doesn't match; **When** they turn on "Include rules text" **Then** it matches and a "Rules text" chip shows.
11. **Phone sheet applies on Show** (SEARCH-053) **Given** a 390 px wide screen **When** the user opens Filters, taps Fury and Unit **Then** the grid behind is unchanged and the button reads "Show 12 cards"; **When** they press it **Then** the grid shows 12 cards and two chips. **When** they reopen, tap Calm and close by Back **Then** the query is still Fury + Unit. **When** a selection leaves 0 **Then** the button reads "No cards match" and is `aria-disabled`.
12. **Chips and Clear all** (SEARCH-050, SEARCH-052) **Given** text `rush`, Fury and Energy 2 with no match **Then** "No cards match these filters." shows with Clear all and the chips "Fury" and "Energy 2" above it; **When** the user presses "Remove filter: Energy 2" **Then** only that filter goes; **When** Clear all **Then** every filter is gone and the field still reads `rush`.
13. **Collection URL** (SEARCH-070, SEARCH-071) **Given** Collection with Domain Fury and Calm in Fits mode, Cost 2 and 7+, Ban Hide banned **Then** the URL is `/collection?domain=Fury,Calm&domainMode=fits&cost=2,7plus&ban=hide`; **When** it is reloaded **Then** the same query shows; **When** `?set=ZZZ` opens and no entry has set ZZZ **Then** "1 filter value not found and was ignored".
14. **Editor base set** (SEARCH-037, SEARCH-060, SEARCH-072) **Given** the fixture has a `category: 'token'` card **When** the editor search runs with no query **Then** the token is not a result and the count line reads "`<n>` cards" with n = the catalog's non-token cards; **When** the editor closes and opens again **Then** the query is empty.

## Out of scope
- Saved searches, search history, relevance ranking, fuzzy name matching (SPEC-003 IMP-027, not built, H-272).
- Prices and any meta data (play rate, popularity; ADR-0003).
- A Location filter group (the location rail is SPEC-015 COPY-075 / SPEC-007 COLL-112, SEARCH-035) (the Wishlist host is SEARCH-062, [[Wishlist]] WISH-020, WISH-021).
- Result tiles: each host's spec (SPEC-006 DECK-125, SPEC-007 COLL-101).

## Open questions / BLOCKED
1. ~~Rules text~~ and ~~Collection owned-only~~: **resolved by RJ 2026-11-28, chat** (H-706 Q1, Q3 accepted; ADR-0010 answers part 2 item 6): SEARCH-011, SEARCH-061.
2. **Meaning resolved, fields `unverified` (H-020):** RJ 2026-11-28, chat: "Cost means the energy and power costs" (SEARCH-026, one Cost group with Energy and Power rows: RJ's decision since v0.3, H-717 "Yes to 717"). Still unknown until the live payload: what `stats.cost` holds and that `stats.energy` and `stats.power` are the printed energy and power costs ([[Card Data & Images]] #9 names the fields only).
3. **BLOCKED: needs research (H-020):** domains, Champion Unit, Signature, champion tag, preview, category strings, variant kinds, keyword strings, rarity order, set order. Groups stay hidden on real data until then (SEARCH-004).
4. **Resolved (RJ 2026-11-28, chat, H-715, "Yes to all"):** Clear all keeps the name text (SEARCH-050).

## Changelog
- 0.4.1 (2026-11-28, H-719; [[Wishlist]] SPEC-016 0.1; text only, no change to the query model): SEARCH-062 now points to WISH-020 and WISH-021: page search is entry-level over the user's entries (Owned and Variant groups, ban status by Standard, URL keys as Collection), and add mode is card-level over the whole catalog (tokens included, SAMPLE never, full colour, Owned group, state not in the URL). The summary's "later the Wishlist (H-705)" and the Out of scope "Wishlist host (H-705)" lines follow; `consumers` now names SPEC-016. Builder: none beyond SPEC-016's own items.
- 0.4 (2026-11-28, H-719; SPEC-015 COPY-075 and Open question 18 there; text only for the query model, which never had a Location part): SEARCH-035 now says Location is the Collection location rail itself, not a separate filter group (no group, chip or menu row; the rail's `in` URL key sits beside the SEARCH-070 keys and filters apply inside the place); the summary, SEARCH-061 and Out of scope lines follow; depends on SPEC-015. Builder: none (the group was never built).
- 0.3 (2026-11-28, H-717; RJ 2026-11-28, chat, "Yes to 717"): SEARCH-026's one Cost group with Energy and Power rows is RJ's decision (was *default, proposed*); no behaviour change. The payload fields stay `unverified` (H-020). The deck stats of SPEC-005 OWN-129…138 read `stats.energy` and `stats.might` under the same `unverified` mapping.
- 0.2 (2026-11-28, H-716 pass; RJ 2026-11-28, chat): SEARCH-026 rewritten: "Cost means the energy and power costs" (RJ), so Cost is one group with Energy and Power rows (*default, proposed*), the More-row Energy and Power groups removed, chips name the row, AND between rows; the payload fields stay `unverified` (H-020; [[Card Data & Images]] #9 names `energy`, `power`, `cost` but not their meaning); SEARCH-050 Clear all keeps the text is RJ's decision (H-715, "Yes to all"); ACs 3, 12 updated, 3a new; Open questions 2, 4. Consumers' pins: none changed (SPEC-006, SPEC-007 do not name the group).
- 0.1 (2026-11-28, H-701): first draft from ADR-0010 §1.3, §1.4, §2 (RJ 2026-11-28) and [[Direction H-706 Search and Deck Editor]] (draft). H-706 Q2 decided from [[Deck Construction Rules]] #2 (SEARCH-021); Q1 and Q3 are RJ's answers (2026-11-28, chat, "Yes to all decks recommendations", closes H-709 for them).
