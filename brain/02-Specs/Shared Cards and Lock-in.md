---
tags: [spec]
id: SPEC-008
version: 0.4.7
status: draft
depends_on: [SPEC-001, SPEC-003, SPEC-005, SPEC-006, SPEC-007]
research: ["[[Physical Copies Across Decks]]", "[[Deck Construction Rules]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
ui: ["[[Decks]]"]
board: H-058, H-097, H-076, H-252, H-157, H-256, H-383
as_of: 2026-11-25
---
# SPEC-008: Shared Cards and Lock-in

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** a user's decks draw on one physical collection. Every deck shows which of its cards other
decks also use (which decks, how many each needs). A **complete** deck can be **locked in**: its copies
then stop counting toward any other deck until it is unlocked or deleted (RJ, ADR-0006 "Shared cards, lock
in and runes").

**Key rules**
- SHARE-001/002/006: counted sections are **Legend, Chosen Champion, Main Deck, Battlefields, Runes,
  Sideboard** (v0.4: Runes too, RJ 2026-11-24; SPEC-009 withdrawn); one pool per `cardKey` (card name)
  across all printings and all decks.
- SHARE-004: the pool is SPEC-007 `ownedForDecks` (excluded-tag copies never count).
- SHARE-010/011: **available(D, k) = ownedForDecks(k) − lockedByOthers(D, k)**, where lockedByOthers is
  the copies of `k` held by locked decks other than D. This replaces `ownedForDecks` as SPEC-005's pool.
- SHARE-012: **unlocked decks reserve nothing**; each sees the full available count plus "Also in N other decks".
- SHARE-014/020: Lock in needs a **complete** deck (at least one card, every card fully available, runes
  included), readable ownership and locks, and a writable deck. No legality needed. An empty deck can't be
  locked ("Lock in needs at least one card", v0.4).
- SHARE-024/025: Delete releases the lock (Undo restores the deck **unlocked**); a locked deck's cards
  can't be edited. **v0.4.5 (H-252, RJ 2026-11-25): a lock freezes the cards only.** Rename (name, description,
  source) works at any time on every deck, locked and tournament decks included (SHARE-025, SPEC-006 DECK-081).
- SHARE-029 (v0.4.5, new): feedback after Lock in and Unlock ("… is locked in.", "… is unlocked. Its cards count
  toward your other decks again.", no Undo), the "Locking in…" state, and a visible reason line while Lock in is
  disabled (SHARE-020).
- SHARE-030…033: locked decks hold copies in **lock order** (earliest `lockedAt` first). A lock never yields
  to an unlocked deck; a locked deck that falls short **stays locked, flagged "N cards short"**, and refills
  by itself when copies come back.
- SHARE-034 (v0.3): a Collection change that would leave a locked deck holding fewer copies warns **inside
  its confirmation, before the change** (Collection edits, the SPEC-003 IMP-050 Replace confirmation computed
  on the parsed import, and an Undo of an import); a change without a confirmation of its own asks for one
  only then. The warning reads "… will be `<n>` cards short. It stays locked." No change warns only after the
  fact; a confirmed Undo of an import is also followed by the notice "… is now `<n>` cards short." (RJ 2026-11-23).
- SHARE-051 (v0.2): each deck is in exactly one ownership group: Locked (not short), Ready to build,
  Partly available or None available; an empty deck is None available. **v0.4.2:** when ownership is
  unavailable the group is `unavailable` (matches no ownership option), see SHARE-053.
- SHARE-053 (v0.4.2; **RJ, 2026-11-25, in chat**): when ownership is unavailable (SPEC-005 OWN-062/063) a stored lock is
  still shown: "Locked" badge, lock filter works, Unlock works, Lock in is disabled "Ownership unavailable";
  the deck tile line reads "Ownership unavailable". `canLock` gets the stored lock from the caller (SHARE-020).
- SHARE-030 (v0.4.2): a `lockedAt` that doesn't parse sorts after every parseable one, then by raw string,
  then `deckId`.
- SHARE-034 (v0.4.2; **RJ, 2026-11-25, in chat**): the warning is per card, not per total: a locked deck is warned about when
  it holds fewer copies of **any one** `cardKey` after the change than before.
- SHARE-043: card breakdown "Owned for decks X · Locked by other decks Y · Available Z · This deck needs N"
  plus every other deck using the card (needs, locked or not, holds).
- SHARE-060 (v0.4.4, account-only): locks belong to the signed-in account and live in their own `DeckLockStore`, the browser cache of it (SPEC-010 SYNC-140…, cleared on sign-out); `UserDeck` is unchanged.

**Shared types:** `DeckLock`, `StoredDeckLocks`, `DeckLockStore`, `SharedPoolInput`, `SharedPool`,
`CardPool`, `CardUse`, `DeckLockState`, `CardAvailability`, `LockCheck`. Functions `computeSharedPool()`,
`availability()`, `canLock()`, `lockedShortfalls()` (all pure).
**Depends on:** [[Card Data Model]] v0.4.1, [[Collection Import]] v0.15 (pin-only, H-197; v0.14.1 pin: H-501), [[Your Decks Ownership View]] v0.12 (pin-only, H-197; v0.11.1 pin: H-476; v0.11: H-481; v0.10.3: tile lock badge, H-383),
[[Deck Import]] v0.16 (pin-only, H-197; v0.15 pin: H-483; v0.14.1 pin: H-454; v0.13 pin: H-479; v0.12 pin: H-342), [[My Collection]] v0.15 (pin-only, H-197; v0.14.1 pin-only: its edit confirmations COLL-088 (edit part) are deferred there, the Replace and Undo warnings stay; COLL-102/105/106 read `hold`, SHARE-040 and `availability()`). **Consumers:**
[[Your Decks Ownership View]] (pool, labels, breakdown), [[My Collection]] and [[Collection Import]]
(shortfall warnings), [[Deck Import]] (edit/delete/duplicate rules).
**Open:** nothing waits on RJ in this spec. The two H-076 choices were answered by RJ on 2026-11-25 (in chat, H-157):
SHARE-053 (locked decks while ownership is unavailable, "Ownership unavailable" wording, `unavailable` filter group)
and the SHARE-034 per-card warning (Open questions 5, 6, resolved). Design decisions 3–6 and no force lock
accepted by RJ 2026-11-23.

## Purpose
Users import several community decks they want to build ([[ADR-0006 Two Imports - Collection and Decks]]).
They often share cards: two Kennen decks need the same Legend, the same signature spells, the same
battlefields. A physical card can only sit in one assembled deck at a time ([[Physical Copies Across Decks]]
facts 6, 7), so the app must show where copies are contested, and let the user commit copies to one deck
("lock in") so other decks stop counting them.

This spec owns the cross-deck pool, the lock rules and their storage, and the shared-card display content.
SPEC-005 owns the deck view and tiles and reads this spec's `SharedPool`. Runes have no rule of their own
(SHARE-006; SPEC-009 was withdrawn on 2026-11-24).

## Definitions
- **Deck**: a SPEC-006 `UserDeck` in the `DeckStore` (DECK-090).
- **Counted zone**: `legend`, `champion`, `main`, `battlefields`, `runes`, `sideboard` (`COUNTED_ZONES` =
  the SPEC-005 `ZONE_ORDER`, v0.4; v0.3 left out `runes`).
- **Counted entry**: any `DeckCard` in a counted zone, so every entry of the deck (v0.4; v0.3 left out
  rune entries, SPEC-009 RUNE-001, withdrawn).
- **cardKey / pool key**: SPEC-001 `cardKey` = `nameKey(canonical name)` (CARD-012). All printings and
  variants of a name share it (CARD-013).
- **need(D, k)**: Σ `qty` of `k` over D's counted entries (= SPEC-005 card required, OWN-021).
- **User of k**: a deck with need(D, k) ≥ 1.
- **ownedForDecks(k)**, **ownedExcluded(k)**: from SPEC-007 `deckOwnership(input, k)` (COLL-081); 0 for an
  unknown card (SPEC-005 OWN-061).
- **Locked deck**: a deck with a `DeckLock` in the `DeckLockStore`. **Lock order**: locked decks sorted by
  `lockedAt` ascending, then `deckId` ascending.
- **hold(L, k)**: copies of `k` a locked deck L holds (SHARE-031).
- **lockedByOthers(D, k)**: Σ hold(L, k) over locked decks L ≠ D.
- **available(D, k)**: max(0, ownedForDecks(k) − lockedByOthers(D, k)).
- **Complete deck**: SHARE-014. **Short locked deck**: SHARE-033.
- **Now**: the current time, an input to locking only (`lockedAt`). The pool computation reads no clock.

## Design decisions (summary)
1. **Every physical section counts, runes too** (RJ, ADR-0006; runes added by RJ on 2026-11-24: "Allow
   users to import runes as well and treat them like any other card."). Legend, Battlefield and Rune cards
   are not Main Deck cards, but each assembled deck needs its own physical copies (facts 6, 7, 10), so they
   compete across decks like any card. Chosen Champion, Main Deck and Sideboard copies of one name are one
   pool (facts 2, 3, 8). Rune names have no per-name limit (fact 10), so one deck can need 9 or 12 of one.
2. **Pool per card name, not per printing.** The deck rules count names (fact 2, fact 14), decks store only
   `cardKey`s (DECK-096), and SPEC-007 already gives one per-name number (`ownedForDecks`) from its
   per-printing Collection. So this spec never looks at printings, and the "exclude from decks" tag applies
   before any lock.
3. **Earliest lock wins** (Claude default, accepted by RJ 2026-11-23). When locked decks together need more than the user owns (after a
   re-import or edit), the deck locked first keeps its copies. Any fixed rule works; this one never takes
   copies from a deck that was complete when the user locked a newer one.
4. **A lock never yields to an unlocked deck** (Claude default, accepted by RJ 2026-11-23). That is the point of locking.
5. **Short locked decks stay locked** (Claude default, accepted by RJ 2026-11-23). Auto-unlocking would silently hand the deck's
   remaining copies to other decks. The deck is flagged instead, and the user decides.
6. **No card edits while locked; Undo restores unlocked** (Claude default, accepted by RJ 2026-11-23). Editing could silently grow a
   lock's hold and push a later lock short. Restoring a deleted deck's old lock time could take copies from a
   deck locked during the Undo window. **The name, description and source are not cards** (v0.4.5, RJ 2026-11-25:
   "All deck names can be changed by the user at any time"): they stay editable while locked, because they change
   no need, hold or lock order.
7. **Only the lock is stored.** Holds, availability and shortfall are computed from (decks, locks,
   collection, tags) every time, like SPEC-005 ownership (OWN-026).

## Requirements
### A. Counted sections and the pool
| ID | Level | Requirement | Source |
|---|---|---|---|
| SHARE-001 | MUST | Shared and locked counting covers the counted zones **Legend, Chosen Champion, Main Deck, Battlefields, Runes and Sideboard** (v0.4: Runes added; v0.3 left rune entries out). | [[ADR-0006 Two Imports - Collection and Decks]] "Shared cards, lock in and runes"; RJ decision 2026-11-24; [[Physical Copies Across Decks]] facts 1, 6, 7, 8, 10 |
| SHARE-002 | MUST | There is **one pool per `cardKey`**, across all printings and variants and across all counted zones of all decks. The Chosen Champion, Main Deck and Sideboard copies of one name draw on the same pool. A Legend and a Battlefield are pools of their own because their names differ from every unit's name (e.g. Legend `Kennen, Heart of the Tempest` vs. Chosen Champion `Kennen, Storm of Shuriken`). | [[Physical Copies Across Decks]] facts 2, 3, 4, 6, 7, 14; [[Deck Construction Rules]] #5; [[Card Data Model]] CARD-012, CARD-013 |
| SHARE-003 | MUST | need(D, k) uses the deck's stored quantities as they are, also when they break a rule (e.g. 4 copies, or 2 of one battlefield). Legality stays SPEC-002's job and never changes a count here. | [[Deck Import]] DECK-050 (legality never blocks); design rule |
| SHARE-004 | MUST | The pool size of `k` is **`ownedForDecks(k)`** from SPEC-007 COLL-081. Copies carrying an "exclude from decks" tag (`ownedExcluded`) are never available to any deck, locked or not; they are only shown (SHARE-043). | [[My Collection]] COLL-081; [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 #6 |
| SHARE-005 | MUST | Every deck in the `DeckStore` takes part, including read-only decks (DECK-091) and separate copies made with "Add another copy" (DECK-064) or Duplicate (DECK-084): each is its own deck and its own user of its cards. | [[Deck Import]] DECK-064, DECK-084, DECK-090, DECK-091; design rule |
| SHARE-006 | MUST | **Runes are cards** (v0.4). A rune entry (in the `runes` zone, or a card with `category: 'rune'` in any zone) has a need, a hold, a shared indicator, a breakdown and a place in other decks' "Other decks using this card" lists exactly like any card; it counts toward completeness (SHARE-014), `no-cards` and `incomplete` (SHARE-020), shortfall (SHARE-033, SHARE-034), the deck tile line (SHARE-050) and the ownership group (SHARE-051). Every printing of a rune name shares one pool (SHARE-002). No function, label or check in this spec tests for runes. | RJ decision 2026-11-24 ("Allow users to import runes as well and treat them like any other card."); [[Physical Copies Across Decks]] facts 10, 11, 14 |

### B. Availability
| ID | Level | Requirement | Source |
|---|---|---|---|
| SHARE-010 | MUST | **lockedByOthers(D, k)** = Σ hold(L, k) over every locked deck L ≠ D (SHARE-031). | [[ADR-0006 Two Imports - Collection and Decks]] "Shared cards, lock in and runes" |
| SHARE-011 | MUST | **available(D, k) = max(0, ownedForDecks(k) − lockedByOthers(D, k))**. SPEC-005 uses available(D, k) as the deck's pool for `k` (OWN-020) for allocation, fill, labels, summary, missing list and filters. With no locks, available = ownedForDecks. | [[ADR-0006 Two Imports - Collection and Decks]] (3 owned, deck 1 locked → deck 2 "0 of 3 available"; 4 owned → 1) |
| SHARE-012 | MUST | **Unlocked decks reserve nothing.** An unlocked deck's need never lowers another deck's available count. Two unlocked decks that each need 3 of a card the user owns 2 of both show 2 available. | [[ADR-0006 Two Imports - Collection and Decks]]; RJ (H-058 brief) |
| SHARE-013 | MUST | Within one deck, available(D, k) is split over the deck's counted zone entries of `k` by SPEC-005 OWN-022 (zone order, Main before Sideboard). | [[Your Decks Ownership View]] OWN-022 |
| SHARE-014 | MUST | A deck is **complete** when it has at least one counted entry and available(D, k) ≥ need(D, k) for every counted `cardKey` k. An unknown card (OWN-061) has pool 0, so a deck containing one is not complete. Rune entries count like any entry (SHARE-006; v0.3's exception, SPEC-009 RUNE-004, is withdrawn). | [[ADR-0006 Two Imports - Collection and Decks]]; RJ decision 2026-11-24 |
| SHARE-015 | MUST | The **other uses** of `k` for deck D are every other deck that is a user of `k`, each with deck id, name, need, locked or not, and hold (0 if not locked). Order: locked decks in lock order, then unlocked decks by name (SPEC-007 COLL-034 name comparison), then `deckId`. | RJ (H-058 brief: "which ones, and how many each needs"); design rule |

### C. Locking and unlocking
| ID | Level | Requirement | Source |
|---|---|---|---|
| SHARE-020 | MUST | The deck view header has a **Lock in** action on an unlocked deck and **Unlock** on a locked one. Lock in is enabled only when `canLock()` is ok: the deck is complete (SHARE-014), ownership is available (SPEC-005 OWN-062/063 not in effect), the lock store is readable (SHARE-061) and the deck is not read-only (DECK-091). Otherwise it is disabled with the reason of the **first** failing check, in this order (`LockCheck.reason`): `read-only` "This deck is read-only"; `locks-unreadable` "Locked decks could not be read"; `ownership-unavailable` "Ownership unavailable"; `no-cards` (the deck has no entry at all) "Lock in needs at least one card" (v0.4; v0.3 also covered a runes-only deck and read "… besides runes"); `incomplete` "Lock in needs every card available: `<n>` cards short" (n = counted `cardKey`s with available < need; "1 card short" for one). `already-locked` is checked before all of these and has no message: a locked deck shows Unlock instead (SHARE-022). **Whether a deck is locked comes from the lock store, not from the pool** (v0.4.2): the caller passes `isLocked` (the deck has a `DeckLock` in a readable lock store), so `already-locked` is returned also when ownership is unavailable (the pool is null, SHARE-053). With an unreadable lock store `isLocked` is false and the reason is `locks-unreadable`. **v0.4.5 (RJ default, [[Decks]] §13 choice 22):** while Lock in is disabled the button stays focusable (`aria-disabled`) and the reason is **visible text** next to or under the actions, tied to the button; a tooltip alone does not count (it does not work on touch). | [[ADR-0006 Two Imports - Collection and Decks]] ("when a deck is complete, the user can lock it in") |
| SHARE-021 | MUST | Lock in asks for confirmation: "Lock in '`<deck name>`'? Its cards won't count toward your other decks until you unlock or delete it." If other decks use any of its counted cards, the dialog SHOULD add "`<m>` other decks use some of these cards: `<names>`" (at most 3 names, then "and `<r>` more"). On confirm it stores `DeckLock { deckId, lockedAt: now }`. | [[ADR-0006 Two Imports - Collection and Decks]]; design rule |
| SHARE-022 | MUST | A lock is **per deck**, at most one per deck. Locking a locked deck is not possible (the action shows Unlock). | design rule |
| SHARE-023 | MUST | **Unlock** removes the deck's lock at once, without confirmation; its copies are available to other decks on the next computation. Locking it again needs SHARE-020 again, with a new `lockedAt`. | [[ADR-0006 Two Imports - Collection and Decks]] ("until that deck is unlocked or deleted") |
| SHARE-024 | MUST | **Delete** (DECK-082) removes the deck and its lock in one action; the confirmation of a locked deck adds "Its locked cards will count toward your other decks again." **Undo** (DECK-083) restores the deck **unlocked**. | [[ADR-0006 Two Imports - Collection and Decks]]; design decision 6 |
| SHARE-025 | MUST | While a deck is locked, its **cards can't be changed**: the DECK-080 actions (add a card, change a quantity, move between zones, remove an entry) are disabled with the hint "Unlock this deck to change its cards". Rename, source and notes (DECK-081), Export (DECK-085), Duplicate (DECK-084) and Delete stay available. **v0.4.5 (RJ 2026-11-25): "a lock freezes the cards, not the name".** Rename works on a locked deck exactly as on an unlocked one, tournament decks included: the name, the description (`notes`) and, for an imported deck, the source text and URL; a rename never changes the lock, `lockedAt`, any hold or need, or the lock order (SHARE-030), and does not unlock the deck. Renaming changes the `deckName` other decks list under "Other decks using this card" (SHARE-015, SHARE-043), and where unlocked decks are ordered by name, their position. | design decision 6; RJ 2026-11-25 ([[Decks]] §13a #2) |
| SHARE-026 | MUST | New decks are unlocked: Deck Import saves, "Add to your decks" (DECK-060), "Add another copy" (DECK-064) and Duplicate (DECK-084) never copy a lock. | design rule |
| SHARE-027 | MUST | Locking needs no legality verdict: an illegal or "Not fully checked" deck can be locked, and a lock says nothing about legality. | [[Deck Import]] DECK-050; design rule |
| SHARE-028 | MUST | No snapshot of the deck is stored with the lock. If a locked deck's cards change anyway (another tab, a restore), its need is recomputed from the current contents. | design decision 7 |
| SHARE-029 | MUST | **Feedback and saving state (v0.4.5).** (a) After Lock in is saved: the header badge appears (SHARE-041), the tiles read "… locked in", and a snack bar says "`<deck name>` is locked in." (b) After Unlock: a snack bar says "`<deck name>` is unlocked. Its cards count toward your other decks again." **Neither has an Undo**: locking again needs SHARE-020 and a new `lockedAt` (SHARE-023). (c) While the lock is saving, the Lock in button reads "Locking in…" and stays `aria-disabled`; a failed save shows "Couldn't save the lock. Try again." (SHARE-063) and changes nothing. (d) The confirmation SHARE-021 keeps its text; its default focus is the Lock in button, Escape cancels. The snack bar names the deck without quotes. | RJ default ([[Decks]] §13 choice 16: "Locking changes other decks' numbers out of sight, so say so"); (c), (d) from [[Decks]] §9 |

### D. Lock order and shortfall
| ID | Level | Requirement | Source |
|---|---|---|---|
| SHARE-030 | MUST | **Lock order** is a total order, compared in these steps: (1) `lockedAt` parsed as an ISO 8601 date-time, ascending; a `lockedAt` that does not parse sorts **after every parseable one** (v0.4.2); (2) the raw `lockedAt` string, ascending (separates equal instants written differently and orders two unparseable values); (3) `deckId` ascending. A deck whose `lockedAt` does not parse is still locked and shows "Locked" without the "Locked in on `<date>`" text (SHARE-041). | design decision 3; H-059 engine choice, H-076 |
| SHARE-031 | MUST | **Holds.** For each `cardKey` k, go through the locked decks in lock order: hold(L, k) = min(need(L, k), max(0, ownedForDecks(k) − Σ hold of the locked decks before L)). So Σ holds ≤ ownedForDecks(k), and a locked deck that is not short holds exactly its need. | design decision 3; [[ADR-0006 Two Imports - Collection and Decks]] |
| SHARE-032 | MUST | A lock **never yields copies to an unlocked deck**. Among locked decks, the earlier lock is served first; a later lock is the one that goes short. | design decisions 3, 4 |
| SHARE-033 | MUST | A locked deck is **short** when hold(L, k) < need(L, k) for some counted k. A short deck **stays locked** (never unlocked automatically) and is flagged "Locked · `<n>` cards short" (n = number of `cardKey`s short; "1 card short" for one). It holds only the copies it really has. When copies come back (re-import, edit, tag change), holds refill in lock order with no user action and the flag disappears. | design decision 5 |
| SHARE-034 | SHOULD | **Which decks are warned about (v0.4.2, per card):** a deck that is locked both before and after the change is listed when, for **at least one** `cardKey`, hold(L, k) after is lower than hold(L, k) before. A Σ-total that stays equal does not hide it (a Replace import that moves copies from card A to card B warns when the deck now holds fewer of A, even if it holds more of B). A deck whose holds only rise or stay equal is not listed. Unchanged otherwise: When a Collection change would lower the copies a locked deck holds, the warning is shown **before** the change, **inside the change's confirmation**, naming each affected locked deck: "'`<deck name>`' (locked) will be `<n>` cards short. It stays locked." ("1 card short" for one; n counts `cardKey`s, as in SHARE-033; a short deck stays locked, SHARE-033). This one warning string is used in every confirmation (edits, Replace, Undo). This covers the SPEC-007 edits (− on an entry, a typed lower quantity, Remove card, turning on an exclude flag, assigning an excluded tag; COLL-088; an edit that has no confirmation of its own asks for one only when `lockedShortfalls` is not empty), an Owned Cards Import committed in **Replace** mode, whose SPEC-003 IMP-050 confirmation adds the warning computed on the parsed import (the collection as it would be after Replace; IMP-050a), and (v0.3) an **Undo** of the last import commit (IMP-052), computed on the snapshot it would restore: the warning goes inside the SPEC-007 COLL-058 Undo confirmation when manual edits followed the import; an Undo with no confirmation of its own asks for one only when `lockedShortfalls` is not empty, like the edits above. After a confirmed **Undo** (only), a notice per affected deck follows: "'`<deck name>`' (locked) is now `<n>` cards short." Cancelling changes nothing and shows no notice. An import committed in **Add** mode never lowers a hold, so it has no warning. No change shows the warning only after it has run. Computed with `lockedShortfalls(before, after)`, where `after` is the `SharedPool` for the collection as it would be after the change. | design rule; SHARE-033; [[My Collection]] COLL-058, COLL-084, COLL-088 (confirmation pattern); [[Collection Import]] IMP-050, IMP-050a, IMP-052; RJ decision 2026-11-23 (H-049 follow-up: Undo warns before and notifies after; "It stays locked."); the per-card comparison: RJ 2026-11-25 (in chat, H-157) |
| SHARE-035 | MUST | Holds, available counts, completeness and shortfall are **computed, never stored** (only `DeckLock` is stored). | design decision 7; [[Your Decks Ownership View]] OWN-026 |

### E. Display in a deck
| ID | Level | Requirement | Source |
|---|---|---|---|
| SHARE-040 | MUST | Tile count labels (SPEC-005 OWN-033): in an unlocked deck "`<allocated>` of `<qty>` available" (e.g. "0 of 3 available"); in a locked deck "`<allocated>` of `<qty>` locked in" (e.g. "3 of 3 locked in"). Fill and state follow OWN-023 from the allocation of available(D, k). | [[ADR-0006 Two Imports - Collection and Decks]] ("deck 2 then shows 0 of 3 available") |
| SHARE-041 | MUST | A **locked deck** shows a "Locked" badge (lock icon plus text, not colour alone) in the **Deck detail header** with "Locked in on `<date>`" (`lockedAt` as a local date, SPEC-005 OWN-090). **v0.4.7:** on the **deck tile** (Decks list) the lock is the same badge as a **separate badge** (`app-lock-badge`) next to the ownership chip, **without a date**; the date is only in the header. When not short, every counted tile is full colour. When short, the badge reads "Locked · `<n>` cards short" and the short tiles are partial or darkened per their holds. | RJ (H-058 brief: "all owned, locked badge"); design decision 5; RJ 2026-11-25 (H-382 (2): separate badge on the tile, no date) |
| SHARE-042 | MUST | **Shared indicator.** Every counted tile of `k` in deck D, when `k` has at least one other use (SHARE-015), shows "Also in `<n>` other deck" / "Also in `<n>` other decks", plus " · `<m>` locked" when m ≥ 1 of them are locked. It is text with an icon, and it is part of the tile's accessible name. Rune tiles show it like any tile (SHARE-006). | [[ADR-0006 Two Imports - Collection and Decks]] ("each deck must show that the card is also used by other imported decks") |
| SHARE-043 | MUST | **Card breakdown** in the card's details, i.e. the Card tab of the card panel or the card dialog (SPEC-005 OWN-042, OWN-112; v0.4.5: there is no inline expand), the same from every zone tile of `k` in D: "Owned for decks: `<X>`" (+ " (`<E>` more excluded from decks)" when E > 0), "Locked by other decks: `<Y>`", "Available to this deck: `<Z>`", "This deck needs: `<N>`", and in a locked deck "Locked in by this deck: `<H>`". X = ownedForDecks, Y = lockedByOthers(D, k), Z = available(D, k), N = need(D, k), H = hold(D, k). Then a list **"Other decks using this card"** in SHARE-015 order, one row per deck: "`<deck name>` · needs `<n>` · Locked, holds `<h>`" or "`<deck name>` · needs `<n>` · Not locked", each linking to that deck. With no other use: "No other deck uses this card." | RJ (H-058 brief: "owned X, locked by other decks Y, available Z, needed N"; "which decks locked it and how many each holds") |
| SHARE-044 | MUST | Accessible names include the new text, e.g. "Hextech Ray, Main Deck, 0 of 3 available, also in 1 other deck, 1 locked". The lock badge and the breakdown are plain text a screen reader reads in order. | design rule (WCAG 2.2 SC 1.4.1, 1.3.1) |

### F. Deck list and "ready to build"
| ID | Level | Requirement | Source |
|---|---|---|---|
| SHARE-050 | MUST | A deck tile in the Decks list shows the lock badge ("Locked" or "Locked · `<n>` cards short"; **v0.4.7:** a separate badge next to the ownership chip, no date, SHARE-041) and the ownership line "`<A>` of `<R>` copies available" (unlocked) or "`<A>` of `<R>` copies locked in" (locked), A and R as in SPEC-005 OWN-050. A deck with R = 0 (no entry at all) shows "No cards to count" instead. **v0.4.5:** the tile also shows the user's completion percentage `A / R` and the ownership chip (SPEC-005 OWN-101, OWN-102; **v0.4.7:** a locked complete deck has no chip, only the badge; a short locked deck has its Partly / None available chip next to the badge); the percentage uses this line's A and R, so a locked deck's percentage is its locked-in copies over its need. | design rule |
| SHARE-051 | MUST | The Decks list ownership filter (SPEC-005 OWN-006) uses availability. Every deck has **exactly one** ownership group (SPEC-005 `DeckTileSummary.ownershipFilter`), taken from the **first** rule that matches, in this order: (0) `unavailable` (v0.4.2): ownership is unavailable (SHARE-053), whatever the lock; (1) `locked`: locked and not short (A = R, R > 0); (2) `none`: R = 0 (empty deck); (3) `ready`: unlocked and complete (SHARE-014; then A = R); (4) `none`: A = 0, which includes a short locked deck holding no copies; (5) `partial`: every other deck (0 < A < R), which includes a short locked deck holding some copies. The filter options are **Ready to build** (`ready`), **Partly available** (`partial`) and **None available** (`none`); a `locked` or `unavailable` deck matches none of the three and is found with the lock filter. The lock filter **Locked** / **Not locked** is independent of the ownership filter (a short locked deck matches both its ownership option and Locked). URL: `own=ready|partial|none`, `lock=locked|unlocked`. | Product vision ("which decks you can build right now"); design rule |
| SHARE-053 | MUST | **Ownership unavailable (v0.4.2; RJ 2026-11-25, in chat, H-157: keep showing the lock).** While SPEC-005 OWN-062 or OWN-063 is in effect (collection or tags unreadable, or catalog not loaded) no `SharedPool` exists, but the lock store may still be readable. Then: (a) a deck with a stored `DeckLock` has the lock state `{ locked: true, lockedAt, complete: false, short: false, cardsShort: [] }` (holds are unknown, so it is never shown as short); a deck without a lock, or any deck when the lock store is unreadable (SHARE-061), has `lock: null`. (b) A locked deck shows the "Locked" badge (on the tile without a date, in the Deck detail header with "Locked in on `<date>`", SHARE-041), never "cards short", and matches the lock filter **Locked**. (c) **Unlock** stays enabled (it needs no ownership); Lock in is disabled with `ownership-unavailable` (SHARE-020). (d) Its ownership group is `unavailable` (SHARE-051). (e) Its tile line (SHARE-050) reads **"Ownership unavailable"**, the term of the SPEC-005 OWN-062 banner; no count line, no "locked in" text, no completion percentage and no ownership chip (SPEC-005 OWN-101 (c), OWN-102; the lock badge stays). (f) Lock holds are not computed, and no function shows a hold or a shortfall. | RJ 2026-11-25 (in chat, H-157; was the H-076 gate); [[Your Decks Ownership View]] OWN-062/063, OWN-065 |
| SHARE-052 | MUST NOT | Nothing here ranks decks against each other or the meta, or suggests which deck to lock (ADR-0003). | [[ADR-0003 Tournament Results Only]] |

### G. Storage
| ID | Level | Requirement | Source |
|---|---|---|---|
| SHARE-060 | MUST | **Account-only storage (v0.4.4).** Locks belong to the signed-in account (its `state/locks` document, [[Accounts and Sync]] SPEC-010 SYNC-017, SYNC-070…077). They are read and written through a `DeckLockStore` interface, separate from the `DeckStore`, backed by the **browser cache** of the account (SYNC-140…SYNC-145), cleared on sign-out, account deletion and when a different account signs in (SYNC-142) and never uploaded into an account (SYNC-143). No lock exists outside an account. `UserDeck` (DECK-096) is unchanged. | [[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2); [[Deck Import]] DECK-090, DECK-096; [[Accounts and Sync]] |
| SHARE-061 | MUST | `StoredDeckLocks` has `schemaVersion: 1`. A newer or unreadable record is never overwritten; counts then **ignore all locks**, a banner says "Locked decks could not be read; counts ignore locks.", and Lock in / Unlock are disabled. | [[Deck Import]] DECK-091 (same pattern); design rule |
| SHARE-062 | MUST | A lock whose `deckId` is not in the `DeckStore` is ignored by the computation and removed the next time the lock store is saved. | design rule |
| SHARE-063 | MUST | A failed save leaves the previous lock state in place and shows "Couldn't save the lock. Try again." | [[Deck Import]] DECK-093 (same pattern) |
| SHARE-064 | MUST | Lock changes made in another tab are picked up like other store changes (SPEC-005 OWN-071). | [[Your Decks Ownership View]] OWN-071 |
| SHARE-065 | MUST | If the deck JSON backup (DECK-087) is offered, it does not carry locks, and restored decks are unlocked. | design decision 6 |

### H. Computation
| ID | Level | Requirement | Source |
|---|---|---|---|
| SHARE-070 | MUST | `computeSharedPool(input)` is a **pure function** of (decks, locks, `DeckOwnershipInput`): same inputs, same output; no network, no storage writes, no clock. It calls SPEC-007 `deckOwnership(input, k)` at most once per counted `cardKey` (none for an unknown card). | [[Your Decks Ownership View]] OWN-025; [[My Collection]] COLL-081 |
| SHARE-071 | MUST | The Decks list and every deck view read the **same** `SharedPool` for the same inputs, so a deck tile's summary always equals its deck view (OWN-073). | design rule |
| SHARE-072 | MUST | With 200 decks of 150 entries (DECK-092) and 100 locks, `computeSharedPool` finishes in under 100 ms on a mid-range laptop. | [[Deck Import]] DECK-092; design rule |

## Data contract
```ts
// shapes only; no implementation
import type { UserDeck, DeckZone } from './deck-import';                  // SPEC-006 v0.16
import type { DeckOwnershipInput } from './my-collection';              // SPEC-007 v0.11, COLL-081
type CardKey = string;
type IsoDateTime = string;                                              // ISO 8601 UTC

// Counted zones: every zone, = SPEC-005 ZONE_ORDER (SHARE-001, SHARE-006; v0.4 added 'runes').
const COUNTED_ZONES: DeckZone[] = ['legend', 'champion', 'main', 'battlefields', 'runes', 'sideboard'];

// ---- Stored (SHARE-060..065) ----
interface DeckLock {
  deckId: string;                 // UserDeck.id
  lockedAt: IsoDateTime;          // lock order key (SHARE-030)
}
interface StoredDeckLocks {
  schemaVersion: 1;
  updatedAt: IsoDateTime;
  locks: DeckLock[];              // at most one per deckId (SHARE-022); orphans dropped on save (SHARE-062)
}
interface DeckLockStore {         // adapter: the browser cache of the account's locks (SHARE-060)
  load(): Promise<StoredDeckLocks | null>;   // throws / reports unreadable or newer → SHARE-061
  save(l: StoredDeckLocks): Promise<void>;
}

// ---- Computed (never stored, SHARE-035) ----
interface SharedPoolInput {
  decks: UserDeck[];                         // every deck in the DeckStore (SHARE-005)
  locks: DeckLock[] | null;                  // null = lock store unreadable → all locks ignored (SHARE-061)
  ownership: DeckOwnershipInput;             // SPEC-007
}

interface CardUse {                          // one deck using one card (SHARE-015)
  deckId: string;
  deckName: string;
  need: number;                              // need(D, k), counted zones only
  locked: boolean;
  hold: number;                              // hold(D, k); 0 when not locked
}

interface CardPool {
  cardKey: CardKey;
  ownedForDecks: number;                     // COLL-081; 0 for an unknown card
  ownedExcluded: number;                     // COLL-081; never available
  heldTotal: number;                         // Σ hold over locked decks; ≤ ownedForDecks
  uses: CardUse[];                           // every user of k, SHARE-015 order
}

interface DeckLockState {
  deckId: string;
  locked: boolean;
  lockedAt: IsoDateTime | null;
  complete: boolean;                         // SHARE-014 (for a locked deck: not short)
  short: boolean;                            // locked and some hold < need (SHARE-033)
  cardsShort: CardKey[];                     // counted cardKeys with allocated < need, deck order of first appearance
}

interface SharedPool {
  locksIgnored: boolean;                     // true when input.locks === null (SHARE-061)
  byCard: Record<CardKey, CardPool>;         // counted cardKeys of all decks
  byDeck: Record<string, DeckLockState>;
}

interface CardAvailability {                 // what one deck sees for one card (SHARE-043)
  deckId: string;
  cardKey: CardKey;
  ownedForDecks: number;                     // X
  ownedExcluded: number;                     // E
  lockedByOthers: number;                    // Y (SHARE-010)
  available: number;                         // Z = max(0, X − Y) (SHARE-011)
  need: number;                              // N
  heldByThisDeck: number | null;             // H for a locked deck, null otherwise
  otherUses: CardUse[];                      // SHARE-015, without this deck
}

type LockCheck =                            // first failing check wins (SHARE-020):
  | { ok: true }                             // already-locked → read-only → locks-unreadable →
  | { ok: false; reason: 'already-locked' | 'no-cards' | 'incomplete' | 'ownership-unavailable'
                       | 'locks-unreadable' | 'read-only'; cardsShort?: number };
                                             // ownership-unavailable → no-cards → incomplete;
                                             // cardsShort only with 'incomplete'; message per SHARE-020

// computeSharedPool(input: SharedPoolInput): SharedPool                       — pure (SHARE-070)
// availability(pool: SharedPool, deckId: string, cardKey: CardKey): CardAvailability — pure
//   a cardKey not in pool.byCard (no deck uses it) gets all zeros; since v0.4 rune cards are in byCard
// canLock(pool: SharedPool | null, deck: UserDeck, readOnly: boolean, isLocked: boolean): LockCheck — pure;
//   pool null = ownership unavailable (OWN-062/063); isLocked = the deck has a DeckLock in a readable
//   lock store (v0.4.2, SHARE-020), so 'already-locked' also works with a null pool
// lockedShortfalls(before: SharedPool, after: SharedPool):
//   { deckId: string; deckName: string; cardsShort: number }[]                — pure (SHARE-034);
//   locked decks that hold fewer copies of at least one cardKey in `after` than in `before` (v0.4.2;
//   v0.4.1 compared the Σ over all cards);
// With ownership unavailable (SHARE-053) the caller builds DeckLockState from the stored locks:
//   { deckId, locked: true, lockedAt, complete: false, short: false, cardsShort: [] }, else null;
// lockedShortfalls (cont.):
//   cardsShort = the deck's number of short cardKeys in `after`. `after` is computed from the
//   collection as it would be after the change (Collection edit, Replace import, Undo of an import:
//   the snapshot it would restore), before it is committed (v0.3); for an Undo the same list
//   drives the notice shown after it is confirmed
```

## Acceptance criteria
`Hextech Ray` is the card in RJ's example (H-058 brief); deck names are illustrative. "Deck 1" is
`Kennen Tempo`, "Deck 2" is `Kennen Control`, "Deck 3" (AC 9 only) is `Kennen Aggro` and needs 2 `Hextech
Ray`. Unless stated, Decks 1 and 2 each need 3 `Hextech Ray` in Main, no copy is excluded, and every other
card of every deck is owned in full.

1. **2 owned, no locks** (SHARE-011, SHARE-012, SHARE-042, SHARE-043, SHARE-020)
   **Given** `ownedForDecks('hextech ray') = 2` and no locks **When** either deck opens **Then** its Hextech
   Ray tile is `allocated 2`, fill 2/3, `partial`, label "2 of 3 available", indicator "Also in 1 other
   deck"; the breakdown reads "Owned for decks: 2", "Locked by other decks: 0", "Available to this deck: 2",
   "This deck needs: 3", and lists "Kennen Control · needs 3 · Not locked" (from Deck 1). Lock in is
   disabled with "Lock in needs every card available: 1 card short".
2. **3 owned, Deck 1 locked** (SHARE-031, SHARE-040, SHARE-041, SHARE-042, SHARE-043)
   **Given** `ownedForDecks = 3`, both decks complete, **When** the user locks Deck 1 **Then** Deck 1 shows
   the "Locked" badge and "3 of 3 locked in" (full colour), its breakdown adds "Locked in by this deck: 3";
   Deck 2's tile is `allocated 0`, `none`, "0 of 3 available", indicator "Also in 1 other deck · 1 locked";
   its breakdown reads Owned for decks 3, Locked by other decks 3, Available 0, Needs 3, and lists
   "Kennen Tempo · needs 3 · Locked, holds 3"; Deck 2's missing list has `3 Hextech Ray` under `Main Deck:`;
   Deck 2's Lock in is disabled ("1 card short").
3. **4 owned, Deck 1 locked** (SHARE-011)
   **Given** AC 2 with `ownedForDecks = 4` **When** Deck 2's view opens **Then** Deck 2 shows "1 of 3 available", fill 1/3, and the
   breakdown Owned 4, Locked by other decks 3, Available 1, Needs 3.
4. **Unlock releases** (SHARE-023)
   **Given** AC 2 **When** the user unlocks Deck 1 **Then**, without reload, both decks show "3 of 3
   available", Deck 2's list row reads "Kennen Tempo · needs 3 · Not locked", and Deck 2 can be locked.
5. **Delete releases; Undo restores unlocked** (SHARE-024)
   **Given** AC 2 **When** the user deletes Deck 1 (confirmation includes "Its locked cards will count toward
   your other decks again.") **Then** Deck 2 shows "3 of 3 available" and "No other deck uses this card."
   **When** the user locks Deck 2 and then presses Undo on Deck 1's delete **Then** Deck 1 is back, unlocked,
   showing "0 of 3 available", and Deck 2 stays "3 of 3 locked in".
6. **Chosen Champion shares the main pool** (SHARE-002, SHARE-013)
   **Given** Deck A with Chosen Champion `Kai'Sa, Survivor` ×1 and `Kai'Sa, Survivor` ×2 in Main (need 3),
   Deck B with Chosen Champion `Kai'Sa, Survivor` ×1 and ×1 in Main (need 2), `ownedForDecks = 4`, and
   Deck A locked **When** Deck B's view opens **Then** Deck A holds 3; Deck B's available is 1, so its Champion tile is "1 of 1 available · 1 of 2 in this deck"
   (full) and its Main tile "0 of 1 available · 1 of 2 in this deck" (none; SPEC-005 OWN-033 card-total suffix); Deck B's breakdown reads Owned 4, Locked by other
   decks 3, Available 1, Needs 2.
7. **Legend** (SHARE-001, SHARE-002)
   **Given** two decks with Legend `Kennen, Heart of the Tempest` ×1, `ownedForDecks = 1`, no locks **When**
   either deck's view opens **Then** both Legend tiles are "1 of 1 available" with "Also in 1 other deck".
   **When** Deck 1 is locked **Then** Deck 2's Legend tile is "0 of 1 available" (darkened) and Deck 2 is not
   complete. **Given** `ownedForDecks = 2` instead **When** Deck 1 is locked **Then** Deck 2's Legend is "1 of
   1 available". The Legend never shares a pool with `Kennen, Storm of Shuriken`.
8. **Battlefield** (SHARE-001)
   **Given** `Zaun Warrens` ×1 in the Battlefields of a locked deck and of an unlocked deck, `ownedForDecks =
   1` **When** the unlocked deck's view opens and the user expands its Zaun Warrens tile **Then** that tile is
   "0 of 1 available" with "Also in 1 other deck · 1 locked", and the breakdown lists the locked deck with
   "needs 1 · Locked, holds 1".
9. **Shortfall after a collection change; earliest lock wins** (SHARE-031…034)
   **Given** Deck 1 locked at 10:00 (needs 3) and Deck 3 (`Kennen Aggro`) locked at 11:00 (needs 2 Hextech
   Ray), `ownedForDecks = 5` **When** the user presses − twice on a Hextech Ray entry in Collection **Then**
   the confirmations of the first − (5 → 4) and the second − (4 → 3) each warn "'Kennen Aggro' (locked) will
   be 1 card short. It stays locked." before the change (SHOULD; Deck 1 is never named, it keeps its 3); after both, Deck 1
   holds 3 ("3 of 3 locked in"), Deck 3 holds 0 ("0 of 2 locked in"), both stay locked, and Deck 3's badge
   reads "Locked · 1 card short". **When** the user adds 2 copies back **Then**
   Deck 3 holds 2 and the flag disappears with no other action.
10. **Excluded copies never count** (SHARE-004, SHARE-043)
    **Given** 4 Hextech Ray owned, 1 of them a foil tagged `Collector` (exclude from decks), so
    `ownedForDecks = 3`, `ownedExcluded = 1`, and Deck 1 locked **When** Deck 2's view opens and the user
    expands its Hextech Ray tile **Then** Deck 2's breakdown reads "Owned for decks: 3 (1 more excluded from
    decks)", "Locked by other decks: 3", "Available to this deck: 0".
11. **Locked decks can't change cards** (SHARE-025, SHARE-026)
    **Given** Deck 1 locked **When** the user opens Edit **Then** add, quantity, move and remove are disabled
    with "Unlock this deck to change its cards"; Rename works. **When** the user duplicates Deck 1 **Then**
    the copy is unlocked and shows "0 of 3 available" for Hextech Ray (Deck 1 holds all 3).
12. **Runes block lock in like any card** (SHARE-006, SHARE-014, SHARE-020; v0.4, replaces "Runes never
    block lock in")
    **Given** `KENNEN_1` ([[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]], Runes `Chaos Rune` ×9 and
    `Order Rune` ×3), every non-rune card owned in full, and no rune owned **When** the deck view opens
    **Then** the deck is not complete, `canLock` returns `{ ok: false, reason: 'incomplete', cardsShort: 2 }`
    and Lock in is disabled with "Lock in needs every card available: 2 cards short". **When** the user
    imports `9 Chaos Rune` and `3 Order Rune` (SPEC-003 Add) **Then**, without reload, the deck is complete
    and Lock in is enabled.
13. **Lock store unreadable** (SHARE-061)
    **Given** `StoredDeckLocks` with `schemaVersion: 2` **When** Decks opens **Then** the banner "Locked
    decks could not be read; counts ignore locks." shows, AC 2's Deck 2 shows "3 of 3 available", Lock in
    and Unlock are disabled, and the stored record is unchanged.
14. **Determinism and purity** (SHARE-030, SHARE-035, SHARE-070)
    **Given** two locks with the same `lockedAt` on decks `a1…` and `b2…`, needing 3 each, `ownedForDecks =
    4` **When** `computeSharedPool` runs twice **Then** both outputs are deep-equal, deck `a1…` holds 3 and
    `b2…` holds 1, and the stored locks, decks and collection are unchanged.
15. **Empty and runes-only decks; one ownership group per deck** (SHARE-006, SHARE-014, SHARE-020, SHARE-050, SHARE-051; v0.4)
    **Given** an unlocked deck `Rune Test` whose only entries are `Chaos Rune` ×9 and `Order Rune` ×3 in
    Runes, with no rune owned, an unlocked deck `Empty Draft` whose entries were all removed, and a locked
    deck `Ray Only` whose only entry is `Hextech Ray` ×3 in Main and which holds 0 (Deck 1, locked earlier,
    holds all 3 owned) **When** Decks opens and the user then opens `Rune Test` and `Empty Draft` **Then**
    the `Rune Test` tile reads "0 of 12 copies available" with `ownershipFilter: 'none'` (A = 0); the `Empty
    Draft` tile reads "No cards to count" with `ownershipFilter: 'none'` (R = 0); neither has a lock badge;
    `Ray Only` reads "0 of 3 copies locked in" with "Locked · 1 card short" and `ownershipFilter: 'none'`;
    with `own=none` all three are listed, with `own=partial` and `own=ready` none of them is; with
    `own=none&lock=locked` only `Ray Only` is; Deck 1 (`ownershipFilter: 'locked'`) matches no `own` option
    and is listed with `lock=locked`. In `Rune Test`'s view the rune tiles read "0 of 9 available" and "0 of
    3 available" (darkened) and `canLock` returns `{ ok: false, reason: 'incomplete', cardsShort: 2 }`
    ("Lock in needs every card available: 2 cards short"); in `Empty Draft`'s view `canLock` returns
    `{ ok: false, reason: 'no-cards' }` and Lock in is disabled with "Lock in needs at least one card".
    **Given** the user then owns `Chaos Rune` ×9 and `Order Rune` ×3 and no locked deck uses runes **Then**
    `Rune Test` is `ownershipFilter: 'ready'` and can be locked. AC 9's `Kennen Aggro` after both − presses has `ownershipFilter: 'partial'`
    (it still holds its other cards) and matches `lock=locked`.
16. **Replace import and Undo warn in their confirmation** (SHARE-034; SPEC-003 IMP-050, IMP-050a; SPEC-007 COLL-058, COLL-088)
    **Given** Deck 1 locked, `ownedForDecks('hextech ray') = 3`, and an Owned Cards Import whose parsed lines
    hold `2 Hextech Ray` and every other card of Deck 1 in full **When** the user commits it in Replace mode
    **Then** the IMP-050 confirmation lists the removed and changed names and adds "'Kennen Tempo' (locked)
    will be 1 card short. It stays locked."; **When** the user cancels **Then** the collection and Deck 1's holds are
    unchanged; **When** the user commits again and confirms **Then** Deck 1 stays locked with "Locked · 1
    card short". **When** the same lines are committed in Add mode instead **Then** no locked-deck warning
    is shown (Add never lowers a hold).
    **Given** instead `ownedForDecks = 2`, an Add import of `1 Hextech Ray` committed (3 owned), Deck 1
    locked after that commit (holds 3), and no manual edit since **When** the user presses Undo on the import
    (IMP-052) **Then** before anything changes a confirmation reads "'Kennen Tempo' (locked) will be 1 card
    short. It stays locked."; **When** the user cancels **Then** 3 stay owned, Deck 1 is "3 of 3 locked in",
    and no notice is shown; **When** the user presses Undo again and confirms **Then** the collection is back
    to 2, Deck 1 stays locked as "Locked · 1 card short", and the notice "'Kennen Tempo' (locked) is now 1 card
    short." is shown. **Given** the same, but the user also pressed + on a `Gust` entry after the
    import **When** the user presses Undo **Then** one confirmation both warns that the manual edits will be
    lost (COLL-058) and reads "'Kennen Tempo' (locked) will be 1 card short. It stays locked."; **When** the
    user confirms **Then** the same notice follows. **Given** the same import with
    no deck locked and no manual edit since **When** the user presses Undo **Then** it runs at once with no
    confirmation.
17. **Runes are shared and held like any card** (SHARE-001, SHARE-006, SHARE-031, SHARE-042, SHARE-043; v0.4)
    **Given** `KENNEN_1` and `KENNEN_7` ([[2026-11 RC Europe - 7 - HXN Gonkra - Kennen]]), both with Runes
    `Chaos Rune` ×9 and `Order Rune` ×3, every non-rune card owned in enough copies for both decks at once
    (so locking one never makes the other short on a non-rune card), `ownedForDecks('chaos rune')
    = 12` and `ownedForDecks('order rune') = 3`, no locks **When** either deck's view opens **Then** its
    Chaos Rune tile is "9 of 9 available" with "Also in 1 other deck", and its Order Rune tile "3 of 3
    available" with "Also in 1 other deck". **When** the user locks `KENNEN_1` **Then** `KENNEN_7`'s Chaos Rune
    tile is "3 of 9 available" (fill 3/9, partial) with "Also in 1 other deck · 1 locked", its breakdown reads
    "Owned for decks: 12", "Locked by other decks: 9", "Available to this deck: 3", "This deck needs: 9" and
    lists "`<KENNEN_1 name>` · needs 9 · Locked, holds 9"; its Order Rune tile is "0 of 3 available"; and
    `KENNEN_7`'s Lock in is disabled with "Lock in needs every card available: 2 cards short".
18. **A deck locked before v0.4 whose runes aren't owned** (SHARE-006, SHARE-033; SPEC-005 OWN-029)
    **Given** a `DeckLock` for `KENNEN_1` stored before v0.4 (when runes didn't count), every non-rune card of
    it owned in full and no rune in the collection **When** Decks opens after the update **Then** the lock
    record is unchanged, `KENNEN_1` stays locked, its badge reads "Locked · 2 cards short", its rune tiles
    read "0 of 9 locked in" and "0 of 3 locked in", and its deck tile is `ownershipFilter: 'partial'`.
    **When** the user imports `9 Chaos Rune` and `3 Order Rune` **Then** the holds refill with no other
    action, the badge reads "Locked", and the deck tile is `ownershipFilter: 'locked'`.

19. **Ownership unavailable, locked deck** (SHARE-020, SHARE-051, SHARE-053; v0.4.2)
    **Given** Deck 1 (`Kennen Tempo`) has a `DeckLock` (`lockedAt: 2026-11-23T10:00:00Z`), the lock store is
    readable, and the collection cannot be read (OWN-062) **When** Decks opens **Then** Deck 1's view has
    `lock = { locked: true, lockedAt: '2026-11-23T10:00:00Z', complete: false, short: false, cardsShort: [] }`, shows the "Locked"
    badge and "Locked in on Nov 23, 2026" with no "cards short"; its tile `lockBadge` is "Locked", its
    `ownershipLine` is "Ownership unavailable" and `ownershipFilter` is `unavailable`; `lock=locked` lists it;
    `own=none`, `own=partial` and `own=ready` do not; `canLock(null, deck1, false, true)` returns
    `{ ok: false, reason: 'already-locked' }`, Unlock is enabled and works. An unlocked `Kennen Control` has
    `lock: null`, the same line and filter group, `canLock(null, deck2, false, false)` returns `{ ok: false,
    reason: 'ownership-unavailable' }` ("Ownership unavailable"), and `lock=unlocked` lists it. **Given** the
    lock store is also unreadable (SHARE-061) **Then** both decks have `lock: null` and the SHARE-061 banner shows.
20. **Unparseable `lockedAt`** (SHARE-030; v0.4.2)
    **Given** locks `a` (`2026-11-23T10:00:00Z`), `b` (`yesterday`), `c` (`2026-11-23T09:00:00Z`) and `d` (`soon`)
    **When** lock order is computed **Then** it is `c, a, d, b` (parseable first by time; then the unparseable ones by raw string, `"soon"` before
    `"yesterday"`), and the tile of `b` shows "Locked" without a date.
21. **Replace import that moves copies between cards** (SHARE-034; v0.4.2)
    **Given** Deck 1 locked, needing `Hextech Ray` ×3 and `Gust` ×2, owned `Hextech Ray` 3 and `Gust` 1, so it
    holds 3 and 1 (Σ 4, already "Locked · 1 card short") **When** the user commits an Owned Cards Import of
    `2 Hextech Ray` and `2 Gust` (every other card unchanged) in Replace mode **Then** the Σ of holds stays 4
    but Deck 1 holds fewer Hextech Ray (3 → 2), so the IMP-050 confirmation adds "'Kennen Tempo' (locked) will be 1
    card short. It stays locked." (short now on Hextech Ray only). **Given** instead `3 Hextech Ray` and `2 Gust`
    **Then** no holds drop and no warning is shown.
22. **Rename a locked deck** (SHARE-025; v0.4.5, RJ 2026-11-25)
    **Given** Deck 1 `Kennen Tempo` locked at `2026-11-23T10:00:00.000Z` holding 3 `Hextech Ray` of 3 owned, and Deck 2 (unlocked) needing 3 `Hextech Ray`, shown "0 of 3 available" **When** the user renames Deck 1 to
    `Kennen budget` (and changes its description) **Then** Deck 1 is still locked with the same `lockedAt`, still holds 3, its badge still reads "Locked", Deck 2 still reads "0 of 3 available" and its
    "Other decks using this card" row now reads "Kennen budget · needs 3 · Locked, holds 3"; the card controls of the deck (when a card editor exists) still say "Unlock this deck to change its cards". **Given** the same deck is a tournament deck **Then** the rename is allowed too and its `source` is unchanged.
23. **Lock and Unlock feedback; reason line** (SHARE-020, SHARE-029; v0.4.5)
    **Given** a complete unlocked deck `Kennen Tempo` **When** the user confirms Lock in **Then** while saving the button reads "Locking in…" and is `aria-disabled`, then the badge shows and a snack bar says "Kennen Tempo is locked in."; **When** the user presses Unlock **Then** the lock goes at once and a snack bar says
    "Kennen Tempo is unlocked. Its cards count toward your other decks again." with no Undo. **Given** an incomplete deck 3 cards short **Then** Lock in is `aria-disabled`, focusable, and the visible line "Lock in needs every card available: 3 cards short" sits under the actions and is the button's `aria-describedby`.
    **Given** the save fails **Then** the notice "Couldn't save the lock. Try again." shows and nothing changes.

## Out of scope
- Sharing decks with other people. *(Accounts and syncing locks between a user's own browsers were out of scope
  until v0.4; since v0.4.1 they are specified in [[Accounts and Sync]] SPEC-010.)*
- Reserving a specific printing for a deck ("lock my foil into this deck"): decks stay by `cardKey` (DECK-096).
- Partial locks (locking some cards of a deck), lock priorities the user sets, or automatic suggestions of
  which deck to lock.
- Tokens (not cards, [[Physical Copies Across Decks]] fact 13; rejected by DECK-026). *(v0.3 also left
  runes out of scope, SPEC-009; since v0.4 they are counted, SHARE-006.)*

## Open questions / BLOCKED
1. **Resolved 2026-11-23: RJ accepted the Claude defaults (ADR-0006 "Shared cards, lock in and runes"):** earliest lock wins
   (SHARE-030/031); a lock never yields to an unlocked deck (SHARE-032); short decks stay locked and are
   flagged (SHARE-033); no card edits while locked (SHARE-025); Undo after delete restores unlocked (SHARE-024).
2. **Resolved 2026-11-23 (RJ): no force lock.** A deck short only because of copies locked elsewhere can't be
   locked; lock needs complete (SHARE-020).
3. No research blockers: the section rules come from [[Physical Copies Across Decks]] (verified 2026-11-23).
4. **Resolved 2026-11-24 (RJ):** runes are counted like any card ("Allow users to import runes as well and
   treat them like any other card."), reversing ADR-0006's 2026-11-23 "runes are ignored" (SHARE-001,
   SHARE-006; SPEC-009 withdrawn). A deck locked before this change keeps its lock and may become short
   (AC 18); no notice is shown (SPEC-005 OWN-029, open question 7 there).

5. **Resolved 2026-11-25 (RJ, in chat, H-157; was "For RJ (H-076, SHARE-053)"): a locked deck keeps showing its lock while ownership is unavailable** (the recommended option). It keeps the "Locked" badge and its place under the lock filter, Unlock stays enabled, Lock in is disabled with "Ownership unavailable", the deck tile line reads "Ownership unavailable", and the deck is in its own filter group `unavailable`, not "None available" (SHARE-053, SHARE-051, SHARE-020; SPEC-005 OWN-065). The alternatives (hide the lock state until ownership is back, or the longer tile sentence "Your collection could not be read") were **not used**.
6. **Resolved 2026-11-25 (RJ, in chat, H-157; was "For RJ (H-076, SHARE-034)"): the shortfall warning compares per card** (the recommended option): a locked deck is named when it holds fewer copies of any one card after the change, even when the total is unchanged (SHARE-034, `lockedShortfalls`, AC 21). The v0.4.1 total comparison was **not kept**.

## Changelog
Pin-only fix 2026-11-26 (H-481, no version bump): "Depends on" now pins SPEC-005 0.11 (section bar counts, not-found heading and tile % size; no lock rule touched). Current: 0.4.7 (2026-11-25, H-383, source: RJ 2026-11-25, H-382 (2)): on the deck tile the lock is a separate badge (`app-lock-badge`) next to the ownership chip with no date; the lock date stays in the Deck detail header. SHARE-041 and SHARE-050 reworded, SHARE-053 (b) says where the date shows; pin SPEC-005 0.10.3. **No lock rule, hold, order, shortfall or filter group changed.** Previous: 0.4.6 (2026-11-25, H-256, RJ 2026-11-25 in chat, H-157): Open questions 5 and 6 resolved with RJ's attribution (the recommended defaults stand: SHARE-053 keeps the lock shown while ownership is unavailable, SHARE-034 compares per card); the "review" / "RJ to confirm" markers in the Summary, SHARE-034, SHARE-053 and its Source cell replaced by RJ's attribution; SHARE-053 (e) now also says the tile has no completion percentage and no ownership chip while ownership is unavailable (wording only, it restates SPEC-005 OWN-101 (c) and OWN-102); pin SPEC-005 0.10.1. **No behaviour changed.** Status `review` → `draft`: nothing in this spec waits on RJ any more (the H-252 additions SHARE-025 and SHARE-029 rest on RJ's 2026-11-25 answers and "default for all", see 0.4.5); `draft`, not `approved`, because the loop sets `approved` only when RJ approves the whole spec and he has not. Previous: Pin-only fix 2026-11-25 (H-320, no version bump): "Depends on" and the import comment now pin SPEC-005 0.10 and SPEC-006 0.11.1 (RJ's answers to the H-252 open questions: the completion % is also in the Deck detail header, with the same SHARE-050 A and R, so a locked deck's header % equals its tile %); no lock rule changed; Open questions 5 and 6 untouched (H-256). Previous: 0.4.5 (2026-11-25, H-252, RJ 2026-11-25 (H-260 answers, "default for all" on [[Decks]] §13, §13a "rename at any time, even while locked")): SHARE-025 now says a lock freezes the cards, not the name, description or source (design decision 6 to match); new SHARE-029 (Lock in / Unlock snack bars, "Locking in…", no Undo); SHARE-020 visible reason line; SHARE-043 names the card panel and dialog instead of the tile's expand; SHARE-050 points at the completion % and chip (SPEC-005 OWN-101/102); ACs 22, 23; pins SPEC-005 0.9, SPEC-006 0.11. **No lock rule, hold, order, shortfall or per-card default changed** (SHARE-034, SHARE-051, SHARE-053 and Open questions 5 and 6 are untouched; H-256 closes them next); status stays `review`. Previous: Pin-only fix 2026-11-25 (H-244, no version bump): "Depends on" now pins SPEC-005 0.8 and SPEC-007 0.14 (FAB clearance text only; no lock rule changed). Pin-only fix 2026-11-25 (H-174, no version bump): "Depends on" now pins SPEC-003 0.12, SPEC-005 0.7, SPEC-006 0.9, SPEC-007 0.12; no lock rule changed. Previous: 0.4.4 (2026-11-24, H-171, ADR-0007 amendment 2, account-only: SHARE-060 without modes; pins SPEC-003 0.11, SPEC-005 0.6, SPEC-006 0.8, SPEC-007 0.11; status stays `review`). Previous: 0.4.3 (2026-11-25, H-160). Earlier: 0.4.2 (2026-11-24, H-076: SHARE-020 `isLocked` input, SHARE-030 unparseable `lockedAt`, SHARE-034 per-card, SHARE-051 group `unavailable`, new SHARE-053; AC 19–21; status `review` for the RJ choices). Earlier: 0.4.1 (2026-11-24, H-071: SHARE-060 browser by default, synced when signed in; accounts/lock sync no longer out of scope). Pin-only fix 2026-11-24 (H-071 attempt 2, no version bump): "Depends on" and import comments now pin SPEC-003 0.9.1, SPEC-006 0.7, SPEC-007 0.9. Full history: [[Shared Cards and Lock-in changelog]] (archived). New entries go in the archive note.
