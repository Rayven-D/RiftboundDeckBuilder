---
description: Run the closed development loop over the Handoff Board until a gate, blocker, or the round cap
argument-hint: "[max rounds, default 5]"
---
Run the Riftbound Deck Builder dev loop. Max rounds: $ARGUMENTS (default 5 if empty).

Follow `brain/07-Loop/Loop Protocol.md` exactly. In short:

1. **Preflight:** clean working tree; switch to `dev`, creating it from `main` if missing. Read
   `brain/Home.md`, `brain/05-Handoffs/Handoff Board.md`, and `brain/07-Loop/Validation Checks.md`.
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
   f. If the work produced something only RJ can approve (a proposed ADR, a UI screen ready for
      review, a spec flagged `review`), add a `needs-RJ` item and **stop**.
3. **Stop** when there are no actionable items, a gate is hit, or the round cap is reached.
4. **Report:** append an entry to `brain/06-Sessions/Session Log.md` and commit it to `dev`.
   Then tell RJ: what got done, what's waiting on him (with links), and what's next.

Never push, force, rebase shared branches, delete unmerged branches, or edit `.obsidian/`.
