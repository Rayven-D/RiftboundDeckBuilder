---
description: Run the closed development loop over the Handoff Board until it runs out of actionable items or hits the round cap
argument-hint: "[max rounds, default 5]"
---
Run the Rift Builder dev loop. Max rounds: $ARGUMENTS (default 5 if empty).

This is the project's board loop. It was called `/loop` until 2026-11-24 and was renamed so it no
longer hides Claude Code's built-in `/loop`. To let Claude keep coming back to the board on its own,
run `/loop /board`.

Follow `brain/07-Loop/Loop Protocol.md` exactly. In short:

1. **Preflight:** no uncommitted changes to tracked files (untracked files are fine: leave them alone
   and never stage them); switch to `dev`, creating it from `main` if missing. Run `git fetch origin`
   and `git merge --ff-only origin/dev` so `dev` has every item PR that has been merged. If it can't
   fast-forward, stop and report (local `dev` and `origin/dev` have diverged). Read
   `brain/Current State.md`, `brain/05-Handoffs/Handoff Board.md`, and `brain/07-Loop/Validation Checks.md`.
   If tracked files have uncommitted changes, stop and report: someone is working in this checkout.
   Create the run's bookkeeping branch `loop/board-<YYYY-MM-DD-HHMM>` from `dev` (`git branch`, no checkout yet).
2. **Each round:**
   a. Pick the actionable item: status `todo`, all `depends` are `done` **on `dev`** (an item whose
      PR is still open is not `done` yet, so its dependents wait for the merge), owner is an agent
      (not RJ), no open PR from a `loop/<ID>-*` branch (`gh pr list --base dev --state open`), and
      the highest priority (P0 → P3), oldest first.
   b. Run `git checkout -b loop/<ID>-<slug> dev`, then mark the item `doing` on that branch.
   c. Dispatch the owning subagent (`riftbound-researcher`, `spec-writer`, `ui-engineer`, `builder`)
      with the item row, its links, and its Accept check. Code changes come only from `builder`
      (`ui-engineer` writes design guidance only): if a spec, research or design item turns out to
      need code, file a `builder` item instead of adding the code to this one.
   d. Dispatch `validator` on the item.
   e. On **PASS** (RJ 2026-11-24: every item gets its own branch and its own PR into `dev`):
      mark the item `done` with a link to the validator result, commit `"<ID>: <summary>"` on the
      item branch, run `git push -u origin loop/<ID>-<slug>`, then
      `gh pr create --base dev --head loop/<ID>-<slug> --title "<ID>: <summary>"` with a body that
      gives the item row, what changed, the validator result, and any follow-up items it filed.
      Do **not** merge the branch into `dev` locally. RJ merges the PR, unless step e3 applies.
      Return to `dev`.
      On **FAIL**: commit what exists on the item branch as `"<ID>: WIP (validation failed)"` (keep it
      local: no push, no PR) and return to `dev`. On the bookkeeping branch, increment the item's
      attempts and set it back to `todo` (after 3 attempts, `needs-RJ`), add the validator's
      follow-up items, and commit.
      If a push or `gh` call fails, never force: add a `needs-RJ` item with the error on the
      bookkeeping branch and carry on.
   e3. **Brain-only PRs merge themselves (RJ 2026-11-24).** Right after opening a PR, list its files
      with `gh pr diff <n> --name-only`. If **every** path starts with `brain/`, merge it yourself:
      `gh pr merge <n> --merge` (a merge commit, like `--no-ff`; keep the branch). Then
      `git checkout dev && git fetch origin && git merge --ff-only origin/dev`, so the next item
      branches from a `dev` that has it and its dependents become actionable in this run. If any
      path is outside `brain/` (code, `data/`, `services/`, `web/`, `CLAUDE.md`, config), leave the PR
      for RJ. If the merge fails (conflict, check failing, not mergeable), don't fix it by force:
      leave the PR open for RJ, note it in the report, and carry on.
   f. **Gates park, they don't stop.** If the work produced something only RJ can approve (a
      proposed ADR, a UI screen ready for review, a spec flagged `review`), add a `needs-RJ` item and
      list it under "Waiting on RJ" in `brain/Current State.md` (both on the bookkeeping branch), and
      **carry on** with the next actionable item. Items that depend on the parked one are not
      actionable, so they wait automatically. Never work around a gate (never treat a `needs-RJ`
      item or anything that depends on it as approved).
   g. **Hard stop** (end the run at once, even with items left) only for gate 5 in the protocol:
      anything destructive or irreversible, or anything that would touch outside services or
      accounts (deploy, Firebase, Riot API keys, paid services, any push other than a `loop/*`
      branch for its PR).
3. **Stop** when there are no actionable items, a hard stop is hit, or the round cap is reached.
4. **Report:** on the bookkeeping branch, append an entry to `brain/06-Sessions/Session Log.md`
   (with each item's PR link), update `brain/Current State.md`, and commit. Push it and open its PR
   into `dev` titled `"Board run <date>: log and board state"`; say in the body that it should be
   merged after the run's item PRs (it touches the same board rows). It is brain-only, so apply step e3
   to it last, after the item PRs are merged. Then tell RJ: every PR opened (links) and which ones
   were merged by the loop, what got done, every gate parked this run (with links), and what's next.

Never commit to `dev` directly, never push `dev` or `main`, never merge a PR that touches anything
outside `brain/` (step e3), never merge into `main`, never enable auto-merge,
never force, never rebase shared branches, never delete unmerged branches, never edit `.obsidian/`.
