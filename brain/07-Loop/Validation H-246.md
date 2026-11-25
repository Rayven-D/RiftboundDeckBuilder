---
tags: [validation]
item: H-246
---
# Validation H-246

2026-11-25 · H-246 · PASS · lint, unit tests (972/972), prod build, own Playwright (Edge, ng serve :4320 plus own Auth/Firestore emulators): phone tab bar signed out and signed in at 375/320/640/641, header at 1440, theme migration, no-flash, toggle behaviour, one visible account trigger per width, menu contents, username prompt; diff scope; traceability; API Contracts v1.21 · failures: none

Build: `loop/H-246-theme-toggle-account-tab` @ `8d0dbd4`. Spec text read from the main checkout (SPEC-010 0.17.1, "40rem and below" = phone).

- **Lint, tests, build:** `ng lint` clean; `ng test` 69 files, 972 tests pass; `npm run build` completes.
- **Phone, signed out (375, 640):** header holds only the wordmark and the toggle (44x44, top-right, 16 px from the edge). Tab bar has four equal columns: Decks, Collection, Tournaments, person icon "Sign in" (90 px wide at 375, 76 at 320, 156 at 640). The header's own account button is `display: none` (0x0).
- **Phone, signed in (375 dark/light, 320, 640):** the tab shows only the letter avatar (40x40), no visible label, accessible name "Account: Val246", `aria-haspopup=menu`, no `aria-current`. The menu opens upward and holds Sync now / Account Information / Privacy notice / What's new / Sign out with 3 dividers and no Theme text. At 641 the avatar tab is hidden and the header shows avatar + name (89 px wide); at 1440 the header trigger is 125 px wide. One visible account trigger at every width tested.
- **Header at 1440:** toggle 44x44 at x=1096 (signed in) / 1126 (signed out), immediately left of the account control with an 8 px gap. No footer theme switch anywhere (`app-theme-switch` gone from the DOM).
- **Icon shows current theme:** moon on a dark page (`aria-pressed=true`), sun on a light page; name "Dark theme"; tooltip "Switch to light theme" on a dark page.
- **Theme rules:** stored `system` and stored `banana` are both removed on load (stored becomes null) and the app follows the OS (dark OS gives `rgb(27,31,36)`, light OS gives `rgb(244,246,248)`). Stored `light` on a dark OS wins. With nothing stored and a dark OS, one click stores `light`, a reload keeps it, a second click stores `dark`.
- **No flash:** an init-script observer recorded every `data-theme` and body background through load for four cases (dark on a light OS, light on a dark OS, nothing stored on a dark OS and on a light OS): only one state each, no flip.
- **Scope:** the diff against `dev` does not touch `page-fab.ts`. The footer change is the removal of `<app-theme-switch>` (plus comment edits and removing the toggle-group focus rule). No footer layout, spacing or text change; H-247 stays open.
- **Traceability:** new/renamed tests carry IDs (SYNC-157, SYNC-158, SYNC-150 g, SYNC-104 e, AC 54/69/71/72/77/79/81/82, LOG-010). No leftover `THEME_CHOICES` / `ThemeSwitch` references except the negative test in `app.spec.ts`.
- **API Contracts v1.21:** Theme bullet, new Phone account tab bullet, history line and the two menu-order mentions all match the code (`effectiveTheme`, `toggledTheme`, `ThemeService.effective/toggle()`, `ThemeToggle`, `AccountTab`).
- **Username prompt crash:** does NOT reproduce here. A newly created account (no account document) opened "Choose a username" in Edge headless and headed at 1440, and headless at 375; at 375 a name was typed and saved, the avatar changed to "P" and the tab name to "Account: PhoneUser". No crash event. Not filed as a board item. The builder's crash may be specific to their browser build or environment; I did not run `dev` 7af8149 separately.

Minor, non-blocking: comments in `app.html` and `app.scss` still say "below 40rem" while the CSS is `max-width: 40rem` (the spec says "40rem and below"); behaviour is right.

Not run: reduced-motion browser check (covered by a unit test), a11y snapshot via the Skill tool, 390 px width.
