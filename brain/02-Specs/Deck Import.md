---
tags: [spec]
id: SPEC-006
version: 0.16.1
status: review   # RJ approved 0.15 (H-483, 2026-11-26, in chat, S4-S7 answered); 0.16 (H-197) adds DECK-106 with two proposals for RJ (H-653). Earlier: RJ approved 0.12 on 2026-11-26 (H-342, in chat); 0.13 adds RJ's H-479 decisions (a)-(c); 0.14 adds RJ's S3 decision (H-454); 0.14.1 (H-501) is a text catch-up to the build
depends_on: [SPEC-001, SPEC-002, SPEC-003, SPEC-004, SPEC-008]
consumers: [SPEC-005, SPEC-008]
research: ["[[Collection Import Formats]]", "[[Deck Construction Rules]]", "[[Physical Copies Across Decks]]", "[[Ban List]]", "[[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]]", "[[2026-11 RC Europe - 2 - Sonecon - Riven]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-030, H-252, H-320, H-342, H-454, H-479, H-483, H-500, H-501, H-197
as_of: 2026-11-26
---
# SPEC-006: Deck Import

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** import a complete community deck (paste, or upload `.txt` / `.csv` / `.xlsx`) into Decks: parse → review (zones, names, legality) → save. Labelled **"Import deck"** and opened in a dialog from a floating button on the Decks page (v0.9, DECK-001); there is no import page. Second path: "Add to your decks" from Tournaments.

**Key requirements**
- DECK-001 (v0.9, H-174): **"Import deck"** opens the shared paste-or-upload dialog (SPEC-003 IMP-062/063) from a floating button on `/decks` (SPEC-005 OWN-094), the empty state's button, or `/decks?import=1` (SPEC-010 SYNC-159); a saved deck stays on Decks; `/import` is removed and goes to Home. Uploads land in the editable text box; every line needs a quantity (IMP-021).
- DECK-002/003: one import = at most one deck; only Save writes; the collection is never changed.
- DECK-010/013: reuses SPEC-003 Part A, incl. CSV/Excel (v0.4); only IMP-009 and IMP-015 are not applicable to decks.
- DECK-011: CSV/Excel rows follow the same line rule; section labels work in one-cell rows.
- DECK-014/015 (v0.5): `x3 Name` / `Name x3` and printing codes on a line (`3 Lightning Rush RAD 001/167`, SPEC-003 IMP-020, IMP-064…070) are accepted; the code only resolves the `cardKey` and is then dropped.
- DECK-020/021: section labels (any case, with or without spaces; v0.10: `*` bold marks and a trailing `:` are stripped, SPEC-003 IMP-016, official) map to zones; the same card in two zones stays separate.
- DECK-010/039 (v0.10, H-166): Piltover code tables and variant letters (IMP-031…033) and the TTS **art number** (IMP-036, IMP-036a: not a copy count; 1 = base, above 1 = alternate art) are reused from SPEC-003 and are **community**-sourced; they only resolve the `cardKey`, the printing is dropped (DECK-096).
- DECK-030/032: zones are never guessed silently: inferred from SPEC-001 `category` or asked as zone questions.
- DECK-026: token cards are rejected with a warning.
- DECK-041: a deck can't be saved while any name is unresolved (fix or remove the line).
- DECK-050/051: SPEC-002 legality is shown and never blocks saving; ban status via `banStatus()`.
- DECK-055: the verdict is not stored; it is computed as of today.
- DECK-061/062/064: `TournamentDeckSource` defined here; default name `<Legend>: <pilot> (<placing>, <event>)` ≤ 80; "In your decks" / "Add another copy".
- DECK-090/096: decks belong to the signed-in account; `DeckStore` is the browser cache of them (v0.8, account-only: SPEC-010 SYNC-140…, cleared on sign-out, account deletion and when another account signs in); deck entries by `cardKey` only (no printing, ownership or tags).
- DECK-097 (v0.8): deck import and the Tournaments "Add to your decks" path need a signed-in account: they are behind the SYNC-009 sign-in gate, with no exception.
- DECK-080/082/083/084 (v0.6): a **locked** deck (SPEC-008) can't change cards; Delete releases the lock;
  Undo and Duplicate give unlocked decks. Locks live in SPEC-008's `DeckLockStore`, not in `UserDeck`.
- **v0.11 (H-252, RJ 2026-11-25, [[Decks]] brief + H-260):** DECK-070 an imported deck is **named after its Legend** (the full canonical name; follows the Legend until the user types a name; fallback `Imported deck <date>`; names need not be unique, no suffix on import). DECK-073 the deck **description** is the existing `notes` field (no new field, `schemaVersion` stays 1). DECK-081 **Rename works at any time on every deck**, tournament and **locked** decks too (a lock freezes cards, not the name; SPEC-008 SHARE-025); tournament `source` stays read-only. DECK-080 the **card editor is deferred** (RJ #14: Rename only for now). DECK-082 the Delete confirmation no longer says "This can't be undone." (Undo exists). DECK-084 feedback "Deck duplicated." DECK-098 new: after Save, "Deck saved." with "View deck". ACs 26…29. Status `review`. **v0.11.1 (H-320, RJ 2026-11-25): Open questions (a)…(c) are answered with the written defaults: (a) the description reuses `notes`; (b) same-Legend imports get the same name with no suffix, tournament decks keep the DECK-062 name; (c) a rename updates `updatedAt` and moves the deck to the top of the list. No requirement changed; attribution and AC 28 only.**
- **v0.12 (H-342, RJ 2026-11-25 in chat, H-253 row; [[Deck Construction Rules]] facts 1, 4, 15, `verified`, as of 2026-11-24):** DECK-033 2+ Legends (in `Legend:` or unsectioned) → the user **picks one, the others leave the deck** (their text goes to `importRemovedLines`); DECK-034 2+ cards under `Champion:` → the user picks one, **the others and extra copies of the pick go to `main`** (as built); "Leave empty" stays for both (DECK-036, DECK-050); **new DECK-027:** the `champion` slot holds **one copy**, so `Champion: 2 <champion>` (one line, quantity above 1) puts 1 in `champion` and the extra copy in `main` (Core 103.3.a; **the build still keeps 2 in `champion`: builder item H-410**); new DECK-099 adopts the builder's review and save strings (RJ approved 2026-11-25), except the two champion reason lines, which wait for H-341; ACs 7 and 23 fixed so Save really is enabled (DECK-034, DECK-038); new ACs 30…33.
- **v0.13 (H-479, RJ 2026-11-26 in chat, [[Critique H-341 Deck Import Review]] §6):** DECK-100 **Back keeps the answers for lines that did not change** (zone, Legend, Chosen Champion and Section picks, removed lines); answers tied to edited or removed lines are dropped. DECK-101 defines "line did not change" (a **proposal**: same trimmed text, same section context, same occurrence; RJ did not specify it). DECK-102 **no confirmation** on Cancel or Escape after answering (as built). DECK-103 the Import deck dialog is **full screen at 40rem and below**. ACs 34…38. Build: H-480 (DECK-100, 101); DECK-103 is H-453.
- **v0.14 (H-454, [[Critique H-341 Deck Import Review]] §5 S1-S7):** **S3, RJ 2026-11-26:** DECK-104 the `PICK_LEGEND` question is **held** while the input has a Legend line that is unresolved: no new prompt wording (so the `legendUnresolved` string built on the unmerged branch `loop/H-410-H-480-deck-import-review` in H-452 is not specified); AC 39; build H-500. **S4 (proposal in 0.14; RJ decided it in 0.15, see below):** DECK-105 a Section pick of Chosen Champion on a line with quantity above 1 keeps 1 copy in `champion` and the rest in `main` (DECK-027 applied to the Section select); AC 40. **S1, S2** wait for research (H-020, H-099); **S5, S6, S7**: proposals in 0.14, answered by RJ in 0.15 (below), no requirement changed. DECK-036 gets a pointer to DECK-104.
- **v0.15 (H-483, RJ 2026-11-26 in chat, S4 to S7):** **S4:** keep as built; DECK-105 is **RJ's decision**, no longer a proposal (a Chosen Champion pick in a Section select on a quantity above 1 line keeps 1 copy in `champion`, the rest go to `main`); Legend and Chosen Champion **stay in the Section selects** (no hiding); a Legend picked there with quantity above 1 is **stored as given**, as the `Legend:` path does today. **S5:** keep `needAttention` ("{n} cards need attention") as built and approved, though it counts lines. **S6:** no bulk "Remove all lines to fix" for now; revisit after live card data (H-020). **S7:** keep as built (a line whose name does not match but whose code does resolves to the code's card with the `codeUsed` warning and a Remove line button, SPEC-003 IMP-068 (c)). **No requirement text changed other than DECK-105's level and source.** S1 and S2 stay open, waiting on research (H-020, H-099). Status `approved` (RJ approved 0.14.x).
- **v0.14.1 (H-501, text catch-up to the build, [[Validation H-480]], [[Validation H-500]]):** no requirement added and no behaviour decided. DECK-099 now holds the review strings built after RJ's 2026-11-25 approval (the three tables below mark them), including the champion reason lines and `championMany` that waited for H-341; AC 40's Given is made satisfiable (the line is unsectioned); AC 39 names its pick path (suggestions wait for H-272); three builder choices are recorded in Open questions (v0.14.1) for RJ, and added to the H-483 gate.
- **v0.16 (H-197, RJ 2026-11-25, H-193: "Sample cards are NOT legal", "we can just leave them out entirely"):** new DECK-106: SAMPLE printings are left out of deck import too (SPEC-003 IMP-077): a printing code that names one is "not in the card data" (the code never reaches the deck anyway, DECK-096), and a card that exists only as a SAMPLE printing is an unknown name (DECK-041). Needs the SPEC-001 CARD-044 marker (BLOCKED, H-020): until then nothing is left out. The two readings are **proposals**, not RJ's words (for RJ: H-653); AC 41. Sits on top of 0.15 (H-483, approved) and 0.14.1 (H-501); no other requirement changed.

**Shared types:** `UserDeck` · `DeckCard` (`cardKey`, name, qty) · `DeckSource` = `UserDeckSource | TournamentDeckSource` · `DeckZone` (= SPEC-002 `Zone`) · `DeckImportResult` · `ZoneQuestion` · `DeckStore`.
**Depends on:** [[Card Data Model]] v0.4.2, [[Deck Legality]] v0.6 (pin-only, H-645, H-485), [[Collection Import]] v0.16 (pin-only, H-664; v0.14.1 pin: H-501), [[Tournament Deck Catalog]] v0.7, [[Shared Cards and Lock-in]] v0.6 (lock rules for DECK-080/082…084: "locked" now means every card name locked, SHARE-083; delete removes all the deck's name locks, SHARE-024; pin-only, H-664, no version bump; v0.4.6 pin: H-256). **Saving an imported deck is a major action: it syncs at once ([[Accounts and Sync]] SYNC-126, H-666; pin-only, no requirement of this spec changed).** **Consumers:** [[Your Decks Ownership View]]; [[Shared Cards and Lock-in]]; [[Tournament Deck Catalog]] (Add path).
**BLOCKED (needs research):**
- Which zone each Piltover group maps to: whether codes carry the Legend and battlefields, and how V3+ chosen champion, runes and additional legends groups are tagged (DECK-039; V3…V6 named by fact 7, layout not in research).
- API type strings and champion/signature fields (via SPEC-001), so inference mostly asks zone questions.
- Whether token cards can ever be in a deck (DECK-026, via SPEC-001).

## Purpose
Let a user bring in a **complete deck someone else built** (a forum post, a deck site, a friend's
list) because they want to build it. They may own none of it. The result is a **user deck** in
**Decks** ([[ADR-0006 Two Imports - Collection and Decks]]). [[Your Decks Ownership View]]
(SPEC-005) is the consumer: it shows each card of a user deck against the user's collection.

Deck import is **"Import deck"** on the Decks page, "Created deck list that you want to make"
([[Design Direction]]); there is no import page since v0.9 (RJ 2026-11-24, [[ADR-0006 Two Imports - Collection and Decks]]).
The other import, **"Add to your collection"** (owned cards), is [[Collection Import]] (SPEC-003), opened from Collection.

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
| DECK-001 | MUST | **Entry point and label (v0.9, H-174).** Deck import is labelled **"Import deck"** and is reached from the **Decks** page, in a dialog, from exactly these places: (a) the **floating button** at the bottom right of `/decks` (SPEC-005 OWN-094; same form, position, phone collapse and page-end spacing as Collection's, SPEC-007 COLL-094); (b) the **Import deck** button of the Decks empty state (OWN-008); (c) the one-shot address `/decks?import=1` (Home's "Import deck" button and the sign-in return path, SPEC-010 SYNC-159). There is **no import page**: `/import` is removed and goes to Home (SYNC-159). A saved deck **stays on Decks**: the dialog closes and the page does not navigate. The dialog is the shared paste-or-upload dialog (SPEC-003 IMP-062, IMP-063; title "Import deck", hint "Section labels like "Main Deck:" are kept."). Input is pasted text or an uploaded `.txt`, `.csv` or `.xlsx` file (IMP-001, IMP-061), written into the editable text box. Every line needs a quantity (IMP-021). The dialog also shows copies per section as parsed (unlabelled entries as "No section"). | [[Design Direction]] 2026-11-23; [[ADR-0006 Two Imports - Collection and Decks]]; RJ decision 2026-11-23 (H-043) |
| DECK-002 | MUST | One import produces **at most one** deck. It goes into **Decks** only and never changes the collection. | [[ADR-0006 Two Imports - Collection and Decks]] |
| DECK-003 | MUST | Parsing and review MUST NOT write to the deck store. Only an explicit **Save** creates the deck (same principle as IMP-002). Leaving or reloading the page before saving stores nothing. | design rule |
| DECK-004 | MUST | Import is tolerant: one bad line never aborts it (IMP-003). Every issue is reported with its location (IMP-056). | [[Collection Import]] IMP-003, IMP-056 |
| DECK-005 | MUST | The second entry path, **Add to your decks** on a Tournaments decklist (SPEC-004), creates a `UserDeck` by copying the catalog decklist's zones and `cardKey`s (DECK-060…065). It does not parse text and does not run name resolution. | [[ADR-0006 Two Imports - Collection and Decks]] follow-up decisions |
| DECK-006 | MUST | Raw input is never sent to a third party; resolution runs only against our own card catalog (IMP-005). | [[Riot Developer Rules]] #7 |

### B. Input formats (shared parsing)
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-010 | MUST | Deck import reuses SPEC-003 **Part A** (shared parsing), as SPEC-003 states, with only the exceptions in DECK-013. Reused unchanged: flow **IMP-001, IMP-002, IMP-003, IMP-005, IMP-061, IMP-062, IMP-063**; limits and encoding **IMP-006, IMP-007, IMP-008, IMP-010**; detection **IMP-011, IMP-012, IMP-013, IMP-014**; text grammar **IMP-016 … IMP-024** and the Line grammar (IMP-018 for its parser part: labels are not entries, each line keeps its section, nothing is merged across sections); printing codes in text lines **IMP-064 … IMP-070** (v0.5); CSV/Excel **IMP-040 … IMP-046** (v0.4); name resolution **IMP-025 … IMP-030, IMP-059**; Piltover deck codes **IMP-031 … IMP-035** (v0.10: set table to RAD, variant letters and the `SP` prefix, IMP-032, IMP-033); TTS **IMP-036, IMP-036a, IMP-037 … IMP-039** (v0.10: the trailing number is an art number, IMP-036a); error reporting **IMP-056, IMP-057**. If SPEC-003 renumbers or relabels these, the reference follows the requirement, not the number. | [[Collection Import]]; [[Collection Import Formats]] |
| DECK-011 | MUST | Accepted source formats: `riot-text`, `plain-text`, `piltover-code`, `tts`, and `csv` (a `.csv` or `.xlsx` upload). CSV/Excel rows follow SPEC-003 IMP-040 … IMP-043: one cell `3x Name`, or a quantity cell then the name; a first row of column titles is skipped. **Section labels work in one-cell rows** (e.g. a row `Main Deck:`), so a spreadsheet laid out like Riot text keeps its sections and zones (DECK-020). *(v0.3 refused CSV with `FORMAT_NOT_FOR_DECKS`; removed in v0.4.)* | RJ decision 2026-11-23 (H-043) |
| DECK-012 | MUST | IMP-015 (several deck codes as one import) does **not** apply. More than one deck code in the input gives input-level error `MULTIPLE_DECKS` ("Paste one deck at a time"). | DECK-002 |
| DECK-013 | MUST | **Part A requirements not applicable to decks** (the same exceptions SPEC-003's Part A preamble lists): **IMP-009** (collection total cap after merging), replaced by DECK-092; **IMP-015** (several deck codes), replaced by DECK-012. No other Part A requirement is excepted; since v0.4 the CSV/Excel parts (IMP-001 `.csv`/`.xlsx`, IMP-011 step 1, IMP-040 … IMP-046) apply to decks too (RJ decision 2026-11-23 (H-043)). SPEC-003 **Part B** (IMP-004, IMP-047 … IMP-055, IMP-058, IMP-060) is collection-specific and is not reused; sections C–J of this spec define the deck behaviour instead. | [[Collection Import]] Part A preamble; [[ADR-0006 Two Imports - Collection and Decks]] |
| DECK-014 | MUST | Riftbound card names contain commas (`Kennen, Storm of Shuriken`); the name is the whole card part of the line once the quantity and an optional printing code at its start or end are removed (IMP-019, Line grammar). The quantity may lead or trail (`3x Name`, `x3 Name`, `Name x3`; IMP-020). In CSV/Excel rows, cells after the quantity are re-joined with `, ` (IMP-040). | [[Collection Import Formats]] table; RJ decision 2026-11-23 (H-043); RJ decision 2026-11-23 (H-048) |
| DECK-015 | MUST | **Printing codes in deck lines** (v0.5). A deck line may carry a printing code (`3 Lightning Rush RAD 001/167`, `Legend: 1 Kennen, Heart of the Tempest (OGN 299/298)`, code-only `3 RAD 001/167`), parsed and resolved exactly as SPEC-003 IMP-064 … IMP-070. The code is used **only to resolve the `cardKey`** and is then dropped (DECK-096); the zone still comes from the section or from inference (DECK-020, DECK-030). For saving (DECK-041): a line in `needs-review` because of `PRINTING_NAME_MISMATCH` or `AMBIGUOUS_PRINTING`, and a code-only line with error `UNKNOWN_PRINTING`, block Save until fixed or removed; a **resolved** line that only carries warning `UNKNOWN_PRINTING` (name fallback), `PRINTING_NAME_MISMATCH` (code used) or `VARIANT_UNMAPPED` does not block. Before the card catalog is loaded, review and Save wait (IMP-066). | RJ decision 2026-11-23 (H-048); [[Collection Import]] IMP-064 … IMP-070 |

### C. Sections to deck zones
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-020 | MUST | Unlike owned-card import, **sections matter**. Section labels (IMP-016, IMP-017: any case, with or without spaces, optional leading `#`, optional `*` bold marks and optional trailing colon (v0.10: `**Legend:**` = `Legend:`, IMP-016), optional entry after the colon per IMP-023) map to zones: `Legend`/`Legends` → `legend`; `Champion`/`Champions` → `champion`; `Main Deck`/`MainDeck`/`Main` → `main`; `Battlefields`/`Battlefield` → `battlefields`; `Rune Pool`/`RunePool`/`Runes`/`Rune Deck`/`RuneDeck` → `runes`; `Sideboard` → `sideboard`. Each entry under a label (including one on the label line itself) is assigned that zone with `method: 'section'`. | [[Collection Import Formats]] fact 1 (official); [[Deck Construction Rules]] #1, #11; RJ decision 2026-11-23 (H-043) (spacing, aliases) |
| DECK-021 | MUST | Within one zone, entries with the same `cardKey` are merged (quantities summed, source lines kept). Across zones they stay **separate**: `1 An Offer You Can't Refuse` in Main Deck and again in Sideboard is 1 in `main` and 1 in `sideboard`, not 2 in one place. | [[Deck Construction Rules]] #9 (copy limit counted across zones by SPEC-002, not by merging) |
| DECK-022 | MUST | A section label is the user's (or author's) statement and **wins over card data**. If an entry's known card data disagrees with its section, the entry stays in the labelled zone and gets warning `ZONE_CATEGORY_MISMATCH` naming the expected zone from the DECK-032 table. Disagreement means: a `legend`, `rune` or `battlefield` outside its own zone (e.g. `Zaun Warrens`, a battlefield, under `Main Deck`); a known non-`legend` under `Legend`; a known non-Champion Unit under `Champion`; a `unit`, `spell`, `gear` or `champion` under `Runes` or `Battlefields`. `category: 'unknown'` or a `null` attribute never produces this warning. SPEC-002 then reports it (LEGAL-015 / LEGAL-014). | design rule; [[Deck Legality]] LEGAL-014, LEGAL-015 |
| DECK-023 | SHOULD | A `ZONE_CATEGORY_MISMATCH` warning offers a one-click "Move to <zone>". Nothing moves without that click. | design rule |
| DECK-024 | MUST | A section label that appears twice (e.g. two `Sideboard:` blocks) appends to the same zone. | design rule |
| DECK-025 | MUST | If a published list puts the Chosen Champion inside `Main Deck` **and** also lists it under `Champion`, both entries are kept as written (champion 1, main +1). The importer MUST NOT dedupe; SPEC-002 LEGAL-003/005 report any count problem. Riot's lists show the champion only under Champion, so this normally does not arise. **v0.12 (H-342): this is about the champion on two separate entries (two zones). Several copies inside the `Champion` zone itself are DECK-027, not this rule.** | [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] notes (main lists 39 non-champion cards) |
| DECK-026 | MUST | **Tokens are not deck cards.** An entry whose resolved card has `category: 'token'`, in any section or unsectioned, is **rejected**: it is not added to any zone, gets warning `TOKEN_NOT_DECK_CARD` ("<name> is a token and can't be put in a deck") with its location, and its raw text is added to `importRemovedLines` (DECK-042). It does not block saving. | board H-030 retry 1; [[Card Data Model]] CARD-024 (`token` category); research confirmation pending (Open questions) |
| DECK-027 | MUST | **The `champion` slot holds one copy (v0.12, H-342).** The Chosen Champion is one card ([[Deck Construction Rules]] fact 4, Core 103.3.a), and further copies of the same name are ordinary cards that count toward the copy limit (fact 15, 103.3.a.3). So when the entries that end up in `champion` (from a `Champion:` section, or by DECK-034) add up to **more than one copy of the same card**, **1 copy stays in `champion` and the other copies go to `main`** (`zoneMethod: 'user'` if the user picked it, else the label's `section`), each shown with a reason line (DECK-030). Example: `Champion:` / `2 Kennen, Storm of Shuriken` → `champion` 1, `main` +1. Copies are never dropped or deduped: the total is unchanged (DECK-025). This is **one** card with several copies; two or more **different** cards under `Champion:` are DECK-034 (b). Because SPEC-002 `DeckInput.chosenChampion` carries a name and no quantity (LEGAL-003 counts it as 1), a stored `champion` with qty 2 would lose a copy in the legality count. | RJ, 2026-11-25 (in chat, H-253 row) for the 2+ cards case; [[Deck Construction Rules]] fact 4, fact 15 (`verified`, as of 2026-11-24); [[Deck Legality]] LEGAL-003, LEGAL-004; settled by the rules and our zone model, not a product choice (H-342 (d)) |

### D. Reconstructing missing zones
Applies to unsectioned entries and to zones with no section in the input (plain text, TTS, a deck
code's main part, or a Riot-style paste that lacks some labels, like our own decklist notes, which
have no Legend or Champion section).

| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-030 | MUST | **Never guess silently.** Every zone not taken from a section label is either (a) **inferred from Riot card data** by the rules below, shown with `method: 'inferred'` and the reason, and changeable before saving, or (b) a **zone question** the user answers. | design rule; [[ADR-0005 MVP Product Defaults]] #4 (Riot data only) |
| DECK-031 | MUST | Inference uses only SPEC-001 `category`, `isChampionUnit`, `championTag`, `isSignature` of the resolved card. No curated tables, no deck-site conventions, no position-in-list heuristics. | [[ADR-0005 MVP Product Defaults]] #4; [[Card Data Model]] CARD-024, CARD-026, CARD-027 |
| DECK-032 | MUST | Every unsectioned entry gets its zone from its SPEC-001 `category` by this table (every enum value has exactly one rule): `legend` → **Legend** (DECK-033); `champion`, or `unit` with `isChampionUnit === true` → **Chosen Champion candidate** (DECK-034; copies not chosen go to `main`); `unit` (with `isChampionUnit` `false` or `null`), `spell`, `gear` → **`main`**; `rune` → **`runes`**; `battlefield` → **`battlefields`**; `token` → **rejected with a warning** (DECK-026); `unknown` → **ask** (zone question `PICK_ZONE`, DECK-035). | [[Deck Construction Rules]] #1, #4, #7, #8; [[Card Data Model]] CARD-024, CARD-026; [[Deck Legality]] (Champion Unit definition) |
| DECK-033 | MUST | Unsectioned entries with `category = 'legend'`: if there is exactly **one** such entry with quantity 1 and the input has no `Legend` section, it becomes the Legend (`inferred`). Otherwise (2+ legend entries, or quantity > 1) the user gets zone question `PICK_LEGEND` listing them. **v0.12 (H-342): one Legend per deck. When the input holds 2 or more different Legends (under `Legend:`, unsectioned, or both), `PICK_LEGEND` lists all of them; the picked one is the Legend and the others leave the deck**: they are placed in no zone and their raw lines are added to `importRemovedLines` (DECK-042). **"Leave empty" stays** (DECK-036): the deck then has no Legend and every listed Legend leaves it. Nothing is picked for the user (DECK-030). *(Before v0.12 this said "unpicked legends stay where the user puts them", which no Legend slot allows.)* The question is the only blocker it adds (DECK-038); it never makes the deck illegal to save (DECK-050). | RJ, 2026-11-25 (in chat, H-253 row), checked against [[Deck Construction Rules]] fact 1 (Core 103, `verified`, as of 2026-11-24) |
| DECK-034 | MUST | **Chosen Champion** when the input has no `Champion` section and a Legend is known: candidates = distinct unsectioned entries that are Champion Units (`category === 'champion'` or `isChampionUnit === true`), are not known Signature cards (`isSignature !== true`), and whose `championTag` is not known to differ from the Legend's. If **exactly one** candidate exists **and** it has `isSignature === false` and a `championTag` equal to the Legend's (both known), move **one copy** to `champion` (`inferred`); the rest stays in `main`. If **several** candidates exist, the user is **asked**: zone question `PICK_CHAMPION` listing them. If there are **none**, or the single candidate has a needed attribute `null`, `PICK_CHAMPION` opens with the candidates (if any) plus a catalog search. Copies not picked stay in `main`. **(b) v0.12 (H-342): 2 or more different cards under a `Champion:` section** (e.g. a precon's "Champion Unit Options", [[Physical Copies Across Decks]] fact 5, `verified`, as of 2026-11-23, official: 4 options plus a 36-card main deck make 40) are a single `champion` slot, so `PICK_CHAMPION` lists exactly those cards. The user picks one: **one copy of the pick is the Chosen Champion** (`zoneMethod: 'user'`), and **the other copies of the pick and every unpicked card go to `main`** (`zoneMethod: 'user'`, each with a reason line); none is dropped and none goes to `importRemovedLines`. **"Leave empty" stays** (DECK-036): then all of them go to `main` and the deck has no Chosen Champion (SPEC-002 LEGAL-004 reports it). The question blocks Save until answered (DECK-038), never legality (DECK-050). **(c)** One card with quantity above 1 under `Champion:` is DECK-027. The reason lines the review shows for (b) are `championNotPicked` and `championExtraToMain`; their wording is the build's (H-452, from the ui-engineer critique H-341 §4) and is adopted in DECK-099 (v0.14.1), not yet read by RJ. | RJ, 2026-11-25 (in chat, H-253 row), checked against [[Deck Construction Rules]] facts 1, 4, 15 (Core 103, 103.3.a, 103.3.a.3; `verified`, as of 2026-11-24) and [[Physical Copies Across Decks]] fact 5; [[Deck Legality]] LEGAL-004 |
| DECK-035 | MUST | Unsectioned entry with `category === 'unknown'` → zone question `PICK_ZONE` for that line, defaulting the picker to `main` but not applying it. The UI MUST offer one explicit bulk action **"Put all in Main Deck"** that answers every open `PICK_ZONE` with `main` (`zoneMethod: 'user'`). | design rule; [[Card Data Model]] CARD-024, CARD-029 (`unknown` = not evaluated) |
| DECK-036 | MUST | No Legend in the input at all → zone question `PICK_LEGEND` with a catalog search limited to `category = 'legend'`. The user may answer **Leave empty**; the deck then saves without a Legend (SPEC-002 LEGAL-001 fails). **v0.14 (H-454): "no Legend in the input" means no Legend line at all. While a Legend line exists but is unresolved, this question is held (DECK-104).** | [[Deck Construction Rules]] #1; DECK-050 (never block on legality) |
| DECK-037 | MUST | A **sideboard is never inferred**. Unsectioned `unit`, `spell`, `gear` and `champion` cards (other than the Chosen Champion) all go to `main`. If `main` then exceeds 39 (+ champion), the result carries info `NO_SIDEBOARD_SECTION`: "This list has no Sideboard section, so all cards are in the Main Deck. Move sideboard cards if needed." | [[Deck Construction Rules]] #3, #9 |
| DECK-038 | MUST | Every zone question must be **answered** (a choice or the explicit "Leave empty" / "Keep in Main Deck") before Save is enabled. Answering never requires the deck to be legal. | DECK-030; DECK-050 |
| DECK-039 | MUST | Piltover deck codes: the decoded **sideboard** maps to `sideboard`; the decoded **main deck** is treated as unsectioned (DECK-032…037). TTS input is entirely unsectioned (v0.10: its trailing art number only picks a printing, IMP-036a, and is then dropped, DECK-096). *(v0.10, H-166)* Research (fact 7, **community**) says code V3 adds a chosen champion, V4 runes, V6 additional legends, but not how those groups are laid out; until that is known, a card from such a group is treated as unsectioned like the main part (DECK-032…037), never placed in a zone by guess. **BLOCKED: needs research**: which groups a Piltover code carries (Legend, battlefields) and where. | [[Collection Import Formats]] table ("only main deck + sideboard"); fact 7 (community, 2026-11-24) |

### E. Unknown and unresolved names
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-040 | MUST | Name resolution is SPEC-003's (IMP-025…030): exact `nameKey` match resolves, then the optional leading "a" / "the" rule (IMP-025, [[Card Data Model]] CARD-034, RJ 2026-11-25): `Dreaming Tree` resolves to `The Dreaming Tree` with no review, same as in the owned-card import; fuzzy suggestions are **never applied automatically** (IMP-027); `AMBIGUOUS_NAME` for shared prefixes (IMP-029) and for several cards sharing a loose key (IMP-025). No curated alias table is used. Catalog search in the deck editor (DECK-036, DECK-080) uses the name search match of CARD-038. | [[ADR-0005 MVP Product Defaults]] #4; [[Collection Import]]; [[Card Data Model]] CARD-034, CARD-038 |
| DECK-041 | MUST | **A deck cannot be saved while any line is `needs-review` or an error line with `UNKNOWN_CARD`/`UNKNOWN_PRINTING`/`UNKNOWN_SET_INDEX`** (v0.5: a resolved line with only a warning, e.g. `UNKNOWN_PRINTING` after a name fallback, does not block; DECK-015). For each, the user types another name (re-resolved, built), **removes the line** (built), or picks a suggestion (**waits for H-272**: fuzzy suggestions are not built; a pick is possible today only where the line already carries candidates, such as `PRINTING_NAME_MISMATCH`, DECK-015, or `AMBIGUOUS_NAME`). Save shows "N cards need attention" until the count is 0. | design rule (see Rationale) |
| DECK-042 | MUST | Removing an unresolved line is recorded in the import summary (`removedLines`) and shown on the saved deck's notes area as a one-time info "2 lines were removed during import" with the raw text, so the user knows the deck is not the full original list. **v0.12:** Legends that leave the deck by DECK-033 are recorded the same way. | design rule; RJ, 2026-11-25 (in chat, H-253 row) |
| DECK-043 | SHOULD | **Waits for H-272 (fuzzy suggestions are not built; v0.16.1).** Pre-selection and "Accept all pre-selected" follow IMP-028. "Accept all" is one explicit user action and counts as resolving. | [[Collection Import]] IMP-028 |
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
| DECK-070 | MUST | **Name** is required, 1–80 characters after trimming. **Default for an imported deck: the Legend's full canonical name** (e.g. `Kennen, Heart of the Tempest`), trimmed to 80 (RJ 2026-11-25: "If imported just the Legend name by default"). The default **follows the Legend** in the review step: when the user answers `PICK_LEGEND` or moves a card into or out of `legend`, the default changes with it, **until the user types in the name field**; a typed name is never overwritten. **Fallback:** when the saved deck has no Legend (the input had none and the user chose "Leave empty", DECK-036), the default is `Imported deck <date>` with today in the display date format (e.g. `Imported deck Nov 23, 2026`). **Duplicate names:** names **need not be unique**. An import never adds a suffix: a second Kennen import is also named `Kennen, Heart of the Tempest`, and the list tells decks apart by source line, "Updated" date and Legend art. Only "Add another copy" (DECK-064) and Duplicate (DECK-084) add a suffix. The tournament default is DECK-062. The name can be changed at any time (DECK-081). | board H-030; design rule; H-036 #7; RJ 2026-11-25 ([[Decks]] §13a #1); fallback `Imported deck <date>` and no suffix on duplicate names: RJ 2026-11-25 (H-320, open question (b)); "follows the Legend until typed over" is a detail of that rule that was not asked separately |
| DECK-071 | MUST | **Source** is optional, entered by the user: free text (≤ 200 chars) and/or a URL (≤ 2,048 chars, `http:` or `https:` only, otherwise warning `SOURCE_URL_INVALID` and stored as text). | board H-030 |
| DECK-072 | MUST | **The app never fetches, previews, unfurls or loads anything from a source URL** (no request, no favicon, no iframe). It is shown as a plain link opened only by the user's click, with `rel="noopener noreferrer nofollow"`. | design rule; IMP-005; Out of scope |
| DECK-073 | MUST | **Notes, shown as the deck's description (v0.11).** Optional free text, ≤ 4,000 characters, plain text (no HTML rendering), `''` when none. The `notes` field **is** the deck's **description**: Deck detail shows it under the name, clamped to 3 lines with "Show more" (SPEC-005 OWN-010), and the Rename dialog edits it under the label "Description" (DECK-081). No new field is added and `schemaVersion` stays 1 (RJ 2026-11-25, H-320, open question (a): reuse `notes`). A new deck from an import or from Tournaments starts with `''`. The "N lines were removed during import" info (DECK-042) is built from `importRemovedLines`, not stored in `notes`. | design rule; RJ 2026-11-25 (H-260: header "a short description (may be empty)"; H-320 open question (a): the description reuses `notes`) |
| DECK-074 | MUST | `createdAt` is set on save; `updatedAt` on save and every later change (ISO 8601 UTC, millisecond precision). `updatedAt` is **monotonic**: a save gets `updatedAt = max(now, previous updatedAt + 1 ms)`, where the previous version is the one this device last held (local or pulled), so an edit on a device whose clock is behind still beats the version it replaced. Example: previous `2026-11-24T10:00:00.500Z`, clock reads `…:00.200Z` → saved `2026-11-24T10:00:00.501Z`. DECK-094's conflict check is unchanged. | design rule; [[Accounts and Sync]] SYNC-031, SYNC-062 |
| DECK-075 | MUST | `format` is `'standard'` for every deck in the MVP. | [[Deck Legality]] (MVP scope) |
| DECK-076 | MUST | The deck records the `catalogVersion` (SPEC-001 CARD-068) it was resolved against and its `sourceFormat` (`riot-text`, `plain-text`, `piltover-code`, `tts`, `csv` (`.csv` or `.xlsx` upload, v0.4), `tournament`, `manual`). | [[Collection Import]] IMP-054 (same reason) |

### H. Tournaments path: "Add to your decks"
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-060 | MUST | Every catalog decklist in Tournaments has a one-click **Add to your decks** (CAT-070). It creates a `UserDeck` whose zones are a copy of the `CatalogDecklist` (`legend`, `champion`, `mainDeck` → `main`, `runes`, `battlefields`, `sideboard`), same quantities, each `DeckCard` taking the entry's `cardKey` and the SPEC-001 canonical name for that `cardKey` (CAT-071). `sourceFormat: 'tournament'`, `format` = the decklist's `format` (`standard`). | [[ADR-0006 Two Imports - Collection and Decks]] follow-up decisions; [[Tournament Deck Catalog]] CAT-010, CAT-070, CAT-071 |
| DECK-061 | MUST | `source` is a `TournamentDeckSource` (Data contract; **defined once here**, referenced by SPEC-004 CAT-072): `kind: 'tournament'`, `eventId` (= `TournamentEvent.id`), `eventName` (= `TournamentEvent.name`), `eventStartDate`, `eventEndDate` (= `startDate`, `endDate`), `region`, `decklistId` (= `CatalogDecklist.id`), `publishedRank`, `placingLabel`, `pilot`, `sourceUrl` (= `CatalogDecklist.sourceUrl`) and `addedAt` (ISO 8601 date-time of the click). Values are copied verbatim (CAT-011, CAT-012); no placing is re-bucketed or scored. | [[Tournament Deck Catalog]] CAT-011, CAT-012, CAT-062, CAT-072; [[ADR-0003 Tournament Results Only]] |
| DECK-062 | MUST | Default name (RJ, Gate H-036 #1; same rule as CAT-073): `<Legend>: <pilot> (<placingLabel>, <event name>)`, where `<Legend>` is the Legend's canonical name up to its first `, ` (the whole name if it has no comma), `<pilot>` and `<placingLabel>` are copied verbatim, and `<event name>` is `eventName`. Example: `Kennen: ASC Evansrhim (1st, Riftbound Regional Championship: Europe)`. Trimmed to 80 characters (DECK-070). Wording stays neutral (CAT-035). **Kept as written (RJ 2026-11-25, H-320, open question (b)): tournament decks do not take the Legend-only name of DECK-070, although the tile also shows the player and event.** | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 #1; [[Tournament Deck Catalog]] CAT-035, CAT-073; [[Riot Developer Rules]] rule 8 |
| DECK-063 | MUST | The copy is a **snapshot**: later edits to the catalog or to the user deck do not affect each other. Banned cards are copied like any card (decks with banned cards are shown, labelled; ADR-0005 #3). | design rule; [[ADR-0005 MVP Product Defaults]] #3 |
| DECK-064 | MUST | **Duplicates (same rule as CAT-074).** A decklist is "already added" when Decks holds a deck whose `source.kind === 'tournament'` and `source.decklistId` equals the decklist's `id`. Then the primary button reads **"In your decks"** and opens that deck (the most recently created one if several); one click on it never creates a deck. A separate **"Add another copy"** creates a further copy named `<default name> (n)`, where n is the smallest integer ≥ 2 not already used by a deck with the same `decklistId` (`… (2)`, `… (3)`…). Editing or renaming a copy does not change this; deleting every copy makes "Add to your decks" available again. | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 #2; [[Tournament Deck Catalog]] CAT-074 |
| DECK-065 | MUST | **No name parsing on this path (CAT-071).** Catalog decklists already carry `cardKey`s, so the Add path copies them directly: it runs no text parsing, no name resolution and no fuzzy suggestions, raises no zone questions, and **cannot fail on names**. If a copied `cardKey` is not in the current card data (e.g. a card removed per CARD-066), the deck is still created with that `cardKey` and the catalog entry's name, and is then handled like any stored deck by DECK-088. | [[Tournament Deck Catalog]] CAT-071; [[Card Data Model]] CARD-066 |

### I. Managing decks
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-080 | MUST, **deferred (v0.11)** | **Deferred (RJ 2026-11-25, H-260 #14: "Rename only"; the card editor gets its own brief later): the card editor is not built, shown or reachable in H-254; the requirement keeps its text and ID, and SHARE-025 still says what a lock does to it when it returns.** **Edit**: in a deck editor the user can add a card (catalog search, exact + fuzzy as in DECK-040), change a quantity (1–999), move an entry between zones, and remove an entry. Legality re-runs (DECK-054); saving never requires legality. While the deck is **locked in** (SPEC-008), these card changes are disabled with "Unlock this deck to change its cards" (SHARE-025); DECK-081 stays available. | board H-030; [[Shared Cards and Lock-in]] SHARE-025 |
| DECK-081 | MUST | **Rename (v0.11): edit the name, the description (`notes`, DECK-073) and the source, with the limits of section G.** (a) **At any time, on every deck:** imported decks, **tournament decks**, duplicates and copies, and **locked decks**: a lock freezes the cards, not the name (SPEC-008 SHARE-025). Only a **read-only** deck (DECK-091) cannot be renamed. (b) **Source** text and URL (DECK-071) are editable only when `source.kind === 'user'`; a tournament deck's `TournamentDeckSource` is copied verbatim (DECK-061) and stays read-only, so renaming never changes `eventId`, `decklistId`, `pilot` or the "already added" check (DECK-064). (c) An empty name (after trimming) is refused and the old name stays (AC 14). (d) Saving bumps `updatedAt` (DECK-074), **so the renamed deck moves to the top of the default Decks list** (SPEC-005 OWN-005; RJ 2026-11-25, H-320, open question (c)), and changes nothing else: no card, lock, hold or ownership figure. Offered as **More → Rename** on Deck detail (SPEC-005 OWN-118). | board H-030; RJ 2026-11-25 ([[Decks]] §13a #2: "All deck names can be changed by the user at any time", locked included; H-260 #14) |
| DECK-082 | MUST | **Delete** asks for confirmation naming the deck (title "Delete 'Kennen, Heart of the Tempest'?") and removes it from the store. The collection is untouched. Deleting a locked deck also removes its lock, and the confirmation adds "Its locked cards will count toward your other decks again." (SPEC-008 SHARE-024). **v0.11 (RJ default, [[Decks]] choice 15):** the confirmation no longer says "This can't be undone." because Undo exists (DECK-083); it names no outcome it does not have. | design rule; [[Shared Cards and Lock-in]] SHARE-024; RJ 2026-11-25 (default for [[Decks]] §13 choice 15) |
| DECK-083 | SHOULD | After a delete, offer **Undo** for 10 seconds (restores the identical record, same `id` and timestamps) in a snack bar "Deck deleted." The restored deck is **unlocked** (SHARE-024). | design rule; [[Shared Cards and Lock-in]] SHARE-024 |
| DECK-084 | MUST | **Duplicate** creates a new deck with a new `id`, name `<name> (copy)` (trimmed to 80), identical zones, metadata (including `notes`, the description) and `source`, new `createdAt`/`updatedAt`, and `duplicatedFrom = <original id>`. The copy is unlocked (SHARE-026). **v0.11:** the page stays where it is and a snack bar says "Deck duplicated." with an **Open** action that opens the copy. | board H-030; [[Shared Cards and Lock-in]] SHARE-026; RJ default ([[Decks]] §9) |
| DECK-085 | MUST | **Export** a deck as Riot-style text: labels `Legend:`, `Champion:`, `Main Deck:`, `Battlefields:`, `Rune Pool:`, `Sideboard:` in that order, one blank line between sections, `<qty> <canonical name>` lines in stored order, empty zones omitted, `\n` line endings. Copy to clipboard and download `.txt` (`<name>.txt`, unsafe file-name characters replaced by `_`). | [[Collection Import Formats]] fact 1 (Riot layout); board H-030 |
| DECK-086 | MUST | Export round-trips: importing the exported text produces the same zones and quantities with every line `method: 'section'` and no zone questions. | design rule |
| DECK-087 | MAY | Export all decks as a JSON backup (`UserDeck[]` with `schemaVersion`) and restore it, as a copy the user keeps themselves. A restore is an ordinary user save into the signed-in account, so it needs the SYNC-009 gate open and is stamped and synced like any deck save. | design rule; [[Collection Import]] IMP-055 (same reason) |
| DECK-088 | MUST | On load, each stored deck is re-resolved by `cardKey` against the current catalog. Display names come from the catalog; a `cardKey` that no longer exists is shown with its stored name and flagged "Card no longer in the card data"; SPEC-002 reports it under LEGAL-019 (fails for that card; the other rules skip it). The stored record is not changed until the user edits it. | [[Card Data Model]] CARD-066; [[Deck Legality]] LEGAL-019 |

### J. Storage
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-090 | MUST | **Account-only storage (v0.8).** A deck belongs to the signed-in account: its record of truth is the account's deck document `decks/{deckId}` ([[Accounts and Sync]] SPEC-010 SYNC-018). The app reads and writes decks through a `DeckStore` interface backed by the **browser cache** of the account (SYNC-140…SYNC-145): the cache is the working copy and sync pushes changes to the account. There is no browser-only deck and no deck import without an account. The cache is cleared on sign-out, account deletion and when a different account signs in (SYNC-142), and is never uploaded into an account (SYNC-143). The adapter choice (IndexedDB recommended for size; localStorage acceptable) is an implementation choice. ([[ADR-0005 MVP Product Defaults]] #1 is superseded.) | [[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2); [[ADR-0006 Two Imports - Collection and Decks]] consequences; [[ADR-0001 Tech Stack]] |
| DECK-091 | MUST | Each record has `schemaVersion: 1`. On load, older versions are migrated; a record with a **newer** version than the app knows is shown read-only and never overwritten. | design rule |
| DECK-092 | MUST | Limits: at most **200 decks**; per deck at most **150 entries** (lines after merging) and **300 copies** in total. Over a limit → error `DECK_LIMIT` / `DECK_TOO_LARGE` at save, nothing written. (A legal deck with a full sideboard has 66 cards: 1 + 1 + 39 + 12 + 3 + 10, so the caps leave room for illegal work-in-progress decks.) | [[Deck Construction Rules]] summary; design rule |
| DECK-093 | MUST | Writes are atomic per deck: a failed write (e.g. quota exceeded → `STORAGE_FULL`) leaves the previous record intact and tells the user. | design rule |
| DECK-094 | SHOULD | A save carries the `updatedAt` it was based on; if the stored record has a newer `updatedAt` (another tab), ask "This deck changed in another tab. Overwrite or reload?" | design rule |
| DECK-095 | MUST | Stored decks contain card **keys, names and quantities only**: no card text, images or other Riot content copies (those come from the catalog at display time). | [[Card Data Model]] CARD-007 |
| DECK-096 | MUST | **Deck entries are by `cardKey`, never by printing.** A `DeckCard` stores no printing, variant, set, ownership, owned count or tag. A printing named by the source (deck code, TTS, or a printing code on a text line, DECK-015) is used only to resolve the `cardKey` and is then dropped; entries of one name in one zone merge (DECK-021). Ownership is computed by the consumer, [[Your Decks Ownership View]] (SPEC-005): it groups each deck card by card name, can expand it to the exact owned printings, and does not count printings carrying a tag marked "exclude from decks". Nothing in this spec changes when collection, printings or tags change. | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 #5, #6; [[Card Data Model]] CARD-012, CARD-013 |
| DECK-097 | MUST | **Sign-in gate (SYNC-009, always on).** While the gate is not open (signed out, session lost, or first sync running), Deck Import ("Import deck") is not offered: the Decks page shows the SPEC-010 sign-in panel instead of the list, so the Import deck button and dialog (DECK-001) do not exist, a `?import=1` address (SYNC-159) opens no dialog until the gate opens, and nothing can be saved, and the Tournaments "Add to your decks" path (DECK-005, DECK-060…065; SPEC-004 CAT-070) is **not offered**: no Add, "In your decks" or "Add another copy" control, and the SPEC-004 CAT-074 "already added" check reads nothing from the browser cache. When the gate opens the controls appear without a reload. There is no mode without the gate. Panel text and gate rules are SPEC-010's. | [[Accounts and Sync]] SYNC-009 (decision 13 h; amendment 2) |

### K. After Save (v0.11)
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-098 | MUST | **Feedback after Save.** After a successful Save from "Import deck" (DECK-001): the dialog closes, the page stays on Decks (no navigation), the new deck is in the list (first under the default order, OWN-005, as its `updatedAt` is the newest) and a snack bar reads **"Deck saved."** with a **View deck** action that opens `/decks/<id>` (polite status; the snack bar clears itself). A failed Save (`DECK_LIMIT`, `DECK_TOO_LARGE`, `STORAGE_FULL`, DECK-092, DECK-093) keeps the dialog open, writes nothing and shows the error. The Tournaments "Add to your decks" path (DECK-060) has its own feedback in SPEC-004 and is not changed here. | RJ default ([[Decks]] §13 choice 17a) |

### L. Review and save strings (v0.12)
| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-099 | MUST | **The review and save wording is the builder's, adopted verbatim** from three constants in the build: `DECK_REVIEW_TEXT` (messages, `web/src/app/shared/import/deck-import.ts`), `DECK_REVIEW_WORDS` (labels, hints and buttons of the review step, `web/src/app/shared/import/deck-review.ts`) and `DECK_SAVE_TEXT` (`web/src/app/core/import/deck-import.ts`), as in the three tables below. `{…}` is a filled-in value. The strings carry no rule or game claim. **Two groups (v0.14.1, H-501).** (1) Strings **RJ approved 2026-11-25**: the rows without a mark. (2) Strings **added or reworded after that approval** by the build of the review-polish batch (H-450 to H-453, from the ui-engineer critique [[Critique H-341 Deck Import Review]] §4; each row marked "**built**" in the Requirement column), adopted here **as built, verbatim, not yet read by RJ** (added to gate H-483). They include the champion reason lines `championNotPicked` and `championExtraToMain`, and `championMany`, which had waited for H-341; `championMany` now says "The other Champion cards go in the Main Deck.", which agrees with DECK-034 (b) (the earlier text said "left out"). Rows whose string changed keep the old wording only in the changelog. In the review, the `champion` zone is displayed as **"Chosen Champion"** (`DECK_REVIEW_WORDS.champion`) in the zone counts, the section selects and "Move to {zone}"; every other zone keeps the parser's section label (`SECTION_LABELS`, e.g. "Main Deck"), and the parser's own label for the zone stays "Champion" (H-453, display only). A wording change is a spec change: edit these tables, then file a builder item. | RJ approved 2026-11-25 (H-253 row: the builder's review and error strings "look good"); [[Validation H-253]] (strings judged acceptable); group (2): the build, [[Validation H-450]], [[Validation H-451]], [[Validation H-452]], [[Validation H-453]] (each PASS on behaviour with these strings on screen; RJ has not read the wording) |

**Review messages (`DECK_REVIEW_TEXT`)**

| Key | Requirement | String |
|---|---|---|
| `unknownCard(name)` | DECK-041 | `No card named "{name}" in the card data.` |
| `unknownCode(code)` | DECK-015 | `{code} isn't in the card data. Add the card name or fix the code.` |
| `codeMismatch(code, codeCard, named)` | DECK-015 | `{code} is {codeCard}, but the line says {named}.` |
| `ambiguousCode(code)` | DECK-015 | `{code} matches more than one card in the card data.` |
| `codeUsed(code, card)` | DECK-015 | `{code} is {card}, so that card was used.` |
| `nameUsed(code)` | DECK-015 | `{code} isn't in the card data, so the card name was used.` |
| `token(name)` | DECK-026 | `{name} is a token and can't be put in a deck` |
| `mismatch(name, type)` | DECK-022 | `{name} is a {type}` |
| `ambiguousName(name)` | DECK-040 (IMP-025 `AMBIGUOUS_NAME`), **built** | `"{name}" matches more than one card. Pick one.` |
| `championNotPicked` | DECK-034 (b), **built** (H-452) | `Not picked as Chosen Champion, so it moves to the Main Deck` |
| `championExtraToMain(n)` | DECK-027, DECK-034 (b), **built** (H-452); `n` = the extra copies | `1 copy is the Chosen Champion; the other copy moves to the Main Deck` (n = 1) / `1 copy is the Chosen Champion; the other {n} move to the Main Deck` (n above 1) |
| `noSideboard` | DECK-037 | `This list has no Sideboard section, so all cards are in the Main Deck. Move sideboard cards if needed.` |
| `sourceUrlInvalid` | DECK-071 | `This link isn't an http or https address, so it is kept as text.` |
| `sourceTooLong` | DECK-071 | `The source can be at most 200 characters.` |
| `nameRequired` | DECK-070 | `Give the deck a name.` |
| `needAttention(n)` | DECK-041, AC 8 | `1 card needs attention` / `{n} cards need attention` |
| `questions(n)` | DECK-038, AC 3 | `1 question to answer` / `{n} questions to answer` |
| `fallbackName(date)` | DECK-070 | `Imported deck {date}` |

**Review step labels (`DECK_REVIEW_WORDS`)**

| Key | Requirement | String |
|---|---|---|
| `check` | DECK-030, **built** (H-450): the review's first heading; focus lands on it after Continue | `Check the deck` |
| `name` | DECK-070 | `Deck name` |
| `fix` | DECK-041 | `Lines to fix` |
| `fixNote` | DECK-041 | `Remove a line here, or go Back and fix it in the list.` |
| `remove` | DECK-041 | `Remove line` |
| `removeLine(line)` | DECK-041 (accessible name) | `Remove line {line}` |
| `sectionFor(name)` | DECK-030 (accessible name of a "Lines without a section" row's select) | `Section for {name}` |
| `sectionForLine(name, line)` | DECK-035 (accessible name of a `PICK_ZONE` select), **built** (H-451): names the card and the line so several open questions never read alike | `Section for {name} (line {line})` |
| `needsAnswer` | DECK-038, **built** (H-451): an open question says so in text, not by colour alone | `Needs an answer` |
| `ready` | DECK-038, **built** (H-451): the status line when nothing blocks Save | `Ready to save.` |
| `checks` | DECK-022, DECK-037, **built** (H-451): heading of the warnings list | `Check these` |
| `use(name)` | DECK-015, DECK-041 | `Use {name}` |
| `legendNone` | DECK-036 | `This list has no Legend. Pick one, or leave it empty.` |
| `legendMany` | DECK-033 | `Pick the deck's Legend. The other Legend lines are left out.` |
| `championAsk` | DECK-034 (candidates plus a catalog search: no `Champion:` section) | `Pick the deck's Chosen Champion.` |
| `championMany` | DECK-034 (b) (the `Champion:` section's question), **built** (H-452) | `Pick the deck's Chosen Champion. The other Champion cards go in the Main Deck.` |
| `alsoMain` | DECK-027, DECK-034 (b), **built** (H-452): heading of the lines the Chosen Champion slot sent to the Main Deck | `Also in the Main Deck:` |
| `zoneAsk(line, name)` | DECK-035 | `Line {line}: {name}. Its card type isn't known, so pick its section.` |
| `allMain` | DECK-035 | `Put all in Main Deck` |
| `legend` | DECK-033 | `Legend` |
| `champion` | DECK-034 | `Chosen Champion` |
| `section` | DECK-030, DECK-035 | `Section` |
| `leaveEmpty` | DECK-036 | `Leave empty` |
| `fromList` | DECK-034 | `From this list` |
| `otherCards` | DECK-034 | `Other cards` |
| `inferred` | DECK-030, **built** (H-452; was `Placed by card type`): heading of the list that also holds the lines the user placed | `Lines without a section` |
| `inferredNote` | DECK-030, **built** (H-452; was `Change a section if it is wrong.`) | `These lines had no section label, so they were placed by card type or by your answers. Change any that are wrong.` |
| `pickedSection` | DECK-030, **built** (H-452): the reason on a line the user placed (zoneMethod `user`) | `You picked this section` |
| `moveTo(zone)` | DECK-023 (`{zone}` is the review's display label, so the `champion` zone reads "Chosen Champion") | `Move to {zone}` |
| `removed(n, list)` | DECK-033, DECK-042, **built** (H-452; was `removed(n)`: "{n} lines are left out of the deck and listed on it."); `list` = the `removedItem` texts joined with `, ` | `1 line is left out of the deck: {list}. It will be listed on the deck's page.` (n = 1) / `{n} lines are left out of the deck: {list}. They will be listed on the deck's page.` (n above 1) |
| `removedItem(line, name)` | DECK-033, DECK-042, **built** (H-452): one entry of `list`; `name` is the card's name, else the raw text | `line {line} ({name})` |
| `source` | DECK-071 | `Source (optional)` |
| `sourceHint` | DECK-071 | `Where the list comes from, e.g. a player or a site.` |
| `link` | DECK-071 | `Link (optional)` |
| `linkHint` | DECK-071 | `An http or https address. It opens only when you click it.` |

**Save strings (`DECK_SAVE_TEXT`)**

| Key | Requirement | String |
|---|---|---|
| `saved` | DECK-098 | `Deck saved.` |
| `view` | DECK-098 | `View deck` |
| `catalogError` | DECK-015 | `Card data couldn't load, so the cards can't be matched yet. Try again in a moment.` |
| `limit` | DECK-092 `DECK_LIMIT` | `You already have 200 decks, the most you can keep. Delete a deck to save this one.` |
| `tooLarge` | DECK-092 `DECK_TOO_LARGE` | `This deck is too large to save: at most 150 different entries and 300 cards.` |
| `storageFull` | DECK-093 `STORAGE_FULL` | `Couldn't save: this device's storage is full. Nothing was saved.` |
| `failed` | DECK-093 | `Couldn't save the deck. Nothing was saved. Try again.` |
| `signedOut` | DECK-097 | `Sign in again to save this deck. Nothing was saved.` |

*(The numbers 200, 150 and 300 in `limit` and `tooLarge` come from the limits of DECK-092 (`LIMITS` in the build); if DECK-092 changes, these strings change with it.)*

### M. Review step: Back, Cancel and phone layout (v0.13)
Source for all four: RJ, 2026-11-26, in chat ([[Critique H-341 Deck Import Review]] §6, choices 1 to 3; H-479). RJ decided the three behaviours; **how "unchanged" is decided (DECK-101) he did not specify and is a proposal.**

| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-100 | MUST | **Back keeps the answers for lines that did not change.** From the review step, **Back** returns to the paste step (the text box). When the user presses Continue again, every review answer tied to a line that **did not change** (DECK-101) is **kept**, so it is not asked or done again: (a) zone answers and **Section** picks, including "Move to <zone>" (DECK-023) and "Put all in Main Deck" (DECK-035), i.e. lines with `zoneMethod: 'user'`; (b) the **Legend** answer (`PICK_LEGEND`, DECK-033, DECK-036) and the **Chosen Champion** answer (`PICK_CHAMPION`, DECK-034), including "Leave empty"; (c) **removed lines** (DECK-041, DECK-042). Answers tied to a line that was **edited or removed from the text box** are **dropped**: the question is asked again, unanswered (DECK-038), and an edited line that was removed shows again in "Lines to fix". Nothing is stored (DECK-003). Not covered by RJ's decision: see Open questions (v0.13), and (v0.14.1) (a) for what the build does with a zone answer on a line that needs a pick again. | RJ, 2026-11-26 (in chat, H-479); [[Critique H-341 Deck Import Review]] §6 choice 1, finding 19 (as built, Back clears every answer) |
| DECK-101 | MUST | **"A line did not change" (proposal, RJ did not specify).** A line is identified by three values: (1) its text **trimmed** of leading and trailing whitespace, compared exactly (case-sensitive); (2) its **section context**: the zone its section label gives (DECK-020), or none when it is unsectioned; (3) its **occurrence number**: the n-th line, counted from the top, with the same trimmed text and context. Position in the text box does **not** matter, so adding or deleting other lines keeps the answers. A line is unchanged when the same identity exists in the new text. Consequences: editing a section label changes the context of every line under it, so their zone answers are dropped; a whitespace-only edit changes nothing. **A question answer is kept only if all the lines the question lists (`lineRefs`, plus its candidates) are unchanged and no new candidate line has appeared**; otherwise the question is asked again (DECK-030: never decided silently). A question with no lines (`lineRefs: []`, "no Legend in the input") keeps its answer while the input still has no Legend line. | proposal by spec-writer (H-479), to make DECK-100 testable; RJ did not specify |
| DECK-102 | MUST | **No confirmation on Cancel or Escape.** After the user has answered a question, picked a section or removed a line, **Cancel** and **Escape** close the dialog **at once**, with no "discard" question, as built. Everything is thrown away and nothing is stored (DECK-003). The answers kept by DECK-100 live only while the dialog is open. | RJ, 2026-11-26 (in chat, H-479); [[Critique H-341 Deck Import Review]] §6 choice 2 |
| DECK-103 | MUST | **Full screen at 40rem and below.** The Import deck dialog (the paste step and the review step) fills the whole viewport at **40rem and below** (SPEC-010: `max-width: 40rem`, i.e. 640 px and narrower at the default 16 px root; the same phone boundary as the bottom tab bar) and is a floating dialog above 40rem. **Back, Cancel and Save stay reachable**, and focus trap and Escape (DECK-102) work the same. **Build note:** H-453 has built this on the not-yet-merged code branch with the `.import-deck-panel` class at 40rem and below; spec and build agree on the boundary. SPEC-003's paste-or-upload dialog for "Add to your collection" is **not** changed here (Open questions, v0.13). | RJ, 2026-11-26 (in chat, H-479); [[Critique H-341 Deck Import Review]] §6 choice 3; [[Accounts and Sync]] SYNC-150 (phone boundary) |

### N. Legend line that did not resolve; single-slot picks (v0.14, H-454)
Source: [[Critique H-341 Deck Import Review]] §5 (spec gaps S1 to S7, from RJ's two real lists, 2026-11-25). DECK-104 is RJ's decision. **DECK-105 is RJ's decision too (S4, RJ 2026-11-26, H-483; it was a proposal in 0.14)**; S1 and S2 have no requirement here (Open questions, v0.14); S5, S6 and S7 were answered "keep as built" or "not now" by RJ and need no requirement (Open questions, v0.15).

| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-104 | MUST | **Hold `PICK_LEGEND` while a Legend line is unresolved.** A **Legend line** is a line under a `Legend` section (DECK-020), including one on the label line itself. While **any** Legend line is `needs-review` or an error line (DECK-041), the importer raises **no** `PICK_LEGEND` question of either kind (DECK-036 "no Legend", DECK-033 "several Legends"), and the review shows **no new prompt wording**: the `legendUnresolved` prompt ("The Legend on line {n} isn't in the card data. Fix that line, or pick a Legend here.", [[Critique H-341 Deck Import Review]] §4), which H-452 built, is **not part of this spec** and was removed in H-500 ([[Validation H-500]]; checked 2026-11-26: no `legendUnresolved` in `web/src`). **What the review shows while the question is held, from existing strings only (DECK-099):** (a) the Legend line sits in "Lines to fix" (`fix`) with its own message (`unknownCard(name)`, `unknownCode(code)`, `codeMismatch`, `ambiguousCode`, or its suggestions), with `fixNote`, `remove` and `use(name)`; (b) **Save is blocked** by the `needAttention(n)` count, which includes that line (DECK-041); (c) **no Legend question is listed** and `questions(n)` does not count it; `legendNone` ("This list has no Legend. Pick one, or leave it empty.") is **not shown**, because the list does have a Legend line; (d) the name field holds the fallback `Imported deck <date>` (DECK-070) until a Legend is known. **When the user fixes the line** and it resolves to a Legend, DECK-033 applies as normal (one Legend: it is the Legend; two or more: `PICK_LEGEND`). **When the user removes the line** and no Legend line is left, the input now has no Legend: DECK-036 applies, so `PICK_LEGEND` with `legendNone` and "Leave empty" appears. Lines without a section are not Legend lines (their category is not known until they resolve, DECK-032). **Not specified:** any text telling the user why no Legend question is shown yet (that would be new wording): see Open questions (v0.14) (1). **As built (H-500, v0.14.1; builder's choices, Open questions (v0.14.1) (b), (c)):** the hold applies to a line that reaches the review as `needs-review` or an unresolved error line under a `Legend` section; a Legend line that did resolve waits with it (no `legend` and the fallback name while held); a parse-error line that never becomes an entry (IMP-063, e.g. `MISSING_QUANTITY`) does not hold the question. | **RJ, 2026-11-26** (in chat, H-454 row: hold the Legend question until the unresolved Legend line is fixed or removed, no new prompt wording); DECK-036 "no Legend in the input at all"; [[Critique H-341 Deck Import Review]] §5 S3, finding 7. What the review shows is read from DECK-099's strings and DECK-041; the choices about removal and about "any Legend line" are spec-writer's reading of RJ's sentence |
| DECK-105 | MUST (**RJ's decision, 2026-11-26, H-483; was a proposal in 0.14**) | **A single-slot pick on a line with quantity above 1 keeps one copy.** When the user picks the **Chosen Champion** in a **Section** select (`PICK_ZONE`, DECK-035, DECK-030) for a line with quantity above 1, **1 copy goes to `champion` and the other copies go to `main`** (`zoneMethod: 'user'`), with a reason line (DECK-030); nothing is dropped or deduped (DECK-025). This is DECK-027 applied to the Section select. **Built** (H-410, DECK-027) **and tested**: the unit test named `DECK-105 / DECK-027 / DECK-025 / AC 40` in `deck-import.spec.ts` (read by the spec-writer 2026-11-26, H-501) puts a 2-copy unsectioned line in Chosen Champion and checks `champion` ×1, `main` ×1 (39 in all), `zoneMethod: 'user'`, the reason line and nothing removed. A **Legend** pick on a line with quantity above 1 is **stored as given**, the same as the `Legend:` path today (RJ 2026-11-26, S4 (a): "keep as built"; Open questions, "Not specified"). The Section selects **keep Legend and Chosen Champion** (no hiding; RJ 2026-11-26, S4 (b)). | **RJ, 2026-11-26** (in chat, H-483 row, S4: keep as built); derived from DECK-027 and [[Deck Construction Rules]] facts 4 and 15 (`verified`, as of 2026-11-24); first written as a proposal by spec-writer (H-454) |

### O. SAMPLE printings (v0.16, H-197)
Source: RJ, 2026-11-25 (H-193): "Sample cards are NOT legal" and "we can just leave them out entirely". DECK-106 (a) is his rule; (b) and (c) are the spec-writer's reading and **proposals**.

| ID | Level | Requirement | Source |
|---|---|---|---|
| DECK-106 | MUST | **SAMPLE printings are left out of deck import.** (a) **Rule (RJ).** DECK-010 reuses SPEC-003 Part A, so IMP-077 applies to deck lines unchanged: a printing the catalog marks SAMPLE (SPEC-001 CARD-044) is never matched, counted or shown in the review, the deck or its export (DECK-085). (b) **A printing code that names a SAMPLE printing (proposal, not RJ's)** is "not in the card data" (IMP-077 (c), IMP-069): with a name the line resolves by name, with the existing `UNKNOWN_PRINTING` warning, and nothing about the printing is kept (DECK-096); a code-only line is the existing `UNKNOWN_PRINTING` error and follows DECK-041. (c) **A card that exists only as SAMPLE (proposal, not RJ's)** is an unknown name (`UNKNOWN_CARD`, IMP-077 (d)): it cannot be saved until fixed or removed (DECK-041). (d) **No marker, no effect:** until SPEC-001 CARD-044 defines the marker (BLOCKED, H-020) no printing is treated as SAMPLE and nothing is inferred from set code or collector number. (e) **No new wording:** the review uses its existing strings (DECK-099); no SAMPLE-specific message is added. (f) Legality is not decided here: SPEC-002 LEGAL-C10. | (a) RJ 2026-11-25 (H-193, applied by H-197); [[Collection Import]] IMP-077; [[Deck Legality]] LEGAL-C10. (b), (c): spec-writer's reading of "not matched", **not an RJ decision** |

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
  eventName: string;                // 'Riftbound Regional Championship: Europe'
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
  notes: string;                // '' when none, <= 4000 chars; this IS the deck's description (DECK-073, v0.11)
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  catalogVersion: string;       // SPEC-001
  duplicatedFrom?: string;      // DECK-084
  importRemovedLines?: string[];// DECK-042 / DECK-026 / DECK-033, raw text of removed, rejected or unpicked-Legend lines
  legend: DeckCard | null;      // qty 1 when valid; stored as given
  champion: DeckCard | null;    // v0.12: qty 1; extra copies of the same card are in `main` (DECK-027)
  main: DeckCard[];             // excludes the Chosen Champion
  sideboard: DeckCard[];
  runes: DeckCard[];
  battlefields: DeckCard[];
}
// NOTE (v0.12, RJ 2026-11-25 (in chat, H-253 row)): legend/champion are single slots.
// - 2+ different Legends in the input (`Legend:` or unsectioned): PICK_LEGEND; the picked Legend is
//   `legend`, the others are in NO zone and their raw lines are in `importRemovedLines` (DECK-033).
//   "Leave empty" (answer { leaveEmpty: true }): `legend` is null and all of them leave the deck.
// - 2+ different cards under `Champion:`: PICK_CHAMPION; one copy of the pick is `champion`, the other
//   copies of the pick and every unpicked card are in `main`, none in `importRemovedLines`
//   (DECK-034 (b)). "Leave empty": `champion` is null and all of them are in `main`.
// - One card with qty > 1 as the Chosen Champion: 1 in `champion`, the rest in `main` (DECK-027).
// LEGAL-001 / LEGAL-004 still report what the user keeps (e.g. no Legend after "Leave empty").

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

7. **Section label beats card data** (DECK-022, 023, 034, 038) **Given** `Legend:` / `1 Kennen, Heart of the Tempest`,
   `Champion:` / `1 Kennen, Storm of Shuriken` and `Main Deck:` / `1 Zaun Warrens` (`category: 'battlefield'`)
   (the Legend and Champion sections are there so no zone question is open; with a Legend and no Champion section,
   DECK-034 would ask `PICK_CHAMPION` first, and with no Legend at all DECK-036 asks `PICK_LEGEND`)
   **When** parsed **Then** `Zaun Warrens` stays in `main` with warning `ZONE_CATEGORY_MISMATCH` ("Zaun Warrens is a
   Battlefield") and a "Move to Battlefields" action; no question is open; legality shows LEGAL-015; Save is enabled
   and saving is allowed without moving it.

8. **Typo must be resolved before save** (DECK-041, 043; v0.16.1) **Given** `Main Deck:` / `3 Lightnig Rush`
   (`Lightnig Rush` is not in the card data and has no exact or leading-article match)
   **When** parsed **Then** the line is unresolved (today an error line `UNKNOWN_CARD`: "No card named
   \"Lightnig Rush\" in the card data."), it is listed in "Lines to fix", and Save is disabled with
   "1 card needs attention". **Fix by typing (built):** **When** the user goes Back, changes the line to
   `3 Lightning Rush` and presses Continue **Then** `Lightning Rush ×3` is in `main`, the count is 0 and
   Save is enabled. **Fix by removing (built):** **When** the user clicks Remove line **Then** Save is
   enabled and the line is recorded as removed (AC 9). **Waits for H-272 (not built, not tested):**
   fuzzy suggestions (IMP-027): the line would be `needs-review` with the pre-selected suggestion
   `Lightning Rush`, and **When** the user accepts it **Then** `Lightning Rush ×3` is in `main` and
   Save is enabled. Until H-272 ships, no AC may require a suggestion to appear.

9. **Unknown card: remove the line** (DECK-041, 042) **Given** line 5 `2 Totally Fake Card` under
   `Sideboard:` **When** the user clicks Remove **Then** Save is enabled, the saved deck's
   `importRemovedLines = ["2 Totally Fake Card"]`, and the deck shows "1 line was removed during import".

10. **Ambiguous name in a labelled zone** (DECK-040, 044) **Given** `Champion:` / `1 Kennen` **Then**
    `AMBIGUOUS_NAME` with `Kennen, Heart of the Tempest` and `Kennen, Storm of Shuriken`, none
    pre-selected; **When** the user picks `Kennen, Storm of Shuriken` **Then** it is in `champion`.

11. **Add to your decks from Tournaments** (DECK-060…062, 065) **Given** the RC Europe 1st-place decklist
    by ASC Evansrhim (`2026-11-rc-europe-1`, event `2026-11-rc-europe` "Riftbound Regional Championship: Europe",
    `publishedRank: 1`, `placingLabel: "1st"`) and an empty Decks screen **When** the user clicks "Add to your
    decks" **Then** one `UserDeck` exists with `source = {kind: 'tournament', eventId: '2026-11-rc-europe',
    eventName: 'Riftbound Regional Championship: Europe', eventStartDate, eventEndDate, region: 'Europe',
    decklistId: '2026-11-rc-europe-1', publishedRank: 1, placingLabel: '1st', pilot: 'ASC Evansrhim',
    sourceUrl: 'https://playriftbound.com/en-us/news/organizedplay/best-ofs-for-the-european-championship',
    addedAt: <time of click>}` (event fields copied from the catalog event), `sourceFormat: 'tournament'`,
    name `Kennen: ASC Evansrhim (1st, Riftbound Regional Championship: Europe)`, zones and `cardKey`s equal to the
    catalog list, no parse step, no suggestions and no zone questions, and it shows "Contains cards banned
    since Nov 23, 2026".

11a. **Already added** (DECK-064) **Given** the AC 11 deck exists **When** the user views
    `2026-11-rc-europe-1` on Tournaments **Then** the button reads "In your decks" and clicking it opens
    that deck without creating another. **When** the user clicks "Add another copy" **Then** a second deck
    `Kennen: ASC Evansrhim (1st, Riftbound Regional Championship: Europe) (2)` exists with the same
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
    `x2 Hextech Ray` / `2 RAD 001a` / `1 Hextech Ray RAD 001` (there is a Legend but no `Champion:` section, so
    DECK-034 also asks `PICK_CHAMPION`) **When** parsed and reviewed **Then**
    `Kennen, Heart of the Tempest` is in `legend`; `Lightning Rush` is 5 in `main` (lines 3 and 5 merged by
    `cardKey`, DECK-021); `Hextech Ray ×2` is in `main`; line 6 is `needs-review` with
    `PRINTING_NAME_MISMATCH` and Save is disabled ("1 card needs attention"). **When** the user picks
    `Hextech Ray` **Then** `main` has `Hextech Ray ×3`; Save is still disabled by the open `PICK_CHAMPION`
    question ("1 question to answer", DECK-038) **until the user answers it, here with "Leave empty"** (DECK-036),
    after which Save is enabled, and the saved `DeckCard`s hold
    only `cardKey`, `name` and `qty` (no printing). **Given** instead `Main Deck:` / `3 Lightning Rush RAD 999`
    **Then** `Lightning Rush ×3` is in `main` with warning `UNKNOWN_PRINTING`, and that warning does not block Save (the Legend question of DECK-036 for this Legend-less paste is a separate blocker).

24. **Entry point, label and landing** (DECK-001, DECK-097; v0.9, H-174)
    **Given** a signed-in user with the gate open and at least one deck **When** they open `/decks` **Then** the
    floating button **Import deck** is at the bottom right (SPEC-005 OWN-094); **When** they press it **Then** the
    dialog titled exactly "Import deck" opens over Decks, and **When** they paste a valid deck and press Save **Then**
    the deck appears in the Decks list, the dialog closes, and the app is still at `/decks` (it did not navigate).
    **Given** instead `/decks?import=1` with the gate open **Then** the same dialog opens once and the address
    becomes `/decks`. **Given** a signed-out visitor **Then** no button or dialog exists and the sign-in panel shows;
    **When** they open `/import` **Then** the app shows Home. No text in the app calls this flow "Deck Import" or
    "Import" alone.

25. **Bold Riot labels and TTS art numbers in a deck** (DECK-010, DECK-020, DECK-039, DECK-096; SPEC-003 IMP-016, IMP-036a; v0.10, H-166)
    **Given** the paste `**Legend:**` / `1 Kennen, Heart of the Tempest` / `**Main Deck:**` / `3 Gust` / `**Rune Pool:**` /
    `9 Chaos Rune` / `**Sideboard:**` / `2 Decree of Unity` **When** parsed **Then** format is `riot-text`, the four
    label lines are not entries, and the zones are `legend`, `main`, `runes`, `sideboard`, all `zoneMethod: 'section'`.
    **Given** instead (SPEC-003 fixture F1) the TTS paste `RAD-001-1 RAD-001-1 RAD-001-2` **Then** the deck has
    `Lightning Rush` ×3 (one `cardKey`, three tokens = three copies, the art number is not a count), unsectioned
    (`main` by inference, DECK-032), and the saved `DeckCard` has only `cardKey`, `name` and `qty: 3`.

26. **Imported deck is named after its Legend; fallback; duplicates** (DECK-070; v0.11, RJ 2026-11-25)
    **Given** the AC 1 paste **When** the review opens **Then** the name field holds `Kennen, Heart of the Tempest`. **When** the user saves it twice (two imports of the same list) **Then** Decks
    holds two decks both named `Kennen, Heart of the Tempest` (no suffix, no error). **Given** the AC 3 paste (no Legend) **When** the user answers `PICK_LEGEND` with
    `Riven, The Exile` **Then** the name field changes to `Riven, The Exile`; **When** the user had first typed `My Riven` and then answers `PICK_LEGEND` **Then** the name stays `My Riven`.
    **Given** plain text with no Legend where the user answers "Leave empty" on 2026-11-23 **Then** the default name is `Imported deck Nov 23, 2026`. **Given** a Legend whose name is 90 characters **Then** the default is trimmed to 80.
27. **Description is `notes`** (DECK-073; v0.11)
    **Given** a saved deck **When** it is renamed with the Description "Budget list" **Then** the stored record has `notes: "Budget list"`, no other new field and `schemaVersion: 1`, and SPEC-005's header shows the text.
    **When** the description is cleared **Then** `notes` is `''` and the header shows nothing. **Given** a 4,001-character description **Then** the save is refused and the old text stays. **Given** a deck added from Tournaments **Then** `notes` starts as `''`.
28. **Rename at any time** (DECK-081; SPEC-008 SHARE-025; v0.11)
    **Given** a locked tournament deck **When** the user renames it, changes its description and saves **Then** the name and `notes` change, `source` (kind, `eventId`, `decklistId`, `pilot`, `sourceUrl`) is byte-identical, `updatedAt` is newer, the deck is now first in the default Decks list (OWN-005; renaming counts as a change), the lock is still there, and "In your decks" on Tournaments still opens it
    (DECK-064). **Given** an imported (`kind: 'user'`) deck **Then** the source text and URL can be edited as well (DECK-071), and `javascript:alert(1)` still gives `SOURCE_URL_INVALID`. **Given** a read-only deck (`schemaVersion: 2`) **Then** Rename is refused.
    **Given** the card editor **Then** no control for it exists in v0.11 (DECK-080 deferred).
29. **After Save; delete and duplicate feedback** (DECK-098, DECK-082…084; v0.11)
    **Given** a valid paste in the "Import deck" dialog on `/decks` **When** the user presses Save **Then** the dialog closes, the page is still `/decks`, the new deck is first in the list, and a snack bar reads "Deck saved." with a "View deck" action that opens `/decks/<id>`. **Given** 200 stored decks **Then** the dialog stays open and shows `DECK_LIMIT`, nothing is written, no "Deck saved."
    **When** a deck is deleted **Then** the confirmation reads "Delete 'Kennen, Heart of the Tempest'?" with no "This can't be undone.", and after the delete the snack bar "Deck deleted." offers Undo for 10 seconds. **When** a deck is duplicated **Then** the page stays and the snack bar "Deck duplicated." offers "Open".

30. **Two Legends: pick one, the other leaves the deck** (DECK-033, 036, 038, 042, 070; v0.12, RJ 2026-11-25)
    **Given** `Legend:` / `1 Kennen, Heart of the Tempest` / `1 Riven, The Exile`, `Champion:` / `1 Kennen, Storm of Shuriken`, `Main Deck:` / `3 Lightning Rush`
    **When** parsed **Then** one `PICK_LEGEND` question lists both Legends and Save is disabled ("1 question to answer"). **When** the user picks
    `Kennen, Heart of the Tempest` **Then** `legend` = Kennen, `Riven, The Exile` is in no zone, `importRemovedLines = ["1 Riven, The Exile"]`,
    the default name is `Kennen, Heart of the Tempest`, and Save is enabled. **When** the user answers "Leave empty" instead **Then** `legend` is null, both
    Legends are in `importRemovedLines`, the default name is `Imported deck <date>`, Save is enabled, and LEGAL-001 fails (DECK-050).

31. **2+ cards under `Champion:`: pick one, the rest go to Main Deck** (DECK-034 (b), 038, 042; v0.12, RJ 2026-11-25; [[Physical Copies Across Decks]] fact 5)
    Card names `<Champ A>` and `<Champ B>` stand for two Champion Units with the Legend's tag (hypothetical fixture). **Given** `Legend:` / `1 Kennen, Heart of the Tempest`,
    `Champion:` / `2 <Champ A>` / `2 <Champ B>`, `Main Deck:` with 36 other cards **When** parsed **Then** one `PICK_CHAMPION` question lists exactly `<Champ A>` and `<Champ B>`
    and Save is disabled. **When** the user picks `<Champ A>` **Then** `champion` = `<Champ A>` ×1, `main` holds `<Champ A>` ×1 and `<Champ B>` ×2 next to the 36 cards (39 in all),
    each of those lines shows a reason line, `importRemovedLines` is absent, LEGAL-003 counts 40, and Save is enabled. **When** the user answers "Leave empty" instead **Then** `champion` is
    null, all four copies are in `main`, nothing is removed, and LEGAL-004 reports the missing Chosen Champion.

32. **One champion line with quantity 2** (DECK-027, DECK-025; v0.12, H-342 (d); build item H-410)
    **Given** `Legend:` / `1 Kennen, Heart of the Tempest`, `Champion:` / `2 Kennen, Storm of Shuriken`, `Main Deck:` with 38 other cards **When** parsed **Then** no question is open, `champion` = `Kennen, Storm of Shuriken` ×1,
    `main` holds `Kennen, Storm of Shuriken` ×1 next to the 38 cards (39 in all) with a reason line, nothing is removed, LEGAL-003 counts 40 and LEGAL-005 counts 2 copies (champion 1, main 1), and Save is enabled.
    **Given** instead `Champion:` / `1 Kennen, Storm of Shuriken` and `Main Deck:` / `1 Kennen, Storm of Shuriken` (two entries, DECK-025) **Then** both are kept as written: `champion` 1, `main` +1.

33. **Adopted strings** (DECK-099; v0.12) **Given** `Main Deck:` / `3 Lightnig Rush` and no Legend **Then** the review reads "1 card needs attention" and "1 question to answer", the line reads `No card named "Lightnig Rush" in the card data.`,
    and the Legend question reads "This list has no Legend. Pick one, or leave it empty." with the option "Leave empty". **Given** 200 stored decks **When** Save is pressed **Then** the dialog shows
    "You already have 200 decks, the most you can keep. Delete a deck to save this one." and no "Deck saved." appears.

34. **Back keeps zone answers for unchanged lines** (DECK-100, 101; v0.13, RJ 2026-11-26) **Given** plain text `1 Kennen, Heart of the Tempest` / `1 Kennen, Storm of Shuriken` / `3 Lightning Rush` / `2 Gust` (`Gust` has `category: 'unknown'`) and the user answers the `PICK_ZONE` for `2 Gust` with Sideboard
    **When** the user presses Back, edits line 3 to `4 Lightning Rush` and presses Continue **Then** `Gust` is still in `sideboard` (`zoneMethod: 'user'`), no question is open for it, and `Lightning Rush` is ×4. **When** instead a blank line is added above line 1 **Then** the answer is still kept (position does not matter).

35. **Back keeps the Legend answer; a new candidate asks again** (DECK-100, 101, 070) **Given** the AC 30 paste (two Legends) and the user picks `Kennen, Heart of the Tempest` **When** Back, then a whitespace-only edit to the `Riven, The Exile` line, then Continue **Then** the pick is kept, `Riven, The Exile` is still out of the deck and the name is still `Kennen, Heart of the Tempest`. **When** instead a third Legend line is added **Then** `PICK_LEGEND` is open again, unanswered, with three candidates, and Save is disabled. The same holds for the Chosen Champion answer of AC 31 and for "Leave empty".

36. **Edited lines and changed sections drop their answers** (DECK-100, 101) **Given** AC 34's answer **When** Back and `2 Gust` is changed to `3 Gust` and Continue **Then** the `PICK_ZONE` for `Gust` is open again and unanswered. **Given** `Main Deck:` / `1 Zaun Warrens` where the user clicked "Move to Battlefields" **When** Back, the label becomes `Sideboard:`, Continue **Then** the move is dropped and `Zaun Warrens` sits in `sideboard` with warning `ZONE_CATEGORY_MISMATCH` again. **Given** two identical lines `2 Gust` where only the first was answered **When** the first is deleted **Then** the remaining line takes the answer of the first (same trimmed text, same context, occurrence 1).

37. **Removed lines stay removed only while unchanged** (DECK-100, 042) **Given** line 5 `2 Totally Fake Card` removed (AC 9) **When** Back and Continue with no edit **Then** it is still removed, is not in "Lines to fix", and after Save `importRemovedLines = ["2 Totally Fake Card"]`. **When** Back and the line is changed to `3 Totally Fake Card` and Continue **Then** it is in "Lines to fix" again.

38. **Cancel and Escape do not ask; full screen on a phone** (DECK-102, 103) **Given** an answered question and a removed line **When** the user presses Cancel, and in a second run presses Escape **Then** the dialog closes at once with no confirmation, nothing is stored, and reopening it shows no answers. **Given** widths 640 and 390 **Then** the dialog fills the viewport in the paste and the review step, with Back, Cancel and Save reachable. **Given** widths 641 and 1440 **Then** it is a floating dialog with the page visible around it.

39. **Legend question held while the Legend line is unresolved** (DECK-104, 036, 033, 041, 070; v0.14, RJ 2026-11-26) **Given** `Legend:` / `1 Kennen, Heart of the Tempst` (typo, not in the card data), `Champion:` / `1 Kennen, Storm of Shuriken`, `Main Deck:` / `3 Lightning Rush`
    **When** parsed and reviewed **Then** "Lines to fix" lists line 2 with `No card named "Kennen, Heart of the Tempst" in the card data.`, Save is disabled with "1 card needs attention", **no** `PICK_LEGEND` question is open, the text "This list has no Legend. Pick one, or leave it empty." is **not** shown, no text mentions an unresolved Legend, no question is counted ("N questions to answer" absent), and the name field reads `Imported deck <date>`.
    **Fixing the line has two paths (DECK-041); this AC names both.** (a) **Back and type the name:** the user goes Back, changes line 2 to `1 Kennen, Heart of the Tempest` and presses Continue (built and tested). (b) **Pick in "Lines to fix":** fuzzy suggestions (IMP-027, H-272) are **not built yet**, so the typo line above has no suggestion to pick today, and path (b) is tested with a different Legend line that needs a pick: `1 Kennen, Heart of the Tempest RAD 001`, where the fixture's `RAD 001` is `Lightning Rush`, so the line is `needs-review` with `PRINTING_NAME_MISMATCH` and the user picks `Kennen, Heart of the Tempest` (DECK-015). The suggestion path for the typo line **waits for H-272**.
    **When** the user fixes it by either path **Then** it is `legend`, no question is open, Save is enabled and the name field reads `Kennen, Heart of the Tempest`. **When** instead the user removes line 2 **Then** `PICK_LEGEND` opens with "This list has no Legend. Pick one, or leave it empty." and the option "Leave empty", Save is disabled ("1 question to answer"), and after Save `importRemovedLines` holds `1 Kennen, Heart of the Tempst`. **Given** instead no Legend line at all **Then** `PICK_LEGEND` is asked at once (AC 3, AC 33).

40. **Chosen Champion picked in a Section select on a quantity-2 line** (DECK-105, 027, 025; v0.14, **RJ's decision since v0.15**; built and tested; fixed in v0.14.1, H-501) **Given** the line `2 Gust` (`category: 'unknown'` as in AC 6) written **first, before any section label, so it is unsectioned** (a line under `Main Deck:` is placed by its section and asks no `PICK_ZONE`, DECK-020), then `Legend:` / `1 Kennen, Heart of the Tempest`, then `Main Deck:` with 38 other cards (so `PICK_ZONE` is asked for line 1) **When** the user sets the Section of `2 Gust` to Chosen Champion **Then** `champion` = `Gust` ×1, `main` holds `Gust` ×1 next to the 38 cards (39 in all) with a reason line, `zoneMethod: 'user'` on both, nothing is removed, and the total of `Gust` is still 2. (The unit test uses the fixture card `Mystery Card`, `category: 'unknown'`, in place of `Gust`.)

41. **SAMPLE printings are left out of deck import** (DECK-106, IMP-077; v0.16, H-197; RJ 2026-11-25 for the rule, **the two readings are proposals**; **BLOCKED on SPEC-001 CARD-044**: runs on test data that carries a marker; with no marker nothing is left out) Uses the invented fixture of SPEC-003 AC 50 (`Lightning Rush` with a SAMPLE printing `RAD 999`; `Promo Only Card` that exists only as SAMPLE). **Given** `Main Deck:` / `3 Lightning Rush RAD 999` **When** reviewed **Then** the line resolves by name to `Lightning Rush ×3` with the existing `UNKNOWN_PRINTING` warning, and the saved deck holds only `cardKey` and quantity (DECK-096). **Given** `1 Promo Only Card` **Then** it is `UNKNOWN_CARD` under "Lines to fix", Save is blocked ("1 card needs attention", DECK-041) until the line is fixed or removed, and no text mentions SAMPLE. **Given** no marker in the catalog **Then** `RAD 999` is looked up like any code.

## Out of scope
- **Fetching URLs** or importing from a deck site by link or API (DECK-072; IMP-005).
- **Sharing decks with other users, public deck pages, and any storage outside the user's own account.** Accounts, sync and the browser cache are in scope and specified by SPEC-010 ([[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2); ADR-0005 #1 is superseded).
- **Sharing decks** (share links, public decks, deck codes as output). Export is text for the user only.
- Importing several decks at once; Pixelborn codes. (CSV/Excel deck import is in scope since v0.4, DECK-011.)
- Ownership display, partial colouring and the deck-level owned summary (SPEC-005 [[Your Decks Ownership View]]).
- Formats other than Standard; 2v2, Limited.
- Deck statistics, curves, ratings, or any metagame number ([[ADR-0003 Tournament Results Only]]).

## Open questions / BLOCKED
- **BLOCKED: needs research**: which groups Piltover Archive deck codes carry (Legend, battlefields) and in which group the V3+ chosen champion, runes and additional legends sit (DECK-039; fact 7 names the versions, community, but not the layout); plus a real code with known
  contents as a fixture. Until then a code is treated as an unsectioned main deck + sideboard.
- **Community, one tool's reading (H-166, v0.10)**: the TTS trailing number is an art number, not a copy count (SPEC-003 IMP-036, IMP-036a; [[Collection Import Formats]] fact 8). Art 3 or more has no documented mapping (Open question in SPEC-003); a deck saves with the base printing's card either way, since only the `cardKey` is stored (DECK-096).
- **Unverified**: CSV and TXT export samples (H-022 fact 10); no columns are specified for deck CSV beyond the positional row rule (IMP-040).
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
- **Resolved (RJ, 2026-11-25, H-260 and [[Decks]] §13a):** an imported deck is named after its Legend (DECK-070); any deck can be renamed at any time, locked and tournament decks included (DECK-081); H-254 builds Rename only, the card editor waits for its own brief (DECK-080 deferred, #14); the "can't be undone" text goes (DECK-082, choice 15); "Deck saved." with "View deck" (DECK-098, choice 17a).
- **Resolved (RJ, 2026-11-25, H-320; was "For RJ (H-252 a), DECK-073"): the description reuses the existing `notes` field (option (a)).** Up to 4,000 characters, shown clamped to 3 lines; no schema, Firestore rules or [[API Contracts]] change (the new `description` field of option (b) was not chosen).
- **Resolved (RJ, 2026-11-25, H-320; was "For RJ (H-252 b)"), DECK-070 and DECK-062: the written defaults.** (1) With no Legend the default name is `Imported deck <date>`; (2) two imports with the same Legend get the **same name, no suffix** (decks are told apart by source line, Updated date and the list's Legend art; the name is editable; the " (2)" option was not chosen); (3) **tournament decks keep the DECK-062 name** (`Kennen: ASC Evansrhim (1st, Riftbound Regional Championship: Europe)`) although the tile also shows the player and event; option (b), the Legend's name for them too, was not chosen.
- **Resolved (RJ, 2026-11-25, H-320; was "For RJ (H-252 c)"), DECK-081: a rename updates `updatedAt`** and moves the deck to the top of the default list order (OWN-005); option (b), leave `updatedAt` alone, was not chosen.
- **Resolved (H-342, v0.12):** (c) RJ's 2026-11-25 Legend and Champion rule is in DECK-033, DECK-034 (b) and the data contract (RJ, 2026-11-25, in chat, H-253 row); (d) `Champion: 2 <champion>` is settled by the rules and our zone model, not a product choice (DECK-027; [[Deck Construction Rules]] facts 4 and 15, `verified`, as of 2026-11-24; the build differs, item H-410).
- **Resolved as built (v0.14.1, H-501), RJ to read:** the wording that waited for H-341 (the reason lines `championNotPicked` and `championExtraToMain`, and `championMany`, which said the other Champion lines are "left out" although DECK-034 (b) puts them in the Main Deck) is now the build's and is in DECK-099; `championMany` agrees with DECK-034 (b).
- **Not specified (no research or RJ answer yet):** a **Legend** with quantity above 1 (`Legend:` / `2 <legend>`). It is stored as given (data contract) and SPEC-002 LEGAL-001 reports it; the build does the same. Whether the importer should reduce it to 1 is not decided here. (RJ 2026-11-26, H-483, S4 (a): a Legend picked in a Section select with quantity above 1 is likewise stored as given, "keep as built".)
- **Resolved (RJ, 2026-11-26, H-479):** DECK-100 (Back keeps answers for unchanged lines), DECK-102 (no confirmation on Cancel or Escape) and DECK-103 (full screen at 40rem and below) are RJ's decisions ([[Critique H-341 Deck Import Review]] §6).
- **Open (v0.13, H-479), each with a proposed default that is NOT RJ's:** (1) Does Back also keep the typed deck name, the Source text and the Link? Proposal: not covered, so they stay as built (start over). (2) Are suggestion picks ("Use X") and typed replacement names for lines in "Lines to fix" kept? RJ's list names only zone, Legend, Chosen Champion and Section picks and removed lines; proposal: not kept, as built. (3) Does DECK-103 also apply to the shared SPEC-003 paste-or-upload dialog for "Add to your collection"? RJ decided it for Import deck; proposal: Import deck only, SPEC-003 unchanged. (4) DECK-101's definition of "unchanged" is a proposal; alternatives are plain line position, or trimmed text only with no section context.
- **Resolved (RJ, 2026-11-26, H-454, S3):** the `PICK_LEGEND` question is held while a Legend line is unresolved, with no new prompt wording (DECK-104, AC 39). The `legendUnresolved` prompt built in H-452 conflicted with it and was removed in H-500 ([[Validation H-500]], PASS).
- **Open (v0.14, H-454), research first, no requirement written (do not invent formats):**
  (S1) **Rune and promo code shapes in text lines**: `5 Mind Rune (RAD-R03)`, `1 Kai'Sa - Survivor (VEN-SP1)` from RJ's Kai'Sa list ([[Critique H-341 Deck Import Review]] §5). By the text of SPEC-003 IMP-064 and [[Card Data Model]] CARD-037, `R03` and `SP1` without `/` are not a printing code (form (d)), so they stay in the name and the card fails to resolve; that is the rule as written, not a verified statement about real collector numbers. Whether real rune and promo numbers look like that is `unverified`: waits on research (H-020, H-099). Any change is SPEC-003 / SPEC-001 first, then DECK-015 follows by reference.
  (S2) **` - ` as the name/subtitle separator** (`Kai'Sa - Daughter of the Void` for `Kai'Sa, Daughter of the Void`): treat it as the comma, or leave it to fuzzy suggestions (not built, H-272)? No source says how often decks use it, or whether any card name contains ` - `: `unverified`, needs research (H-020) and a decision for SPEC-003 IMP-019 / CARD-030 first. Note IMP-065 already accepts ` - ` between a name and a printing code, which is a different use.
- **Resolved (RJ, 2026-11-26, in chat, H-483; were "Open (v0.14, H-454), proposals only"). No builder item is needed: every answer keeps the build as it is.**
  (S4) **Keep as built.** DECK-105 is RJ's decision (a Chosen Champion pick in a Section select on a quantity above 1 line keeps 1 copy in `champion`, the rest go to `main`). Legend and Chosen Champion **stay in the Section selects** (no hiding). (a) A Legend picked in a Section select with quantity above 1 is **stored as given**, the same as the `Legend:` path today.
  (S5) **Keep as built and approved:** `needAttention(n)` says "{n} cards need attention" (DECK-099) although it counts **lines**. The alternative wording "{n} lines need fixing" is not used.
  (S6) **Not now.** No bulk "Remove all lines to fix"; DECK-041 keeps removing one line at a time. Deferred by RJ; revisit after live card data (H-020) shows how many lines remain.
  (S7) **Keep as built.** A line whose name does not match but whose code does resolves to the code's card with the `codeUsed` warning and a Remove line button, the same as SPEC-003 IMP-068 (c), reached through DECK-015. Deck import does not differ from the owned-card import here.
- **Open (v0.14), for RJ, S3 details (spec-writer's reading, DECK-104):** (1) While the question is held the review says nothing about why no Legend question appears yet; "Lines to fix" shows the line and the user can see it is the Legend line only from the card's name. Telling them would be new wording, which RJ ruled out for now. (2) DECK-104 holds the question while **any** Legend-section line is unresolved, also when another Legend line resolved (the unresolved one may be a second Legend). (3) After the user **removes** the unresolved line, the "no Legend" question appears (DECK-036). RJ said "fixed or removed"; this is the reading of the words, not a separate answer.
- **Open (v0.16, H-197), proposals NOT RJ's:** DECK-106 (b), (c): RJ said SAMPLE printings are "left out entirely" and did not say what a deck line shows when its code names a SAMPLE printing, or when the card exists only as SAMPLE. Proposed: the existing `UNKNOWN_PRINTING` / `UNKNOWN_CARD` handling, no new wording (same as SPEC-003 IMP-077). **BLOCKED: needs research (H-020):** the marker itself (SPEC-001 CARD-044). Part of the gate with H-483 (RJ reads this spec once).
- **Open (v0.14.1, H-501), builder's choices as built and validated, none decided by RJ; recorded so the spec matches the build, each changes behaviour only at the edges. For RJ: keep, or say what to change (added to gate H-483):**
  (a) **A zone answer on a line that needs a pick again is dropped** (DECK-100 (a), DECK-101; [[Validation H-480]] judged it consistent). When Back and Continue leave a line in "Lines to fix" (its text changed, or it is `needs-review` again because suggestion picks are not kept, Open questions (v0.13) (2)), the zone the user had given it is not kept; it is asked again once the line resolves. The line does not need to have changed for this to happen: an unchanged line whose "Use X" pick was lost loses its zone answer too. Alternative: keep the zone answer and apply it when the line resolves to the same card. Builder's choice; RJ did not specify.
  (b) **Legend lines that did resolve wait while `PICK_LEGEND` is held** (DECK-104; [[Validation H-500]]). With a Legend line in "Lines to fix", the Legend lines next to it that did resolve are not placed in `legend` yet (no Legend, fallback name `Imported deck <date>`, Save blocked by the line to fix); after the unresolved line is fixed or removed, DECK-033 applies to all of them. This is the reading already in Open questions (v0.14) (2), now as built.
  (c) **A parse-error Legend line does not hold the question** (DECK-104; [[Validation H-500]]). Only a line that reaches the review (it has a card entry) and is `needs-review` or an unresolved error line (DECK-041) holds `PICK_LEGEND`. A line under `Legend:` with no card entry (IMP-063, e.g. `MISSING_QUANTITY`: `Legend:` / `Kennen, Heart of the Tempest`) is reported and left out of the import, so with no other Legend line the "no Legend" question (DECK-036, `legendNone`) is asked while that error is shown (read from the code, `legendHeld` takes only review lines; no test names this case). RJ's sentence ("until the unresolved Legend line is fixed or removed") did not say which kind of line. Alternative: hold for it too.
  (d) **Strings:** the wording marked "built" in DECK-099 and the SPEC-003 review heading "Check the cards" (Open questions of [[Collection Import]], v0.14.1) were written by the builder during H-450 to H-453 and H-469; RJ has not read them. Not a behaviour change.

## Changelog
Current: 0.16.1 (2026-11-26, H-600, text only, [[Validation H-501]]: AC 8 rewritten so it can be met today (typo line is an unresolved `UNKNOWN_CARD` line, Save blocked with "1 card needs attention", fixed by typing the name or Remove line; the accept-the-suggestion half marked as waiting for H-272, as AC 39 path (b)); DECK-041 and DECK-043 say suggestion picks wait for H-272; no behaviour or data-contract change, no builder item, status stays `review`). Previous: 0.16 (2026-11-26, H-197, RJ 2026-11-25 H-193 answers; sits on top of 0.15 (H-483, approved)): new section O, DECK-106 (SAMPLE printings left out of deck import via SPEC-003 IMP-077; RJ's rule plus two **proposals** on codes and only-SAMPLE cards, no new wording; for RJ: H-653), AC 41, an Open question; pins SPEC-002 0.5, SPEC-003 0.15; status `approved` → `review` (RJ approved 0.15; 0.16 adds DECK-106 with its two proposals); no data-contract change; build H-640 (blocked on H-020). Previous: 0.15 (2026-11-26, H-483, RJ 2026-11-26 in chat, S4 to S7; status `review` → `approved`, RJ approved 0.14.x): DECK-105 is now RJ's decision (level and source only, text otherwise unchanged; Legend and Chosen Champion stay in the Section selects, a Legend picked there with quantity above 1 is stored as given); S5 keep "{n} cards need attention" as built, S6 no bulk "Remove all lines to fix" for now (revisit after H-020), S7 keep as built (IMP-068 (c) `codeUsed` + Remove line); Open questions S4 to S7 moved to Resolved; S1 and S2 stay open (research H-020, H-099); the v0.14.1 builder choices (a) to (d) are still recorded as built, not answered by RJ in this chat; no behaviour or data-contract change, no builder item; pins elsewhere pin-only. Previous: 0.14.1 (2026-11-26, H-501, text catch-up to the build after the review-polish batch, [[Validation H-480]], [[Validation H-500]], [[Validation H-469]]; no requirement added, no behaviour decided, status stays `review`, gate H-483): AC 40's Given fixed (the `2 Gust` line is unsectioned; under `Main Deck:` a section places it and no `PICK_ZONE` is asked); AC 39 names its two fix paths (typing the name, built; a pick, tested on a `PRINTING_NAME_MISMATCH` Legend line because suggestions wait for H-272); DECK-099 adopts the strings built in H-450 to H-453 (`check`, `sectionForLine`, `needsAnswer`, `ready`, `checks`, `alsoMain`, `pickedSection`, `championMany`, `inferred` and `inferredNote` reworded, `removed(n, list)` and `removedItem`, `championNotPicked`, `championExtraToMain(n)`, `ambiguousName`) and the display label "Chosen Champion", marked "built, not read by RJ"; DECK-034, DECK-104 and DECK-105 lose the "pending H-341" and "unmerged branch" wording (the test for DECK-105 was read); Open questions (v0.14.1) (a) to (d) record three builder choices and the strings for RJ; pins SPEC-003 0.14.1 (this spec's depends line). Previous: 0.14 (2026-11-26, H-454, RJ 2026-11-26 on S3; [[Critique H-341 Deck Import Review]] §5 S1 to S7): new section N: DECK-104 (RJ: hold `PICK_LEGEND` while a Legend line is unresolved, no new prompt wording, existing strings only; the `legendUnresolved` prompt built on the unmerged branch is not specified; build H-500), DECK-105 (**proposal, not RJ's**: a Chosen Champion Section pick on a quantity-2 line keeps 1 copy, the rest to `main`; reported as built); DECK-036 points to DECK-104; ACs 39, 40; Open questions: S1 and S2 wait for research (H-020, H-099), S4 to S7 and the S3 details are proposals for RJ; status stays `review`; no data-contract change; pins elsewhere pin-only. Previous: 0.13 (2026-11-26, H-479, RJ 2026-11-26 in chat, [[Critique H-341 Deck Import Review]] §6): new section M: DECK-100 (Back keeps the answers for unchanged lines), DECK-101 (proposal: what "unchanged" means), DECK-102 (no confirmation on Cancel or Escape), DECK-103 (full screen at 40rem and below; H-453 built it on the unmerged code branch); ACs 34…38; four open questions recorded; status `approved` → `review`; no data-contract change; pins elsewhere pin-only. Previous: 0.12 (2026-11-25, H-342, RJ 2026-11-25 in chat on the H-253 row): ACs 7 and 23 now agree with DECK-034 and DECK-038 (Legend and Champion sections added to AC 7's Given; AC 23 answers `PICK_CHAMPION` with "Leave empty"); the builder's review and save strings are adopted verbatim (new DECK-099, RJ approved 2026-11-25), without the champion reason lines `championNotPicked` / `championExtraToMain` and the label `championMany` (pending H-341); DECK-033 and DECK-034 (b): 2+ Legends → pick one, the others leave the deck, 2+ cards under `Champion:` → pick one, the others and extra copies of the pick go to `main`, "Leave empty" stays for both; new DECK-027 (`Champion: 2 <champion>` → 1 in `champion`, the extra copy in `main`); DECK-025 and DECK-042 cross-references; data contract comments (`champion` qty 1, `importRemovedLines`); ACs 30…33; research added: [[Physical Copies Across Decks]]; status stays `review`. Previous: 0.11.1 (2026-11-25, H-320, RJ 2026-11-25 answers to open questions (a)…(c)): all three closed with the written defaults, no behaviour change: DECK-073 `notes` is the description, DECK-070 fallback and no suffix on duplicate names and DECK-062 kept for tournament decks, DECK-081 (d) a rename moves the deck to the top of the list (OWN-005), AC 28 checks it; *proposal* markers replaced by RJ's attribution; status stays `review`. Previous: 0.11 (2026-11-25, H-252, RJ 2026-11-25 (H-260 answers, "default for all" on [[Decks]] §13, and §13a)): DECK-070 rewritten (named after the Legend, follows the Legend until typed over, fallback, duplicate names allowed); DECK-073 (`notes` is the description); DECK-080 deferred; DECK-081 rewritten (Rename at any time, locked and tournament decks included; tournament source read-only); DECK-082 (no "can't be undone"); DECK-083, DECK-084 (snack bars); new DECK-098 ("Deck saved." with "View deck"); ACs 26…29; Open questions (a)…(c); no `UserDeck` field added, `schemaVersion` stays 1; pins SPEC-008 0.4.5; status `draft` → `review`. Pin-only 2026-11-25 (H-167, no version bump): SPEC-004 pin 0.7; the RC Europe event name in the DECK-061, DECK-062 and AC 11 / 11a examples is now `Riftbound Regional Championship: Europe`. Previous: 0.10 (2026-11-25, H-166, [[Collection Import Formats]] facts 7 to 9: DECK-010 cites SPEC-003 IMP-036a (TTS trailing number is an art number, community) and the Piltover set / variant tables to RAD (IMP-032, IMP-033, community); DECK-020 labels may carry `*` bold marks (IMP-016, official); DECK-039 records what the code versions V3…V6 add (community) and keeps the zone mapping BLOCKED; AC 25 new; Open questions updated; pins SPEC-001 0.4.1, SPEC-003 0.14). Previous: 0.9.1 (2026-11-25, H-165, RJ decision 2026-11-25: DECK-040 follows SPEC-003 IMP-025 (optional leading "a" / "the", CARD-034) and says the deck editor's catalog search uses CARD-038; no other rule changed; pin SPEC-003 0.13). Previous: 0.9 (2026-11-25, H-174, RJ 2026-11-24 header decision / gate H-178: DECK-001 is the "Import deck" entry point (FAB on Decks, empty-state button, `/decks?import=1`; a saved deck stays on Decks; no import page, `/import` goes to Home); DECK-097 gate note names the Decks page; Purpose wording; AC 24 new; no parsing or deck rule changed; pins SPEC-003 0.12, SPEC-010 0.14). Previous: 0.8 (2026-11-24, H-171, ADR-0007 amendment 2, account-only: DECK-090 and DECK-097 without modes; DECK-087 restore wording; pins SPEC-003 0.11, SPEC-004 0.6, SPEC-008 0.4.4). Previous: 0.7.1 (2026-11-25, H-160). Earlier: 0.7 (2026-11-24, H-071: DECK-074 monotonic `updatedAt`). Full history: [[Deck Import changelog]] (archived). New entries go in the archive note.
