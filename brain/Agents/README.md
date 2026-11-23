# Agents

Source of truth for the project's subagent definitions. These files are tracked in git; `.claude/` is not.

To install or refresh them, copy the agent files into `.claude/agents/`:

```powershell
New-Item -ItemType Directory -Force .claude\agents | Out-Null
Copy-Item brain\Agents\*.md .claude\agents\ -Exclude README.md
```

Edit the copies here, then re-run the copy.

| Agent | File |
|---|---|
| Researcher | [[riftbound-researcher]] |
| Spec writer | [[spec-writer]] |
| Service builder | [[service-builder]] |
| UI builder | [[ui-builder]] |
