---
tags: [validation, loop]
board: H-174
as_of: 2026-11-25
---
# Validation H-174 (SPEC-010 v0.14, SPEC-003 0.12, SPEC-005 0.7, SPEC-006 0.9, SPEC-007 0.12, SPEC-008 pins)

2026-11-25 · H-174 · **PASS** · Accept vs [[ADR-0006 Two Imports - Collection and Decks]] "Header and import entry points" + [[Brief H-175]] "RJ decisions", `/import` grep, ID uniqueness, ACs, data contract vs rules, SYNC-104 / AC 68 vs SYNC-151, pins and Spec Index, V-009 wikilinks, changelog convention · 0 blocking, 4 follow-ups

## Checks
- **RJ's H-178 answers (read in [[Brief H-175]] "RJ decisions", and ADR-0006 "Follow-up"):** decision 6 says `/import` goes to Home like any unknown path (no not-found page); decision 5 says a footer theme switch for everyone plus the Theme item in the signed-in menu; decision 2 says no `/account`, Account Information dialog; decisions 1, 3, 4 match SYNC-153/154, COLL-094 and OWN-094/DECK-001. SYNC-150...159 follow them.
- **ADR section vs specs:** header control, username (display name, not unique, editable, stored with the account), theme per device (default system, not in the account), "Add to your collection" FAB + dialog, "Import deck", no `/import`, finished imports stay on their page: all present (SYNC-150...159, IMP-060/072, COLL-094, OWN-094/008, DECK-001).
- **`/import` grep over `brain/02-Specs`:** every hit says it is removed and goes to Home (SYNC-159, IMP-060, DECK-001, AC 80, Collection/Deck Import ACs, history lines). No spec still specs an import page, Import tab or Import button. IMP-076 / DECK-097 gate notes name the Collection / Decks pages.
- **IDs:** SYNC-150...159 unique and continuous; no new duplicates. `OWN-022` is a duplicate row that was already in HEAD (not this change).
- **ACs 71-80:** Given/When/Then, concrete inputs (`RJ   Smith`, 25 letters, family emoji `7 / 24`, U+202E, `purple` stored value, `/collection?add=2`), testable. Username rules SYNC-153 (AC 74), prompt SYNC-154 (AC 75), save SYNC-155/156 (AC 76), theme SYNC-157/158 (AC 77-79).
- **Data contract and rules:** `users/{uid}.username` optional, 1 to 200 in SYNC-112 / SYNC-156 / builder list, denied on create, allowed on update; `StoredSyncLog.username` and `RemoteStore.setUsername` in the contract; privacy SYNC-103 item 4 and [[Privacy Notice Draft]] 0.2 list the username and the theme key. Consistent, except follow-up 1.
- **SYNC-104 d / AC 68 vs SYNC-151:** same order (username, Signed in as, status, Sync now, Account Information, Theme, Privacy notice, Sign out). AC 72 also matches (3 dividers).
- **Theme key:** `device-theme` outside `rift.`, survives SYNC-142 clears (AC 78); AC 70 allows it in the storage check.
- **Pins and versions:** Spec Index and each spec's Depends on agree (SPEC-003 0.12, 005 0.7, 006 0.9, 007 0.12, 008 0.4.4 pin-only, 010 0.14, Deck Import cites Collection Import 0.12); SPEC-008 pin-only fix is logged in its changelog.
- **H-179:** decisions 18-19 close Open questions 10 and 11; OQ 13 holds the proposals for RJ (rules details, strings, key name, storage place).
- **V-009:** every wikilink in the diffs resolves (scripted, 33 distinct targets, 0 missing).
- Code checks: SKIPPED (docs only).

## Follow-ups (non-blocking)
1. **spec-writer, fix before H-176 writes the rules (P1):** SYNC-112 says the 200 backstop is fine whichever way the rules count, but AC 74 accepts 24 emoji and SYNC-153 counts graphemes. 24 graphemes of a skin-toned ZWJ family emoji (11 code points each) is 264 code points, over 200, so the rules would reject a name the client accepts. Raise the backstop (for example 1000) or cap code points in SYNC-153, and align SYNC-156, the builder list and the rules-test cases.
2. **spec-writer, changelog convention (minor):** the archived `Accounts and Sync changelog` says "New changelog entries for the spec go here" and H-152 added its 0.13 entry there. The 0.14 entry and the five other specs' H-174 entries are only in the specs' own `## Changelog`; add them to `Archive/Spec-Changelogs/` (SPEC-003, 005, 006, 007, 008 pin note, 010). Not a FAIL: the history is complete and findable in the specs, the Accept column does not name it, and H-171 entries were in-spec too.
3. **spec-writer, Privacy Notice Draft 0.2 (minor):** add a one-line changelog or "what changed" note for 0.1 to 0.2 (username line, theme line), so RJ's re-approval sees it.
4. **spec-writer, small:** `as_of` of SPEC-003, 005, 006, 007 still reads 2026-11-23 / 24 although the versions changed 2026-11-25; ADR-0006's first "Header and import entry points" text still says "not-found page" (its H-178 follow-up corrects it; add a pointer). Older briefs in `04-UI/` (H-101, H-140, H-144, H-145) still mention `/import`; they are history, and the builder should not copy them (H-176).
