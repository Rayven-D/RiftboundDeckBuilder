---
description: Manually trigger a Riftbound research refresh (bans, sets, rules errata, tournaments, meta) and feed changes into the loop
argument-hint: "[optional focus, e.g. 'bans' or 'Worlds results']"
---
Run a research refresh for the Riftbound Deck Builder. Focus: $ARGUMENTS (if empty, cover everything).

Follow the "Research refresh" section of `brain/07-Loop/Loop Protocol.md`:

1. Switch to `dev` with a clean tree, then run `git checkout -b research/refresh-<YYYY-MM-DD> dev`.
2. Dispatch `riftbound-researcher` in **refresh mode**. For each note in
   `brain/01-Research/Research Index.md`, check its sources for anything newer than the note's
   `as_of` date: ban/restriction changes, new or upcoming sets, rules or errata updates, new
   tournament results and decklists, and meta shifts. Update the notes and add new Decklist notes.
3. Record each real change as a dated entry in `brain/01-Research/Change Feed.md`.
4. For each change that affects a spec, add a P1 Handoff Board item for `spec-writer`, linking the
   change. A ban change also needs a P0 item for `validator` to re-run V-001 once the specs are
   updated.
5. Dispatch `validator` (documentation checks on research), commit, and merge into `dev` with `--no-ff`.
6. Report: what changed and the board items created, or "no changes since <date>". If board items
   were created and RJ is present, offer to run `/loop`.
