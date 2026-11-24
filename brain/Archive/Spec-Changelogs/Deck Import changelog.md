---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Deck Import]]"
---
# Deck Import changelog

Moved out of [[Deck Import]] on 2026-11-23 (H-039). Newest first. New changelog entries for the spec go here.

- 0.6, metadata only (2026-11-23, H-050): the Summary "Depends on" line pins [[Tournament Deck Catalog]] v0.5 (was v0.4; SPEC-004 0.5 only versions the H-044 lower-case "your" strings). No requirement or AC changed, so no version bump.

- 0.6, metadata only (2026-11-23, H-067): `depends_on` and the Summary "Depends on" line add SPEC-008 0.2 (DECK-080/082…084 cite SHARE requirements) and pin the other dependencies (SPEC-001 0.3, SPEC-002 0.3, SPEC-003 0.6, SPEC-004 0.4). No requirement or AC changed, so no version bump.

- 0.6 (2026-11-23, H-058): lock in ([[Shared Cards and Lock-in]], ADR-0006 "Shared cards, lock in and runes"). DECK-080: card changes disabled while a deck is locked (SHARE-025); DECK-082: deleting a locked deck releases its lock, confirmation text added (SHARE-024); DECK-083: Undo restores the deck unlocked; DECK-084: a duplicate is unlocked (SHARE-026). Summary and consumers (SPEC-008) updated. `UserDeck` unchanged (locks in SPEC-008's `DeckLockStore`). No requirement added or removed.
- 0.5 (2026-11-23, H-048): RJ decision 2026-11-23 (H-048). DECK-010 reuses SPEC-003 IMP-064…070 and the Line grammar; DECK-014 updated (name = card part without quantity and code; leading or trailing quantity); new DECK-015 (printing codes on deck lines resolve the `cardKey` only; which code issues block Save); DECK-041 clarified (warnings on resolved lines don't block); DECK-096 names text-line codes; AC 23 added; Summary and Open questions updated.
- 0.4 (2026-11-23, H-043): RJ import decisions. DECK-001 uses the shared paste-or-upload dialog (`.txt`/`.csv`/`.xlsx`, every line needs a quantity); DECK-010/013 reuse CSV/Excel (only IMP-009, IMP-015 excepted); DECK-011 accepts `csv`, `FORMAT_NOT_FOR_DECKS` removed; DECK-014 re-joined CSV names; DECK-020 label spacing and aliases (`MainDeck`, `RunePool`, `RuneDeck`); DECK-076 / `DeckSourceFormat` include `csv`; AC 16 rewritten, AC 16a added; Out of scope updated.
- 0.3 (2026-11-23): H-039. Open questions "For spec-writer (SPEC-003)" and "(SPEC-004)" replaced by one Resolved line (SPEC-003 v0.3 preamble, SPEC-004 v0.4 CAT-071/073); Definitions and DECK-013 now cite SPEC-003's Part A preamble exceptions; DECK-051 messages rendered per SPEC-002 LEGAL-R08. Summary block added; changelog moved to this archive note.
- 0.2 (2026-11-23): board H-030 retry 1 (validator FAIL of 0.1), Gate H-036 and H-037 decisions
  ([[ADR-0006 Two Imports - Collection and Decks]]).
  - One tournament source type: `DeckSource = UserDeckSource | TournamentDeckSource`, with
    `TournamentDeckSource` field-for-field identical to SPEC-004 CAT-072 (`eventName`, `eventStartDate`,
    `eventEndDate`, `region`, `publishedRank`, `placingLabel`, `pilot`, `sourceUrl`, `addedAt`; dropped
    `placing`/`url`) and defined once here (DECK-061).
  - Default tournament name `<Legend>: <pilot> (<placingLabel>, <event name>)` (DECK-062, H-036 #1).
  - Duplicates now MUST, identical to CAT-074: "In Your decks" opens the deck, "Add another copy" makes
    `… (2)`, `(3)`… (DECK-064, H-036 #2).
  - DECK-065 rewritten: the Add path copies `cardKey`s, skips parsing and cannot fail on names (CAT-071);
    DECK-005 and DECK-060 aligned.
  - `isChampion` → `isChampionUnit` throughout; Champion Unit defined as in SPEC-002.
  - Zone inference on the SPEC-001 `category` enum (no `null`, no `'other'`): DECK-032 is a rule per
    enum value; DECK-034 asks when several candidates; DECK-035 on `'unknown'` with bulk "Put all in Main
    Deck" (now MUST); new DECK-026 rejects tokens with warning `TOKEN_NOT_DECK_CARD`; DECK-022 and DECK-037
    updated.
  - DECK-092 total corrected to 66. DECK-088 legality wording aligned with LEGAL-019/LEGAL-R04.
  - DECK-010/DECK-013 cite SPEC-003 Part A exactly: all of Part A reused except IMP-009, IMP-015,
    IMP-040…046 and the `.csv` parts of IMP-001/IMP-011, listed as "not applicable to decks"; Part B not
    reused.
  - Shared display rules (H-037): dates `Nov 23, 2026`, `incomplete` = "Not fully checked", verdict labels
    as CAT-045, ban status via SPEC-002 `banStatus()` (DECK-051…053, DECK-070).
  - New DECK-096: deck entries by `cardKey` only (no printing, ownership or tags; `DeckCard.printingId`
    removed); [[Your Decks Ownership View]] groups by name, expands to printings and applies "exclude from
    decks" tags.
  - ACs: explicit **When** in AC 7 and AC 16; AC 1, 4, 6, 11 updated; new AC 11a, 20, 21, 22.
  - Open questions refreshed (removed CARD-034, CAT-042/043 and non-nullable SPEC-001 items; added
    SPEC-003 Part A and SPEC-004 alignment items, token research).
  - 69 requirements (63 MUST, 5 SHOULD, 1 MAY; DECK-001…DECK-096; DECK-064 SHOULD → MUST).
- 0.1 (2026-11-23): draft. Deck import for community decklists (board H-030, ADR-0006). Reuses SPEC-003
  shared parsing by ID; sections → zones; zone reconstruction from Riot card data with user questions,
  never silent; SPEC-002 legality shown, never blocking; unknown names must be resolved or removed;
  Tournaments "Add to Your decks"; edit/rename/delete/duplicate/export; browser `DeckStore`.
  67 requirements (60 MUST, 6 SHOULD, 1 MAY; DECK-001…DECK-095, numbered in groups).
