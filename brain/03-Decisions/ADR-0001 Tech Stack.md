---
tags: [adr]
status: accepted
date: 2026-11-23
---
# ADR-0001: Tech Stack

## Context
We need a front end for browsing large, image-heavy card grids, a service layer for import,
legality checks and matching, and a data pipeline for cards and tournament decks. RJ has strong
Angular experience and prefers clean, straightforward implementations.

## Decision (RJ, 2026-11-23)
- **Front end:** Angular (standalone components, signals), in `web/`.
- **Services:** a TypeScript (Node) API in `services/`, sharing types with the front end.
- **Data:** versioned JSON in `data/` (cards, ban list, events, decklists) for now. Add a database
  when accounts or saved collections need one.
- **Development is local-first:** everything runs on RJ's machine until the MVP is done.
- **Hosting is deferred:** see [[ADR-0004 Hosting (Deferred)]]. Firebase or AWS, whichever is cheaper.

## Consequences: stay host-neutral
These keep the Firebase vs. AWS choice open:
- Services are stateless HTTP handlers with no host-specific SDKs in business logic.
- Storage and file access go through small interfaces (e.g. a `CardRepository`), with local JSON
  and file adapters for now.
- Configuration comes from environment variables, documented in `.env.example`.
- The Angular app is a static build, so either host can serve it.
