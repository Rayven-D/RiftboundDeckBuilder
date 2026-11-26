---
tags: [loop, protocol]
status: active
adr: "[[ADR-0002 Closed-Loop Development]]"
---
# Loop Protocol

The loop's state is the [[Handoff Board]]. The `/board` command runs this protocol, and
`/research-refresh` (manually or on the weekly schedule) feeds new information into it.
`/board` was called `/loop` until 2026-11-24; it was renamed so it stops hiding Claude Code's
built-in `/loop`, which reruns a command on its own (`/loop /board`).

```mermaid
flowchart LR
  Sense[Sense<br/>researcher] --> Spec[Specify<br/>spec-writer]
  Spec --> Build[Build<br/>builder]
  Build --> Verify{Verify<br/>validator}
  Verify -- PASS --> Merge[PR → dev<br/>RJ merges]
  Verify -- FAIL --> Board[(Handoff Board)]
  Merge --> Board
  Board --> Pick[pick next item]
  Pick --> Sense & Spec & Build
  Board -. gate .-> RJ((RJ))
  RJ -. approves / merges dev → main .-> Board
  Cron[[weekly + /research-refresh]] --> Sense
```

## Board item lifecycle
`todo` → `doing` → `verify` → `done`
- On a validation failure the item returns to `todo` (attempts +1). After 3 attempts it becomes `needs-RJ`.
- `blocked`: waiting on another item or outside information (use the `depends` column).
- `needs-RJ`: a gate. The item is parked until RJ answers; the loop carries on with other items.

## Picking the next item
Status `todo`, every `depends` item `done`, an agent owner (not RJ), highest priority first
(P0 > P1 > P2 > P3), then oldest ID first.

## Owners
| Owner | Agent | Typical work |
|---|---|---|
| researcher | `riftbound-researcher` | game facts, decklists, card data sources |
| spec-writer | `spec-writer` | requirements, data contracts, acceptance criteria |
| ui-engineer | `ui-engineer` | UI/UX design guidance, no code: design briefs in `brain/04-UI/` before a screen is built, critiques and accessibility audits after (looked at in a browser at 1440 / 1024 / 768 / 390); files `builder` items for every change |
| builder | `builder` | all code: `web/` screens and components, browser business logic, `services/`, data pipeline, API contracts (each finished screen goes to a `needs-RJ` review gate). Only `builder` changes code; other owners file a `builder` item |
| validator | `validator` | re-runs checks, regression sweeps |
| RJ | you | gates: ADRs, UI reviews, spec approvals, merging `dev` → `main` |

## Gates
Gates 1–4 **park** the item: it becomes `needs-RJ`, goes under "Waiting on RJ" in [[Current State]],
and the loop carries on with the next actionable item. Anything that depends on a parked item is not
actionable, so it waits too. The loop never treats a parked item as approved. (Changed 2026-11-24 from
"the loop always stops", so an unattended run keeps working while RJ is away.)
1. Any ADR with status `proposed`
2. A UI screen ready for review
3. A spec newly marked `review` that changes legality or matching behavior
4. An item that failed validation 3 times

Gate 5 is a **hard stop**: the run ends at once.

5. Anything destructive or irreversible, or anything that would touch outside services or accounts
   (deploy, Firebase, Riot API keys, paid services, any push other than a `loop/*` branch for its PR)

## Git policy
- `main`: only RJ merges into it, from `dev`.
- `dev`: the integration branch. It holds the board state. The loop never commits to it directly
  and never pushes it; it only fast-forwards to `origin/dev` at preflight to pick up merged PRs.
- `loop/<ID>-<slug>`: one branch per board item, created from `dev`. **After the validator passes,
  the loop pushes the branch and opens a PR into `dev`** (RJ 2026-11-24). RJ merges it, except
  that a PR whose files are **all under `brain/`** is merged by the loop itself (`gh pr merge --merge`,
  RJ 2026-11-24); `dev` is then fast-forwarded to `origin/dev` before the next item. An item
  counts as `done` for `depends` only once its PR is merged into `dev`, and an item with an open PR
  is never picked again. Failed items keep a local WIP commit: no push, no PR.
- `loop/board-<YYYY-MM-DD-HHMM>`: one bookkeeping branch per `/board` run for everything that isn't
  an item's own work (failed attempts, `needs-RJ` items, follow-ups, Session Log, Current State).
  It gets its own PR into `dev` at the end of the run; merge it after that run's item PRs (it is
  brain-only, so the loop merges it itself once the item PRs are in).
- `research/refresh-<date>`: one branch per research refresh, merged into `dev` the same way.
- Commit messages start with the item ID. Never force or rebase `dev`/`main`, never merge a PR that
  touches anything outside `brain/`, never merge into `main`, never enable auto-merge. A brain-only
  PR that fails to merge (conflict, failing check) is left open for RJ. A failed push or `gh` call parks a `needs-RJ` item instead of forcing.

## Round cap
Default 5 rounds per `/board` run (`/board 10` for more). Research refreshes are a single round.

## Scheduled runs
A nightly scheduled task (`rift-builder-nightly-board`, Claude desktop app, 02:05 local) runs
`/board 5` in this project. It runs only while the app is open (a missed run starts on the next
launch). Preflight skips the run if tracked files have uncommitted changes, so it never mixes with
work in progress. It pushes only `loop/*` branches for their PRs into `dev` and merges the brain-only ones itself; RJ reviews the rest and the parked gates in the morning.

## Research refresh
On demand with `/research-refresh [focus]`. The weekly scheduled run is **not set up yet**: RJ deleted the original task on 2026-11-23 and will recreate it inside the Claude project later (H-042). Until then, run it manually.
1. The researcher checks every source in the [[Research Index]] for changes since each note's `as_of` date.
2. Real changes go to the [[Change Feed]] and the affected notes are updated.
3. Each change that affects a spec gets a P1 board item for spec-writer. A ban change also gets
   a P0 item for validator to re-run V-001.
4. The validator runs documentation checks, and the result is merged into `dev`.
5. If nothing changed: a single line in the Change Feed and no board items.

## Keeping the brain light
At the end of every `/board` run, the orchestrator:
- updates [[Current State]] (one screen; rewrite it, don't append)
- keeps only the latest 2 Session Log entries and moves older ones to `Archive/Sessions/`
- moves every `done` row (Open table and Done section) to [[Completed Items Handoff Board]] in `Archive/Board/`, appended under the date; the live board holds open items only (RJ 2026-11-26: trim whenever possible)
- keeps the latest round in [[Validation Runs]] and moves older lines to `Archive/Validation/`
- moves a superseded note to `Archive/` with `archived: true`, `archived_on`, `reason`, `superseded_by`, and fixes live links

## Session reporting
Every run appends to the [[Session Log]]: rounds run, items done, failures, gates hit, and what comes next.
