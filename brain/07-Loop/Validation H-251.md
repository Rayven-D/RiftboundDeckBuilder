---
tags: [loop, validation]
---
# Validation H-251

2026-11-25 · H-251 · **PASS** · checks run: Accept files exist, Request coverage map, requirement IDs vs SPEC-005/006/008, engine names vs `web/src/app/core/decks/`, open choices shape, wikilinks (V-009), V-010 grep, diff scope, UI Index rows · failures: none blocking (2 notes below)

## Evidence
- **Files exist:** `brain/04-UI/Decks.md` (641 lines, status proposed) and `brain/04-UI/Decks Components.md` (411 lines, 16 sections).
- **Request coverage in the brief:** deck list and tile with name, Legend art, ready / partly / none, Locked badge, ban flag: Decks §3, §4. Filters (SHARE-051): §5. Sections in Riot order (OWN-011): §6, §7. Tiles full / darkened / left-to-right fill: §7, §12.3, Components §9. Grouped cards and owned printings (OWN-040…045): §8 (as a dialog, choice 8). Summary, missing list, export (OWN-050…055): §6, §9, Components §11. Lock in / Unlock and shortfall warnings (SHARE-020…043): §9, Components §7 and §10. Empty / unavailable / read-only states: §10 (L1–L13, D1–D18). Phone layout and Import deck FAB: §3, §6. Open choices: §13 (28), spec gaps §14.
- **Open choices:** all 28 in §13 have the question, lettered options and a "Recommended" default (choices 20, 21, 23, 25 give a yes / defer default in place of lettered options; acceptable).
- **Requirement IDs:** every OWN / SHARE / DECK / IMP / COLL / LEGAL / SYNC ID cited in both notes exists in `brain/02-Specs/` (script check). `SHARE-053c` is clause (c) of SHARE-053 ("Unlock stays enabled"), so it resolves. Spot-checked meaning: OWN-002, 006, 010, 015, 033, 038, 041, 053, 054, 082, 094; SHARE-020, 021, 043, 051, 061; DECK-082 / 083 / 091. The brief's claims about contradictions (OWN-082 vs Legend art, OWN-038 expand vs dialog, DECK-082 "can't be undone" vs DECK-083 Undo) match the spec text.
- **Engine names:** `DeckTileSummary` (fields as listed, no Legend or ban fields, as the brief says), `DeckOwnershipView`, `OwnershipCard` fields (`ownedForDecks`, `lockedByOthers`, `heldByThisDeck`, `allocationByZone`, `printingsOwned`, `excludedPrintings`, `otherUses`, `sharedLabel`, `banStatus`, `isPreview`), `ZoneSection`, `MissingLine`, `LockCheck`, `CardUse`, `OwnedPrintingRow`, `CardBan`, `canLock`, `lockCheckMessage`, `cardsShortText`, `shortfallWarning`, `shortfallNotice`, `summarizeDeck`, `computeDeckOwnership`, `ZONE_ORDER`, `formatIsoDate` all exist. `OwnershipFilter` is `'ready' | 'partial' | 'none' | 'locked'` (no `unavailable`), `canLock(pool, deck, readOnly)` has no `isLocked` (spec 0.4.x signature has it), `shortfallWarning` omits " It stays locked.": all match brief §14.9. `chipLabel`, `zoneLabel`, `ruleCheck` are new component props, not engine names.
- **Wikilinks:** all `[[...]]` targets in both notes resolve to notes outside `brain/Archive/`.
- **V-010 (no meta stats):** no hits for win / play rate, tier, matchup, meta score, "% of" in either note. The "also in N other decks" lines are the user's own decks (SHARE-042), not field shares.
- **No unsourced game facts:** the notes state product design and cite spec IDs; no rules, bans or meta claims beyond quoting spec examples.
- **Diff scope:** `git status` shows modified `brain/04-UI/UI Index.md` and `brain/05-Handoffs/Handoff Board.md`, untracked `brain/04-UI/Decks.md` and `brain/04-UI/Decks Components.md`. The Board diff is one line, the H-251 row (`todo` to `doing`). No code touched. (This validation note is the only other new file.)
- **UI Index:** "Your decks" and "Deck detail" rows updated with links to [[Decks]] and [[Decks Components]].
- V-008 (build, lint, tests): SKIPPED, no code changed.

## Notes (not failures)
1. The brief's text mixes "—" only as table placeholders; no style issue.
2. UI Index says "Built today: placeholder count line + FAB + empty state"; consistent with the Board request, not re-run against the app here.
