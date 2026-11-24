---
tags: [sessions]
---
# Session Log

Newest first. One short entry per working session.

Older entries: [[Session Log 2026-11-23 (early)]] (archived).

## 2026-11-23: H-058 shared cards + lock-in, runes, then sessions per item (with RJ)
- Researcher: [[Physical Copies Across Decks]]. The Chosen Champion shares the per-name pool with Main/Sideboard. RJ chose to count every physical section (Legend, Champion, Main, Sideboard, Battlefields) and to ignore runes.
- SPEC-008 [[Shared Cards and Lock-in]] and SPEC-009 [[Runes Assumed Owned]]. RJ accepted the five lock-in defaults and decided no force lock.
- Validator round 1 FAIL (missing When steps, filter overlap, cross-spec warning placement) → H-065..H-068; round 2 PASS. Code review: 2 nits, both fixed. Committed on `loop/H-058-shared-cards-lockin`. `loop/ui-direction-a` deleted locally (fully in `dev`).
- One session per remaining item: H-050, H-045, H-049, H-059 done on their own branches; H-061 grew into H-062 (build) and H-074 (still running). Merge plan and the SPEC-003/007 version clash are in [[Current State]].

## 2026-11-23: Hero note text, local deploy with riot.txt (with RJ)
- RJ shortened the home hero note to "Free". Committed on `dev`, merged into `main` (not pushed).
- Local `firebase deploy --only hosting` from `dev` with the uncommitted `web/public/import/riot.txt`, so it is served at `/import/riot.txt` again (H-056 still open: the next Actions deploy of `main` drops it).

## 2026-11-23: One `builder` agent replaces service-builder and ui-builder (with RJ)
- Checked whether spec-writer had been building. Its definition never said to, and it has no Bash, but spec-writer items still shipped code: H-058 (8 `web/` files for the "available" label), H-029 (page text, routes), and H-048 (spec work and parser in one commit). Much UI work also ran in the main session without a builder.
- RJ chose to replace both builders with one [[builder]] agent for UI, browser business logic and services. It keeps the RJ review gate for screens and the API Contracts rule, and must run lint, build and tests before it reports.
- [[spec-writer]] now has a "You don't write code" rule: spec changes that need code become `builder` board items. `/loop` dispatches only `builder` for code. Validator routes code bugs to `builder`.
- Open board items H-047, H-057, H-059, H-060, H-062 and H-064 moved to `builder`. Done rows keep their old owners as history. Updated CLAUDE.md, [[Loop Protocol]], [[Home]], the [[Agents/README|Agents README]], and the owner lines in UI Index, Design Direction and API Contracts. `.claude/` copies refreshed. Nothing committed.

## 2026-11-23: H-050 SPEC-004 version bump (spec-writer)
- SPEC-004 0.4 → 0.5 to record the H-044 lower-case "your decks" strings (CAT-070/074/076, ACs 16–18); archive changelog entry added. Pins → SPEC-004 0.5 in [[Spec Index]] (SPEC-004/005/006 rows), SPEC-005 and SPEC-006 Summary "Depends on" lines; SPEC-006 metadata-only changelog line. Validator PASS (V-009 + pins). H-050 → done. Branch `loop/H-050-spec004-bump`, no code.

## 2026-11-23: H-045 collection CSV export vs positional import (spec-writer, validator)
- RJ decided: the collection CSV export has **no Tags column** (tags and exclude flags are not in the CSV backup; sync per ADR-0007), and it **writes printing codes** (`2,Lightning Rush RAD 001`) so `byPrinting` round-trips. Unassigned, missing-printing and no-code copies go on a name-only row, the export re-parses each row before writing it, and counts above 999 split across rows.
- SPEC-003 0.7 (IMP-055, export rules 1–10, round-trip guarantee, AC 35), SPEC-007 0.6 (COLL-059 withdrawn, AC 24); changelogs, Spec Index, Current State updated.
- Validator: round 1 FAIL (AC row order, guarantee vs rule 7, no-code printings, 999-multiple rest row) → fixed → round 2 PASS. H-045 done. Follow-up for H-050: SPEC-005/006/008/009 still cite SPEC-003 0.6 / SPEC-007 0.5.

## 2026-11-23: H-049 spec follow-ups (spec-writer + validator)
- SPEC-003 0.7: import code behaviour written into the spec (interim CSV delimiter rule, decimal quantities, `2. Gust`, label-cell rows, seven upload checks with exact messages, upload kept/dropped, encoding rejection, row limit on the converted line, pre-catalog summary fields, Line grammar steps 3/5); IMP-050 split into MUST + IMP-050a SHOULD; new ACs 35–40.
- SPEC-007 0.6 / SPEC-008 0.3: an import Undo warns about locked decks inside the COLL-058 confirmation, or asks for one only on a shortfall (no notice after). H-060 wording updated to match.
- Validator PASS (strings probed against `parse-card-list.ts`, 157 web tests). RJ then decided: straight `'` in all UI messages (three import messages changed in code, 157 tests green) and Undo keeps the notice after it, with the warning before; every locked-deck warning ends "It stays locked." Validator PASS again. Committed on `loop/H-049-spec-followups`.

## 2026-11-23: H-059 shared pool / lock-in engine (builder, validator)
- Built the pure SPEC-008 / SPEC-009 engine and SPEC-005 v0.4.1 `computeDeckOwnership` in `web/src/app/core/decks/` (decision on the board: browser-only consumer, `services/` not hosted, `web/` can't import `services/`). Minimal SPEC-007 `deckOwnership` and SPEC-002 `banStatus`; `nameKey` moved to `web/src/app/core/cards/`; `tileOwnership` moved to core with a "… locked in" option. No new dependencies.
- Cycle: validator round 1 FAIL (split-card label: OWN-033 vs SPEC-005 AC 4 / SPEC-008 AC 6) → spec-writer made OWN-033 explicit and fixed both ACs (SPEC-005 0.4.1, SPEC-008 0.2.1, no behaviour change). Code review (/code-review high, then an independent reviewer): lock comparator made a total order, rune detection uses the pool's catalog, `banStatus` memoized (OWN-080 was ~430 ms with a real ban list), caller duties documented. Rounds 2 and 3 PASS; web lint / build ok, 217 tests.
- Changed notes: [[API Contracts]] (1.4, browser-side shared types), [[UI Index]], [[Your Decks Ownership View]], [[Shared Cards and Lock-in]], [[Validation Runs]], [[Handoff Board]] (H-059 done, H-060 blocked on Decks page only, new H-069).
- Open questions: H-076 (numbered H-069 on its branch; ownership-unavailable values, unparseable `lockedAt`, per-card vs total shortfall). Branch `loop/H-059-lockin-engine`, committed, not merged or pushed.
- Next: Decks page, then H-060.

## 2026-11-23: H-061 accounts and sync spec (spec-writer + validator)
- New SPEC-010 [[Accounts and Sync]] v0.4 (88 rows, 36 ACs): optional sign-in behind `signInEnabled`, the [[Firestore Data Shape]] layout, device-local sync log with 30-day tombstones, latest change wins per card count / tag target / lock / deck (monotonic stamps), first sign-in Combine or Cancel, offline, sign-out, delete account, owner-only rules with field validation. Locks sync (`state/locks`, `{lockedAt|null, updatedAt}`).
- Validator FAIL ×3 (rounds 1–3: 6 + 4 + 2 blockers), PASS round 4 ([[Validation H-061]]). Spec Index and Current State rows added.
- Board: H-061 done; H-062 → todo (after H-071); new H-069 (privacy notice research), H-070 (`existsAfter()` billing research + Data Shape estimates), H-071 (SPEC-010 impacts on SPEC-003/006/007/008, ADR-0007), H-072 (V-011 `web/` adapter path), H-073 (RJ: 11 open questions). No code. Committed on `loop/H-061-accounts-sync-spec`.
- RJ answered all 11 questions (H-073): SPEC-010 v0.5 (89 rows, 38 ACs, new SYNC-077 same deck status on every device), validator PASS round 5. H-062 handed to `builder`.
- H-062 built (branch `loop/H-062-accounts-sync-build`): local stores, sync engine, Firebase adapters (lazy), account UI behind `signInEnabled`, owner-only rules. Validator FAIL round 1 (3) + code review (7 findings, incl. deleted-account mapping: emulator says `auth/user-token-expired` / `auth/invalid-refresh-token`), all fixed; PASS round 2. 271 web + 27 emulator tests (Java 21 = Android Studio JBR). New H-074 (spec follow-ups), H-075 (build leftovers).
- RJ enabled the Email link provider and filled in the Firebase web config. SPEC-010 v0.6: providers from build config `authProviders` (default email link; Google later by config). Build matches; validator PASS round 3 (278 web + 27 emulator tests).

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
