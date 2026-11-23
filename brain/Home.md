---
tags: [moc]
---
# 🧠 Riftbound Deck Builder: Home

> Import the Riftbound cards you physically own → see which meta decks you can build, which
> you're close to, and what's missing.

## Map
- [[Product Vision]]: what we're building and for whom
- [[Research Index]]: rules, bans, meta, tournaments, card data (researcher)
- [[Spec Index]]: buildable specifications (spec-writer)
- [[Decision Log]]: architecture decisions / ADRs
- [[UI Index]]: screens & design decisions (ui-builder + RJ)
- [[API Contracts]]: service ↔ UI contract (service-builder)
- [[Handoff Board]]: requests between agents
- [[Session Log]]: what happened, when

## Folders
| Folder | Purpose | Owner |
|---|---|---|
| `00-Inbox` | Quick captures, unsorted ideas | anyone |
| `01-Research` | Sourced, dated game facts | researcher |
| `02-Specs` | Testable requirements | spec-writer |
| `03-Decisions` | ADRs | RJ approves |
| `04-Product` / `04-UI` | Vision, screens, design | RJ + ui-builder |
| `05-Services` / `05-Handoffs` | API contracts, agent requests | service-builder / all |
| `06-Sessions` | Session log | all |
| `Templates` | Note templates | — |

## Pipeline
```mermaid
flowchart LR
  R[researcher] -->|01-Research| S[spec-writer]
  S -->|02-Specs| B[service-builder]
  B -->|API Contracts| U[ui-builder]
  U <-->|builds with| RJ((RJ))
  B -.questions.-> H[[Handoff Board]]
  U -.requests.-> H
  S -.needs research.-> H
  H -.-> R
```
