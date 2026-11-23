---
tags: [spec]
id: SPEC-004
version: 0.1
status: draft
depends_on: [SPEC-001, SPEC-002]
research: ["[[Tournament Results]]", "[[Ban List]]", "[[Formats]]", "[[Riot Developer Rules]]", "[[Collection Import Formats]]", "[[Deck Construction Rules]]"]
decisions: ["[[ADR-0003 Tournament Results Only]]", "[[ADR-0001 Tech Stack]]", "[[ADR-0004 Hosting (Deferred)]]"]
as_of: 2026-11-23
---
# SPEC-004: Tournament Deck Catalog

## Purpose
Store and show **published tournament results**: each premier event and the **full Top 8 (or
whatever top cut Riot publishes)** with each decklist, labelled with its placing exactly as
published, plus the event, date(s) and region. The catalog is the deck source for
[[Build Matching]] (SPEC-005). Per [[ADR-0003 Tournament Results Only]] it contains **no metagame
statistics of any kind**, stored or shown. Legality of each list is **computed** against the
current ban list by [[Deck Legality]] (SPEC-002, written in parallel) and is never hand-maintained
in the app data.

## Definitions
- **Event**: one Riot organized-play tournament with published results (e.g. a Regional Qualifier
  or Regional Championship). See [[Tournament Results]].
- **Event type**: the tier name exactly as Riot uses it (`Regional Qualifier`, `Regional Championship`,
  `World Showcase`). Free text from a controlled list; not a ranking.
- **Published rank**: the integer position a decklist holds in Riot's published standing for the
  event (for RC Europe: Riot's "Overall Ranking", #1 to #8).
- **Placing label**: the text shown for the published rank, exactly as published. Where Riot
  publishes only an ordinal ranking (RC Europe), the label is the ordinal: `1st` … `8th`.
- **Catalog decklist**: one published list for one pilot at one event: Legend, Chosen Champion,
  Main Deck (39 non-champion cards as published), Rune Pool, Battlefields, Sideboard.
- **Historical decklist**: a catalog decklist that is **not legal** in its format today, per SPEC-002
  (for example, it contains cards banned after the event).
- **Riot decklist text**: Riot's sectioned decklist layout (Legend / Champion / Main Deck /
  Battlefields / Rune Pool / Sideboard, each followed by `<qty> <name>` lines). See
  [[Collection Import Formats]] fact 1.
- **Metagame statistic**: any number or label derived by aggregating across decklists, events or
  players: play rate, win rate, matchup data, tier, archetype or Legend share, counts of a Legend
  in a Top 8, "meta score", trend. Prohibited by ADR-0003 and check V-010.

## Requirements

### Event model
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-001 | MUST | Each event record has: `id` (stable slug), `name` (as Riot names it), `type` (Riot's tier name), `startDate` and `endDate` (ISO dates; equal for one-day events), `region`, `location` (venue and/or city as published, nullable), `format`, `sourceUrls` (at least one, the article the lists were copied from), `capturedAsOf` (date the data was copied). | [[Tournament Results]] |
| CAT-002 | MUST | `playerCount` is stored **only when Riot (or the organizer) prints a total**. A count we derive ourselves (for example by summing a Legend table) MUST NOT be stored; the field is `null`. For RC Europe the 307 / 96 figures are derived from Riot's Legend table, so `playerCount` is `null` until a printed total is found (BLOCKED: needs research). | [[Tournament Results]] (conflicts: "derived" counts); ADR-0003 |
| CAT-003 | MUST | `format` is one of the format IDs defined by SPEC-002 (MVP: `standard-constructed` only). Events in other formats (Limited, 2v2, the World Showcase 3-deck format) MUST NOT be imported in MVP. | [[Formats]] |
| CAT-004 | MUST | `type` uses Riot's own tier wording. It is a label only and MUST NOT be used as a weight, score or sort key other than the tie-break in CAT-030. | ADR-0003 |
| CAT-005 | SHOULD | `region` uses the region names Riot uses in its articles (`Europe`, `North America`, `APAC`, ...). | [[Tournament Results]] |

### Decklist model
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-010 | MUST | Each decklist belongs to exactly one event (`eventId`) and has: `id`, `publishedRank` (integer, as published), `placingLabel` (string, as published), `pilot` (as published), `legend`, `champion`, `mainDeck`, `runes`, `battlefields`, `sideboard`, `format` (same as the event's), `sourceUrl`, `capturedAsOf`. | [[Tournament Results]]; [[Collection Import Formats]] |
| CAT-011 | MUST | `placingLabel` is copied exactly as published. For RC Europe it is the ordinal of Riot's Overall Ranking (`1st` … `8th`). The app MUST NOT re-bucket a rank into a bracket Riot did not publish (e.g. MUST NOT show `Top 4` for #3 when the article states no bracket). | [[Tournament Results]] (conflicts: no bracket stated); ADR-0003 |
| CAT-012 | MUST | `pilot` is copied exactly as published, including team tags and casing (e.g. `ASC Evansrhim`, `lets see lol`). It MUST NOT be "corrected", translated or abbreviated. | [[Riot Developer Rules]] rule 8 |
| CAT-013 | MUST | Card entries are `{ cardId, name, qty }` where `name` is the name exactly as published and `cardId` is the playable-card ID from [[Card Data Model]] (SPEC-001). Printings are collapsed to the playable card (copy limits are per name). | [[Deck Construction Rules]] fact 5; [[Collection Import Formats]] |
| CAT-014 | MUST | `mainDeck` holds the Main Deck section **as published (without the Chosen Champion)**; `champion` is a single card entry with `qty: 1`. Consumers that need the 40-card main deck MUST add the champion. | Decklist notes ("39 non-champion cards as published"); [[Deck Construction Rules]] fact 3–4 |
| CAT-015 | MUST | `legend` and `champion` are stored as card entries (`cardId` + published name). | [[Deck Construction Rules]] |
| CAT-016 | MUST NOT | A decklist MUST NOT store a legality verdict as source data. Current legality is **computed** at read time (or on every ban-list change) by SPEC-002 and exposed as `legality` (see Data contract). A cached verdict MAY exist only if it carries the ban-list version it was computed against and is recomputed when that version changes. | [[Ban List]]; [[Deck Legality]] |
| CAT-017 | MUST | Each decklist exposes `legality.checkedAsOf` (the `legal_as_of` date: the date of the ban list it was checked against) and `legality.bannedCards`: every card, legend or battlefield in the list that is banned in its format, each with `bannedSince` (the ban's effective date from SPEC-002). | [[Ban List]]; board item H-006 |
| CAT-018 | SHOULD | Each decklist also exposes `legality.legalAtEvent` (whether it was legal under the ban list in effect on the event's `startDate`), computed by SPEC-002. For RC Europe all 8 lists were legal at the event (the Radiance wave took effect 2026-11-23). | [[Ban List]] |
| CAT-019 | MAY | Domains MAY be shown, but only when derived from the Legend's Domain Identity via card data (SPEC-001), never typed by hand. | [[Deck Construction Rules]] fact 2 |

### Storage: `data/events/*.json`
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-020 | MUST | One JSON file per event at `data/events/<event-id>.json`, matching the `EventFile` shape below, with `schemaVersion: 1`. The event and all its decklists live in that file. Access goes through a storage interface (no host-specific features). | Spec Index cross-cutting constraints; [[ADR-0004 Hosting (Deferred)]] |
| CAT-021 | MUST | `event.id` is `<YYYY-MM>-<short-slug>` from the start date (e.g. `2026-11-rc-europe`) and equals the file name. Decklist `id` is `<event-id>-<publishedRank>` (e.g. `2026-11-rc-europe-4`). If two lists share a rank, append `-<n>` in published order. | — (naming convention) |
| CAT-022 | MUST | A loader validates every file against the schema at startup/build and fails loudly (file, decklist id, field) on: missing required field, unknown card name (no `cardId`), `format` mismatch between event and decklist, duplicate decklist `id`, or `publishedRank` outside 1..N. | — |
| CAT-023 | MUST NOT | Event files MUST NOT contain any metagame statistic (see Definitions), including Riot's Legend/registration share tables, Day-2 conversion, or "best-of per Legend" annotations beyond the decklists themselves. | ADR-0003; V-010 |
| CAT-024 | MUST NOT | Card images and card text MUST NOT be copied into event files; only `cardId` + published name. Images come from the Riot API via SPEC-001. | [[Riot Developer Rules]] rule 7 |

### Converting Riot decklist text into data
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-025 | MUST | Import is a **curated, manual step**: a maintainer pastes Riot decklist text (plus event metadata) into an import tool that produces the JSON. Automated scraping of playriftbound.com MUST NOT be built until Riot answers the App Note on decklist sourcing (H-011). | [[Riot Developer Rules]] rules 7, 11 |
| CAT-026 | MUST | The converter recognises the section labels `Legend`, `Champion`, `Main Deck`, `Battlefields`, `Rune Pool`, `Sideboard` (case-insensitive, optional trailing colon), and lines matching `^\s*(\d+)\s*x?\s+(.+?)\s*$` as `<qty> <name>`. Names keep their subtitle after the comma (`Kennen, Storm of Shuriken`). Blank lines are ignored. Any other line is an error reported with its line number. The exact raw layout (label on its own line vs. inline, any "x" suffix) is **BLOCKED: needs research** (a verbatim sample). | [[Collection Import Formats]] fact 1 + conflicts |
| CAT-027 | MUST | Section mapping: `Legend` → `legend`, `Champion` → `champion`, `Main Deck` → `mainDeck`, `Rune Pool` → `runes`, `Battlefields` → `battlefields`, `Sideboard` → `sideboard` (empty list if absent). Repeated names within a section are summed. | [[Collection Import Formats]] |
| CAT-028 | MUST | Each name is resolved to a `cardId` through SPEC-001 name lookup (exact, then normalised for apostrophes/whitespace/case). An unresolved name blocks the import with an error listing every unresolved name; the converter MUST NOT guess. | [[Collection Import Formats]] (conflicts) |
| CAT-029 | MUST | The converter checks published structure and **reports** discrepancies as warnings without changing the list: Legend = 1, Champion = 1, Main Deck + Champion = 40, Runes = 12, Battlefields = 3 unique, Sideboard ≤ 10, ≤ 3 per name across champion + main + sideboard. The data is stored as published; a warning is shown to the maintainer for manual verification against the source. Full legality is SPEC-002's job. | [[Deck Construction Rules]] validation checklist |

### Display
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-030 | MUST | The catalog lists events **newest first** by `endDate` descending, then `startDate` descending, then `name` ascending. | ADR-0003 (recency) |
| CAT-031 | MUST | Within an event, decklists are ordered by `publishedRank` ascending, then by order of appearance in the source. | ADR-0003 |
| CAT-032 | MUST | Each decklist row shows: placing label with event name (e.g. `1st, Regional Championship: Europe`), pilot, Legend, Champion, and the event's dates and region. The event header shows name, type, dates, region, location, player count (only if stored), format and a link to the source article. | ADR-0003 |
| CAT-033 | MUST | All published decklists for the event are shown (the full Top 8 or whatever cut Riot published), not only the winner. | ADR-0003 |
| CAT-034 | MUST | The deck detail view shows Legend, Champion, Main Deck, Rune Pool, Battlefields and Sideboard as separate sections with quantities, using card names and images from SPEC-001. | [[Deck Construction Rules]] |
| CAT-035 | MUST | Wording honours players: neutral or celebratory labels only. No negative framing of any placing or pilot (e.g. never "only 8th", "lost", "worst"). | [[Riot Developer Rules]] rule 8 |
| CAT-036 | MUST | Each event shows the source attribution ("Decklists as published by Riot, <article title>, <date>") with a link to the source URL, plus the app's Legal Jibber Jabber notice elsewhere per cross-cutting constraints. The UI MUST NOT use Riot branding or the word "official" to describe our app. | [[Riot Developer Rules]] rules 5, 6 |

### Historical (now-illegal) decklists
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-040 | MUST | Historical decklists stay in the catalog and are shown in their event's Top 8 in their published position. They are never deleted or hidden from the catalog because of a later ban. | [[Tournament Results]] ("keep as historical/reference data"); ADR-0003 |
| CAT-041 | MUST | A historical decklist shows a clear label: `Contains cards banned since <date>` where `<date>` is the **earliest** `bannedSince` among its banned cards, formatted as a date (e.g. `Contains cards banned since 23 Nov 2026`). Deck detail lists each banned card with its own date and highlights it in the card list. | [[Ban List]] |
| CAT-042 | MUST | In "Your decks" (SPEC-005), historical decklists are **excluded by default**. The view offers a visible toggle **"Include decks with banned cards"** (default off). When on, historical decks appear with the CAT-041 label and are sorted by the same rules as legal decks (SPEC-005). | Decision in this spec (see Rationale) |
| CAT-043 | MUST | When the default "Your decks" view is empty because every catalog deck is historical (true for MVP data as of 2026-11-23), it shows an explanatory empty state, e.g. "All tournament decks currently in the catalog contain cards banned since <date>" (23 Nov 2026 today), with a one-click action that turns the toggle on. It MUST NOT appear as an error or as "no decks exist". | [[Tournament Results]] ("All 8 contain cards banned") |
| CAT-044 | SHOULD | The toggle state persists for the session (and locally between visits, if SPEC-005 keeps preferences). | — |

**Rationale for CAT-042.** The question "Your decks" means decks you can play now in the
selected format; offering an illegal list by default would mislead a first-time player into buying
cards for a deck they can't register (TR 601.2.d, [[Deck Construction Rules]] fact 10). Hiding them
completely would also be wrong: historical lists are still useful as a starting point for a legal
rebuild, and as of 2026-11-23 every list in the catalog is historical, so a hard exclusion would
leave the core MVP view permanently empty. Default-off with an obvious toggle and an explanatory
empty state (CAT-043) gives the correct default and keeps the data reachable.

### Duplicate lists
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-050 | MUST | Two decklists at the same event are **identical** when legend, champion, and the multisets of main deck, runes, battlefields and sideboard (by `cardId` and qty) are all equal. Both are kept, each under its own pilot and rank. | [[Tournament Results]] (conflicts: #4 and #6 identical) |
| CAT-051 | MUST | The converter/loader computes identical lists and records the link on each (`identicalTo: [<other decklist ids>]`), and also keeps a maintainer note field `sourceNote` (e.g. "Riot's article shows this list identical to #6; possible publishing error"). | same |
| CAT-052 | MUST | The deck detail view shows a neutral notice on each member: "Riot's published list for this player is identical to <placing label> (<pilot>)." It MUST NOT suggest either player copied the other or that the list is wrong. | [[Riot Developer Rules]] rule 8 |
| CAT-053 | SHOULD | SPEC-005 treats identical lists as separate catalog entries (each shown with its own placing) but MAY group them visually. Matching results are per decklist. | — |

### ADR-0003 prohibitions
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-060 | MUST NOT | The catalog (data, API, UI) MUST NOT compute, store or display play rates, win rates, match records, matchup data, tier lists or tier labels, archetype or Legend shares, "meta score", strength score, popularity, or trends. | ADR-0003; V-010 |
| CAT-061 | MUST NOT | The catalog MUST NOT aggregate across decklists to produce counts such as "4 Riven, 3 Kennen, 1 Kai'Sa in the Top 8", "most played card", or Legend filters that show counts. Filtering by Legend MAY exist only without counts. | ADR-0003 ("archetype shares") |
| CAT-062 | MUST NOT | `publishedRank` and `type` MUST NOT be turned into a numeric weight or score used to rank decks across events. They are labels and the within-event order only (CAT-031). | ADR-0003 ("placing is shown as a label") |
| CAT-063 | MUST NOT | The API MUST NOT expose endpoints or fields that return aggregate statistics over the catalog (e.g. `/stats`, `legendShare`, `cardPlayRate`). | ADR-0003; V-010 |
| CAT-064 | MUST NOT | The catalog MUST NOT rank or rate players (no player ratings, leaderboards, or cumulative points). | [[Riot Developer Rules]] rule 9 |

## Data contract
```ts
// shapes only; no implementation. File: data/events/<event-id>.json

type ISODate = string;              // 'YYYY-MM-DD'
type FormatId = 'standard-constructed'; // MVP; full list owned by SPEC-002
type CardId = string;               // playable-card id, SPEC-001

interface CardEntry {
  cardId: CardId;
  name: string;                     // exactly as published by the source
  qty: number;                      // >= 1
}

interface TournamentEvent {
  id: string;                       // '2026-11-rc-europe' (CAT-021)
  name: string;                     // as Riot names it
  type: 'Regional Qualifier' | 'Regional Championship' | 'World Showcase' | string;
  startDate: ISODate;
  endDate: ISODate;
  region: string;                   // 'Europe'
  location: string | null;          // 'Messe Stuttgart, Stuttgart'
  playerCount: number | null;       // printed totals only (CAT-002)
  format: FormatId;
  sourceUrls: string[];             // >= 1
  capturedAsOf: ISODate;
}

interface CatalogDecklist {
  id: string;                       // '2026-11-rc-europe-4'
  eventId: string;
  publishedRank: number;            // as published, 1..N
  placingLabel: string;             // as published: '1st' ... '8th'
  pilot: string;                    // as published
  legend: CardEntry;                // qty 1
  champion: CardEntry;              // qty 1, the Chosen Champion
  mainDeck: CardEntry[];            // as published, WITHOUT the champion (CAT-014)
  runes: CardEntry[];
  battlefields: CardEntry[];
  sideboard: CardEntry[];           // [] if none
  format: FormatId;                 // equals event.format
  sourceUrl: string;
  capturedAsOf: ISODate;
  identicalTo: string[];            // CAT-051, computed by converter; [] if none
  sourceNote: string | null;        // maintainer note, neutral wording
}

interface EventFile {
  schemaVersion: 1;
  event: TournamentEvent;
  decklists: CatalogDecklist[];
}

// Computed by SPEC-002 at read time; never stored as source data (CAT-016)
interface BannedCardRef {
  cardId: CardId;
  name: string;
  kind: 'card' | 'battlefield' | 'legend';
  bannedSince: ISODate;             // effective date of the ban
}
interface DecklistLegality {
  checkedAsOf: ISODate;             // legal_as_of: date of the ban list used
  banListVersion: string;           // SPEC-002 identifier
  legalNow: boolean;
  legalAtEvent: boolean | null;     // CAT-018
  bannedCards: BannedCardRef[];     // empty when legalNow
  bannedSinceEarliest: ISODate | null; // drives the CAT-041 label
}

// API read model (exact endpoints owned by [[API Contracts]])
interface CatalogDecklistView extends CatalogDecklist {
  legality: DecklistLegality;
}
interface CatalogEventView {
  event: TournamentEvent;
  decklists: CatalogDecklistView[]; // ordered per CAT-031
}
// GET catalog -> CatalogEventView[] ordered per CAT-030. No aggregate fields (CAT-063).
```

### Example file (abridged): `data/events/2026-11-rc-europe.json`
```json
{
  "schemaVersion": 1,
  "event": {
    "id": "2026-11-rc-europe",
    "name": "Regional Championship: Europe",
    "type": "Regional Championship",
    "startDate": "2026-11-06",
    "endDate": "2026-11-08",
    "region": "Europe",
    "location": "Messe Stuttgart, Stuttgart",
    "playerCount": null,
    "format": "standard-constructed",
    "sourceUrls": ["https://playriftbound.com/en-us/news/organizedplay/best-ofs-for-the-european-championship"],
    "capturedAsOf": "2026-11-23"
  },
  "decklists": [
    {
      "id": "2026-11-rc-europe-1",
      "eventId": "2026-11-rc-europe",
      "publishedRank": 1,
      "placingLabel": "1st",
      "pilot": "ASC Evansrhim",
      "legend": { "cardId": "<SPEC-001>", "name": "Kennen, Heart of the Tempest", "qty": 1 },
      "champion": { "cardId": "<SPEC-001>", "name": "Kennen, Storm of Shuriken", "qty": 1 },
      "mainDeck": [ { "cardId": "<SPEC-001>", "name": "Nocturne, Horrifying", "qty": 3 } ],
      "runes": [ { "cardId": "<SPEC-001>", "name": "Chaos Rune", "qty": 9 },
                 { "cardId": "<SPEC-001>", "name": "Order Rune", "qty": 3 } ],
      "battlefields": [ { "cardId": "<SPEC-001>", "name": "Minefield", "qty": 1 } ],
      "sideboard": [],
      "format": "standard-constructed",
      "sourceUrl": "https://playriftbound.com/en-us/news/organizedplay/best-ofs-for-the-european-championship",
      "capturedAsOf": "2026-11-23",
      "identicalTo": [],
      "sourceNote": null
    }
  ]
}
```
(`mainDeck`, `battlefields`, `sideboard` abridged; real files carry every line from the source.)

## Acceptance criteria
Data below is the RC Europe Top 8 from [[Tournament Results]] and the 8 notes in `01-Research/Decklists/`.

1. **Event fields.** **Given** the RC Europe source article and metadata, **When** the maintainer imports it,
   **Then** `data/events/2026-11-rc-europe.json` has `type: "Regional Championship"`, `startDate: "2026-11-06"`,
   `endDate: "2026-11-08"`, `region: "Europe"`, `format: "standard-constructed"`, `playerCount: null`
   (307 is derived, CAT-002), and 8 decklists.
2. **Rank and label as published.** **Given** DiamondHat is #3 in Riot's Overall Ranking, **When** the catalog
   renders, **Then** the row reads `3rd, Regional Championship: Europe`, never `Top 4` (CAT-011).
3. **Pilot names verbatim.** **Given** the #6 pilot is published as `lets see lol`, **When** stored and shown,
   **Then** the name is exactly `lets see lol` (lower case, no edits) (CAT-012).
4. **Order within event.** **Given** the 8 RC Europe lists, **When** the event is shown, **Then** the order is
   ASC Evansrhim (1st), Sonecon (2nd), DiamondHat (3rd), BQO Caravaggio (4th), CTCG DZiden (5th),
   lets see lol (6th), HXN Gonkra (7th), On Curve Willy (8th) (CAT-031).
5. **Events newest first.** **Given** RC Europe (ends 2026-11-08) and RQ Los Angeles (ends 2026-09-27) are both
   imported, **When** the catalog renders, **Then** RC Europe is listed first (CAT-030).
6. **Champion separate from main.** **Given** Riot's text for ASC Evansrhim with `Champion: 1 Kennen, Storm of Shuriken`
   and a Main Deck section of 39 cards, **When** converted, **Then** `champion.name` is `Kennen, Storm of Shuriken`,
   `mainDeck` quantities sum to 39, runes sum to 12 (9 Chaos Rune, 3 Order Rune), battlefields are
   Minefield, Veiled Temple, Zaun Warrens, sideboard sums to 10, and no structure warnings are raised (CAT-014, CAT-029).
7. **Unknown name blocks import.** **Given** a pasted line `3 Nocturne Horrifying` (missing comma) that SPEC-001
   cannot resolve, **When** converting, **Then** the import fails listing `Nocturne Horrifying` with its line number,
   and no file is written (CAT-028).
8. **Historical label.** **Given** today is 2026-11-23 and SPEC-002 lists Nocturne, Horrifying and Rhasa the
   Sunderer as banned in Standard from 2026-11-23, **When** ASC Evansrhim's list is shown, **Then** it carries
   `Contains cards banned since 23 Nov 2026`, its detail view highlights Nocturne, Horrifying (3) and Rhasa the
   Sunderer (3), `legality.legalNow` is false, `legality.legalAtEvent` is true, and it still appears 1st in the event (CAT-040, CAT-041, CAT-018).
9. **Banned battlefields count too.** **Given** Sonecon's list includes battlefields Emperor's Dais and Star Spring,
   **When** legality is computed, **Then** `bannedCards` includes them with `kind: "battlefield"` alongside
   the Chosen Champion Riven, Broken Blade, plus Stellacorn Herder and Zhonya's Hourglass: 5 entries, each listed once with `bannedSince: "2026-11-23"` (CAT-017).
10. **Default exclusion and empty state.** **Given** all 8 catalog lists are historical and a user has imported a
    collection, **When** they open "Your decks" with the toggle off, **Then** no decks are listed and the
    CAT-043 empty state with "Include decks with banned cards" is shown. **When** they turn the toggle on, **Then**
    all 8 lists appear, each labelled per CAT-041.
11. **Identical lists kept and flagged.** **Given** BQO Caravaggio (#4) and lets see lol (#6) have identical
    legend, champion, main, runes, battlefields and sideboard, **When** imported, **Then** both decklists exist,
    `2026-11-rc-europe-4.identicalTo = ["2026-11-rc-europe-6"]` and vice versa, and each detail view shows the
    neutral CAT-052 notice naming the other placing and pilot.
12. **Not identical.** **Given** DiamondHat (#3) and BQO Caravaggio (#4) share Legend and Champion but differ
    (e.g. battlefields include Emperor's Dais vs. Rakelstake), **When** imported, **Then** neither has the other in
    `identicalTo` (CAT-050).
13. **No metagame statistics (V-010).** **Given** the RC Europe file, **When** V-010 greps `data/`, the API contract
    and the UI, **Then** there are no fields or text for play rate, win rate, matchups, tiers, shares, meta score,
    or counts such as "4 Riven" / "43% Riven", and Riot's Legend registration table is not stored (CAT-023, CAT-060–063).
14. **No re-weighting.** **Given** a 1st-place list from an RQ and a 5th-place list from an RC, **When** "Decks I can
    build" sorts them, **Then** order is decided only by SPEC-005 rules (completion %, then event recency), never by
    rank or event type (CAT-062).

## Out of scope
- Matching against collections and sorting "Your decks" (SPEC-005, [[Build Matching]]).
- The legality rules and ban-list data themselves (SPEC-002, [[Deck Legality]]).
- Card identity, names, images (SPEC-001, [[Card Data Model]]).
- Limited, 2v2 and World Showcase multi-deck events (later; CAT-003).
- Automated ingestion or scraping of Riot articles (CAT-025).
- Swiss records, match results, brackets beyond the published placing.

## Open questions / BLOCKED
- **BLOCKED: needs research:** a verbatim copy of Riot's decklist text (exact label lines, spacing, any `x`
  quantity suffix) to finalise CAT-026 parser rules.
- **BLOCKED: needs research:** a printed RC Europe player total (CAT-002). Until then `playerCount: null`.
- **BLOCKED: needs research:** Riot's exact event name. Research uses "Regional Championship: Europe" (notes) and
  Riot's article title says "European Championship". The example uses the former; confirm the official name.
- **BLOCKED: needs research:** whether Riot published a bracket (Top 4 / Top 8 split) for RC Europe. If it did,
  `placingLabel` may need to follow Riot's own label instead of the ordinal (CAT-011).
- **BLOCKED (policy):** whether copying decklists from Riot's articles is allowed (Riot Developer Rules rule 7,
  gray area; App Note via H-011). CAT-025 keeps import manual until answered.
- **Depends on SPEC-002:** ban-list versioning, `bannedSince` dates, `legalAtEvent`, regional ban lists. Regional
  (KR/TW) lists are out of MVP; catalog legality uses the global Standard list.
- **Research note mismatch:** the 8 decklist notes store `placing` as a bucket (1, 2, 4, 8), which conflicts with
  CAT-011. The importer MUST take `publishedRank` from Riot's ranking (recorded in each note's Notes section and
  file name), not from the `placing` bucket. Suggest researcher adds a `rank:` field.
- **RQ lists** (LA, Singapore, earlier) are not captured yet; the RQ table is mostly creator-tier.
- Question for RJ: is the default-off toggle wording "Include decks with banned cards" acceptable (CAT-042)?

## Changelog
- 0.1 (2026-11-23): draft. Event and decklist models, JSON storage, Riot text conversion, display order,
  historical-list handling (default excluded from "Your decks" with toggle), duplicate handling,
  ADR-0003 prohibitions.
