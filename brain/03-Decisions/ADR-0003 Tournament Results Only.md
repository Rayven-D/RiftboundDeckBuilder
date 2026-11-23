---
tags: [adr, policy]
status: accepted
date: 2026-11-23
---
# ADR-0003: Show Tournament Results Only, No Meta Statistics

## Context
Riot's developer policy forbids apps from publishing or storing "metagame-defining data", such as
play rates, win rates, and matchup data (see [[Card Data & Images]]). Our original idea of ranking
decks by meta strength would conflict with that.

## Decision (RJ, 2026-11-23)
- The app shows **recent tournament results**: for each event, the winning deck(s) and their
  decklists, with the event, date, region, and placing exactly as published.
- **No computed statistics**: no play rates, win rates, matchup data, tier lists, archetype
  shares, or "meta score". We don't store any of these either.
- "Decks I can build" is sorted by **how complete the deck is from your collection**, then by
  **how recent the event is**. Placing is shown as a label (e.g. "1st, European Championship"),
  not used as a computed strength score.
- Research notes may mention meta context so we understand the game, but none of it flows into
  app data, the API, or the UI.

## Consequences
- SPEC-004 is renamed [[Tournament Deck Catalog]]. It has no scoring formula.
- New check V-010: no metagame statistics in app data, the API, or the UI.
- Open question for RJ: winners only, or all published top placings (e.g. the Top 8) with their placing labels?
