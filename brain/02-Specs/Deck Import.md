---
tags: [spec]
id: SPEC-006
version: 0.6
status: draft
depends_on: [SPEC-001, SPEC-002, SPEC-003, SPEC-004]
consumers: [SPEC-005, SPEC-008]
research: ["[[Collection Import Formats]]", "[[Deck Construction Rules]]", "[[Ban List]]", "[[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]]", "[[2026-11 RC Europe - 2 - Sonecon - Riven]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-030
as_of: 2026-11-23
---
# SPEC-006: Deck Import

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** import a complete community deck (paste, or upload `.txt` / `.csv` / `.xlsx`) into Decks: parse → review (zones, names, legality) → save. Second path: "Add to your decks" from Tournaments.

**Key requirements**
- DECK-001: the shared paste-or-upload dialog (SPEC-003 IMP-062/063); uploads land in the editable text box; every line needs a quantity (IMP-021).
- DECK-002/003: one import = at most one deck; only Save writes; the collection is never changed.
- DECK-010/013: reuses SPEC-003 Part A, incl. CSV/Excel (v0.4); only IMP-009 and IMP-015 are not applicable to decks.
- DECK-011: CSV/Excel rows follow the same line rule; section labels work in one-cell rows.
- DECK-014/015 (v0.5): `x3 Name` / `Name x3` and printing codes on a line (`3 Lightning Rush RAD 001/167`, SPEC-003 IMP-020, IMP-064…070) are accepted; the code only resolves the `cardKey` and is then dropped.
- DECK-020/021: section labels (any case, with or without spaces) map to zones; the same card in two zones stays separate.
- DECK-030/032: zones are never guessed silently: inferred from SPEC-001 `category` or asked as zone questions.
- DECK-026: token cards are rejected with a warning.
- DECK-041: a deck can't be saved while any name is unresolved (fix or remove the line).
- DECK-050/051: SPEC-002 legality is shown and never blocks saving; ban status via `banStatus()`.
- DECK-055: the verdict is not stored; it is computed as of today.
- DECK-061/062/064: `TournamentDeckSource` defined here; default name `<Legend>: <pilot> (<placing>, <event>)` ≤ 80; "In your decks" / "Add another copy".
- DECK-090/096: browser `DeckStore`; deck entries by `cardKey` only (no printing, ownership or tags).
- DECK-080/082/083/084 (v0.6): a **locked** deck (SPEC-008) can't change cards; Delete releases the lock;
  Undo and Duplicate give unlocked decks. Locks live in SPEC-008's `DeckLockStore`, not in `UserDeck`.

**Shared types:** `UserDeck` · `DeckCard` (`cardKey`, name, qty) · `DeckSource` = `UserDeckSource | TournamentDeckSource` · `DeckZone` (= SPEC-002 `Zone`) · `DeckImportResult` · `ZoneQuestion` · `DeckStore`.
**Depends on:** [[Card Data Model]], [[Deck Legality]], [[Collection Import]], [[Tournament Deck Catalog]]. **Consumers:** [[Your Decks Ownership View]]; [[Shared Cards and Lock-in]]; [[Tournament Deck Catalog]] (Add path).
**BLOCKED (needs research):**
- Whether Piltover deck codes encode Legend, champion, runes and battlefields (DECK-039).
- API type strings and champion/signature fields (via SPEC-001), so inference mostly asks zone questions.
- Whether token cards can ever be in a deck (DECK-026, via SPEC-001).

## Purpose
Let a user bring in a **complete deck someone else built** (a forum post, a deck site, a friend's
list) because they want to build it. They may own none of it. The result is a **user deck** in
**Decks** ([[ADR-0006 Two Imports - Collection and Decks]]). [[Your Decks Ownership View]]
(SPEC-005) is the consumer: it shows each card of a user deck against the user's collection.

Deck import is the second card on the Import screen, "Deck Import: Created deck list that you want
to make" ([[Design Direction]]). The first card, Owned Cards Import, is [[Collection Import]] (SPEC-003).

How it differs from owned-card import (SPEC-003):

| | Owned-card import (SPEC-003) | Deck import (this spec) |
|---|---|---|
| Result | owned counts in Collection | one `UserDeck` in Decks |
| Sections | merged, display only (IMP-018) | **mapped to deck zones** |
| Legality | never checked (IMP-004) | checked with SPEC-002 and shown, **never blocks saving** |
| Unknown names | dropped from the commit | must be resolved or removed **before saving** |
| Commit | Add / Replace | Save as a new deck |

The flow is **parse → review (zones, names, legality) → save**. A second entry path,
**"Add to your decks"** on a Top 8 deck in Tournaments (SPEC-004), creates the same deck object
without parsing.

## Definitions
- **cardKey**: SPEC-001 `PlayableCard.cardKey` = `nameKey(canonical name)` (CARD-012, CARD-030).
  All deck contents are keyed by `cardKey`; printings and variants of one name are the same card
  (CARD-013, [[ADR-0005 MVP Product Defaults]] #2).
- **Card attributes (SPEC-001).** `category` is SPEC-001's `CardCategory` enum (CARD-024): `legend`,
  `champion`, `unit`, `spell`, `gear`, `rune`, `battlefield`, `token`, `unknown`. It is never `null`;
  an unmapped or unverified type is `'unknown'`. `domains`, `isChampionUnit`, `championTag` and
  `isSignature` are nullable (CARD-025…027, CARD-029). This spec treats `null` and `'unknown'` as
  "not known", never as `false`, empty, or any particular zone.
- **Champion Unit**: a card with `category === 'champion'` or `isChampionUnit === true` (SPEC-002
  definition, used for LEGAL-004).
- **Deck zone** (`DeckZone`): SPEC-002 `Zone`: `legend`, `champion`, `main`, `sideboard`, `runes`,
  `battlefields`. `champion` is the Chosen Champion; `main` excludes it (39 cards in a 40-card deck),
  as in SPEC-002 `DeckInput` and SPEC-004 CAT-014.
- **Shared parsing**: SPEC-003 Part A. SPEC-003 states that Part A is reused by this spec except the
  requirements its Part A preamble lists as not applicable to decks; DECK-010 lists the IDs reused and DECK-013 lists the Part A IDs that are **not applicable to decks**.
  This spec cites them by ID and does not restate them.
- **Unsectioned entry**: an entry that has no section label, because the format has none (plain text,
  TTS, the main part of a deck code) or because it comes before the first label.
- **Zone question**: a decision the importer cannot make from sections or Riot card data and asks the user.
- **Today**: the user's local calendar date (SPEC-002 Open question 5), used as legality `asOf`.
- **Shared display rules** ([[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 decision 7, board H-037):
  dates are shown as `MMM D, YYYY` in English, e.g. `Nov 23, 2026` (stored values stay ISO 8601); the
  SPEC-002 verdict `incomplete` is labelled **"Not fully checked"**; per-card ban status comes from
  SPEC-002 `banStatus()` (LEGAL-B10).

## Requirements

### A. Entry paths and general flow
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-001 | MUST | Deck import is reached from the **Deck Import** card on the Import screen. It opens the shared paste-or-upload dialog (SPEC-003 IMP-062, IMP-063; title "Import deck", hint "Section labels like "Main Deck:" are kept."). Input is pasted text or an uploaded `.txt`, `.csv` or `.xlsx` file (IMP-001, IMP-061), written into the editable text box. Every line needs a quantity (IMP-021). The dialog also shows copies per section as parsed (unlabelled entries as "No section"). | [[Design Direction]] 2026-11-23; [[ADR-0006 Two Imports - Collection and Decks]]; RJ decision 2026-11-23 (H-043) |
| DECK-002 | MUST | One import produces **at most one** deck. It goes into **Decks** only and never changes the collection. | [[ADR-0006 Two Imports - Collection and Decks]] |
| DECK-003 | MUST | Parsing and review MUST NOT write to the deck store. Only an explicit **Save** creates the deck (same principle as IMP-002). Leaving or reloading the page before saving stores nothing. | design rule |
| DECK-004 | MUST | Import is tolerant: one bad line never aborts it (IMP-003). Every issue is reported with its location (IMP-056). | [[Collection Import]] IMP-003, IMP-056 |
| DECK-005 | MUST | The second entry path, **Add to your decks** on a Tournaments decklist (SPEC-004), creates a `UserDeck` by copying the catalog decklist's zones and `cardKey`s (DECK-060…065). It does not parse text and does not run name resolution. | [[ADR-0006 Two Imports - Collection and Decks]] follow-up decisions |
| DECK-006 | MUST | Raw input is never sent to a third party; resolution runs only against our own card catalog (IMP-005). | [[Riot Developer Rules]] #7 |

### B. Input formats (shared parsing)
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-010 | MUST | Deck import reuses SPEC-003 **Part A** (shared parsing), as SPEC-003 states, with only the exceptions in DECK-013. Reused unchanged: flow **IMP-001, IMP-002, IMP-003, IMP-005, IMP-061, IMP-062, IMP-063**; limits and encoding **IMP-006, IMP-007, IMP-008, IMP-010**; detection **IMP-011, IMP-012, IMP-013, IMP-014**; text grammar **IMP-016 … IMP-024** and the Line grammar (IMP-018 for its parser part: labels are not entries, each line keeps its section, nothing is merged across sections); printing codes in text lines **IMP-064 … IMP-070** (v0.5); CSV/Excel **IMP-040 … IMP-046** (v0.4); name resolution **IMP-025 … IMP-030, IMP-059**; Piltover deck codes **IMP-031 … IMP-035**; TTS **IMP-036 … IMP-039**; error reporting **IMP-056, IMP-057**. If SPEC-003 renumbers or relabels these, the reference follows the requirement, not the number. | [[Collection Import]]; [[Collection Import Formats]] |
| DECK-011 | MUST | Accepted source formats: `riot-text`, `plain-text`, `piltover-code`, `tts`, and `csv` (a `.csv` or `.xlsx` upload). CSV/Excel rows follow SPEC-003 IMP-040 … IMP-043: one cell `3x Name`, or a quantity cell then the name; a first row of column titles is skipped. **Section labels work in one-cell rows** (e.g. a row `Main Deck:`), so a spreadsheet laid out like Riot text keeps its sections and zones (DECK-020). *(v0.3 refused CSV with `FORMAT_NOT_FOR_DECKS`; removed in v0.4.)* | RJ decision 2026-11-23 (H-043) |
| DECK-012 | MUST | IMP-015 (several deck codes as one import) does **not** apply. More than one deck code in the input gives input-level error `MULTIPLE_DECKS` ("Paste one deck at a time"). | DECK-002 |
| DECK-013 | MUST | **Part A requirements not applicable to decks** (the same exceptions SPEC-003's Part A preamble lists): **IMP-009** (collection total cap after merging), replaced by DECK-092; **IMP-015** (several deck codes), replaced by DECK-012. No other Part A requirement is excepted; since v0.4 the CSV/Excel parts (IMP-001 `.csv`/`.xlsx`, IMP-011 step 1, IMP-040 … IMP-046) apply to decks too (RJ decision 2026-11-23 (H-043)). SPEC-003 **Part B** (IMP-004, IMP-047 … IMP-055, IMP-058, IMP-060) is collection-specific and is not reused; sections C–J of this spec define the deck behaviour instead. | [[Collection Import]] Part A preamble; [[ADR-0006 Two Imports - Collection and Decks]] |
| DECK-014 | MUST | Riftbound card names contain commas (`Kennen, Storm of Shuriken`); the name is the whole card part of the line once the quantity and an optional printing code at its start or end are removed (IMP-019, Line grammar). The quantity may lead or trail (`3x Name`, `x3 Name`, `Name x3`; IMP-020). In CSV/Excel rows, cells after the quantity are re-joined with `, ` (IMP-040). | [[Collection Import Formats]] table; RJ decision 2026-11-23 (H-043); RJ decision 2026-11-23 (H-048) |
| DECK-015 | MUST | **Printing codes in deck lines** (v0.5). A deck line may carry a printing code (`3 Lightning Rush RAD 001/167`, `Legend: 1 Kennen, Heart of the Tempest (OGN 299/298)`, code-only `3 RAD 001/167`), parsed and resolved exactly as SPEC-003 IMP-064 … IMP-070. The code is used **only to resolve the `cardKey`** and is then dropped (DECK-096); the zone still comes from the section or from inference (DECK-020, DECK-030). For saving (DECK-041): a line in `needs-review` because of `PRINTING_NAME_MISMATCH` or `AMBIGUOUS_PRINTING`, and a code-only line with error `UNKNOWN_PRINTING`, block Save until fixed or removed; a **resolved** line that only carries warning `UNKNOWN_PRINTING` (name fallback), `PRINTING_NAME_MISMATCH` (code used) or `VARIANT_UNMAPPED` does not block. Before the card catalog is loaded, review and Save wait (IMP-066). | RJ decision 2026-11-23 (H-048); [[Collection Import]] IMP-064 … IMP-070 |

### C. Sections to deck zones
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-020 | MUST | Unlike owned-card import, **sections matter**. Section labels (IMP-016, IMP-017: any case, with or without spaces, optional leading `#`, optional trailing colon, optional entry after the colon per IMP-023) map to zones: `Legend`/`Legends` → `legend`; `Champion`/`Champions` → `champion`; `Main Deck`/`MainDeck`/`Main` → `main`; `Battlefields`/`Battlefield` → `battlefields`; `Rune Pool`/`RunePool`/`Runes`/`Rune Deck`/`RuneDeck` → `runes`; `Sideboard` → `sideboard`. Each entry under a label (including one on the label line itself) is assigned that zone with `method: 'section'`. | [[Collection Import Formats]] fact 1 (official); [[Deck Construction Rules]] #1, #11; RJ decision 2026-11-23 (H-043) (spacing, aliases) |
| DECK-021 | MUST | Within one zone, entries with the same `cardKey` are merged (quantities summed, source lines kept). Across zones they stay **separate**: `1 An Offer You Can't Refuse` in Main Deck and again in Sideboard is 1 in `main` and 1 in `sideboard`, not 2 in one place. | [[Deck Construction Rules]] #9 (copy limit counted across zones by SPEC-002, not by merging) |
| DECK-022 | MUST | A section label is the user's (or author's) statement and **wins over card data**. If an entry's known card data disagrees with its section, the entry stays in the labelled zone and gets warning `ZONE_CATEGORY_MISMATCH` naming the expected zone from the DECK-032 table. Disagreement means: a `legend`, `rune` or `battlefield` outside its own zone (e.g. `Zaun Warrens`, a battlefield, under `Main Deck`); a known non-`legend` under `Legend`; a known non-Champion Unit under `Champion`; a `unit`, `spell`, `gear` or `champion` under `Runes` or `Battlefields`. `category: 'unknown'` or a `null` attribute never produces this warning. SPEC-002 then reports it (LEGAL-015 / LEGAL-014). | design rule; [[Deck Legality]] LEGAL-014, LEGAL-015 |
| DECK-023 | SHOULD | A `ZONE_CATEGORY_MISMATCH` warning offers a one-click "Move to <zone>". Nothing moves without that click. | design rule |
| DECK-024 | MUST | A section label that appears twice (e.g. two `Sideboard:` blocks) appends to the same zone. | design rule |
| DECK-025 | MUST | If a published list puts the Chosen Champion inside `Main Deck` **and** also lists it under `Champion`, both entries are kept as written (champion 1, main +1). The importer MUST NOT dedupe; SPEC-002 LEGAL-003/005 report any count problem. Riot's lists show the champion only under Champion, so this normally does not arise. | [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] notes (main lists 39 non-champion cards) |
| DECK-026 | MUST | **Tokens are not deck cards.** An entry whose resolved card has `category: 'token'`, in any section or unsectioned, is **rejected**: it is not added to any zone, gets warning `TOKEN_NOT_DECK_CARD` ("<name> is a token and can't be put in a deck") with its location, and its raw text is added to `importRemovedLines` (DECK-042). It does not block saving. | board H-030 retry 1; [[Card Data Model]] CARD-024 (`token` category); research confirmation pending (Open questions) |

### D. Reconstructing missing zones
Applies to unsectioned entries and to zones with no section in the input (plain text, TTS, a deck
code's main part, or a Riot-style paste that lacks some labels, like our own decklist notes, which
have no Legend or Champion section).

| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-030 | MUST | **Never guess silently.** Every zone not taken from a section label is either (a) **inferred from Riot card data** by the rules below, shown with `method: 'inferred'` and the reason, and changeable before saving, or (b) a **zone question** the user answers. | design rule; [[ADR-0005 MVP Product Defaults]] #4 (Riot data only) |
| DECK-031 | MUST | Inference uses only SPEC-001 `category`, `isChampionUnit`, `championTag`, `isSignature` of the resolved card. No curated tables, no deck-site conventions, no position-in-list heuristics. | [[ADR-0005 MVP Product Defaults]] #4; [[Card Data Model]] CARD-024, CARD-026, CARD-027 |
| DECK-032 | MUST | Every unsectioned entry gets its zone from its SPEC-001 `category` by this table (every enum value has exactly one rule): `legend` → **Legend** (DECK-033); `champion`, or `unit` with `isChampionUnit === true` → **Chosen Champion candidate** (DECK-034; copies not chosen go to `main`); `unit` (with `isChampionUnit` `false` or `null`), `spell`, `gear` → **`main`**; `rune` → **`runes`**; `battlefield` → **`battlefields`**; `token` → **rejected with a warning** (DECK-026); `unknown` → **ask** (zone question `PICK_ZONE`, DECK-035). | [[Deck Construction Rules]] #1, #4, #7, #8; [[Card Data Model]] CARD-024, CARD-026; [[Deck Legality]] (Champion Unit definition) |
| DECK-033 | MUST | Unsectioned entries with `category = 'legend'`: if there is exactly **one** such entry with quantity 1 and the input has no `Legend` section, it becomes the Legend (`inferred`). Otherwise (2+ legend entries, or quantity > 1) the user gets zone question `PICK_LEGEND` listing them; unpicked legends stay where the user puts them. | [[Deck Construction Rules]] #1 |
| DECK-034 | MUST | **Chosen Champion** when the input has no `Champion` section and a Legend is known: candidates = distinct unsectioned entries that are Champion Units (`category === 'champion'` or `isChampionUnit === true`), are not known Signature cards (`isSignature !== true`), and whose `championTag` is not known to differ from the Legend's. If **exactly one** candidate exists **and** it has `isSignature === false` and a `championTag` equal to the Legend's (both known), move **one copy** to `champion` (`inferred`); the rest stays in `main`. If **several** candidates exist, the user is **asked**: zone question `PICK_CHAMPION` listing them. If there are **none**, or the single candidate has a needed attribute `null`, `PICK_CHAMPION` opens with the candidates (if any) plus a catalog search. Copies not picked stay in `main`. | [[Deck Construction Rules]] #4; [[Deck Legality]] LEGAL-004 |
| DECK-035 | MUST | Unsectioned entry with `category === 'unknown'` → zone question `PICK_ZONE` for that line, defaulting the picker to `main` but not applying it. The UI MUST offer one explicit bulk action **"Put all in Main Deck"** that answers every open `PICK_ZONE` with `main` (`zoneMethod: 'user'`). | design rule; [[Card Data Model]] CARD-024, CARD-029 (`unknown` = not evaluated) |
| DECK-036 | MUST | No Legend in the input at all → zone question `PICK_LEGEND` with a catalog search limited to `category = 'legend'`. The user may answer **Leave empty**; the deck then saves without a Legend (SPEC-002 LEGAL-001 fails). | [[Deck Construction Rules]] #1; DECK-050 (never block on legality) |
| DECK-037 | MUST | A **sideboard is never inferred**. Unsectioned `unit`, `spell`, `gear` and `champion` cards (other than the Chosen Champion) all go to `main`. If `main` then exceeds 39 (+ champion), the result carries info `NO_SIDEBOARD_SECTION`: "This list has no Sideboard section, so all cards are in the Main Deck. Move sideboard cards if needed." | [[Deck Construction Rules]] #3, #9 |
| DECK-038 | MUST | Every zone question must be **answered** (a choice or the explicit "Leave empty" / "Keep in Main Deck") before Save is enabled. Answering never requires the deck to be legal. | DECK-030; DECK-050 |
| DECK-039 | MUST | Piltover deck codes: the decoded **sideboard** maps to `sideboard`; the decoded **main deck** is treated as unsectioned (DECK-032…037). TTS input is entirely unsectioned. **BLOCKED: needs research**: whether Piltover codes carry the Legend, runes and battlefields, and where. | [[Collection Import Formats]] table ("only main deck + sideboard") |

### E. Unknown and unresolved names
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-040 | MUST | Name resolution is SPEC-003's (IMP-025…030): exact `nameKey` match resolves; fuzzy suggestions are **never applied automatically** (IMP-027); `AMBIGUOUS_NAME` for shared prefixes (IMP-029). No alias table is used. | [[ADR-0005 MVP Product Defaults]] #4; [[Collection Import]] |
| DECK-041 | MUST | **A deck cannot be saved while any line is `needs-review` or an error line with `UNKNOWN_CARD`/`UNKNOWN_PRINTING`/`UNKNOWN_SET_INDEX`** (v0.5: a resolved line with only a warning, e.g. `UNKNOWN_PRINTING` after a name fallback, does not block; DECK-015). For each, the user picks a suggestion, types another name (re-resolved), or **removes the line**. Save shows "N cards need attention" until the count is 0. | design rule (see Rationale) |
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
| DECK-051 | MUST | The display shows: the verdict with the same labels as SPEC-004 CAT-045 (`legal` → "Legal in Standard as of Nov 23, 2026", `illegal` → "Not legal in Standard today", `incomplete` → "Not fully checked", DECK-052), every failed rule with its SPEC-002 message (LEGAL-R07, rendered per the LEGAL-R08 display rules), and every banned card with its zone, ban wave name and **banned since** date taken from SPEC-002 `banStatus(cardKey, 'standard', 'global', today)` (LEGAL-B10), shown in the display date format, e.g. "Nocturne, Horrifying, banned since Nov 23, 2026". | [[Deck Legality]] LEGAL-016, LEGAL-B10, LEGAL-R07; [[ADR-0005 MVP Product Defaults]] #3 (banned label); [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7 |
| DECK-052 | MUST | `incomplete` is labelled **"Not fully checked"** with the `notEvaluatedReason`s, never as legal (LEGAL-R04). | [[Deck Legality]] LEGAL-R04; [[ADR-0006 Two Imports - Collection and Decks]] H-036 #7 |
| DECK-053 | SHOULD | Cards whose `banStatus()` is `upcoming` (LEGAL-B10, LEGAL-B08 semantics) are shown as info ("will be banned from Nov 23, 2026"). | [[Deck Legality]] LEGAL-B08, LEGAL-B10 |
| DECK-054 | MUST | Legality is re-run on every edit in review and in the deck editor (section H). | [[Deck Legality]] LEGAL-R01 (pure, cheap) |
| DECK-055 | MUST | The verdict is **not stored** with the deck. It is computed when shown, as of today, because bans change (e.g. the Radiance wave effective 2026-11-23 made both RC Europe lists below illegal). | [[Ban List]]; [[Deck Legality]] LEGAL-B02 |
| DECK-056 | MUST | Unresolved lines are never sent to SPEC-002 as raw names during review; they are excluded and the result is labelled "N unresolved cards not checked". | DECK-041 |

### G. Deck metadata
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-070 | MUST | **Name** is required, 1–80 characters after trimming. Default for text import: the Legend's canonical name (e.g. `Kennen, Heart of the Tempest`); with no Legend, `Imported deck <date>` with today in the display date format (e.g. `Imported deck Nov 23, 2026`). The tournament default is DECK-062. Names need not be unique. | board H-030; design rule; H-036 #7 |
| DECK-071 | MUST | **Source** is optional, entered by the user: free text (≤ 200 chars) and/or a URL (≤ 2,048 chars, `http:` or `https:` only, otherwise warning `SOURCE_URL_INVALID` and stored as text). | board H-030 |
| DECK-072 | MUST | **The app never fetches, previews, unfurls or loads anything from a source URL** (no request, no favicon, no iframe). It is shown as a plain link opened only by the user's click, with `rel="noopener noreferrer nofollow"`. | design rule; IMP-005; Out of scope |
| DECK-073 | MUST | **Notes**: optional free text, ≤ 4,000 characters, shown as plain text (no HTML rendering). | design rule |
| DECK-074 | MUST | `createdAt` is set on save; `updatedAt` on save and every later change (ISO 8601 UTC). | design rule |
| DECK-075 | MUST | `format` is `'standard'` for every deck in the MVP. | [[Deck Legality]] (MVP scope) |
| DECK-076 | MUST | The deck records the `catalogVersion` (SPEC-001 CARD-068) it was resolved against and its `sourceFormat` (`riot-text`, `plain-text`, `piltover-code`, `tts`, `csv` (`.csv` or `.xlsx` upload, v0.4), `tournament`, `manual`). | [[Collection Import]] IMP-054 (same reason) |

### H. Tournaments path: "Add to your decks"
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-060 | MUST | Every catalog decklist in Tournaments has a one-click **Add to your decks** (CAT-070). It creates a `UserDeck` whose zones are a copy of the `CatalogDecklist` (`legend`, `champion`, `mainDeck` → `main`, `runes`, `battlefields`, `sideboard`), same quantities, each `DeckCard` taking the entry's `cardKey` and the SPEC-001 canonical name for that `cardKey` (CAT-071). `sourceFormat: 'tournament'`, `format` = the decklist's `format` (`standard`). | [[ADR-0006 Two Imports - Collection and Decks]] follow-up decisions; [[Tournament Deck Catalog]] CAT-010, CAT-070, CAT-071 |
| DECK-061 | MUST | `source` is a `TournamentDeckSource` (Data contract; **defined once here**, referenced by SPEC-004 CAT-072): `kind: 'tournament'`, `eventId` (= `TournamentEvent.id`), `eventName` (= `TournamentEvent.name`), `eventStartDate`, `eventEndDate` (= `startDate`, `endDate`), `region`, `decklistId` (= `CatalogDecklist.id`), `publishedRank`, `placingLabel`, `pilot`, `sourceUrl` (= `CatalogDecklist.sourceUrl`) and `addedAt` (ISO 8601 date-time of the click). Values are copied verbatim (CAT-011, CAT-012); no placing is re-bucketed or scored. | [[Tournament Deck Catalog]] CAT-011, CAT-012, CAT-062, CAT-072; [[ADR-0003 Tournament Results Only]] |
| DECK-062 | MUST | Default name (RJ, Gate H-036 #1; same rule as CAT-073): `<Legend>: <pilot> (<placingLabel>, <event name>)`, where `<Legend>` is the Legend's canonical name up to its first `, ` (the whole name if it has no comma), `<pilot>` and `<placingLabel>` are copied verbatim, and `<event name>` is `eventName`. Example: `Kennen: ASC Evansrhim (1st, Regional Championship: Europe)`. Trimmed to 80 characters (DECK-070). Wording stays neutral (CAT-035). | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 #1; [[Tournament Deck Catalog]] CAT-035, CAT-073; [[Riot Developer Rules]] rule 8 |
| DECK-063 | MUST | The copy is a **snapshot**: later edits to the catalog or to the user deck do not affect each other. Banned cards are copied like any card (decks with banned cards are shown, labelled; ADR-0005 #3). | design rule; [[ADR-0005 MVP Product Defaults]] #3 |
| DECK-064 | MUST | **Duplicates (same rule as CAT-074).** A decklist is "already added" when Decks holds a deck whose `source.kind === 'tournament'` and `source.decklistId` equals the decklist's `id`. Then the primary button reads **"In your decks"** and opens that deck (the most recently created one if several); one click on it never creates a deck. A separate **"Add another copy"** creates a further copy named `<default name> (n)`, where n is the smallest integer ≥ 2 not already used by a deck with the same `decklistId` (`… (2)`, `… (3)`…). Editing or renaming a copy does not change this; deleting every copy makes "Add to your decks" available again. | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 #2; [[Tournament Deck Catalog]] CAT-074 |
| DECK-065 | MUST | **No name parsing on this path (CAT-071).** Catalog decklists already carry `cardKey`s, so the Add path copies them directly: it runs no text parsing, no name resolution and no fuzzy suggestions, raises no zone questions, and **cannot fail on names**. If a copied `cardKey` is not in the current card data (e.g. a card removed per CARD-066), the deck is still created with that `cardKey` and the catalog entry's name, and is then handled like any stored deck by DECK-088. | [[Tournament Deck Catalog]] CAT-071; [[Card Data Model]] CARD-066 |

### I. Managing decks
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-080 | MUST | **Edit**: in a deck editor the user can add a card (catalog search, exact + fuzzy as in DECK-040), change a quantity (1–999), move an entry between zones, and remove an entry. Legality re-runs (DECK-054); saving never requires legality. While the deck is **locked in** (SPEC-008), these card changes are disabled with "Unlock this deck to change its cards" (SHARE-025); DECK-081 stays available. | board H-030; [[Shared Cards and Lock-in]] SHARE-025 |
| DECK-081 | MUST | **Rename** and edit source and notes, with the limits of section G. | board H-030 |
| DECK-082 | MUST | **Delete** asks for confirmation naming the deck ("Delete 'Kennen, Heart of the Tempest'? This can't be undone.") and removes it from the store. The collection is untouched. Deleting a locked deck also removes its lock, and the confirmation adds "Its locked cards will count toward your other decks again." (SPEC-008 SHARE-024). | design rule; [[Shared Cards and Lock-in]] SHARE-024 |
| DECK-083 | SHOULD | After a delete, offer **Undo** for 10 seconds (restores the identical record, same `id` and timestamps). The restored deck is **unlocked** (SHARE-024). | design rule; [[Shared Cards and Lock-in]] SHARE-024 |
| DECK-084 | MUST | **Duplicate** creates a new deck with a new `id`, name `<name> (copy)` (trimmed to 80), identical zones, metadata and `source`, new `createdAt`/`updatedAt`, and `duplicatedFrom = <original id>`. The copy is unlocked (SHARE-026). | board H-030; [[Shared Cards and Lock-in]] SHARE-026 |
| DECK-085 | MUST | **Export** a deck as Riot-style text: labels `Legend:`, `Champion:`, `Main Deck:`, `Battlefields:`, `Rune Pool:`, `Sideboard:` in that order, one blank line between sections, `<qty> <canonical name>` lines in stored order, empty zones omitted, `\n` line endings. Copy to clipboard and download `.txt` (`<name>.txt`, unsafe file-name characters replaced by `_`). | [[Collection Import Formats]] fact 1 (Riot layout); board H-030 |
| DECK-086 | MUST | Export round-trips: importing the exported text produces the same zones and quantities with every line `method: 'section'` and no zone questions. | design rule |
| DECK-087 | MAY | Export all decks as a JSON backup (`UserDeck[]` with `schemaVersion`) and restore it, since browser storage can be cleared. | design rule; [[Collection Import]] IMP-055 (same reason) |
| DECK-088 | MUST | On load, each stored deck is re-resolved by `cardKey` against the current catalog. Display names come from the catalog; a `cardKey` that no longer exists is shown with its stored name and flagged "Card no longer in the card data"; SPEC-002 reports it under LEGAL-019 (fails for that card; the other rules skip it). The stored record is not changed until the user edits it. | [[Card Data Model]] CARD-066; [[Deck Legality]] LEGAL-019 |

### J. Storage
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-090 | MUST | Decks are stored **only in the user's browser**, with no account and no server copy, behind a `DeckStore` interface so another store can replace it later. The adapter choice (IndexedDB recommended for size; localStorage acceptable) is an implementation choice. | [[ADR-0005 MVP Product Defaults]] #1; [[ADR-0006 Two Imports - Collection and Decks]] consequences; [[ADR-0001 Tech Stack]] |
| DECK-091 | MUST | Each record has `schemaVersion: 1`. On load, older versions are migrated; a record with a **newer** version than the app knows is shown read-only and never overwritten. | design rule |
| DECK-092 | MUST | Limits: at most **200 decks**; per deck at most **150 entries** (lines after merging) and **300 copies** in total. Over a limit → error `DECK_LIMIT` / `DECK_TOO_LARGE` at save, nothing written. (A legal deck with a full sideboard has 66 cards: 1 + 1 + 39 + 12 + 3 + 10, so the caps leave room for illegal work-in-progress decks.) | [[Deck Construction Rules]] summary; design rule |
| DECK-093 | MUST | Writes are atomic per deck: a failed write (e.g. quota exceeded → `STORAGE_FULL`) leaves the previous record intact and tells the user. | design rule |
| DECK-094 | SHOULD | A save carries the `updatedAt` it was based on; if the stored record has a newer `updatedAt` (another tab), ask "This deck changed in another tab. Overwrite or reload?" | design rule |
| DECK-095 | MUST | Stored decks contain card **keys, names and quantities only**: no card text, images or other Riot content copies (those come from the catalog at display time). | [[Card Data Model]] CARD-007 |
| DECK-096 | MUST | **Deck entries are by `cardKey`, never by printing.** A `DeckCard` stores no printing, variant, set, ownership, owned count or tag. A printing named by the source (deck code, TTS, or a printing code on a text line, DECK-015) is used only to resolve the `cardKey` and is then dropped; entries of one name in one zone merge (DECK-021). Ownership is computed by the consumer, [[Your Decks Ownership View]] (SPEC-005): it groups each deck card by card name, can expand it to the exact owned printings, and does not count printings carrying a tag marked "exclude from decks". Nothing in this spec changes when collection, printings or tags change. | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 #5, #6; [[Card Data Model]] CARD-012, CARD-013 |

## Data contract
```ts
// shapes only; no implementation
import type { SourceFormat, ImportIssue, ParsedLine, Suggestion, SourceLocation } from './collection-import'; // SPEC-003
import type { Zone, FormatId, LegalityResult, DeckInput } from './deck-legality';                         // SPEC-002

type CardKey = string;          // SPEC-001 PlayableCard.cardKey
type IsoDate = string;          // 'YYYY-MM-DD' (SPEC-004 ISODate)
type IsoDateTime = string;      // ISO 8601 UTC
type DeckZone = Zone;           // 'legend' | 'champion' | 'main' | 'sideboard' | 'runes' | 'battlefields'

type DeckSourceFormat = SourceFormat | 'tournament' | 'manual'; // v0.4: includes 'csv' (.csv / .xlsx upload, DECK-011)

interface DeckCard {             // DECK-096: by cardKey only; no printing, ownership or tags
  cardKey: CardKey;
  name: string;                 // canonical name at save time (display fallback, DECK-088)
  qty: number;                  // 1..999
}

// The deck-source union. Owned by this spec; SPEC-004 CAT-072 references TournamentDeckSource from here.
type DeckSource = UserDeckSource | TournamentDeckSource;

interface UserDeckSource {      // DECK-071; text and url both null = no source
  kind: 'user';
  text: string | null;
  url: string | null;
}

interface TournamentDeckSource {  // DECK-061; "Add to your decks" (SPEC-004 CAT-072)
  kind: 'tournament';
  eventId: string;                  // '2026-11-rc-europe'
  eventName: string;                // 'Regional Championship: Europe'
  eventStartDate: IsoDate;
  eventEndDate: IsoDate;
  region: string;
  decklistId: string;               // '2026-11-rc-europe-1'; duplicate key (DECK-064, CAT-074)
  publishedRank: number;            // 1
  placingLabel: string;             // '1st'
  pilot: string;                    // 'ASC Evansrhim'
  sourceUrl: string;                // Riot article
  addedAt: string;                  // ISO date-time of the click
}

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
  importRemovedLines?: string[];// DECK-042 / DECK-026, raw text of removed or rejected lines
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
  | 'MULTIPLE_DECKS'           // v0.4: FORMAT_NOT_FOR_DECKS removed (CSV/Excel accepted, DECK-011)
  | 'ZONE_CATEGORY_MISMATCH' | 'NO_SIDEBOARD_SECTION' | 'ZONE_INFERRED' | 'TOKEN_NOT_DECK_CARD'
  | 'SOURCE_URL_INVALID' | 'DECK_LIMIT' | 'DECK_TOO_LARGE' | 'STORAGE_FULL';

interface DeckImportLine extends ParsedLine {   // SPEC-003 ParsedLine (status, resolved, suggestions, issues)
  zone: DeckZone | null;        // null while a zone question is open
  zoneMethod: ZoneMethod | null;
  zoneReason?: string;          // e.g. "Section 'Rune Pool' (line 9)" or "Card type is Battlefield"
  removedByUser: boolean;       // DECK-041
  rejectedToken: boolean;       // DECK-026
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
Criteria that depend on `category`/`isChampionUnit`/`championTag`/`isSignature` assume SPEC-001 provides
them for these cards (the API sources in CARD-024, CARD-026, CARD-027 are BLOCKED on research). Dates are
shown in the display format (`Nov 23, 2026`).

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
   **And** legality (`asOf` 2026-11-23) is `illegal` ("Not legal in Standard today") with LEGAL-016 listing
   `Nocturne, Horrifying` and `Rhasa the Sunderer` (zone `main`, Radiance ban list update), each shown
   "banned since Nov 23, 2026" from `banStatus()`; the count rules pass. **When** the user clicks Save **Then** the deck is stored and appears in Decks.

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
   "Card type is Legend"), `Kennen, Storm of Shuriken` (`isChampionUnit: true`, `isSignature: false`,
   `championTag: 'Kennen'`) → `champion` (inferred: "only champion unit matching the Legend"), runes and
   battlefields inferred by category, `Lightning Rush` and `Gust` (each a non-champion `unit`, `spell` or
   `gear` in SPEC-001) → `main`; each inferred line shows its reason and can be changed; no questions; legality reports
   LEGAL-003 failing (main 6, needs 40) but Save is enabled.

5. **No sideboard section** (DECK-037) **Given** the full `KENNEN_1` as plain lines, main and sideboard
   cards together, no labels **When** parsed **Then** all non-zone cards go to `main` (`An Offer You
   Can't Refuse` merged to 2 in `main`), info `NO_SIDEBOARD_SECTION` is shown, nothing goes to
   `sideboard`, and LEGAL-003 reports main 50 (+10).

6. **Unknown category → ask** (DECK-032, 035) **Given** plain `2 Gust` where SPEC-001 has
   `category: 'unknown'` for `Gust` **When** parsed **Then** a `PICK_ZONE` question for line 1 defaults to
   Main Deck but is unanswered and Save is disabled; **When** the user chooses "Put all in Main Deck"
   **Then** `Gust` is in `main` with `zoneMethod: 'user'` and Save is enabled.

7. **Section label beats card data** (DECK-022, 023) **Given** `Main Deck:` / `1 Zaun Warrens`
   (`category: 'battlefield'`) **When** parsed **Then** `Zaun Warrens` stays in `main` with warning `ZONE_CATEGORY_MISMATCH` ("Zaun Warrens is a
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

11. **Add to your decks from Tournaments** (DECK-060…062, 065) **Given** the RC Europe 1st-place decklist
    by ASC Evansrhim (`2026-11-rc-europe-1`, event `2026-11-rc-europe` "Regional Championship: Europe",
    `publishedRank: 1`, `placingLabel: "1st"`) and an empty Decks screen **When** the user clicks "Add to your
    decks" **Then** one `UserDeck` exists with `source = {kind: 'tournament', eventId: '2026-11-rc-europe',
    eventName: 'Regional Championship: Europe', eventStartDate, eventEndDate, region: 'Europe',
    decklistId: '2026-11-rc-europe-1', publishedRank: 1, placingLabel: '1st', pilot: 'ASC Evansrhim',
    sourceUrl: 'https://playriftbound.com/en-us/news/organizedplay/best-ofs-for-the-european-championship',
    addedAt: <time of click>}` (event fields copied from the catalog event), `sourceFormat: 'tournament'`,
    name `Kennen: ASC Evansrhim (1st, Regional Championship: Europe)`, zones and `cardKey`s equal to the
    catalog list, no parse step, no suggestions and no zone questions, and it shows "Contains cards banned
    since Nov 23, 2026".

11a. **Already added** (DECK-064) **Given** the AC 11 deck exists **When** the user views
    `2026-11-rc-europe-1` on Tournaments **Then** the button reads "In your decks" and clicking it opens
    that deck without creating another. **When** the user clicks "Add another copy" **Then** a second deck
    `Kennen: ASC Evansrhim (1st, Regional Championship: Europe) (2)` exists with the same
    `source.decklistId`; another click on it creates `… (3)`. **When** the user deletes all copies
    **Then** "Add to your decks" is shown again.

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
    deleted and confirmed **Then** it is gone from Decks and the collection is unchanged.

15. **Limits** (DECK-092, 093) **Given** 200 stored decks **When** the user saves another **Then**
    `DECK_LIMIT`, nothing written. **Given** a paste with 301 copies **Then** Save gives
    `DECK_TOO_LARGE`.

16. **CSV/Excel deck with sections; multiple codes refused** (DECK-001, 011, 012, 020) **Given** an
    uploaded `deck.csv`
    ```
    Qty,Name
    Legend:
    1,Kennen,Heart of the Tempest
    MainDeck
    3,Lightning Rush
    2x Hextech Ray
    Rune Pool:
    9,Chaos Rune
    ```
    **When** the user starts Deck Import with it **Then** the title row is skipped, the text box holds
    `Legend:` / `1 Kennen, Heart of the Tempest` / `MainDeck` / `3 Lightning Rush` / `2x Hextech Ray` /
    `Rune Pool:` / `9 Chaos Rune`, the dialog shows "Legend 1", "Main Deck 5", "Rune Pool 9", and review
    puts `Kennen, Heart of the Tempest` in `legend`, `Lightning Rush ×3` and `Hextech Ray ×2` in `main`,
    `Chaos Rune ×9` in `runes`, all `zoneMethod: 'section'`, `sourceFormat: 'csv'`. The same rows in the
    first sheet of `deck.xlsx` give the same result. **Given** two Piltover codes on two lines **When**
    pasted and parsed **Then** input-level error `MULTIPLE_DECKS`.

16a. **Every line needs a quantity** (DECK-001; IMP-021) **Given** `Main Deck:` / `Lightning Rush` /
    `3 Hextech Ray` **When** pasted **Then** line 2 → `MISSING_QUANTITY` and is left out, `Hextech Ray ×3`
    is in `main`, and Continue is enabled (one valid entry).

17. **Parse writes nothing** (DECK-003) **Given** any input **When** parsed and reviewed but not saved
    and the page is reloaded **Then** the deck store is unchanged.

18. **Incomplete is not legal** (DECK-052) **Given** a deck whose cards lack `domains` in SPEC-001
    **When** reviewed **Then** the verdict reads "Not fully checked" with the reason, never "Legal".

19. **Newer schema is read-only** (DECK-091) **Given** a stored record with `schemaVersion: 2` **When**
    the app (knowing v1) loads **Then** it is shown read-only and no write touches it.

20. **Token rejected** (DECK-026, 032) **Given** plain text `3 Lightning Rush` / `1 <a card with
    category 'token'>` **When** parsed **Then** the token line is in no zone, carries warning
    `TOKEN_NOT_DECK_CARD`, its raw text is in `importRemovedLines` after save, and Save is not blocked
    by it.

21. **Several champion candidates → ask** (DECK-034) **Given** plain text with Legend
    `Kennen, Heart of the Tempest` and two unsectioned Champion Units both known to have
    `championTag: 'Kennen'` and `isSignature: false` **When** parsed **Then** nothing goes to `champion`
    silently; `PICK_CHAMPION` lists exactly those two; **When** the user picks one **Then** one copy of it
    is in `champion` (`zoneMethod: 'user'`) and all other copies stay in `main`.

22. **Entries by cardKey only** (DECK-096) **Given** TTS input `OGN-265-1 OGN-265-1` for a printing of
    a `unit` card **When** saved **Then** the stored `DeckCard` has only `cardKey`, `name` and `qty: 2`
    (no printing, ownership or tag field), and changing the collection or tags afterwards leaves the
    stored deck byte-identical.

23. **Quantity forms and printing codes in a deck** (DECK-014, 015, 041, 096; SPEC-003 IMP-020, IMP-064…069)
    Uses SPEC-003 fixture F1 (hypothetical collector numbers). **Given** the paste
    `Legend: 1 Kennen, Heart of the Tempest (OGN 299/298)` / `Main Deck:` / `Lightning Rush x3 RAD 001 /167` /
    `x2 Hextech Ray` / `2 RAD 001a` / `1 Hextech Ray RAD 001` **When** parsed and reviewed **Then**
    `Kennen, Heart of the Tempest` is in `legend`; `Lightning Rush` is 5 in `main` (lines 3 and 5 merged by
    `cardKey`, DECK-021); `Hextech Ray ×2` is in `main`; line 6 is `needs-review` with
    `PRINTING_NAME_MISMATCH` and Save is disabled ("1 card needs attention"). **When** the user picks
    `Hextech Ray` **Then** `main` has `Hextech Ray ×3`, Save is enabled, and the saved `DeckCard`s hold
    only `cardKey`, `name` and `qty` (no printing). **Given** instead `Main Deck:` / `3 Lightning Rush RAD 999`
    **Then** `Lightning Rush ×3` is in `main` with warning `UNKNOWN_PRINTING` and Save is not blocked.

## Out of scope
- **Fetching URLs** or importing from a deck site by link or API (DECK-072; IMP-005).
- **Accounts, sync, cloud backup** ([[ADR-0005 MVP Product Defaults]] #1).
- **Sharing decks** (share links, public decks, deck codes as output). Export is text for the user only.
- Importing several decks at once; Pixelborn codes. (CSV/Excel deck import is in scope since v0.4, DECK-011.)
- Ownership display, partial colouring and the deck-level owned summary (SPEC-005 [[Your Decks Ownership View]]).
- Formats other than Standard; 2v2, Limited.
- Deck statistics, curves, ratings, or any metagame number ([[ADR-0003 Tournament Results Only]]).

## Open questions / BLOCKED
- **BLOCKED: needs research**: whether Piltover Archive deck codes encode the Legend, Chosen
  Champion, runes and battlefields, and in which group (DECK-039); plus a real code with known
  contents as a fixture. Until then a code is treated as an unsectioned main deck + sideboard.
- **BLOCKED: needs research (via SPEC-001)**: the API type strings for spells, gear, champion units and
  tokens (CARD-024 mapping table) and the API sources for `isChampionUnit`, `championTag`,
  `isSignature` (CARD-026, CARD-027). Until they exist, those cards are `category: 'unknown'` or carry
  `null` attributes, so inference (DECK-032…034) mostly produces zone questions; the feature still
  works, with more questions.
- **Needs research (via SPEC-001 open question on tokens)**: confirm that token cards can never be in a
  deck. DECK-026 rejects them with a warning until then.
- **Unconfirmed**: the Riftbound Play Network "Export → TXT" layout (SPEC-003 IMP-023). If it uses
  other labels, they are added to IMP-017.
- **Resolved (H-039)**: SPEC-003 v0.3's Part A preamble lists the same deck exceptions as DECK-013;
  SPEC-004 v0.4 CAT-071 cites DECK-065 and CAT-073 trims the default name to 80 characters like DECK-062
  (CAT-072 and the CAT-073 example already matched).
- **Resolved (H-048)**: RJ decision 2026-11-23: `x3 Name` / `Name x3` and printing codes on a line are accepted for decks too (DECK-014, DECK-015); the code never reaches the stored deck (DECK-096).
- **Needs RJ**: confirm DECK-041 (unknown names must be fixed or removed before saving, rather than
  saved as placeholders) and the limits in DECK-092 (200 decks, 300 copies).
- **Defaults chosen by Claude (RJ may change, ADR-0006 H-036 #7)**: display date format `Nov 23, 2026`
  and the label "Not fully checked".

## Changelog
Current: 0.6 (2026-11-23, H-058). Full history: [[Deck Import changelog]] (archived). New entries go in the archive note.
