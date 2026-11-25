---
tags: [spec]
id: SPEC-001
version: 0.4
status: review
depends_on: []
research: ["[[Card Data & Images]]", "[[Sets]]", "[[Deck Construction Rules]]", "[[Collection Import Formats]]", "[[Riot Developer Rules]]", "[[Riot App Application]]", "[[Ban List]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
as_of: 2026-11-24
---
# SPEC-001: Card Data Model

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** how Riot API cards become printings and playable cards in `data/cards.json`; the source of truth for card shapes in every other spec.

**Key requirements**
- CARD-001/002: the Riot API is the only card source; the API key stays server-side.
- CARD-010/012: one `Printing` per Riot id; printings grouped into one `PlayableCard` per canonical name.
- CARD-013: copy limits and all matching use `cardKey` only, never printing, set or variant.
- CARD-016 (MUST): every card has a `defaultPrintingId` (first base printing, else first by `printingSortKey`).
- CARD-024: `type` verbatim; `category` enum from a versioned mapping (`unknown` when unmapped).
- CARD-029: `null` means unknown, never false or empty; consumers treat it as "not evaluated".
- CARD-030: `nameKey()` normalization; CARD-036/037: set + collector-number lookup and `collectorKey()`.
- CARD-068: `catalogVersion` = `schemaVersion+lastUpdated`, echoed by other specs' results.
- CARD-070/071: `printingSortKey` default order (API set order, overnumbered after the regular range).
- **0.4 (H-165, `review`, RJ decision 2026-11-25):** a leading "a" or "the" is optional in name matching and in search, and the full name with the article also matches, with no alias table. CARD-034 (MUST) a name lookup with no exact `nameKey` match retries with `looseKey` (leading `a ` / `the ` dropped on both sides): "Dreaming Tree" finds "The Dreaming Tree" ([[Ban List]] #10, name still unchecked against the Riot payload); two cards sharing a loose key (e.g. `A Pit`, `The Pit`) give `ambiguous`. SPEC-003 import (IMP-025) and SPEC-006 use that lookup. CARD-038 (MUST) name search: "the" and "dreaming" both find The Dreaming Tree, and a query with the article also finds a card without it. CARD-023a the `ARC` set code (Arcane Box Set, not a Standard set; [[Sets]] #6, `unverified`); CARD-023 promo codes OPP, JDG, PR, legal by name via SPEC-002 LEGAL-C07 ([[Deck Construction Rules]] #17); CARD-044 SAMPLE marker reserved (RJ, H-193: SAMPLE printings are left out entirely; the per-spec rules are H-197), field name and source BLOCKED (H-020). Name check against the Riot payload still pending H-020.

**Shared types:** `CardSnapshot` (the file) · `CardSet` (code, `setOrder`, `releaseStatus`) · `PlayableCard` (one card name, gameplay fields) · `Printing` (one physical version) · `CardCategory`, `VariantKind` (enums) · `CardLookup` (lookup result) · `cardKey` / `catalogVersion` (card key, snapshot id).
**Consumers:** [[Deck Legality]], [[Collection Import]], [[Tournament Deck Catalog]], [[Your Decks Ownership View]], [[Deck Import]], [[My Collection]].
**BLOCKED (needs research, mostly the live payload):**
- API schema unverified (field names, `id` format, `faction`).
- Variant representation: CARD-036 suffix mapping, CARD-040/041 rules.
- Champion/Signature/champion-tag fields (CARD-026/027); full type and domain lists (CARD-024/025).
- Preview flags for cards and sets (CARD-006/008); whether the API returns promo sets and `ARC` (CARD-023, CARD-023a); the exact API name of "The Dreaming Tree" (CARD-034; the rule works with either spelling); how the API marks SAMPLE printings (CARD-044); set order (CARD-071).
- External IDs (CARD-050, MAY): needs Riot's answer via H-011.

## Purpose
Define how Riftbound cards are represented in the app: the **printing** (one physical card version
with an official ID, set, collector number and variant) and the **playable card** (all printings that
share a card **name**, which is the key for copy limits and for matching collections to decklists).
Define the ingestion contract from the Riot API (`riftbound-content-v1`) into a versioned snapshot at
`data/cards.json`, the name-normalization rules used for matching, and how the model absorbs new sets,
new card properties, and a variant representation that is not yet verified.

This spec is the contract for H-008 (pipeline) and the **source of truth for card shapes** used by
SPEC-002 (legality), SPEC-003 (collection import), SPEC-004 (tournament catalog), SPEC-005 (Decks:
ownership view), SPEC-006 (deck import) and SPEC-007 (Collection, which uses `printingSortKey` as
its default order). Per [[ADR-0005 MVP Product Defaults]] it holds **Riot data only**: no hand-curated
alias, release-date or external-ID tables.

## Definitions
- **Riot API**: `GET /riftbound/content/v1/contents?locale=en`, regional routing AMERICAS / ASIA / EUROPE,
  returning `{game, version, lastUpdated, sets[{id, name, cards[]}]}` ([[Card Data & Images]] #9;
  schema from a community mirror, `unverified`).
- **Printing**: one entry in the Riot API `cards[]` array, identified by the Riot card `id`. Base,
  alt-art, overnumbered, signature and Showcase versions are separate printings
  (the official Card Gallery lists them as separate entries: [[Card Data & Images]] #10).
- **Playable card**: the group of all printings with the same **canonical name**. Deck rules count
  copies per name, so printings that share a name share the copy limit ([[Deck Construction Rules]] #5).
- **Canonical name**: the `name` string exactly as the Riot API returns it (official English text,
  [[Card Data & Images]] #3).
- **Name key**: the normalized form of a name used for lookups and matching (see CARD-030…CARD-033).
- **Loose key** (`looseKey`): `nameKey` with one leading article token (`a ` or `the `) removed, so the article is optional when matching (CARD-034). It is never a `cardKey`.
- **`cardKey`**: the key of a playable card, `cardKey = nameKey(canonical name)`. It is the only
  identifier for playable cards; there is no `cardId`. All specs reference cards by `cardKey`.
- **Unknown (`null`)**: a gameplay attribute whose API source is not verified is stored as `null`.
  `null` means "not known", never "false" or "none" (CARD-029).
- **Category**: a normalized lower-case deck-building role derived from the verbatim API `type`
  (CARD-024). Rules in SPEC-002 use `category`, not `type`.
- **Collector key**: the normalized form of a collector number used for set + number lookups (CARD-037).
- **`catalogVersion`**: the identifier of one snapshot's card data (CARD-068).
- **`printingSortKey`**: the normative default order of printings (set order, then collector number;
  CARD-070).
- **Variant**: what distinguishes printings of the same card within or across sets (e.g. Showcase,
  alt-art, overnumbered, signature). Its representation in the Riot API is **unknown**. Overnumbered is
  expressed only as `variant.kind === 'overnumbered'`; there is no separate `overnumbered` field.
- **Snapshot**: the JSON file written by the ingestion job from one Riot API response.
- **Public code**: the code printed / shown in the Card Gallery, e.g. `OGN-001`, `RAD-SP1/005`
  ([[Card Data & Images]] #10, [[Sets]]).

## Requirements

### Source, secrets, compliance
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-001 | MUST | All card data and card images used by the app come only from the Riot API `riftbound-content-v1`. No Riftcodex, Card Gallery scraping, or other third-party card source feeds `data/cards.json`. | [[Card Data & Images]] #3; [[Riot Developer Rules]] #7 |
| CARD-002 | MUST | The Riot API is called only by the server-side ingestion job. `RIOT_API_KEY` is read from the server environment (`.env`), sent only as a request header, and never appears in `data/`, logs, error messages, the API responses of `services/`, or the Angular bundle. | [[Riot Developer Rules]] #2; [[Riot App Application]] |
| CARD-003 | MUST | The Angular app never calls the Riot API. It reads card data only from our own services, which serve it from the snapshot via a `CardRepository` interface (host-neutral, local JSON adapter for now). | [[Riot Developer Rules]] #2; [[ADR-0001 Tech Stack]] |
| CARD-004 | MUST | Card text fields hold the official English text from the API (`locale=en`) unchanged. The app does not rewrite, translate or paraphrase card text. | [[Card Data & Images]] #3 |
| CARD-005 | MUST | Card images are referenced by the Riot API URLs (`art.fullURL`, `art.thumbnailURL`). The pipeline does not download, re-host or transform image files until Riot confirms caching is allowed. | [[Card Data & Images]] #7 and Recommendation |
| CARD-006 | MUST | Cards that Riot marks as previewed / unreleased are flagged (`isPreview: boolean \| null`) so the UI can label them; `null` = unknown (CARD-029). BLOCKED: needs research (how the API marks previewed cards). | [[Card Data & Images]] #3; [[Riot App Application]] |
| CARD-007 | MUST | The snapshot can be deleted and rebuilt entirely from the API (no hand-edited card data mixed into it), so all Riot game information can be removed if the API agreement ends. | [[Card Data & Images]] #7 |
| CARD-008 | MUST | Each `CardSet` has `releaseStatus: 'released' \| 'preview' \| null`, derived only from the Riot API (a set is `preview` when the API marks it or all its printings as previewed). `null` = unknown. SPEC-002 uses it for set legality per ADR-0005. No curated release-date or status table exists. BLOCKED: needs research (same source as CARD-006). | [[ADR-0005 MVP Product Defaults]] #4; [[Card Data & Images]] #3 |

### Printings and playable cards
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-010 | MUST | Each Riot API card becomes exactly one `Printing`, keyed by the Riot `id` (`printingId`). `printingId` is unique across the snapshot; a duplicate fails ingestion. | [[Card Data & Images]] #9 |
| CARD-011 | MUST | Each printing stores `setCode` (upper case), `collectorNumber` (as a **string**, verbatim, because codes like `SP1/005` and overnumbered numbers exist), the raw `variant` info (CARD-040), rarity, artist and image URLs. | [[Card Data & Images]] #9, #10; [[Sets]]; [[Deck Construction Rules]] #13 |
| CARD-012 | MUST | Printings are grouped into one `PlayableCard` per **canonical name**. `PlayableCard.cardKey` is the name key of that name. Every printing references its card via `cardKey`. | [[Deck Construction Rules]] #5 |
| CARD-013 | MUST | Copy-limit counting and collection/decklist matching use `cardKey` only, never `printingId`, set or variant. Owning `N` copies across any printings of a name counts as owning `N` of that card. | [[Deck Construction Rules]] #5; [[Collection Import Formats]] (Conflicts) |
| CARD-014 | MUST | Two names that differ only by subtitle are different cards (e.g. `Riven, The Exile` and `Riven, Broken Blade`). | [[Deck Construction Rules]] #5 |
| CARD-015 | MUST | Gameplay fields (type, category, domains, champion/signature attributes, stats, keywords, tags, text) live on `PlayableCard`. If printings of one name disagree on a gameplay field, ingestion keeps the values from the printing whose set is latest in set order (CARD-071) and reports a `field-conflict` warning listing the printings. A non-null value never loses to `null`. | [[Card Data & Images]] #4 (timely support for changes); [[Sets]] #3 (templating changes) |
| CARD-016 | MUST | Each `PlayableCard` names a `defaultPrintingId` for display: the first printing with `variant.kind === 'base'` in `printingSortKey` order (CARD-070); if no printing is known to be base, the first printing in `printingSortKey` order. Every card has at least one printing (CARD-012), so the value always exists. *Rationale:* MUST because SPEC-007 COLL-012 and COLL-014 (both MUST) position and illustrate unassigned and missing-printing entries at this printing. | design choice; [[My Collection]] COLL-012, COLL-014 |
| CARD-017 | MUST | A printing keeps its own `setCode`. Whether a reprint numbered outside its set's range is legal is **not** decided here; SPEC-002 decides it from `setCode` + `collectorNumber`. | [[Deck Construction Rules]] #13 |

### Sets
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-020 | MUST | Each API set becomes a `CardSet` with `code` (API `id`, normalized to upper case, e.g. `Ven` → `VEN`) and `name`. | [[Sets]] (Conflicts) |
| CARD-021 | MUST | Set codes are not a fixed enum. A set code not seen before (e.g. `LGC`, `PG2`, `REC`) is added from the API without code changes and listed in the ingestion report as `new-set`. | [[Sets]] |
| CARD-023 | SHOULD | Promo groupings are kept as ordinary sets if the Riot API returns them. The codes seen in community data (Riftcodex, [[Sets]] note under its table) are `OPP` (Organized Play promos, 133 cards), `JDG` (Judge promos, 3) and `PR` (promos, 13), counts as of the Sets note, 2026-11-24. A promo printing is a normal `Printing`: it shares the `cardKey` of the same-named card (CARD-012, CARD-013), so a promo copy counts as a copy of that card. Whether a promo printing is **legal** is SPEC-002's decision, not this model's (CARD-017): per SPEC-002 LEGAL-C07 the promo printings are legal **by name** when the name has a printing in a legal set (research `partial`: the by-name wording is a community transcription of TR 601.2, [[Deck Construction Rules]] #17). BLOCKED: needs research (whether the Riot API returns promo sets and with which codes, H-020). | [[Card Data & Images]] #13; [[Sets]] (promo line under the table); [[Deck Construction Rules]] #17 (as of 2026-11-24) |
| CARD-023a | MUST | `ARC` is a valid set code and is **not** a Standard set. [[Sets]] #6 (Piltover Archive deck-code set IDs, community-db, as of 2026-11-24; the Sets note's status is `unverified`) lists ARC as "Arcane Box Set" (deck-code index 2), a code absent from the Standard list (TR 601.3.c: OGS, OGN, SFD, UNL, VEN, RAD) and from Riftcodex's `/sets`. Like any other code it is added from the Riot API if the API returns it (CARD-021) and gets no special handling here: this spec does not decide the legality of ARC printings (SPEC-002) and does not state that the API returns ARC. BLOCKED: needs research (whether the API returns `ARC`, with which name, H-020). | [[Sets]] #1, #6 |

### Types, domains and deck-building attributes
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-024 | MUST | `PlayableCard.type` stores the API `type` value **verbatim**. `category` is a normalized lower-case enum derived from `type` alone by a versioned mapping table in this spec: `legend`, `champion`, `unit`, `spell`, `gear`, `rune`, `battlefield`, `token`, `unknown`. `champion` is used only if the API has a distinct type string for Champion Units; otherwise Champion Units are `unit` with `isChampionUnit: true`. Any type string not in the mapping goes to `unknown` and is reported as `unmapped-type`. Consumers MUST treat `unknown` like a `null` attribute (not evaluated). Mapping status: `Legend`→`legend`, `Rune`→`rune`, `Battlefield`→`battlefield`, `Unit`→`unit` are backed by research; the API strings for spells, gear, champion units and tokens are BLOCKED: needs research (live payload). | [[Deck Construction Rules]] #1, #4, #7, #8; [[Card Data & Images]] #9, #10; [[Sets]] #3 (tokens) |
| CARD-025 | MUST | `domains: string[] \| null`. `[]` means the card is **verified** to have no domain (fits any identity); `null` means unknown. Values are the official domain names (seen in research: Calm, Chaos, Order, Fury, Mind). The full set and how they map from the API (`faction`?) are BLOCKED: needs research; until verified, ingestion writes `null`. | [[Deck Construction Rules]] #2; [[Card Data & Images]] #9, #10; decklist notes e.g. [[2026-11 RC Europe - 2 - Sonecon - Riven]] |
| CARD-026 | MUST | `isChampionUnit: boolean \| null` (renamed from `isChampion` in 0.1) and `championTag: string \| null` (the champion name tag that Legends, Chosen Champions and Signature cards must share) are stored. `championTag: null` means unknown; it is only meaningful for Legends, Champion Units and Signature cards. Source field in the API (`tags[]`?): BLOCKED: needs research; until verified, ingestion writes `null` for both. | [[Deck Construction Rules]] #4, #6 |
| CARD-027 | MUST | `isSignature: boolean \| null` is stored per playable card; `null` = unknown. Signature cards are not Champion Units. Source field in the API: BLOCKED: needs research; until verified, ingestion writes `null`. | [[Deck Construction Rules]] #6 |
| CARD-028 | MUST | `stats` stores `energy`, `might`, `cost`, `power` as numbers or `null` when absent; `keywords` and `tags` as string lists. | [[Card Data & Images]] #9 |
| CARD-029 | MUST | **Null means unknown.** For `domains`, `isChampionUnit`, `isSignature`, `championTag`, `isPreview` and `CardSet.releaseStatus`, ingestion writes `null` unless a verified mapping from a research-backed API field exists; it never writes `false`, `[]` or a guessed value for an unverified source. Every consumer MUST treat `null` (and `category: 'unknown'`) as "not evaluated", never as false or empty. The ingestion report counts `null` values per attribute. | [[Card Data & Images]] #9 (schema unverified); SPEC-002 LEGAL-R04 |

### Name normalization (matching key)
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-030 | MUST | `nameKey(s)` is computed in this order: (1) Unicode NFKC; (2) map typographic apostrophes and quotes (`’ ‘ ʼ ´ \``) to `'` and `“ ”` to `"`; (3) map dashes (`‐ ‑ – —`) to `-`; (4) decompose (NFD) and remove combining accent marks; (5) lower-case (Unicode case fold); (6) remove every character that is not a letter, digit or space (this drops `' , - . : ! ? "` etc.); (7) collapse runs of whitespace to one space and trim. | [[Collection Import Formats]] (name matching); decklist notes |
| CARD-031 | MUST | `nameKey` is used for **lookups only**. Displays and exports always use the canonical name. | [[Card Data & Images]] #3 |
| CARD-032 | MUST | Ingestion fails if two different canonical names produce the same `nameKey` (collision), naming both cards. No silent merge. | design safeguard for CARD-013 |
| CARD-033 | MUST | A name lookup is: exact `nameKey` match first, then CARD-034. Lookups that match under neither return "not found"; fuzzy matching (typos, partial names) is SPEC-003's job, not this model's. | [[Collection Import Formats]] |
| CARD-034 | MUST | **Optional leading article** (v0.4; RJ decision 2026-11-25; replaces the curated alias table removed in 0.2, so there is still **no alias table**: the rule is generic and reads only Riot data). `looseKey(s)` = `nameKey(s)` with one leading article token, `a ` or `the `, removed; if nothing would remain after it, `looseKey(s) = nameKey(s)`. **Name lookup** (the one lookup used by SPEC-003 import and SPEC-006, so import, deck import and any other name lookup agree): (1) if `nameKey(s)` equals a card's `cardKey`, that card is `found` and step 2 never runs (the full name, article included, always matches); (2) otherwise compare `looseKey(s)` with `looseKey(cardKey)` of every card: exactly one card → `found`; more than one → `ambiguous` with their `cardKey`s (reachable when the catalog holds names that differ only in the article, e.g. `A Pit` and `The Pit`: neither equals `pit`, both have loose key `pit`); none → `not-found`. The comparison runs both ways, so an input with the article finds a card without it (`The Dreaming Tree` finds a card the API names `Dreaming Tree`) and the reverse. The result is the card's own `cardKey` and canonical name: the rule never creates or changes a `cardKey`, and display and export keep the canonical name (CARD-031). Motivating case: **"The Dreaming Tree"** is the canonical name (the first-ban announcement and Riftcodex spell it so) and the Rules Hub prints **"Dreaming Tree"**, so a lookup for `Dreaming Tree` MUST find it. Not used by the ingestion collision check (CARD-032, exact `nameKey`) or by SPEC-002's ban-list name check (LEGAL-B05), which stay exact. **Status: the article rule is an RJ product decision (2026-11-25), not a research finding.** Research backs only the one name ([[Ban List]] #10, note status `verified`, but the fact itself says the name is "Not yet checked against the official card gallery (no API) or the Riot payload (H-020)"); no other card is known to need it. | RJ decision 2026-11-25 (H-165 board row); [[Ban List]] #10 (as of 2026-11-24; Riftcodex is community-db, the announcement is official); [[ADR-0005 MVP Product Defaults]] #4 (no curated alias table) |
| CARD-035 | MUST | Every card name in our decklist notes resolves to exactly one `PlayableCard` (validation check V-003). | [[Collection Import Formats]]; V-003 |
| CARD-036 | MUST | `lookupPrinting(setCode, collectorNumber)` resolves **without a variant** to the playable card: set code compared upper-case (CARD-020), collector number compared by collector key (CARD-037). Result: `found` with the `cardKey` and the matching printings (base / no-suffix printing first, then `printingSortKey`); `not-found`; or `ambiguous` if matching printings have different `cardKey`s (also an ingestion warning `collector-collision`). A variant suffix in the input narrows the printings but never changes the `cardKey`; if no printing has that suffix, the lookup still returns `found` with all printings of that number plus a `variant-not-found` note. Inputs accepted: `SET` + number as separate fields, public code `SET-NUMBER[suffix]` (e.g. `OGN-007a`, `RAD-SP1/005`), TTS token `SET-NUMBER-COPY` (copy index dropped). Exact suffix → `variant.kind` mapping stays BLOCKED by CARD-040. | [[Collection Import Formats]] (formats table); [[Card Data & Images]] #10 |
| CARD-037 | MUST | `collectorKey(raw)` normalizes a collector number in this order: (1) Unicode NFKC, trim, remove a leading `#`; (2) upper-case; (3) parse one of: **(a)** block form `^([A-Z]+[0-9]*)/([0-9]+)([A-Z*]*)$` (e.g. `SP1/005`) → `block = SP1`, `number = 5`; **(b)** fraction form `^([0-9]+)([A-Z*]*)/([0-9]+)$` (e.g. `005/298`, `300/250`) → `number` = the part before `/`, the total after `/` is ignored; **(c)** plain `^([0-9]+)([A-Z*]*)$` (e.g. `007a`, `7`) → `number`; **(d)** anything else → `code` = the whole upper-cased string, `number = null`; (4) numbers are compared as integers, so leading zeros don't matter (`001` = `01` = `1`); (5) the trailing letters/`*` are the `suffix` (variant hint, upper-cased). The key is `block + '/' + number` for (a), `number` for (b)/(c), `'#' + code` for (d); the suffix is kept separately. `Printing.collectorNumber` stays verbatim; the key, suffix and parsed parts are stored beside it in `Printing.collector`. Examples: `" 007a"` → key `7`, suffix `A`; `"sp1/005"` → key `SP1/5`; `"300/250"` → key `300`. | [[Collection Import Formats]] (`OGN-007a`, TTS `OGN-265-1`); [[Card Data & Images]] #10 (`RAD-SP1/005`); [[Deck Construction Rules]] #13 (300/250) |
| CARD-038 | MUST | **Name search match** (RJ decision 2026-11-25; the one rule for SPEC-007 COLL-040 and SPEC-006's catalog search). For a query `q`, let `T` = the space-separated tokens of `nameKey(q)` and `L` = those of `looseKey(q)` (CARD-034). A card matches when **every token of `T` is a substring of its `cardKey`, or every token of `L` is** (`L` equals `T` when `q` has no leading article, or is only the article). An empty query matches everything. Because `cardKey` keeps its article, `the` and `dreaming` each find `The Dreaming Tree`; because `L` drops the query's article, `the dreaming tree` also finds a card the API names `Dreaming Tree`. Token order is free. Ranking is not specified. | RJ decision 2026-11-25 (H-165 board row); [[My Collection]] COLL-040 |

### Variants (unverified API representation; CARD-044 SAMPLE marker reserved)
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-040 | MUST | Each printing has `variant: { kind, label, evidence }`. `kind` is one of `base`, `showcase`, `alt-art`, `overnumbered`, `signature`, `promo`, `unknown`. Until the live payload is inspected, every printing gets `kind: "unknown"` unless a mapping rule (CARD-041) matches. | [[Card Data & Images]] #9, #10, #12, Conflicts |
| CARD-041 | MUST | Variant detection is a **versioned, data-driven rule list** (`data/variant-rules.json`), each rule matching on API fields (e.g. `rarity == "Showcase"`, collector-number pattern `SP\d+/`, suffix letter) and naming the `kind` it sets and the research note that backs it. Changing rules re-derives variants from the stored raw payload without a new API call. | [[Card Data & Images]] #10 (`RAD-SP1/005`, rarity "Showcase"); [[Collection Import Formats]] (suffixes a/s/b) |
| CARD-042 | MUST | The ingestion job keeps the unmodified API response for the snapshot (`data/raw/riot-contents-<lastUpdated>.json`) so CARD-041 and new-property handling can be reapplied. It holds no API key. | [[Card Data & Images]] #4, #7 |
| CARD-043 | MUST | `variant.kind` never affects `cardKey`, copy limits or matching (CARD-013). It affects display, printing-level lookups, `printingSortKey`, and SPEC-002 LEGAL-018, which reads `variant.kind === 'overnumbered'` (and treats `unknown` as not evaluated). There is no separate `overnumbered` field. | [[Deck Construction Rules]] #5, #13; [[ADR-0005 MVP Product Defaults]] #2 |
| CARD-044 | MAY | **Reserved: SAMPLE marker.** SPEC-002 LEGAL-C10 says SAMPLE-stamped printings are not legal for organized play (Riot's Organized Play article, [[Deck Construction Rules]] #17, as of 2026-11-24) and needs a per-printing marker to act on it. RJ decided on 2026-11-25 (H-193) that SAMPLE printings are **left out entirely** (not imported, counted, shown or matched in import, collection or decks); this marker is what those rules will read, and their requirements live in the consuming specs (H-197), not here. This spec defines **no field yet**: its name, type and API source are undecided and the API representation is unknown (**BLOCKED: needs research**, H-020). When it is added it follows CARD-029: `null` = unknown, never guessed from set code or collector number, and it does not affect `cardKey` (CARD-013). Until then no printing is treated as SAMPLE. | [[Deck Construction Rules]] #17; [[Deck Legality]] LEGAL-C10 |

### Ordering (default printing order)
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-070 | MUST | `printingSortKey(p)` is the normative default order of printings (used by CARD-016 and by SPEC-007's default sort). Printings compare by, in order: (1) `setOrder` of `p.setCode` ascending (CARD-071); (2) **group**: `0` = numeric collector key (CARD-037 forms b/c) and `variant.kind !== 'overnumbered'`; `1` = numeric collector key and `variant.kind === 'overnumbered'`; `2` = block form (a), e.g. `SP1/005`; `3` = non-numeric code (d); (3) within group 2, `block` compared by its letter part, then its digits as an integer (`SP1` < `SP2` < `SP10`); (4) `number` ascending as an integer (group 3: `code` by Unicode code point); (5) `collector.suffix`: none first, then by code point (`A` < `B` < `S`); (6) `printingId` by code point (final tie-break). So overnumbered printings follow the regular range in numeric order; while `variant.kind` is `unknown`, overnumbered printings fall into group 0 at their numeric position, which is still after the regular range because their numbers exceed it. Example (one set): `001`, `002`, `002a`, `250`, `300` (overnumbered), `SP1/005`, `SP1/012`. | [[ADR-0006 Two Imports - Collection and Decks]] (Collection default order); [[Deck Construction Rules]] #13; [[Card Data & Images]] #10 |
| CARD-071 | MUST | `CardSet.setOrder` is the 0-based position of the set in the Riot API response `sets[]` **as returned** for that snapshot. No curated release-date table is used (ADR-0005). Sets keep `code` order in the file (CARD-061); `setOrder` is a field. If a set's relative order changes between snapshots, the report lists `set-order-changed`. Whether the API returns sets in release order is BLOCKED: needs research (live payload); if it does not, RJ decides (open question 13). | [[ADR-0005 MVP Product Defaults]] #4; [[Card Data & Images]] #9 |

### External IDs
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-050 | MAY | Printings MAY carry `externalIds` (an open map, e.g. `{ tcgplayer: "…" }`) to match collection CSV exports, **only if Riot permits a source**. The Riot API schema has no TCGplayer ID, Riftcodex may not be used, and ADR-0005 forbids hand-curated tables beside Riot data. **BLOCKED: open question to Riot in the App Note (H-011 (d)).** Until answered, `externalIds` is absent and no `external-ids` file exists. | [[Card Data & Images]] #9, #11; [[Collection Import Formats]] #6; [[Riot Developer Rules]] #7, #11; [[ADR-0005 MVP Product Defaults]] #4 |
| CARD-051 | MUST | If CARD-050 is ever unblocked, external IDs come from the Riot-permitted source, are stored outside the Riot-sourced snapshot (keyed by `printingId`) and joined at load time, so CARD-007 still holds. No hand-curated external-ID file. | [[Card Data & Images]] #7; [[ADR-0005 MVP Product Defaults]] #4 |

### Ingestion, snapshot and updates
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-060 | MUST | The ingestion job writes `data/cards.json` matching `CardSnapshot` (data contract below) through a storage interface (no host-specific SDK). Region is configurable (default `AMERICAS`), locale is `en`. | [[Card Data & Images]] #9; [[ADR-0001 Tech Stack]]; [[ADR-0004 Hosting (Deferred)]] |
| CARD-061 | MUST | Output is deterministic: sets sorted by `code`, printings by `printingId`, cards by `cardKey`, object keys in a fixed order, so successive snapshots diff cleanly in git. | [[ADR-0001 Tech Stack]] (versioned JSON) |
| CARD-062 | MUST | The snapshot records `source.apiVersion` and `source.lastUpdated` from the response, plus `fetchedAt`, `schemaVersion` (this spec's contract version, `'0.2'`) and `catalogVersion` (CARD-068). | [[Card Data & Images]] #9 |
| CARD-063 | MUST | Fields in the API response that the model doesn't map are preserved per printing in `extra` and listed in the ingestion report as `new-property`, so new card properties can be supported quickly. | [[Card Data & Images]] #4; [[Riot App Application]] |
| CARD-064 | MUST | Missing required API fields (`id`, `name`, `set`, `collectorNumber`) fail the whole run; the previous snapshot stays in place (write to a temp file, then replace). | design safeguard |
| CARD-065 | MUST | Each run produces a report (`data/cards.report.json`): counts per set, `new-set`, `set-order-changed`, added / removed printings, `new-property`, `unmapped-type`, `field-conflict`, `collector-collision`, unknown variants count, and `null` counts per CARD-029 attribute. | [[Sets]]; [[Card Data & Images]] #4 |
| CARD-066 | SHOULD | A printing present in the previous snapshot but missing now is reported as `removed-printing`, not silently dropped from decklist resolution; V-003 then flags any decklist that depended on it. | V-003 |
| CARD-067 | MUST | The job works with a development key run manually on RJ's PC (keys expire), and later with a production key on a schedule, without code changes. | [[Riot Developer Rules]] #1 and Conflicts |
| CARD-068 | MUST | `catalogVersion` is the string `` `${schemaVersion}+${source.lastUpdated}` ``, where `source.lastUpdated` is the API value verbatim (a number is written as its decimal string), e.g. `0.2+2026-11-20T18:04:00Z`. It is stored at the top of `cards.json`. Same raw response + same schema → same `catalogVersion`. Re-deriving variants (CARD-041) does not change it; the rule-list version is recorded separately as `variantRulesVersion`. SPEC-002, SPEC-003 and others echo `catalogVersion` in their results. | [[Card Data & Images]] #9; SPEC-002 `LegalityResult.catalogVersion` |

## Data contract
```ts
// shapes only; no implementation. File: data/cards.json
export interface CardSnapshot {
  schemaVersion: '0.2';
  catalogVersion: string;     // `${schemaVersion}+${source.lastUpdated}` (CARD-068)
  variantRulesVersion: string; // version of data/variant-rules.json applied (CARD-041)
  source: {
    api: 'riftbound-content-v1';
    region: 'AMERICAS' | 'ASIA' | 'EUROPE';
    locale: 'en';
    apiVersion: string;       // response.version
    lastUpdated: string;      // response.lastUpdated (verbatim)
  };
  fetchedAt: string;          // ISO 8601 UTC
  sets: CardSet[];            // sorted by code
  cards: PlayableCard[];      // sorted by cardKey
  printings: Printing[];      // sorted by printingId
}

export interface CardSet {
  code: string;               // upper case, e.g. 'RAD'
  name: string;               // e.g. 'Radiance'
  setOrder: number;           // 0-based position in API sets[] (CARD-071)
  releaseStatus: 'released' | 'preview' | null; // from the API only; null = unknown (CARD-008)
  printingCount: number;
}
// (0.1 field `releaseDate` removed per ADR-0005: no curated dates.)

export type CardCategory =
  'legend' | 'champion' | 'unit' | 'spell' | 'gear' | 'rune' | 'battlefield' | 'token' | 'unknown';

export interface PlayableCard {
  cardKey: string;            // nameKey(name); the only playable-card key (no cardId)
  name: string;               // canonical, verbatim from API
  type: string;               // verbatim API type
  category: CardCategory;     // derived from type (CARD-024)
  // null = unknown / not evaluated (CARD-029); never read null as false or []
  domains: string[] | null;   // [] = verified no domain
  isChampionUnit: boolean | null; // renamed from isChampion (CARD-026)
  championTag: string | null;
  isSignature: boolean | null;
  isPreview: boolean | null;  // CARD-006
  stats: { energy: number | null; might: number | null; cost: number | null; power: number | null };
  keywords: string[];
  tags: string[];
  text: string;               // API description, verbatim
  flavorText: string | null;
  printingIds: string[];      // in printingSortKey order (CARD-070)
  defaultPrintingId: string;
}

export type VariantKind =
  'base' | 'showcase' | 'alt-art' | 'overnumbered' | 'signature' | 'promo' | 'unknown';

export interface Printing {
  printingId: string;         // Riot API card id
  cardKey: string;
  setCode: string;
  collectorNumber: string;    // verbatim, e.g. '001', 'SP1/005'
  collector: {                // CARD-037, derived from collectorNumber
    key: string;              // e.g. '1', 'SP1/5', '#PROMO'
    block: string | null;     // e.g. 'SP1'
    number: number | null;    // integer, leading zeros dropped
    suffix: string | null;    // e.g. 'A'
    form: 'block' | 'fraction' | 'plain' | 'code';
  };
  publicCode: string | null;  // e.g. 'RAD-SP1/005' if derivable
  rarity: string | null;      // verbatim, e.g. 'Showcase'
  variant: { kind: VariantKind; label: string | null; evidence: string | null }; // evidence = rule id
  // overnumbered is variant.kind === 'overnumbered'; there is no separate field
  // planned, not defined: SAMPLE marker (CARD-044, BLOCKED); no field name decided
  art: { thumbnailUrl: string | null; fullUrl: string | null; artist: string | null };
  extra: Record<string, unknown>; // unmapped API fields (CARD-063)
}

// Lookups (CARD-033, CARD-036)
export type CardLookup =
  | { status: 'found'; cardKey: string; printingIds: string[]; note?: 'variant-not-found' }
  | { status: 'not-found' }
  | { status: 'ambiguous'; cardKeys: string[] };

// data/variant-rules.json
export interface VariantRule {
  id: string;                 // e.g. 'VR-001'
  when: { field: string; equals?: string; pattern?: string };
  kind: VariantKind;
  source: string;             // research note wikilink
}
export interface VariantRulesFile { version: string; rules: VariantRule[] }

// (0.1 data/card-aliases.json removed per ADR-0005.)
// (0.1 data/external-ids.json removed: CARD-050 is MAY + BLOCKED on H-011.)

// data/cards.report.json
export interface IngestionReport {
  fetchedAt: string;
  catalogVersion: string;
  countsBySet: Record<string, number>;
  newSets: string[];
  setOrderChanged: string[];
  addedPrintings: string[];
  removedPrintings: string[];
  newProperties: string[];    // dotted API field paths
  unmappedTypes: string[];
  fieldConflicts: { cardKey: string; field: string; printingIds: string[] }[];
  collectorCollisions: { setCode: string; collectorKey: string; cardKeys: string[] }[];
  unknownVariantCount: number;
  nullCounts: Record<'domains' | 'isChampionUnit' | 'championTag' | 'isSignature' | 'isPreview' | 'releaseStatus', number>;
}
```

### `type` → `category` mapping (CARD-024), version 1
| API `type` (verbatim) | `category` | Status |
|---|---|---|
| `Legend` | `legend` | research-backed ([[Deck Construction Rules]] #1) |
| `Unit` | `unit` | research-backed ([[Deck Construction Rules]] #4) |
| `Rune` | `rune` | research-backed ([[Deck Construction Rules]] #7) |
| `Battlefield` | `battlefield` | research-backed ([[Deck Construction Rules]] #8) |
| champion-unit string, if distinct | `champion` | BLOCKED: needs research |
| spell string(s) | `spell` | BLOCKED: needs research |
| gear string(s) | `gear` | BLOCKED: needs research |
| token string(s) ("Created" tokens from Legacy on) | `token` | BLOCKED: needs research ([[Sets]] #3) |
| anything else | `unknown` | reported as `unmapped-type` |

## Acceptance criteria
Example IDs and field values below are illustrative where the live payload is unverified; names are
real cards from research notes.

1. **Printings share a name, so they share a card** (CARD-012, CARD-013, CARD-043)
   **Given** the API returns two printings named `Kai'Sa, Survivor`, one base and one in a Showcase
   set with collector number `SP1/005` **When** ingestion runs **Then** `cards.json` has one
   `PlayableCard` with `cardKey: "kaisa survivor"` and both `printingIds`, and a collection holding
   2 base + 1 Showcase counts as 3 copies of `Kai'Sa, Survivor`.
2. **Subtitles separate cards** (CARD-014)
   **Given** printings named `Riven, The Exile` and `Riven, Broken Blade` **When** ingestion runs
   **Then** there are two cards, `riven the exile` and `riven broken blade`.
3. **Normalization** (CARD-030)
   **Given** the inputs `kai’sa, survivor`, `KAI'SA SURVIVOR`, `Kaí'Sa,  Survivor ` **When** `nameKey`
   is applied **Then** each yields `kaisa survivor`. **And** `Zhonya’s Hourglass` → `zhonyas hourglass`,
   `Star-Crossed` → `starcrossed`, `An Offer You Can't Refuse` → `an offer you cant refuse`.
4. **Display keeps the official name** (CARD-031)
   **Given** a user enters `zhonyas hourglass` **When** the card is shown **Then** it is displayed as
   `Zhonya's Hourglass` exactly as the API returns it.
5. **Collision fails loudly; hyphen vs space is not a collision** (CARD-030, CARD-032)
   **Given** canonical names `Star-Crossed` and `Star Crossed` **When** `nameKey` is applied **Then**
   they yield `starcrossed` and `star crossed` (step 6 removes the hyphen without inserting a space), so
   they are **two different cards** and ingestion succeeds. **Given** instead two canonical names that
   differ only by removed punctuation, e.g. hypothetical `Zhonya's Hourglass` and `Zhonyas Hourglass`
   (both → `zhonyas hourglass`) **When** ingestion runs **Then** it fails, names both cards, and the
   previous `cards.json` is unchanged.
6. **Leading-article alias, no alias table** (CARD-033, CARD-034; ADR-0005)
   **Given** the API's canonical name is `The Dreaming Tree` and there is no alias file **When** the
   model is asked for `Dreaming Tree`, `dreaming tree` or `The Dreaming Tree` **Then** each returns
   `found` with `cardKey: "the dreaming tree"` (the first two through CARD-034), and the card is shown
   as `The Dreaming Tree` (CARD-031). **Given** no card has the name `The Dreaming Tree` or `Dreaming
   Tree` **When** asked for `Dreaming Tree` **Then** `not-found`. **Given** (hypothetical names) two
   cards `The Mirror` and `Mirror` **When** asked for `Mirror` **Then** `found` for `Mirror`, and for
   `The Mirror` **Then** `found` for `The Mirror` (the exact match wins; no fallback). **Given**
   hypothetical cards `Echo, Twice` and `The Echo` **When** asked for `Echo` **Then** `found` for
   `The Echo` (CARD-034: loose key `echo`), while with `Echo, Twice` as the only card the result is
   `not-found` (a partial name is not an article match). **Given** the live payload returns
   `Dreaming Tree` (no article) **When** asked for `The Dreaming Tree` **Then** `found` for it.
7. **Decklists resolve** (CARD-035, V-003)
   **Given** the decklist [[2026-11 RC Europe - 2 - Sonecon - Riven]] (e.g. `Riven, The Exile`,
   `Calm Rune`, `Emperor's Dais`, `Vex, Apathetic`) **When** V-003 runs against the snapshot
   **Then** every name resolves to exactly one `PlayableCard`; any miss is listed by name.
8. **Categories and unknown attributes** (CARD-024, CARD-025, CARD-029)
   **Given** `Riven, The Exile` (API type `Legend`), `Calm Rune` (`Rune`), `Emperor's Dais`
   (`Battlefield`) and no verified domain mapping yet **When** ingestion runs **Then** their `type`s
   are kept verbatim, their categories are `legend`, `rune`, `battlefield`, and all three have
   `domains: null` (not `[]`). **When** a verified mapping is added and the job re-runs **Then**
   `Calm Rune` has `domains: ["Calm"]`. **And** an API type string we don't map gets `category:
   "unknown"` and appears in `unmappedTypes`.
9. **Unknown variants** (CARD-040, CARD-041, CARD-042)
   **Given** `variant-rules.json` is empty **When** ingestion runs **Then** every printing has
   `variant.kind: "unknown"`. **When** rule `VR-001` (`rarity equals "Showcase"` → `showcase`) is
   added and the job is re-run in "re-derive" mode on the stored raw file **Then** printings with
   rarity `Showcase` get `kind: "showcase"`, `evidence: "VR-001"`, with no API call made.
10. **New set** (CARD-021, CARD-065, CARD-071)
    **Given** the previous snapshot has OGN, OGS, SFD, UNL, VEN, RAD (API positions 0–5) and the API
    now also returns `LGC` (Legacy) as the 7th set **When** ingestion runs **Then** `sets` contains
    `LGC` with its API name, `setOrder: 6`, `releaseStatus` from the API (or `null` while CARD-008 is
    blocked), no release date field, and the report lists `newSets: ["LGC"]`.
11. **New property** (CARD-063)
    **Given** printings in the response include a field `foo` the model doesn't know **When**
    ingestion runs **Then** each printing keeps it in `extra.foo` and the report lists `newProperties: ["foo"]`.
12. **Set code case** (CARD-020)
    **Given** the API returns a set id `Ven` **When** ingestion runs **Then** `CardSet.code` is `VEN`.
13. **Secrets** (CARD-002, V-012)
    **Given** a completed run **When** `data/` and the web bundle are searched for `RGAPI-`
    **Then** there are no matches, and no request URL in logs includes the key.
14. **Failure keeps the old snapshot** (CARD-064)
    **Given** the API returns a card without `name` **When** ingestion runs **Then** it exits with an
    error naming the card `id`, and `data/cards.json` is byte-for-byte unchanged.
15. **Determinism** (CARD-061)
    **Given** the same raw API response **When** ingestion runs twice **Then** both `cards.json`
    outputs are byte-identical (apart from `fetchedAt`).
16. **Images are links only** (CARD-005)
    **Given** a completed run **When** `data/` is inspected **Then** it contains image URLs from
    `art.fullURL` / `art.thumbnailURL` and no image files.
17. **Null is not false** (CARD-026, CARD-027, CARD-029)
    **Given** the champion/signature source fields are still unverified **When** ingestion runs
    **Then** every card has `isChampionUnit: null`, `isSignature: null`, `championTag: null`, the
    report's `nullCounts.isSignature` equals the card count, and no card has `isSignature: false`.
18. **catalogVersion** (CARD-068)
    **Given** a response with `lastUpdated: "2026-11-20T18:04:00Z"` and schema `0.2` **When**
    ingestion runs **Then** `cards.json` has `catalogVersion: "0.2+2026-11-20T18:04:00Z"`. **When**
    the job re-runs in re-derive mode with a new variant rule **Then** `catalogVersion` is unchanged
    and `variantRulesVersion` changes.
19. **Set + collector-number lookup** (CARD-036, CARD-037)
    **Given** printings `OGN` `007` (base) and `OGN` `007a` of one card **When** looking up
    `("ogn", " 7")`, `("OGN", "007")` or public code `OGN-007` **Then** each returns `found` with that
    card's `cardKey` and the base printing first. **When** looking up `OGN-007a` **Then** it returns the
    same `cardKey` with the `007a` printing first. **When** looking up TTS token `OGN-265-1` **Then**
    it resolves as `OGN` + `265`. **When** looking up `RAD-sp1/5` **Then** it matches collector number
    `SP1/005`. **When** looking up `OGN-999` (no such number) **Then** it returns `not-found`.
20. **Default printing order** (CARD-070, CARD-071)
    **Given** set `OGN` (setOrder 0) with printings `002a`, `SP1/005`, `300` (`variant.kind:
    overnumbered`), `001`, `002`, `250`, and set `SFD` (setOrder 2) with `001` **When** sorted by
    `printingSortKey` **Then** the order is OGN `001`, `002`, `002a`, `250`, `300`, `SP1/005`, then
    SFD `001`.

21. **Article ambiguity** (CARD-034)
    **Given** (hypothetical names) two cards `The Pit` and `Pit, Twice` **When** asked for `Pit` **Then**
    `found` for `The Pit` only (`Pit, Twice` is a different name, CARD-014). **Given** (hypothetical
    names) two cards `A Pit` and `The Pit` **When** asked for `Pit` **Then** `ambiguous` with `cardKeys`
    `["a pit", "the pit"]` (neither equals `pit`; both have loose key `pit`). **When** asked for `The
    Pit` **Then** `found` for `The Pit` (exact wins), and for `A Pit` **Then** `found` for `A Pit`.
    **Given** instead cards `A Pit` and `Pit` **When** asked for `The Pit` **Then** `ambiguous` with
    `["a pit", "pit"]`.
22. **ARC and promo codes are ordinary sets** (CARD-021, CARD-023, CARD-023a; hypothetical payload)
    **Given** the previous snapshot has no `ARC` or `OPP` and the API now returns a set `Arc` named
    `Arcane Box Set` and a set `Opp` **When** ingestion runs **Then** `CardSet.code` values are `ARC`
    and `OPP` with the API names, the report lists `newSets` for both, and nothing in the snapshot marks
    them legal or illegal. **Given** an `OPP` printing and an `OGN` printing with the same name **Then**
    there is one `PlayableCard` listing both `printingIds`, and 1 owned `OPP` copy + 2 owned `OGN`
    copies count as 3 copies of the card (CARD-013). **Given** the API returns no `ARC` set **Then** no
    `ARC` set is invented.
23. **SAMPLE marker not guessed** (CARD-044, CARD-029)
    **Given** no verified API source for the SAMPLE stamp **When** ingestion runs **Then** no printing is
    marked SAMPLE from its set code or collector number, and SPEC-002 AC 24 still sees "no way to mark
    SAMPLE".
24. **Name search** (CARD-038)
    **Given** the card `The Dreaming Tree` **When** the query is `the`, `dreaming`, `the dreaming`,
    `DREAMING TREE` or `tree the` **Then** it matches in each case. **Given** instead the API names the
    card `Dreaming Tree` **When** the query is `the dreaming tree` **Then** it matches (`L` = `dreaming
    tree`); the query `the` alone does not match it (no `the` in `dreaming tree`; a lone article is not
    dropped). **Given** cards `Mirror` and `The Mirror` **When** the query is `mirror` **Then** both
    match. **When** the query is empty **Then** every card matches.

## Out of scope
- Deck legality, ban list, format/set legality and out-of-range reprints (SPEC-002).
- Parsing import formats, fuzzy matching, deck codes (SPEC-003).
- Tournament events and decklists (SPEC-004); completion % and substitutions (SPEC-005).
- Prices, card text search, non-English locales, image caching/CDN.

## Open questions / BLOCKED
1. **API schema is unverified** (from a community mirror). Inspect a live response from RJ's PC
   with the dev key and confirm field names, `id` format and `faction` meaning. → researcher.
2. **Variant representation** in the API (separate ids? collector-number suffix? rarity? set
   such as `RAD-SP1`?). Blocks the suffix → `variant.kind` part of CARD-036 and the CARD-040/041
   rules (and therefore SPEC-002 LEGAL-018). → researcher (from live payload).
3. **Champion / Signature / champion tag** source fields (CARD-026, CARD-027). → researcher.
4. **Full card type list and domain list** and their API strings (CARD-024 mapping table, CARD-025). → researcher.
5. **Previewed cards and sets** flag in the API (CARD-006, CARD-008). Needed by SPEC-002 set legality. → researcher.
6. **Promo sets** (OPP, JDG, PR) and **`ARC`** in the Riot API? With which codes and names? (CARD-023, CARD-023a). → researcher (H-020).
7. **Token cards** ("Created" tokens from Legacy on, [[Sets]] #3): does the API return them, with which
   `type`? (category `token`). Excluded from deck-building lookups? → researcher.
8. **TCGplayer IDs** (CARD-050, MAY + BLOCKED): is there a Riot-permitted source? Ask Riot in the App Note (H-011 (d)).
9. **Image caching / hotlinking** policy: ask Riot (H-011). (CARD-005)
10. ~~Set release dates table~~: resolved by ADR-0005 (no curated dates; CARD-022 removed). Set legality dates live in SPEC-002 from Riot-published sources only.
11. **Gameplay field conflicts across printings** (errata, Legacy templating): CARD-015 picks the latest
    set's printing. Confirm with RJ / researcher that this matches how errata are published.
12. **Canonical spelling of "The Dreaming Tree"** in the API. Research says "The Dreaming Tree" is canonical
    (first-ban announcement, Riftcodex) and the Rules Hub prints "Dreaming Tree" ([[Ban List]] #10, as of
    2026-11-24); not yet checked against the Riot payload (H-020). CARD-034 and CARD-038 accept both
    spellings either way; SPEC-002 LEGAL-B05 stays exact and uses whatever the API returns. → researcher (live payload).
13. **Set order** (CARD-071): does the API return `sets[]` in release order? If not, RJ decides how to order
    sets without a curated table (e.g. Riot-published dates where cited in research, API order otherwise).
14. **Collector-number forms** (CARD-037): confirm against the live payload that no other forms exist
    (e.g. promo codes); form (d) catches them meanwhile.
15. ~~Scope of the leading-article alias~~: **closed by RJ 2026-11-25** (H-165 board row): a leading "a" or
    "the" is optional in search and in name matching (import too), the full name also matches, and there
    is no curated alias table. Now CARD-034 (lookup, import) and CARD-038 (search). Research still backs
    only "Dreaming Tree" for "The Dreaming Tree"; the generic rule is RJ's product choice.
16. **SAMPLE marker** (CARD-044): field name, type and API source for SPEC-002 LEGAL-C10. → researcher
    (H-020), then spec-writer.
17. **Legality of `ARC` printings** (CARD-023a): [[Sets]] #6 only says ARC is not on the Standard list.
    Whether ARC cards are legal by name like promos is not researched; SPEC-002's decision once
    researched.

## Changelog
Current: 0.4 (2026-11-25, H-165 attempt 2, RJ decision 2026-11-25: CARD-034 optional leading "a" / "the" in name lookup (exact first, then `looseKey` both ways, reachable `ambiguous`; used by SPEC-003 import and SPEC-006), new CARD-038 name search, CARD-033 reworded, `looseKey` definition, ACs 6 and 21 fixed, AC 24 new, Open question 15 closed; CARD-023 / CARD-023a promo codes and ARC; CARD-044 SAMPLE marker reserved, RJ H-193 "left out entirely" noted; `review` because matching behaviour changes). Before: 0.3 (2026-11-23). Full history: [[Card Data Model changelog]] (archived). New entries go in the archive note.
