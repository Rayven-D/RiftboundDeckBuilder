---
tags: [moc, ui]
---
# UI Index

Owner: **builder** with RJ. Record agreed screens and design decisions here.

## Screens
| Screen | Status | Notes |
|---|---|---|
| Import (owned cards / deck) | scaffolded | paste / CSV upload, parse errors per line |
| My collection | scaffolded | owned cards; user tags; sort/filter by name, attributes, tags; default set → collector number (overnumbered included) |
| Your decks | scaffolded | imported community decks; per-card ownership colouring (full / darkened / partial fraction), ban status on every card ([[ADR-0006 Two Imports - Collection and Decks]]) |
| Tournaments | scaffolded | recent events, with winning decks and their lists |
| Deck detail | scaffolded | owned/missing per card, missing list, export |
| Account and sync (SPEC-010) | built, needs-RJ review | header "Sign in" (outlined button left of Import) → dialog with "Continue with Google" / "Sign in with an email link"; signed in: "Account" menu with the sync status text, Sync now, Sign out, Delete account and data. Dialogs: Combine (Combine primary / Cancel), Sign out (Keep a copy primary / Remove / Cancel, Sync now when changes are pending), Delete account (type `delete`). Notices as snack bars. Hidden and not loaded while `signInEnabled` is off (production). Open: no Settings page yet (Delete account sits in the account menu), privacy-notice link waits on H-069, email-link opened on another device asks for the address with the browser prompt |

## Design decisions
See [[Design Direction]]: candidate visual directions awaiting RJ's choice, and the decisions taken in the H-009 scaffold.

Routes: `/import`, `/collection`, `/decks` (default), `/decks/:id`, `/tournaments`.

## Engine
Decks screens read the pure ownership engine in `web/src/app/core/decks/` (H-059): shared pool, lock
checks, shortfalls, `computeDeckOwnership()` and `summarizeDeck()`. Types and notes:
[[API Contracts]] → "Browser-side shared types". Components only render its output.
