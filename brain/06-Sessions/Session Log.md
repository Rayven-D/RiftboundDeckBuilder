---
tags: [sessions]
---
# Session Log

Newest first. One short entry per working session.

Older entries: [[Session Log 2026-11-23 (early)]] (archived).

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
