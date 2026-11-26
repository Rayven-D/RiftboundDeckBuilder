---
tags: [spec]
id: SPEC-003
version: 0.15
status: draft
depends_on: [SPEC-001, SPEC-008]
related: ["[[Deck Import]]", "[[My Collection]]", "[[Your Decks Ownership View]]", "[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
research: ["[[Collection Import Formats]]", "[[Card Data & Images]]", "[[Sets]]", "[[Deck Construction Rules]]", "[[Physical Copies Across Decks]]"]
as_of: 2026-11-24
---
# SPEC-003: Collection Import

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** Owned Cards Import (labelled **"Add to your collection"** in the app since v0.12: a dialog opened from a floating button on the Collection page, there is no import page): parse → preview → commit a list of cards the user owns into their account's collection (through the browser cache, IMP-053). Part A (shared parsing) is reused by [[Deck Import]]; Part B is collection-only.

**Key requirements**
- IMP-001/062: paste or upload `.txt`, `.csv` or `.xlsx` in one dialog; an upload is written into the editable text box and parsed by the same line rule. v0.8: IMP-061 lists every rejected upload (other file types, size, encoding, no lines) with its message; a rejected upload leaves the text box unchanged.
- IMP-019/020 (v0.5): quantity as `3 Name`, `3x Name`, `3 x Name`, `x3 Name` or `Name x3` (`x` or `X`), once per line.
- IMP-021: every line needs a quantity; a name-only line is error `MISSING_QUANTITY` (no "assume 1").
- IMP-064…070 (v0.5): a line may carry a printing code (`RAD 001/167`, `OGN-007a`, `(OGN 299/298)`) at the start or end of the name; it is resolved by CARD-036 `lookupPrinting` and identifies the exact printing. Code-only lines (`3 RAD 001/167`) are accepted. Code and name disagree → `PRINTING_NAME_MISMATCH`; code not found → name fallback with `UNKNOWN_PRINTING`.
- IMP-040/043: CSV/Excel rows are one cell `3x Name` or a quantity cell then the name (v0.8: or a section label cell then the entry); a first row of column titles is skipped. IMP-042 (v0.8): `;` or tab outside quotes on the first line beats `,`.
- IMP-016/017: section labels match case-insensitively with or without spaces (`Main Deck` / `MainDeck`); **v0.14 (H-166, [[Collection Import Formats]] fact 9, official)**: `*` bold marks around a label (`**Legend:**`) and a trailing `:` are stripped before matching.
- IMP-031…033 (v0.14, fact 7, **community**): Piltover deck codes use set indexes `0 OGN, 1 OGS, 2 ARC, 3 SFD, 4 UNL, 5 VEN, 6 RAD` and variant letters none = base, `a` = alternate art A, `b` = alternate art B, `s` or `*` = signed; a code number may carry the `SP` special prefix (`VEN-SP1a`); code versions V1…V6 are accepted.
- IMP-036/036a (v0.14, fact 8, **community, one tool's reading**): in a TTS token `SET-NUMBER-ART` the trailing number is an **art number, not a copy count**: 1 = base, above 1 = alternate art (documented: `ABC-012-2` = `ABC-012a`); each token is still one physical copy.
- IMP-002: parsing has no side effects; only an explicit commit writes.
- IMP-003/056/063: one bad line never aborts; lines with problems are listed and left out; Continue needs one valid entry.
- IMP-011/013: format auto-detection (csv by file type, piltover-code, tts, riot-text, plain-text); the user can override.
- IMP-025/027: exact `nameKey` match resolves; **v0.13 (RJ 2026-11-25, H-165): a leading "a" / "the" is optional** (CARD-034), so `Dreaming Tree` resolves to `The Dreaming Tree` (`method: "article"`, no review); fuzzy suggestions are never applied automatically.
- **IMP-077 (v0.15, H-197; RJ 2026-11-25, H-193: "Sample cards are NOT legal", "we can just leave them out entirely"):** a printing stamped SAMPLE is **left out entirely**: never imported, counted, listed, exported or matched. Until SPEC-001 CARD-044 defines the marker (BLOCKED, H-020) no printing is treated as SAMPLE and nothing is guessed from set code or collector number. How a code or a card that exists only as SAMPLE resolves is a **proposal**, not RJ's words (IMP-077 (c), (d)); AC 50.
- IMP-029: shared-prefix names (e.g. `Kennen`) are `AMBIGUOUS_NAME`; IMP-059: no curated alias table (the article rule is generic).
- IMP-047/048: merged by `cardKey`; per-printing counts (deck code, TTS, or a text/CSV/Excel line resolved by its printing code) are kept for display only.
- IMP-049/050: commit as Add (default) or Replace (with confirmation). IMP-050a (v0.8, split out of IMP-050): when a Replace or an Undo would leave a locked deck short, the warning ("… will be `<n>` cards short. It stays locked.") is shown inside the confirmation before the change; an Undo without one asks for one only then, and a confirmed Undo is followed by the notice "… is now `<n>` cards short." (SPEC-008 SHARE-034; RJ 2026-11-23).
- IMP-060 (v0.12, H-174): the flow is **"Add to your collection"**, a dialog opened from the FAB on `/collection` (SPEC-007 COLL-094), the empty state's button, or `/collection?add=1` (SPEC-010 SYNC-159); `/import` is removed and goes to Home; Deck Import is "Import deck" on Decks (SPEC-006).
- IMP-052, IMP-072…075 (v0.10, H-087; v0.12: the dialog is opened on Collection, so a commit **stays on `/collection`** and the grid updates in place): a commit shows a snack bar ("Added 42 copies of 30 cards." / "Collection replaced: 412 cards.", singular `1 copy` / `1 card`) and **Undo**; the notice lasts 10 s across routes, Undo confirms only for COLL-058 / IMP-050a, works once, then "Import undone."; no other Undo entry point.
- IMP-053/054: `CollectionStore`, recording `catalogVersion`; the collection lives in the signed-in account and the browser holds a **cache** of it (v0.11, account-only: SPEC-010 SYNC-140…, cleared on sign-out, account deletion and when another account signs in). IMP-076 (v0.11): Owned Cards Import needs a signed-in account: it is behind the SYNC-009 sign-in gate, with no exception.
- IMP-055 (v0.7, H-045): CSV export `Quantity,Card Name` only (no Tags column); one row `<qty>,<name> <SET> <NUM>` per printing, one name-only row for unassigned, missing-printing and no-code copies; export → Replace import gives the same `quantity` and `byPrinting` (AC 35).
- IMP-058: the committed collection feeds Collection; Decks reads SPEC-007 `deckOwnership()`.
- IMP-071 (v0.9, RJ 2026-11-24): **runes are imported like any card**: resolved, merged, committed and exported with no rune-specific skip, filter or warning, in any section, `Rune Pool:` included (SPEC-009 withdrawn).
- Part A preamble: not applicable to decks: IMP-009 and IMP-015 only (= DECK-013). Since v0.4 CSV/Excel is shared with decks.
- **v0.14.1 (H-501, text catch-up, no requirement changed):** the review step of "Add to your collection" opens with the heading **"Check the cards"** (`REVIEW_TEXT.check`, H-469), the builder's own wording, not RJ's; recorded in Open questions (RJ to confirm).

**Shared types:** `CardKey`, `PrintingId`, `PrintingCode` (keys) · `ImportResult` / `ParsedLine` / `PrintingHint` / `ImportIssue` / `UploadInfo` (parser output, reused by SPEC-006) · `SourceFormat` · `StoredCollection` (`cardKey` → quantity + `byPrinting`) · `CollectionStore`.
**Depends on:** [[Card Data Model]] v0.4.2 (pin-only, H-645); [[Shared Cards and Lock-in]] v0.4.6 (IMP-050a locked-deck warning only; pin-only, H-252, H-256). **Consumers:** [[Deck Import]] (Part A), [[My Collection]], [[Your Decks Ownership View]].
**BLOCKED (needs research):**
- Real deck codes with known contents for fixtures (AC 16); which section tag the V3…V6 groups (chosen champion, runes, additional legends) get (IMP-031).
- Whether the Riot API's printings use the same suffix letters and `SP` numbers as Piltover codes and TTS art numbers (IMP-033, IMP-036a; needs H-020).
- CSV and TXT export samples (`unverified`, H-022 fact 10): column sets of TCGplayer/Moxfield/Deckbox/Dreamborn and the Play Network TXT layout (IMP-046). No columns are specified.
- Suffix letter → `variant.kind` (CARD-040); until then a code's printing kind comes only from the catalog and is often `unknown` (IMP-070).

## Purpose
Let a user bring the cards they **own** (scanned, or kept in another app) into the app. This spec is the
**Owned Cards Import**, labelled **"Add to your collection"** in the app and opened from the Collection page
(IMP-060; "List of cards and their quantity you own", [[Design Direction]]). An import produces a **collection** (owned count per card), not a deck: section
labels, deck structure, and legality are irrelevant here. The committed collection is what
the Collection screen ([[My Collection]], SPEC-007) lists and what [[Your Decks Ownership View]] (SPEC-005) uses to show which
cards of each imported deck the user owns ([[ADR-0006 Two Imports - Collection and Decks]]).

**Scope: owned cards only.** Deck lists the user wants to build (**"Import deck"** on Decks) are
[[Deck Import]] (SPEC-006). The requirements are split in two parts:
- **Part A, shared parsing (reused by SPEC-006, except the owned-cards-only requirements listed at the start of Part A):** input handling, format detection, line/token/row
  parsers, name resolution, fuzzy suggestions, and error reporting. SPEC-006 references these IDs
  instead of redefining them.
- **Part B, collection-specific:** merging into the collection, Add vs Replace, undo, storage.

The import is a three-step flow: **parse → preview → commit**. Parsing never changes the stored
collection. The user reviews resolved lines, suggestions, and errors, then commits as **Add** or **Replace**.

Research basis: [[Collection Import Formats]] (note status `unverified`; facts 7 to 9 as of 2026-11-24, H-022: facts 7 and 8 are **community**-sourced, fact 9 is **official**; fact 10, CSV and TXT export samples, stays `unverified`). There is no
standard Riftbound *collection* export format; most tools exchange decklists, so we accept decklist
formats and sum them into owned counts.

## Definitions
- **Name key**: `nameKey(s)` as defined by SPEC-001 [[Card Data Model]] CARD-030 (NFKC, typographic
  apostrophes/quotes and dashes folded, accents removed, case-folded, every character that is not a
  letter, digit or space removed, whitespace collapsed). *A1 resolved (v0.2):* consistent with CARD-030;
  the subtitle is kept, so `Kennen, Heart of the Tempest` (`kennen heart of the tempest`) and
  `Kennen, Storm of Shuriken` are different keys. Side effects of step (6): commas are dropped, and a
  hyphen is removed **without** inserting a space, so `Star-Crossed` → `starcrossed` but
  `Star Crossed` → `star crossed` (not an exact match; see IMP-025).
- **cardKey**: the playable-card key from SPEC-001 (`cardKey = nameKey(canonical name)`, CARD-012,
  CARD-030). All ownership counts and matching use `cardKey` only (CARD-013).
- **Printing code**: a set code plus a collector number read from the input: the public code
  `SET-NNN[variant]` (e.g. `OGN-007a`, `RAD-SP1/005`), a TTS token, a deck-code card, or (v0.5) a code
  written on a text line next to the name (`RAD 001/167`, `(OGN 299/298)`, IMP-064). *A2 bound (v0.2):* a
  printing code resolves to a SPEC-001 printing (`printingId`) through the set + collector-number lookup
  **CARD-036 (MUST)**, using the set-code and collector-number normalization defined there (CARD-037:
  leading zeros ignored, the `/total` of a fraction ignored, trailing letters kept as a variant hint).
  This spec does not define its own padding or case rules; it only removes whitespace around `/`
  before the lookup (IMP-067).
- **Printing hint** (v0.5): the structured printing code of one entry (`PrintingHint`, Data contract):
  the set code, the collector number exactly as typed, and the code text. `null` when the entry names no printing.
- **Card catalog**: the card list from SPEC-001, sourced only from the Riot API (`riftbound-content-v1`),
  identified by its `catalogVersion` (defined in SPEC-001). All resolution is against this catalog; no
  other card source, community database, or curated alias table is used ([[Riot Developer Rules]] #7;
  [[ADR-0005 MVP Product Defaults]] #4). Import uses only `name`, `cardKey`, `setCode`,
  `collectorNumber`, `printingId` and `variant`; SPEC-001's nullable gameplay attributes play no role here.
- **Collection**: map of `cardKey` → owned count, plus optional per-printing counts (by `printingId`)
  when the source identified printings.
- **Source format**: one of `riot-text`, `plain-text`, `piltover-code`, `tts`, `csv`. `csv` means
  rows from an uploaded `.csv` **or `.xlsx`** file (v0.4); those rows are converted into text lines
  (IMP-040) and parsed with the text grammar.
- **Entry**: one parsed (quantity, card reference) pair, from one line, one TTS token, one deck-code
  card group, or one CSV/Excel row.
- **Quantity cell** (v0.4): a CSV/Excel cell that is only digits, optionally followed by `x`/`X`
  (e.g. `3`, `3x`, `3 X`).
- **Similarity**: `1 − d / max(len(a), len(b))` where `d` is the Damerau–Levenshtein distance between
  the name keys of two names. Range 0..1. (Behavioral contract for thresholds; the algorithm library is an
  implementation choice.)

## Requirements

### Part A: Shared parsing (reused by SPEC-006 [[Deck Import]])
Part A is **shared parsing, reused by SPEC-006**, except these requirements, which are **not applicable to decks** and apply to the Owned Cards Import only (SPEC-006 DECK-013 lists the same set and what replaces each): **IMP-009** (collection total cap after merging) and **IMP-015** (several deck codes in one import). Every other Part A requirement is reused unchanged, **including** the `.csv`/`.xlsx` uploads of IMP-001 and the CSV/Excel requirements IMP-040 … IMP-046 (RJ decision 2026-11-23 (H-043): Deck Import also accepts CSV/Excel; before v0.4 these were owned-cards only). Its output is an `ImportResult` with per-line sections kept; it never merges into or writes to any store. SPEC-006 cites these IDs and adds only deck-specific rules.

#### General parsing flow *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-001 | MUST | Accept input either as pasted text or as an uploaded file: `.txt` (read as text), `.csv` (IMP-042), or `.xlsx` (Excel; the **first sheet** only), recognised by the file name's extension (any case). Any other file type is rejected (IMP-061). Upload limits and rejected files: IMP-061. How an upload reaches the parser: IMP-062. | [[Product Vision]] core loop step 1; RJ decision 2026-11-23 (H-043) (`.xlsx`) |
| IMP-002 | MUST | Parsing produces an `ImportResult` (see Data contract) and has no side effects: it MUST NOT modify any stored data. Only an explicit user **commit** writes (owned cards: IMP-049; decks: SPEC-006). | design decision |
| IMP-003 | MUST | Imports are tolerant: one bad line never aborts the import. Every unparseable or unresolved entry is reported with its location; all other entries remain importable. | design decision |
| IMP-005 | MUST | Raw import text and files MUST NOT be sent to any third party. Resolution runs only against our own card catalog. | [[Riot Developer Rules]] #7 |
| IMP-061 | MUST | **Uploads.** An upload is checked in this order; the first failing check rejects it (v0.8): (1) the name ends `.xls` (old Excel, any case) → `FILE_REJECTED` "Older .xls files aren't supported. Save it as .xlsx or .csv and try again."; (2) the name does not end `.txt`, `.csv` or `.xlsx` (any case) → `FILE_REJECTED` "`<file>` can't be imported. Use a .txt, .csv or .xlsx file."; (3) a `.txt` larger than **1 MiB** (plus 3 bytes for a UTF-8 BOM) is rejected **before reading** with the IMP-006 limit: `INPUT_TOO_LARGE` "`<file>` is too large to import (limit: 1 MB or 10,000 lines)."; (4) a `.csv` or `.xlsx` larger than **5 MiB** is rejected before reading: `INPUT_TOO_LARGE` "`<file>` is too large to import (limit: 5 MB)."; (5) an `.xlsx` that cannot be read → `FILE_REJECTED` "Couldn't read `<file>`. Save it as .xlsx or .csv and try again."; a `.txt` or `.csv` that is not valid UTF-8 → `INPUT_ENCODING` (IMP-010); (6) the text the upload converts into (IMP-062) exceeds IMP-006 (1 MiB or 10,000 lines) → `INPUT_TOO_LARGE` "`<file>` is too large to import (limit: 1 MB or 10,000 lines).", so the text box is never filled with text that can't be imported; (7) that text has no non-blank character (an empty file, or only a title row and empty rows) → `FILE_REJECTED` "`<file>` has no lines to import." The message is shown next to the upload control (`UploadRejection`, Data contract); it is not an `ImportIssue`, because the file never reaches the parser. A rejected file leaves the text box, and the upload it holds (IMP-062), unchanged. **House style:** every user-facing message in this spec uses the straight apostrophe `'` ("aren't", "can't", "isn't", "Couldn't"), never the typographic `’`. | RJ decision 2026-11-23 (H-043); H-053 (checks (2), (3), (6), (7) as built in `parse-card-list.ts`); RJ decision 2026-11-23 (H-049 follow-up: straight apostrophe) |
| IMP-062 | MUST | **One paste-or-upload dialog per import** (Owned Cards Import, Deck Import). An uploaded file is converted into text lines (`.txt` as-is; `.csv`/`.xlsx` rows per IMP-040) and **written into the dialog's text box**, replacing its content, so the user can edit it; the loaded file name is shown. Pasted, typed and uploaded input is then parsed by the **same line rule** (IMP-019, IMP-021), re-parsed on every edit. **Upload kept or dropped (v0.8):** the upload (its file name, the `csv` format of IMP-011 and the row limit of IMP-007) stays with the text box while the user edits it, because edits are fixes to the uploaded lines; it is **dropped** when the text box is emptied (nothing but whitespace is left) or when a paste or drop replaces the **whole** content; a new upload replaces it, and a rejected upload changes nothing (IMP-061). | RJ decision 2026-11-23 (H-043); H-046/H-053 (kept/dropped rule as built in `import-dialog.ts`) |
| IMP-063 | MUST | **Problems and Continue.** The dialog shows the total copies and the number of valid entry lines, and lists every line with a problem (line number, message, raw text): the first **50** issues are shown, then "+N more". Lines with problems are **left out** of the import ("Lines with problems are left out of the import."). **Continue** requires at least one valid entry; otherwise it shows "Add at least one line with a number and a card name first." Continue hands the parse result to the next step and saves nothing (IMP-002). | RJ decision 2026-11-23 (H-043) |

#### Input limits *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-006 | MUST | Reject input larger than **1 MiB** (UTF-8 bytes) or with more than **10,000 lines** with a single input-level error `INPUT_TOO_LARGE` ("This is too large to import (limit: 1 MB or 10,000 lines)."); nothing is parsed. An upload over this limit is rejected before it reaches the text box, with the file name in the message (IMP-061 (3), (6)). | design decision. A full collection, one line per printing in the Riot API catalog (SPEC-001), fits easily: the community count is roughly 1,451 printings incl. promos ([[Card Data & Images]] #13, approximate, excludes RAD), i.e. well under 10,000 lines. |
| IMP-007 | MUST | A text-box line longer than **500 characters** is error `LINE_TOO_LONG` ("Line is longer than 500 characters.") and skipped. While the text box holds a `.csv` or `.xlsx` upload (IMP-062), every line has the **2,000-character** row limit instead ("Row is longer than 2,000 characters."). Length is measured on the line **as it is in the text box**, i.e. the converted line (`1 Name`, IMP-040), not on the original cells (they no longer exist after conversion). Raw excerpt max 120 chars (IMP-056). *(v0.8: was "cells joined with `, `".)* | design decision; H-046 (as built) |
| IMP-008 | MUST | Quantity per entry must be an integer **1..999**. `0` → warning `ZERO_QUANTITY` ("Quantity is 0, so this line is skipped."), entry skipped. Negative, non-integer, or >999 → error `BAD_QUANTITY` ("Quantity must be a whole number from 1 to 999."). **Non-integer** (v0.8) = digits with a decimal point or a decimal comma **followed by at least one digit**, in any IMP-020 form (Line grammar `DEC_LEAD`, `DEC_TRAIL`): `2.5 Gust`, `.5 Gust`, `2,5 Gust`, `2.5x Gust`, `x2.5 Gust`, `Gust x2.5`, and a CSV row `2,5;Gust` (→ `2,5, Gust`). A number followed by a `.` or `,` with **no digit after it** is not a quantity: `2. Gust` has no quantity in any IMP-020 form, so it is `MISSING_QUANTITY` (IMP-021). | design decision; H-046 (as built) |
| IMP-009 | SHOULD | After merging, a count above **9,999** for one `cardKey` is capped with error `TOTAL_TOO_LARGE`. | design decision |
| IMP-010 | MUST | Input is decoded as UTF-8; a leading BOM is stripped; `\r\n`, `\r` and `\n` are all line breaks. An uploaded `.txt` or `.csv` that is not valid UTF-8 **rejects the upload** (IMP-061): `INPUT_ENCODING` "`<file>` isn't UTF-8 text. Save it as UTF-8 or .xlsx and try again.", and the text box is unchanged. Pasted or typed text is already text, so it never has an encoding error. *(v0.8: was an input-level `INPUT_ENCODING` issue.)* | design decision; H-046 (as built) |

#### Format auto-detection *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-011 | MUST | Detect the source format automatically, checking in this order, first match wins: (1) **csv** if the uploaded file name ends `.csv` or `.xlsx` (by file type only; pasted text is never treated as CSV, v0.4); (2) **piltover-code** if the trimmed input is a single whitespace-free token of the base32 alphabet (`A–Z`, `2–7`, case-insensitive) that **decodes successfully** per IMP-031; (3) **tts** if every non-blank whitespace-separated token matches `^[A-Za-z]{2,4}-\d{1,3}[a-z]?-\d+$` (`SET-NUMBER-ART`, the last number is the art number of IMP-036a); (4) **riot-text** if any line is a section label (IMP-016); (5) otherwise **plain-text**. | [[Collection Import Formats]] |
| IMP-012 | MUST | Report the detected format and a confidence reason (e.g. "found section label `Main Deck` on line 3") in the result. | design decision |
| IMP-013 | MUST | The user can override the detected format and re-parse. | design decision |
| IMP-014 | SHOULD | If (2) or (3) partially match (e.g. most tokens look like TTS but some don't), fall back to plain-text and add info `FORMAT_AMBIGUOUS` naming the alternative. | design decision |
| IMP-015 | MAY | Support several deck codes, one per line, as one piltover-code import. | design decision |

#### Text formats (riot-text and plain-text) *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-016 | MUST | Recognize section labels `Legend`, `Champion`, `Main Deck`, `Battlefields`, `Rune Pool`, `Sideboard`: **case-insensitively**, **with or without spaces** between words (`Main Deck` = `MainDeck` = `main deck`; `Rune Pool` = `RunePool`), with optional leading Markdown heading marks (`#`…), optional **`*` bold marks** and an optional trailing colon. *(v0.14, H-166)* Before matching, every `*` character at the start or end of the label text and a trailing `:` (inside or outside the closing `*`) are removed, so `Legend:`, `**Legend:**` and `**Legend**:` are the same label; Riot's page shows the labels in bold, so a copy can arrive with the marks. A `*` inside the text is not removed. A line starting with a digit is never a label. A label line holds only the label (plus an entry after the colon, IMP-023); any other text makes it a non-label line. Labels work the same in one-cell CSV/Excel rows (IMP-040). | [[Collection Import Formats]] fact 1 and fact 9 (official; `*` and trailing `:`, H-166); RJ decision 2026-11-23 (H-043) (spacing) |
| IMP-017 | MUST | Also accept these aliases, under the same matching rules as IMP-016: `Legends` (→ Legend), `Champions` (→ Champion), `Main` (→ Main Deck), `Battlefield` (→ Battlefields), `Runes`, `Rune Deck` / `RuneDeck` (→ Rune Pool). Full mapping: SPEC-006 DECK-020. | [[Deck Construction Rules]] fact 1, our `01-Research/Decklists/` notes; RJ decision 2026-11-23 (H-043) (raised from SHOULD) |
| IMP-018 | MUST | Section labels are **not** entries. The parser records the section on each `ParsedLine` and does not merge across sections. Owned-card import then merges all sections into owned counts (IMP-047), so sectioned Riot-style deck text is accepted for owned cards; a card in both Main Deck and Sideboard (e.g. `1 An Offer You Can't Refuse` twice in the ASC Evansrhim list) sums to 2. SPEC-006 keeps the sections. | design decision; task brief |
| IMP-019 | MUST | **Entry grammar per line** (v0.5): a quantity in one of the forms of IMP-020, a **card part** (the card name, a printing code, or both, IMP-064/065), nothing else. The exact steps are the **Line grammar** below this table. Accept `3 Lightning Rush`, `3x Lightning Rush`, `3 x Lightning Rush`, `3X Lightning Rush`, `x3 Lightning Rush`, `Lightning Rush x3`, and the printing-code forms of IMP-065. The name is the rest of the card part, trimmed, commas included (`Kennen, Heart of the Tempest`). | [[Collection Import Formats]] (plain `<qty> <name>`); task brief (`<qty>x`); RJ decision 2026-11-23 (H-048) |
| IMP-020 | MUST | **Quantity forms** (v0.5, was SHOULD): leading `3`, `3x`, `3 x`, `3X`, `3 X` (digits, optional `x`/`X` right after them or after spaces, then at least one space); leading `x3` / `X3` (`x` directly before the digits, then at least one space); trailing `x3` / `X3` (at least one space, `x`, digits) at the **end of the line** or **directly before a trailing printing code** (`Lightning Rush x3 RAD 001 /167`). A trailing quantity is looked for only when there is no leading one. A line with **two** quantities (`3 Lightning Rush x3`, `x3 Lightning Rush x3`) is error `BAD_QUANTITY` ("Give the number of copies once per line.") and is left out. A trailing number without `x` (`Lightning Rush 3`) or with the `x` after it (`Lightning Rush 3x`) is not a quantity, so the line is `MISSING_QUANTITY` (IMP-021). The value rules of IMP-008 apply to every form (`Gust x0` → `ZERO_QUANTITY`, `Gust x1000` → `BAD_QUANTITY`). | RJ decision 2026-11-23 (H-048) |
| IMP-021 | MUST | **Every entry needs a quantity.** A line with a card part but no quantity in any IMP-020 form (e.g. `Lightning Rush`, `RAD 001/167`) is error `MISSING_QUANTITY` ("Start the line with a number, like "1 Card name" or "1x Card name".") and is left out; no quantity is assumed. A line that is only a quantity (`3`, `3x`, `3 x`, `x3`, `X3`) is error `MISSING_NAME` ("Add the card name after the number."). A quantity with only a printing code is **not** `MISSING_NAME`; it is a code-only entry (IMP-066). *(Replaces v0.3's "assume 1 with warning `QUANTITY_ASSUMED`".)* | RJ decision 2026-11-23 (H-043); RJ decision 2026-11-23 (H-048) (`Name` alone stays `MISSING_QUANTITY`) |
| IMP-022 | MUST | Ignore blank lines (Piltover Archive text separates groups by blank lines) and comment lines starting with `//` or `#` that are not section labels. | [[Collection Import Formats]] (Piltover Archive text) |
| IMP-023 | MUST | If a label line also carries an entry after the colon (`Champion: 1 Kennen, Storm of Shuriken`), the label takes effect and the remainder is parsed as an entry under it (IMP-019, IMP-021). | RJ decision 2026-11-23 (H-043) (raised from MAY); Play Network export layout is **unconfirmed** |
| IMP-024 | MUST | Lines that are neither label, comment, blank, nor a valid entry produce an error with the line number and raw text: `BAD_QUANTITY` if the line starts with a negative number (IMP-008), has a non-integer quantity (IMP-008, v0.8) or carries two quantities (IMP-020), `MISSING_NAME` if it is only a quantity, otherwise `MISSING_QUANTITY` (IMP-021). *(v0.4: replaces the catch-all `UNPARSEABLE_LINE`, which no longer occurs.)* | design decision; RJ decision 2026-11-23 (H-043) |

**Line grammar** (v0.5; IMP-019, IMP-020, IMP-064, IMP-065). Applied to a trimmed line that is not blank, a
comment or a label-only line (IMP-016, IMP-022); for a label line with an entry (IMP-023), to the part after
the colon. `\s` is whitespace; letters are ASCII and matched case-insensitively unless shown otherwise.
The patterns are the behavioural contract, not a required implementation.

```
QTY_LEAD   = ^(\d+)(?:\s*[xX])?\s+(.+)$          3 Name · 3x Name · 3 x Name · 3X Name
           | ^[xX](\d+)\s+(.+)$                  x3 Name · X3 Name
QTY_TRAIL  = \s+[xX](\d+)$                       Name x3
QTY_ONLY   = ^\d+(?:\s*[xX])?$ | ^[xX]\d+$       3 · 3x · 3 x · x3          → MISSING_NAME
NEG_LEAD   = ^-\d                                 -1 Gust                    → BAD_QUANTITY
DEC_LEAD   = ^(?:\d*[.,]\d+(?:\s*[xX])?|[xX]\d*[.,]\d+)(?=[\s,]|$)            (v0.8, IMP-008)
                                                  2.5 Gust · .5 Gust · 2,5 Gust · 2,5, Gust · x2.5 Gust → BAD_QUANTITY
DEC_TRAIL  = \s[xX]\d*[.,]\d+$                    Gust x2.5 (step 7)         → BAD_QUANTITY
QTY_SECOND = (?:^|\s)[xX](?:\d+|\d*[.,]\d+)$      x2 · Name x2 · Name x2.5 (step 5; v0.8)

SET        = [A-Za-z]{3}                          RAD · ogn
NUM        = [A-Za-z]+\d*\s*/\s*\d+[A-Za-z*]*     block      SP1/005 · sp1 / 5
           | \d+[A-Za-z*]*\s*/\s*\d+              fraction   001/167 · 001 /167 · 001 / 167 · 299/298
           | \d+[A-Za-z*]*                        plain      001 · 7 · 7a · 007a
CODE       = SET (?:-|\s+)? NUM                   RAD 001/167 · RAD-001/167 · RAD001 · OGN-007a · RAD-SP1/005
CODE_PART  = CODE | \(\s*CODE\s*\) | \[\s*CODE\s*\]
SEP        = \s+-\s+ | \s*,\s* | \s+              between name and code; next to a bracketed CODE_PART it may also be empty
```

Steps, in order:
1. If the line matches `QTY_ONLY` → `MISSING_NAME`; if it matches `NEG_LEAD` or `DEC_LEAD` (v0.8) → `BAD_QUANTITY`. Stop.
2. **Leading quantity.** If the line matches `QTY_LEAD` → quantity = the digits, *body* = the rest. Otherwise *body* = the whole line and there is no quantity yet.
3. **Trailing parts.** Repeat at most twice: if there is no quantity yet and *body* ends with `QTY_TRAIL`, take it as the quantity and cut it off; otherwise, if there is no code yet and *body* is `CODE_PART` or ends with `SEP` + `CODE_PART`, take that code and cut it (and the separator) off; otherwise stop. So `Name x3`, `Name x3 CODE`, `Name CODE x3` and `CODE x3` all work. *(v0.8)* When more than one `SEP` + `CODE_PART` split fits the end of *body*, the one that **starts earliest** wins, i.e. the **longest** code (and at that start, `SEP` is tried as ` - `, then `,`, then spaces): in the hypothetical `1 Lightning Rush ABC DEF1/005` both `ABC DEF1/005` (set `ABC`, block number `DEF1/005`) and `DEF1/005` (set `DEF`, fraction `1/005`) fit, and the code is `ABC DEF1/005` with name `Lightning Rush`.
4. **Leading code.** If there is no code yet and *body* is `CODE_PART` or starts with `CODE_PART` + `SEP`, take that code and cut it (and the separator) off.
5. **Two quantities.** If a quantity came from step 2 and the remaining *body* **ends with, or is,** `[xX]` + a number (`QTY_SECOND`; v0.8, was "ends with `QTY_TRAIL`", which needs whitespace before the `x`) → `BAD_QUANTITY` ("Give the number of copies once per line."). Stop. So `3x RAD 001 x2`, whose body is `x2` once the leading code is cut in step 4, is `BAD_QUANTITY`, not an entry named `x2`.
6. **Name** = the remaining *body*, trimmed; a dangling `-` or `,` left at the cut is removed with the whitespace around it. The name may be empty when there is a code.
7. **Outcome.** No quantity → `BAD_QUANTITY` if *body* ends with `DEC_TRAIL` (v0.8, `Gust x2.5`), otherwise `MISSING_QUANTITY`. Quantity, empty name, no code → `MISSING_NAME`. Quantity with a name and/or a code → one entry; the value rules of IMP-008 apply.

A code is only ever taken whole at the very start or the very end of the card part (after a trailing
quantity is removed), so it is always bounded by the line edge, a separator or a bracket. A second code-like
text in the same line stays part of the name.

#### Printing codes in text lines *(shared parsing, reused by SPEC-006; v0.5)*
RJ decision 2026-11-23 (H-048): a line may name the exact printing with its set code and collector number,
which is how an overnumbered or alt-art copy is told apart from the base printing. Collector-number forms
and normalization are SPEC-001's ([[Card Data Model]] CARD-036, CARD-037); public code examples such as
`OGN-007a` and `RAD-SP1/005` come from [[Collection Import Formats]] and [[Card Data & Images]] #10.

| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-064 | MUST | **Code shape.** A printing code is `CODE` in the Line grammar: a **set code of exactly 3 letters** (any case), an optional separator (`-` or spaces), and a collector number in one of the CARD-037 forms (a) block `SP1/005`, (b) fraction `001/167` (the total after `/` is read but ignored by the lookup), (c) plain `001`, `7`, `7a`, `007a` (trailing letters or `*` = variant hint). Spaces around `/` are allowed (`001 /167`, `001 / 167`). CARD-037 form (d) (any other text) is **not** a printing code in a text line. Examples: `RAD 001/167`, `RAD-001/167`, `rad 1 / 167`, `RAD001`, `OGN-007a`, `OGN 299/298`, `RAD-SP1/005`. | RJ decision 2026-11-23 (H-048); [[Card Data Model]] CARD-036, CARD-037; [[Collection Import Formats]] (`OGN-007a`) |
| IMP-065 | MUST | **Code position.** A line has at most **one** printing code, taken whole at the **start** or the **end** of the card part (Line grammar steps 3 and 4; the end is tried first), optionally in `()` or `[]`, separated from the name by spaces, ` - `, or a comma (none needed next to a bracket). Accepted examples: `3 Lightning Rush RAD 001/167`, `3x RAD-001/167 Lightning Rush`, `1 Kennen, Heart of the Tempest (OGN 299/298)`, `Lightning Rush x3 RAD 001 /167`, `2 OGN-007a Lightning Rush`, `1 Lightning Rush - RAD 001`, `2 [OGN-007a] Lightning Rush`, `Lightning Rush RAD 001/167 x3`. **Not codes (stay in the name):** text that does not match the whole `CODE` pattern at a line edge, e.g. `3 Lightning Rush 001/167` (no set code), `2 Seal of Discord RAD` (no number), `3 Lightning Rush 001` (`Rush` has 4 letters, so there is no 3-letter set code), `1 Lightning RushRAD 001` (no separator before `RAD`), `1 Lightning Rush -RAD 001` (`-` not surrounded by spaces). Such lines are resolved by name only (IMP-025…030). | RJ decision 2026-11-23 (H-048); design decision (false-positive guard) |
| IMP-066 | MUST | **Code-only lines.** A line with a quantity and a printing code but no name (`3 RAD 001/167`, `x2 OGN-007a`, `RAD 001 x3`) is a valid entry: it counts toward the dialog's valid lines and total copies (IMP-063) and is shown by its code (`RAD 001/167`) until resolved. Its name comes from `lookupPrinting` (IMP-067) once the card catalog is loaded. **Before the catalog is available**, parsing (the line rule, the problem list and the totals of IMP-062/063) still runs, because it never needs the catalog; no line, with or without a code, is resolved, and the code-only line has no name yet. Resolution, the preview and the commit (or the deck review and Save) wait until the catalog is loaded. | RJ decision 2026-11-23 (H-048); design decision |
| IMP-067 | MUST | **Resolution by code.** For an entry with a printing hint, first apply the **exact-name guard**: if `nameKey` of the card part as typed (name and code together, after removing any quantity) is an exact catalog `cardKey`, the line resolves by that name (`method: "exact"`), its `printing` becomes `null`, and no printing issue is raised. Otherwise call CARD-036 `lookupPrinting(setCode, n)`, where `n` is the collector number with the whitespace around `/` removed (`001 /167` → `001/167`). Results: **`found`** → `cardKey` from the lookup, `printingId` = the first returned printing (the suffix-matching printing if the code had a suffix, else the base printing), `method: "printing"`, `confidence: 1`; then IMP-068 compares the name. **`found` with `variant-not-found`** (suffix not in the catalog, e.g. `OGN-007z`) → the same, with the first (base) printing and warning `VARIANT_UNMAPPED` (as IMP-033). **`ambiguous`** → if the name is an exact match for one of the returned `cardKey`s, resolve to it with its printing; otherwise `needs-review` with warning `AMBIGUOUS_PRINTING` ("`<code>` matches more than one card. Pick one.") and those cards as suggestions, none pre-selected. **`not-found`** → IMP-069. | RJ decision 2026-11-23 (H-048); [[Card Data Model]] CARD-036, CARD-037 |
| IMP-068 | MUST | **Code and name disagree.** When the code resolves (`found`) and the line also has a name: (a) name's `nameKey` equals the code's `cardKey` → resolved, no issue; (b) the name is an **exact** match for a **different** card → `needs-review`, warning `PRINTING_NAME_MISMATCH` ("`<code>` is <code's card>, but the line says <name's card>. Pick one."), suggestions = the code's card and the name's card (similarity 1, `confidence: "high"`), **none pre-selected**; nothing is counted until the user picks; (c) the name matches **no** card exactly (typo, short form such as `Kennen`) → resolved to the **code's** card with warning `PRINTING_NAME_MISMATCH` ("`<code>` is <code's card>; "<name>" isn't a card name, so the code was used."). *Why:* two exact identifications that disagree mean one of them is wrong, and IMP-027 forbids guessing, so the user decides; a name that identifies nothing gives no competing card, and the code is an exact catalog identifier (not a fuzzy guess), so it is used and the warning keeps it visible. | RJ decision 2026-11-23 (H-048); design decision (spec-writer; RJ may change) |
| IMP-069 | MUST | **Code not found.** `lookupPrinting` returns `not-found` (unknown set code or number, e.g. `RAD 999`): (a) the line has a name → the name is resolved as usual (IMP-025…030) and the line gets warning `UNKNOWN_PRINTING` ("`<code>` isn't in the card data, so the card name was used."); no `printingId` is kept, so the copies are not per printing; (b) code-only line → error `UNKNOWN_PRINTING` ("`<code>` isn't in the card data. Add the card name or fix the code."), left out; the user may edit the line. | RJ decision 2026-11-23 (H-048); design decision |
| IMP-070 | MUST | **Variant comes from the catalog.** Whether the printing is base, alt-art, overnumbered or another kind is read only from the catalog printing the lookup returns (`variant.kind`, CARD-040/043), never from the code text: a fraction total (`299/298`) or a suffix letter does not set the kind. The suffix-letter → `variant.kind` mapping stays **BLOCKED** with CARD-040, so the kind is often `unknown` meanwhile; the `printingId` is still exact. Ownership is unaffected (IMP-048). | [[Card Data Model]] CARD-037, CARD-040, CARD-043 |

#### Name resolution and fuzzy matching *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-025 | MUST | Resolve each name with the SPEC-001 name lookup (CARD-033, CARD-034), in this order. **(1)** Compute `nameKey` (CARD-030) and look it up in the catalog's `cardKey`s: an exact match resolves with `confidence: 1` and `method: "exact"`, with no user action needed (the full name, article included, always lands here first). **(2)** No exact match: apply the **optional leading article** rule (CARD-034, RJ decision 2026-11-25, H-165): a leading `a` or `the` on the input or on the catalog name is ignored, so `Dreaming Tree` resolves to `The Dreaming Tree` and `The Dreaming Tree` to a card the API names `Dreaming Tree`. One card found → resolved with `confidence: 1`, `method: "article"`, with no user action needed and no warning. CARD-034 `ambiguous` (several cards share the loose key, e.g. `A Pit` / `The Pit` for `Pit`) → `needs-review`, warning `AMBIGUOUS_NAME` ("`<input>` matches more than one card. Pick one."), those cards as suggestions (similarity 1, `high`), none pre-selected. **(3)** Anything else (including spacing/hyphen differences such as `Star Crossed` vs `Star-Crossed`, whose keys differ under CARD-030, and partial names) is not a name match and goes to fuzzy suggestions (IMP-026). The resolved card's `displayName` is always the canonical catalog name (CARD-031). | [[Collection Import Formats]] ("matching by name covers everything"); [[Card Data Model]] CARD-030, CARD-033, CARD-034; RJ decision 2026-11-25 (H-165) |
| IMP-026 | MUST | When there is no exact match, compute fuzzy candidates and classify each by similarity: **high ≥ 0.85**, **low 0.60–0.85**, below 0.60 discarded. Return at most **3** suggestions, sorted by similarity desc, then name asc. | design decision |
| IMP-027 | MUST | A fuzzy match is **never** applied automatically. Every non-exact entry stays `status: "needs-review"` until the user picks a suggestion, types a different name, or drops the entry. Uncommitted needs-review entries are not imported. | task brief; design decision |
| IMP-028 | SHOULD | Pre-select the top suggestion only when it is high-confidence **and** leads the next candidate by ≥ 0.05. The UI MAY offer "Accept all pre-selected" as one explicit user action. Low-confidence suggestions are never pre-selected. | design decision |
| IMP-029 | MUST | A name that is a **prefix of several** catalog names up to the comma subtitle (e.g. `Kennen` matching `Kennen, Heart of the Tempest` and `Kennen, Storm of Shuriken`) is `AMBIGUOUS_NAME`: list all of them (up to 3, then "+N more") as suggestions with none pre-selected. The check uses the **canonical names** from the catalog: split each canonical name at its first `,`, apply `nameKey` to the part before it, and compare with the input's `nameKey`. (It cannot be done on `cardKey`, because CARD-030 removes commas.) Different subtitles are different cards ([[Deck Construction Rules]] fact 5). | [[Deck Construction Rules]] fact 5; [[Card Data Model]] CARD-030 |
| IMP-030 | MUST | Entries with no candidate ≥ 0.60 get error `UNKNOWN_CARD` with no suggestions; the user may type a replacement name or drop it. | design decision |
| IMP-059 | MUST | No curated alias table. A name resolves only by the SPEC-001 name lookup against the Riot-sourced catalog (IMP-025: exact `nameKey`, then the generic optional leading `a` / `the` rule, CARD-034) or by a fuzzy suggestion the user explicitly confirms (IMP-027). The article rule is generic (no per-card entries), so `Dreaming Tree` and `The Dreaming Tree` both resolve without an alias. Other spelling differences are not resolved automatically. | [[ADR-0005 MVP Product Defaults]] #4; [[Card Data Model]] CARD-034; RJ decision 2026-11-25 (H-165) |

#### SAMPLE printings *(shared parsing, reused by SPEC-006; v0.15, H-197)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-077 | MUST | **SAMPLE printings are left out entirely.** (a) **Rule (RJ).** A printing that the catalog marks SAMPLE (SPEC-001 CARD-044) is not part of the card data this import reads: it is never matched, never imported, never counted in `quantity` or `byPrinting`, never shown in the preview or the problem list as a card, and never written by the CSV export (IMP-055). (b) **No marker, no effect.** SPEC-001 defines no marker yet (CARD-044, **BLOCKED: needs research**, H-020), so until it does **no printing is treated as SAMPLE**, and the importer never infers it from a set code, a collector number or a name; the rule is testable only on test data that carries a marker. (c) **A code that names a SAMPLE printing (proposal, not RJ's).** `lookupPrinting` (CARD-036) never returns a SAMPLE printing, so such a code is `not-found` and IMP-069 applies unchanged: with a name the line resolves by name and carries the existing `UNKNOWN_PRINTING` warning; a code-only line is the existing `UNKNOWN_PRINTING` error. **No SAMPLE-specific message, issue code or wording is added.** (d) **A card that has only SAMPLE printings (proposal, not RJ's).** It is not in the catalog the importer reads, so its name is `UNKNOWN_CARD` (IMP-030) like any name not in the card data; a card with at least one other printing is unaffected, and a plain name never selects a printing, so it still counts toward `quantity` (IMP-048). (e) **Not an alias and not a legality rule.** This spec decides no legality: SPEC-002 LEGAL-C10 does that. | (a) RJ 2026-11-25 (H-193 answers, applied by H-197); [[Deck Legality]] LEGAL-C10; [[Card Data Model]] CARD-044; [[Deck Construction Rules]] #17. (b) CARD-029, CARD-044. (c), (d): spec-writer's reading of "not matched", not an RJ decision |

#### Piltover Archive deck codes *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-031 | MUST | Decode per the open Apache-2.0 `@piltoverarchive/riftbound-deck-codes` format (**community** source): base32 string; header nibble = format/version; VarInt arrays grouped by copy count; card code = 3-char set + number + optional variant letter (the number may carry the `SP` special prefix, IMP-033). *(v0.14, H-166)* Accept the format versions the library lists as of npm 1.5.0 (2026-09-19): V1; V2 (2025-11-20) adds a sideboard; V3 (2026-01-10) chosen champion; V4 (2026-03-04) runes; V5 (2026-07-15) sparse copy counts and `SP` cards; V6 (2026-09-19) additional legends. The byte layout of each version is the library's, which the builder follows; our research records only what each version adds. The decoder tags a V1/V2 card with section `main` or `sideboard`; which section tag a V3…V6 group gets is **BLOCKED: needs research** (the owned-card import merges every group, IMP-047, so only decks care, DECK-039). A version above V6 → `DECK_CODE_INVALID` (IMP-034). | [[Collection Import Formats]] fact 3 & table; fact 7 (community, npm 1.5.0, as of 2026-11-24) |
| IMP-032 | MUST | Map set indexes with the table of npm 1.5.0 (fact 7, **community**, 2026-11-24): `0 = OGN`, `1 = OGS`, `2 = ARC` (Arcane Box Set), `3 = SFD`, `4 = UNL`, `5 = VEN`, `6 = RAD`. Any other index → error `UNKNOWN_SET_INDEX` for that card group (other groups still import). The v1.0.0 table stopped at SFD (3). The resulting set code is then looked up like any other (CARD-036); whether the catalog has a set `ARC` is SPEC-001 CARD-023a (`unverified`), and a set code the catalog lacks gives `UNKNOWN_PRINTING` (error for a deck-code token, IMP-069 (b)). | [[Collection Import Formats]] table; fact 7 |
| IMP-033 | MUST | Resolve decoded cards by printing code via CARD-036, then count them toward the printing's `cardKey`. *(v0.14, H-166)* **Variant letter** (fact 7, **community**): none = base (no suffix hint); `a` = alternate art A (suffix hint `A`); `b` = alternate art B (`B`); `s` **or** `*` = signed (hint `S`, or `*` when no printing has `S`, and the other way round, because the library accepts both spellings; CARD-037 keeps `*` in the suffix). **Special prefix:** a number written `SP<n>` (e.g. `VEN-SP1a`) is looked up as the number text `SP<n>` plus the letter as a suffix hint. The letter only **narrows** the printings of that number (CARD-036); it never changes the `cardKey`, and the printing's `variant.kind` still comes only from the catalog (IMP-070), not from the letter's name. A letter that no printing has resolves by set + number without variant and adds warning `VARIANT_UNMAPPED` (CARD-036 `variant-not-found`). **BLOCKED: needs research (H-020):** whether Riot's printings use these suffix letters and whether their collector numbers match an `SP<n>` code (CARD-037 reads `SP1` alone as form (d), `SP1/005` as a block, so a mismatch yields `not-found`, error `UNKNOWN_PRINTING`, IMP-037). | [[Collection Import Formats]] fact 7; [[Card Data Model]] CARD-036, CARD-037 |
| IMP-034 | MUST | A code that fails to decode (bad alphabet, truncated VarInt, unknown version) → input-level error `DECK_CODE_INVALID`; since detection requires a successful decode, this only occurs when the user forces the format. | design decision |
| IMP-035 | MUST | Error locations for deck codes are reported as `line` = the code's line and `token` = the zero-based card group index. | design decision |

#### Tabletop Simulator tokens *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-036 | MUST | Split input on any whitespace; each `SET-NUMBER-ART` token represents **one physical copy** (e.g. `OGN-245-1 OGN-245-1 OGN-245-1` = 3 copies of OGN-245). *(v0.14, H-166)* The trailing number is an **art number, not a copy count**: it never multiplies the token and is never added to the quantity. Reading source: one community tool's code (the silhouette-card-maker Riftbound plugin, pattern `SET-<digits + optional letter>-<art number>`, one token per physical copy, names ignored, quantity 1 per token); the Riftseer TTS mod page documents no importer syntax, so this stays **community, one tool's reading**. | [[Collection Import Formats]] table (TTS); fact 8 (community, code; as of 2026-11-24) |
| IMP-036a | MUST | **Art number to printing (v0.14, H-166).** For a token whose number has **no letter**: art `1` = the base printing (the number as written, no suffix hint); art `2` = alternate art, the number with the suffix hint `a` (documented example from the same tool: `ABC-012-2` becomes `ABC-012a`; the lookup then narrows by `A`, CARD-036). For art `3` or more, and for any art above `1` on a number that **already has a letter** (`OGN-007a-2`), research gives no mapping: the token resolves by the number as written (letter kept) and carries warning `VARIANT_UNMAPPED` (Open question). The art number only picks among the printings of one card; it never changes the `cardKey`, and `variant.kind` still comes from the catalog (IMP-070). Where the catalog has no printing with the suffix, CARD-036 `variant-not-found` gives the base printing and `VARIANT_UNMAPPED` (IMP-067). **BLOCKED: needs research (H-020):** whether Riot's printings carry the letter `a` for alternate art. | [[Collection Import Formats]] fact 8 (community, code); [[Card Data Model]] CARD-036 |
| IMP-037 | MUST | Normalize the set code and collector number as CARD-036 defines (e.g. `ogn` → `OGN`, [[Sets]]: "Ven" vs VEN), apply IMP-036a, then resolve via CARD-036. Unknown set/number → `UNKNOWN_PRINTING` with location `line` + `token` index. | [[Sets]]; [[Card Data Model]] CARD-036 |
| IMP-038 | SHOULD | Identical tokens (same set, same number as typed, same art number, case ignored) are merged before resolution so each distinct printing is reported once with its total. Tokens of one number with different art numbers can be different printings (IMP-036a) and are summed per `cardKey` after resolution (IMP-047). | design decision |
| IMP-039 | MUST | A token that doesn't match the TTS pattern (when the user forced `tts`) → `UNPARSEABLE_TOKEN`. The art number must be digits (`OGN-265-x` is unparseable); a token with no art number (`OGN-265`) does not match `SET-NUMBER-ART`, so it is `UNPARSEABLE_TOKEN` too. | design decision; [[Collection Import Formats]] fact 8 |

#### CSV and Excel *(shared parsing, reused by SPEC-006 since v0.4)*
CSV and Excel rows are **positional**, not mapped by column header (RJ decision 2026-11-23 (H-043)). Each row is turned into one text line, written into the text box (IMP-062), and parsed by the text grammar like any pasted line.

| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-040 | MUST | **Row rule.** Cell values are trimmed; trailing empty cells are dropped; an all-empty row is ignored. A row is either (a) **one cell** holding a whole line (`3x Lightning Rush`, or a section label such as `Main Deck:`, IMP-016), kept as that line; or (b) a **quantity cell** (Definitions) **followed by the name**: the row becomes `<quantity cell> <name>`, where the name is every later non-empty cell joined with `, ` (unquoted names with commas are split by the delimiter, so `1,Kennen,Heart of the Tempest` becomes `1 Kennen, Heart of the Tempest`); or (c) *(v0.8)* a **section label cell** (a cell that is a label line on its own, IMP-016, e.g. `Champion`, `Main Deck:`, `## Runes`) **followed by** more non-empty cells: the row becomes `<label>: <rest>`, where the label loses a trailing colon and `<rest>` is the later non-empty cells converted by this same rule (rule (b) when they start with a quantity cell, else joined with `, `), so the line is a label with an entry (IMP-023): `Champion,1 Kennen` → `Champion: 1 Kennen`, `Main Deck,3,Gust` → `Main Deck: 3 Gust`, `Main Deck:,3,Gust` → `Main Deck: 3 Gust`. Rule (b) is checked before rule (c). Any other row (e.g. name first, quantity last) is kept as its non-empty cells joined with `, ` and so fails the line rule (`MISSING_QUANTITY`, IMP-021). Excel cells are read as text (numbers as digits; dates as `YYYY-MM-DD`). **v0.5:** the converted line is parsed by the full Line grammar, so the quantity forms of IMP-020 and the printing codes of IMP-064…069 work in rows too: a one-cell row `Lightning Rush x3` or `3 RAD 001/167 Lightning Rush`, or a row `3,Lightning Rush,RAD 001/167` (→ `3 Lightning Rush, RAD 001/167`, code after a comma separator, IMP-065). A set code and a collector number in **two separate cells** (`3,Lightning Rush,RAD,001/167` → `3 Lightning Rush, RAD, 001/167`) are not a code, because a comma is not a separator inside `CODE`; that line is resolved by its whole name (see IMP-044). | RJ decision 2026-11-23 (H-043); RJ decision 2026-11-23 (H-048) (same rules for rows); H-053 (rule (c), as built) |
| IMP-041 | MUST | **Column titles.** Only the **first non-empty row** can be a title row. It is skipped when at least one cell (trimmed, case-insensitive) is exactly one of `qty`, `quantity`, `count`, `amount`, `copies`, `#`, `x`, `name`, `card`, `card name`, `cardname`, **and** no cell starts with a digit. Otherwise it is parsed as a data row. *(v0.4: replaces the v0.3 name-column mapping and `CSV_NO_NAME_COLUMN`; there is no column picker.)* | RJ decision 2026-11-23 (H-043) |
| IMP-042 | MUST | Parse RFC 4180 CSV: double-quoted fields may contain the delimiter and line breaks (e.g. `"Kennen, Storm of Shuriken"`), `""` escapes a quote. **Delimiter** (v0.8, RJ's interim rule): look at the **first non-empty line** and count only characters **outside double quotes** (a quoted field's line breaks are inside the quotes, so they don't end the line). If `;` or a tab occurs there, it beats `,`, because card names contain commas (`2;Kennen, Heart of the Tempest` is `;`-delimited); between `;` and tab the more frequent wins (tie → `;`); otherwise the delimiter is `,`. *(Replaces v0.6's "whichever of `,` `;` `\t` occurs most on the first line, ties → comma", which counted the commas inside names.)* A leading BOM is stripped (IMP-010). | design decision; names contain commas ([[Collection Import Formats]] table); RJ decision 2026-11-23 (H-053) (interim delimiter rule) |
| IMP-043 | MUST | **Every row needs a quantity** (IMP-021): a row with only a name, or a name with an empty quantity cell, is `MISSING_QUANTITY` and left out. Quantity values follow IMP-008 (`0` → `ZERO_QUANTITY` warning; negative, non-integer or > 999 → `BAD_QUANTITY`). *(Replaces v0.3's "missing quantity column → 1" and `QUANTITY_ASSUMED`.)* | RJ decision 2026-11-23 (H-043) |
| IMP-044 | — | **Withdrawn in v0.4.** v0.3 preferred set + collector-number columns over the name (`NAME_PRINTING_MISMATCH`). Under the positional row rule (IMP-040) extra cells after the name are part of the name, so set/number columns are not read. Printing-level CSV import may return as a new requirement once RJ wants it. *(v0.5: a printing code written in one cell, in the name cell or a cell after it, is read by IMP-064…069; separate set and number columns still are not.)* | RJ decision 2026-11-23 (H-043) |
| IMP-045 | MUST | Error locations for CSV/Excel uploads are the **line number in the text box** after conversion (IMP-062: a skipped title row and empty rows produce no line), with the converted line as raw text. A quantity cell with an empty name is `MISSING_NAME` (IMP-021). *(v0.4: no `column` location; `EMPTY_NAME` replaced by `MISSING_NAME`.)* | design decision; RJ decision 2026-11-23 (H-043) |
| IMP-046 | SHOULD | Recognize TCGplayer, Moxfield, Deckbox, and Dreamborn CSV exports by their headers. **BLOCKED: needs research** — exact column sets not verified; needs real sample files. Until then such files import only if their rows fit the row rule (IMP-040: quantity first, then name). A `tcgplayer_id` column MAY be used once SPEC-001 carries TCGplayer IDs from an allowed source. | [[Collection Import Formats]] fact 5 & 6 |

#### Error reporting *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-056 | MUST | Each issue carries: severity (`error` / `warning` / `info`), a stable `code`, a human message, and a location (`line`, plus `token` for TTS/deck code), and the raw text excerpt (max 120 chars). Line numbers are 1-based physical lines of the text being parsed: the pasted text, or the text box content an upload was converted into (IMP-045, IMP-062). Input-level issues have no line. | task brief |
| IMP-057 | MUST | The result includes a summary: lines read, entries parsed, resolved exact, needs review, errors, distinct names, total copies. *(v0.8)* **Parsing alone** (no catalog, IMP-066) gives `format`, `formatReason`, `upload`, the issues of the line rule and the catalog-free summary: `linesRead` (lines of the parsed text; a final empty line after a trailing line break is not counted), `entriesParsed`, `errors` (issues with severity `error`, input-level ones included), `distinctNames` (distinct `nameKey`s of the entries; a code-only entry counts by its set code + collector number without whitespace, upper-cased) and `totalCopies`. `resolvedExact`, `needsReview` and `catalogVersion` exist only once the lines are resolved against the catalog (IMP-025…030, IMP-067…069; H-057). | design decision; H-046 (catalog-free part as built) |

### Part B: Collection-specific (Owned Cards Import only)
These requirements apply only to the Owned Cards Import. SPEC-006 defines its own behaviour for these concerns.

#### Scope and consumers
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-004 | MUST | Owned-card import MUST NOT check deck legality or bans. A banned card (e.g. `Nocturne, Horrifying`, banned as of 2026-11-23) is imported like any other owned card. Legality (format `standard`) is SPEC-002's concern. | [[Deck Construction Rules]], [[Ban List]] |
| IMP-058 | MUST | The committed collection is the single source of ownership for [[My Collection]] (SPEC-007) and for the ownership view in [[Your Decks Ownership View]] (SPEC-005). Total owned is looked up by `cardKey` (`cards[cardKey].quantity`, 0 if absent). **Decks does not read this total directly:** it uses SPEC-007's `deckOwnership(input, cardKey)` (COLL-081), which leaves out printings carrying an "exclude from decks" tag (ADR-0006, H-036). | [[ADR-0006 Two Imports - Collection and Decks]]; [[ADR-0005 MVP Product Defaults]] #2; [[Card Data Model]] CARD-013 |
| IMP-060 | MUST | **Entry point and label (v0.12, H-174).** This flow is labelled **"Add to your collection"** everywhere in the app (the dialog title, the button, Home's button; the internal name stays Owned Cards Import). It opens **in a dialog** (the shared paste-or-upload dialog, IMP-062) from exactly these places, all on or leading to the Collection page: (a) the floating button at the bottom right of `/collection` ([[My Collection]] COLL-094); (b) the button of Collection's empty state (COLL-094); (c) the one-shot address `/collection?add=1`, which Home's "Add to your collection" button and the sign-in return path use ([[Accounts and Sync]] SYNC-159). There is **no import page**: `/import` no longer exists and goes to Home like any unknown path (SYNC-159). **Deck Import** is a different flow, **"Import deck"**, opened from the Decks page (SPEC-006 DECK-001); it never writes to the collection. | [[ADR-0006 Two Imports - Collection and Decks]] "Header and import entry points" (RJ 2026-11-24; H-178); [[Brief H-175]] §6, §9; earlier source: [[Design Direction]] RJ feedback 2026-11-23 |
| IMP-071 | MUST | **Runes are imported like any card** (v0.9). A line or row naming a rune card (`category: 'rune'`, e.g. `Chaos Rune`), under any section label (`Rune Pool:`, `Runes`, `Rune Deck`, IMP-017) or none, is parsed, resolved (IMP-025…030, IMP-064…070), merged by `cardKey` (IMP-047, IMP-048) and committed (IMP-049) exactly like any other card. The parser and the commit have no rune-specific skip, filter, warning or issue code, and the preview counts rune copies in its totals (IMP-057). The CSV export (IMP-055) writes rune rows by the same rules as any card. | RJ decision 2026-11-24 ("Allow users to import runes as well and treat them like any other card."); [[Physical Copies Across Decks]] facts 10, 11 |

#### Merging, variants, commit
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-047 | MUST | All resolved entries are merged by **`cardKey`**: owned count = sum of quantities across lines, sections, tokens, and rows. Each merged card lists the source line numbers that contributed. | task brief; [[Deck Construction Rules]] fact 5; [[Card Data Model]] CARD-013 |
| IMP-048 | MUST | Variants and printings (alt-art, Showcase, signature, foil, and overnumbered, i.e. `variant.kind === 'overnumbered'`) that share a name count toward the **same `cardKey`**. When the source identified the printing (deck code, TTS, or since v0.5 a text, CSV or Excel line whose printing code resolved, IMP-067/068), the per-printing count (by `printingId`) is also kept; it is for display in [[My Collection]] only and never affects ownership. A line resolved **by name** (no code, the exact-name guard, a code not found per IMP-069, or the user picking the name's card in IMP-068 (b)) has no `printingId`; its copies are unassigned (SPEC-007 COLL-002). A user pick of the code's card in IMP-068 (b), or of a card in an `AMBIGUOUS_PRINTING` review, keeps that printing. Owned counts are still per **`cardKey`** (IMP-047). **Confirmed** by RJ ([[ADR-0005 MVP Product Defaults]] #2). | [[Deck Construction Rules]] fact 5; [[ADR-0005 MVP Product Defaults]]; [[Card Data Model]] CARD-013, CARD-043; RJ decision 2026-11-23 (H-048) |
| IMP-049 | MUST | Commit requires an explicit choice of mode: **Add** (owned += imported, per `cardKey` and per printing) or **Replace** (the collection becomes exactly the imported set). Default selection is **Add**. | design decision (see Rationale) |
| IMP-050 | MUST | **Replace** shows a confirmation stating how many cards and names will be removed or changed before it executes. Cancel writes nothing. *(v0.8: the locked-deck warning moved to IMP-050a.)* | design decision |
| IMP-050a | SHOULD | **Locked-deck warning before the change** (v0.8; SPEC-008 SHARE-034, SPEC-007 COLL-088). When a commit or an Undo would leave a **locked deck** holding fewer copies, `lockedShortfalls(before, after)` is computed **before anything is written**, and the change's confirmation adds SPEC-008's warning per affected deck: "'`<deck name>`' (locked) will be `<n>` cards short. It stays locked." ("1 card short" for one; a short deck stays locked, SPEC-008 SHARE-033). (a) **Replace**: inside the IMP-050 confirmation; `after` = the collection as the parsed import would make it. (b) **Undo** of the last commit (IMP-052): `after` = the snapshot it would restore; the warning goes inside the Undo confirmation that SPEC-007 COLL-058 gives when manual edits followed the import; an Undo with no confirmation of its own asks for one **only** when the list is not empty. After a confirmed Undo, a notice per affected deck follows: "'`<deck name>`' (locked) is now `<n>` cards short." (Undo only; RJ decision 2026-11-23). Cancel changes nothing and shows no notice. **Add** never lowers a hold and has no such warning. | [[Shared Cards and Lock-in]] SHARE-033, SHARE-034; [[My Collection]] COLL-058, COLL-088; RJ decision 2026-11-23 (H-049 follow-up: Undo warns before and notifies after) |
| IMP-051 | SHOULD | The preview shows the resulting diff per name (before → after) for the selected mode. | design decision |
| IMP-052 | SHOULD | Keep the previous collection snapshot so the last commit can be undone once. Where the Undo is offered, for how long and what it does: IMP-072…075 (v0.10). | design decision |
| IMP-072 | MUST | **Where a commit lands** (v0.10; v0.12 adjusted for the dialog's new home). When an Owned Cards Import commit (Add, or Replace after its IMP-050 confirmation) has been **written**, the import dialog closes and the user is on **`/collection`** with **no query parameters**: the dialog is always opened on Collection (IMP-060), so the page does not navigate and the grid updates in place (SPEC-007 COLL-073); if the dialog was opened by `/collection?add=1` the parameter was already removed when it opened (SYNC-159 c). Focus returns to the button that opened the dialog (the floating button, or the empty state's button, which has just been replaced by the grid: then to the floating button). If the write fails (SPEC-007 COLL-072), the dialog stays open with the error, the app does not navigate, and no notice or Undo is shown. Cancelling the Replace confirmation stays in the dialog and writes nothing. Deck Import (SPEC-006) never writes to the collection and never lands here. | RJ approval 2026-11-24 of the [[Collection]] brief rev 3 ("import lands on Collection with Undo", H-086, H-087) |
| IMP-073 | MUST | **Commit notice** (v0.10). On landing, a snack bar shows the result and an **Undo** action. Counts use the same formatting as the Collection count line (SPEC-007 COLL-010: thousands separators, `1 copy` / `N copies`, `1 card` / `N cards`). **Add:** `Added <copies> of <cards>.` where `<copies>` is the number of copies the commit added (the sum of the merged quantities written, IMP-047) and `<cards>` the number of distinct `cardKey`s in the import; e.g. `Added 42 copies of 30 cards.`, `Added 1 copy of 1 card.`, `Added 1,204 copies of 412 cards.`. **Replace:** `Collection replaced: <cards>.` where `<cards>` is the number of distinct `cardKey`s in the new collection; e.g. `Collection replaced: 412 cards.`, `Collection replaced: 1 card.`. Lines left out for errors are not counted (only what was written). The notice is a polite status announcement (not an alert), UI strings use straight apostrophes and American spelling. | RJ approval 2026-11-24 (brief rev 3 S12); singular forms follow the H-096 pattern |
| IMP-074 | MUST | **Lifetime of the notice and its Undo** (v0.10). The notice belongs to the app, not to the Collection screen: it stays visible across route changes, and Undo works from any screen while it is shown. It stays for **10 seconds** (see the "Needs RJ" open question on the Undo window: the 6 s used for plain notices is short for an action), then goes. It is replaced early by any later app notice (a newer commit, the CSV export notice, SPEC-007) and goes when Undo is used. Reloading or closing the tab discards it. When it has gone, **no other Undo entry point exists in this version** (the snapshot of IMP-052 is kept until the next commit, but nothing offers it). | design decision (spec-writer default; duration is an open question) |
| IMP-075 | MUST | **What Undo does** (v0.10). Undo restores the snapshot that commit stored (IMP-052): quantities and `byPrinting` only, tags and locks untouched (SPEC-007 COLL-058), and syncs like any write (SPEC-010). (a) **Confirmation only where required:** if the stored quantities changed after the commit (a manual edit, another tab, or a sync from another device: the stored record's `updatedAt` is later than the commit's), the COLL-058 confirmation warns that those changes will be lost; if the restore would leave a locked deck short, the IMP-050a warning goes inside the confirmation, which is then shown only when the list is not empty. With neither, Undo runs at once. (b) **Result:** a notice `Import undone.` (no action), followed after a confirmed Undo by the IMP-050a per-deck notices, joined in the same notice with a space. The snapshot is then spent: Undo works once (IMP-052) and is not offered again. (c) **Cancel** on a confirmation changes nothing, writes nothing, and the commit notice (IMP-073) is shown again with a fresh 10 seconds (SHOULD). (d) If no snapshot exists any more (cleared by a sign-out or first sign-in, SYNC-090 / SYNC-091, or replaced by a later commit in another tab), nothing is written and the notice `Nothing to undo.` shows. The user stays on the screen they are on; Collection refreshes in place (SPEC-007 COLL-073). | [[My Collection]] COLL-058, COLL-088; IMP-050a; design decision |

#### Storage (MVP)
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-053 | MUST | **Account-only storage (v0.11).** The collection belongs to the signed-in account: its record of truth is the account's Firestore document `state/collection` ([[Accounts and Sync]] SPEC-010 SYNC-013). The app reads and writes it through a `CollectionStore` interface backed by the **browser cache** of the account (SPEC-010 SYNC-140…SYNC-145): the cache is the working copy the screen reads and an import writes first, and sync pushes the change to the account (SYNC-043); sync never changes import behaviour. There is no browser-only collection and no import without an account. The cache is cleared on sign-out, on account deletion and when a different account signs in (SYNC-142), and is never uploaded into an account (SYNC-143). ([[ADR-0005 MVP Product Defaults]] #1, browser-only storage, is superseded; [[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2).) | [[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2); [[ADR-0001 Tech Stack]] (storage behind interfaces); [[Accounts and Sync]] |
| IMP-076 | MUST | **Sign-in gate (SYNC-009, always on).** Owned Cards Import needs a signed-in account. While the gate is not open (signed out, session lost, or first sync running) the Collection page shows the SPEC-010 sign-in panel instead of the list, so the "Add to your collection" button and dialog (IMP-060) do not exist, and a `?add=1` address (SYNC-159) opens no dialog until the gate opens; it reads nothing from the browser cache, and nothing can be committed. There is no mode in which import works without an account. The IMP-052 Undo snapshot is cleared on sign-out and on first sign-in (SYNC-090, SYNC-091). The panel text and gate rules are SPEC-010's, not repeated here. | [[Accounts and Sync]] SYNC-009, SYNC-090; RJ 2026-11-24 (decision 13, amendment 2) |
| IMP-054 | MUST | The stored record carries `schemaVersion`, `updatedAt`, and the `catalogVersion` (SPEC-001) it was resolved against, so a later catalog/name-key change can trigger re-resolution. | design decision; [[Card Data Model]] |
| IMP-055 | SHOULD | **Collection CSV export** (v0.7). The user can export the stored collection as a CSV file that round-trips through this importer. The file has exactly **two columns**, title row `Quantity,Card Name`, and no other columns: tags, "exclude from decks" flags and other SPEC-007 data are **not** in the file (any cell after the name would be joined into the name, IMP-040); they are expected to survive through the planned sign-in sync ([[ADR-0007 Firebase Accounts and Firestore]]). Each printing with a count ≥ 1 is written as one row `<qty>,<name> <SET> <NUM>` (its printing code inside the name cell), the card's other copies as one name-only row `<qty>,<name>`; the exact rows, code form, self-check and fallbacks are the **Collection CSV export** rules below this table. When implemented, those rules and the round-trip guarantee there are MUST. *(v0.4–v0.6: name-only rows, `byPrinting` not round-tripped.)* | design decision (a copy the user keeps themselves); RJ decision 2026-11-23 (H-043); RJ decision 2026-11-23 (H-045) |

**Collection CSV export** (v0.7; IMP-055; RJ decision 2026-11-23 (H-045)). Behavioural contract for the
exporter; it writes only what the importer (Part A, IMP-040…042, Line grammar, IMP-064…069) reads back
unchanged.

1. **File.** UTF-8 text (a leading BOM MAY be written; IMP-010 strips it), comma delimiter, `\r\n` line
   breaks, RFC 4180 quoting: a cell is wrapped in `"` when it contains `,`, `"`, CR or LF, and a `"` inside
   it is doubled (IMP-042). Only the name cell can need quoting.
2. **Title row** `Quantity,Card Name` (skipped on import, IMP-041). Every later row has exactly two cells:
   the quantity cell (digits only, no `x`) and the name cell.
3. **Name** = the card's canonical name, verbatim (SPEC-001 CARD-031: exports use the canonical name).
4. **Canonical printing code** = `<SET> <NUM>`: `SET` = `Printing.setCode` as stored, upper case
   (SPEC-001 CARD-011); one ASCII space; `NUM` = `Printing.collectorNumber` verbatim with surrounding
   whitespace, any whitespace inside it and a leading `#` removed (e.g. `001`, `007a`, `299`, `SP1/005`).
   No `-`, no brackets, no `/total` added. A printing has a code only when its `collector.form` is
   `block`, `plain` or `fraction` (CARD-037 forms a–c), its `setCode` is exactly 3 letters and `NUM`
   matches the Line grammar's `NUM` (IMP-064); form `code` (d) and other set codes have none.
5. **Printing rows.** For each `byPrinting` entry `printingId → n` (n ≥ 1) whose `printingId` resolves in
   the catalog and has a code (rule 4): the row is `<n>,<name> <SET> <NUM>` (name cell = name, one space,
   code; e.g. `2,Lightning Rush RAD 001`, `1,"Kennen, Heart of the Tempest OGN 299"`).
6. **Self-check.** Before writing a printing row the exporter MUST check it against the catalog it
   exports with: the row converted per IMP-040 and parsed by the Line grammar and IMP-067/068 must come
   back `resolved`, with **no issue**, the record's `cardKey` and exactly this `printingId`. This catches
   (a) two printings that share set, collector key and suffix (only the first returned by `lookupPrinting`
   can be named by a code, CARD-036), and (b) the **exact-name guard** (IMP-067): `nameKey` of
   `<name> <SET> <NUM>` being another card's `cardKey` (hypothetical: card `Ion` printed as `ARC 2` next to
   a card `Ion Arc 2`). If the check fails, the exporter tries the **code-only** row `<n>,<SET> <NUM>`
   (IMP-066) with the same check; if that fails too, the copies go to the name-only row (rule 7) and the
   export notice counts them ("`<n>` copies were saved without their printing.").
7. **Name-only row.** Per card, the copies not written in a printing row are summed into **one** row
   `<qty>,<name>`: the unassigned copies (`quantity − Σ byPrinting`, SPEC-007 COLL-002), plus the copies of
   every **missing-printing** entry (a `printingId` not in the catalog, SPEC-007 COLL-014), plus copies that
   failed rule 6, plus the copies of printings that resolve but have **no code** under rule 4 (CARD-037
   form `code` (d), or a set code that is not exactly 3 letters, e.g. `PR`); the export notice counts
   those too ("`<n>` copies were saved without their printing."), so no printing is dropped silently.
   *Why missing printings go name-only:* their `printingId` cannot come back from a
   catalog that no longer has it, and their remembered code (SPEC-007 COLL-075) would only produce an
   `UNKNOWN_PRINTING` warning on every re-import (IMP-069 a) for the same result (unassigned copies), so
   name-only keeps the quantity and imports with no issue. No row is written when this sum is 0. A
   name-only row is checked like rule 6 (resolved, no issue, the record's `cardKey`); a canonical name
   normally passes (exact match, IMP-025, and the exact-name guard of IMP-067 for names that look like
   they end in a code, AC 29). A card whose name-only row would fail is still written and named in the
   export notice ("`<card>` may not import back as written."). The rule 6 and rule 7 checks also cover
   names the Line grammar would misread, e.g. a name starting with a standalone `X` word (`2,X Marks the
   Spot` parses as quantity `2 X`): such a row fails its check and is handled as above; there is no
   other format.
8. **Quantities above 999.** A row count n > 999 (IMP-008 allows 1..999 per entry) is written as
   ⌈n / 999⌉ rows: ⌊n / 999⌋ identical rows of 999, then one row with the rest **only when the rest is
   greater than 0** (e.g. 1,200 → `999,Gust` and `201,Gust`; 1,998 → `999,Gust` twice, no `0,Gust` row);
   IMP-047/048 sum them back.
9. **Order.** Rows follow SPEC-007's default Collection order (COLL-031, `printingSortKey`), each card's
   name-only row at its unassigned entry's position (COLL-012). Order has no effect on the import.
10. **Left out.** Records whose `cardKey` does not resolve in the catalog (SPEC-007 COLL-015) have no
    canonical name and are not written; the export notice names them ("`<n>` cards not in the card data
    were left out."). A Replace import of the file removes them, and the IMP-050 confirmation lists them.

**Round-trip guarantee.** Let collection C be exported with catalog K, and the file imported unedited
with **Replace** against the same K. Then every line resolves with no issue and no review, except the
rows of cards named in a rule 7 notice ("may not import back as written"), and the
committed collection C′ has: the same `cardKey`s as C (minus rule 10's left-out records and any card named in a rule 7 notice); for each card,
`C′.quantity = C.quantity`; for each `printingId` that resolves in K and passed rule 6 (on the
`<name> <SET> <NUM>` row or on the code-only retry),
`C′.byPrinting[printingId] = C.byPrinting[printingId]`; no other `byPrinting` keys, so the copies of
missing-printing entries, of printings with no code (rule 4) and of printings that failed rule 6 are
unassigned in C′. Tags, exclude flags,
SPEC-007's printing-code memory and view state are not in the file and are not changed by the import
(SPEC-007 COLL-057). See AC 35.

## Rationale: Add vs. Replace
Players acquire cards over time (packs, trades), so the common action is "I got these cards, add them";
Add is also non-destructive, so it is the default. But most sources we accept are snapshots
(a CSV export from a tracker, a full list the user maintains), and re-importing a snapshot with Add
would double-count. So Replace exists as an explicit, confirmed choice (IMP-049/050), with a one-step
undo (IMP-052). Because parsing is side-effect free (IMP-002), the user sees the diff before choosing.

## Data contract
```ts
// shapes only; no implementation
// --- Part A: shared parsing (reused by SPEC-006) ---
type SourceFormat = 'riot-text' | 'plain-text' | 'piltover-code' | 'tts' | 'csv';
type ImportMode = 'add' | 'replace';
type Severity = 'error' | 'warning' | 'info';

type CardKey = string;      // SPEC-001 PlayableCard.cardKey = nameKey(canonical name) (CARD-012, CARD-030)
type PrintingCode = string; // printing code as read from input, e.g. "OGN-007a"; resolved via CARD-036
type PrintingId = string;   // SPEC-001 printing id

type RiotSection = 'legend' | 'champion' | 'main' | 'battlefields' | 'runes' | 'sideboard';

interface SourceLocation {
  line: number;             // 1-based line of the parsed text (pasted, or the text box after an upload, IMP-045)
  token?: number;           // 0-based token (TTS) or card-group index (deck code)
}

type IssueCode =
  | 'INPUT_TOO_LARGE' | 'INPUT_ENCODING' | 'LINE_TOO_LONG'
  | 'MISSING_QUANTITY' | 'MISSING_NAME' | 'UNPARSEABLE_TOKEN'
  | 'BAD_QUANTITY' | 'ZERO_QUANTITY' | 'TOTAL_TOO_LARGE'
  | 'UNKNOWN_CARD' | 'AMBIGUOUS_NAME' | 'FUZZY_MATCH'
  | 'UNKNOWN_PRINTING' | 'UNKNOWN_SET_INDEX' | 'VARIANT_UNMAPPED'
  | 'PRINTING_NAME_MISMATCH' | 'AMBIGUOUS_PRINTING'   // v0.5, IMP-067/068
  | 'DECK_CODE_INVALID'
  | 'FORMAT_AMBIGUOUS';
// v0.5 severities: UNKNOWN_PRINTING is a warning when the line fell back to its name (IMP-069 a) and an
// error for a code-only line or a TTS / deck-code token (IMP-069 b, IMP-037); PRINTING_NAME_MISMATCH and
// AMBIGUOUS_PRINTING are warnings (the line status says whether it is resolved or needs review).
// v0.8: INPUT_ENCODING is no longer produced by parsing; an upload that is not UTF-8 is an UploadRejection (IMP-010).
// v0.4 removed: QUANTITY_ASSUMED (IMP-021), UNPARSEABLE_LINE (IMP-024), CSV_NO_NAME_COLUMN (IMP-041),
// EMPTY_NAME (IMP-045, now MISSING_NAME), NAME_PRINTING_MISMATCH (IMP-044 withdrawn).

interface ImportIssue {
  severity: Severity;
  code: IssueCode;
  message: string;
  location?: SourceLocation;  // absent for input-level issues
  raw?: string;               // excerpt, max 120 chars
}

interface Suggestion {
  cardKey: CardKey;
  displayName: string;        // catalog name, e.g. "Lightning Rush"
  similarity: number;         // 0..1
  confidence: 'high' | 'low'; // >= 0.85 | 0.60..0.85
  preselected: boolean;       // IMP-028
}

type LineStatus = 'resolved' | 'needs-review' | 'error' | 'skipped';

interface PrintingHint {      // v0.5 (IMP-064…067); the printing an entry names, before resolution
  setCode: string;            // upper-cased, e.g. 'RAD'
  collectorNumber: string;    // verbatim as typed, e.g. '001 /167', '007a', 'SP1/005'
  text: PrintingCode;         // the code as typed without brackets, e.g. 'RAD 001 /167', 'OGN-007a'
}
// Lookup: lookupPrinting(setCode, collectorNumber with whitespace around '/' removed) (IMP-067, CARD-036).

interface ParsedLine {
  location: SourceLocation;
  raw: string;
  section?: RiotSection;      // riot-text only; display only
  quantity: number;
  inputName?: string;         // as typed, without quantity or code; absent for code-only lines (IMP-066)
  printing: PrintingHint | null; // text code (IMP-064), TTS token or deck-code card; null when none.
                              // v0.5: replaces `inputPrinting`. Set to null by the exact-name guard (IMP-067).
  status: LineStatus;
  resolved?: {
    cardKey: CardKey;
    displayName: string;
    printingId?: PrintingId;  // only when resolved by code (IMP-048, IMP-067)
    method: 'exact' | 'article' | 'printing' | 'user-choice'; // 'printing' = resolved by its code (IMP-067/068); 'article' = optional leading a/the (IMP-025, CARD-034)
    confidence: number;       // 1 for exact/article/printing
  };
  suggestions: Suggestion[];  // empty when resolved exactly
  issues: ImportIssue[];
}

interface MergedCard {        // Part B: owned-card merge (IMP-047)
  cardKey: CardKey;
  displayName: string;
  quantity: number;                       // sum over all contributing lines
  byPrinting: Record<PrintingId, number>; // only for printing-identified sources; display only
  sourceLines: number[];
}

interface UploadInfo {        // IMP-001, IMP-061, IMP-062 (v0.4; replaces CsvColumnMap)
  fileName: string;           // shown as "Loaded <fileName>"
  fileType: 'txt' | 'csv' | 'xlsx';
}

interface UploadRejection {   // v0.8 (IMP-010, IMP-061): a rejected upload; not an ImportIssue, the parser never sees it
  code: 'FILE_REJECTED' | 'INPUT_TOO_LARGE' | 'INPUT_ENCODING';
  message: string;            // shown next to the upload control, e.g. "deck.pdf can't be imported. Use a .txt, .csv or .xlsx file."
}                             // the text box and its UploadInfo stay unchanged

interface ImportResult {
  format: SourceFormat;
  formatDetected: boolean;    // false when user overrode
  formatReason: string;       // IMP-012
  upload?: UploadInfo;        // absent for pasted/typed text
  lines: ParsedLine[];
  merged: MergedCard[];       // owned-card import only (Part B); only 'resolved' lines
  issues: ImportIssue[];      // input-level issues
  summary: {
    // catalog-free (IMP-057, v0.8): present as soon as the text is parsed, before the catalog loads
    linesRead: number; entriesParsed: number; errors: number; distinctNames: number; totalCopies: number;
    // added by resolution against the catalog (H-057); absent before it
    resolvedExact?: number; needsReview?: number;
  };
  catalogVersion?: string;    // SPEC-001 catalogVersion the result was resolved against; absent before resolution (v0.8)
}
// v0.8 (IMP-057, IMP-066): before the catalog loads, the parser returns format, formatReason, upload, the
// line-rule issues and the catalog-free summary; each line has location, raw, section, quantity, inputName
// and printing. status / resolved / suggestions, resolution issues, merged, summary.resolvedExact,
// summary.needsReview and catalogVersion come with resolution (H-057); formatDetected with the override (IMP-013).

// --- Part B: collection-specific ---
interface ImportCommitRequest {
  result: ImportResult;       // after user review
  mode: ImportMode;
  confirmedReplace?: boolean; // required true when mode = 'replace'
}

interface StoredCollection {
  schemaVersion: 1;
  updatedAt: string;          // ISO 8601
  catalogVersion: string;
  cards: Record<CardKey, { quantity: number; byPrinting: Record<PrintingId, number> }>; // total owned = quantity; Decks uses SPEC-007 deckOwnership() (IMP-058, COLL-081)
}

interface CollectionStore {   // adapter: the browser cache of the account's collection (IMP-053, SPEC-010 SYNC-140)
  load(): Promise<StoredCollection | null>;
  save(c: StoredCollection): Promise<void>;
  loadPrevious(): Promise<StoredCollection | null>; // IMP-052
}
```

## Acceptance criteria
Card names below come from the 2026-11 RC Europe decklists in `01-Research/Decklists/`.

1. **Riot sectioned text, sections merged** (IMP-011, 016, 018, 047)
   **Given** the input
   ```
   Legend:
   1 Kennen, Heart of the Tempest
   Champion:
   1 Kennen, Storm of Shuriken
   Main Deck:
   1 An Offer You Can't Refuse
   3 Lightning Rush
   Battlefields:
   1 Zaun Warrens
   Rune Pool:
   9 Chaos Rune
   3 Order Rune
   Sideboard:
   1 An Offer You Can't Refuse
   ```
   **When** it is parsed **Then** the format is `riot-text` with a reason naming `Legend` on line 1, no label line is an entry, and `merged` contains `An Offer You Can't Refuse ×2` (source lines 6 and 14), `Lightning Rush ×3`, `Chaos Rune ×9`, `Order Rune ×3`, `Kennen, Heart of the Tempest ×1`, `Kennen, Storm of Shuriken ×1`, `Zaun Warrens ×1`; `summary.totalCopies = 20`.

2. **Our Markdown decklist notes** (IMP-016, 017) **Given** `## Main deck` / `1 Bellows Breath` / `## Runes` / `6 Fury Rune` **When** parsed **Then** format is `riot-text`, both headings are labels, and the result is `Bellows Breath ×1`, `Fury Rune ×6`.

2a. **Label spelling and same-line entry** (IMP-016, 017, 023) **Given** `MAINDECK` / `3 Lightning Rush` / `runepool:` / `9 Chaos Rune` / `RuneDeck` / `3 Order Rune` / `Champion: 1 Kennen, Storm of Shuriken` **When** parsed **Then** all four label lines are labels (sections `main`, `runes`, `runes`, `champion`), and the last line also yields the entry `Kennen, Storm of Shuriken ×1` in section `champion`.

3. **Plain lines with `x`** (IMP-019) **Given** `3x Stupefy`, `3 X Hextech Ray`, `2 Smoke Screen` **When** parsed **Then** format is `plain-text` and all three resolve exactly with quantities 3, 3, 2.

4. **Case and apostrophe folding is exact, not fuzzy** (IMP-025, CARD-030) **Given** `1 kai’sa, survivor` (curly apostrophe, lower case) **When** parsed **Then** it resolves to `Kai'Sa, Survivor` with `method: "exact"`, `confidence: 1`, status `resolved`.

5. **Typo → high-confidence suggestion, not auto-applied** (IMP-026, 027, 028) **Given** `3 Lightnig Rush` **When** parsed **Then** status is `needs-review`, issue `FUZZY_MATCH` on line 1, top suggestion `Lightning Rush` with `confidence: "high"` and `preselected: true`, and `merged` does **not** contain Lightning Rush until the user accepts.

6. **Low confidence never pre-selected** (IMP-026, 028) **Given** `2 Hextek Rai` **When** parsed and `Hextech Ray` scores between 0.60 and 0.85 **Then** it appears as a `low` suggestion with `preselected: false`.

7. **Ambiguous champion name** (IMP-029) **Given** `1 Kennen` **When** parsed **Then** issue `AMBIGUOUS_NAME`, suggestions include `Kennen, Heart of the Tempest` and `Kennen, Storm of Shuriken`, none pre-selected.

8. **Unknown card** (IMP-030, 056) **Given** line 4 is `2 Totally Fake Card` **When** parsed **Then** issue `{severity: "error", code: "UNKNOWN_CARD", location: {line: 4}}`, no suggestions, and the other lines still resolve.

9. **Banned card still imports** (IMP-004) **Given** `3 Nocturne, Horrifying` and `3 Rhasa the Sunderer` **When** parsed **Then** both resolve and are counted; no legality issue is produced.

10. **Missing quantity, missing name, and bad quantities** (IMP-008, 021, 024) **Given** line 1 `2 Gust`, line 2 `Lightning Rush`, line 3 `-1 Gust`, line 4 `0 Gust`, line 5 `1000 Gust`, line 6 `3x` **When** parsed **Then** line 1 is an entry `Gust ×2`; line 2 → error `MISSING_QUANTITY` ("Start the line with a number, like "1 Card name" or "1x Card name".") and is left out with no name lookup; line 3 → `BAD_QUANTITY`; line 4 → `ZERO_QUANTITY` warning and skipped; line 5 → `BAD_QUANTITY`; line 6 → `MISSING_NAME`. `totalCopies = 2`. No `QUANTITY_ASSUMED` exists.

11. **TTS tokens** (IMP-011, 036, 036a, 037, 038) **Given** `OGN-265-1 OGN-265-1 ogn-265-1` (art number 1 each, one copy per token) **When** parsed **Then** format is `tts`, one parsed printing `OGN-265` with quantity 3, counted toward the `cardKey` that CARD-036 resolves `OGN-265` to, and `byPrinting[<printingId of OGN-265>] = 3`.

12. **TTS unknown printing** (IMP-037) **Given** `OGN-265-1 OGN-999-1` **When** parsed **Then** token 1 → `UNKNOWN_PRINTING` at `{line: 1, token: 1}`; OGN-265 still imports ×1.

13. **CSV rows into the text box** (IMP-040, 041, 042, 043, 045, 062) **Given** `my.csv`
    ```
    Quantity,Card Name
    2,"Kennen, Storm of Shuriken"
    1,Kennen,Heart of the Tempest
    3x Gust
    Traveling Merchant,
    ```
    **When** uploaded **Then** the title row is skipped and the text box holds
    `2 Kennen, Storm of Shuriken` / `1 Kennen, Heart of the Tempest` / `3x Gust` / `Traveling Merchant`
    (lines 1–4), "Loaded my.csv" is shown, the entries are `Kennen, Storm of Shuriken ×2`,
    `Kennen, Heart of the Tempest ×1` (unquoted comma re-joined), `Gust ×3`, and line 4 → `MISSING_QUANTITY`.

14. **Name-first columns are not read** (IMP-040, 043) **Given** `owned.csv` with title row `Card Name,Quantity` and row `Seal of Discord,2` **When** uploaded **Then** the title row is skipped, line 1 is `Seal of Discord, 2`, and it is `MISSING_QUANTITY` (quantity must come first). **Given** instead semicolon rows `2;Seal of Discord` **Then** the delimiter is `;` and the entry is `Seal of Discord ×2`. **Given** instead `owned.csv` with rows `2;Kennen, Heart of the Tempest` and `3;Gust` (IMP-042, v0.8) **When** uploaded **Then** the delimiter is `;` (the comma in the name doesn't count against it), the text box holds `2 Kennen, Heart of the Tempest` / `3 Gust`, and the entries are `Kennen, Heart of the Tempest ×2` and `Gust ×3`. **Given** instead an empty first line, then `1,"Odd; Card"` and `2,Gust` **When** uploaded **Then** the delimiter is `,` (the `;` is inside quotes) and the text box holds `1 Odd; Card` / `2 Gust`. **Given** instead `2\tKennen, Heart of the Tempest` (tab) **When** uploaded **Then** the delimiter is tab and the entry is `Kennen, Heart of the Tempest ×2`.

15. **Title row only when it looks like one** (IMP-041) **Given** a first row `foo,bar` **When** uploaded as `owned.csv` **Then** it is not skipped and is line 1 `foo, bar` → `MISSING_QUANTITY`. **Given** a first row `3,Gust` **Then** it is data (starts with a digit) → `Gust ×3`.

15a. **Excel upload and rejected files** (IMP-001, 061) **Given** `owned.xlsx` whose first sheet has rows `Qty | Name`, `3 | Lightning Rush`, `2x Hextech Ray` (one cell) and a second sheet with other rows **When** uploaded **Then** the text box holds `3 Lightning Rush` / `2x Hextech Ray` and the second sheet is ignored. **Given** `owned.xls` **When** uploaded **Then** "Older .xls files aren't supported. Save it as .xlsx or .csv and try again." and the text box is unchanged. **Given** a 6 MB `big.csv` **When** uploaded **Then** "big.csv is too large to import (limit: 5 MB)." (a `.txt` gets the 1 MB message instead, AC 38).

15b. **Edit after upload; Continue** (IMP-062, 063, 002) **Given** AC 13's text box **When** the user edits line 4 to `1 Traveling Merchant` **Then** the list of problems is empty and the totals read "7 cards from 4 lines". **Given** a text box whose only line is `Lightning Rush` **When** the user clicks Continue **Then** "Add at least one line with a number and a card name first." is shown and nothing is saved. **Given** 60 lines without quantities **Then** 50 problems are listed, then "+10 more".

16. **Piltover deck code** (IMP-031, 032) **Given** a valid V2 code whose decoded cards are all in sets of the IMP-032 table **When** pasted **Then** format is `piltover-code`, main deck and sideboard counts are merged by `cardKey`. **BLOCKED: needs research** — no real code with known contents is in research yet; a fixture is required to make this criterion concrete.

17. **Deck code with an unmapped set** (IMP-032) **Given** a code containing a card group with set index 7 (the table ends at `6 = RAD`; v0.14: was index 4) **When** pasted and parsed **Then** that group → `UNKNOWN_SET_INDEX` at `{line: 1, token: <group index>}`, other groups import.

18. **Variants merge by name** (IMP-048) **Given** TTS input `OGN-<n>-1 OGN-<n>-1 OGN-<n>a-1` where `OGN-<n>` is a `Lightning Rush` printing in the SPEC-001 catalog **When** parsed **Then** `merged` has `Lightning Rush ×3` (one `cardKey`, `lightning rush`) with `byPrinting` showing both printings (2 and 1). If the catalog has no `a` printing, the `a` token resolves to the base printing with `VARIANT_UNMAPPED` and the total is still 3. (v0.3 used CSV set+number columns, withdrawn with IMP-044.)

19. **Add is default; Replace confirms** (IMP-049, 050) **Given** a stored collection `{Gust: 2, Abandon: 1}` and an import of `1 Gust` **When** committed with the default mode **Then** the collection is `{Gust: 3, Abandon: 1}`. **When** instead the user selects Replace **Then** a confirmation states "1 name removed (Abandon), 1 changed (Gust 2 → 1)" and only after confirming is the collection `{Gust: 1}`.

20. **Parsing is side-effect free** (IMP-002) **Given** any input **When** parsed but not committed and the page is reloaded **Then** the stored collection is unchanged.

21. **Size limit** (IMP-006) **Given** a 1.2 MiB paste **When** parsed **Then** a single `INPUT_TOO_LARGE` error, `lines` empty, nothing stored.

22. **Format override** (IMP-013) **Given** `OGN-265-1` detected as `tts` **When** the user forces `plain-text` **Then** it is re-parsed as a text line with no leading quantity: error `MISSING_QUANTITY`, left out.

23. **Hyphen difference goes to fuzzy, not exact** (IMP-025, 026, 027; CARD-030) **Given** the catalog card `Star-Crossed` (hypothetical name, as in SPEC-001 AC5) and the input `2 Star Crossed` **When** parsed **Then** the keys `star crossed` and `starcrossed` differ, so the line is `needs-review` with a `high` suggestion `Star-Crossed` (similarity 1 − 1/12 ≈ 0.92), and it is not counted until the user accepts.

24. **Optional leading article, no alias table** (IMP-025, IMP-059; CARD-034) **Given** `1 Dreaming Tree` and a catalog card `The Dreaming Tree` **When** parsed **Then** the line is `resolved` to `The Dreaming Tree` with `method: "article"`, `confidence: 1`, no issue, and it is shown as `The Dreaming Tree`. **Given** `1 The Dreaming Tree` **Then** it resolves with `method: "exact"`. **Given** the catalog names the card `Dreaming Tree` and the input is `1 The Dreaming Tree` **Then** it resolves to `Dreaming Tree` with `method: "article"`. **Given** (hypothetical) catalog cards `A Pit` and `The Pit` and the input `2 Pit` **Then** the line is `needs-review` with warning `AMBIGUOUS_NAME` and both cards as suggestions, none pre-selected, and nothing is counted until the user picks. **Given** `1 Dreaming Tre` (typo) **Then** the article rule does not apply and it goes to fuzzy suggestions (IMP-026).

25. **Ownership by cardKey for Collection and Decks** (IMP-048, 058) **Given** a committed collection with `Lightning Rush` ×2 from printing A and ×1 from printing B **When** SPEC-005 asks the owned count for a deck that requires 3 `Lightning Rush` **Then** the owned count is 3 (`cards["lightning rush"].quantity`), and SPEC-007 can show the per-printing split 2 / 1.

26. **Deck Import never writes the collection** (IMP-060) **Given** a stored collection `{Gust: 2}` **When** the user pastes `3 Gust` into the **Import deck** dialog (Decks) instead of **Add to your collection** and saves the deck **Then** the collection is still `{Gust: 2}`.

**Fixture F1 for ACs 28–33 (v0.5).** Collector numbers are hypothetical until H-020 delivers the live payload; replace them then. The catalog has `Lightning Rush` with printings RAD `001` (base, `p_lr_001`) and RAD `001a` (`p_lr_001a`); `Kennen, Heart of the Tempest` with printings OGN `<n>` (base) and OGN `299` (`p_kn_299`, `variant.kind` as the catalog says, `unknown` while CARD-040 is BLOCKED); `Hextech Ray` and `Gust` as other cards; no RAD `999`; and the hypothetical card `Ion Arc 2`.

27. **Quantity forms** (IMP-019, 020, 021, 024; Line grammar step 5) **Given** lines 1–9: `x3 Lightning Rush`, `Lightning Rush x3`, `X2 Hextech Ray`, `Hextech Ray X2`, `3 Lightning Rush x3`, `Lightning Rush 3`, `x3`, `Gust x0`, `3x RAD 001 x2` **When** parsed **Then** lines 1–4 are entries `Lightning Rush ×3`, `Lightning Rush ×3`, `Hextech Ray ×2`, `Hextech Ray ×2`; line 5 → `BAD_QUANTITY` ("Give the number of copies once per line."); line 6 → `MISSING_QUANTITY`; line 7 → `MISSING_NAME`; line 8 → `ZERO_QUANTITY` warning, skipped; line 9 → `BAD_QUANTITY` ("Give the number of copies once per line."; after the code `RAD 001` is cut the body is `x2`), not an entry named `x2`. `totalCopies = 10`.

28. **Printing code positions** (IMP-064, 065; Line grammar) **Given** each line below (no catalog needed) **When** each line is parsed **Then** it gives:

    | Line | quantity | name | `setCode` | `collectorNumber` (verbatim) | lookup number |
    |---|---|---|---|---|---|
    | `3 Lightning Rush RAD 001/167` | 3 | `Lightning Rush` | `RAD` | `001/167` | `001/167` |
    | `3x RAD-001/167 Lightning Rush` | 3 | `Lightning Rush` | `RAD` | `001/167` | `001/167` |
    | `1 Kennen, Heart of the Tempest (OGN 299/298)` | 1 | `Kennen, Heart of the Tempest` | `OGN` | `299/298` | `299/298` |
    | `Lightning Rush x3 RAD 001 /167` | 3 | `Lightning Rush` | `RAD` | `001 /167` | `001/167` |
    | `Lightning Rush RAD 001/167 x3` | 3 | `Lightning Rush` | `RAD` | `001/167` | `001/167` |
    | `2 OGN-007a Lightning Rush` | 2 | `Lightning Rush` | `OGN` | `007a` | `007a` |
    | `2 [ogn-007a] Lightning Rush` | 2 | `Lightning Rush` | `OGN` | `007a` | `007a` |
    | `1 Lightning Rush - rad 1 / 167` | 1 | `Lightning Rush` | `RAD` | `1 / 167` | `1/167` |
    | `1 Lightning Rush RAD-SP1/005` | 1 | `Lightning Rush` | `RAD` | `SP1/005` | `SP1/005` |
    | `3 Lightning Rush RAD001` | 3 | `Lightning Rush` | `RAD` | `001` | `001` |
    | `3 RAD 001/167` | 3 | *(none)* | `RAD` | `001/167` | `001/167` |
    | `1 Lightning Rush ABC DEF1/005` (hypothetical codes; earliest split wins, step 3) | 1 | `Lightning Rush` | `ABC` | `DEF1/005` | `DEF1/005` |

29. **Code-like text that stays a name** (IMP-065, 067) **Given** `3 Lightning Rush 001/167`, `2 Seal of Discord RAD`, `3 Lightning Rush 001`, `1 Lightning RushRAD 001` **When** parsed **Then** each has `printing: null` and the whole card part as its name (`Lightning Rush 001/167`, `Seal of Discord RAD`, `Lightning Rush 001`, `Lightning RushRAD 001`), resolved by name only (here: not exact, so fuzzy suggestions per IMP-026). **Given** `1 Ion Arc 2` **When** parsed **Then** the grammar reads name `Ion` and code `ARC 2`, but the exact-name guard finds the card `Ion Arc 2`, so the line resolves by name (`method: "exact"`), `printing: null`, and no printing issue.

30. **Resolution by code; code-only line** (IMP-066, 067, 048) **Given** F1 and `3 Lightning Rush RAD 001/167` **When** parsed **Then** it is `resolved`, `cardKey` `lightning rush`, `printingId: p_lr_001`, `method: "printing"`, `confidence: 1`, and `merged` has `Lightning Rush ×3` with `byPrinting: {p_lr_001: 3}`. **Given** `3 RAD 001/167` **When** the dialog parses it before the catalog has loaded **Then** it is a valid line ("3 cards from 1 line"), shown as `RAD 001/167`, with no problem listed; **When** the catalog has loaded **Then** it resolves to `Lightning Rush` exactly as above.

31. **Code and name disagree** (IMP-068) **Given** F1 and line 1 `3 Hextech Ray RAD 001/167` **When** parsed **Then** it is `needs-review` with warning `PRINTING_NAME_MISMATCH` ("`RAD 001/167` is Lightning Rush, but the line says Hextech Ray. Pick one."), suggestions `Lightning Rush` and `Hextech Ray`, none pre-selected, and nothing is merged; **When** the user picks `Lightning Rush` **Then** `byPrinting: {p_lr_001: 3}`; **When** instead they pick `Hextech Ray` **Then** `Hextech Ray ×3` with no `byPrinting`. **Given** `3 Lightnig Rush RAD 001/167` **When** parsed **Then** it is `resolved` to `Lightning Rush` (`method: "printing"`) with warning `PRINTING_NAME_MISMATCH` ("`RAD 001/167` is Lightning Rush; "Lightnig Rush" isn't a card name, so the code was used.").

32. **Code not found; suffix not found** (IMP-067, 069) **Given** F1 and lines `3 Lightning Rush RAD 999`, `2 RAD 999`, `1 RAD-001z Lightning Rush` **When** parsed **Then** line 1 resolves exactly by name to `Lightning Rush ×3` with warning `UNKNOWN_PRINTING` ("`RAD 999` isn't in the card data, so the card name was used.") and no `byPrinting`; line 2 → error `UNKNOWN_PRINTING` ("`RAD 999` isn't in the card data. Add the card name or fix the code."), left out; line 3 resolves to `Lightning Rush` on the base printing `p_lr_001` with warning `VARIANT_UNMAPPED`.

33. **Printings kept, ownership by name** (IMP-047, 048, 070) **Given** F1 and `2 Lightning Rush RAD 001`, `1 Lightning Rush RAD 001a`, `1 Lightning Rush`, `1 Kennen, Heart of the Tempest (OGN 299/298)` **When** committed with Add to an empty collection **Then** `cards["lightning rush"] = {quantity: 4, byPrinting: {p_lr_001: 2, p_lr_001a: 1}}` (1 unassigned copy) and `cards["kennen heart of the tempest"] = {quantity: 1, byPrinting: {p_kn_299: 1}}`; whether `p_kn_299` shows as overnumbered depends only on its catalog `variant.kind` (the `/298` plays no part); SPEC-005 counts 4 owned `Lightning Rush`.

34. **CSV rows with codes** (IMP-040, 044, 065) **Given** `owned.csv` with rows `Qty,Name`, `3,Lightning Rush,RAD 001/167`, `Lightning Rush x2`, `1,Lightning Rush,RAD,001a` **When** uploaded **Then** the text box holds `3 Lightning Rush, RAD 001/167` / `Lightning Rush x2` / `1 Lightning Rush, RAD, 001a`; line 1 resolves by code to `p_lr_001` ×3, line 2 is `Lightning Rush ×2` by name, and line 3 has `printing: null` and the name `Lightning Rush, RAD, 001a` (separate set and number cells are not a code), so it is resolved by name only: not exact, `needs-review` with `Lightning Rush` as a `low` suggestion (similarity ≈ 0.61, IMP-026).

35. **CSV export round-trips** (IMP-055, Collection CSV export rules 1–10, round-trip guarantee; v0.7, H-045) **Given** F1 and a stored collection
    `cards["lightning rush"] = {quantity: 6, byPrinting: {p_lr_001: 2, p_lr_001a: 1, p_lr_old: 1}}` (`p_lr_old` is not in the catalog: a missing-printing entry, SPEC-007 COLL-014, remembered code `RAD-002`; unassigned = 2),
    `cards["kennen heart of the tempest"] = {quantity: 1, byPrinting: {p_kn_299: 1}}`, `cards["gust"] = {quantity: 1200, byPrinting: {}}`,
    and the `p_lr_001` printing tagged `Trade binder` (SPEC-007), with these hypothetical orders until H-020: `setOrder` OGN = 0, RAD = 1 (CARD-071); `Lightning Rush`'s `defaultPrintingId` = `p_lr_001` (CARD-016); `Gust`'s `defaultPrintingId` = a RAD printing numbered after `001a` (e.g. RAD `050`) **When** the user exports the collection **Then** the file holds exactly these rows, in this order (rule 9: `printingSortKey`, CARD-070, so OGN before RAD and `001` before `001a`; the name-only row at `p_lr_001`, right after that printing's own row, SPEC-007 COLL-012):
    ```
    Quantity,Card Name
    1,"Kennen, Heart of the Tempest OGN 299"
    2,Lightning Rush RAD 001
    3,Lightning Rush
    1,Lightning Rush RAD 001a
    999,Gust
    201,Gust
    ```
    with no Tags column, the missing-printing copy summed into the name-only `Lightning Rush` row (2 unassigned + 1 missing = 3), and the Kennen name cell quoted because it contains a comma.
    **When** that file is uploaded unedited and committed with **Replace** **Then** the text box holds `1 Kennen, Heart of the Tempest OGN 299` / `2 Lightning Rush RAD 001` / `3 Lightning Rush` / `1 Lightning Rush RAD 001a` / `999 Gust` / `201 Gust`; every line is `resolved` with no issue (lines 1, 2 and 4 with `method: "printing"`, codes `OGN 299`, `RAD 001`, `RAD 001a`; no `UNKNOWN_PRINTING`); and the collection is
    `cards["lightning rush"] = {quantity: 6, byPrinting: {p_lr_001: 2, p_lr_001a: 1}}` (3 unassigned), `cards["kennen heart of the tempest"] = {quantity: 1, byPrinting: {p_kn_299: 1}}`, `cards["gust"] = {quantity: 1200, byPrinting: {}}`. `Trade binder` is still on `p_lr_001` (tags are kept, SPEC-007 COLL-057, not read from the file).

**ACs 36–41 (v0.8)** need no catalog.

36. **Quantities that are not whole numbers** (IMP-008, 024; Line grammar `DEC_LEAD`, `DEC_TRAIL`) **Given** lines 1–5: `2,5 Gust`, `2.5 Gust`, `.5 Gust`, `Gust x2.5`, `2. Gust` **When** parsed **Then** lines 1–4 → `BAD_QUANTITY` ("Quantity must be a whole number from 1 to 999."), and line 5 → `MISSING_QUANTITY` ("Start the line with a number, like "1 Card name" or "1x Card name"."); no entries. **Given** `owned.csv` with the row `2,5;Gust` **When** uploaded **Then** the delimiter is `;`, the text box holds `2,5, Gust`, and line 1 → `BAD_QUANTITY`.

37. **Section label in its own cell** (IMP-040 (c), 023) **Given** `deck.csv` with rows `Champion,1 Kennen, Storm of Shuriken`, `Main Deck,3,Gust` and `Main Deck:,2,Hextech Ray` **When** uploaded **Then** the text box holds `Champion: 1 Kennen, Storm of Shuriken` / `Main Deck: 3 Gust` / `Main Deck: 2 Hextech Ray`, there are no problems, and the entries are `Kennen, Storm of Shuriken ×1` (section `champion`), `Gust ×3` and `Hextech Ray ×2` (section `main`).

38. **Rejected uploads** (IMP-001, 006, 010, 061) **Given** a text box holding `3 Gust` from an earlier upload `my.csv` **When** the user uploads each file below **Then** the message is shown next to the upload control, the text box still holds `3 Gust`, and "Loaded my.csv" is still shown:

    | File | Code | Message |
    |---|---|---|
    | `deck.pdf` | `FILE_REJECTED` | "deck.pdf can't be imported. Use a .txt, .csv or .xlsx file." |
    | `old.XLS` | `FILE_REJECTED` | "Older .xls files aren't supported. Save it as .xlsx or .csv and try again." |
    | `big.txt`, 1.5 MiB | `INPUT_TOO_LARGE` | "big.txt is too large to import (limit: 1 MB or 10,000 lines)." (the file is not read) |
    | `huge.csv`, 6 MiB | `INPUT_TOO_LARGE` | "huge.csv is too large to import (limit: 5 MB)." (the file is not read) |
    | `many.csv`, 10,001 rows `1,Gust` (under 1 MiB) | `INPUT_TOO_LARGE` | "many.csv is too large to import (limit: 1 MB or 10,000 lines)." |
    | `bad.csv` containing the byte `0xFF` | `INPUT_ENCODING` | "bad.csv isn't UTF-8 text. Save it as UTF-8 or .xlsx and try again." |
    | `empty.csv` holding only `Qty,Name` | `FILE_REJECTED` | "empty.csv has no lines to import." |

    **Given** a pasted text of 1.2 MiB **When** parsed **Then** the one issue reads "This is too large to import (limit: 1 MB or 10,000 lines)." (AC 21).

39. **Upload kept or dropped** (IMP-062, 007, 011) **Given** AC 13's upload of `my.csv` **When** the user edits line 4 **Then** "Loaded my.csv" is still shown and the format is `csv`. **When** instead the user selects the whole text and pastes `3 Gust` **Then** no file name is shown, the format is `plain-text`, and lines have the 500-character limit again. **When** instead the user deletes all the text (or leaves only spaces) **Then** no file name is shown.

40. **Row limit on the converted line** (IMP-007, 056) **Given** `owned.csv` with the row `1,` + 1,998 × `A` (2,001 characters as cells joined with `, `, 2,000 as the converted line `1 AAA…`) **When** uploaded **Then** it has no problem. **Given** instead `1,` + 1,999 × `A` followed by `3,Gust` **When** uploaded **Then** line 1 → `LINE_TOO_LONG` ("Row is longer than 2,000 characters.") with a 120-character raw excerpt ending in `…`, and `Gust ×3` is still an entry. **Given** the pasted line `1 ` + 1,500 × `A` **When** parsed **Then** → `LINE_TOO_LONG` ("Line is longer than 500 characters.").

41. **Catalog-free summary** (IMP-057, 066) **Given** lines 1–7 `3 Lightning Rush`, `1 lightning rush`, `2 Kennen, Heart of the Tempest`, `1 RAD 001/167`, `2 rad 001 / 167`, `Gust`, `0 Gust`, then a blank line 8 followed by a final line break **When** parsed before the catalog has loaded **Then** `summary = {linesRead: 8, entriesParsed: 5, errors: 1, distinctNames: 3, totalCopies: 9}` (the two code-only lines count as one name, `RAD001/167`; `0 Gust` is a warning, not an error), and `resolvedExact`, `needsReview` and `catalogVersion` are absent.

**AC 42 (v0.9)** needs a catalog with `Chaos Rune` and `Order Rune` (`category: 'rune'`), e.g. fixture F1 extended, until H-020.

42. **Runes are imported and exported like any card** (IMP-047, IMP-049, IMP-055, IMP-057, IMP-071) **Given** an empty collection and the lines `Rune Pool:` / `9 Chaos Rune` / `Runes` / `3 Order Rune` / `2 Chaos Rune` **When** parsed **Then** lines 1 and 3 are labels (section `runes`), lines 2, 4 and 5 are `resolved` with no issue, `merged` holds `Chaos Rune ×11` (source lines 2 and 5) and `Order Rune ×3`, and `summary.totalCopies = 14`; **When** committed with Add **Then** `cards["chaos rune"] = {quantity: 11, byPrinting: {}}` and `cards["order rune"] = {quantity: 3, byPrinting: {}}`, and SPEC-007 `deckOwnership(input, 'chaos rune').ownedForDecks = 11`. **When** the collection is exported **Then** the file holds the rows `11,Chaos Rune` and `3,Order Rune` (name-only, no printing), in rule 9 order among the other rows; **When** that file is re-imported with Replace **Then** both quantities are unchanged.

**ACs 43–45 (v0.10, H-087)** need no catalog beyond fixture F1 with `Lightning Rush`, `Gust` and `Kennen, Heart of the Tempest`.

43. **Add stays on Collection with an Undo notice** (IMP-049, IMP-072, IMP-073) **Given** a signed-in user on `/collection` whose "Add to your collection" dialog (opened from the floating button) parsed `3 Lightning Rush` / `2 Gust` over an empty collection **When** the user commits with Add **Then** the collection is `lightning rush ×3`, `gust ×2`, the dialog closes, the app is still at `/collection` with no query parameters and did not navigate, and a snack bar reads "Added 5 copies of 2 cards." with an **Undo** action. **Given** instead the single line `1 Gust` **Then** it reads "Added 1 copy of 1 card.". **Given** 1,204 copies over 412 cards in one import **Then** it reads "Added 1,204 copies of 412 cards.". **Given** the write fails (storage full) **Then** the dialog stays open with the error, the URL does not change and no snack bar appears.

44. **Replace, Undo and the single use** (IMP-050, IMP-052, IMP-073, IMP-075) **Given** `lightning rush ×3`, `gust ×2` stored and `1 Kennen, Heart of the Tempest` parsed **When** the user chooses Replace and confirms (IMP-050 lists the 2 names removed) **Then** the collection is `kennen heart of the tempest ×1`, the app is at `/collection` and the snack bar reads "Collection replaced: 1 card." with **Undo**; **When** the user taps **Undo** with no later changes and no locked deck affected **Then** no confirmation is asked, the stored collection is `lightning rush ×3`, `gust ×2` (tags unchanged), a notice "Import undone." shows, and Undo is not offered again. **Given** a Replace cancelled at its confirmation **Then** nothing is written, the dialog stays open, no snack bar.

45. **Away from Collection, and a changed collection** (IMP-074, IMP-075) **Given** the notice of AC 43 is showing **When** the user opens Decks within 10 seconds **Then** the notice is still shown there, and Undo works from there; after 10 seconds it is gone and no Undo is offered anywhere. **Given** the notice is showing and another tab changed `gust` to ×9 after the commit **When** the user taps Undo **Then** a confirmation warns that those changes will be lost; **When** they Cancel **Then** nothing is written and the notice is shown again with a fresh 10 seconds; **When** they confirm **Then** the collection is restored and "Import undone." shows. **Given** a locked deck that the restore would leave 1 card short **Then** the same confirmation adds "'`<deck name>`' (locked) will be 1 card short. It stays locked.", and after confirming the notice reads "Import undone. '`<deck name>`' (locked) is now 1 card short.".

**AC 46 (v0.12, H-174)**

46. **Entry points and label** (IMP-060, IMP-076) **Given** a signed-in user with the gate open **When** they open Collection **Then** the only way to start this import is the "Add to your collection" button (the floating button, or the empty state's button when there are no cards) and `/collection?add=1`; the dialog's title is exactly "Add to your collection"; no text in the app calls this flow "Owned Cards Import", "Import your collection" or "Import" alone. **When** they open `/import` **Then** the app shows Home. **Given** a signed-out visitor on `/collection?add=1` **Then** the sign-in panel shows, no button or dialog exists, and after sign-in and the first sync the dialog opens once.

47. **TTS art number is not a count** (IMP-036, 036a, 038; v0.14, H-166; community reading) Uses fixture F1 (hypothetical numbers). **Given** `RAD-001-1 RAD-001-1 RAD-001-2` **When** parsed **Then** format is `tts`, the total is **3 copies** (one per token, not 1 + 1 + 2), and after resolution `Lightning Rush ×3` has `byPrinting` RAD `001` (base, `p_lr_001`) = 2 and RAD `001a` (`p_lr_001a`) = 1. **Given** `RAD-001-3` **Then** it resolves to the base printing with warning `VARIANT_UNMAPPED` at `{line: 1, token: 0}` and still counts 1. **Given** `RAD-001a-2` **Then** it resolves to `001a` (letter as written) with `VARIANT_UNMAPPED`. **Given** `RAD-001-2` and a catalog with no `001a` **Then** it resolves to the base printing with `VARIANT_UNMAPPED`, total 1. **Given** forced `tts` and `RAD-001` **Then** `UNPARSEABLE_TOKEN`.

48. **Piltover tables** (IMP-031, 032, 033; v0.14, H-166; community, fixture-dependent) Uses fixture F1 and **BLOCKED** like AC 16 for a real code. **Given** a decoded card group with set index `6` and `0 … 5` **When** resolved **Then** the set codes are `RAD`, and `OGN`, `OGS`, `ARC`, `SFD`, `UNL`, `VEN` in that order. **Given** a decoded card `RAD 001` with variant letter `a` **Then** CARD-036 is called with the suffix hint `A` and returns the `001a` printing first; with `b` and no `001b` printing **Then** `VARIANT_UNMAPPED` and the base printing; with `s` and a printing whose number is `001*` **Then** that printing is used (both spellings tried); no letter **Then** the base printing. **Given** the number `SP1` with letter `a` in set `VEN` and a catalog whose collector number is `SP1/005` **Then** (CARD-037 reads `SP1` as form (d)) the lookup is `not-found` and the token is an `UNKNOWN_PRINTING` error, other groups still import (whether Riot's collector numbers match an `SP<n>` code is an Open question). **Given** a version-7 header **Then** `DECK_CODE_INVALID` (forced format).

49. **Riot text labels with bold marks** (IMP-016, 011 (4); v0.14, H-166; official) **Given** the paste `**Legend:**` / `1 Kennen, Heart of the Tempest` / `**Champion:**` / `1 Kennen, Storm of Shuriken` / `**Main Deck**:` / `3 Gust` / `Rune Pool:` / `9 Chaos Rune` / `**Sideboard:**` / `2 Decree of Unity` **When** parsed **Then** format is `riot-text`, the sections are legend, champion, main, runes, sideboard, none of the label lines is an entry or an error, and the five entries resolve as in the unmarked list. **Given** a line `*Gust*` **Then** it is not a section label and is `MISSING_QUANTITY`.

50. **SAMPLE printings are left out** (IMP-077; v0.15, H-197; RJ 2026-11-25; **BLOCKED on SPEC-001 CARD-044**: runs on test data that carries a marker; with no marker in the catalog nothing is left out and nothing is guessed) Uses fixture F1 plus a hypothetical `Lightning Rush` printing `p_lr_smp` (`RAD` collector number `999`, marked SAMPLE; invented) next to the real `p_lr_001`, and a hypothetical card `Promo Only Card` whose only printing is marked SAMPLE. **Given** `3 Lightning Rush` **Then** it resolves (`exact`) and counts 3, unaffected. **Given** `2 Lightning Rush RAD 999` **When** parsed **Then** the code is `not-found`: the line resolves by name to `Lightning Rush`, warning `UNKNOWN_PRINTING`, `byPrinting` has no `p_lr_smp`, `quantity` 2. **Given** the code-only line `2 RAD 999` **Then** error `UNKNOWN_PRINTING`, the line is left out. **Given** `1 Promo Only Card` **Then** `UNKNOWN_CARD` with no suggestion for it (proposal (d)). **Given** a commit and then the CSV export **Then** no row names the SAMPLE printing. **Given** the same lines with no marker in the catalog **Then** `RAD 999` is looked up like any code (a set code or number is never read as SAMPLE).

## Out of scope
- Deck legality, bans, copy limits (SPEC-002). Deck lists the user wants to build: [[Deck Import]] (SPEC-006). Per-card owned/required display: [[Your Decks Ownership View]] (SPEC-005). Tags, sorting and filtering of owned cards: [[My Collection]] (SPEC-007).
- Curated alias tables or any card data source other than the Riot API ([[ADR-0005 MVP Product Defaults]] #4).
- Pixelborn codes (Pixelborn reportedly shut down 2025-08-07; low priority per research).
- Camera scanning and price data ([[Product Vision]] "Later"). Accounts and cloud sync are **not** later: they are in scope and specified by SPEC-010 ([[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2)).
- Importing from third-party sites by URL or API (would conflict with IMP-005 / [[Riot Developer Rules]] #7).
- Condition, language, foil-vs-nonfoil tracking beyond the printing key.

## Open questions / BLOCKED
- **Needs RJ (low, v0.14.1, H-501), built wording, not a requirement:** the review step of Owned Cards Import ("Add to your collection", the step after Continue, IMP-063) opens with the heading **`Check the cards`** (`REVIEW_TEXT.check` in `web/src/app/shared/import/import-dialog.ts`, H-469). It is the builder's own wording; this spec words no other string of the review step (the build's `REVIEW_TEXT` has more, e.g. `Check these:`, `Ready: …`, not adopted here). Behaviour as built and validated ([[Validation H-469]], PASS, as of 2026-11-26): Continue moves focus to this heading (never to the page body), and a mouse Continue shows no focus ring while a keyboard Continue does. RJ to confirm or reword the heading; the focus behaviour is the same as in the Deck Import review ([[Deck Import]] DECK-099 `check`, "Check the deck"), where it is built and validated (H-450).
- **Resolved (H-166, v0.14; community, as of 2026-11-24)** — Piltover set table to RAD (`0 OGN … 6 RAD`, `ARC` = Arcane Box Set), variant letters (none, `a`, `s` or `*`, `b`), the `SP` prefix and code versions V1…V6 (IMP-031…033, [[Collection Import Formats]] fact 7, npm 1.5.0). The source is a community library, not Riot; the spec keeps it labelled so.
- **BLOCKED: needs research (H-020)** — whether Riot API printings carry the same suffix letters as Piltover codes and TTS art numbers, and whether their collector numbers match an `SP<n>` code (`SP1` vs `SP1/005`); depends on how the official API represents variants (unknown per [[Card Data & Images]]).
- **BLOCKED: needs research** — real sample deck codes with known contents for test fixtures (AC 16, AC 48), and which section tag V3…V6 groups (chosen champion, runes, additional legends) carry (IMP-031, SPEC-006 DECK-039).
- **Open (v0.14)** — TTS art number 3 or more, and art above 1 on a number that already has a letter, have no documented mapping (IMP-036a): they resolve by the number as written with `VARIANT_UNMAPPED`. Check against a real TTS export once one is available (the Riftseer mod page documents no importer syntax).
- **Open (v0.14)** — a bold label with an entry on the same line (`**Champion:** 1 Kennen`) is not covered by [[Collection Import Formats]] fact 9 (it shows labels alone on their line); IMP-016 strips marks on label-only lines and IMP-023 is unchanged for the unmarked `Champion: 1 Kennen`.
- **BLOCKED: needs research** — exact CSV column sets for TCGplayer, Moxfield, Deckbox, Dreamborn exports, and the Riftbound Play Network "Export → TXT" layout (IMP-023, IMP-046). Under the positional row rule (IMP-040) exports that put the name before the quantity do not import.
- **Resolved (H-043)** — RJ decision 2026-11-23: every line needs a quantity (IMP-021), `.xlsx` uploads (IMP-001, IMP-061), positional CSV/Excel rows with title-row skipping (IMP-040, IMP-041, IMP-043), label spacing (IMP-016/017), one paste-or-upload dialog with editable text (IMP-062, IMP-063), and CSV/Excel for decks too (Part A preamble, SPEC-006 DECK-011).
- **Resolved (H-048)** — RJ decision 2026-11-23: `x3 Name` and `Name x3` (also `X`) are accepted, IMP-020 is a MUST; `Name` alone stays `MISSING_QUANTITY`. Printing codes on a line (IMP-064…070) identify the exact printing.
- **Needs RJ (low)** — IMP-068 policy chosen by spec-writer: two exact identifications that disagree → needs review; an unrecognized name with a found code → the code's card with a warning. RJ may prefer "always needs review".
- **Needs research (low)** — set codes are matched as exactly 3 letters (RJ's brief). Promo set codes such as `PR` (2 letters, SPEC-001 open question 6) would not be read as codes; confirm against the live payload (H-020) which set codes the API uses.
- **Resolved (H-045)** — RJ decision 2026-11-23: the collection CSV export has no Tags column (SPEC-007 COLL-059 withdrawn; tags are expected to survive through sign-in sync, [[ADR-0007 Firebase Accounts and Firestore]]) and writes printing codes so `byPrinting` round-trips (IMP-055, Collection CSV export rules, AC 35). Spec-writer chose: code inside the name cell as `<SET> <NUM>`, missing-printing copies written name-only.
- **Open** — separate set and collector-number cells in CSV/Excel are still not read (IMP-040, IMP-044); revisit with IMP-046 once real export files exist.
- **Open (H-053, v0.8)** — IMP-042's delimiter rule (`;` or tab outside quotes beats `,`) is RJ's **interim** rule of 2026-11-23; revisit with IMP-046 once real export files exist.
- **Resolved (v0.8)** — RJ decision 2026-11-23: UI messages use the straight apostrophe `'` (house style in IMP-061; IMP-010, IMP-061, AC 15a and AC 38 quote it). The shipped messages were changed to match (H-049 follow-up).
- **Community, one tool's reading (H-166, v0.14)** — the TTS trailing number is an art number, not a copy count; each token is one copy (IMP-036, IMP-036a, fact 8). The Riftseer TTS mod page documents no importer syntax, so this is not confirmed by the mod itself.
- **Unverified (H-022 fact 10)** — CSV and TXT export samples from TCGplayer and others: not obtainable from public sources; no column set is specified (IMP-046).
- **Resolved (v0.11)** — storage is account-only (IMP-053, SPEC-010: the account is the record of truth, the browser holds a cache; RJ 2026-11-24, ADR-0007 amendment 2; the MVP's browser-only storage and the two modes are gone) and variants count as the same card (IMP-048, former A3): [[ADR-0005 MVP Product Defaults]].
- **Resolved** — A1: name key = SPEC-001 CARD-030 `nameKey`, ownership by `cardKey`. Side effects noted: hyphen/spacing differences fall to fuzzy suggestions (AC23); the comma-prefix check in IMP-029 uses canonical names.
- **Bound** — A2: printing lookup is SPEC-001 CARD-036 (MUST in SPEC-001 v0.2) with its collector-number normalization. The suffix → `variant.kind` part stays BLOCKED with CARD-040; the letter only narrows printings (IMP-033, IMP-036a).
- **Open** — whether parsing runs in the Angular app or the API is an implementation choice; with the collection cached on the device and the catalog needed for resolution, it likely belongs in shared TypeScript ([[ADR-0001 Tech Stack]]). Not decided here.
- **Open** — fuzzy thresholds (0.85 / 0.60 / 0.05 margin) are initial values; tune against real typo samples.
- **Needs RJ (low, v0.10, H-087)** — the commit landing and Undo snack bar (IMP-072, IMP-073, IMP-075) are RJ-approved (brief rev 3). Spec-writer defaults still to confirm: (a) the notice stays **10 seconds** (IMP-074); (b) once it has gone there is **no other Undo entry point**, so keyboard and screen-reader users have only that window. Recommended alternative if RJ wants more: a persistent "Undo last import" action on Collection while the IMP-052 snapshot exists (new UI, would need a brief change and its own requirement); (c) Cancel re-shows the notice (IMP-075 (c)).
- **Resolved (v0.9)** — RJ decision 2026-11-24: runes are imported and exported like any card (IMP-071); SPEC-009 withdrawn.
- **Needs research (H-099, needs H-020)** — whether rune cards in the Riot API have their own printings with set codes and collector numbers (and foil / alt-art rune printings, [[Physical Copies Across Decks]] fact 11), so a rune line with a printing code (IMP-064) can resolve to one. Until then AC 42 uses name-only lines.

- **BLOCKED: needs research (H-020), v0.15** — the SAMPLE marker (SPEC-001 CARD-044): field name, type and API source. IMP-077 acts only once it exists; until then no printing is left out.
- **Needs RJ (v0.15, proposals in IMP-077 (c), (d))** — RJ said SAMPLE printings are "left out entirely"; he did not say what a **code** that names one, or a **card that exists only as SAMPLE**, should show. Proposed: the code is "not in the card data" (the existing `UNKNOWN_PRINTING`), the card-only-as-SAMPLE name is `UNKNOWN_CARD`; no new wording. Alternative: a SAMPLE-specific message ("SAMPLE cards aren't imported"), which is new wording and needs RJ.
- **Open (v0.15)** — a collection saved **before** the marker exists could already hold a SAMPLE printing as an ordinary one (nothing was left out then). Not specified: whether the first catalog with the marker removes or ignores such copies. See [[My Collection]] Open question 17.

## Changelog
Current: 0.15 (2026-11-26, H-197, RJ 2026-11-25 H-193 answers "Sample cards are NOT legal" / "we can just leave them out entirely"): new IMP-077 (SAMPLE printings left out of matching, import, counts and export; no marker defined yet, nothing guessed; the code and only-SAMPLE-card readings are **proposals**, no new wording), AC 50; Summary bullet; two Open questions and one BLOCKED line; no existing rule changed; SPEC-001 CARD-044 unchanged (it already reserves the marker and points to the consuming specs); build H-640 (blocked on H-020). Previous: 0.14.1 (2026-11-26, H-501, text catch-up to the build after H-469: the Owned Cards review heading "Check the cards" is recorded as the builder's wording, RJ to confirm (Open questions); no requirement, AC or data shape changed; status stays `draft`). Previous: 0.14 (2026-11-25, H-166, [[Collection Import Formats]] facts 7 to 9: IMP-036 the TTS trailing number is an art number, not a copy count (community, one tool's reading), new IMP-036a art number to printing (1 base, 2 = suffix `a`, higher unmapped with `VARIANT_UNMAPPED`), IMP-038 / IMP-039 reworded; IMP-031 code versions V1…V6, IMP-032 set table to RAD (`4 UNL`, `5 VEN`, `6 RAD`, `ARC` = Arcane Box Set), IMP-033 variant letters none / `a` / `b` / `s` or `*` and the `SP` prefix (all community, npm 1.5.0); IMP-016 strips `*` and a trailing `:` from labels (official); IMP-011 (3) wording; ACs 11, 16, 17, 18 reworded, ACs 47 to 49 new; BLOCKED list and Open questions updated; CSV / TXT export samples stay unverified, no columns added; pin SPEC-001 0.4.1). Previous: 0.13 (2026-11-25, H-165, RJ decision 2026-11-25: IMP-025 uses the SPEC-001 name lookup (exact, then the optional leading "a" / "the" rule of CARD-034), new `method: "article"`, ambiguous articles are `needs-review` / `AMBIGUOUS_NAME`; IMP-059 reworded (no curated alias table, generic rule); AC 24 rewritten (`Dreaming Tree` now resolves); pin SPEC-001 0.4 unchanged; depends on SPEC-001 `review`). Previous: 0.12 (2026-11-25, H-174, RJ 2026-11-24 header decision / gate H-178: IMP-060 is the "Add to your collection" entry point (FAB on Collection, empty-state button, `/collection?add=1`; no import page, `/import` goes to Home); IMP-072 a commit stays on `/collection` (no navigation); IMP-076 gate note names the Collection page; Purpose / Summary wording; ACs 26, 43 reworded, AC 46 new; no parsing rule changed; pins SPEC-010 0.14). Previous: 0.11 (2026-11-24, H-171, ADR-0007 amendment 2: account-only; IMP-053 and IMP-076 reworded without modes; IMP-075 (d) no longer names COLL-074; pins SPEC-008 0.4.4). Previous: 0.10.1 (2026-11-25, H-160). Earlier: 0.10 (2026-11-24, H-087: IMP-072…075 where a commit lands, the Undo snack bar, its lifetime and behaviour; ACs 43–45). Earlier: 0.9.1 (2026-11-24, H-071: IMP-053 "browser by default, synced when signed in", SPEC-010). Full history: [[Collection Import changelog]] (archived). New entries go in the archive note.
