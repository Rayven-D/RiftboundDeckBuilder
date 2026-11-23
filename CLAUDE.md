# Riftbound Deck Builder

A web app for Riftbound TCG players: import the cards you **physically own**, then see which
competitive ("meta") decks you can build right now, which are close, and exactly which cards
you are missing. Uses the official card images.

## The brain: `brain/` (Obsidian vault)

This folder is an Obsidian vault. `brain/` holds all project knowledge. **Read before you act,
write when you learn.**

- Start at `brain/Home.md`.
- Facts about the game live in `brain/01-Research/`, with sources and dates on every claim.
- Buildable requirements live in `brain/02-Specs/`. Code is built from specs, not from memory.
- Architecture choices live in `brain/03-Decisions/` as ADRs.
- Cross-agent work requests go on `brain/05-Handoffs/Handoff Board.md`.
- Each working session appends a short entry to `brain/06-Sessions/`.
- Use the templates in `brain/Templates/`. Link notes with `[[wikilinks]]`.

## The team (subagents in `.claude/agents/`)

| Agent | Owns | Writes to |
|---|---|---|
| `riftbound-researcher` | Rules, ban lists, meta, tournament results, card data & image sources | `brain/01-Research/` |
| `spec-writer` | Turns research into precise, testable specs | `brain/02-Specs/` |
| `service-builder` | Backend services & data pipeline, built from specs | `services/`, `brain/05-Services/` |
| `ui-builder` | Front end, built collaboratively with RJ | `web/`, `brain/04-UI/` |

Flow: **researcher → spec-writer → service-builder → ui-builder**, with RJ in the loop on UI
and on every ADR. Any agent can post a request to the Handoff Board.

## Ground rules

- Riftbound is new and changes fast. Never state a rule, ban, or meta fact without a source
  and an "as of" date. If unsure, mark it `status: unverified` and add it to the research queue.
- Card images: respect Riot's terms and fan-content policy. Prefer linking to or caching from a
  source that permits it, as documented in `brain/01-Research/Card Data & Images.md`.
- Keep implementations clean and straightforward. Don't add dependencies without a reason.
- Git: `.claude/` and `.obsidian/` are ignored. `brain/` **is** committed.
