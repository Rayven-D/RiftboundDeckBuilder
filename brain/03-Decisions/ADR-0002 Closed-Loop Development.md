---
tags: [adr, loop]
status: accepted
date: 2026-11-23
---
# ADR-0002: Closed-Loop Development

## Context
Four specialist agents share the vault, but without a driver, a feedback step, and a refresh
trigger, the work only moves forward when RJ nudges each step. Riftbound's bans and meta also
change often.

## Decision (agreed with RJ, 2026-11-23)
- **State:** the [[Handoff Board]], with fixed columns, is the loop's single source of truth.
- **Driver:** the `/loop [rounds]` command runs the [[Loop Protocol]].
- **Feedback:** a new `validator` agent verifies every item against its Accept check and the
  [[Validation Checks]], and files a board item for every failure.
- **Autonomy:** the loop stops only at gates (ADRs, UI reviews, behavior-changing spec reviews,
  3 failed attempts, anything destructive).
- **Refresh:** a weekly scheduled research refresh, plus a manual `/research-refresh [focus]` for
  news between runs.
- **Git:** one branch per item (`loop/<ID>-<slug>`), merged into `dev` after validation. RJ merges `dev` → `main`.
- **Host:** RJ's PC (G:\Projects\RiftboundDeckBuilder), from Claude Code locally or from a Claude
  session that can reach the PC.

## Consequences
- `main` only moves when RJ reviews it.
- Validation checks activate step by step as code arrives (V-006 and V-009 are active from day one).
- Research quality directly drives the specs, so V-006 (freshness) matters.
