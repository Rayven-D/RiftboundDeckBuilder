---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Your Decks Ownership View]]"
---
# Your Decks Ownership View changelog

- **0.1 (2026-11-23, H-007):** first draft of SPEC-005 per [[ADR-0006 Two Imports - Collection and Decks]]
  (incl. follow-up and Gate H-036 decisions). Your decks list with source, legality label and ownership
  summary; deck view with zone sections, full card info and `banStatus()` on every card; ownership by
  `cardKey` from SPEC-007 COLL-081 `ownedForDecks` (excluded tags never count); shared pool allocated
  Legend → Champion → Main → Runes → Battlefields → Sideboard; full / darkened / left-to-right partial
  fill with text labels and accessibility rules; grouped tiles with printing expand incl. "Owned · excluded
  from decks"; deck summary and Riot-style missing list; unknown data; pure `computeDeckOwnership()`
  contract. Requirements OWN-001…OWN-093 (63 requirements), 15 ACs.
- **0.2 (2026-11-23, H-040):** V-009 follow-ups. Section order and allocation order are Riot decklist order
  Legend → Champion → Main → Battlefields → Runes → Sideboard (OWN-011, OWN-022, `ZONE_ORDER`, design
  decision 2, AC 8) per ADR-0006 "Your decks view decisions"; legality labels equal CAT-045 / DECK-051 with
  `FormatDef.name` per LEGAL-R08 (OWN-004, OWN-006, `DeckTileSummary`, `summarizeDeck(…, format)`, ACs 3, 9,
  11, 12); excluding tag names from `DeckOwnershipInput.tags` / SPEC-007 `TagStore` (OWN-041,
  `OwnedPrintingRow.excludedByTagNames`, AC 2); reuse SPEC-007 `DeckOwnershipInput` and
  `CollectionCatalogView`, `deckOwnership(input, cardKey)` everywhere (Definitions, OWN-020, OWN-041,
  OWN-083, Data contract, ACs 1, 2); unreadable tags and catalog not loaded make ownership unavailable
  (OWN-062, OWN-063); `isChampionUnit` added to OWN-060; OWN-061 and AC 9 cite CARD-033/CARD-012 instead
  of CARD-066; dependencies SPEC-001 0.3, SPEC-002 0.3, SPEC-004 0.4, SPEC-006 0.3, SPEC-007 0.3; RJ open
  questions on image printing, section order, sideboard last and darkening marked resolved.
