---
tags: [loop, validation]
board: H-311
---
# Validation H-311 (engine fields for the Decks list: OWN-100…104, [[API Contracts]] v1.25)

Scope: uncommitted working tree on `loop/H-311-engine-fields` (`web/src/app/core/decks/` types, `deck-ownership-view.ts`, `index.ts`, new `deck-tile-fields.spec.ts`; [[API Contracts]] v1.25). Specs: [[Your Decks Ownership View]] 0.10.2 OWN-100, 101, 103, 104, 002 and ACs 23-25; [[Shared Cards and Lock-in]] SHARE-053. Checks: [[Validation Checks]].

2026-11-25 · H-311 · PASS · checks run: V-008 web (`npx ng lint` all files pass; `npm run build` ok; `npm test` 77 files / 1121 tests pass), Accept tests read and traced (below), V-009 (API Contracts v1.25 entry and body present; wikilinks resolve) · failures: none

## Accept trace
- OWN-101 (a)-(c): `deck-tile-fields.spec.ts` "OWN-101 completion percentage" (4 tests): 0 / 100 / clamped 1..99, runes and sideboard counted per copy, R = 0 and ownership unavailable give null.
- AC 23: 34 of 66 -> fill 34/66, 51; 66 of 66 -> 100, ready; empty collection -> 0, none.
- AC 24: 1/300 -> 1, 299/300 -> 99, 65/66 -> 98; empty deck null/null; ownership unavailable null with Legend kept; no Legend 20/40 -> 50.
- AC 25: locked complete 54 of 54 -> 100; 50 of 54 -> 92, still locked; unlocked second deck counts only free copies; locked + unavailable -> "Locked", no percentage.
- OWN-103: distinct cardKeys (Main + Sideboard counts once), earliest upcoming date, null when ban data not loaded. OWN-104: pilot verbatim for tournament, null for user. OWN-002/DECK-091: `readOnly`. OWN-026: purity.
- OWN-073: tile fields equal `view.summary` values.

## Builder choices judged against the spec
1. A/R = `copiesAvailable`/`copiesRequired`: OK (OWN-101 (a) same basis as OWN-050).
2. Exported `completionPercent` helper: OK, matches the API Contracts doc; no spec conflict.
3. `legend` null for no Legend / unknown card / catalog not loaded, kept while ownership unavailable: matches OWN-100 (d), (e).
4. `bans` null when any card is `'unknown'`: OK. `banStatus` is `'unknown'` only when ban data is null (`deck-ownership-view.ts:318`), so it equals "ban data not loaded". Edge: an empty deck reads `{0,0,null}` with no data; shows nothing either way (documented in API Contracts).
5. `readOnly = schemaVersion > 1`: matches the types.ts DECK-091 wording and the spec's "newer than schemaVersion 1".
6. `pilot = source.pilot` for tournament: OK (OWN-104, "name alone").
7. No other fields: matches the spec data contract (lines 381-411).

## Notes (no failure)
- `unavailableLock` was only reformatted by prettier (no behaviour change).
- Page wiring (tile rendering, header text) is H-060/H-254, not this item.
