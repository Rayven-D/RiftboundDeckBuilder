---
tags: [spec]
id: SPEC-001
version: 0.1
status: draft
depends_on: []
research: ["[[Card Data & Images]]", "[[Sets]]", "[[Deck Construction Rules]]", "[[Collection Import Formats]]", "[[Riot Developer Rules]]", "[[Riot App Application]]", "[[Ban List]]"]
as_of: 2026-11-23
---
# SPEC-001: Card Data Model

## Purpose
Define how Riftbound cards are represented in the app: the **printing** (one physical card version
with an official ID, set, collector number and variant) and the **playable card** (all printings that
share a card **name**, which is the key for copy limits and for matching collections to decklists).
Define the ingestion contract from the Riot API (`riftbound-content-v1`) into a versioned snapshot at
`data/cards.json`, the name-normalization rules used for matching, and how the model absorbs new sets,
new card properties, and a variant representation that is not yet verified.

This spec is the contract for H-008 (pipeline) and the base for SPEC-002 (legality), SPEC-003
(collection import), SPEC-004 (tournament catalog) and SPEC-005 (build matching).

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
- **Name key**: the normalized form of a name used for lookups and matching (see CARD-030…CARD-036).
- **Variant**: what distinguishes printings of the same card within or across sets (e.g. Showcase,
  alt-art, overnumbered, signature). Its representation in the Riot API is **unknown**.
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
| CARD-006 | MUST | Cards that Riot marks as previewed / unreleased are flagged (`isPreview`) so the UI can label them. BLOCKED: needs research (how the API marks previewed cards). | [[Card Data & Images]] #3; [[Riot App Application]] |
| CARD-007 | MUST | The snapshot can be deleted and rebuilt entirely from the API (no hand-edited card data mixed into it), so all Riot game information can be removed if the API agreement ends. | [[Card Data & Images]] #7 |

### Printings and playable cards
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-010 | MUST | Each Riot API card becomes exactly one `Printing`, keyed by the Riot `id` (`printingId`). `printingId` is unique across the snapshot; a duplicate fails ingestion. | [[Card Data & Images]] #9 |
| CARD-011 | MUST | Each printing stores `setCode` (upper case), `collectorNumber` (as a **string**, verbatim, because codes like `SP1/005` and overnumbered numbers exist), the raw `variant` info (CARD-040), rarity, artist and image URLs. | [[Card Data & Images]] #9, #10; [[Sets]]; [[Deck Construction Rules]] #13 |
| CARD-012 | MUST | Printings are grouped into one `PlayableCard` per **canonical name**. `PlayableCard.cardKey` is the name key of that name. Every printing references its card via `cardKey`. | [[Deck Construction Rules]] #5 |
| CARD-013 | MUST | Copy-limit counting and collection/decklist matching use `cardKey` only, never `printingId`, set or variant. Owning `N` copies across any printings of a name counts as owning `N` of that card. | [[Deck Construction Rules]] #5; [[Collection Import Formats]] (Conflicts) |
| CARD-014 | MUST | Two names that differ only by subtitle are different cards (e.g. `Riven, The Exile` and `Riven, Broken Blade`). | [[Deck Construction Rules]] #5 |
| CARD-015 | MUST | Gameplay fields (type, domains, stats, keywords, tags, text) live on `PlayableCard`. If printings of one name disagree on a gameplay field, ingestion keeps the values from the printing in the most recently released set and reports a `field-conflict` warning listing the printings. | [[Card Data & Images]] #4 (timely support for changes); [[Sets]] #3 (templating changes) |
| CARD-016 | SHOULD | Each `PlayableCard` names a `defaultPrintingId` for display: the base (non-variant) printing in the earliest-released set; if no printing is known to be base, the lowest `printingId` in sort order. | design choice |
| CARD-017 | MUST | A printing keeps its own `setCode`. Whether a reprint numbered outside its set's range is legal is **not** decided here; SPEC-002 decides it from `setCode` + `collectorNumber`. | [[Deck Construction Rules]] #13 |

### Sets
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-020 | MUST | Each API set becomes a `CardSet` with `code` (API `id`, normalized to upper case, e.g. `Ven` → `VEN`) and `name`. | [[Sets]] (Conflicts) |
| CARD-021 | MUST | Set codes are not a fixed enum. A set code not seen before (e.g. `LGC`, `PG2`, `REC`) is added from the API without code changes and listed in the ingestion report as `new-set`. | [[Sets]] |
| CARD-022 | MAY | `CardSet.releaseDate` may be filled from a curated, research-backed table (not from Riot card data). Until then it is `null`. Format legality per set belongs to SPEC-002. | [[Sets]] #1, #2 |
| CARD-023 | SHOULD | Promo groupings (OPP, JDG, PR seen in community data) are kept as ordinary sets if the Riot API returns them. BLOCKED: needs research (whether the Riot API returns promo sets and with which codes). | [[Card Data & Images]] #13; [[Sets]] |

### Types, domains and deck-building attributes
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-024 | MUST | `PlayableCard.type` stores the API `type` value verbatim. `category` derives a deck-building role from it: `legend`, `unit`, `rune`, `battlefield`, or `other`. Values not mapped yet go to `other` and are reported as `unmapped-type`. Full type list: BLOCKED: needs research (e.g. whether Spell/Gear-like types exist and their API strings). | [[Deck Construction Rules]] #1, #4, #7, #8; [[Card Data & Images]] #9 |
| CARD-025 | MUST | `domains` is a list of domain names (0, 1 or more). Empty means no domain (fits any identity). Known values seen in research: Calm, Chaos, Order, Fury, Mind. The full set and how they map from the API (`faction`?) are BLOCKED: needs research. | [[Deck Construction Rules]] #2; decklist notes e.g. [[2026-11 RC Europe - 2 - Sonecon - Riven]] |
| CARD-026 | MUST | `isChampion` (champion unit) and `championTag` (the champion name tag that Legends, Chosen Champions and Signature cards must share) are stored. Source field in the API (`tags[]`?): BLOCKED: needs research. | [[Deck Construction Rules]] #4, #6 |
| CARD-027 | MUST | `isSignature` is stored per playable card. Signature cards are not champion units. Source field in the API: BLOCKED: needs research. | [[Deck Construction Rules]] #6 |
| CARD-028 | MUST | `stats` stores `energy`, `might`, `cost`, `power` as numbers or `null` when absent; `keywords` and `tags` as string lists. | [[Card Data & Images]] #9 |

### Name normalization (matching key)
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-030 | MUST | `nameKey(s)` is computed in this order: (1) Unicode NFKC; (2) map typographic apostrophes and quotes (`’ ‘ ʼ ´ \``) to `'` and `“ ”` to `"`; (3) map dashes (`‐ ‑ – —`) to `-`; (4) decompose (NFD) and remove combining accent marks; (5) lower-case (Unicode case fold); (6) remove every character that is not a letter, digit or space (this drops `' , - . : ! ? "` etc.); (7) collapse runs of whitespace to one space and trim. | [[Collection Import Formats]] (name matching); decklist notes |
| CARD-031 | MUST | `nameKey` is used for **lookups only**. Displays and exports always use the canonical name. | [[Card Data & Images]] #3 |
| CARD-032 | MUST | Ingestion fails if two different canonical names produce the same `nameKey` (collision), naming both cards. No silent merge. | design safeguard for CARD-013 |
| CARD-033 | MUST | Lookups that find no exact `nameKey` return "not found"; fuzzy matching (typos, partial names) is SPEC-003's job, not this model's. | [[Collection Import Formats]] |
| CARD-034 | SHOULD | The model supports a curated alias table (`data/card-aliases.json`: alias name → canonical name) for documented spelling differences, e.g. `Dreaming Tree` → `The Dreaming Tree` (canonical form to be confirmed from the API). Aliases are normalized with `nameKey` and must point at an existing card. | [[Ban List]] (Conflicts) |
| CARD-035 | MUST | Every card name in our decklist notes resolves to exactly one `PlayableCard` (validation check V-003). | [[Collection Import Formats]]; V-003 |
| CARD-036 | MAY | A lookup by public code (`SET-NNN`, with optional variant suffix) or by TTS token (`SET-NUMBER-COPY`) resolves to a printing via `setCode` + `collectorNumber`. Exact mapping of suffixes to API values is BLOCKED by CARD-040. | [[Collection Import Formats]] (formats table) |

### Variants (unverified API representation)
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-040 | MUST | Each printing has `variant: { kind, label, evidence }`. `kind` is one of `base`, `showcase`, `alt-art`, `overnumbered`, `signature`, `promo`, `unknown`. Until the live payload is inspected, every printing gets `kind: "unknown"` unless a mapping rule (CARD-041) matches. | [[Card Data & Images]] #9, #10, #12, Conflicts |
| CARD-041 | MUST | Variant detection is a **versioned, data-driven rule list** (`data/variant-rules.json`), each rule matching on API fields (e.g. `rarity == "Showcase"`, collector-number pattern `SP\d+/`, suffix letter) and naming the `kind` it sets and the research note that backs it. Changing rules re-derives variants from the stored raw payload without a new API call. | [[Card Data & Images]] #10 (`RAD-SP1/005`, rarity "Showcase"); [[Collection Import Formats]] (suffixes a/s/b) |
| CARD-042 | MUST | The ingestion job keeps the unmodified API response for the snapshot (`data/raw/riot-contents-<lastUpdated>.json`) so CARD-041 and new-property handling can be reapplied. It holds no API key. | [[Card Data & Images]] #4, #7 |
| CARD-043 | MUST | `variant.kind` never affects `cardKey`, copy limits or matching (CARD-013). It only affects display and printing-level lookups. | [[Deck Construction Rules]] #5 |

### External IDs
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-050 | SHOULD | Printings carry `externalIds` (an open map, e.g. `{ tcgplayer: "…" }`) to match collection CSV exports. The Riot API schema has no TCGplayer ID and Riftcodex may not be used, so the permitted source is BLOCKED: needs research (or an App Note question to Riot). Until then the map is empty. | [[Card Data & Images]] #9, #11; [[Collection Import Formats]] #6; [[Riot Developer Rules]] #7, #11 |
| CARD-051 | MUST | External IDs are stored outside the Riot-sourced snapshot (`data/external-ids.json`, keyed by `printingId`) and joined at load time, so CARD-007 still holds. | [[Card Data & Images]] #7 |

### Ingestion, snapshot and updates
| ID | Level | Requirement | Source |
|---|---|---|---|
| CARD-060 | MUST | The ingestion job writes `data/cards.json` matching `CardSnapshot` (data contract below) through a storage interface (no host-specific SDK). Region is configurable (default `AMERICAS`), locale is `en`. | [[Card Data & Images]] #9; [[ADR-0001 Tech Stack]]; [[ADR-0004 Hosting (Deferred)]] |
| CARD-061 | MUST | Output is deterministic: sets sorted by `code`, printings by `printingId`, cards by `cardKey`, object keys in a fixed order, so successive snapshots diff cleanly in git. | [[ADR-0001 Tech Stack]] (versioned JSON) |
| CARD-062 | MUST | The snapshot records `source.apiVersion` and `source.lastUpdated` from the response, plus `fetchedAt` and `schemaVersion` (this spec's contract version). | [[Card Data & Images]] #9 |
| CARD-063 | MUST | Fields in the API response that the model doesn't map are preserved per printing in `extra` and listed in the ingestion report as `new-property`, so new card properties can be supported quickly. | [[Card Data & Images]] #4; [[Riot App Application]] |
| CARD-064 | MUST | Missing required API fields (`id`, `name`, `set`, `collectorNumber`) fail the whole run; the previous snapshot stays in place (write to a temp file, then replace). | design safeguard |
| CARD-065 | MUST | Each run produces a report (`data/cards.report.json`): counts per set, `new-set`, added / removed printings, `new-property`, `unmapped-type`, `field-conflict`, unknown variants count. | [[Sets]]; [[Card Data & Images]] #4 |
| CARD-066 | SHOULD | A printing present in the previous snapshot but missing now is reported as `removed-printing`, not silently dropped from decklist resolution; V-003 then flags any decklist that depended on it. | V-003 |
| CARD-067 | MUST | The job works with a development key run manually on RJ's PC (keys expire), and later with a production key on a schedule, without code changes. | [[Riot Developer Rules]] #1 and Conflicts |

## Data contract
```ts
// shapes only; no implementation. File: data/cards.json
export interface CardSnapshot {
  schemaVersion: '0.1';
  source: {
    api: 'riftbound-content-v1';
    region: 'AMERICAS' | 'ASIA' | 'EUROPE';
    locale: 'en';
    apiVersion: string;       // response.version
    lastUpdated: string;      // response.lastUpdated (as returned)
  };
  fetchedAt: string;          // ISO 8601 UTC
  sets: CardSet[];            // sorted by code
  cards: PlayableCard[];      // sorted by cardKey
  printings: Printing[];      // sorted by printingId
}

export interface CardSet {
  code: string;               // upper case, e.g. 'RAD'
  name: string;               // e.g. 'Radiance'
  releaseDate: string | null; // YYYY-MM-DD, curated (CARD-022)
  printingCount: number;
}

export type CardCategory = 'legend' | 'unit' | 'rune' | 'battlefield' | 'other';

export interface PlayableCard {
  cardKey: string;            // nameKey(name)
  name: string;               // canonical, verbatim from API
  type: string;               // verbatim API type
  category: CardCategory;
  domains: string[];          // [] = no domain
  isChampion: boolean;        // BLOCKED source (CARD-026)
  championTag: string | null; // BLOCKED source (CARD-026)
  isSignature: boolean;       // BLOCKED source (CARD-027)
  isPreview: boolean;         // BLOCKED source (CARD-006)
  stats: { energy: number | null; might: number | null; cost: number | null; power: number | null };
  keywords: string[];
  tags: string[];
  text: string;               // API description, verbatim
  flavorText: string | null;
  printingIds: string[];      // sorted
  defaultPrintingId: string;
}

export type VariantKind =
  'base' | 'showcase' | 'alt-art' | 'overnumbered' | 'signature' | 'promo' | 'unknown';

export interface Printing {
  printingId: string;         // Riot API card id
  cardKey: string;
  setCode: string;
  collectorNumber: string;    // verbatim, e.g. '001', 'SP1/005'
  publicCode: string | null;  // e.g. 'RAD-SP1/005' if derivable
  rarity: string | null;      // verbatim, e.g. 'Showcase'
  variant: { kind: VariantKind; label: string | null; evidence: string | null }; // evidence = rule id
  art: { thumbnailUrl: string | null; fullUrl: string | null; artist: string | null };
  extra: Record<string, unknown>; // unmapped API fields (CARD-063)
}

// data/variant-rules.json
export interface VariantRule {
  id: string;                 // e.g. 'VR-001'
  when: { field: string; equals?: string; pattern?: string };
  kind: VariantKind;
  source: string;             // research note wikilink
}

// data/card-aliases.json
export interface CardAlias { alias: string; canonicalName: string; source: string }

// data/external-ids.json
export type ExternalIds = Record<string /* printingId */, { tcgplayer?: string; [k: string]: string | undefined }>;

// data/cards.report.json
export interface IngestionReport {
  fetchedAt: string;
  countsBySet: Record<string, number>;
  newSets: string[];
  addedPrintings: string[];
  removedPrintings: string[];
  newProperties: string[];    // dotted API field paths
  unmappedTypes: string[];
  fieldConflicts: { cardKey: string; field: string; printingIds: string[] }[];
  unknownVariantCount: number;
}
```

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
5. **Collision fails loudly** (CARD-032)
   **Given** two canonical names whose `nameKey` is equal (e.g. hypothetical `Star-Crossed` and
   `Star Crossed`) **When** ingestion runs **Then** it fails, names both cards, and the previous
   `cards.json` is unchanged.
6. **Alias** (CARD-034)
   **Given** `card-aliases.json` maps `Dreaming Tree` → `The Dreaming Tree` **When** a decklist says
   `Dreaming Tree` **Then** it resolves to the card `the dreaming tree`.
7. **Decklists resolve** (CARD-035, V-003)
   **Given** the decklist [[2026-11 RC Europe - 2 - Sonecon - Riven]] (e.g. `Riven, The Exile`,
   `Calm Rune`, `Emperor's Dais`, `Vex, Apathetic`) **When** V-003 runs against the snapshot
   **Then** every name resolves to exactly one `PlayableCard`; any miss is listed by name.
8. **Categories** (CARD-024, CARD-025)
   **Given** `Riven, The Exile` (Legend), `Calm Rune` (Rune), `Emperor's Dais` (Battlefield)
   **When** ingestion runs **Then** their categories are `legend`, `rune`, `battlefield`, and
   `Calm Rune` has `domains: ["Calm"]`. **And** an API type string we don't map gets `other` and
   appears in `unmappedTypes`.
9. **Unknown variants** (CARD-040, CARD-041, CARD-042)
   **Given** `variant-rules.json` is empty **When** ingestion runs **Then** every printing has
   `variant.kind: "unknown"`. **When** rule `VR-001` (`rarity equals "Showcase"` → `showcase`) is
   added and the job is re-run in "re-derive" mode on the stored raw file **Then** printings with
   rarity `Showcase` get `kind: "showcase"`, `evidence: "VR-001"`, with no API call made.
10. **New set** (CARD-021, CARD-065)
    **Given** the previous snapshot has OGN, OGS, SFD, UNL, VEN, RAD and the API now also returns
    `LGC` (Legacy) **When** ingestion runs **Then** `sets` contains `LGC` with its API name,
    `releaseDate: null` (until curated), and the report lists `newSets: ["LGC"]`.
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

## Out of scope
- Deck legality, ban list, format/set legality and out-of-range reprints (SPEC-002).
- Parsing import formats, fuzzy matching, deck codes (SPEC-003).
- Tournament events and decklists (SPEC-004); completion % and substitutions (SPEC-005).
- Prices, card text search, non-English locales, image caching/CDN.

## Open questions / BLOCKED
1. **API schema is unverified** (from a community mirror). Inspect a live response from RJ's PC
   with the dev key and confirm field names, `id` format and `faction` meaning. → researcher.
2. **Variant representation** in the API (separate ids? collector-number suffix? rarity? set
   such as `RAD-SP1`?). Blocks CARD-036, CARD-040/041 rules. → researcher (from live payload).
3. **Champion / Signature / champion tag** source fields (CARD-026, CARD-027). → researcher.
4. **Full card type list and domain list** and their API strings (CARD-024, CARD-025). → researcher.
5. **Previewed cards** flag in the API (CARD-006). → researcher.
6. **Promo sets** (OPP, JDG, PR) in the Riot API? (CARD-023). → researcher.
7. **Token cards** ("Created" tokens from Legacy on, [[Sets]] #3): does the API return them, and
   should they be excluded from deck-building lookups? → researcher.
8. **TCGplayer IDs**: is there a permitted source? Ask Riot in the App Note (H-011). (CARD-050)
9. **Image caching / hotlinking** policy: ask Riot (H-011). (CARD-005)
10. **Set release dates** (CARD-022): may a curated, research-sourced table live beside Riot data? Likely yes (not a Riot asset); confirm with RJ.
11. **Gameplay field conflicts across printings** (errata, Legacy templating): CARD-015 picks the newest
    set's printing. Confirm with RJ / researcher that this matches how errata are published.
12. **Canonical spelling of "The Dreaming Tree"** in the API (CARD-034).

## Changelog
- 0.1 (2026-11-23): first draft (H-003).
