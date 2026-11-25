---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[Shared Cards and Lock-in]]"
---
# Shared Cards and Lock-in changelog

Newest first. New changelog entries for the spec go here.

- 0.4.2 (2026-11-24, H-076, status `review`, 2 choices for RJ): settles what the H-059 engine had to choose. SHARE-020: `canLock` takes `isLocked` from the lock store so `already-locked` works with ownership unavailable. SHARE-030: unparseable `lockedAt` sorts after parseable ones, then raw string, then `deckId` (engine behaviour, as built). SHARE-034: per-card rule (a locked deck is warned about when it holds fewer of any one `cardKey`); v0.4.1 compared the Σ of holds and missed Replace imports that move copies at the same total (RJ to confirm). SHARE-051: new group `unavailable`; new SHARE-053: locked decks shown while ownership is unavailable, tile line "Ownership unavailable" (RJ to confirm). AC 19–21; open questions 5, 6. Builder follow-up: see Handoff Board.
- 0.4.1 (2026-11-24, H-071, SPEC-010 Impacts): SHARE-060 reads "browser by default, synced to the account when
  signed in" (SYNC-017, SYNC-070…077). The Out of scope line "Accounts, syncing locks between browsers, sharing
  decks" is superseded: only sharing decks with other people stays out of scope. No lock rule changed.
- 0.4 (2026-11-24, H-097): **runes are cards** (RJ, 2026-11-24: "Allow users to import runes as well and
  treat them like any other card."). New SHARE-006 (rune entries have need, hold, shared indicator,
  breakdown and count toward completeness, shortfall and groups). SHARE-001 and `COUNTED_ZONES` now include
  `runes`; SHARE-014, SHARE-042, SHARE-050, SHARE-051 drop the rune exceptions; SHARE-020 `no-cards` now
  means an empty deck only, message "Lock in needs at least one card" (was "… besides runes"). Design
  decision 1, definitions, data-contract comments and Out of scope updated. AC 12 rewritten (runes block lock
  in, 2 cards short), AC 15 rewritten (`Rune Test` is "0 of 12 copies available", `incomplete`), new ACs 17
  (runes shared and held across two Kennen decks) and 18 (a lock stored before v0.4 becomes short and
  refills). SPEC-009 dependency removed; pins SPEC-003 0.9, SPEC-005 0.5, SPEC-007 0.8. Open question 4
  records the decision.

- 0.3 (2026-11-23, H-049 item 19): SHARE-034 no longer treats Undo of an import as "the one change without a
  confirmation step": Undo is warned **before** it runs, computed on the snapshot it would restore, inside the
  SPEC-007 COLL-058 Undo confirmation when manual edits followed the import, otherwise in a confirmation it
  asks for only when `lockedShortfalls` is not empty (the COLL-088 rule for edits without a confirmation).
  The notice "'`<deck name>`' (locked) is now `<n>` cards short." is removed; no change warns only afterwards.
  Agrees with SPEC-003 0.8 IMP-050/IMP-050a and SPEC-007 0.7 COLL-058/COLL-088. AC 16 Undo part rewritten
  (confirm / cancel, with manual edits, no lock → no confirmation). `lockedShortfalls` comment covers Undo.
  Summary updated. Pins: SPEC-003 0.8, SPEC-007 0.7. Still 43 requirements; 16 ACs.
  RJ decision 2026-11-23 (H-049 follow-up): Undo warns before **and** notifies after. SHARE-034's one warning
  string, used in every confirmation (edits, Replace, Undo), is now "'`<deck name>`' (locked) will be `<n>`
  cards short. It stays locked." (a short deck stays locked, SHARE-033); a confirmed Undo (only) is followed
  by the notice "'`<deck name>`' (locked) is now `<n>` cards short." (restored, now in addition to the
  warning; the "is removed" line above no longer applies to Undo). Cancel → nothing changes, no notice.
  Summary, `lockedShortfalls` comment, AC 9 and AC 16 (warning text; Undo notice after confirm, none after
  cancel) updated.

- 0.2.1 (2026-11-23, H-059 validation): AC 6 tile labels follow SPEC-005 OWN-033's card-total suffix (Champion
  "1 of 1 available · 1 of 2 in this deck", Main "0 of 1 available · 1 of 2 in this deck"). No behaviour change.

- 0.2 (2026-11-23, H-065/H-066/H-067, validator fixes for H-058; RJ's decisions unchanged):
  **H-065:** ACs 3, 6, 7 (first clause and the "instead" case), 8, 10, 12 now have a **When**.
  **H-066:** SHARE-051 rewritten so every deck has exactly one ownership group, first match wins: `locked`
  (locked, not short, R > 0) → `none` (R = 0) → `ready` (unlocked, complete) → `none` (A = 0, including a
  short locked deck holding nothing) → `partial`; a `locked` deck matches no `own` option, the lock filter is
  independent. SHARE-020 gives `no-cards` the message "Lock in needs at least one card besides runes" and
  fixes the check order (already-locked → read-only → locks-unreadable → ownership-unavailable → no-cards →
  incomplete; `LockCheck` comment matches). SHARE-050: R = 0 tile line "No cards to count". AC preamble names
  Deck 3 (`Kennen Aggro`, needs 2); AC 9 quotes "'Kennen Aggro' (locked) …" inside the − confirmations. New
  AC 15 (empty and runes-only decks, filter groups, `no-cards`).
  **H-067:** SHARE-034: the warning is always shown **before** the change inside its confirmation, including
  the SPEC-003 IMP-050 Replace confirmation computed on the parsed import; edits without a confirmation of
  their own (−, typed quantity, tag assignment) ask for one only when a locked deck would go short; Add
  imports never warn; only Undo of an import (IMP-052) shows a notice afterwards, worded "… is now `<n>` cards
  short." (replaces "after an import commit the same text is a notice"). `lockedShortfalls` comment: `after`
  is computed before committing. New AC 16 (Replace / Add / Undo). `depends_on` adds SPEC-003; pins: SPEC-003
  0.6, SPEC-005 0.4, SPEC-007 0.5, SPEC-009 0.2. Still 43 requirements (41 MUST, 1 SHOULD, 1 MUST NOT); 16 ACs.

- 0.1 (2026-11-23, H-058): first draft per RJ (ADR-0006 "Shared cards, lock in and runes") and
  [[Physical Copies Across Decks]]. Shared pool over Legend, Chosen Champion, Main, Battlefields and
  Sideboard per `cardKey`; available = ownedForDecks − copies held by other locked decks; unlocked decks
  reserve nothing; lock in needs a complete deck; unlock, delete (Undo restores unlocked), no card edits while
  locked; lock order by `lockedAt` (earliest wins), short locked decks stay locked and are flagged; card
  breakdown and shared indicator; `DeckLockStore`; pure `computeSharedPool()`, `availability()`, `canLock()`,
  `lockedShortfalls()`. 43 requirements (SHARE-001…072: 41 MUST, 1 SHOULD, 1 MUST NOT), 14 ACs.
