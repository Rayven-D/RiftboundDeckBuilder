---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Collection Import]]"
---
# Collection Import changelog

Moved out of [[Collection Import]] on 2026-11-23 (H-039). Newest first. New changelog entries for the spec go here.

- 0.9.1 (2026-11-24, H-071): IMP-053 reads "browser by default, synced to the account when signed in"
  (SPEC-010); no behavior change to import. Summary and "Resolved" lines match.
- 0.9 (2026-11-24, H-097): **runes are imported like any card** (RJ, 2026-11-24: "Allow users to import
  runes as well and treat them like any other card."). New IMP-071 (no rune-specific skip, filter, warning
  or issue code in parse, resolve, merge, commit or export) and AC 42 (`Rune Pool:` / `Runes` sections,
  merge, Add commit, export and Replace round-trip). The parser never dropped runes; this makes it a
  tested contract. Open questions: RJ decision recorded; H-099 (rune printings in the API) added. Pin
  SPEC-008 0.4; research list adds [[Physical Copies Across Decks]]. H-096 (IMP-055 singular strings) is
  still open and will bump again.

- 0.8 (2026-11-23, H-049; numbered 0.7 on its branch, renumbered at merge because H-045 is 0.7): follow-ups from H-040/H-043/H-046/H-048/H-053/H-058 validation; builder-defined
  behaviour of `parse-card-list.ts` / `import-dialog.ts` written into the spec as built. IMP-058 cites
  `deckOwnership(input, cardKey)`. IMP-042: RJ's interim delimiter rule (H-053): first non-empty line, outside
  quotes only, `;` or tab beats `,`, `;` vs tab by count (tie → `;`). IMP-061 rewritten as an ordered list of
  checks: other extensions (`FILE_REJECTED` "… can’t be imported. Use a .txt, .csv or .xlsx file."), `.xls`
  ("aren’t", typographic, as built), `.txt` over 1 MiB rejected before reading with the IMP-006 message, 5 MiB
  for `.csv`/`.xlsx`, converted text over IMP-006 rejects the upload, no lines ("… has no lines to import.").
  IMP-062: the upload is dropped when the box is emptied or a paste/drop replaces it all. IMP-010: invalid
  UTF-8 rejects the upload (`INPUT_ENCODING`, "… isn’t UTF-8 text. …"). IMP-007: limits measured on the
  text-box line, messages quoted. IMP-008: decimal comma/point → `BAD_QUANTITY`, `2. Gust` → `MISSING_QUANTITY`
  (IMP-024 lists non-integer). IMP-006 paste message quoted. IMP-001: extension any case, others rejected.
  IMP-040 rule (c): a label cell followed by the entry becomes `<label>: <entry>`. IMP-057 and the data
  contract: catalog-free summary vs fields added by resolution (`resolvedExact`, `needsReview`, `catalogVersion`
  now optional); new `UploadRejection`. Line grammar: `DEC_LEAD`, `DEC_TRAIL`, `QTY_SECOND`; step 3 earliest
  split (longest code) wins; step 5 "ends with, or is, `[xX]` + number". **IMP-050 split:** IMP-050 (MUST)
  keeps the Replace confirmation; new **IMP-050a** (SHOULD) holds the locked-deck warning, now also for Undo
  (inside the COLL-058 confirmation, or a confirmation asked for only when a locked deck would go short;
  replaces the v0.6 "is now `<n>` cards short" notice after Undo), agreeing with SPEC-008 0.3 SHARE-034 and
  SPEC-007 0.7 COLL-058/088. ACs: 14 (delimiter cases), 15a (typographic apostrophe, `.csv` for 5 MB), 27
  (line 9 `3x RAD 001 x2`), 28 (**Given**; earliest-split row); new ACs 36–41. Pin: SPEC-008 0.3. One
  requirement added (IMP-050a).
  RJ decision 2026-11-23 (H-049 follow-up): UI messages use the straight apostrophe `'` (house style added to
  IMP-061); IMP-010, IMP-061, the `UploadRejection` comment, AC 15a and AC 38 changed from `’` to `'` (the
  "typographic apostrophe" note above no longer applies; `’` stays only as name-folding test input, AC 4);
  open question resolved.
  RJ decision 2026-11-23 (H-049 follow-up): Undo warns before **and** notifies after. IMP-050a's warning
  string gains "It stays locked." (SHARE-033); a confirmed Undo is followed by the notice "'`<deck name>`'
  (locked) is now `<n>` cards short." (Undo only; this restores the notice the line above says was replaced,
  now in addition to the warning). Summary updated.

- 0.7 (2026-11-23, H-045): RJ decision 2026-11-23 (H-045). IMP-055 rewritten: the collection CSV export is
  `Quantity,Card Name` only (no Tags column; tags expected to survive through sign-in sync, ADR-0007) and
  writes printing codes so `byPrinting` round-trips. New normative block "Collection CSV export" under the
  Storage table (rules 1–10: file and quoting, title row, canonical name, canonical code `<SET> <NUM>` inside
  the name cell, printing rows, self-check against the Line grammar / exact-name guard with code-only and
  name-only fallbacks, one name-only row for unassigned + missing-printing + no-code copies (counted in the
  export notice), ⌈n/999⌉ rows of at most 999 with no `0` row, order, unresolved cards left out; the checks
  also cover names the grammar misreads, e.g. `X Marks the Spot`) and a precise round-trip guarantee
  (excludes rows of cards named in a rule 7 notice; code-only retries count as passing rule 6). New AC 35
  (rows in `printingSortKey` order: name-only row right after its default printing, `001` before `001a`). Summary bullet added;
  Open question H-045 marked Resolved. No new requirement IDs; requirement count unchanged.

- 0.6 (2026-11-23, H-067): IMP-050's Replace confirmation SHOULD add SPEC-008's locked-deck warning
  ("'`<deck name>`' (locked) will be `<n>` cards short."), computed with `lockedShortfalls()` on the parsed
  import before anything is written; Add never warns; Undo of a commit (IMP-052) that lowers a hold shows a
  notice "… is now `<n>` cards short.". Agrees with SPEC-008 SHARE-034 and SPEC-007 COLL-088. `depends_on`
  adds SPEC-008; Summary updated. Requirement count unchanged.

- 0.5 (2026-11-23, H-048): RJ decision 2026-11-23 (H-048). IMP-019 rewritten around a normative Line grammar; IMP-020 → MUST (`x3 Name`, `Name x3`, `X` too; two quantities → `BAD_QUANTITY`); IMP-021/024 updated (code-only lines are not `MISSING_NAME`). New IMP-064 (code shape: 3-letter set + CARD-037 number forms, spaces around `/`), IMP-065 (code at start or end, `()`/`[]`, ` - ` or comma separator; false-positive guard), IMP-066 (code-only lines; before the catalog loads), IMP-067 (resolution by `lookupPrinting`, exact-name guard, `AMBIGUOUS_PRINTING`), IMP-068 (`PRINTING_NAME_MISMATCH`), IMP-069 (`UNKNOWN_PRINTING` name fallback), IMP-070 (variant from the catalog; CARD-040 still BLOCKED). IMP-040/044/048/055 extended to codes in text/CSV/Excel lines. Data contract: `PrintingHint`, `ParsedLine.printing` replaces `inputPrinting`, two issue codes. ACs 27–34 and fixture F1 added; Summary and Open questions updated (IMP-020 question resolved).
- 0.4 (2026-11-23, H-043): RJ import decisions. IMP-021 `MISSING_QUANTITY` replaces "assume 1" (`QUANTITY_ASSUMED` removed); `MISSING_NAME` added; IMP-024 drops `UNPARSEABLE_LINE`; IMP-001 adds `.xlsx`; new IMP-061 (upload limits), IMP-062 (one dialog, upload into the text box), IMP-063 (problem list, Continue); IMP-040/041/043/045 rewritten for positional CSV/Excel rows and title-row skipping (`CSV_NO_NAME_COLUMN`, `EMPTY_NAME` removed); IMP-044 withdrawn; IMP-016/017 label spacing (IMP-017 → MUST), IMP-023 → MUST; IMP-011 step 1 by file type; CSV/Excel now shared with decks; ACs 10, 13–15, 18, 22 updated, 2a, 15a, 15b added.
- 0.3 (2026-11-23): H-039. Part A preamble now lists the requirements not applicable to decks (the `.csv` parts of IMP-001/IMP-011, IMP-009, IMP-015, IMP-040…046), matching SPEC-006 DECK-013; CSV heading marked owned cards only; Purpose bullet aligned. Summary block added; changelog moved to this archive note.
- 0.2 (2026-11-23): Scope narrowed to owned cards (ADR-0006); deck lists move to SPEC-006 [[Deck Import]]. Requirements split into Part A shared parsing (reused by SPEC-006) and Part B collection-specific; purpose and links now point at [[My Collection]] (SPEC-007) and [[Your Decks Ownership View]] (SPEC-005), "Build Matching" removed. A1 resolved against CARD-030; ownership and merging by `cardKey`; IMP-029 comma-prefix check on canonical names; A2 bound to CARD-036 (MUST) and its normalization (IMP-033/037/044, no own zero-padding). IMP-048 and IMP-053 confirmed (ADR-0005). IMP-006 source now the Riot API catalog with the community count 1,451 as approximate; Riftcodex removed. IMP-002, IMP-018, IMP-031 reworded so the parser keeps sections and merging is collection-specific. IMP-011 decode reference IMP-030 → IMP-031. Data contract: `NameKey`/`PrintingKey` → `CardKey`/`PrintingCode`/`PrintingId`, `catalogVersion` from SPEC-001. AC10 rewritten with a genuinely unknown name; explicit **When** in ACs 10, 12, 14, 15, 17, 18, 21. Added IMP-058 (collection feeds SPEC-005/007, ownership by `cardKey`), IMP-059 (no alias table), IMP-060 (Owned Cards Import entry point); ACs 23–26. 60 requirements.
- 0.1 (2026-11-23): draft. Five formats, auto-detection, exact + fuzzy resolution, merge by name key, Add/Replace commit, local browser storage for MVP. 57 requirements (IMP-001…IMP-057).
