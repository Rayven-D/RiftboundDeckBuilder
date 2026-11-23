---
tags: [spec]
id: SPEC-006
version: 0.1
status: draft
depends_on: [SPEC-001, SPEC-002, SPEC-003, SPEC-004]
consumers: [SPEC-005]
research: ["[[Collection Import Formats]]", "[[Deck Construction Rules]]", "[[Ban List]]", "[[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]]", "[[2026-11 RC Europe - 2 - Sonecon - Riven]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-030
as_of: 2026-11-23
---
# SPEC-006: Deck Import

## Purpose
Let a user bring in a **complete deck someone else built** (a forum post, a deck site, a friend's
list) because they want to build it. They may own none of it. The result is a **user deck** in
**Your decks** ([[ADR-0006 Two Imports - Collection and Decks]]). [[Your Decks Ownership View]]
(SPEC-005) is the consumer: it shows each card of a user deck against My collection.

Deck import is the second card on the Import screen, "Deck Import: Created deck list that you want
to make" ([[Design Direction]]). The first card, Owned Cards Import, is [[Collection Import]] (SPEC-003).

How it differs from owned-card import (SPEC-003):

| | Owned-card import (SPEC-003) | Deck import (this spec) |
|---|---|---|
| Result | owned counts in My collection | one `UserDeck` in Your decks |
| Sections | merged, display only (IMP-018) | **mapped to deck zones** |
| Legality | never checked (IMP-004) | checked with SPEC-002 and shown, **never blocks saving** |
| Unknown names | dropped from the commit | must be resolved or removed **before saving** |
| Commit | Add / Replace | Save as a new deck |

The flow is **parse → review (zones, names, legality) → save**. A second entry path,
**"Add to Your decks"** on a Top 8 deck in Tournaments (SPEC-004), creates the same deck object
without parsing.

## Definitions
- **cardKey**: SPEC-001 `PlayableCard.cardKey` = `nameKey(canonical name)` (CARD-012, CARD-030).
  All deck contents are keyed by `cardKey`; printings and variants of one name are the same card
  (CARD-013, [[ADR-0005 MVP Product Defaults]] #2).
- **Card attributes are nullable.** `category`, `domains`, `isChampion`, `championTag`, `isSignature`
  may be `null` (unknown) because several API fields are still BLOCKED in SPEC-001 (CARD-024…027).
  This spec never treats `null` as `false` or as `other`.
- **Deck zone** (`DeckZone`): SPEC-002 `Zone`: `legend`, `champion`, `main`, `sideboard`, `runes`,
  `battlefields`. `champion` is the Chosen Champion; `main` excludes it (39 cards in a 40-card deck),
  as in SPEC-002 `DeckInput` and SPEC-004 CAT-014.
- **Shared parsing**: the format detection, text grammar, deck-code and TTS decoding, and name
  resolution requirements of SPEC-003 (listed in DECK-010). This spec cites them by ID and does not
  restate them.
- **Unsectioned entry**: an entry that has no section label, because the format has none (plain text,
  TTS, the main part of a deck code) or because it comes before the first label.
- **Zone question**: a decision the importer cannot make from sections or Riot card data and asks the user.
- **Today**: the user's local calendar date (SPEC-002 Open question 5), used as legality `asOf`.

## Requirements

### A. Entry paths and general flow
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-001 | MUST | Deck import is reached from the **Deck Import** card on the Import screen. Input is pasted text or an uploaded `.txt` file (as IMP-001, without `.csv`). | [[Design Direction]] 2026-11-23; [[ADR-0006 Two Imports - Collection and Decks]] |
| DECK-002 | MUST | One import produces **at most one** deck. It goes into **Your decks** only and never changes My collection. | [[ADR-0006 Two Imports - Collection and Decks]] |
| DECK-003 | MUST | Parsing and review MUST NOT write to the deck store. Only an explicit **Save** creates the deck (same principle as IMP-002). Leaving or reloading the page before saving stores nothing. | design rule |
| DECK-004 | MUST | Import is tolerant: one bad line never aborts it (IMP-003). Every issue is reported with its location (IMP-056). | [[Collection Import]] IMP-003, IMP-056 |
| DECK-005 | MUST | The second entry path, **Add to Your decks** on a Tournaments decklist (SPEC-004), creates a `UserDeck` by copying the catalog decklist's zones (DECK-060…064). It does not parse text. | [[ADR-0006 Two Imports - Collection and Decks]] follow-up decisions |
| DECK-006 | MUST | Raw input is never sent to a third party; resolution runs only against our own card catalog (IMP-005). | [[Riot Developer Rules]] #7 |

### B. Input formats (shared parsing)
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-010 | MUST | Deck import reuses SPEC-003's shared parsing requirements unchanged: limits and encoding **IMP-006, IMP-007, IMP-008, IMP-010**; detection **IMP-011 (steps 2–5), IMP-012, IMP-013, IMP-014**; text grammar **IMP-016, IMP-017, IMP-019 … IMP-024**; name resolution **IMP-025 … IMP-030**; Piltover deck codes **IMP-031 … IMP-035**; TTS **IMP-036 … IMP-039**. If SPEC-003 renumbers or relabels these, the reference follows the requirement, not the number. | [[Collection Import]]; [[Collection Import Formats]] |
| DECK-011 | MUST | Accepted source formats: `riot-text`, `plain-text`, `piltover-code`, `tts`. **CSV is not a deck format**: IMP-011 step 1 is skipped, and a `.csv` upload or a forced `csv` gives input-level error `FORMAT_NOT_FOR_DECKS` pointing the user to Owned Cards Import. | [[Collection Import Formats]] (CSV is a collection export); design rule |
| DECK-012 | MUST | IMP-015 (several deck codes as one import) does **not** apply. More than one deck code in the input gives input-level error `MULTIPLE_DECKS` ("Paste one deck at a time"). | DECK-002 |
| DECK-013 | MUST | The following SPEC-003 requirements do **not** apply to deck import: IMP-004 (no legality), IMP-009 (collection total cap), IMP-018 and IMP-047 (sections merged), IMP-040…046 (CSV), IMP-049…055 (collection commit and storage). This spec replaces them. | [[ADR-0006 Two Imports - Collection and Decks]] |
| DECK-014 | MUST | Riftbound card names contain commas (`Kennen, Storm of Shuriken`); the whole rest of the line after the quantity is the name (IMP-019). | [[Collection Import Formats]] table |

### C. Sections to deck zones
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-020 | MUST | Unlike owned-card import, **sections matter**. Section labels (IMP-016, IMP-017) map to zones: `Legend`/`Legends` → `legend`; `Champion`/`Champions` → `champion`; `Main Deck`/`Main`/`Main deck` → `main`; `Battlefields`/`Battlefield` → `battlefields`; `Rune Pool`/`Runes`/`Rune Deck` → `runes`; `Sideboard` → `sideboard`. Each entry under a label is assigned that zone with `method: 'section'`. | [[Collection Import Formats]] fact 1 (official); [[Deck Construction Rules]] #1, #11 |
| DECK-021 | MUST | Within one zone, entries with the same `cardKey` are merged (quantities summed, source lines kept). Across zones they stay **separate**: `1 An Offer You Can't Refuse` in Main Deck and again in Sideboard is 1 in `main` and 1 in `sideboard`, not 2 in one place. | [[Deck Construction Rules]] #9 (copy limit counted across zones by SPEC-002, not by merging) |
| DECK-022 | MUST | A section label is the user's (or author's) statement and **wins over card data**. If an entry's known `category` disagrees with its section (e.g. `Zaun Warrens`, a battlefield, under `Main Deck`), the entry stays in the labelled zone and gets warning `ZONE_CATEGORY_MISMATCH` naming the expected zone. SPEC-002 then reports it (LEGAL-015 / LEGAL-014). | design rule; [[Deck Legality]] LEGAL-014, LEGAL-015 |
| DECK-023 | SHOULD | A `ZONE_CATEGORY_MISMATCH` warning offers a one-click "Move to <zone>". Nothing moves without that click. | design rule |
| DECK-024 | MUST | A section label that appears twice (e.g. two `Sideboard:` blocks) appends to the same zone. | design rule |
| DECK-025 | MUST | If a published list puts the Chosen Champion inside `Main Deck` **and** also lists it under `Champion`, both entries are kept as written (champion 1, main +1). The importer MUST NOT dedupe; SPEC-002 LEGAL-003/005 report any count problem. Riot's lists show the champion only under Champion, so this normally does not arise. | [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] notes (main lists 39 non-champion cards) |

### D. Reconstructing missing zones
Applies to unsectioned entries and to zones with no section in the input (plain text, TTS, a deck
code's main part, or a Riot-style paste that lacks some labels, like our own decklist notes, which
have no Legend or Champion section).

| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-030 | MUST | **Never guess silently.** Every zone not taken from a section label is either (a) **inferred from Riot card data** by the rules below, shown with `method: 'inferred'` and the reason, and changeable before saving, or (b) a **zone question** the user answers. | design rule; [[ADR-0005 MVP Product Defaults]] #4 (Riot data only) |
| DECK-031 | MUST | Inference uses only SPEC-001 `category`, `isChampion`, `championTag`, `isSignature` of the resolved card. No curated tables, no deck-site conventions, no position-in-list heuristics. | [[ADR-0005 MVP Product Defaults]] #4 |
| DECK-032 | MUST | Unsectioned entry with `category = 'rune'` → `runes`; `'battlefield'` → `battlefields`; `'unit'` or `'other'` → `main` (subject to DECK-034). | [[Deck Construction Rules]] #1, #7, #8; [[Card Data Model]] CARD-024 |
| DECK-033 | MUST | Unsectioned entries with `category = 'legend'`: if there is exactly **one** such entry with quantity 1 and the input has no `Legend` section, it becomes the Legend (`inferred`). Otherwise (2+ legend entries, or quantity > 1) the user gets zone question `PICK_LEGEND` listing them; unpicked legends stay where the user puts them. | [[Deck Construction Rules]] #1 |
| DECK-034 | MUST | **Chosen Champion** when the input has no `Champion` section and a Legend is known: candidates = distinct names in unsectioned `main` entries with `isChampion = true`, `isSignature = false`, and `championTag` equal to the Legend's. Exactly one candidate → move **one copy** to `champion` (`inferred`), the rest stays in `main`. Zero or several candidates, or any needed attribute `null` → zone question `PICK_CHAMPION`. | [[Deck Construction Rules]] #4; [[Deck Legality]] LEGAL-004 |
| DECK-035 | MUST | Unsectioned entry with `category = null` (unknown) → zone question `PICK_ZONE` for that line, defaulting the picker to `main` but not applying it. The UI SHOULD offer one explicit bulk action "Put all unsorted cards in Main Deck". | design rule (nullable attributes) |
| DECK-036 | MUST | No Legend in the input at all → zone question `PICK_LEGEND` with a catalog search limited to `category = 'legend'`. The user may answer **Leave empty**; the deck then saves without a Legend (SPEC-002 LEGAL-001 fails). | [[Deck Construction Rules]] #1; DECK-050 (never block on legality) |
| DECK-037 | MUST | A **sideboard is never inferred**. Unsectioned non-zone cards all go to `main`. If `main` then exceeds 39 (+ champion), the result carries info `NO_SIDEBOARD_SECTION`: "This list has no Sideboard section, so all cards are in the Main Deck. Move sideboard cards if needed." | [[Deck Construction Rules]] #3, #9 |
| DECK-038 | MUST | Every zone question must be **answered** (a choice or the explicit "Leave empty" / "Keep in Main Deck") before Save is enabled. Answering never requires the deck to be legal. | DECK-030; DECK-050 |
| DECK-039 | MUST | Piltover deck codes: the decoded **sideboard** maps to `sideboard`; the decoded **main deck** is treated as unsectioned (DECK-032…037). TTS input is entirely unsectioned. **BLOCKED: needs research**: whether Piltover codes carry the Legend, runes and battlefields, and where. | [[Collection Import Formats]] table ("only main deck + sideboard") |

### E. Unknown and unresolved names
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-040 | MUST | Name resolution is SPEC-003's (IMP-025…030): exact `nameKey` match resolves; fuzzy suggestions are **never applied automatically** (IMP-027); `AMBIGUOUS_NAME` for shared prefixes (IMP-029). No alias table is used. | [[ADR-0005 MVP Product Defaults]] #4; [[Collection Import]] |
| DECK-041 | MUST | **A deck cannot be saved while any line is `needs-review` or `UNKNOWN_CARD`/`UNKNOWN_PRINTING`/`UNKNOWN_SET_INDEX`.** For each, the user picks a suggestion, types another name (re-resolved), or **removes the line**. Save shows "N cards need attention" until the count is 0. | design rule (see Rationale) |
| DECK-042 | MUST | Removing an unresolved line is recorded in the import summary (`removedLines`) and shown on the saved deck's notes area as a one-time info "2 lines were removed during import" with the raw text, so the user knows the deck is not the full original list. | design rule |
| DECK-043 | SHOULD | Pre-selection and "Accept all pre-selected" follow IMP-028. "Accept all" is one explicit user action and counts as resolving. | [[Collection Import]] IMP-028 |
| DECK-044 | MUST | Resolution and zone assignment are independent: picking a suggestion for a line under `Champion:` keeps it in `champion`. For an unsectioned line, zone inference (section D) runs again after resolution. | design rule |

**Rationale for DECK-041.** A saved deck that holds an unresolved string is a deck the app cannot
show or use: SPEC-005 needs a `cardKey` to show the card's image, info, ban status and ownership
(ADR-0006); SPEC-002 would report it `incomplete` forever (LEGAL-019); and ADR-0005 rules out an alias
table that could fix it later. Fixing a typo is cheapest at import time, while the original text is on
screen. Removing the line stays possible, so the user is never stuck. Legality, by contrast, is
information about a deck the user wants to build, so it never blocks (DECK-050).

### F. Validation on import (legality shown, never blocking)
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-050 | MUST | The review step runs SPEC-002 on the reconstructed deck (`format: 'standard'`, region `global`, `asOf` = today) and shows the `LegalityResult`. **No verdict, rule failure or ban blocks saving.** | [[ADR-0006 Two Imports - Collection and Decks]] (decks the user wants to make); board H-030 |
| DECK-051 | MUST | The display shows: the verdict (`legal` / `illegal` / `incomplete`), every failed rule with its SPEC-002 message (LEGAL-R07), and every banned card with its zone, ban wave name and **effective date** (LEGAL-016, e.g. "Nocturne, Horrifying, banned since 23 Nov 2026"). | [[Deck Legality]] LEGAL-016, LEGAL-R07; [[ADR-0005 MVP Product Defaults]] #3 (banned label) |
| DECK-052 | MUST | `incomplete` is shown as "Not fully checked" with the `notEvaluatedReason`s, never as legal (LEGAL-R04). | [[Deck Legality]] LEGAL-R04 |
| DECK-053 | SHOULD | Upcoming bans (`upcomingBans`, LEGAL-B08) are shown as info ("will be banned from <date>"). | [[Deck Legality]] |
| DECK-054 | MUST | Legality is re-run on every edit in review and in the deck editor (section H). | [[Deck Legality]] LEGAL-R01 (pure, cheap) |
| DECK-055 | MUST | The verdict is **not stored** with the deck. It is computed when shown, as of today, because bans change (e.g. the Radiance wave effective 2026-11-23 made both RC Europe lists below illegal). | [[Ban List]]; [[Deck Legality]] LEGAL-B02 |
| DECK-056 | MUST | Unresolved lines are never sent to SPEC-002 as raw names during review; they are excluded and the result is labelled "N unresolved cards not checked". | DECK-041 |

### G. Deck metadata
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-070 | MUST | **Name** is required, 1–80 characters after trimming. Default: the Legend's canonical name (e.g. `Kennen, Heart of the Tempest`); with no Legend, `Imported deck <YYYY-MM-DD>`. Names need not be unique. | board H-030; design rule |
| DECK-071 | MUST | **Source** is optional, entered by the user: free text (≤ 200 chars) and/or a URL (≤ 2,048 chars, `http:` or `https:` only, otherwise warning `SOURCE_URL_INVALID` and stored as text). | board H-030 |
| DECK-072 | MUST | **The app never fetches, previews, unfurls or loads anything from a source URL** (no request, no favicon, no iframe). It is shown as a plain link opened only by the user's click, with `rel="noopener noreferrer nofollow"`. | design rule; IMP-005; Out of scope |
| DECK-073 | MUST | **Notes**: optional free text, ≤ 4,000 characters, shown as plain text (no HTML rendering). | design rule |
| DECK-074 | MUST | `createdAt` is set on save; `updatedAt` on save and every later change (ISO 8601 UTC). | design rule |
| DECK-075 | MUST | `format` is `'standard'` for every deck in the MVP. | [[Deck Legality]] (MVP scope) |
| DECK-076 | MUST | The deck records the `catalogVersion` (SPEC-001) it was resolved against and its `sourceFormat` (`riot-text`, `plain-text`, `piltover-code`, `tts`, `tournament`, `manual`). | [[Collection Import]] IMP-054 (same reason) |

### H. Tournaments path: "Add to Your decks"
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-060 | MUST | Every Top 8 decklist in Tournaments has a one-click **Add to Your decks**. It creates a `UserDeck` whose zones are a copy of the `CatalogDecklist` (`legend`, `champion`, `mainDeck` → `main`, `runes`, `battlefields`, `sideboard`) with `cardKey`s resolved from the catalog. | [[ADR-0006 Two Imports - Collection and Decks]] follow-up decisions; [[Tournament Deck Catalog]] CAT-010 |
| DECK-061 | MUST | `source = { kind: 'tournament', eventId, decklistId, placing, url }` with `placing` = the decklist's `placingLabel` exactly as published (CAT-011) and `url` = its `sourceUrl`. No placing is re-bucketed or scored. | [[Tournament Deck Catalog]] CAT-011, CAT-062; [[ADR-0003 Tournament Results Only]] |
| DECK-062 | MUST | Default name: `<Legend name> (<placingLabel>, <event name>)`, e.g. `Kennen, Heart of the Tempest (1st, Regional Championship: Europe)`. Wording stays neutral (CAT-035). The pilot is shown from the source, not put in the name. | [[Tournament Deck Catalog]] CAT-035; [[Riot Developer Rules]] rule 8 |
| DECK-063 | MUST | The copy is a **snapshot**: later edits to the catalog or to the user deck do not affect each other. Banned cards are copied like any card (decks with banned cards are shown, labelled; ADR-0005 #3). | design rule; [[ADR-0005 MVP Product Defaults]] #3 |
| DECK-064 | SHOULD | If a deck with the same `source.decklistId` already exists, show "Already in Your decks: <name>" with **Open** and **Add another copy**. Adding again is allowed. | design rule |
| DECK-065 | MUST | A catalog card that does not resolve in the current catalog (CARD-066 removed printing) is copied by name and shown unresolved in the editor; this path does not block (the user did not type it) but the deck's legality is `incomplete` until it is resolved. | [[Card Data Model]] CARD-066; [[Deck Legality]] LEGAL-019 |

### I. Managing decks
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-080 | MUST | **Edit**: in a deck editor the user can add a card (catalog search, exact + fuzzy as in DECK-040), change a quantity (1–999), move an entry between zones, and remove an entry. Legality re-runs (DECK-054); saving never requires legality. | board H-030 |
| DECK-081 | MUST | **Rename** and edit source and notes, with the limits of section G. | board H-030 |
| DECK-082 | MUST | **Delete** asks for confirmation naming the deck ("Delete 'Kennen, Heart of the Tempest'? This can't be undone.") and removes it from the store. My collection is untouched. | design rule |
| DECK-083 | SHOULD | After a delete, offer **Undo** for 10 seconds (restores the identical record, same `id` and timestamps). | design rule |
| DECK-084 | MUST | **Duplicate** creates a new deck with a new `id`, name `<name> (copy)` (trimmed to 80), identical zones, metadata and `source`, new `createdAt`/`updatedAt`, and `duplicatedFrom = <original id>`. | board H-030 |
| DECK-085 | MUST | **Export** a deck as Riot-style text: labels `Legend:`, `Champion:`, `Main Deck:`, `Battlefields:`, `Rune Pool:`, `Sideboard:` in that order, one blank line between sections, `<qty> <canonical name>` lines in stored order, empty zones omitted, `\n` line endings. Copy to clipboard and download `.txt` (`<name>.txt`, unsafe file-name characters replaced by `_`). | [[Collection Import Formats]] fact 1 (Riot layout); board H-030 |
| DECK-086 | MUST | Export round-trips: importing the exported text produces the same zones and quantities with every line `method: 'section'` and no zone questions. | design rule |
| DECK-087 | MAY | Export all decks as a JSON backup (`UserDeck[]` with `schemaVersion`) and restore it, since browser storage can be cleared. | design rule; [[Collection Import]] IMP-055 (same reason) |
| DECK-088 | MUST | On load, each stored deck is re-resolved by `cardKey` against the current catalog. Display names come from the catalog; a `cardKey` that no longer exists is shown with its stored name and flagged "Card no longer in the card data"; legality is `incomplete` (LEGAL-019). The stored record is not changed until the user edits it. | [[Card Data Model]] CARD-066; [[Deck Legality]] LEGAL-019 |

### J. Storage
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-090 | MUST | Decks are stored **only in the user's browser**, with no account and no server copy, behind a `DeckStore` interface so another store can replace it later. The adapter choice (IndexedDB recommended for size; localStorage acceptable) is an implementation choice. | [[ADR-0005 MVP Product Defaults]] #1; [[ADR-0006 Two Imports - Collection and Decks]] consequences; [[ADR-0001 Tech Stack]] |
| DECK-091 | MUST | Each record has `schemaVersion: 1`. On load, older versions are migrated; a record with a **newer** version than the app knows is shown read-only and never overwritten. | design rule |
| DECK-092 | MUST | Limits: at most **200 decks**; per deck at most **150 entries** (lines after merging) and **300 copies** in total. Over a limit → error `DECK_LIMIT` / `DECK_TOO_LARGE` at save, nothing written. (A legal deck has 67 cards: 1 + 1 + 39 + 12 + 3 + 10, so the caps leave room for illegal work-in-progress decks.) | [[Deck Construction Rules]] summary; design rule |
| DECK-093 | MUST | Writes are atomic per deck: a failed write (e.g. quota exceeded → `STORAGE_FULL`) leaves the previous record intact and tells the user. | design rule |
| DECK-094 | SHOULD | A save carries the `updatedAt` it was based on; if the stored record has a newer `updatedAt` (another tab), ask "This deck changed in another tab. Overwrite or reload?" | design rule |
| DECK-095 | MUST | Stored decks contain card **keys, names and quantities only**: no card text, images or other Riot content copies (those come from the catalog at display time). | [[Card Data Model]] CARD-007 |

## Data contract
```ts
// shapes only; no implementation
import type { SourceFormat, ImportIssue, ParsedLine, Suggestion, SourceLocation } from './collection-import'; // SPEC-003
import type { Zone, FormatId, LegalityResult, DeckInput } from './deck-legality';                         // SPEC-002

type CardKey = string;          // SPEC-001 PlayableCard.cardKey
type IsoDateTime = string;      // ISO 8601 UTC
type DeckZone = Zone;           // 'legend' | 'champion' | 'main' | 'sideboard' | 'runes' | 'battlefields'

type DeckSourceFormat = Exclude<SourceFormat, 'csv'> | 'tournament' | 'manual';

interface DeckCard {
  cardKey: CardKey;
  name: string;                 // canonical name at save time (display fallback, DECK-088)
  qty: number;                  // 1..999
  printingId?: string;          // kept when the source named a printing (deck code, TTS); display only
}

type DeckSource =
  | { kind: 'user'; text: string | null; url: string | null }               // DECK-071; both null = none
  | { kind: 'tournament'; eventId: string; decklistId: string;
      placing: string;          // placingLabel as published, e.g. '1st'
      url: string };            // CatalogDecklist.sourceUrl

interface UserDeck {
  schemaVersion: 1;
  id: string;                   // UUID v4
  name: string;                 // 1..80 chars
  format: FormatId;             // 'standard'
  source: DeckSource;
  sourceFormat: DeckSourceFormat;
  notes: string;                // '' when none, <= 4000 chars
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  catalogVersion: string;       // SPEC-001
  duplicatedFrom?: string;      // DECK-084
  importRemovedLines?: string[];// DECK-042, raw text of removed lines
  legend: DeckCard | null;      // qty 1 when valid; stored as given
  champion: DeckCard | null;
  main: DeckCard[];             // excludes the Chosen Champion
  sideboard: DeckCard[];
  runes: DeckCard[];
  battlefields: DeckCard[];
}
// NOTE: legend/champion are single slots. If an input lists 2+ cards under `Legend:`, the extra
// entries are a zone question (PICK_LEGEND); the user moves or removes them. LEGAL-001 still
// reports the count from what the user keeps.

type ZoneMethod = 'section' | 'inferred' | 'user';

type ZoneQuestionKind = 'PICK_LEGEND' | 'PICK_CHAMPION' | 'PICK_ZONE';

interface ZoneQuestion {
  kind: ZoneQuestionKind;
  lineRefs: SourceLocation[];   // the lines it concerns ([] for "no Legend in input")
  candidates: CardKey[];        // e.g. champion candidates; [] = free catalog search
  answer?: { zone: DeckZone; cardKey?: CardKey } | { leaveEmpty: true };
}

type DeckIssueCode =
  | 'FORMAT_NOT_FOR_DECKS' | 'MULTIPLE_DECKS'
  | 'ZONE_CATEGORY_MISMATCH' | 'NO_SIDEBOARD_SECTION' | 'ZONE_INFERRED'
  | 'SOURCE_URL_INVALID' | 'DECK_LIMIT' | 'DECK_TOO_LARGE' | 'STORAGE_FULL';

interface DeckImportLine extends ParsedLine {   // SPEC-003 ParsedLine (status, resolved, suggestions, issues)
  zone: DeckZone | null;        // null while a zone question is open
  zoneMethod: ZoneMethod | null;
  zoneReason?: string;          // e.g. "Section 'Rune Pool' (line 9)" or "Card type is Battlefield"
  removedByUser: boolean;       // DECK-041
}

interface DeckImportResult {
  format: DeckSourceFormat;
  formatDetected: boolean;
  formatReason: string;         // IMP-012
  lines: DeckImportLine[];
  questions: ZoneQuestion[];
  issues: (ImportIssue | { severity: 'error' | 'warning' | 'info'; code: DeckIssueCode; message: string; location?: SourceLocation })[];
  draft: Omit<UserDeck, 'id' | 'createdAt' | 'updatedAt'>; // resolved lines only, DECK-056
  legality: LegalityResult | null;   // null while nothing resolved yet; never persisted (DECK-055)
  canSave: boolean;             // no unresolved lines (DECK-041) and all questions answered (DECK-038)
  blockers: { unresolvedLines: number; openQuestions: number };
  summary: { linesRead: number; entries: number; byZone: Record<DeckZone, number>; removedLines: number };
  catalogVersion: string;
}

interface DeckStore {           // DECK-090; MVP adapter: browser (IndexedDB or localStorage)
  list(): Promise<UserDeck[]>;
  get(id: string): Promise<UserDeck | null>;
  create(deck: UserDeck): Promise<void>;                       // DECK_LIMIT / DECK_TOO_LARGE / STORAGE_FULL
  update(deck: UserDeck, basedOnUpdatedAt: IsoDateTime): Promise<'ok' | 'conflict'>; // DECK-094
  delete(id: string): Promise<UserDeck | null>;                // returns the record for Undo (DECK-083)
}

// Mapping to SPEC-002 (names are canonical names, so SPEC-002 resolves them exactly):
// toDeckInput(d: UserDeck): DeckInput = {
//   legend: d.legend?.name ?? null, chosenChampion: d.champion?.name ?? null,
//   main: d.main.map(c => ({ name: c.name, qty: c.qty })), sideboard: …, runes: …, battlefields: … }
```

## Acceptance criteria
Card names come from [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] (`KENNEN_1`) and
[[2026-11 RC Europe - 2 - Sonecon - Riven]] (`RIVEN_2`). "Today" is 2026-11-23 unless stated.
Criteria that depend on `category`/`isChampion`/`championTag` assume SPEC-001 provides them for these
cards (CARD-024, CARD-026 are BLOCKED on research).

1. **Riot sectioned text → zones** (DECK-020, 021, 050, 051, 070)
   **Given** `KENNEN_1` pasted as Riot text: `Legend:` `1 Kennen, Heart of the Tempest`, `Champion:`
   `1 Kennen, Storm of Shuriken`, `Main Deck:` with the 39 published main cards (incl.
   `1 An Offer You Can't Refuse`, `3 Lightning Rush`, `3 Nocturne, Horrifying`, `3 Rhasa the Sunderer`),
   `Battlefields:` `1 Minefield` `1 Veiled Temple` `1 Zaun Warrens`, `Rune Pool:` `9 Chaos Rune`
   `3 Order Rune`, `Sideboard:` the 10 published cards (incl. `1 An Offer You Can't Refuse`)
   **When** parsed **Then** format `riot-text`; every line has `zoneMethod: 'section'`;
   `summary.byZone = {legend: 1, champion: 1, main: 39, battlefields: 3, runes: 12, sideboard: 10}`;
   `An Offer You Can't Refuse` is 1 in `main` and 1 in `sideboard` (not merged); no questions;
   `canSave = true`; default name `Kennen, Heart of the Tempest`.
   **And** legality (`asOf` 2026-11-23) is `illegal` with LEGAL-016 listing `Nocturne, Horrifying` and
   `Rhasa the Sunderer` (zone `main`, Radiance ban list update, effective 2026-11-23); the count rules
   pass. **When** the user clicks Save **Then** the deck is stored and appears in Your decks.

2. **Never blocks on bans** (DECK-050, 055) **Given** `RIVEN_2` as Riot text with all six sections
   **When** reviewed **Then** LEGAL-016 shows five banned cards with dates (`Riven, Broken Blade` in
   `champion`; `Stellacorn Herder`, `Zhonya's Hourglass` in `main`; `Emperor's Dais`, `Star Spring` in
   `battlefields`), Save is enabled, and the saved record contains no verdict.

3. **Our Markdown notes: missing Legend and Champion** (DECK-020, 034, 036, 038)
   **Given** the body of `RIVEN_2` as stored in research (`## Main deck`, `## Runes`, `## Battlefields`,
   `## Sideboard`; no Legend or Champion section) **When** parsed **Then** `main` 39, `runes` 12
   (`6 Calm Rune`, `6 Chaos Rune`), `battlefields` 3, `sideboard` 10, and one open question
   `PICK_LEGEND` with an empty `lineRefs`; Save is disabled ("1 question to answer").
   **When** the user picks `Riven, The Exile` **Then** a `PICK_CHAMPION` question opens, because `main`
   contains no champion unit tagged Riven (the list's `Riven, Broken Blade` is not in the pasted
   body). **When** the user picks `Riven, Broken Blade` **Then** `champion` = 1, LEGAL-003 counts 40, and
   Save is enabled. Default name `Riven, The Exile`.

4. **Plain list, reconstructed from card data** (DECK-032, 033, 034, 037)
   **Given** plain text with no labels: `1 Kennen, Heart of the Tempest`, `1 Kennen, Storm of Shuriken`,
   `3 Lightning Rush`, `2 Gust`, `9 Chaos Rune`, `3 Order Rune`, `1 Minefield`, `1 Veiled Temple`,
   `1 Zaun Warrens` **When** parsed **Then** `Kennen, Heart of the Tempest` → `legend` (inferred:
   "Card type is Legend"), `Kennen, Storm of Shuriken` → `champion` (inferred: "only champion unit
   matching the Legend"), runes and battlefields inferred by category, `Lightning Rush` and `Gust` →
   `main`; each inferred line shows its reason and can be changed; no questions; legality reports
   LEGAL-003 failing (main 6, needs 40) but Save is enabled.

5. **No sideboard section** (DECK-037) **Given** the full `KENNEN_1` as plain lines, main and sideboard
   cards together, no labels **When** parsed **Then** all non-zone cards go to `main` (`An Offer You
   Can't Refuse` merged to 2 in `main`), info `NO_SIDEBOARD_SECTION` is shown, nothing goes to
   `sideboard`, and LEGAL-003 reports main 50 (+10).

6. **Unknown category → ask** (DECK-035) **Given** plain `2 Gust` where SPEC-001 has `category: null`
   for `Gust` **When** parsed **Then** a `PICK_ZONE` question for line 1 defaults to Main Deck but is
   unanswered and Save is disabled; **When** the user chooses "Put all unsorted cards in Main Deck"
   **Then** `Gust` is in `main` with `zoneMethod: 'user'` and Save is enabled.

7. **Section label beats card data** (DECK-022, 023) **Given** `Main Deck:` / `1 Zaun Warrens`
   **Then** `Zaun Warrens` stays in `main` with warning `ZONE_CATEGORY_MISMATCH` ("Zaun Warrens is a
   Battlefield") and a "Move to Battlefields" action; legality shows LEGAL-015; saving is allowed
   without moving it.

8. **Typo must be resolved before save** (DECK-041, 043) **Given** `Main Deck:` / `3 Lightnig Rush`
   **When** parsed **Then** the line is `needs-review` with pre-selected suggestion `Lightning Rush`,
   Save is disabled with "1 card needs attention"; **When** the user accepts **Then** `Lightning Rush ×3`
   is in `main` and Save is enabled.

9. **Unknown card: remove the line** (DECK-041, 042) **Given** line 5 `2 Totally Fake Card` under
   `Sideboard:` **When** the user clicks Remove **Then** Save is enabled, the saved deck's
   `importRemovedLines = ["2 Totally Fake Card"]`, and the deck shows "1 line was removed during import".

10. **Ambiguous name in a labelled zone** (DECK-040, 044) **Given** `Champion:` / `1 Kennen` **Then**
    `AMBIGUOUS_NAME` with `Kennen, Heart of the Tempest` and `Kennen, Storm of Shuriken`, none
    pre-selected; **When** the user picks `Kennen, Storm of Shuriken` **Then** it is in `champion`.

11. **Add to Your decks from Tournaments** (DECK-060…064) **Given** the RC Europe 1st-place decklist
    (`eventId: "2026-11-rc-europe"`, `decklistId: "2026-11-rc-europe-1"`, `placingLabel: "1st"`)
    **When** the user clicks Add to Your decks **Then** a `UserDeck` exists with
    `source = {kind: 'tournament', eventId: '2026-11-rc-europe', decklistId: '2026-11-rc-europe-1',
    placing: '1st', url: 'https://playriftbound.com/en-us/news/organizedplay/best-ofs-for-the-european-championship'}`,
    `sourceFormat: 'tournament'`, name `Kennen, Heart of the Tempest (1st, Regional Championship: Europe)`,
    zones equal to the catalog list, and it shows with the "Contains cards banned since 23 Nov 2026"
    label. **When** clicked again **Then** "Already in Your decks" offers Open and Add another copy.

12. **Source URL is never fetched** (DECK-071, 072) **Given** the user pastes source URL
    `https://example.com/kennen-list` **When** the deck is saved and opened **Then** the network log
    shows no request to `example.com`, and the link opens only on click. **Given**
    `javascript:alert(1)` **Then** `SOURCE_URL_INVALID` and it is stored as plain text, not a link.

13. **Export round trip** (DECK-085, 086) **Given** the saved deck from AC 1 **When** exported **Then**
    the text starts `Legend:\n1 Kennen, Heart of the Tempest\n\nChampion:\n1 Kennen, Storm of Shuriken\n\nMain Deck:\n…`
    and ends with the `Sideboard:` block; **When** that text is imported **Then** zones and quantities
    are identical and there are no questions.

14. **Duplicate, rename, delete** (DECK-081, 082, 084) **Given** the AC 1 deck **When** duplicated
    **Then** a second deck `Kennen, Heart of the Tempest (copy)` exists with a new `id` and
    `duplicatedFrom` set. **When** renamed to an empty string **Then** the rename is refused. **When**
    deleted and confirmed **Then** it is gone from Your decks and My collection is unchanged.

15. **Limits** (DECK-092, 093) **Given** 200 stored decks **When** the user saves another **Then**
    `DECK_LIMIT`, nothing written. **Given** a paste with 301 copies **Then** Save gives
    `DECK_TOO_LARGE`.

16. **CSV and multiple codes refused** (DECK-011, 012) **Given** an uploaded `deck.csv` **Then**
    `FORMAT_NOT_FOR_DECKS` pointing to Owned Cards Import. **Given** two Piltover codes on two lines
    **Then** `MULTIPLE_DECKS`.

17. **Parse writes nothing** (DECK-003) **Given** any input **When** parsed and reviewed but not saved
    and the page is reloaded **Then** the deck store is unchanged.

18. **Incomplete is not legal** (DECK-052) **Given** a deck whose cards lack `domains` in SPEC-001
    **When** reviewed **Then** the verdict reads "Not fully checked" with the reason, never "Legal".

19. **Newer schema is read-only** (DECK-091) **Given** a stored record with `schemaVersion: 2` **When**
    the app (knowing v1) loads **Then** it is shown read-only and no write touches it.

## Out of scope
- **Fetching URLs** or importing from a deck site by link or API (DECK-072; IMP-005).
- **Accounts, sync, cloud backup** ([[ADR-0005 MVP Product Defaults]] #1).
- **Sharing decks** (share links, public decks, deck codes as output). Export is text for the user only.
- CSV deck import; importing several decks at once; Pixelborn codes.
- Ownership display, partial colouring and the deck-level owned summary (SPEC-005 [[Your Decks Ownership View]]).
- Formats other than Standard; 2v2, Limited.
- Deck statistics, curves, ratings, or any metagame number ([[ADR-0003 Tournament Results Only]]).

## Open questions / BLOCKED
- **BLOCKED: needs research**: whether Piltover Archive deck codes encode the Legend, Chosen
  Champion, runes and battlefields, and in which group (DECK-039); plus a real code with known
  contents as a fixture. Until then a code is treated as an unsectioned main deck + sideboard.
- **BLOCKED: needs research (via SPEC-001)**: API sources for `category`, `isChampion`,
  `championTag`, `isSignature` (CARD-024, 026, 027). Until they exist, inference (DECK-032…034) will
  mostly produce zone questions; the feature still works, just with more questions.
- **Unconfirmed**: the Riftbound Play Network "Export → TXT" layout (SPEC-003 IMP-023). If it uses
  other labels, they are added to IMP-017.
- **Depends on SPEC-004**: CAT-042/043 still describe tournament decks in Your decks; ADR-0006 voids
  them. SPEC-004 needs an "Add to Your decks" requirement pointing at DECK-060…065.
- **Depends on SPEC-001**: SPEC-001 still lists the curated alias table (CARD-034) that ADR-0005 removes;
  this spec uses no aliases. SPEC-001 types declare attributes as non-nullable; this spec assumes the
  shared decision that they are nullable.
- **Needs RJ**: confirm DECK-041 (unknown names must be fixed or removed before saving, rather than
  saved as placeholders) and the limits in DECK-092 (200 decks, 300 copies).
- **Open**: tournament decks keep a name default with the event (DECK-062); RJ may prefer the Legend only.

## Changelog
- 0.1 (2026-11-23): draft. Deck import for community decklists (board H-030, ADR-0006). Reuses SPEC-003
  shared parsing by ID; sections → zones; zone reconstruction from Riot card data with user questions,
  never silent; SPEC-002 legality shown, never blocking; unknown names must be resolved or removed;
  Tournaments "Add to Your decks"; edit/rename/delete/duplicate/export; browser `DeckStore`.
  67 requirements (60 MUST, 6 SHOULD, 1 MAY; DECK-001…DECK-095, numbered in groups).
