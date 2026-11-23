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
| V-008 | Build, lint, and unit tests pass for `web/` and `services/`. | code | planned | npm scripts |
| V-009 | Documentation hygiene: research notes have sources, tiers, `as_of`, and `status`; specs have numbered requirements and Given/When/Then; wikilinks resolve. | all notes | active | read notes |
