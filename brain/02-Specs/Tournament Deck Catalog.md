---
tags: [spec]
id: SPEC-004
version: 0.3
status: draft
depends_on: [SPEC-001, SPEC-002, SPEC-006]
research: ["[[Tournament Results]]", "[[Ban List]]", "[[Formats]]", "[[Riot Developer Rules]]", "[[Collection Import Formats]]", "[[Deck Construction Rules]]"]
decisions: ["[[ADR-0003 Tournament Results Only]]", "[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]", "[[ADR-0001 Tech Stack]]", "[[ADR-0004 Hosting (Deferred)]]"]
as_of: 2026-11-23
---
# SPEC-004: Tournament Deck Catalog

## Purpose
Store and show **published tournament results**: each premier event and the **full Top 8 (or
whatever top cut Riot publishes)** with each decklist, labelled with its placing exactly as
published, plus the event, date(s) and region. The catalog is shown on its own **Tournaments**
screen. Per [[ADR-0006 Two Imports - Collection and Decks]] tournament decks are **not** part of
"Your decks" ([[Your Decks Ownership View]], SPEC-005); a user brings one in only with the one-click
**"Add to Your decks"** action, which copies it as if imported via [[Deck Import]] (SPEC-006).
Per [[ADR-0003 Tournament Results Only]] the catalog contains **no metagame statistics of any kind**,
stored or shown. Legality of each list is **computed** by [[Deck Legality]] (SPEC-002) as a
`LegalityResult` and is never hand-maintained in the app data.

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
- **Historical decklist**: a catalog decklist for which SPEC-002's ban rule **LEGAL-016 fails as of
  today** (it contains a card, battlefield or Legend banned after the event). Other rule failures or
  `incomplete` verdicts do not make a list historical.
- **Tournaments screen**: the screen that shows the catalog (events and their Top 8).
- **Your decks**: the user's own deck list (SPEC-005/SPEC-006), stored in the browser. It never
  lists catalog decklists automatically ([[ADR-0006 Two Imports - Collection and Decks]]).
- **Tournament deck copy**: a deck in Your decks created by "Add to Your decks" (CAT-070…CAT-077).
- **Riot decklist text**: Riot's sectioned decklist layout (Legend / Champion / Main Deck /
  Battlefields / Rune Pool / Sideboard, each followed by `<qty> <name>` lines). See
  [[Collection Import Formats]] fact 1.
- **Metagame statistic**: any number or label derived by aggregating across decklists, events or
  players: play rate, win rate, matchup data, tier, archetype or Legend share, counts of a Legend
  in a Top 8, "meta score", trend. Prohibited by [[ADR-0003 Tournament Results Only]] and check V-010.

## Requirements

### Event model
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-001 | MUST | Each event record has: `id` (stable slug), `name` (as Riot names it), `type` (Riot's tier name), `startDate` and `endDate` (ISO dates; equal for one-day events), `region`, `location` (venue and/or city as published, nullable), `format`, `sourceUrls` (at least one, the article the lists were copied from), `capturedAsOf` (date the data was copied). | [[Tournament Results]] |
| CAT-002 | MUST | `playerCount` is stored **only when Riot (or the organizer) prints a total**. A count we derive ourselves (for example by summing a Legend table) MUST NOT be stored; the field is `null`. For RC Europe the 307 / 96 figures are derived from Riot's Legend table, so `playerCount` is `null` until a printed total is found (BLOCKED: needs research). | [[Tournament Results]] (conflicts: "derived" counts); [[ADR-0003 Tournament Results Only]] |
| CAT-003 | MUST | `format` is one of the format IDs defined by SPEC-002 (MVP: `standard` only). Events in other formats (Limited, 2v2, the World Showcase 3-deck format) MUST NOT be imported in MVP. | [[Formats]] |
| CAT-004 | MUST | `type` uses Riot's own tier wording. It is a label only and MUST NOT be used as a weight, score or sort key (event order is by date only, CAT-030). | [[ADR-0003 Tournament Results Only]] |
| CAT-005 | SHOULD | `region` uses the region names Riot uses in its articles (`Europe`, `North America`, `APAC`, ...). | [[Tournament Results]] |

### Decklist model
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-010 | MUST | Each decklist belongs to exactly one event (`eventId`) and has: `id`, `publishedRank` (integer, as published), `placingLabel` (string, as published), `pilot` (as published), `legend`, `champion`, `mainDeck`, `runes`, `battlefields`, `sideboard`, `format` (same as the event's), `sourceUrl`, `capturedAsOf`. | [[Tournament Results]]; [[Collection Import Formats]] |
| CAT-011 | MUST | `placingLabel` is copied exactly as published. For RC Europe it is the ordinal of Riot's Overall Ranking (`1st` … `8th`). The app MUST NOT re-bucket a rank into a bracket Riot did not publish (e.g. MUST NOT show `Top 4` for #3 when the article states no bracket). | [[Tournament Results]] (conflicts: no bracket stated); [[ADR-0003 Tournament Results Only]] |
| CAT-012 | MUST | `pilot` is copied exactly as published, including team tags and casing (e.g. `ASC Evansrhim`, `lets see lol`). It MUST NOT be "corrected", translated or abbreviated. | [[Riot Developer Rules]] rule 8 |
| CAT-013 | MUST | Card entries are `{ cardKey, name, qty }` where `name` is the name exactly as published and `cardKey` is the playable-card key from [[Card Data Model]] (SPEC-001 CARD-012: the `nameKey` of the canonical name). There is no separate playable-card id. Printings are collapsed to the playable card (copy limits are per name). | [[Deck Construction Rules]] fact 5; [[Collection Import Formats]]; [[Card Data Model]] |
| CAT-014 | MUST | `mainDeck` holds the Main Deck section **as published (without the Chosen Champion)**; `champion` is a single card entry with `qty: 1`. Consumers that need the 40-card main deck MUST add the champion. | Decklist notes ("39 non-champion cards as published"); [[Deck Construction Rules]] fact 3–4 |
| CAT-015 | MUST | `legend` and `champion` are stored as card entries (`cardKey` + published name). | [[Deck Construction Rules]] |
| CAT-016 | MUST NOT | A decklist MUST NOT store a legality verdict as source data. Legality is **computed** at read time (or on every ban-data or catalog change) by SPEC-002 and exposed as `legality` (see CAT-045 and Data contract). A cached result MAY exist only if it carries the `asOf`, `banListDataVersion` and `catalogVersion` it was computed with and is recomputed when any of them changes. | [[Ban List]]; [[Deck Legality]] |
| CAT-017 | MUST | Each decklist exposes `legality.asOf` (the **check date**: the date SPEC-002 evaluated the list for, usually today), `legality.banListDataVersion`, `legality.catalogVersion`, `legality.verdict` (SPEC-002 `LegalityResult.verdict` as of the check date) and `legality.bannedCards`: one entry per LEGAL-016 violation as of the check date (card, Legend or battlefield), each with `cardKey`, published `name`, `kind`, `zone` and `bannedSince` (= the violation's `effectiveDate`). `kind` is not carried by SPEC-002 `Violation`; it is looked up from `data/banlist.json`: call SPEC-002 `banStatus(cardKey, 'standard', 'global', asOf)` (LEGAL-B10), take the wave it names (`waveId`), and use the `kind` of that wave's `add` entry whose `nameKey(name)` equals the `cardKey` (LEGAL-B01, LEGAL-B05 guarantee exactly one such entry of the matching kind). **`legal_as_of` is not `asOf`:** in research notes `legal_as_of` is the date the published list is known to have been legal, which is the event's `startDate` (the list was registered and played then); it is the date `legalAtEvent` is checked at (CAT-018). The app always computes current legality itself (SPEC-002, as of the check date) and never stores a "legal now" value; the importer MUST NOT map a note's `legal_as_of` to any stored legality field (CAT-016). | [[Ban List]]; [[Deck Legality]] LEGAL-016, LEGAL-B01, LEGAL-B05, LEGAL-B10, LEGAL-R04; board items H-006, H-016, H-035, H-037 |
| CAT-018 | SHOULD | Each decklist also exposes `legality.legalAtEvent`: the status of **LEGAL-016 only** evaluated with `asOf` = the event's `startDate` (= the research notes' `legal_as_of`, CAT-017) (`pass` → `true`, `fail` → `false`, `not_evaluated` → `null`). It answers "no banned cards at the event"; it is not the full verdict at the event. For RC Europe all 8 lists give `true` (the Radiance wave took effect 2026-11-23). | [[Ban List]]; [[Deck Legality]] LEGAL-016 |
| CAT-019 | MAY | Domains MAY be shown, but only when derived from the Legend's Domain Identity via card data (SPEC-001), never typed by hand. | [[Deck Construction Rules]] fact 2 |

### Storage: `data/events/*.json`
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-020 | MUST | One JSON file per event at `data/events/<event-id>.json`, matching the `EventFile` shape below, with `schemaVersion: 1`. The event and all its decklists live in that file. Access goes through a storage interface (no host-specific features). | Spec Index cross-cutting constraints; [[ADR-0004 Hosting (Deferred)]] |
| CAT-021 | MUST | `event.id` is `<YYYY-MM>-<short-slug>` from the start date (e.g. `2026-11-rc-europe`) and equals the file name. Decklist `id` is `<event-id>-<publishedRank>` (e.g. `2026-11-rc-europe-4`). If two lists share a rank, append `-<n>` in published order. Design rule (naming convention in this spec); start dates from [[Tournament Results]] |
| CAT-022 | MUST | A loader validates every file against the schema at startup/build and fails loudly (file, decklist id, field) on: missing required field, unknown card name (no `cardKey`), `format` mismatch between event and decklist, duplicate decklist `id`, or `publishedRank` outside 1..N. | Design rule (fail-loud data checks, as SPEC-002 LEGAL-B05 does for the ban list); [[ADR-0005 MVP Product Defaults]] decision 4 (unknown names are errors, never guessed) |
| CAT-023 | MUST NOT | Event files MUST NOT contain any metagame statistic (see Definitions), including Riot's Legend/registration share tables, Day-2 conversion, or "best-of per Legend" annotations beyond the decklists themselves. | [[ADR-0003 Tournament Results Only]]; V-010 |
| CAT-024 | MUST NOT | Card images and card text MUST NOT be copied into event files; only `cardKey` + published name. Images come from the Riot API via SPEC-001. | [[Riot Developer Rules]] rule 7 |

### Converting Riot decklist text into data
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-025 | MUST | Import is a **curated, manual step**: a maintainer pastes Riot decklist text (plus event metadata) into an import tool that produces the JSON. Automated scraping of playriftbound.com MUST NOT be built until Riot answers the App Note on decklist sourcing (H-011). | [[Riot Developer Rules]] rules 7, 11 |
| CAT-026 | MUST | The converter recognises the section labels `Legend`, `Champion`, `Main Deck`, `Battlefields`, `Rune Pool`, `Sideboard` (case-insensitive, optional trailing colon), and lines matching `^\s*(\d+)\s*x?\s+(.+?)\s*$` as `<qty> <name>`. Names keep their subtitle after the comma (`Kennen, Storm of Shuriken`). Blank lines are ignored. Any other line is an error reported with its line number. The exact raw layout (label on its own line vs. inline, any "x" suffix) is **BLOCKED: needs research** (a verbatim sample). | [[Collection Import Formats]] fact 1 + conflicts |
| CAT-027 | MUST | Section mapping: `Legend` → `legend`, `Champion` → `champion`, `Main Deck` → `mainDeck`, `Rune Pool` → `runes`, `Battlefields` → `battlefields`, `Sideboard` → `sideboard` (empty list if absent). Repeated names within a section are summed. | [[Collection Import Formats]] |
| CAT-028 | MUST | Each name is resolved to a `cardKey` by exact lookup of `nameKey(name)` (SPEC-001 CARD-030, CARD-033), which already ignores case, punctuation (including commas), apostrophe/dash variants, accents and extra spaces. A name with no exact `nameKey` match blocks the import with an error listing every unresolved name and its line number; the converter MUST NOT guess, fuzzy-match or use an alias table ([[ADR-0005 MVP Product Defaults]] decision 4). | [[Collection Import Formats]] (conflicts); [[Card Data Model]] CARD-030 |
| CAT-029 | MUST | The converter checks published structure and **reports** discrepancies as warnings without changing the list: Legend = 1, Champion = 1, Main Deck + Champion = 40, Runes = 12, Battlefields = 3 unique, Sideboard ≤ 10, ≤ 3 per name across champion + main + sideboard. The data is stored as published; a warning is shown to the maintainer for manual verification against the source. Full legality is SPEC-002's job. | [[Deck Construction Rules]] validation checklist |

### Display
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-030 | MUST | The Tournaments screen lists events **newest first** by `endDate` descending, then `startDate` descending, then `name` ascending. | [[ADR-0003 Tournament Results Only]] (recency); [[ADR-0006 Two Imports - Collection and Decks]] (Tournaments) |
| CAT-031 | MUST | Within an event, decklists are ordered by `publishedRank` ascending, then by order of appearance in the source. | [[ADR-0003 Tournament Results Only]] |
| CAT-032 | MUST | Each decklist row shows: placing label with event name (e.g. `1st, Regional Championship: Europe`), pilot, Legend, Champion, the event's dates and region, the legality label per CAT-045, and the "Add to Your decks" action (CAT-070). The event header shows name, type, dates, region, location, player count (only if stored), format and a link to the source article. | [[ADR-0003 Tournament Results Only]] |
| CAT-033 | MUST | All published decklists for the event are shown (the full Top 8 or whatever cut Riot published), not only the winner. | [[ADR-0003 Tournament Results Only]] |
| CAT-034 | MUST | The deck detail view shows Legend, Champion, Main Deck, Rune Pool, Battlefields and Sideboard as separate sections with quantities, using card names and images from SPEC-001. | [[Deck Construction Rules]] |
| CAT-035 | MUST | Wording honours players: neutral or celebratory labels only. No negative framing of any placing or pilot (e.g. never "only 8th", "lost", "worst"). | [[Riot Developer Rules]] rule 8 |
| CAT-036 | MUST | Each event shows the source attribution ("Decklists as published by Riot, <article title>, <date>") with a link to the source URL, plus the app's Legal Jibber Jabber notice elsewhere per cross-cutting constraints. The UI MUST NOT use Riot branding or the word "official" to describe our app. | [[Riot Developer Rules]] rules 5, 6 |
| CAT-037 | MUST | **Shared display rules** (same wording in SPEC-005, SPEC-006, SPEC-007): every date shown to the user is formatted `MMM D, YYYY` with an English short month, e.g. `Nov 23, 2026` (stored data stays ISO `YYYY-MM-DD`); an event's dates show start and end in that format (one date when equal). An `incomplete` legality verdict is labelled **`Not fully checked`**. | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 decision 7 |

### Historical (now-illegal) decklists
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-040 | MUST | Historical decklists stay in the catalog and are **shown by default** on the Tournaments screen in their event's Top 8 in their published position. They are never deleted, hidden or filtered out by default because of a later ban, and there is no hide toggle. | [[Tournament Results]] ("keep as historical/reference data"); [[ADR-0003 Tournament Results Only]]; [[ADR-0005 MVP Product Defaults]] decision 3 (applies to Tournaments per [[ADR-0006 Two Imports - Collection and Decks]]) |
| CAT-041 | MUST | A historical decklist shows a clear label on the Tournaments screen (row and detail): `Contains cards banned since <date>` where `<date>` is `legality.bannedSinceEarliest` (the **earliest** `bannedSince` among its banned cards), formatted per CAT-037 (e.g. `Contains cards banned since Nov 23, 2026`). Deck detail lists each banned card with its own date and highlights it in the card list. | [[Ban List]]; [[ADR-0005 MVP Product Defaults]] decision 3 |
| CAT-045 | MUST | Legality display maps `legality` as follows, checked in this order: (1) `historical` → the CAT-041 label; (2) else `verdict = illegal` → `Not legal in Standard today` with the failing rule summaries in detail; (3) else `verdict = incomplete` → `Not fully checked` (CAT-037) with SPEC-002's `notEvaluatedReason`s in detail; (4) else `verdict = legal` → `Legal in Standard as of <asOf>` (date per CAT-037, e.g. `Legal in Standard as of Nov 23, 2026`). An `incomplete` verdict MUST NOT be shown as legal, with a legal colour/icon, or omitted silently (SPEC-002 LEGAL-R04). A historical list that is also `incomplete` shows the CAT-041 label plus the incomplete note in detail. | [[Deck Legality]] LEGAL-R04; [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 decision 7 |
| CAT-046 | MUST | `legalAtEvent` is shown in deck detail only, as `No banned cards at the event` (`true`), `Contained cards banned at the event` (`false`) or not shown (`null`). It MUST NOT be worded as "legal at the event" because it covers LEGAL-016 only (CAT-018). | [[Deck Legality]] LEGAL-016 |

**Removed in 0.2:** CAT-042 (hide-by-default toggle in "Your decks"), CAT-043 (empty state with
toggle) and CAT-044 (toggle persistence). Per [[ADR-0006 Two Imports - Collection and Decks]] "Your
decks" does not show tournament decks at all, and per [[ADR-0005 MVP Product Defaults]] decision 3
banned decks are shown by default with a label, now on the Tournaments screen (CAT-040, CAT-041).
The IDs are retired and not reused.

### Duplicate lists
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-050 | MUST | Two decklists at the same event are **identical** when legend, champion, and the multisets of main deck, runes, battlefields and sideboard (by `cardKey` and qty) are all equal. Both are kept, each under its own pilot and rank. | [[Tournament Results]] (conflicts: #4 and #6 identical) |
| CAT-051 | MUST | The converter/loader computes identical lists and records the link on each (`identicalTo: [<other decklist ids>]`), and also keeps a maintainer note field `sourceNote` (e.g. "Riot's article shows this list identical to #6; possible publishing error"). | same |
| CAT-052 | MUST | The deck detail view shows a neutral notice on each member: "Riot's published list for this player is identical to <placing label> (<pilot>)." It MUST NOT suggest either player copied the other or that the list is wrong. | [[Riot Developer Rules]] rule 8 |
| CAT-053 | SHOULD | On the Tournaments screen identical lists stay separate entries, each with its own placing, pilot and "Add to Your decks" action; they MAY be grouped visually. Adding one does not count as adding the other (CAT-074). | [[Tournament Results]] (conflicts: #4 and #6 identical, both kept); design rule for grouping |

### "Add to Your decks"
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-070 | MUST | Every catalog decklist (Tournaments row and deck detail), including historical and `incomplete` ones, has a one-click **"Add to Your decks"** action. One click adds the deck; there is no confirmation dialog and no editing step. | [[ADR-0006 Two Imports - Collection and Decks]] (follow-up decisions) |
| CAT-071 | MUST | The action creates a **new user deck** in Your decks exactly as if the same list had been imported via [[Deck Import]] (SPEC-006): same zones (Legend, Chosen Champion, main without the champion, runes, battlefields, sideboard), same quantities, each card keyed by `cardKey` with its canonical SPEC-001 name. Because every card already has a `cardKey`, SPEC-006's parsing and fuzzy-suggestion steps are skipped and the import cannot fail on names. Format is the decklist's `format` (`standard`). | [[ADR-0006 Two Imports - Collection and Decks]]; [[Deck Import]] |
| CAT-072 | MUST | The user deck records its origin as a `TournamentDeckSource` (Data contract): `kind: "tournament"`, `eventId`, `eventName`, `eventStartDate`, `eventEndDate`, `region`, `decklistId`, `publishedRank`, `placingLabel`, `pilot`, `sourceUrl` (the Riot article) and `addedAt`. `TournamentDeckSource` is the **tournament variant of SPEC-006's `DeckSource`**: SPEC-006 owns the single definition, and the two MUST be identical field for field (no second, diverging shape). | [[ADR-0006 Two Imports - Collection and Decks]] ("event and placing recorded as its source") |
| CAT-073 | MUST | The default deck name is `<Legend>: <pilot> (<placingLabel>, <event name>)`, e.g. `Kennen: ASC Evansrhim (1st, Regional Championship: Europe)`. `<Legend>` is the Legend's canonical name up to the first comma (`Kennen, Heart of the Tempest` → `Kennen`; the whole name if it has no comma), as in RJ's example. Pilot and placing are copied verbatim (CAT-011, CAT-012). The user MAY rename it later (SPEC-006). | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 decision 1; [[Riot Developer Rules]] rule 8 |
| CAT-074 | MUST | **Duplicates.** A decklist is "already added" when Your decks holds a deck whose `source.decklistId` equals its `id`. Then the button reads `In Your decks` and opens that deck, and a separate `Add another copy` link creates a further copy named with a ` (2)`, ` (3)`… suffix. One click on the primary action never creates a second copy. Editing a copy does not change this; deleting every copy makes "Add to Your decks" available again. Identical lists from different pilots (CAT-050) have different ids, so each can be added once on its own. | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 decision 2 |
| CAT-075 | MUST | The copy is independent: later edits to the user deck never change the catalog, and later catalog corrections never change existing copies. No legality is copied; Your decks computes legality and ban status itself via SPEC-002 (SPEC-005). | [[Deck Legality]]; [[ADR-0006 Two Imports - Collection and Decks]] |
| CAT-076 | MUST | After adding, the user sees a neutral confirmation `Added to Your decks` with a link to open the deck. For a historical list the confirmation also shows the CAT-041 label. | [[ADR-0005 MVP Product Defaults]] decision 3 |
| CAT-077 | MUST NOT | The action stores the copy in the browser only ([[ADR-0005 MVP Product Defaults]] decision 1) and MUST NOT send, count or display how many times a deck was added (no popularity data). | [[ADR-0003 Tournament Results Only]]; V-010 |

### ADR-0003 prohibitions
| ID | Level | Requirement | Source |
|---|---|---|---|
| CAT-060 | MUST NOT | The catalog (data, API, UI) MUST NOT compute, store or display play rates, win rates, match records, matchup data, tier lists or tier labels, archetype or Legend shares, "meta score", strength score, popularity, or trends. | [[ADR-0003 Tournament Results Only]]; V-010 |
| CAT-061 | MUST NOT | The catalog MUST NOT aggregate across decklists to produce counts such as "4 Riven, 3 Kennen, 1 Kai'Sa in the Top 8", "most played card", or Legend filters that show counts. Filtering by Legend MAY exist only without counts. | [[ADR-0003 Tournament Results Only]] ("archetype shares") |
| CAT-062 | MUST NOT | `publishedRank` and `type` MUST NOT be turned into a numeric weight or score used to rank decks across events. They are labels and the within-event order only (CAT-031). | [[ADR-0003 Tournament Results Only]] ("placing is shown as a label") |
| CAT-063 | MUST NOT | The API MUST NOT expose endpoints or fields that return aggregate statistics over the catalog (e.g. `/stats`, `legendShare`, `cardPlayRate`). | [[ADR-0003 Tournament Results Only]]; V-010 |
| CAT-064 | MUST NOT | The catalog MUST NOT rank or rate players (no player ratings, leaderboards, or cumulative points). | [[Riot Developer Rules]] rule 9 |

## Data contract
```ts
// shapes only; no implementation. File: data/events/<event-id>.json

type ISODate = string;              // 'YYYY-MM-DD'
type FormatId = 'standard';         // MVP; full list owned by SPEC-002
type CardKey = string;              // PlayableCard.cardKey = nameKey(canonical name), SPEC-001 CARD-012
// LegalityResult, BanKind, Zone: imported from SPEC-002 [[Deck Legality]] (shared types)

interface CardEntry {
  cardKey: CardKey;
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

// Derived from SPEC-002 LegalityResult at read time; never stored as source data (CAT-016)
// now     = evaluate(deck, format: 'standard', region: 'global', asOf: today)
// atEvent = evaluate(deck, format: 'standard', region: 'global', asOf: event.startDate)
interface BannedCardRef {
  cardKey: CardKey;
  name: string;                     // as published in the decklist
  kind: BanKind;                    // SPEC-002 BanEntry.kind: looked up in banlist.json via banStatus() waveId (CAT-017)
  zone: Zone;                       // SPEC-002 Violation.zone
  bannedSince: ISODate;             // Violation.effectiveDate
  banWaveId: string;                // Violation.banWaveId
}
interface DecklistLegality {
  asOf: ISODate;                    // = now.asOf: the check date, usually today (NOT the notes' legal_as_of); was checkedAsOf in 0.1
  banListDataVersion: string;       // = now.banListDataVersion; was banListVersion in 0.1
  catalogVersion: string;           // = now.catalogVersion
  verdict: 'legal' | 'illegal' | 'incomplete'; // = now.verdict; replaces legalNow
  historical: boolean;              // LEGAL-016 status in now.rules === 'fail'
  legalAtEvent: boolean | null;     // LEGAL-016 in atEvent.rules: pass→true, fail→false, not_evaluated→null (CAT-018)
  bannedCards: BannedCardRef[];     // one per LEGAL-016 violation in now; [] unless historical
  bannedSinceEarliest: ISODate | null; // min(bannedCards[].bannedSince); drives the CAT-041 label
  result: LegalityResult;           // the full `now` result, for per-rule detail (CAT-045)
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

// "Add to Your decks" (CAT-072): the tournament variant of SPEC-006's DeckSource.
// SPEC-006 owns the single definition; it must be identical to this field for field.
// Stored in the browser with the user deck (ADR-0005); never sent to a server.
interface TournamentDeckSource {
  kind: 'tournament';
  eventId: string;                  // '2026-11-rc-europe'
  eventName: string;                // 'Regional Championship: Europe'
  eventStartDate: ISODate;
  eventEndDate: ISODate;
  region: string;
  decklistId: string;               // '2026-11-rc-europe-1'; duplicate key (CAT-074)
  publishedRank: number;            // 1
  placingLabel: string;             // '1st'
  pilot: string;                    // 'ASC Evansrhim'
  sourceUrl: string;                // Riot article
  addedAt: string;                  // ISO date-time of the click
}
```

### DecklistLegality ↔ LegalityResult mapping
| `DecklistLegality` field | From SPEC-002 | Notes |
|---|---|---|
| `asOf` | `now.asOf` (the check date, usually today) | renamed from 0.1 `checkedAsOf`; not stored anywhere. Not the research notes' `legal_as_of` (= event `startDate`, see `legalAtEvent`) |
| `banListDataVersion` | `now.banListDataVersion` | renamed from 0.1 `banListVersion` |
| `catalogVersion` | `now.catalogVersion` | SPEC-001 snapshot used |
| `verdict` | `now.verdict` | tri-state; replaces 0.1 `legalNow: boolean`. Card attributes may be null in SPEC-001, so `incomplete` is expected often for now |
| `historical` | `now.rules[LEGAL-016].status === 'fail'` | only the ban rule; independent of other rules |
| `bannedCards[]` | `now.rules[LEGAL-016].violations[]` | `cardKey` = `nameKey(cardName)`; `bannedSince` = `effectiveDate`; `kind` = `BanEntry.kind` of the `add` entry in the wave returned by `banStatus(cardKey, …, now.asOf).waveId` (LEGAL-B10) |
| `bannedSinceEarliest` | min of `bannedCards[].bannedSince` | `null` when not historical |
| `legalAtEvent` | `atEvent.rules[LEGAL-016].status` (`atEvent.asOf` = event `startDate`) | `pass`/`fail`/`not_evaluated` → `true`/`false`/`null`; the event `startDate` is what research notes record as `legal_as_of` |
| `result` | `now` | full per-rule detail for CAT-045 |

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
    "format": "standard",
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
      "legend": { "cardKey": "kennen heart of the tempest", "name": "Kennen, Heart of the Tempest", "qty": 1 },
      "champion": { "cardKey": "kennen storm of shuriken", "name": "Kennen, Storm of Shuriken", "qty": 1 },
      "mainDeck": [ { "cardKey": "nocturne horrifying", "name": "Nocturne, Horrifying", "qty": 3 } ],
      "runes": [ { "cardKey": "chaos rune", "name": "Chaos Rune", "qty": 9 },
                 { "cardKey": "order rune", "name": "Order Rune", "qty": 3 } ],
      "battlefields": [ { "cardKey": "minefield", "name": "Minefield", "qty": 1 } ],
      "sideboard": [],
      "format": "standard",
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
   `endDate: "2026-11-08"`, `region: "Europe"`, `format: "standard"`, `playerCount: null`
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
7. **Unknown name blocks import.** **Given** a pasted Main Deck line 14 `3 Nocturne, Horrifyng` (typo; `nameKey`
   `nocturne horrifyng` matches no card), **When** converting, **Then** the import fails listing `Nocturne, Horrifyng`
   with line 14, no suggestion is applied, and no file is written (CAT-028).
7a. **Punctuation-free name resolves.** **Given** a pasted line `3 Nocturne Horrifying` (no comma), **When** converting,
   **Then** it resolves exactly to `cardKey: "nocturne horrifying"` (Nocturne, Horrifying) because CARD-030 drops
   commas, `name` keeps the text as published, and no error is raised (CAT-028).
8. **Historical label.** **Given** today is 2026-11-23 and SPEC-002 lists Nocturne, Horrifying and Rhasa the
   Sunderer as banned in Standard from 2026-11-23, **When** ASC Evansrhim's list is shown, **Then** it carries
   `Contains cards banned since Nov 23, 2026`, its detail view highlights Nocturne, Horrifying (3) and Rhasa the
   Sunderer (3), `legality.historical` is true, `legality.verdict` is `illegal`, `legality.asOf` is `2026-11-23` (check date),
   `legality.legalAtEvent` is true (LEGAL-016 passes with `asOf = 2026-11-06`), and it still appears 1st in the event
   (CAT-040, CAT-041, CAT-018, CAT-045).
9. **Banned battlefields count too.** **Given** Sonecon's list includes battlefields Emperor's Dais and Star Spring,
   **When** legality is computed as of 2026-11-23, **Then** `bannedCards` includes them with `kind: "battlefield"`,
   `zone: "battlefields"` alongside the Chosen Champion Riven, Broken Blade (`zone: "champion"`), plus Stellacorn Herder
   and Zhonya's Hourglass (`zone: "main"`): 5 entries, each listed once with its `cardKey` (e.g. `"emperors dais"`) and
   `bannedSince: "2026-11-23"` (CAT-017).
10. **Banned decks shown on Tournaments, not in Your decks.** **Given** all 8 catalog lists are historical as of
    2026-11-23 and the user has added no tournament deck, **When** they open Tournaments, **Then** all 8 lists are shown
    in published order, each labelled `Contains cards banned since Nov 23, 2026`, with no hide toggle; **When** they open
    Your decks, **Then** none of the 8 lists appears there (CAT-040, CAT-041; ADR-0006).
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
14. **No re-weighting.** **Given** RQ Los Angeles (ends 2026-09-27) with a 1st-place list and RC Europe (ends 2026-11-08)
    with a 5th-place list, **When** Tournaments renders, **Then** RC Europe (and its 5th) comes before RQ Los Angeles (and
    its 1st): events are ordered by date only and no rank or event type is used across events (CAT-004, CAT-030, CAT-062).
15. **Incomplete is never shown as legal.** **Given** a catalog list with no banned cards as of today and SPEC-002
    returning `verdict: "incomplete"` because LEGAL-002 is `not_evaluated` (`domains = null` for one card), **When** the
    row renders, **Then** it shows `Not fully checked`, not `Legal in Standard`, and no legal colour or icon;
    `historical` is false (CAT-045).
16. **Add to Your decks.** **Given** ASC Evansrhim's list (`2026-11-rc-europe-1`) and an empty Your decks, **When** the
    user clicks "Add to Your decks" once, **Then** Your decks holds one new deck named
    `Kennen: ASC Evansrhim (1st, Regional Championship: Europe)` with Legend, Champion, 39 main,
    9 Chaos Rune + 3 Order Rune, Minefield, Veiled Temple, Zaun Warrens and 10 sideboard cards identical to the catalog
    list, format `standard`, and `source` = `{ kind: "tournament", eventId: "2026-11-rc-europe", decklistId:
    "2026-11-rc-europe-1", publishedRank: 1, placingLabel: "1st", pilot: "ASC Evansrhim", sourceUrl: <Riot article>, … }`;
    the confirmation `Added to Your decks` also shows `Contains cards banned since Nov 23, 2026` (CAT-070…CAT-073, CAT-076).
17. **Duplicate add.** **Given** `2026-11-rc-europe-1` was already added, **When** the user views it on Tournaments,
    **Then** the button reads `In Your decks` and clicking it opens the existing deck without creating another;
    **When** they click the `Add another copy` link, **Then** a second deck named
    `Kennen: ASC Evansrhim (1st, Regional Championship: Europe) (2)` is
    created with the same `source.decklistId`; **When** they delete both copies, **Then** "Add to Your decks" returns (CAT-074).
18. **Identical lists add separately.** **Given** BQO Caravaggio (#4) is already in Your decks, **When** the user views
    lets see lol (#6, identical list), **Then** #6 still shows "Add to Your decks", and adding it creates a deck whose
    source names `lets see lol` and `6th` (CAT-053, CAT-074).
19. **Copy is independent.** **Given** the user removed one Nocturne, Horrifying from their copy of
    `2026-11-rc-europe-1`, **When** they open Tournaments, **Then** the catalog list still shows 3 Nocturne, Horrifying,
    and the copy still counts as added (CAT-074, CAT-075).
20. **`legal_as_of` is the event start date.** **Given** the 8 RC Europe notes with `legal_as_of: 2026-11-06` and the
    event `startDate: "2026-11-06"`, **When** the maintainer imports them on 2026-11-23, **Then** no stored field holds
    `legal_as_of` or a "legal now" value, `legality.legalAtEvent` is computed with `asOf = 2026-11-06` (true for all 8),
    and `legality.asOf` is the check date `2026-11-23` (CAT-016, CAT-017, CAT-018).
21. **Banned-card kind from the ban list.** **Given** Sonecon's list checked as of 2026-11-23, **When** `bannedCards` is
    built, **Then** `Emperor's Dais` gets `kind: "battlefield"` and `Riven, Broken Blade` gets `kind: "card"`, each taken
    from the `add` entry of wave `banStatus(...).waveId` in `banlist.json`, not from `Violation` (CAT-017).
22. **Dates and labels.** **Given** a legal, fully checked list with `asOf` 2026-11-23 and RC Europe (2026-11-06 to
    2026-11-08), **When** shown, **Then** the label reads `Legal in Standard as of Nov 23, 2026` and the event dates read
    `Nov 6, 2026` and `Nov 8, 2026`; no date is shown as `2026-11-23` or `23 Nov 2026` (CAT-037).

## Out of scope
- The Your decks screen, ownership display and ban status per card (SPEC-005, [[Your Decks Ownership View]]).
- User-deck storage, renaming and the general deck-source union (SPEC-006, [[Deck Import]]); this spec defines only the tournament source variant (CAT-072).
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
  (KR/TW) lists are out of MVP; catalog legality uses the global Standard list. `BannedCardRef.kind` is looked up in
  `banlist.json` via `banStatus()` (CAT-017); if SPEC-002 later adds the kind to `Violation`, use that instead.
- **Cross-spec (SPEC-006):** SPEC-006 is being revised to own the single `DeckSource` type; its tournament variant must
  equal `TournamentDeckSource` field for field (CAT-072). SPEC-006 v0.1 still shows `{ eventId, decklistId, placing, url }`;
  re-check once its revision lands.
- **Importer note:** research notes carry `players: 307` (derived); the importer MUST NOT map it to `playerCount` (CAT-002).
  Notes' `legal_as_of` is the event start date and is not imported as data (CAT-017).
- **RQ lists** (LA, Singapore, earlier) are not captured yet; the RQ table is mostly creator-tier.
- Question for RJ: the `legalAtEvent` detail wording in CAT-046 (`No banned cards at the event`). The date format and
  `Not fully checked` were chosen by Claude in ADR-0006 Gate H-036 decision 7; RJ may change them.
- Question for RJ: CAT-073 takes `<Legend>` as the Legend name up to the first comma, following the ADR example (`Kennen`).
  Confirm, or use the full Legend name.

## Changelog
- 0.3 (2026-11-23): H-035: CAT-050 compares by `cardKey`; `BannedCardRef.kind` looked up from `banlist.json` via SPEC-002
  `banStatus()` (LEGAL-B10) (CAT-017, mapping table, AC21); CAT-072 states `TournamentDeckSource` is the tournament variant of
  SPEC-006's single `DeckSource`; ADR-0006 Gate H-036: default name `<Legend>: <pilot> (<placingLabel>, <event name>)`
  (CAT-073, AC16), `In Your decks` button + `Add another copy` link (CAT-074, AC17); sources added for CAT-021, CAT-022,
  CAT-053; open questions refreshed (removed the notes-bucket item and the answered duplicate question). H-037: one meaning
  for `legal_as_of` = event start date, `asOf` = check date (CAT-017, CAT-018, data contract, mapping table, AC20); new
  CAT-037 shared display rules (dates `Nov 23, 2026`, incomplete = `Not fully checked`) applied to CAT-041, CAT-045 and ACs
  8, 10, 15, 16, 22.
- 0.2 (2026-11-23): applied [[ADR-0006 Two Imports - Collection and Decks]] and [[ADR-0005 MVP Product Defaults]]
  decision 3: catalog shown on the Tournaments screen only; removed CAT-042, CAT-043, CAT-044 (Your decks toggle,
  empty state, persistence); historical lists shown by default with label (CAT-040, CAT-041). Added "Add to Your decks"
  (CAT-070…CAT-077, `TournamentDeckSource`) and legality display (CAT-045, CAT-046). H-016: format id `standard`;
  `cardKey` replaces `cardId`; `DecklistLegality` now derived from SPEC-002 `LegalityResult` (historical = LEGAL-016
  fails today, `legalAtEvent` = LEGAL-016 at event start, tri-state `verdict` replaces `legalNow`, `checkedAsOf` →
  `asOf`, `banListVersion` → `banListDataVersion`, added `catalogVersion`, `bannedCards[]` carry `cardKey`/`zone`)
  with a mapping table. H-017: AC7 rewritten with a genuinely unknown name, AC7a added. H-018: ADR-0003 references
  linked, CAT-004 no longer cites a non-existent CAT-030 tie-break; CAT-028 uses exact `nameKey` lookup with no
  alias table. ACs 10 and 14 rewritten (no "Decks I can build"); ACs 15–19 added. Decklist template: `format: standard`,
  `placing` = published rank.
- 0.1 (2026-11-23): draft. Event and decklist models, JSON storage, Riot text conversion, display order,
  historical-list handling (default excluded from "Your decks" with toggle), duplicate handling,
  ADR-0003 prohibitions.
