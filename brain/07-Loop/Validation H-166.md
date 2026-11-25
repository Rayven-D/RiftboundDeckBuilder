---
tags: [validation]
item: H-166
---
# Validation H-166

2026-11-25 · H-166 · PASS · working tree vs HEAD (10 files; the diff against origin/dev also shows unrelated dev-ahead files, ignored), fact-by-fact trace of facts 7 to 9 against IMP-011/016/031/032/033/036/036a/037/038/039 and DECK-010/020/039, status and as_of kept, H-165 content intact, live pin grep over brain/ (excluding Archive, 07-Loop, 06-Sessions), CARD-034/036/037/038 consistency, V-009 (wikilinks, numbered requirements, Given/When/Then) · no blocking failures

## Checks
- **Fact 7 (community, 2026-11-24):** set table 0 to 6, variants none/a/s or `*`/b, `SP` prefix, versions V2 to V6 all appear in IMP-031/032/033 with "community" labels. V1 is carried over from the earlier V1/V2 wording (v1.0.0 library). Pass.
- **Fact 8 (community, one tool's reading):** IMP-036 says art number, not a count, one copy per token, labelled "community, one tool's reading". IMP-036a maps only art 1 = base and art 2 = `a` (the documented `ABC-012-2` to `ABC-012a`); art 3 or more and art above 1 on a lettered number are an Open question with `VARIANT_UNMAPPED`, not a claim. Pass.
- **Fact 9 (official):** IMP-016 strips `*` and a trailing `:`; DECK-020 follows. Same-line bold label plus entry is an Open question. Pass.
- **Fact 10 (unverified):** no CSV/TXT columns added; recorded as Unverified in both specs. Pass.
- **Beyond-the-facts items, all labelled BLOCKED/Open:** Riot printings using these suffix letters and `SP<n>` numbers (H-020); V3 to V6 section tags (DECK-039 keeps zone mapping BLOCKED, treats such cards as unsectioned, never by guess).
- **H-165 intact:** SPEC-001 0.4 content (CARD-034 article rule, CARD-038, CARD-023/023a, CARD-044), IMP-025/059/AC 24 and DECK-040 all still present; 0.4.1 is wording-only on CARD-036.
- **Pins:** SPEC-001 0.4.1, SPEC-003 0.14, SPEC-006 0.10 are current in Spec Index (SPEC-003, 005, 006, 007, 008, 011, 013 rows), Depends-on lines of SPEC-003, 006, 007, 008, 010, 013 and the SPEC-005 Depends-on and import comment. Remaining 0.13 / 0.9.1 / 0.4 hits are historical changelog text only.
- **V-009:** no new broken wikilinks (the 3 reported are pre-existing line-wrap artifacts in Accounts and Sync and the Handoff Board); new requirements are numbered; ACs 47 to 49 (SPEC-003) and 25 (SPEC-006) are Given/When/Then; research note keeps sources, status `unverified`, as_of.

## Minor observations (not failures)
- IMP-031 rejects a version above V6 with `DECK_CODE_INVALID`; this is conservative behaviour (already covered by IMP-034 "unknown version"), not stated as a fact.
- Pre-existing stale code-contract comments (`// SPEC-003 v0.11`, `// SPEC-006 v0.8`) in Accounts and Sync, My Collection, Shared Cards and Your Decks Ownership View were not touched by this item.
- `brain/Current State.md` line 11 still says SPEC-003 0.12 (not editable by this run).
- H-300 (researcher, stale `SET-NUMBER-COPY` wording in the research note) is filed and still open.
