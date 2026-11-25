---
tags: [loop, validation]
item: H-113, H-116, H-123, H-126 (closes H-082)
date: 2026-11-24
round: 1
result: PASS (H-113, H-116, H-123, H-126)
---
# Validation H-113 / H-116 / H-123 / H-126: dialog surface, notice kinds, header account button, hero note per mode

Items: [[Handoff Board]] H-113 (UI review #11, dialog surface), H-116 (UI review #14, notice timing and politeness),
H-123 (UI review #20, header Sign in / Account at 44 px with a stronger edge) and H-126 (UI review #23, hero note
per mode, RJ decided 2026-11-24; closes H-082). All four were built together on one branch.
Spec: [[Accounts and Sync]] v0.10 SYNC-007, SYNC-008, SYNC-074, SYNC-096, Impacts (home copy); [[My Collection]]
COLL-054 (Remove-card Undo must not fall under the 6 s rule).
Design: [[Brief H-113 H-116 H-123 H-126]], plus the ui-engineer's Playwright verdict at its end.
Scope: uncommitted tree on `loop/H-113-misc-polish` (base 5718401). Files: `styles.scss`,
`core/sync/account-menu.ts` (+ spec), `core/sync/sync.service.ts`, `pages/home/home-page.{ts,html,spec.ts}`,
`shared/sync/sync-engine.ts` (+ spec), `shared/sync/testing/device.ts`, and the new `shared/sync/notice.ts`,
`core/sync/notice-kinds.spec.ts`, `shared/sync/sync-engine-notice-kinds.spec.ts`, `tooling/dialog-surface.spec.ts`.
Notes: [[UI Index]], [[Session Log]] and the new brief. No file under `brain/02-Specs/` or under the Collection page
changed (`git status`).

**Browser evidence:** the ui-engineer ran a development build against the Auth and Firestore emulators
(`demo-rift-builder`) with Playwright at 1440, 768 and 375, dark and light, with the keyboard. 18 screenshots are in the
side-session notes folder `h113-screens`, outside the repo. The validator looked at `import-dialog-fix-1440-dark.png`
(separate raised panel, visible Upload file edge, muted and body text distinct) and `home-1440-light.png` ("Free
account", Sign in and Import the same height) and did not drive the browser again. The one must-fix from that pass
(outlined buttons in dark dialogs at 1.13:1) was fixed and rechecked as PASS.

## Result
2026-11-24 · H-113 · PASS · Accept (dark screenshot shows a separate dialog; muted text 4.93:1 dark / 6.40:1 light, recomputed), dialog-surface tests, V-008, V-009, V-011, V-012 · failures: none
2026-11-24 · H-116 · PASS · Accept (tests per notice kind for duration and politeness, service + engine + menu; 2 mutations caught), V-008 · failures: none
2026-11-24 · H-123 · PASS · Accept (44 px and aligned at 1440 and 768 by Playwright; `--color-border-strong` 3.28:1 on the light bg, recomputed; class test), V-008 · failures: none
2026-11-24 · H-126 · PASS · Accept (home test per mode, "Free" / "Free account"; wording is RJ's 2026-11-24 decision), V-008 · failures: none · closes H-082

New board item: **H-148** (builder, P3, SYNC-074 one notice per short deck). H-146 (spec-writer) gets parts (3)
notice kinds and (4) the Impacts home-copy bullet. `next_id` 148 → 149.

## Checks run
### V-008 (web), run by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | Application bundle generation complete, initial total 406.81 kB (exit 0) |
| `npm test` | 48 files, **670 passed** (exit 0) |
| `npm run test:rules` | Default PATH: fails at start-up, "firebase-tools no longer supports Java version before 21" (environment, not the change). With `C:\Program Files\Microsoft\jdk-21.0.13.102-hotspot\bin` prepended for that command: 4 files, **34 passed** (exit 0) |

The Session Log's builder entry says 667 web tests, written before the ui-engineer's H-113 fix (the outlined-button
edge, now asserted in `dialog-surface.spec.ts`). The validator's run of the current tree is 670, all passing.

### H-113 Accept: dark dialog is a separate surface; muted text ≥ 4.5:1 on it
- `tooling/dialog-surface.spec.ts` (3 tests, named `H-113: …`) reads `styles.scss` (jsdom loads no global styles):
  `--color-surface-dialog` is `var(--color-surface-raised)` in `:root` and `var(--color-surface)` in the light block;
  `--color-border-dialog` is `#434c56` / `#d3d9e0`; `mat.dialog-overrides` sets `container-color`, `subhead-color` and
  `supporting-text-color`; the rule `.cdk-overlay-pane:not(.card-dialog-panel) .mat-mdc-dialog-surface` maps
  `--color-border` and `--mat-button-outlined-outline-color` to `--color-border-dialog`.
- Contrast, recomputed by the validator from the token hex values in `styles.scss` (WCAG relative luminance):
  muted `#9aa3ad` on `#2d343c` **4.93**, muted `#56606b` on white **6.40**, text `#e6e8eb` on `#2d343c` **10.26**,
  dialog hairline `#434c56` on `#2d343c` **1.44**. All match the brief's table.
- Screenshot `import-dialog-fix-1440-dark.png`: the dialog is a lighter panel distinct from the page behind the scrim,
  with the Upload file edge visible. The ui-engineer measured the computed background `rgb(45, 52, 60)` dark and
  `rgb(255, 255, 255)` light; the card dialog keeps `rgb(36, 42, 49)`.

### H-116 Accept: tests per notice kind for duration and politeness
- `core/sync/notice-kinds.spec.ts` (spy on `MatSnackBar.open` through `SyncService.notify`): `H-116 success … closes
  after 6 s, polite, with OK`, `H-116 info … stays until OK and is polite`, `H-116 error … stays until OK and is
  assertive`, `H-116 an unclassified message stays open and is polite`, `H-116 the engine's notices reach the snack
  bar with their kind (sign-out refused offline = error)`, and `H-116 runDelete's failure notice is assertive with Try
  again and no timer`.
- `shared/sync/sync-engine-notice-kinds.spec.ts`: `noticeOptions` per kind and for a missing / unknown kind; the
  engine sends `signInFailed`, `offline` (sign-in, sign-out, delete), `deleteIncomplete` as `error`; `deletedOwn` and
  `deleteNotDone` as `success`; `reauthNeeded`, `accountDeleted`, `sessionLost`, `halfDeleted` as `info`.
  `sync-engine.spec.ts` SYNC-072 now also checks the "changed on another device while it was locked" notice is `info`.
- `EngineDeps.notify` takes `kind` as a required parameter, so every engine call is type-checked; a grep of
  `sync-engine.ts` finds no `notify(` without a kind (the clock warning passes `'info'` on the next line).
  `writeFailed`, `tooLarge`, `unreadable`, `invalid` and `paused` go to the status line through `setProblem`, not to a
  notice, so they have no kind to test.
- **Mutation check** (production file backed up to the scratchpad, mutated, the two H-116 specs run, file restored and
  compared byte for byte):
  1. `notice.ts` error case `politeness: 'assertive'` → `'polite'`: **3 tests fail** (`noticeOptions` error,
     SyncService error, engine-to-snack-bar offline). Restored.
  2. `sync-engine.ts` `notify(MESSAGES.deletedOwn, 'success')` → `'info'`: **1 test fails** (`H-116 deletedOwn is a
     success`). Restored.
  After both, `git diff --stat` was unchanged (12 files, +158 / −33).
- COLL-054: `collection-page.ts` is unchanged; its two snack bars (6 s, no action) are not routed through
  `noticeOptions`, and `notice.ts` says it isn't for Collection notices.

### H-123 Accept: header buttons align at 1440; border visibly bounded in light
- `account-menu.spec.ts` `H-123 Sign in and Account both carry the header-only 44px class with the strong control
  edge`: both triggers have `header-account`; the component styles set `--mat-button-outlined-container-height: 44px`
  and `--mat-button-outlined-outline-color: var(--color-border-strong)`.
- Alignment: the ui-engineer measured Sign in / Account, the three tabs and Import at 44 px with centres at y = 32 at
  1440 and 768, and 44 px in the 56 px phone header at 375. `home-1440-light.png` shows Sign in and Import level.
- Light edge `#7f8994` on the light bg `#f4f6f8`: **3.28:1** (dark `#727d89` on `#1b1f24`: 3.95), recomputed.

### H-126 Accept: home test per mode; RJ OK
- `home-page.spec.ts` `H-126: local-only mode (signInEnabled false) shows the hero note "Free"` and `H-126:
  account-required mode (signInEnabled true) shows the hero note "Free account"`, exact text on `.hero-note`.
- RJ decided the two strings on 2026-11-24 (board row). The brief's follow-up wording question (the note while signed
  in) is open for RJ and does not block this Accept.
- H-082 closes: the flagged string was already gone (2026-11-23), and the note now follows the mode.

### Other checks
- **Tests named by board ID:** every new or changed test name starts with or contains `H-113`, `H-116`, `H-123` or
  `H-126`.
- **V-009:** every wikilink in [[Brief H-113 H-116 H-123 H-126]] and in the added [[UI Index]] / [[Session Log]] lines
  resolves: [[Accounts and Sync]], [[Brief H-143 H-122]], [[Design Direction]], [[My Collection]],
  [[UI Review 2026-11-24]], and the brief itself. The brief has frontmatter (title, status, board, source, date).
- **V-011:** the diff adds no `firebase` import.
- **V-012:** `grep RGAPI-` in `web/` and `services/` finds no matches.

## Notes (not failures)
1. **SPEC-010 sets no duration or politeness for any notice**, so H-116 is tested against the brief, not the spec.
   Added to H-146 as part (3). SPEC-010's Impacts bullet "Home page copy" still quotes "Free · No account · Stored in
   your browser": H-146 part (4).
2. **SYNC-074** says "A notice lists each such deck", but the engine sends one notice per short locked deck, and
   Material shows one snack bar at a time, so only the last stays on screen. Not changed by this branch (the call
   only gained `'info'`). Filed as **H-148**.
3. The lift shadow also reaches the card dialog. The ui-engineer judged it fine and consistent; Accept doesn't cover it.
4. The `info` kind was checked in the browser only through unit tests (the ui-engineer says so in the verdict).
5. Open for RJ, from the brief: "Free account" while signed in, and whether all outlined buttons should take
   `--color-border-strong`. Neither blocks these rows.
