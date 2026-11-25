# Rift Builder

A web app for Riftbound TCG players: import the cards you **physically own**, then see which
competitive ("meta") decks you can build right now, which are close, and exactly which cards
you are missing. Uses the official card images.

## The brain: `brain/` (Obsidian vault)

This folder is an Obsidian vault. `brain/` holds all project knowledge. **Read before you act,
write when you learn.**

- **Start at `brain/Current State.md`** (one screen). Then open only the notes your task needs.
- Each spec opens with a **Summary** block. Read that first, and the full spec only when you need detail.
- **`brain/Archive/` is low priority:** skip it unless the task specifically needs history. Archived notes are marked `archived: true`, may be outdated, and the live notes always win.
- Facts about the game live in `brain/01-Research/`, with sources and dates on every claim.
- Buildable requirements live in `brain/02-Specs/`. Code is built from specs, not from memory.
- Architecture choices live in `brain/03-Decisions/` as ADRs.
- Cross-agent work requests go on `brain/05-Handoffs/Handoff Board.md`.
- Each working session appends a short entry to `brain/06-Sessions/`.
- Use the templates in `brain/Templates/`. Link notes with `[[wikilinks]]`.

## The team (subagents in `.claude/agents/`)

| Agent | Owns | Writes to |
|---|---|---|
| `riftbound-researcher` | Rules, ban lists, meta, tournament results, card data & image sources | `brain/01-Research/` |
| `spec-writer` | Turns research into precise, testable specs | `brain/02-Specs/` |
| `builder` | All code, built from specs: UI (with RJ), browser business logic, services & data pipeline | `web/`, `services/`, `data/`, `brain/04-UI/`, `brain/05-Services/` |
| `ui-engineer` | UI/UX design advisor, **writes no code**: design briefs before a build, critiques and accessibility audits after, and RJ's sparring partner for UI/UX ideas. Uses every UI/UX skill and plugin and looks at the app with Playwright | `brain/04-UI/`, `builder` items on the Handoff Board |
| `validator` | Verifies every item; routes failures back | `brain/07-Loop/`, Handoff Board |

Flow: **researcher → spec-writer → (ui-engineer brief) → builder**, with RJ in the loop on UI and on every ADR.
Only `builder` changes code. `ui-engineer` guides the UI design and files `builder` items.
`spec-writer` writes specs only, and when a spec change needs code it files a `builder` item on
the Handoff Board. Any agent can post a request to the Handoff Board.

## The closed loop

- `/board [rounds]`: works the Handoff Board (pick → build → validate → PR into `dev`); gates park the item and the run carries on. `/loop /board` reruns it on its own, and a nightly scheduled task runs `/board 5` at 02:05. See `brain/07-Loop/Loop Protocol.md`.
- `/research-refresh [focus]`: checks for new bans, sets, events, and meta, and files board items for what changed. A weekly scheduled run is planned but **not set up yet**: RJ deleted the original task on 2026-11-23 and will recreate it inside the Claude project later (H-042).
- `validator` agent: nothing is `done` until it passes. Failures become new board items.
- Git: each board item gets its own `loop/<ID>-<slug>` branch. When it passes, `/board` pushes that branch and opens a PR into `dev`. A PR that only touches `brain/` is merged by `/board` itself; RJ merges the rest. Run bookkeeping goes in a `loop/board-<date>` PR. Only RJ merges `dev` → `main`. Never push `dev` or `main`.

## Ground rules

- Riftbound is new and changes fast. Never state a rule, ban, or meta fact without a source
  and an "as of" date. If unsure, mark it `status: unverified` and add it to the research queue.
- Card images: respect Riot's terms and fan-content policy. Prefer linking to or caching from a
  source that permits it, as documented in `brain/01-Research/Card Data & Images.md`.
- Keep implementations clean and straightforward. Don't add dependencies without a reason.
- Git: `.claude/` and `.obsidian/` are ignored. `brain/` **is** committed.
