---
tags: [archive]
archived: true
---
# Archive

**Low priority. Agents skip this folder** unless a task specifically needs history (e.g. "why was X
decided", or a regression to investigate). Nothing here is current. It may contradict the live notes,
and the live notes always win.

## Rules
- Each archived note has frontmatter `archived: true`, `archived_on`, `reason`, and, where one exists, `superseded_by: [[...]]`.
- What goes here: old session entries, finished board items, old validation runs, spec changelogs, and research that is superseded or not used by the app.
- Moving a note here is done with `git mv`, so history stays intact, and live notes that linked to it are updated.
- Obsidian search still finds these notes. The `archived` tag helps filter them out (`-tag:#archive`).

## Contents
- `Sessions/`: Session Log entries older than the latest two rounds
- `Board/`: finished Handoff Board items (older than the latest ~10)
- `Validation/`: validation runs older than the latest round
- `Spec-Changelogs/`: changelog sections moved out of specs
- `Research/`: research notes not used by the app
