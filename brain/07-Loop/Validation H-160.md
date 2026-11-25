---
tags: [validation]
---
# Validation H-160

2026-11-24 · H-160 · **PASS** · Accept: "Wording matches SPEC-010 v0.11 Impacts; pins and V-009 clean".

## Checks run
- **Wording vs SPEC-010 Impacts (v0.8 list, SYNC-009, SYNC-052):** IMP-053, COLL-070, DECK-090, SHARE-060 and CAT-077 each read "local-only mode: browser only; account-required mode: a browser cache of the signed-in account, cleared on sign-out". The old "browser by default; synced when signed in" no longer appears in any requirement or summary of SPEC-003/004/006/007/008. (It survives only in "Previous:" changelog lines and SPEC-010's record of the v0.7 wording, which is correct history.) PASS.
- **COLL-074:** local-only mode as before (no SPEC-010 text, nothing sent); account-required mode not offered; matches SYNC-052, SYNC-091, SYNC-095 and SPEC-010 AC 31 text. H-154 Request already says the same, so no contradiction. PASS.
- **New requirement IDs:** IMP-076, DECK-097, CAT-078, OWN-066, COLL-092 each occur exactly once as a table row across `02-Specs/`; no collision. PASS.
- **Gate notes vs SYNC-009:** gated pages (Decks, deck detail, Collection, Import, Tournaments deck controls), public pages, page header kept, nothing read from local stores, controls appear without reload, CAT-074 reads nothing local, no gate in local-only mode: all agree with SYNC-009. SPEC-008 correctly gets no gate note (reached only through Decks). PASS, with one wording imprecision (item 2 below).
- **Pins:** version fields: SPEC-003 0.10.1, 004 0.5.1, 005 0.5.2, 006 0.7.1, 007 0.10.1, 008 0.4.3, 010 0.11.2. Spec Index rows, every "Depends on" line and every import-type pin comment (SPEC-005/006/007/008/010) match these. No stale pin found by grep. SPEC-008 and SPEC-005 stay `review`. PASS.
- **Changelogs and SPEC-010:** archived changelogs have an entry per bumped spec; SPEC-010 Impacts marked "Applied 2026-11-25 (H-160, v0.11.2)". PASS.
- **V-009:** wikilinks in all changed specs and changelogs resolve (script, 0 unresolved); specs keep numbered requirements; changed specs still have Summary blocks. PASS.
- Code/tests: SKIPPED (docs only; no `web/` change in the diff). H-154 stays the build item.

## Observations (non-blocking, filed as H-161, P2)
1. IMP-076 cites SYNC-090 and SYNC-091 for "Undo snapshot cleared on first sign-in"; first sign-in is SYNC-048.
2. The gate notes say "SPEC-010 sign-in panel" for every closed-gate state; SYNC-009's first-sync-running state shows a message with no Sign in button. They defer to "gate rules are SPEC-010's", so no real contradiction.
3. [[Current State]] line 44 still says SPEC-006 "synced when signed in" (0.7).
4. `brain/05-Handoffs/Handoff Board.md` working-tree diff re-pads the whole table (122 changed lines, 70 rows both before and after, content unchanged except H-154/H-160). Cosmetic; the commit will be noisy.
