# Agents

Source of truth for the project's subagent definitions. These files are tracked in git; `.claude/` is not.

To install or refresh them, copy the agent files into `.claude/agents/`:

```powershell
New-Item -ItemType Directory -Force .claude\agents | Out-Null
Copy-Item brain\Agents\*.md .claude\agents\ -Exclude README.md
New-Item -ItemType Directory -Force .claude\commands | Out-Null
Copy-Item brain\Agents\commands\*.md .claude\commands\
```

Edit the copies here, then re-run the copy.

| Agent | File |
|---|---|
| Researcher | [[riftbound-researcher]] |
| Spec writer | [[spec-writer]] |
| Builder (all code: UI, business logic, services) | [[builder]] |
| UI/UX engineer (design advisor, no code) | [[ui-engineer]] |
| Validator | [[validator]] |

Commands: [[board]] (`/board`, was `/loop`), [[research-refresh]] (`/research-refresh`)
