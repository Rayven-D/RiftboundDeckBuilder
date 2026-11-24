---
tags: [moc, ui]
---
# UI Index

Owner: **ui-builder** with RJ. Record agreed screens and design decisions here.

## Screens
| Screen | Status | Notes |
|---|---|---|
| Import (owned cards / deck) | scaffolded | paste / CSV upload, parse errors per line |
| My collection | scaffolded | owned cards; user tags; sort/filter by name, attributes, tags; default set → collector number (overnumbered included) |
| Your decks | scaffolded | imported community decks; per-card ownership colouring (full / darkened / partial fraction), ban status on every card ([[ADR-0006 Two Imports - Collection and Decks]]) |
| Tournaments | scaffolded | recent events, with winning decks and their lists |
| Deck detail | scaffolded | owned/missing per card, missing list, export |
| Account and sync (SPEC-010) | built, needs-RJ review | header "Sign in" (outlined button left of Import) → dialog with "Continue with Google" / "Sign in with an email link"; signed in: "Account" menu with the sync status text, Sync now, Sign out, Delete account and data. Dialogs (v0.8, H-081): Sign in ("Sign in to import your cards and decks…", no legacy-data warning), Sign out (plain question with Sign out primary / Cancel; with unsynced changes a warning with Sync now primary / Sign out anyway / Cancel, Sync now runs with the dialog open; offline only Cancel works), Delete account (type `delete`); no Combine dialog. Notices as snack bars. Hidden and not loaded while `signInEnabled` is off (production). Open: no Settings page yet (Delete account sits in the account menu), privacy-notice link waits on H-069, email-link opened on another device asks for the address with the browser prompt |
| Sign-in gate (SPEC-010 SYNC-009, H-081) | built, needs-RJ review | Account-required mode only (`signInEnabled: true`). Collection, Decks, deck detail and Import keep their page header and show a dashed panel instead of their content: per-page heading ("Sign in to see your collection" / "…your decks" / "Sign in to import cards and decks"), the signed-out or lost-session line, and a filled **Sign in** button that opens the Sign in dialog. First sync running: one status line "Getting your collection and decks from your account…"; failed: the error line with **Try again**. Header tabs and Import stay visible. Tournaments is public; its deck controls (not built yet) must render only while `SignInGate.deckControls()` is true. Local-only mode: no panel anywhere. Open for RJ: keep the page header above the panel or show the panel alone |

## Design decisions
See [[Design Direction]]: candidate visual directions awaiting RJ's choice, and the decisions taken in the H-009 scaffold.

Routes: `/import`, `/collection`, `/decks` (default), `/decks/:id`, `/tournaments`.
