---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Tournament Deck Catalog]]"
---
# Tournament Deck Catalog changelog

Moved out of [[Tournament Deck Catalog]] on 2026-11-23 (H-039). Newest first. New changelog entries for the spec go here.

- 0.4 (2026-11-23): H-039. CAT-021 table row fixed (source in its own column); CAT-071 cites SPEC-006 DECK-065; CAT-073 trims the default name to 80 characters like DECK-062; removed the stale open question about SPEC-006 v0.1's source shape. Summary block added; changelog moved to this archive note.
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
