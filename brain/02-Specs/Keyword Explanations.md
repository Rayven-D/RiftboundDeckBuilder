---
tags: [spec]
id: SPEC-011
version: 0.2.1
status: review
status_note: "Core (data shape, matching, value parsing, repeats, hiding, display) is testable on fixtures. Definition source BLOCKED on ADR-0008 (proposed). Exact API keyword strings BLOCKED on H-020. With no accepted glossary the section is hidden everywhere (KW-056)."
depends_on: ["[[Card Data Model]]", "[[My Collection]]"]
research: ["[[Card Keywords]]", "[[Card Data & Images]]", "[[Rules Overview]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0008 Keyword Glossary Source]]"]
as_of: 2026-11-24
---
# SPEC-011: Keyword Explanations

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** in the Collection card dialog ([[Collection]] §5.5), explain each keyword on a card. Every
definition shows its source and an as-of date. Research H-089 is in: [[Card Keywords]].

**What research settled (0.2)**
- Which keywords a card has comes **only** from the structured Riot field `PlayableCard.keywords` (SPEC-001
  CARD-028). Keywords are **never** read from card text: brackets also mark game actions like `[Add]` and
  `[Stun]`, and are sometimes missing ([[Card Keywords]] B4). KW-030, KW-031.
- Definitions are **never** taken from reminder text in `description`. Reminder text is per card, has no game
  function, and is missing from many printings (B1, B5). KW-004.
- Values: a keyword string may end in an integer value (`<Term> 2`). The app shows the value as Riot gives it.
  It never fills in the "omitted = 1" default and never adds values up (F, Q5). The same keyword can repeat with
  different values, so they go on one chip, e.g. `<Term> 3, 6` (F20). KW-032, KW-034.
- Keywords without a definition, and `unverified` entries, are hidden. If none are left, the whole section is
  hidden (KW-052, KW-053). Research has **0 of 28** definitions checked against the official PDF, so nothing would
  show today even under a glossary.

**BLOCKED**
- **ADR-0008** (proposed, RJ decides): where definitions come from. The documented API has **no** definition
  field and no rules endpoint (A1, A2), and Riot's policy allows only "Riftbound assets … provided by the Riot API"
  (E1). Blocks KW-003, KW-011b, KW-015, KW-060…062. Until RJ accepts an option, the glossary is empty and the
  feature is off (KW-056).
- **H-020** (live payload): exact `keywords[]` strings (brackets, casing, value inside the string, cost-bearing
  keywords, `[>]`, repeats, granted keywords). Blocks KW-030a, KW-032a, KW-033a. The rules below are written to be
  tested on fixtures now and re-checked against the payload.

**Buildable now:** the glossary data shape and its load checks (KW-010…014, KW-016), the pure keyword engine
(KW-030…037) and the hidden-section behaviour (KW-050…056), against fixtures and an **empty** glossary. No glossary file ships until ADR-0008 is accepted.

## Purpose
Players open a card in the Collection dialog and want to know what its keywords do without leaving the app.
Keywords and their meanings are game facts. They must come from Riot data or a Riot-published source cited with a
date, never from the project's own wording. When the project has no sourced, verified definition for a keyword,
the app says nothing about it rather than guessing.

## Definitions
- **Keyword**: a term in a card's `keywords[]` list in Riot card data (SPEC-001 CARD-028). The Core Rules glossary
  (rules 805-832, rev. 2026-10-09) lists 28 keywords ([[Card Keywords]] C1, F). This spec does not hard-code that
  list: the card data decides which keywords a card has, and the glossary decides which are explained.
- **Value**: a trailing integer in a keyword string, e.g. `<Term> 2` (KW-032). It belongs to the card. The
  definition belongs to the keyword.
- **Keyword id**: `keywordKey(term)`, the normalized form used for matching (KW-033).
- **Glossary**: the set of `KeywordEntry` records that hold definitions. Its source depends on ADR-0008.
- **Shown entry**: an entry with non-empty `definition`, `source.title` and `asOf`, and `status: 'verified'`.

## Requirements
Column **Blocked**: `ADR-0008` = waits on RJ's decision; `H-020` = waits on the live payload; empty = buildable
and testable now.

### Sources
| ID | Level | Requirement | Blocked | Source |
|---|---|---|---|---|
| KW-001 | MUST | Keyword explanations are specified here (SPEC-011). SPEC-007 refers to this spec for the dialog's Keywords section and does not restate its rules. | | H-090; H-091 |
| KW-002 | MUST | Every keyword fact the app shows (term, value, definition) comes from Riot API card data or from a Riot-published source cited with an as-of date. The app never shows definitions written by the project. | | CLAUDE.md; [[ADR-0005 MVP Product Defaults]] #4; [[Card Keywords]] E1 |
| KW-003 | MUST | Definition source follows [[ADR-0008 Keyword Glossary Source]]. **Until RJ accepts an option, the glossary is empty**, so the Keywords section is hidden on every card (KW-056). If the live API turns out to carry definitions in a structured field or rules resource (H-020), they may be used with no new decision (option A). | ADR-0008 | [[Card Keywords]] A1, A2, E1-E3 |
| KW-004 | MUST NOT | The app never takes a definition from card text (`PlayableCard.text`, the API `description`), including the reminder text in parentheses. Reason: reminder text differs per card, has no game function (Core Rules 135.2.d.3), and is missing from many alt-art, overnumbered, signature and Legend printings. | | [[Card Keywords]] B1, B2, B5, Q9 |

### Glossary data
| ID | Level | Requirement | Blocked | Source |
|---|---|---|---|---|
| KW-010 | MUST | A glossary entry has the `KeywordEntry` shape (data contract below): `keywordId`, `displayName`, `definition`, `takesValue`, `source` (`title`, `locator`, `url`, `documentDate`), `asOf`, `status`, `introducedIn`. | | H-090 |
| KW-011 | MUST | `displayName` is Riot's spelling and capitalization, verbatim (e.g. a hyphen or inner space is kept). `definition` is Riot's text, verbatim: no paraphrase or shortening by the project. | | [[Card Keywords]] E1 ("official English text") |
| KW-011b | MUST | **Which Riot text** is the definition. Proposed for ADR-0008 options B/C: the Core Rules sub-rule that states what the keyword does (the "functionally short for" rule, e.g. rule 8xx.1.b/c), verbatim from the **official PDF**, with that rule number as `locator`. Riot's symbol tokens in that text (such as `[M]`, `[C]`, `[A]`) are stored verbatim. How tokens are displayed is settled with this row. Under option A it is whatever the API resource provides. | ADR-0008 | [[Card Keywords]] F, Q6 |
| KW-012 | MUST | `source.title` names the document (e.g. "Core Rules"), `source.locator` the place in it (rule number) or `null`, `source.url` the Riot URL or `null`, and `source.documentDate` the document's own "Last Updated" date (ISO) or `null`. `asOf` is the ISO date research last confirmed the text against that document. The source line shows `asOf` (KW-050). | | [[Card Keywords]] Q6 (Core Rules "Last Updated" 2026-10-09; research check date) |
| KW-013 | MUST | `status` is `verified` only when research has checked the entry's exact text against the official Riot document named in `source` (for the Core Rules: the official PDF, not a community transcription). Otherwise `unverified`. Only `verified` entries are shown (KW-052). As of 2026-11-24, research has 0 of 28 definitions verified. | | [[Card Keywords]] F counts; CLAUDE.md |
| KW-014 | MUST | One entry per `keywordId`. If two entries normalize to the same `keywordId`, the glossary load reports `duplicate-keyword` (with both `displayName`s) and neither entry is shown. | | data integrity |
| KW-015 | SHOULD | `introducedIn` holds a set code only when research cites the patch notes that added the keyword, else `null`. Not shown in the UI. | ADR-0008 | [[Card Keywords]] D1-D5 |
| KW-016 | MUST | `takesValue` is `true` when research cites a rule giving the keyword an integer value, `false` when research cites that it has none, else `null`. It is used only for the `keyword-value-mismatch` report (KW-037), never to change what is shown. | | [[Card Keywords]] F "Value / cost", Q5 |

### Matching a card's keywords
| ID | Level | Requirement | Blocked | Source |
|---|---|---|---|---|
| KW-030 | MUST | A card's keywords are read only from `PlayableCard.keywords` (SPEC-001 CARD-028, per playable card per CARD-015; the dialog's printing uses its `cardKey`). A missing, `null` or empty list means "no keywords". Entries that are empty or whitespace only are ignored. | | [[Card Keywords]] A1 |
| KW-030a | MUST | Exact string format of `keywords[]` (casing, brackets, value inside the string or not, order, repeats, whether keywords **granted** to other cards are listed, empty-card result) is checked against the live payload. If it differs from what KW-032/KW-033 handle, this spec is bumped. Until then, KW-030…037 are tested on fixtures only. | H-020 | [[Card Keywords]] A4, Q1 |
| KW-031 | MUST NOT | The app never derives keywords from card text (`text` / `description`): not from `[...]` brackets, not from icon tokens, not by matching glossary terms against prose. A term that appears only in the text is not shown. | | [[Card Keywords]] B4 (brackets also mark actions such as `[Add]`, `[Stun]`; brackets missing on some cards) |
| KW-032 | MUST | **Value parsing.** After normalization (KW-033), if the string ends in one or more spaces followed by an integer of ASCII digits, that integer is the **value** and the rest is the **term**. Otherwise the whole string is the term and the value is `null`. The app does not fill in a default value (the rules' "omitted = 1") and does not add values together. | | [[Card Keywords]] F (rules 807.1.b.3, 807.2 etc.), Q5 |
| KW-032a | MUST | Keywords whose parameter is a **cost** rather than an integer (research lists Equip, Repeat, Empower, Flow with printed costs; Accelerate and Hidden with fixed costs) are matched once H-020 shows how the API writes them. Until then such a string either matches its term (no cost in the string) or fails lookup and is hidden and reported (KW-035). | H-020 | [[Card Keywords]] F, Q5 |
| KW-033 | MUST | `keywordKey(term)`: Unicode NFKC; lower-case; trim; collapse internal whitespace to one space; remove **one** pair of square brackets enclosing the whole string; remove trailing `.`, `,`, `:`, `;`; then split off the value (KW-032) and trim again. Inner spaces and hyphens are kept. The same keyword in different case, with enclosing brackets or trailing punctuation, maps to one id. | | consistency with SPEC-001 `nameKey()` |
| KW-033a | MUST | Riot-specific markup to strip from keyword strings (for example the `[>]` ability marker or `:rb_…:` icon tokens, both seen in card text) is added only once H-020 shows it in `keywords[]`. Until then it is not stripped, so such a string fails lookup and is hidden and reported (KW-035). | H-020 | [[Card Keywords]] B2, D3 |
| KW-034 | MUST | **Repeats.** One row per distinct `keywordId` per card. Exact repeats (same id, same value) collapse. When the same id appears with **different** values, the chip label is `displayName` + the distinct values in first-appearance order, joined by ", " (e.g. `<Term> 3, 6`). Instances without a value add nothing to that list. If a card has both valued and value-less instances of one id, the build reports `keyword-mixed-value` (term, `cardKey`). | | [[Card Keywords]] F20 (one card with Level 3, 6, 11, 16); A4 (API repeats unknown) |
| KW-035 | MUST | **Unknown or unshown keyword.** A card keyword whose `keywordId` has no shown entry (no entry, `unverified`, or an empty required field) is not shown. The card-data build report (next to SPEC-001 CARD-065) lists each such `keywordId` with the raw strings seen, a reason (`no-entry`, `unverified`, `incomplete`), the count of cards, and up to 20 `cardKey`s. This runs even when the glossary is empty, so research can see which keywords the live data uses. | | H-090; [[Card Keywords]] Impacts |
| KW-036 | MUST | Rows are ordered by first appearance of their `keywordId` in `keywords[]`. | | Riot data order, like CARD-070 |
| KW-037 | SHOULD | The build reports `keyword-value-mismatch` (term, `cardKey`) when a value is present and `takesValue` is `false`. A missing value on a keyword with `takesValue: true` is **not** reported, because the rules allow it (omitted = 1, KW-032). The chip still shows exactly what Riot's data says. | | KW-016 |

### Display
| ID | Level | Requirement | Blocked | Source |
|---|---|---|---|---|
| KW-050 | MUST | The dialog's Keywords section shows one row per shown keyword: a chip with the label (KW-034), the `definition` as visible text (not tooltip-only), and a muted line **Source: `<source.title>` `<source.locator>`, as of `<asOf>`** (locator left out when `null`). Copy pattern from [[Collection]] §5.5. | | [[Collection]] §5.5, §10 |
| KW-051 | MUST | The as-of date uses the app's date style (American, e.g. "Nov 24, 2026"), the same as ban labels. | | [[Collection]] §10 |
| KW-052 | MUST | **Hide, don't stub:** a keyword without a shown entry is not shown at all. There is no "No definition yet" chip. Open question RJ-1. | | [[Collection]] A7; CLAUDE.md |
| KW-053 | MUST | The section heading is **Keywords**. When no keyword on the card is shown (or the card has none), the heading is hidden too. | | [[Collection]] A7 |
| KW-054 | MUST | Every card category (Legend, Unit, Spell, Gear, Battlefield, Rune, token) follows the same rules. No category is special-cased. | | [[Card Keywords]] C4 (Legends carry keywords; no keyword limited to Legends, Battlefields or Runes) |
| KW-055 | MUST | Chips are text, not controls: they are not focusable, and screen readers read chip, definition and source line in that order. | | WCAG 1.3.1 |
| KW-056 | MUST | **Feature off:** if the glossary is empty, absent or fails to load, the Keywords section is hidden on every card. No error is shown and the rest of the dialog works unchanged. | | [[Collection]] A7 |

### Refresh and errata (only if ADR-0008 allows a glossary)
| ID | Level | Requirement | Blocked | Source |
|---|---|---|---|---|
| KW-060 | MUST | When Riot publishes a new Core Rules revision, Core Rules patch notes or card errata, the research refresh re-checks every glossary entry against it. An entry whose keyword the publication changes is set to `unverified` (and so hidden) until its new text is checked; unchanged entries get a new `asOf`. Research files a board item, like ban waves. | ADR-0008 | [[Card Keywords]] D1-D6 (definitions clarified in 2025-10-24, 2025-12-12, Unleashed, 2026-07-24 notes) |
| KW-061 | MUST | Only the current definition is shown. The dialog shows no change history. | ADR-0008 | [[Card Keywords]] Q7 |
| KW-062 | MUST | A keyword new to the card data (from a new set) is hidden until research adds a verified entry; the KW-035 report is the trigger. A keyword Riot removes has its entry deleted. (No keyword has been renamed or removed through Radiance.) | ADR-0008 | [[Card Keywords]] D6 |

## Data contract
```ts
// Shapes only. Location depends on ADR-0008 (option A: from Riot API data;
// option B/C: a cited file such as data/keywords.json).
export interface KeywordGlossary {
  schemaVersion: number;
  asOf: string;                 // ISO date of the last full research check
  entries: KeywordEntry[];
}

export interface KeywordEntry {
  keywordId: string;            // keywordKey(displayName), KW-033
  displayName: string;          // Riot's spelling, verbatim (KW-011)
  definition: string;           // Riot's text, verbatim (KW-011, KW-011b)
  takesValue: boolean | null;   // KW-016; null = not known
  source: {
    title: string;              // e.g. "Core Rules"
    locator: string | null;     // e.g. a rule number
    url: string | null;
    documentDate: string | null;// the document's own "Last Updated" date (ISO)
  };
  asOf: string;                 // ISO date research last confirmed the text (KW-012)
  status: 'verified' | 'unverified';
  introducedIn: string | null;  // set code, only when sourced (KW-015)
}

// What the dialog gets per card (derived, not stored). Only shown entries reach the UI.
export interface CardKeyword {
  keywordId: string;
  label: string;                // displayName + distinct values, e.g. "<Term> 3, 6" (KW-034)
  values: number[];             // distinct values in first-appearance order; [] when none
  entry: KeywordEntry;
}

// Build report rows (KW-014, KW-034, KW-035, KW-037)
export interface KeywordReportRow {
  code: 'keyword-no-definition' | 'duplicate-keyword' | 'keyword-mixed-value' | 'keyword-value-mismatch';
  keywordId: string;
  reason?: 'no-entry' | 'unverified' | 'incomplete';  // keyword-no-definition only
  rawStrings: string[];
  cardCount: number;
  cardKeys: string[];           // at most 20
}
```

## Acceptance criteria
Example terms are **placeholders**, not Riftbound keywords: `Alpha`, `Beta` (takes a value), `Gamma` (no entry),
`Delta Step` (two words). Unless an AC says otherwise, the glossary holds verified entries for Alpha, Beta and
Delta Step, each with source `Core Rules`, locator `900.1.b`, asOf `2026-11-24`. ACs tagged **[H-020]** use an
assumed string format and are re-checked when the payload arrives (KW-030a).

1. **Shown with source** (KW-050, KW-051) **Given** card keywords `["Alpha"]`, Alpha's definition "Definition A."
   **When** the dialog opens **Then** the Keywords section shows chip "Alpha", the text "Definition A." and
   "Source: Core Rules 900.1.b, as of Nov 24, 2026".
2. **No locator** (KW-050) **Given** Alpha's `source.locator` is `null` **When** the dialog opens **Then** the line
   reads "Source: Core Rules, as of Nov 24, 2026".
3. **Value** (KW-032) **[H-020]** **Given** card keywords `["Beta 2"]` **When** the dialog opens **Then** the chip
   reads "Beta 2" and the definition is Beta's.
4. **No default value** (KW-032) **Given** card keywords `["Beta"]` and Beta `takesValue: true` **When** the dialog
   opens **Then** the chip reads "Beta" (not "Beta 1") and no `keyword-value-mismatch` is reported.
5. **Case, brackets, punctuation** (KW-033, KW-034) **[H-020]** **Given** card keywords `["ALPHA", "[Alpha]", "alpha."]`
   **When** matched **Then** one row, chip "Alpha" (the entry's `displayName`).
6. **Multi-word term** (KW-033) **Given** card keywords `["delta  step"]` **When** matched **Then** it matches
   `keywordId` `delta step` and the chip reads "Delta Step".
7. **Same value repeated** (KW-034) **Given** card keywords `["Beta 2", "Beta 2"]` **When** the dialog opens **Then**
   one chip "Beta 2".
8. **Different values** (KW-034) **[H-020]** **Given** card keywords `["Beta 3", "Alpha", "Beta 6"]` **When** the
   dialog opens **Then** two rows in this order: "Beta 3, 6" (Beta's definition shown once), then "Alpha". Values
   are not added up (no "Beta 9").
9. **Mixed value** (KW-034) **Given** card keywords `["Beta", "Beta 2"]` with card key `card-x` **When** matched
   **Then** one chip "Beta 2", and the report has `keyword-mixed-value` for `beta` with `card-x`.
10. **Unknown keyword hidden and reported** (KW-035, KW-052) **Given** cards `card-x` and `card-y` both with keywords
    `["Alpha", "Gamma"]` and no Gamma entry **When** the build runs and `card-x` opens **Then** only Alpha is shown,
    and the report has one `keyword-no-definition` row for `gamma`, reason `no-entry`, `cardCount` 2, `cardKeys`
    `["card-x", "card-y"]`.
11. **Unverified hidden** (KW-013, KW-052) **Given** Alpha's entry has `status: 'unverified'` **When** a card with
    keywords `["Alpha"]` opens **Then** there is no Alpha row and no Keywords heading, and the report gives reason
    `unverified`.
12. **Incomplete hidden** (KW-052) **Given** Alpha's entry has `definition: ""` **When** a card with `["Alpha"]` opens
    **Then** no Alpha row; report reason `incomplete`.
13. **Section hidden** (KW-053) **Given** a card with `keywords: []`, or with only `["Gamma"]` **When** the dialog
    opens **Then** there is no "Keywords" heading. **Given** `keywords` missing or `null` in the source data **Then**
    the same (KW-030).
14. **Feature off** (KW-056, KW-003, KW-035) **Given** an empty glossary (`entries: []`) **When** the build runs and
    any card's dialog opens **Then** no Keywords section and no error are shown, and the build report lists every
    keyword in the card data with reason `no-entry`. **Given** the glossary fails to load in the browser **When** a
    dialog opens **Then** no Keywords section, no error, and the rest of the dialog works.
15. **No keywords from text** (KW-031) **Given** card keywords `[]` and text `"[Alpha] (Reminder for alpha.) Deal 2."`
    **When** matched **Then** no chip is shown.
16. **No definitions from text** (KW-004) **Given** card keywords `["Gamma"]`, no Gamma entry, and text
    `"[Gamma] (Gamma reminder text.)"` **When** the dialog opens **Then** no Gamma row is shown and "Gamma reminder
    text." is not used as a definition anywhere.
17. **Duplicate entry** (KW-014) **Given** glossary entries "Alpha" and "ALPHA" (both `alpha`) **When** the glossary
    loads **Then** `duplicate-keyword` is reported with both names, and a card with `["Alpha"]` shows no Alpha row.
18. **Unstripped markup fails safe** (KW-033a) **[H-020]** **Given** card keywords `["Alpha [>]"]` **When** matched
    **Then** no Alpha row is shown and the report lists `alpha [>]` with reason `no-entry`.
19. **Value mismatch** (KW-037) **Given** Alpha `takesValue: false` and card keywords `["Alpha 2"]` on `card-x`
    **When** the build runs **Then** the report has `keyword-value-mismatch` for `alpha` with `card-x`, and the
    dialog shows chip "Alpha 2" with Alpha's definition.
20. **Screen reader order** (KW-055) **Given** AC 1 **When** read with a screen reader **Then** it reads "Alpha",
    "Definition A.", then the source line, and Tab does not stop on the chip.
21. **All categories alike** (KW-054) **Given** a Legend card and a token card, each with keywords `["Alpha"]`
    **When** each dialog opens **Then** both show the same Alpha row (chip "Alpha", "Definition A.", same source
    line), with no category-specific difference.
22. **Blank entries ignored** (KW-030) **Given** card keywords `["Alpha", "", "  "]` **When** matched and the build
    runs **Then** the dialog shows one row, "Alpha", and the report has no row for the empty or whitespace strings.
23. **Trailing punctuation** (KW-033) **[H-020]** **Given** card keywords `["Alpha,", "Alpha:", "Alpha;", "Beta 2."]`
    **When** matched **Then** two rows: "Alpha" and "Beta 2" (Beta's definition), and nothing is reported.

## Out of scope
- Keyword search or filters on the Collection page (SPEC-007 / H-091 may add them later).
- Keyword explanations in Decks or Tournaments (could reuse this spec later).
- Explaining actions (`[Add]`, `[Stun]` …), tags, domains, card types or other non-keyword terms ([[Card Keywords]] C2).
- Game logic on keywords (summing values, applying defaults, Unique as a deck rule). Unique as a construction rule
  belongs in SPEC-002 if research asks for it.
- Translations (the API is `en` only during beta).

## Open questions / BLOCKED
- **RJ-1: "No definition yet" vs hide.** [[Collection]] §5.5 says both "Never show a keyword without its definition
  and source" and "show only the chip with 'No definition yet'". A7 and H-090 say hide. **This spec hides it
  (KW-052)**: a bare chip shows a game term without a source, "No definition yet" reports our backlog rather than the
  card, and the term is already on the card image in the same dialog. RJ can overrule. If he does, KW-052 shows the
  chip with **No definition yet** and no source line.
- **RJ-2: ADR-0008.** See the ADR's "What RJ must decide". Blocks KW-003, KW-011b, KW-015, KW-060…062.
- **BLOCKED H-020:** KW-030a, KW-032a, KW-033a; ACs 3, 5, 8, 18, 23 re-checked against the payload.
- **Research gaps (for researcher, not blocking the engine):** 0 of 28 definitions checked against the official PDF
  (KW-013), so even an accepted glossary would show nothing yet; 4 keywords' existence only community-confirmed
  (Ganking, Tank, Temporary, Vision; Assault and Shield are now official via the Radiance notes, [[Card Keywords]]
  D5); Radiance reminder text unknown (no RAD mirror).
- **SPEC-007 pointer missing:** KW-001 says SPEC-007 refers to this spec for the dialog's Keywords section, but
  SPEC-007 0.7 has no such pointer yet. H-091 owns SPEC-007 and adds it; this spec does not edit SPEC-007.
- **SPEC-001 dependency:** CARD-028 (`keywords: string[]`) is consistent with the documented schema
  ([[Card Keywords]] A1). Its string format is H-020. SPEC-001 is unchanged. If the payload shows objects, separate
  value fields or `null`, SPEC-001 and KW-030a are bumped together.

## Changelog
- 0.2.1 (2026-11-24): validation fixes for H-090. Research gaps: only Ganking, Tank, Temporary and Vision are
  community-only (Assault and Shield official since [[Card Keywords]] round 2). New ACs 21 (KW-054), 22 (KW-030 blank
  entries) and 23 (KW-033 trailing `,` `:` `;` `.`). Summary "Buildable now" adds KW-010…014 and KW-016. Noted that
  SPEC-007 has no pointer to this spec yet (H-091 owns it). No requirement changed. (AC 23 added to H-020 list)
- 0.2 (2026-11-24): H-090 phase 2 from [[Card Keywords]] (H-089). Keywords come only from `keywords[]`; no text
  parsing (KW-031) and no definitions from reminder text (KW-004, new). Value parsing (trailing integer, no default,
  no summing), repeats with different values on one chip (KW-034), reports (KW-035, KW-037), `takesValue` (KW-016),
  `source.documentDate` and `asOf` = research check date (KW-012), `verified` = checked against the official
  document (KW-013), all categories alike (KW-054), refresh/errata rows KW-060…062. Blocked column added: ADR-0008
  and H-020. 20 ACs. Status `review`.
- 0.1 (2026-11-24): skeleton (H-090 phase 1). Data shape, matching and display rules decided. Hide-not-stub chosen
  (RJ-1). Definition source blocked on ADR-0008 and H-089.
