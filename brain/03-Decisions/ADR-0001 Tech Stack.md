---
tags: [adr]
status: proposed
date: 2026-11-23
---
# ADR-0001: Tech Stack

## Context
We need a front end for browsing large, image-heavy card grids, a service layer for import,
legality checks and matching, and a data pipeline for cards and meta decks. RJ has strong
Angular experience and prefers clean, straightforward implementations.

## Proposal (for RJ to accept or change)
- **Front end:** Angular (standalone components, signals), in `web/`
- **Services:** TypeScript (Node) API in `services/`, sharing types with the front end
- **Data:** start with versioned JSON in `data/` (cards, decklists) and add a database when
  accounts or saved collections need one
- **Hosting:** to decide (GCP us-south1 is an option)

## Alternatives to consider
- Front end only, with matching run in the browser (no back end for MVP)
- A different service language or framework

## Decision
_Pending RJ._
