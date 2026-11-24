---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Shared Cards and Lock-in]]"
---
# Shared Cards and Lock-in changelog

Newest first. New changelog entries for the spec go here.

- 0.1 (2026-11-23, H-058): first draft per RJ (ADR-0006 "Shared cards, lock in and runes") and
  [[Physical Copies Across Decks]]. Shared pool over Legend, Chosen Champion, Main, Battlefields and
  Sideboard per `cardKey`; available = ownedForDecks − copies held by other locked decks; unlocked decks
  reserve nothing; lock in needs a complete deck; unlock, delete (Undo restores unlocked), no card edits while
  locked; lock order by `lockedAt` (earliest wins), short locked decks stay locked and are flagged; card
  breakdown and shared indicator; `DeckLockStore`; pure `computeSharedPool()`, `availability()`, `canLock()`,
  `lockedShortfalls()`. 43 requirements (SHARE-001…072: 41 MUST, 1 SHOULD, 1 MUST NOT), 14 ACs.
