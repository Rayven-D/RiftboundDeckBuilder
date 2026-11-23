---
tags: [ui, design]
status: draft
date: 2026-11-23
---
# Design Direction

Owner: **ui-builder** with RJ. Status: **awaiting RJ's choice** at the review gate (H-009).

Hard limits for every direction ([[Riot Developer Rules]], [[Product Vision]]): our own visual
identity, **no Riot or Riftbound logos**, nothing designed to look like Riot's official site or
the game's UI, and no "official" wording. Card art from the API is allowed and is the visual
centrepiece. The Legal Jibber Jabber notice always sits in the footer.

## Candidate directions (pick one, or mix)

### A. Table Tool (calm utility)
Quiet dark-slate surfaces, one cool accent, system fonts, and dense, readable lists. The card images
supply all the colour, and the chrome stays out of the way. It's optimised for a phone at the game
table: big tap targets, sticky filters, and owned/missing shown with icon + colour + text. It's the
lowest effort, the most clearly "not Riot", and it ages well.

### B. Binder (collector's feel)
Warm neutral paper and leather tones, with cards in sleeve-like tiles on a binder-page grid. A
completion % shows as a thin progress bar on each deck tile, and a serif is used for headings only.
It feels personal and collection-first. There's a moderate risk of looking busy, so keep the
ornament minimal.

### C. Scoreboard (event-forward)
High-contrast dark theme with bold sans headings and placing labels ("1st", "Top 4") as strong
badges, plus an event timeline on Tournaments. It celebrates the players and results (Riot rule 8:
honour, don't shame). We must take care that it doesn't drift toward the game's own
fantasy-UI styling.

## Decisions taken in the scaffold (H-009, 2026-11-23)
- **Stack:** Angular 22.3 standalone components and signals, zoneless (the v22 default), lazy-loaded
  routes, SCSS, strict TypeScript, no SSR ([[ADR-0001 Tech Stack]]).
- **Routes:** `/decks` (default), `/decks/:id`, `/collection`, `/import`, `/tournaments`. Unknown
  paths redirect to `/decks`. Route params bind to component inputs.
- **Shell:** a plain-text wordmark "Riftbound Deck Builder" (no logo, no imitation of official
  lettering), a nav list, a skip link, `<main>`, and a footer with the Legal Jibber Jabber notice.
- **Tokens:** CSS custom properties in `web/src/styles.scss`. The neutral palette is dark by default
  and follows `prefers-color-scheme` for light. There's a 4px spacing scale, radii, system font
  stack, and `--owned` / `--missing` colours (never colour alone in the UI: always pair with
  text or an icon).
- **Card images:** a `--card-aspect-ratio: 63 / 88` placeholder (standard TCG card size, *to
  confirm* against the images the API serves), plus a `.card-image` class that reserves space to
  avoid layout shift.
- **Config:** `apiBaseUrl` in `web/src/environments/` (dev `http://localhost:3000`, prod `/api`),
  exposed via the `API_BASE_URL` injection token. Front-end config is public, so it never holds
  secrets or keys.
- **Quality:** ESLint (angular-eslint, including template accessibility rules) and Vitest with jsdom
  (no browser needed). Scripts: `npm run lint`, `npm run build`, `npm test`.
- **Copy:** no metagame language (win rates, tiers, "meta" scores) in the UI ([[ADR-0003 Tournament Results Only]]).

## Open for RJ
- Choose a direction (A / B / C) and an accent colour.
- Is the wordmark text OK as-is, or do you want a different product name?
- Nav order: Decks, Collection, Import, Tournaments. Should Import be more prominent for first-time users?

## RJ feedback
- 2026-11-23: Simplify buttons. Square corners (`border-radius: 0`) on nav links and `.button`. The active nav state is a straight 2px bottom border in the accent colour (previously a curved inset shadow inside a rounded box).
- 2026-11-23: Page descriptions limited to one short line. "Decks I can build" renamed to **Your decks** (nav, title, back link).
- 2026-11-23: Import screen = two option cards: **Owned Cards Import** ("List of cards and their quantity you own") and **Deck Import** ("Created deck list that you want to make"). Square corners, consistent with the buttons.
