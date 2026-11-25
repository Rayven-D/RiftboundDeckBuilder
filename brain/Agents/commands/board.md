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
   and never stage them); switch to `dev`, creating it from `main` if missing. Read
   `brain/Current State.md`, `brain/05-Handoffs/Handoff Board.md`, and `brain/07-Loop/Validation Checks.md`.
   If tracked files have uncommitted changes, stop and report: someone is working in this checkout.
2. **Each round:**
   a. Pick the actionable item: status `todo`, all `depends` are `done`, owner is an agent (not
      RJ), and the highest priority (P0 → P3), oldest first.
   b. Mark it `doing`. Run `git checkout -b loop/<ID>-<slug> dev`.
   c. Dispatch the owning subagent (`riftbound-researcher`, `spec-writer`, `ui-engineer`, `builder`)
      with the item row, its links, and its Accept check. Code changes come only from `builder`
      (`ui-engineer` writes design guidance only): if a spec, research or design item turns out to
      need code, file a `builder` item instead of adding the code to this one.
   d. Dispatch `validator` on the item.
   e. On **PASS**: mark the item `done` with a link to the result, commit `"<ID>: <summary>"` on the
      item branch, then run `git checkout dev && git merge --no-ff loop/<ID>-<slug>`.
      On **FAIL**: commit what exists on the item branch as `"<ID>: WIP (validation failed)"`,
      return to `dev`, increment the item's attempts, and set it back to `todo`. The validator has
      already filed the follow-up items. After 3 attempts, set it to `needs-RJ`.
   e2. **Release PR (PASS only, RJ 2026-11-24):** once the item is merged into `dev`, it is ready for
      release. Run `git push origin dev` (a plain push: never force). Then check for an open
      `dev` → `main` PR with `gh pr list --base main --head dev --state open`:
      - none open: `gh pr create --base main --head dev --title "<ID>: <summary>"` with a body that
        lists the item (ID, summary, validator result link) under "Items in this release";
      - one open: add the item to that PR's "Items in this release" list with `gh pr edit` (and
        update the title if it still names a single item, e.g. `"Release: H-156, H-160"`).
      Never merge the PR, enable auto-merge, or push `main`: only RJ merges `dev` → `main`. If the
      push or `gh` fails (auth, network, non-fast-forward because `origin/dev` moved), do not force or
      rebase: add a `needs-RJ` item with the error, list it under "Waiting on RJ", and carry on.
   f. **Gates park, they don't stop.** If the work produced something only RJ can approve (a
      proposed ADR, a UI screen ready for review, a spec flagged `review`), add a `needs-RJ` item,
      list it under "Waiting on RJ" in `brain/Current State.md`, and **carry on** with the next
      actionable item. Items that depend on the parked one are not actionable, so they wait
      automatically. Never work around a gate (never treat a `needs-RJ` item or anything that
      depends on it as approved).
   g. **Hard stop** (end the run at once, even with items left) only for gate 5 in the protocol:
      anything destructive or irreversible, or anything that would touch outside services or
      accounts (deploy, Firebase, Riot API keys, paid services, any push other than step e2).
3. **Stop** when there are no actionable items, a hard stop is hit, or the round cap is reached.
4. **Report:** append an entry to `brain/06-Sessions/Session Log.md` and commit it to `dev`. If
   this run opened or updated a release PR, push `dev` again so the PR carries the log. Then tell RJ
   (with the PR link): what got done, every gate parked this run (with links), and what's next.

Never push anything but `dev` (step e2), never force, rebase shared branches, delete unmerged branches, or edit `.obsidian/`.
