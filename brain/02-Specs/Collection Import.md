---
tags: [spec]
id: SPEC-003
version: 0.2
status: draft
depends_on: [SPEC-001]
related: ["[[Deck Import]]", "[[My Collection]]", "[[Your Decks Ownership View]]", "[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
research: ["[[Collection Import Formats]]", "[[Card Data & Images]]", "[[Sets]]", "[[Deck Construction Rules]]"]
as_of: 2026-11-23
---
# SPEC-003: Collection Import

## Purpose
Let a user bring the cards they **own** (scanned, or kept in another app) into the app. This spec is the
**Owned Cards Import** option on the Import screen ("List of cards and their quantity you own",
[[Design Direction]]). An import produces a **collection** (owned count per card), not a deck: section
labels, deck structure, and legality are irrelevant here. The committed collection is what
[[My Collection]] (SPEC-007) lists and what [[Your Decks Ownership View]] (SPEC-005) uses to show which
cards of each imported deck the user owns ([[ADR-0006 Two Imports - Collection and Decks]]).

**Scope: owned cards only.** Deck lists the user wants to build (the **Deck Import** option card) are
[[Deck Import]] (SPEC-006). The requirements are split in two parts:
- **Part A, shared parsing (reused by SPEC-006):** input handling, format detection, line/token/row
  parsers, name resolution, fuzzy suggestions, and error reporting. SPEC-006 references these IDs
  instead of redefining them.
- **Part B, collection-specific:** merging into My collection, Add vs Replace, undo, storage.

The import is a three-step flow: **parse → preview → commit**. Parsing never changes the stored
collection. The user reviews resolved lines, suggestions, and errors, then commits as **Add** or **Replace**.

Research basis: [[Collection Import Formats]] (status `unverified`, as of 2026-11-23). There is no
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
- **Printing code**: the public code `SET-NNN[variant]` (e.g. `OGN-007a`) or TTS token read from the
  input. *A2 bound (v0.2):* a printing code resolves to a SPEC-001 printing (`printingId`) through the
  set + collector-number lookup **CARD-036 (MUST)**, using the set-code and collector-number
  normalization defined there. This spec does not define its own padding or case rules.
- **Card catalog**: the card list from SPEC-001, sourced only from the Riot API (`riftbound-content-v1`),
  identified by its `catalogVersion` (defined in SPEC-001). All resolution is against this catalog; no
  other card source, community database, or curated alias table is used ([[Riot Developer Rules]] #7;
  [[ADR-0005 MVP Product Defaults]] #4). Import uses only `name`, `cardKey`, `setCode`,
  `collectorNumber`, `printingId` and `variant`; SPEC-001's nullable gameplay attributes play no role here.
- **Collection**: map of `cardKey` → owned count, plus optional per-printing counts (by `printingId`)
  when the source identified printings.
- **Source format**: one of `riot-text`, `plain-text`, `piltover-code`, `tts`, `csv`.
- **Entry**: one parsed (quantity, card reference) pair, from one line, one TTS token, one deck-code
  card group, or one CSV row.
- **Similarity**: `1 − d / max(len(a), len(b))` where `d` is the Damerau–Levenshtein distance between
  the name keys of two names. Range 0..1. (Behavioral contract for thresholds; the algorithm library is an
  implementation choice.)

## Requirements

### Part A: Shared parsing (reused by SPEC-006 [[Deck Import]])
Every requirement in Part A is **shared parsing, reused by SPEC-006**. Its output is an `ImportResult` with per-line sections kept; it never merges into or writes to any store. SPEC-006 cites these IDs and adds only deck-specific rules.

#### General parsing flow *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-001 | MUST | Accept input either as pasted text or as an uploaded file (`.txt`, `.csv`). | [[Product Vision]] core loop step 1 |
| IMP-002 | MUST | Parsing produces an `ImportResult` (see Data contract) and has no side effects: it MUST NOT modify any stored data. Only an explicit user **commit** writes (owned cards: IMP-049; decks: SPEC-006). | design decision |
| IMP-003 | MUST | Imports are tolerant: one bad line never aborts the import. Every unparseable or unresolved entry is reported with its location; all other entries remain importable. | design decision |
| IMP-005 | MUST | Raw import text and files MUST NOT be sent to any third party. Resolution runs only against our own card catalog. | [[Riot Developer Rules]] #7 |

#### Input limits *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-006 | MUST | Reject input larger than **1 MiB** (UTF-8 bytes) or with more than **10,000 lines** with a single input-level error `INPUT_TOO_LARGE`; nothing is parsed. | design decision. A full collection, one line per printing in the Riot API catalog (SPEC-001), fits easily: the community count is roughly 1,451 printings incl. promos ([[Card Data & Images]] #13, approximate, excludes RAD), i.e. well under 10,000 lines. |
| IMP-007 | MUST | A line longer than **500 characters** is reported as `LINE_TOO_LONG` and skipped (except a CSV row, limit 2,000). | design decision |
| IMP-008 | MUST | Quantity per entry must be an integer **1..999**. `0` → warning `ZERO_QUANTITY`, entry skipped. Negative, non-integer, or >999 → error `BAD_QUANTITY`. | design decision |
| IMP-009 | SHOULD | After merging, a count above **9,999** for one `cardKey` is capped with error `TOTAL_TOO_LARGE`. | design decision |
| IMP-010 | MUST | Input is decoded as UTF-8; a leading BOM is stripped; `\r\n`, `\r` and `\n` are all line breaks. Invalid UTF-8 → `INPUT_ENCODING` error. | design decision |

#### Format auto-detection *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-011 | MUST | Detect the source format automatically, checking in this order, first match wins: (1) **csv** if the file name ends `.csv`, or the first non-blank line contains a comma, semicolon or tab **and** contains a recognized name-column header (IMP-040); (2) **piltover-code** if the trimmed input is a single whitespace-free token of the base32 alphabet (`A–Z`, `2–7`, case-insensitive) that **decodes successfully** per IMP-031; (3) **tts** if every non-blank whitespace-separated token matches `^[A-Za-z]{2,4}-\d{1,3}[a-z]?-\d+$`; (4) **riot-text** if any line is a section label (IMP-016); (5) otherwise **plain-text**. | [[Collection Import Formats]] |
| IMP-012 | MUST | Report the detected format and a confidence reason (e.g. "found section label `Main Deck` on line 3") in the result. | design decision |
| IMP-013 | MUST | The user can override the detected format and re-parse. | design decision |
| IMP-014 | SHOULD | If (2) or (3) partially match (e.g. most tokens look like TTS but some don't), fall back to plain-text and add info `FORMAT_AMBIGUOUS` naming the alternative. | design decision |
| IMP-015 | MAY | Support several deck codes, one per line, as one piltover-code import. | design decision |

#### Text formats (riot-text and plain-text) *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-016 | MUST | Recognize section labels case-insensitively, with optional leading Markdown heading marks (`#`…) and an optional trailing colon: `Legend`, `Champion`, `Main Deck`, `Battlefields`, `Rune Pool`, `Sideboard`. | [[Collection Import Formats]] fact 1 (official) |
| IMP-017 | SHOULD | Also accept the aliases `Runes`, `Rune Deck`, `Main`, `Battlefield`, `Legends`, `Champions` (used in our own decklist notes and the Core Rules' "Rune Deck" term). | [[Deck Construction Rules]] fact 1, our `01-Research/Decklists/` notes |
| IMP-018 | MUST | Section labels are **not** entries. The parser records the section on each `ParsedLine` and does not merge across sections. Owned-card import then merges all sections into owned counts (IMP-047), so sectioned Riot-style deck text is accepted for owned cards; a card in both Main Deck and Sideboard (e.g. `1 An Offer You Can't Refuse` twice in the ASC Evansrhim list) sums to 2. SPEC-006 keeps the sections. | design decision; task brief |
| IMP-019 | MUST | Entry grammar per line: optional whitespace, quantity (digits), optional `x`/`X` immediately after the digits or separated by a space, at least one whitespace, then the card name to end of line, trimmed. Accept `3 Lightning Rush`, `3x Lightning Rush`, `3 x Lightning Rush`, `3X Lightning Rush`. | [[Collection Import Formats]] (plain `<qty> <name>`); task brief (`<qty>x`) |
| IMP-020 | SHOULD | Accept `x3 Lightning Rush` and `Lightning Rush x3` as the same entry. | design decision (not research-backed; harmless) |
| IMP-021 | SHOULD | A line that is a card name with no quantity is treated as quantity 1 with warning `QUANTITY_ASSUMED`. | design decision |
| IMP-022 | MUST | Ignore blank lines (Piltover Archive text separates groups by blank lines) and comment lines starting with `//` or `#` that are not section labels. | [[Collection Import Formats]] (Piltover Archive text) |
| IMP-023 | MAY | If a label line also carries an entry (`Champion: 1 Kennen, Storm of Shuriken`), parse the remainder as an entry. | design decision; Play Network export layout is **unconfirmed** |
| IMP-024 | MUST | Lines that are neither label, comment, blank, nor a valid entry produce error `UNPARSEABLE_LINE` with the line number and raw text. | design decision |

#### Name resolution and fuzzy matching *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-025 | MUST | Resolve each name by computing `nameKey` (CARD-030) and looking it up in the catalog's `cardKey`s. An exact match resolves with `confidence: 1` and `method: "exact"`, with no user action needed. Anything else (including spacing/hyphen differences such as `Star Crossed` vs `Star-Crossed`, whose keys differ under CARD-030) is not exact and goes to fuzzy suggestions (IMP-026). | [[Collection Import Formats]] ("matching by name covers everything"); [[Card Data Model]] CARD-030, CARD-033 |
| IMP-026 | MUST | When there is no exact match, compute fuzzy candidates and classify each by similarity: **high ≥ 0.85**, **low 0.60–0.85**, below 0.60 discarded. Return at most **3** suggestions, sorted by similarity desc, then name asc. | design decision |
| IMP-027 | MUST | A fuzzy match is **never** applied automatically. Every non-exact entry stays `status: "needs-review"` until the user picks a suggestion, types a different name, or drops the entry. Uncommitted needs-review entries are not imported. | task brief; design decision |
| IMP-028 | SHOULD | Pre-select the top suggestion only when it is high-confidence **and** leads the next candidate by ≥ 0.05. The UI MAY offer "Accept all pre-selected" as one explicit user action. Low-confidence suggestions are never pre-selected. | design decision |
| IMP-029 | MUST | A name that is a **prefix of several** catalog names up to the comma subtitle (e.g. `Kennen` matching `Kennen, Heart of the Tempest` and `Kennen, Storm of Shuriken`) is `AMBIGUOUS_NAME`: list all of them (up to 3, then "+N more") as suggestions with none pre-selected. The check uses the **canonical names** from the catalog: split each canonical name at its first `,`, apply `nameKey` to the part before it, and compare with the input's `nameKey`. (It cannot be done on `cardKey`, because CARD-030 removes commas.) Different subtitles are different cards ([[Deck Construction Rules]] fact 5). | [[Deck Construction Rules]] fact 5; [[Card Data Model]] CARD-030 |
| IMP-030 | MUST | Entries with no candidate ≥ 0.60 get error `UNKNOWN_CARD` with no suggestions; the user may type a replacement name or drop it. | design decision |
| IMP-059 | MUST | No curated alias table. A name resolves only by exact `nameKey` match against the Riot-sourced catalog (IMP-025) or by a fuzzy suggestion the user explicitly confirms (IMP-027). Known spelling differences (e.g. `Dreaming Tree` vs `The Dreaming Tree`) are handled the same way. | [[ADR-0005 MVP Product Defaults]] #4 |

#### Piltover Archive deck codes *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-031 | MUST | Decode per the open Apache-2.0 `@piltoverarchive/riftbound-deck-codes` format: base32 string; header nibble = format/version; VarInt arrays grouped by copy count; card code = 3-char set + 3-digit number + optional variant letter. Accept V1 and V2 (V2, from 2025-11-20, adds a sideboard). The decoder tags each card with section `main` or `sideboard`; owned-card import merges them (IMP-047). | [[Collection Import Formats]] fact 3 & table |
| IMP-032 | MUST | Map set indexes with the table from v1.0.0: `0 = OGN`, `1 = OGS`, `2 = ARC`, `3 = SFD`. Any other index → error `UNKNOWN_SET_INDEX` for that card group (other groups still import). **BLOCKED: needs research** for UNL, VEN, RAD indexes and what `ARC` is (not in [[Sets]]). | [[Collection Import Formats]] table |
| IMP-033 | MUST | Resolve decoded cards by printing code via CARD-036, then count them toward the printing's `cardKey`. **BLOCKED: needs research** — meaning of variant letters `a`/`s`/`b` and their mapping to Riot API printings (SPEC-001 CARD-040). Until resolved, a variant letter that cannot be mapped resolves by set+number without variant and adds warning `VARIANT_UNMAPPED`. | [[Collection Import Formats]]; [[Card Data Model]] CARD-036 |
| IMP-034 | MUST | A code that fails to decode (bad alphabet, truncated VarInt, unknown version) → input-level error `DECK_CODE_INVALID`; since detection requires a successful decode, this only occurs when the user forces the format. | design decision |
| IMP-035 | MUST | Error locations for deck codes are reported as `line` = the code's line and `token` = the zero-based card group index. | design decision |

#### Tabletop Simulator tokens *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-036 | MUST | Split input on any whitespace; each `SET-NUMBER-COPY` token represents **one physical copy** (e.g. `OGN-265-1 OGN-265-1` = 2 copies of OGN-265). The trailing `COPY` number is not a count and is ignored. | [[Collection Import Formats]] table (TTS) |
| IMP-037 | MUST | Normalize the set code and collector number as CARD-036 defines (e.g. `ogn` → `OGN`, [[Sets]]: "Ven" vs VEN), then resolve via CARD-036. Unknown set/number → `UNKNOWN_PRINTING` with location `line` + `token` index. | [[Sets]]; [[Card Data Model]] CARD-036 |
| IMP-038 | SHOULD | Identical tokens are merged before resolution so each distinct printing is reported once with its total. | design decision |
| IMP-039 | MUST | A token that doesn't match the TTS pattern (when the user forced `tts`) → `UNPARSEABLE_TOKEN`. | design decision |

#### CSV *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-040 | MUST | **Header detection:** the first non-blank row is the header if, after trimming, lower-casing, and collapsing whitespace/underscores, any cell equals a **name alias**: `name`, `card name`, `card`, `cardname`, `product name`. Optional columns by alias: **quantity** `quantity`, `qty`, `count`, `amount`, `owned`; **set** `set`, `set code`, `set id`; **number** `collector number`, `number`, `card number`, `no`; **variant** `variant`, `printing`. First matching column wins per role. | [[Collection Import Formats]] fact 5 (card-name column is the minimum) |
| IMP-041 | MUST | If no name column is recognized, return input-level error `CSV_NO_NAME_COLUMN` listing the header cells, and the UI MUST let the user pick the name column (and optionally the quantity column) and re-parse. | design decision |
| IMP-042 | MUST | Parse RFC 4180 CSV (double-quoted fields may contain the delimiter, e.g. `"Kennen, Storm of Shuriken"`; `""` escapes a quote). Delimiter = the one of `,` `;` `\t` that occurs most in the header row outside quotes. | design decision; names contain commas ([[Collection Import Formats]] table) |
| IMP-043 | MUST | Missing quantity column → every row counts 1. Empty quantity cell → 1 with warning `QUANTITY_ASSUMED`. Non-integer → `BAD_QUANTITY`. | task brief |
| IMP-044 | SHOULD | When set + number columns are present and resolve to a printing via CARD-036, prefer the printing over the name; if the printing's `cardKey` disagrees with the name cell's `nameKey`, use the printing and warn `NAME_PRINTING_MISMATCH`. | [[Collection Import Formats]] summary (set + number is more precise); [[Card Data Model]] CARD-036 |
| IMP-045 | MUST | Error locations for CSV are `line` (1-based physical line of the row) and `column` (header name). Rows with an empty name cell → `EMPTY_NAME`. | design decision |
| IMP-046 | SHOULD | Recognize TCGplayer, Moxfield, Deckbox, and Dreamborn CSV exports by their headers. **BLOCKED: needs research** — exact column sets not verified; needs real sample files. Until then they work through the generic aliases above. A `tcgplayer_id` column MAY be used once SPEC-001 carries TCGplayer IDs from an allowed source. | [[Collection Import Formats]] fact 5 & 6 |

#### Error reporting *(shared parsing, reused by SPEC-006)*
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-056 | MUST | Each issue carries: severity (`error` / `warning` / `info`), a stable `code`, a human message, and a location (`line`, plus `column` for CSV or `token` for TTS/deck code), and the raw text excerpt (max 120 chars). Line numbers are 1-based physical lines of the original input. | task brief |
| IMP-057 | MUST | The result includes a summary: lines read, entries parsed, resolved exact, needs review, errors, distinct names, total copies. | design decision |

### Part B: Collection-specific (Owned Cards Import only)
These requirements apply only to the Owned Cards Import. SPEC-006 defines its own behaviour for these concerns.

#### Scope and consumers
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-004 | MUST | Owned-card import MUST NOT check deck legality or bans. A banned card (e.g. `Nocturne, Horrifying`, banned as of 2026-11-23) is imported like any other owned card. Legality (format `standard`) is SPEC-002's concern. | [[Deck Construction Rules]], [[Ban List]] |
| IMP-058 | MUST | The committed collection is the single source of ownership for [[My Collection]] (SPEC-007) and for the ownership view in [[Your Decks Ownership View]] (SPEC-005). Ownership is looked up by `cardKey` only (owned count = `cards[cardKey].quantity`, 0 if absent); `byPrinting` never affects ownership. | [[ADR-0006 Two Imports - Collection and Decks]]; [[ADR-0005 MVP Product Defaults]] #2; [[Card Data Model]] CARD-013 |
| IMP-060 | MUST | This flow starts from the **Owned Cards Import** option card on `/import` ("List of cards and their quantity you own"). The **Deck Import** option card starts SPEC-006 and never writes to the collection. | [[Design Direction]] RJ feedback 2026-11-23; [[ADR-0006 Two Imports - Collection and Decks]] |

#### Merging, variants, commit
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-047 | MUST | All resolved entries are merged by **`cardKey`**: owned count = sum of quantities across lines, sections, tokens, and rows. Each merged card lists the source line numbers that contributed. | task brief; [[Deck Construction Rules]] fact 5; [[Card Data Model]] CARD-013 |
| IMP-048 | MUST | Variants and printings (alt-art, Showcase, signature, foil, and overnumbered, i.e. `variant.kind === 'overnumbered'`) that share a name count toward the **same `cardKey`**. When the source identified the printing (deck code, TTS, CSV with set+number), the per-printing count (by `printingId`) is also kept; it is for display in [[My Collection]] only and never affects ownership. **Confirmed** by RJ ([[ADR-0005 MVP Product Defaults]] #2). | [[Deck Construction Rules]] fact 5; [[ADR-0005 MVP Product Defaults]]; [[Card Data Model]] CARD-013, CARD-043 |
| IMP-049 | MUST | Commit requires an explicit choice of mode: **Add** (owned += imported, per `cardKey` and per printing) or **Replace** (the collection becomes exactly the imported set). Default selection is **Add**. | design decision (see Rationale) |
| IMP-050 | MUST | **Replace** shows a confirmation stating how many cards and names will be removed or changed before it executes. | design decision |
| IMP-051 | SHOULD | The preview shows the resulting diff per name (before → after) for the selected mode. | design decision |
| IMP-052 | SHOULD | Keep the previous collection snapshot so the last commit can be undone once. | design decision |

#### Storage (MVP)
| ID | Level | Requirement | Source |
|---|---|---|---|
| IMP-053 | MUST | For the MVP, the collection is stored **locally in the user's browser**, with no account or server-side copy. Access goes through a `CollectionStore` interface so a server/account store can replace it later without changing import behavior. **Confirmed** by RJ ([[ADR-0005 MVP Product Defaults]] #1). | [[ADR-0005 MVP Product Defaults]]; [[ADR-0001 Tech Stack]] (storage behind interfaces) |
| IMP-054 | MUST | The stored record carries `schemaVersion`, `updatedAt`, and the `catalogVersion` (SPEC-001) it was resolved against, so a later catalog/name-key change can trigger re-resolution. | design decision; [[Card Data Model]] |
| IMP-055 | SHOULD | The user can export the stored collection as CSV (`Card Name,Quantity[,Set,Collector Number,Variant]`) that round-trips through this importer. | design decision (backup, since local storage can be cleared) |

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
  line: number;             // 1-based physical line in the original input
  column?: string;          // CSV header name
  token?: number;           // 0-based token (TTS) or card-group index (deck code)
}

type IssueCode =
  | 'INPUT_TOO_LARGE' | 'INPUT_ENCODING' | 'LINE_TOO_LONG'
  | 'UNPARSEABLE_LINE' | 'UNPARSEABLE_TOKEN'
  | 'BAD_QUANTITY' | 'ZERO_QUANTITY' | 'QUANTITY_ASSUMED' | 'TOTAL_TOO_LARGE'
  | 'UNKNOWN_CARD' | 'AMBIGUOUS_NAME' | 'FUZZY_MATCH'
  | 'UNKNOWN_PRINTING' | 'UNKNOWN_SET_INDEX' | 'VARIANT_UNMAPPED' | 'NAME_PRINTING_MISMATCH'
  | 'DECK_CODE_INVALID' | 'CSV_NO_NAME_COLUMN' | 'EMPTY_NAME'
  | 'FORMAT_AMBIGUOUS';

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

interface ParsedLine {
  location: SourceLocation;
  raw: string;
  section?: RiotSection;      // riot-text only; display only
  quantity: number;
  inputName?: string;         // as typed (text/CSV)
  inputPrinting?: PrintingCode;// TTS/deck code/CSV set+number
  status: LineStatus;
  resolved?: {
    cardKey: CardKey;
    displayName: string;
    printingId?: PrintingId;
    method: 'exact' | 'printing' | 'user-choice';
    confidence: number;       // 1 for exact/printing
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

interface CsvColumnMap {
  name: string; quantity?: string; set?: string; number?: string; variant?: string;
}

interface ImportResult {
  format: SourceFormat;
  formatDetected: boolean;    // false when user overrode
  formatReason: string;       // IMP-012
  csvColumns?: CsvColumnMap;
  lines: ParsedLine[];
  merged: MergedCard[];       // owned-card import only (Part B); only 'resolved' lines
  issues: ImportIssue[];      // input-level issues
  summary: {
    linesRead: number; entriesParsed: number; resolvedExact: number;
    needsReview: number; errors: number; distinctNames: number; totalCopies: number;
  };
  catalogVersion: string;     // SPEC-001 catalogVersion the result was resolved against
}

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
  cards: Record<CardKey, { quantity: number; byPrinting: Record<PrintingId, number> }>; // ownership = quantity (IMP-058)
}

interface CollectionStore {   // MVP adapter: browser local storage (IMP-053)
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

3. **Plain lines with `x`** (IMP-019) **Given** `3x Stupefy`, `3 X Hextech Ray`, `2 Smoke Screen` **When** parsed **Then** format is `plain-text` and all three resolve exactly with quantities 3, 3, 2.

4. **Case and apostrophe folding is exact, not fuzzy** (IMP-025, CARD-030) **Given** `1 kai’sa, survivor` (curly apostrophe, lower case) **When** parsed **Then** it resolves to `Kai'Sa, Survivor` with `method: "exact"`, `confidence: 1`, status `resolved`.

5. **Typo → high-confidence suggestion, not auto-applied** (IMP-026, 027, 028) **Given** `3 Lightnig Rush` **When** parsed **Then** status is `needs-review`, issue `FUZZY_MATCH` on line 1, top suggestion `Lightning Rush` with `confidence: "high"` and `preselected: true`, and `merged` does **not** contain Lightning Rush until the user accepts.

6. **Low confidence never pre-selected** (IMP-026, 028) **Given** `2 Hextek Rai` **When** parsed and `Hextech Ray` scores between 0.60 and 0.85 **Then** it appears as a `low` suggestion with `preselected: false`.

7. **Ambiguous champion name** (IMP-029) **Given** `1 Kennen` **When** parsed **Then** issue `AMBIGUOUS_NAME`, suggestions include `Kennen, Heart of the Tempest` and `Kennen, Storm of Shuriken`, none pre-selected.

8. **Unknown card** (IMP-030, 056) **Given** line 4 is `2 Totally Fake Card` **When** parsed **Then** issue `{severity: "error", code: "UNKNOWN_CARD", location: {line: 4}}`, no suggestions, and the other lines still resolve.

9. **Banned card still imports** (IMP-004) **Given** `3 Nocturne, Horrifying` and `3 Rhasa the Sunderer` **When** parsed **Then** both resolve and are counted; no legality issue is produced.

10. **Unknown name without quantity, and bad quantities** (IMP-008, 021, 030) **Given** `Zzyxq Wombly` on line 2 (no catalog candidate ≥ 0.60), `-1 Gust` on line 3, `0 Gust` on line 4 **When** parsed **Then** line 2 → `UNKNOWN_CARD` with `QUANTITY_ASSUMED` warning and no suggestions, line 3 → `BAD_QUANTITY`, line 4 → `ZERO_QUANTITY` warning and skipped. (v0.1 used `Gust???!!`, which CARD-030 normalizes to `gust`, an exact match.)

11. **TTS tokens** (IMP-011, 036, 037, 038) **Given** `OGN-265-1 OGN-265-1 ogn-265-1` **When** parsed **Then** format is `tts`, one parsed printing `OGN-265` with quantity 3, counted toward the `cardKey` that CARD-036 resolves `OGN-265` to, and `byPrinting[<printingId of OGN-265>] = 3`.

12. **TTS unknown printing** (IMP-037) **Given** `OGN-265-1 OGN-999-1` **When** parsed **Then** token 1 → `UNKNOWN_PRINTING` at `{line: 1, token: 1}`; OGN-265 still imports ×1.

13. **CSV with header and quoted comma names** (IMP-040, 042) **Given**
    ```
    Card Name,Quantity
    "Kennen, Storm of Shuriken",2
    Gust,3
    Traveling Merchant,
    ```
    **When** uploaded as `my.csv` **Then** format `csv`, `csvColumns = {name: "Card Name", quantity: "Quantity"}`, results `Kennen, Storm of Shuriken ×2`, `Gust ×3`, `Traveling Merchant ×1` with `QUANTITY_ASSUMED` at `{line: 4, column: "Quantity"}`.

14. **CSV without quantity column** (IMP-043) **Given** header `name` and rows `Seal of Discord`, `Seal of Discord` **When** uploaded as `owned.csv` and parsed **Then** `Seal of Discord ×2`, source lines [2, 3].

15. **CSV without a name column** (IMP-041) **Given** header `foo,bar` **When** uploaded as `owned.csv` and parsed **Then** input-level error `CSV_NO_NAME_COLUMN` listing `foo`, `bar`, and no lines parsed; after the user maps `foo` → name, re-parse succeeds.

16. **Piltover deck code** (IMP-031, 032) **Given** a valid V2 code whose decoded cards are all in sets OGN/OGS/SFD **When** pasted **Then** format is `piltover-code`, main deck and sideboard counts are merged by `cardKey`. **BLOCKED: needs research** — no real code with known contents is in research yet; a fixture is required to make this criterion concrete.

17. **Deck code with an unmapped set** (IMP-032) **Given** a code containing a card group with set index 4 **When** pasted and parsed **Then** that group → `UNKNOWN_SET_INDEX` at `{line: 1, token: <group index>}`, other groups import.

18. **Variants merge by name** (IMP-048) **Given** a CSV with header `Card Name,Set,Collector Number,Variant,Quantity` and rows `Lightning Rush,OGN,<n>,,2` and `Lightning Rush,OGN,<n>,a,1` (set+number from SPEC-001 catalog) **When** uploaded and parsed **Then** `merged` has `Lightning Rush ×3` (one `cardKey`, `lightning rush`) with `byPrinting` showing both printings. If `a` cannot be mapped yet, both rows resolve to the base printing with `VARIANT_UNMAPPED` and the total is still 3.

19. **Add is default; Replace confirms** (IMP-049, 050) **Given** a stored collection `{Gust: 2, Abandon: 1}` and an import of `1 Gust` **When** committed with the default mode **Then** the collection is `{Gust: 3, Abandon: 1}`. **When** instead the user selects Replace **Then** a confirmation states "1 name removed (Abandon), 1 changed (Gust 2 → 1)" and only after confirming is the collection `{Gust: 1}`.

20. **Parsing is side-effect free** (IMP-002) **Given** any input **When** parsed but not committed and the page is reloaded **Then** the stored collection is unchanged.

21. **Size limit** (IMP-006) **Given** a 1.2 MiB paste **When** parsed **Then** a single `INPUT_TOO_LARGE` error, `lines` empty, nothing stored.

22. **Format override** (IMP-013) **Given** `OGN-265-1` detected as `tts` **When** the user forces `plain-text` **Then** it is re-parsed as a name-only line (`QUANTITY_ASSUMED`, then `UNKNOWN_CARD` or suggestions).

23. **Hyphen difference goes to fuzzy, not exact** (IMP-025, 026, 027; CARD-030) **Given** the catalog card `Star-Crossed` (hypothetical name, as in SPEC-001 AC5) and the input `2 Star Crossed` **When** parsed **Then** the keys `star crossed` and `starcrossed` differ, so the line is `needs-review` with a `high` suggestion `Star-Crossed` (similarity 1 − 1/12 ≈ 0.92), and it is not counted until the user accepts.

24. **No alias table** (IMP-059) **Given** `1 Dreaming Tree` and a catalog card `The Dreaming Tree` **When** parsed **Then** the line is `needs-review` with `The Dreaming Tree` as a suggestion (similarity ≈ 0.76, `low`, not pre-selected); nothing resolves it automatically.

25. **Ownership by cardKey for My collection and Your decks** (IMP-048, 058) **Given** a committed collection with `Lightning Rush` ×2 from printing A and ×1 from printing B **When** SPEC-005 asks the owned count for a deck that requires 3 `Lightning Rush` **Then** the owned count is 3 (`cards["lightning rush"].quantity`), and SPEC-007 can show the per-printing split 2 / 1.

26. **Deck Import never writes the collection** (IMP-060) **Given** a stored collection `{Gust: 2}` **When** the user pastes `3 Gust` into the **Deck Import** option instead of Owned Cards Import and saves the deck **Then** the collection is still `{Gust: 2}`.

## Out of scope
- Deck legality, bans, copy limits (SPEC-002). Deck lists the user wants to build: [[Deck Import]] (SPEC-006). Per-card owned/required display: [[Your Decks Ownership View]] (SPEC-005). Tags, sorting and filtering of owned cards: [[My Collection]] (SPEC-007).
- Curated alias tables or any card data source other than the Riot API ([[ADR-0005 MVP Product Defaults]] #4).
- Pixelborn codes (Pixelborn reportedly shut down 2025-08-07; low priority per research).
- Camera scanning, price data, accounts and cloud sync ([[Product Vision]] "Later").
- Importing from third-party sites by URL or API (would conflict with IMP-005 / [[Riot Developer Rules]] #7).
- Condition, language, foil-vs-nonfoil tracking beyond the printing key.

## Open questions / BLOCKED
- **BLOCKED: needs research** — Piltover deck-code set table beyond SFD (UNL, VEN, RAD), and what set `ARC` (index 2) is; check the latest `@piltoverarchive/riftbound-deck-codes` version (IMP-032).
- **BLOCKED: needs research** — meaning of Piltover variant letters `a`/`s`/`b` and how they map to Riot API printings (IMP-033); depends on how the official API represents variants (unknown per [[Card Data & Images]]).
- **BLOCKED: needs research** — real sample deck codes with known contents for test fixtures (AC 16).
- **BLOCKED: needs research** — exact CSV column sets for TCGplayer, Moxfield, Deckbox, Dreamborn exports, and the Riftbound Play Network "Export → TXT" layout (IMP-023, IMP-046).
- **Unverified** — TTS `COPY` suffix semantics; we treat each token as one copy per research (IMP-036).
- **Resolved** — MVP storage is browser only, no accounts (IMP-053) and variants count as the same card (IMP-048, former A3): [[ADR-0005 MVP Product Defaults]].
- **Resolved** — A1: name key = SPEC-001 CARD-030 `nameKey`, ownership by `cardKey`. Side effects noted: hyphen/spacing differences fall to fuzzy suggestions (AC23); the comma-prefix check in IMP-029 uses canonical names.
- **Bound** — A2: printing lookup is SPEC-001 CARD-036 (MUST in SPEC-001 v0.2) with its collector-number normalization. The variant-suffix part stays BLOCKED with CARD-040 (IMP-033).
- **Open** — whether parsing runs in the Angular app or the API is an implementation choice; with local-only storage and the catalog needed for resolution, it likely belongs in shared TypeScript ([[ADR-0001 Tech Stack]]). Not decided here.
- **Open** — fuzzy thresholds (0.85 / 0.60 / 0.05 margin) are initial values; tune against real typo samples.

## Changelog
- 0.2 (2026-11-23): Scope narrowed to owned cards (ADR-0006); deck lists move to SPEC-006 [[Deck Import]]. Requirements split into Part A shared parsing (reused by SPEC-006) and Part B collection-specific; purpose and links now point at [[My Collection]] (SPEC-007) and [[Your Decks Ownership View]] (SPEC-005), "Build Matching" removed. A1 resolved against CARD-030; ownership and merging by `cardKey`; IMP-029 comma-prefix check on canonical names; A2 bound to CARD-036 (MUST) and its normalization (IMP-033/037/044, no own zero-padding). IMP-048 and IMP-053 confirmed (ADR-0005). IMP-006 source now the Riot API catalog with the community count 1,451 as approximate; Riftcodex removed. IMP-002, IMP-018, IMP-031 reworded so the parser keeps sections and merging is collection-specific. IMP-011 decode reference IMP-030 → IMP-031. Data contract: `NameKey`/`PrintingKey` → `CardKey`/`PrintingCode`/`PrintingId`, `catalogVersion` from SPEC-001. AC10 rewritten with a genuinely unknown name; explicit **When** in ACs 10, 12, 14, 15, 17, 18, 21. Added IMP-058 (collection feeds SPEC-005/007, ownership by `cardKey`), IMP-059 (no alias table), IMP-060 (Owned Cards Import entry point); ACs 23–26. 60 requirements.
- 0.1 (2026-11-23): draft. Five formats, auto-detection, exact + fuzzy resolution, merge by name key, Add/Replace commit, local browser storage for MVP. 57 requirements (IMP-001…IMP-057).
