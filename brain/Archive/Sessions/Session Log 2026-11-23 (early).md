---
tags: [archive, sessions]
archived: true
archived_on: 2026-11-23
reason: older session entries
superseded_by: "[[Current State]]"
---
# Session Log, 2026-11-23 (early, archived)

## 2026-11-23: /loop round 1 (orchestrated in a Claude session)
- Done: H-003, H-004, H-005, H-006 (specs SPEC-001 to SPEC-004, v0.1 drafts; validator PASS with follow-ups) and H-009 (Angular 22.3 scaffold in web/: lint, build and tests green).
- Validator follow-ups filed: H-015 to H-019 (cross-spec alignment, wrong ACs, decklist backfill).
- Stopped at gates: H-023 (UI review and product defaults) and H-020 (live Riot API payload; the sandboxes can't reach Riot).
- RJ actions:
  1. `cd web; npm install; npx ng serve`, then open http://localhost:4200
  2. Fetch the API payload in PowerShell from the project root:
     `$k=(Get-Content .env | ? {$_ -like 'RIOT_API_KEY=*'}) -replace 'RIOT_API_KEY=',''; New-Item -ItemType Directory -Force data\raw | Out-Null; Invoke-WebRequest -Headers @{'X-Riot-Token'=$k} 'https://americas.api.riotgames.com/riftbound/content/v1/contents?locale=en' -OutFile data\raw\riftbound-content-en.json`
- Next /loop: H-015, H-016, H-017, H-019 in parallel → H-007 (Build Matching) + H-008 (services scaffold).
## 2026-11-23: researcher: first research pass (H-001)
- All 9 research topics done, plus 8 European Championship Top 8 decklists. A new ban wave took effect today; all 8 lists are now historical.
- Policy risk: Riot forbids metagame-defining data (H-010, needs RJ). API key + image terms (H-011, needs RJ).
- Specs H-003 to H-005 and H-007 are now unblocked; H-006 is blocked on H-010.

## 2026-11-23: Closed loop set up
- validator agent, /loop, /research-refresh, a Handoff Board with fixed fields, ADR-0002, a weekly scheduled refresh (Mon 18:58 CT).

## 2026-11-23: Project setup
- Created vault structure, agent definitions (researcher, spec-writer, service-builder, ui-builder), CLAUDE.md, and .gitignore.
- Next: research queue → first specs → ADR-0001 decision.
