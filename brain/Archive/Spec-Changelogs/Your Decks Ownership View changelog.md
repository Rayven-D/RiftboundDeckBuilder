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
