---
tags: [loop, validation]
---
# Validation Checks

Catalogue for the **validator**. Status: `active` (runs now) · `planned` (activates once its
prerequisites exist). Builders: when your work makes a planned check possible, mark it
`active` and point to the script.

| ID | Check | Scope | Status | How |
|---|---|---|---|---|
| V-001 | Every tournament decklist in `01-Research/Decklists` is legal under the current rules and ban list. Decks from before a ban are flagged, not failed. | legality, bans | planned | needs SPEC-002 + legality engine |
| V-002 | Round trip: a decklist exported as an import file and matched against itself scores 100% with nothing missing. | import, matching | planned | needs SPEC-003/005 |
| V-003 | Every card named in a decklist resolves to exactly one card in the card DB. | cards, decklists | planned | needs SPEC-001 pipeline |
| V-004 | Card image URLs resolve (all new cards, plus a 5% sample of existing ones) and follow the usage terms in [[Card Data & Images]]. | images | planned | needs card pipeline |
| V-005 | Traceability: every MUST requirement in an `approved` spec has at least one test whose name contains its ID. | specs, tests | planned | grep tests for IDs |
| V-006 | Freshness: ban and meta notes have an `as_of` date within 14 days; other research within 60 days. | research | active | read frontmatter |
| V-007 | Contract conformance: UI types and mocks match [[API Contracts]]. | ui, services | planned | needs web/ + services/ |
| V-008 | Build, lint, and unit tests pass. **web/: active.** Run `npm run lint`, `npm run build`, `npm test -- --watch=false` on RJ's PC, or in a Linux copy with its own `npm ci` (RJ's `web/node_modules` has Windows binaries, so don't run it from the Linux VM). services/: planned, activates with H-008. | code | active (web) | npm scripts |
| V-010 | No metagame statistics in app data, API contracts, or UI (ADR-0003): play/win rates, matchups, tiers, meta scores, **and cross-deck counts or shares** (e.g. "share", "% of field", "x of Top 8", per-Legend counts) (CAT-061/063). | data, api, ui | active | grep data/, services/, web/src, [[API Contracts]] for: `win rate`, `winrate`, `play rate`, `matchup`, `tier`, `meta score`, `share`, `% of`, `of the field` |
| V-011 | Host-neutral: no Firebase or AWS SDK imports outside `services/**/adapters/`; config comes from env vars listed in `.env.example` (ADR-0001/0004). | services, web | planned | activates with H-008 |
| V-012 | Secrets & branding: no `RGAPI-` string in tracked files or the web bundle; `.env` is gitignored; no Riot or Riftbound logo files in `web/`; the Legal notice is present in the footer. | repo, web | active | `git grep RGAPI-`; check assets |
| V-009 | Documentation hygiene: research notes have sources, tiers, `as_of`, and `status`; specs have numbered requirements and Given/When/Then; wikilinks resolve. | all notes | active | read notes |
