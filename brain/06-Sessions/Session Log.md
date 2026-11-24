---
tags: [sessions]
---
# Session Log

Newest first. One short entry per working session.

Older entries: [[Session Log 2026-11-23 (early)]] (archived).

## 2026-11-23: H-061 accounts and sync spec (spec-writer + validator)
- New SPEC-010 [[Accounts and Sync]] v0.4 (88 rows, 36 ACs): optional sign-in behind `signInEnabled`, the [[Firestore Data Shape]] layout, device-local sync log with 30-day tombstones, latest change wins per card count / tag target / lock / deck (monotonic stamps), first sign-in Combine or Cancel, offline, sign-out, delete account, owner-only rules with field validation. Locks sync (`state/locks`, `{lockedAt|null, updatedAt}`).
- Validator FAIL ×3 (rounds 1–3: 6 + 4 + 2 blockers), PASS round 4 ([[Validation H-061]]). Spec Index and Current State rows added.
- Board: H-061 done; H-062 → todo (after H-071); new H-069 (privacy notice research), H-070 (`existsAfter()` billing research + Data Shape estimates), H-071 (SPEC-010 impacts on SPEC-003/006/007/008, ADR-0007), H-072 (V-011 `web/` adapter path), H-073 (RJ: 11 open questions). No code. Committed on `loop/H-061-accounts-sync-spec`.

## 2026-11-23: H-065 / H-066 / H-067 validator fixes for H-058 (spec-writer)
- When steps added to every flagged AC; SHARE-051 makes each deck one ownership group (empty / runes-only → None available, "No cards to count"); `no-cards` message; Deck 3 = `Kennen Aggro`; locked-deck warning now always inside the confirmation (incl. the IMP-050 Replace confirmation), Undo of an import is the only notice. SPEC-003 0.6, SPEC-005 0.4, SPEC-007 0.5, SPEC-008 0.2, SPEC-009 0.2, SPEC-006 pins only; Spec Index, Current State and changelogs updated; H-065/066/067 → verify. RJ's decisions unchanged; no code, nothing committed.

## 2026-11-23: Home page copy pass (ui-builder, with RJ)
- Rewrote `/` copy shorter and more casual; RJ picked the headline "Know what you own. Own what you need." and approved the rest from a before/after table. Unbuilt features (deck view, Tournaments) now say "coming soon". American spelling ("color").
- Ownership section: title "Collect the cards each deck needs.", text "Know what you need at a glance. Collect every copy you need of a card to fill it with color."
- Tournaments reframed as **Winning decks** ("Pick a winning deck to work towards."): tournaments exist to supply winning constructed decks to add as a goal. New `top-eight-panel`: events expand to their Top 8 as full Legend cards (placing, player, Legend name). Three layouts shown as screenshots; RJ picked swipe on phones and a grid on wider screens, then: same flow as Ownership, no cropping, panel no taller than Ownership's (8 across). 157 web tests.
- Reviewed on a Firebase preview channel and headless-Edge screenshots. RJ: pushed `dev` (`af8806a`), merged into `main` (`e8a4ae2`), Actions deployed; then a local hosting deploy put `riot.txt` back (H-056: still uncommitted, every Actions deploy drops it). Notes in [[Design Direction]] and [[Current State]].

## 2026-11-23: Firestore data shape and sizing (input to H-061)
- New [[Firestore Data Shape]] (05-Services): `users/{uid}`, `state/collection` (one document, per-card map), `state/tags`, `state/locks`, `decks/{deckId}`; `schemaVersion` / `updatedAt` / `syncedAt`, per-card and per-tag timestamps, 30-day tombstones, indexing off except `syncedAt`.
- Sizing: ≈ 95 KB per realistic user, ≈ 640 KB per heavy user; Spark supports about 1,300 DAU (writes bind) and about 7,000 accounts at a 90/10 mix. Free-tier limits checked on the official Firebase pages 2026-11-23.
- ADR-0007 gained a "Data shape" section. H-061 row updated with the layout; Current State links the note.

## 2026-11-23 (evening): bug fixes, deploy, Firestore
- Built, code-reviewed and validated H-046 + H-053 (parser: delimiter, one upload path, limits, encoding, summary), H-054 (skip link, card-art alt), H-055 (`/api` dev proxy, hosting rule). Each on a `loop/` branch merged into `dev`; 156 web tests.
- Pushed `dev` and `main` (RJ, no PR); GitHub Actions deployed `0b7e668`. Live check: the `!/api{,/**}` rule only excludes `/api/` on real Hosting.
- Hosting discussion: no server needed; card data as a static snapshot built in CI (proposed, ADR-0004 open). RJ chose Firebase for optional accounts: ADR-0007, Firestore `(default)` Standard in `us-south1`, rules deny all. Board H-061 (sync spec), H-062 (build), H-063 (Auth providers).
- Tooling: `.agents/` and the ingest snapshot ignored, `skills-lock.json` committed, `Untitled.base` deleted.
- Next: DB sizing and shape session for Firestore.

## 2026-11-23: H-058 shared cards, lock in, runes (spec-writer)
- RJ's decisions recorded in ADR-0006 "Shared cards, lock in and runes" (every physical section shares one per-name pool; runes ignored), plus Claude defaults RJ may change.
- New SPEC-008 [[Shared Cards and Lock-in]] v0.1 (available = ownedForDecks − held by other locked decks; earliest lock wins; short locks stay locked and flagged; no card edits while locked) and SPEC-009 [[Runes Assumed Owned]] v0.1.
- SPEC-005 0.3 ("available" labels, breakdown, runes out of counts), SPEC-006 0.6 (lock rules on edit/delete/duplicate), SPEC-007 0.4 (per-name pool note, runes never needed, shortfall warning). Spec Index updated.
- Board: H-058 → verify; new H-059 (service-builder, pure engine) and H-060 (ui-builder, Decks UI), both blocked; H-021 also checks for non-basic runes. No code touched, nothing committed.
- RJ accepted the five lock-in defaults (earliest lock wins, no yield to unlocked decks, short locks stay locked, no card edits while locked, Undo restores unlocked). RJ also decided no force lock (SPEC-008 open question 2); SPEC-008 has no open questions.

## 2026-11-23: spec catch-up H-043 / H-040 / H-044 + code review
- Verified the import code already does RJ's decisions (quantity required, .xlsx, deck CSV, spaceless labels, one dialog); specs updated to match: SPEC-003/006 v0.4.
- SPEC-005 v0.2 (Riot section order, CAT-045 labels, `deckOwnership(input, cardKey)`); SPEC-007 calls aligned. Screens renamed to Decks / Collection in specs and ADR-0006.
- Validator: all three PASS. Code review (web 54, services 88 tests green; no key or XSS issues) filed as H-045…H-056.
- RJ: deleted the broken Firebase workflows (H-051), removed the unused `firebase` dep (H-052); `riot.txt` is the Riot API verification file. H-048 decided and built: `x3 Name`, `Name x3`, printing codes (`RAD 001/167`); SPEC-003/006 v0.5, 105 web tests, PASS. Code resolution → H-057 (needs H-020).

## 2026-11-23: UI direction, Rift Builder, home page and imports (with RJ, Claude chat)
- H-023 decided: direction A with a blue accent `#378ADD`, B/C-style ownership chip, small source line, Import as a raised button, Angular Material, slight 4/6/8px corners, Archivo headlines.
- Renamed to **Rift Builder** (from Riftbound Deck Builder, briefly Rift Decks); tabs **Decks** / **Collection**; deck-stack favicon.
- Built: home page at `/` (ui-builder ideas, Rift Atlas as layout reference only), Import paste-or-upload dialogs with the shared parser, shared card art / tile / chip components.
- PR #2 merged into `dev`, PR #3 `dev` → `main`, Firebase deploy succeeded. Follow-up PR for two later commits.
- New board items: H-043 (import spec updates), H-044 (screen-name spec updates).

## 2026-11-23: /loop round 3 + lighter brain
- Gate H-036 answered (ADR-0006): Legend + pilot + placing names; In Your decks + Add another copy; per-printing collection with ×N badge; tags on printings; exclude-from-decks tags; Your decks grouped by name.
- PASS: H-030 (SPEC-006 v0.2), H-034 (SPEC-007 v0.2), H-035 + H-037 (SPEC-004 v0.3, legal_as_of = event start), H-008 (services scaffold, 88 tests; V-003 waits on the live payload).
- Lighter brain (H-038): [[Current State]], `Archive/`, reading order for all agents.
- Next: H-039 (spec summaries + clean-ups) and H-007 (SPEC-005 Your Decks Ownership View).

## 2026-11-23: /loop round 2
- RJ feedback applied first: straight button borders (H-027), "Your decks" rename + one-line descriptions (H-028), product model correction ADR-0006 (H-029, H-032), Import option cards (H-033).
- Done: H-015 (SPEC-001/002 v0.2), H-016 (SPEC-004 v0.2), H-017, H-018, H-019, H-025, H-026, H-031 (SPEC-007 v0.1).
- FAIL: H-030 SPEC-006 Deck Import contradicts SPEC-004 on Add to Your decks (source shape, default name, duplicates) and uses old field names. WIP kept on its branch.
- Stopped at gate H-036 (RJ decisions). The services scaffold H-008 is now unblocked.
