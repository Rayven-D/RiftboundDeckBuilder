# services/: Riftbound Deck Builder API and card pipeline

TypeScript (strict, ESM) on Node's built-in `http` module. No runtime dependencies; dev
dependencies are only TypeScript, `@types/node`, Vitest, ESLint and typescript-eslint.
Built from SPEC-001 (`brain/02-Specs/Card Data Model.md`); the UI contract is
`brain/05-Services/API Contracts.md`.

## Requirements
- **Node 22.18 or newer** (`node -v`). The scripts run the `.ts` sources directly with Node's
  built-in type stripping, and read `.env` with `--env-file-if-exists`. No `tsx`/`ts-node`.

## Run it on Windows (PowerShell)
```powershell
cd services
npm install
npm run ingest:cards      # calls the Riot API with RIOT_API_KEY from ..\.env
npm run dev               # API on http://localhost:3000/api (restarts on file changes)
```
Then open `http://localhost:3000/api/health`. The web app calls the API at `/api` in dev and
production; in dev the Angular dev server (`npm start` in `web/`) proxies `/api` to this server
(`web/proxy.conf.json`), so `http://localhost:4200/api/health` works too. If you change `PORT` in
`.env`, update the proxy `target`. CORS still allows `http://localhost:4200` when `NODE_ENV` is
`development` (the default), for direct calls.

### How the config finds `.env`
Every script runs `node --env-file-if-exists=../.env ...`. npm always runs scripts from
`services/`, so `../.env` is the **project-root** `.env` (the one next to `CLAUDE.md`). If it is
missing, Node prints a notice and continues. Variables already set in the shell win over `.env`.
All settings are environment variables (see the root `.env.example`):

| Variable | Default | Used by |
|---|---|---|
| `RIOT_API_KEY` | none | `ingest:cards` only. Sent only as the `X-Riot-Token` header; never logged, returned, or written to disk. |
| `RIOT_REGION` | `AMERICAS` | `AMERICAS`, `ASIA` or `EUROPE` (any case) |
| `PORT` | `3000` | API server |
| `DATA_DIR` | `<project>/data` | snapshot folder (a relative path is resolved from `services/`) |
| `NODE_ENV` | `development` | enables CORS for `http://localhost:4200` |

Development keys expire every 24 hours. A `401`/`403` from the ingest means: regenerate the key
in the Riot Developer Portal and update `.env`.

## Scripts
| Script | What it does |
|---|---|
| `npm run dev` | API server from `src/` with `--watch` |
| `npm run build` / `npm start` | compile to `dist/` / run the compiled server |
| `npm test` | Vitest unit and HTTP tests (no network; the Riot API is stubbed) |
| `npm run lint` | ESLint (incl. the V-011 host-SDK import rule) + `tsc --noEmit` |
| `npm run ingest:cards` | build `data/cards.json` (options below) |
| `npm run check:decklists` | V-003: every card in `brain/01-Research/Decklists/*.md` resolves in the snapshot |

### `ingest:cards` options
```text
npm run ingest:cards -- --from <raw.json>    # read a saved response instead of calling the API
npm run ingest:cards -- --data-dir <dir>     # write somewhere else (tests, experiments)
npm run ingest:cards -- --region EUROPE
npm run ingest:cards -- --rederive           # re-apply data/variant-rules.json to the stored raw file (no API call)
```
Output (SPEC-001):
- `data/cards.json`: the `CardSnapshot` (deterministic: sorted, fixed key order, so it diffs cleanly).
- `data/cards.report.json`: the `IngestionReport` (new sets, added/removed printings, unmapped types,
  new properties, field conflicts, collector collisions, null counts).
- `data/raw/riot-contents-<lastUpdated>.json`: the unmodified API response (`:` replaced by `-` for
  Windows). `data/raw/` is gitignored. A response that fails validation is kept as
  `riot-contents-failed-<time>.json` for debugging.
- `data/variant-rules.json` is optional; without it every printing has `variant.kind: "unknown"`
  and `variantRulesVersion` is `"0"`.

A failed run (bad JSON, missing `id`/`name`/`set`/`collectorNumber`, duplicate ids, name-key
collisions) exits with code 1 and leaves the previous `cards.json` and report unchanged
(files are written to a temp file, then renamed).

## Layout
```text
src/domain/     pure logic: nameKey, collectorKey, printingSortKey, category mapping,
                raw → snapshot normalization, lookups, the SnapshotStore/ContentSource ports
src/adapters/   FileSnapshotStore (local JSON, atomic writes), RiotContentClient (fetch + X-Riot-Token)
src/http/       read-only API server and routes
src/cli/        ingest-cards.ts, check-decklists.ts
src/config.ts   env-var config; the key is wrapped so it can't be printed by accident
test/           Vitest tests named after SPEC-001 requirement IDs; fixtures/ is SYNTHETIC
```
Host-neutral (ADR-0001/0004): no Firebase or AWS SDK outside `src/adapters/`; ESLint enforces it.

## Not verified yet
The Riot response schema comes from a community mirror of the docs (research fact #9). Until a
live response has been inspected, `faction` is kept in `extra` (not mapped to `domains`), and
`domains`, `isChampionUnit`, `championTag`, `isSignature`, `isPreview` and `releaseStatus` are
always `null` (unknown). Only `Legend`, `Unit`, `Rune` and `Battlefield` map to categories.
