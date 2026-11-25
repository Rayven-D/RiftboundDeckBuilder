---
tags: [validation]
item: H-320
---
# Validation H-320

2026-11-25 · H-320 · PASS · V-009 documentation checks plus the item's Accept column · no failures (two non-blocking notes).

## Checks
- **RJ's answers recorded faithfully (PASS):** SPEC-005 Open question 10 says the completion % is also in the Deck detail header next to "X of Y copies available", same OWN-101 value, absent when R = 0 or ownership can't be read, not on the Missing tab. Q11 to Q15 and SPEC-006 (a) to (c) are recorded as the written defaults, each with "Resolved 2026-11-25 (RJ, H-320)" and the original question label. Frontmatter `as_of`, `status: review` and fact status untouched; no research note edited.
- **Q10 written into the spec (PASS):** OWN-010 (f), OWN-101 (d) (two places only), OWN-050, OWN-054, OWN-110, OWN-111 (c), OWN-119 (d), design decision 6; new AC 33 (Given/When/Then) covers 34/66 to 51%, 66/66 to 100%, locked 54/54 to 100%, locked 50/54 to 92%, 1/300 to 1%, 299/300 to 99%, 0/66 to 0%, R = 0, ownership unavailable, no % on Missing. Arithmetic checked (floor, 1..99 clamp).
- **No "no % on Deck detail" text left (PASS):** SPEC-005 hits for "no percentage" are only the "N of M cards fully available" line, the Missing tab and the sort/filter and meta rules, all intended. H-254 row now says the copies line ends with the %.
- **Pins (PASS):** Spec Index (SPEC-005 0.10, SPEC-006 0.11.1, SPEC-008 row, SPEC-010 row), SPEC-005 and SPEC-006 frontmatter, Shared Cards and Lock-in (Depends on, import comment), Accounts and Sync (Depends on, import comment) all match. Test Data has no SPEC-005 / SPEC-006 version pin. Remaining older versions are changelog or "introduced in" history (Accounts and Sync line 45, My Collection line 759).
- **SPEC-008 consistency (PASS):** locked header % uses SHARE-050 A and R, same as the tile (AC 33 locked 54/54 and 50/54). SHARE-034/051/053, SPEC-008 Open questions 5 and 6, and the OWN-065 row are unchanged (OWN-065 appears only in the changelog line).
- **Scope (PASS):** only `brain/` files changed (5 specs, Handoff Board); the worktree has no untracked files, so `brain/Build Matching.md` and `web/public/import/` are untouched. Board: H-320 `doing`, H-321 (P3, ui-engineer, stale text in Decks.md) well-formed, H-254 and H-311 rewritten consistently; `next_id` not touched by this run.
- **V-009 wikilinks (PASS):** all links in SPEC-005 and SPEC-006 resolve (the "changelog" token is in the pre-existing changelog prose).

## Notes (non-blocking)
1. Handoff Board rows H-060 and H-253 still say SPEC-005 0.9 / SPEC-006 0.11. They are board rows, not spec notes, and the item's Accept pins refer to the Spec Index; the builder reads the specs. Not a failure.
2. `brain/04-UI/Decks.md` still has "no percentage" text; already filed as H-321.
