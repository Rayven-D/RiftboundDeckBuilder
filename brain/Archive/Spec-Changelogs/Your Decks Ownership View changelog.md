---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Your Decks Ownership View]]"
---
# Your Decks Ownership View changelog

Newest first. New changelog entries for the spec go here.

- 0.4.1 (2026-11-23, H-059 validation): OWN-033 says the card-total suffix ("· `<a>` of `<n>` in this deck")
  goes on every counted tile of a card with more than one counted entry (several zones, or two entries in one
  zone); AC 4's Main tile corrected to "2 of 2 available · 2 of 3 in this deck". No behaviour change.

- 0.4 (2026-11-23, H-065/H-066/H-067): AC 17 has a **When**. OWN-050: an empty or runes-only deck (R = 0)
  reads "No cards to count" and is "None available"; OWN-006 and `DeckTileSummary.ownershipFilter` /
  `ownershipLine` follow SPEC-008 0.2 SHARE-051 (exactly one group per deck, first match: locked → R = 0 none
  → ready → A = 0 none → partial). Design decision 7 moved after 6 (numbers unchanged). Open question 6
  marks SPEC-008's open questions 1 and 2 as resolved by RJ (defaults accepted, no force lock). Pins: SPEC-007
  0.5, SPEC-008 0.2, SPEC-009 0.2. Tile labels unchanged from 0.3.

- **0.3 (2026-11-23, H-058):** shared cards, lock in and runes (RJ, ADR-0006 "Shared cards, lock in and
  runes"; [[Shared Cards and Lock-in]] SPEC-008, [[Runes Assumed Owned]] SPEC-009). Pool is SPEC-008
  `available(D, k)` (ownedForDecks minus other decks' locks) instead of `ownedForDecks` (Summary,
  Definitions, OWN-020, OWN-024); card required and allocation over counted entries only (OWN-021, OWN-022);
  new OWN-022a (rune entries always full, "Assumed owned", out of summary and missing list); labels "… of …
  available" / "… locked in" and the shared indicator (OWN-002, OWN-011, OWN-033, design decisions 1, 5);
  new design decision 7; OWN-006 filters Ready to build / Partly available / None available + lock filter;
  OWN-010 Lock in / Unlock actions; OWN-042/043 SHARE-043 breakdown and other-decks list; OWN-050 "copies
  available", "cards fully available", runes excluded; OWN-051 "All cards available", runes excluded; OWN-052
  no `Rune Pool:` section; OWN-062 lock store unreadable; OWN-070/073/080 other decks and locks as inputs.
  Data contract: `CollectionOwnership.ok.shared: SharedPool`; `OwnershipCard` adds `isRune`, `sharedLabel`,
  `lockedByOthers`, `available`, `heldByThisDeck`, `otherUses`; `DeckOwnershipView` adds `locksIgnored`,
  `lock`, summary fields renamed `copiesAvailable` / `cardsFullyAvailable`; `DeckTileSummary.ownershipFilter`
  `'ready' | 'partial' | 'none' | 'locked'` and `lockBadge`. ACs 1–9 strings updated (AC 7: 0 of 54 copies,
  0 of 30 cards; AC 8: no Runes missing group); new ACs 16 (locked by another deck) and 17 (runes). Pins
  SPEC-006 0.6, SPEC-007 0.4, SPEC-008 0.1, SPEC-009 0.1 (also settles H-049 item 2's SPEC-006 pin). One
  requirement added (OWN-022a), none removed.
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
- **0.1 (2026-11-23, H-007):** first draft of SPEC-005 per [[ADR-0006 Two Imports - Collection and Decks]]
  (incl. follow-up and Gate H-036 decisions). Your decks list with source, legality label and ownership
  summary; deck view with zone sections, full card info and `banStatus()` on every card; ownership by
  `cardKey` from SPEC-007 COLL-081 `ownedForDecks` (excluded tags never count); shared pool allocated
  Legend → Champion → Main → Runes → Battlefields → Sideboard; full / darkened / left-to-right partial
  fill with text labels and accessibility rules; grouped tiles with printing expand incl. "Owned · excluded
  from decks"; deck summary and Riot-style missing list; unknown data; pure `computeDeckOwnership()`
  contract. Requirements OWN-001…OWN-093 (63 requirements), 15 ACs.
