---
tags: [validation]
item: H-247
---
# Validation H-247

2026-11-25 · H-247 (and the combined branch H-245 + H-246 + H-247) · PASS · lint, unit tests (985/985), prod build, own Playwright (Edge headless, ng serve :4200 plus own Auth/Firestore emulators, signed in with a pre-seeded username, Small test data): footer height 8 widths x 3 pages x 2 themes, legal text, content edges, link hit areas, phone footer/tab-bar gap, H-245 FAB scroll loop, H-246 smoke; diff scope; traceability · failures: none

Build: `loop/H-245-247-shell-ui` @ `fd070c9`.

- **Lint, tests, build:** `ng lint` clean; `ng test` 71 files, 985 tests pass; `npm run build` completes.
- **Footer height (Home, /collection, /decks, both themes):** 45.0 at 1440, 58.6 at 1024 and 768, 75.4 at 641, 86.6 at 640, 103.4 at 390 and 375, 120.2 at 320. Targets 45 / 58 / 102 / 118, all within 4 px. Padding 12 / 12 at every width.
- **Layout:** footer row edges equal the header's content edges at every width. Above 40rem the legal notice is left and the links right on one row (RJ's addition); at 40rem and below the links sit above the notice. DOM order is legal, then links.
- **Legal text:** the DOM text matches the Riot string at every width and theme. The `<p class="legal">` in `app.html` is the same words and line breaks as `dev`, only re-indented.
- **Contrast values unchanged:** dark legal rgb(154,163,173), links rgb(45,212,191); light legal rgb(86,96,107), links rgb(15,118,110). Sizes: legal 12 px, links 14 px.
- **Link hit areas (/collection and /decks, 1440 to 320):** each link is 44 px tall and `elementFromPoint` 20 px above and below its centre hits the link; the box stays inside the footer. 32 of 32 checks. This includes phones, where the links sit over the legal text.
- **Phone gap (<= 640, /collection and /decks):** footer bottom to tab-bar top is 0 on /decks and within +/-0.41 px on /collection (sub-pixel from the 103.4 px fractional height). No whole-pixel overlap, no gap. The 1 px overlap is fixed.
- **H-245 Accept 1 rerun (/collection and /decks at 1440x900, 1024x768, 768x1024, 375x812, 812x375, 10 px scroll loop):** min FAB-to-footer gap 16.0, 0 bad steps, end gap 16.0, no empty band under the footer on desktop. (On /decks the page is short, 2 steps.)
- **H-246 smoke:** toggle "Dark theme" renders in the header at 1440 and 375 and switches theme; at 1440 the account control is in the header and there is no tab; at 375 the account tab ("Account: Tester") is in the tab bar and not in the header. No console or page errors in the whole run. The "Choose a username" prompt was avoided by seeding a username.
- **Scope:** `git diff dev...HEAD` is 28 files: the H-245 (`page-fab`, `fab-dock`, `styles.scss`, `collection-page`), H-246 (theme, account menu/tab, `index.html`, `icon.ts`) and H-247 (`app.html/.scss/.spec.ts`) code and tests, plus three brain notes (Handoff Board, API Contracts, Session Log). No `.claude/`, no scratch, image or log files; working tree clean apart from this note and the board edit.
- **Traceability:** the footer tests carry SYNC-158 (d), SYNC-104 (e, g), LOG-010, Brief H-247 F1 and AC 69/79 IDs in `app.spec.ts`.

Not run: reduced-motion browser check, a11y snapshot via the Skill tool, screenshots of every page at 768 (taken for /collection at 1440, 1024, 768, 390, 375).
