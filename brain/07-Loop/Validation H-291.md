---
tags: [loop, validation]
---
# Validation H-291

2026-11-26 · H-291 · **PASS** · Accept grep, V-009 (docs), version-rule and no-behaviour-change claims, over-statement check. Docs-only change (3 files in `brain/`); no code, so V-008 is not in scope.

## Checks run
- **Accept:** `grep -rn "Regional Championship: Europe" brain/02-Specs` lists 24 hits across Deck Import, Tournament Deck Catalog and Your Decks Ownership View. The same grep with `grep -v "Riftbound Regional Championship: Europe"` returns nothing, so every hit is prefixed `Riftbound `. The three stale SPEC-005 hits (OWN-003 example, AC 11 twice, AC 15) are fixed. PASS.
- **Open questions closed:** [[Tournament Deck Catalog]] Open questions now hold two "Closed (RJ decision, 2026-11-25, in chat; H-291)" bullets: (1) official name everywhere, short `RC Europe` only in ids, file names and research titles; (2) no event structure on the header. No leftover "Question for RJ (v0.7)" text. The removed "39 characters" remark was a side note, not a requirement. PASS.
- **No-behaviour-change claim:** CAT-001 already stores the official name; CAT-032 row example and CAT-073 default name already use it; CAT-032's header field list (name, type, dates, region, location, player count, format, source link) has no structure field; CAT-006 already says the post-Top-8 single elimination is not stored or displayed. The answers equal the 0.7 defaults, so no requirement text changed. PASS.
- **Version rule:** SPEC-004 stays 0.7 (note appended to Changelog, no requirement edit). SPEC-005 stays 0.11.1: only example strings in OWN-003 and ACs 11 and 15 changed, and OWN-003 already says values are verbatim (DECK-061). Precedent exists: SPEC-005's changelog records "Pin-only fix 2026-11-24 (H-071 attempt 2, no version bump)". No bump is consistent. PASS.
- **Over-statement:** "Swiss days, then single elimination from the Top 8" matches [[Tournament Results]] fact 7 (Day 1 and 2 Swiss, Top 8 advance, Day 3 single elimination; as of 2026-11-24). The new bullets attribute the answers to RJ with date and channel and add no new game fact. Front matter unchanged: SPEC-004 `status: draft`, `as_of: 2026-11-24`; SPEC-005 `status: draft`, `as_of: 2026-11-26`. Spec Index rows need no change (versions and statuses unchanged). PASS.
- **V-009:** specs keep numbered requirements and Given/When/Then; wikilinks in the added lines ([[Tournament Results]], [[Tournament Deck Catalog]], [[Validation H-460 H-461 H-475]]) resolve by name. PASS.
- **Board:** only the H-291 row changed in the diff (todo to verify), then this validation sets it to done.

## Failures
None. Non-blocking, as the row already says: [[ADR-0006 Two Imports - Collection and Decks]] line 58 and [[Design Direction]] line 18 still carry the short form (out of scope: accepted ADR, ui-engineer's note); H-290 covers the web sample text.
