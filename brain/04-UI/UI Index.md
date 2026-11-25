---
tags: [moc, ui]
---
# UI Index

Owner: **builder** with RJ. Record agreed screens and design decisions here.

## Screens
| Screen | Status | Notes |
|---|---|---|
| Import (owned cards / deck) | scaffolded | paste / CSV upload, parse errors per line |
| Collection | brief approved, rev 3 (RJ, 2026-11-24) | **[[Collection]]** design brief + **[[Collection Components]]** (component handoff for H-086) + **[[Collection Review H-086]]** (built page review: 4 blocking fixes in H-095) (ui-engineer, approved by RJ with all open choices answered). Rev 2 after RJ's review: image-only full-color tiles, one per printing (RJ), with a per-printing `×N` badge and a card-level "2 of this card locked in <deck>" band, a read-only card dialog (copies, printings, Locked in, Could fit in, ban, keywords slot), search + 3 sorts, Export. SPEC-007 editing/tags/filters out of scope pending H-091; build item H-086 |
| Your decks | scaffolded | imported community decks; per-card ownership colouring (full / darkened / partial fraction), ban status on every card ([[ADR-0006 Two Imports - Collection and Decks]]) |
| Tournaments | scaffolded | recent events, with winning decks and their lists |
| Deck detail | scaffolded | owned/missing per card, missing list, export |
| Account and sync (SPEC-010) | built, needs-RJ review | header "Sign in" (outlined button left of Import) → dialog with "Continue with Google" / "Sign in with an email link"; signed in: "Account" menu with the sync status text, Sync now, Sign out, Delete account and data. Dialogs (v0.8, H-081): Sign in ("Sign in to import your cards and decks…", no legacy-data warning), Sign out (plain question with Sign out primary / Cancel; with unsynced changes a warning with Sync now primary / Sign out anyway / Cancel, Sync now runs with the dialog open; offline only Cancel works), Delete account (type `delete`); no Combine dialog. Notices as snack bars. Hidden and not loaded while `signInEnabled` is off (production). Open: no Settings page yet (Delete account sits in the account menu), privacy-notice link waits on H-069, email-link opened on another device asks for the address with the browser prompt |
| Sign-in gate (SPEC-010 SYNC-009, H-081) | built, needs-RJ review | Account-required mode only (`signInEnabled: true`). Collection, Decks, deck detail and Import keep their page header and show a dashed panel instead of their content: per-page heading ("Sign in to see your collection" / "…your decks" / "Sign in to import cards and decks"), the signed-out or lost-session line, and a filled **Sign in** button that opens the Sign in dialog. First sync running: one status line "Getting your collection and decks from your account…"; failed: the error line with **Try again**. Header tabs and Import stay visible. Tournaments is public; its deck controls (not built yet) must render only while `SignInGate.deckControls()` is true. Local-only mode: no panel anywhere. Page header above the panel: decided (RJ decision 14). Signed-out text "You need a free account to import cards or decks." (H-135) |

## Reviews
| Date | Note | Scope |
|---|---|---|
| 2026-11-24 | [[UI Review 2026-11-24]] | `loop/SPEC-010-v0.9-build`: sign-in gate, account menu, sign-in / sign-out / delete dialogs, notices, header and phone tab bar. 23 findings; top three: invisible keyboard focus on Material buttons, snack bars over the phone tab bar, Delete account styled as primary |
| 2026-11-24 | [[Brief H-139]] | Brief for finding #1: focus ring on Material buttons (2px outside) and menu items (inset), plain CSS in `styles.scss`, contrast table, Playwright accept list |
| 2026-11-24 | [[Brief H-101]] | Brief for finding #2: phone snack bars sit above the tab bar (bottom margin = bar + `--tabbar-border` + safe area + `--space-2`), overlay pane click-through via `:has()`, plain CSS in `styles.scss`; two Playwright passes |
| 2026-11-24 | [[Brief H-102]] | Brief for finding #3: filled danger button (`--color-danger` fill, new `--color-danger-contrast` label: 7.65 dark / 7.07 light), neutral disabled, scoped `mat.button-overrides` on `.mat-mdc-button-base.danger`; one divider + danger label on the account menu item; styleguide Buttons section |
| 2026-11-24 | [[Brief H-104 H-106 H-124]] | Brief for findings #4, #5, #21: sign-in dialog leads with the email field (launch), all provider buttons outlined (Send link the only fill), custom send-failure line (icon + `--color-danger`, aria-invalid/describedby, focus to field, no alert), "Sending…" with `disabledInteractive`, phone stack at 40rem with full-width Send link, no dialog scrollbar |
| 2026-11-24 | [[Brief H-140 H-125 H-108]] | Brief for findings #6, #7, #22: sent state (address in bold, focus to the sent line, persistent status regions, Send again keeps focus with `disabledInteractive`, text buttons in content, stacked at 40rem), focus restore via an explicit trigger plus a body fallback, Material confirm dialog for the other-device link |
| 2026-11-24 | [[Brief H-141 H-142 H-110]] | Brief for findings #8, #9: "Signed in as {email}" first line (muted label, address in text colour, wraps), stuck-deletion menu (no Sync now, Try deleting again, error status with icon), fixed groups with exactly 3 dividers, offline line under the status, menu divider token mapped to `--color-border` |
| 2026-11-24 | [[Brief H-143 H-122]] | Brief for findings #10, #19: delete dialog sign-in-first state (step 1 sentence as plain body text, Cancel + filled Sign out, hand-off to the Sign out dialog, focus back to the Account trigger); sign-out dialog keeps one explanation line (muted under the warning, alert on the warning only), "Syncing…" with min-width and `disabledInteractive`, focus to Sign out after a clean sync, three actions stacked at 40rem |

## Design decisions
See [[Design Direction]]: candidate visual directions awaiting RJ's choice, and the decisions taken in the H-009 scaffold.

Routes: `/import`, `/collection`, `/decks` (default), `/decks/:id`, `/tournaments`.

## Engine
Decks screens read the pure ownership engine in `web/src/app/core/decks/` (H-059): shared pool, lock
checks, shortfalls, `computeDeckOwnership()` and `summarizeDeck()`. Types and notes:
[[API Contracts]] → "Browser-side shared types". Components only render its output.
