---
tags: [loop, validation]
---
# Validation H-189 (review gate for H-176: fix rounds de84200 and 098df32)

2026-11-25 · H-189 · PASS (rounds 1-3, through 7af77d1) · validator, worktree branch `claude/h189-review-0b21ca` (on top of 991a473), review in [[Review H-189]]

## Commands (all in `web/`)
| Command | Result |
|---|---|
| `npm run lint` | clean ("All files pass linting") |
| `npm run build` | ok |
| `npm test -- --watch=false` | round 3 (7af77d1): 58 files / 797 tests pass (rounds 1-2: 57 / 793; H-176 baseline 56 / 777) |
| `npm run test:rules` (JDK 21 first on PATH) | 6 files / 48 tests pass; emulators started and shut down cleanly. Ports 4200 / 8080 / 9099 had only TIME_WAIT sockets, no listener. This closes H-176 follow-up 3 (re-run with free ports). |

## Per finding (code and tests read against the finding; behaviour was checked on screen by the UI reviewer, see Review H-189)
| # | Fix in code | Test | Result |
|---|---|---|---|
| 1 Footer theme focus (AC 79) | `styles.scss`: `.mat-button-toggle-group .mat-button-toggle .mat-button-toggle-button:focus-visible` 2 px `--color-focus`, offset -2px, plus the same selector in the `forced-colors` block | `theme.service.spec.ts` "AC 79 / H-189 ... inset ring, also in forced colors" (stylesheet text check) | PASS |
| 2 Focus after `?import=1` / `?add=1` | `import-launch.ts` `importFocusTarget` + `dialogOpener`; Decks and Collection use `restoreFocus: false` and refocus in `afterClosed` after next render (FAB, else opener, else empty-state button, else `#main` via `refocusAfterDialog`); empty-state buttons got `#emptyImport` / `#emptyAdd` refs | `decks-page.spec.ts` (FAB case, empty-state case), `import-launch.spec.ts` (3 tests: order, disconnected skipped, opener) | PASS |
| 3 Tournaments link style (OWN-008) | `.button--outlined` moved to global `styles.scss`, copy removed from `collection-page.scss` (it keeps cursor, font and weight through `.button`); styleguide lists both | stylesheet test "OWN-008 / H-189 .button--outlined is one global variant" | PASS |
| 4 Offline reason linked | Delete: `aria-describedby` = delete line id + offline id while offline; Save: `blockerId` while blocked | `account-header.spec.ts` (ids resolve to "Deletes your account..." and "You're offline."; Save described by the reason) | PASS |
| 5 Field looks invalid | `setError()` calls `MatInput.updateErrorState()`; duplicate manual `aria-invalid` binding removed (MatInput owns it) | `account-header.spec.ts` "an error marks the field invalid (mat-form-field-invalid), next keystroke clears it" | PASS |
| 6 Announce after Enter | `fail()` announces through `LiveAnnouncer` (polite) when focus is already in the field, else focuses; same in `SignInDialog` | username test (Enter announces once, Save click moves focus); `sign-in-dialog.spec.ts` "AC 50 / H-189 Enter ... announced once" | PASS |
| 7 Ids once | `describedBy()` = error id + counter id, counter id set only on the new `<p>` | same invalid-field test splits `aria-describedby` and checks each id once | PASS |
| 8 Menu check alignment | `.check` fixed 20 x 20 inline-flex box, empty slot on unselected rows | no unit test (layout); verified on screen by the reviewer: 48 px rows, same label x and baseline | PASS (visual only) |
| 9 Notices above dialogs (RJ, round 3, 7af77d1) | new `core/notice-layer.ts`: on `MatDialog.afterOpened`, `raiseNotices` re-shows each open `mat-snack-bar-container` host (hidePopover/showPopover to move it to the top layer), or appends the host to the overlay container without popover support; skips a notice holding focus; never focuses it; started by `inject(NoticeLayer)` in `SyncService`; also moves the orphan comment (round 1 nit 1 fixed) | `notice-layer.spec.ts` (4 new tests, 58th file) | PASS (visual: reviewer round 3 PASS; optional nit N4: OK on a notice above a dialog drops focus to body) |
| Decks line (RJ) | text now "N decks saved." / "1 deck saved." (invented "The deck list comes next." removed; grep finds it nowhere in `web/src`) | `decks-page.spec.ts` "H-060 placeholder (RJ 2026-11-25)" | PASS |
| N1 Counter not live | counter is a plain `<p id=...>` outside `mat-form-field` (no `mat-hint`, `MatHint` import removed) | "SYNC-153 / H-189 N1" test: counter has no `aria-live` ancestor and is in the input's described-by | PASS |
| N2 One red | `mat.form-field-overrides` maps error outline, label, caret and error text and icon tokens to `var(--color-danger)` | stylesheet test "N2 ... one red" | PASS |
| N3 Menu edge | pure `menuEdgeCorrection(triggerRight, paneRight)` (gap 0.5 to 32 px only), applied as pane `margin-right` after `menuOpened`; cleared before each measuring | 2 tests: the function (small gap closed, none / rightward / large left alone) and a menu opened 15 px left moves 15 px and clears on a later aligned opening | PASS |

## Other checks
- **Scope:** rounds 1-2: 14 files, all tied to the findings. Round 3 (`098df32..7af77d1`): 4 files only (`notice-layer.ts` + spec, a 4-line hook in `sync.service.ts`, comment move in `account-dialogs.ts`). No spec, rules, services or data changes.
- **AC 79:** focus ring (finding 1) in code, forced colors and test; menu and footer stay in step is untouched.
- **AC 80 / SYNC-159 (c):** launch parameters still handled once; only the focus target changed.
- **Traceability:** every new test names its AC, SYNC or OWN ID plus H-189 in the title (AC 50, 74, 79, 80; SYNC-151, 153, 159; OWN-008). Finding 8 has no automated test (layout), accepted as visual.
- **Browser:** not rerun by the validator; the UI reviewer's Playwright pass of both rounds (Review H-189, "Re-check round 1 / 2", 0 console errors) is the on-screen evidence.

## Failures
None. Nits only, none blocking:
1. (Fixed in round 3) orphaned doc comment in `account-dialogs.ts`.
2. Finding 9 is fixed in round 3 (RJ decision). Optional nit N4 from the reviewer: OK on a notice above a dialog drops focus to body (not blocking).
3. Open from H-176 and still open: SYNC-151 `aria-disabled` vs native `disabled` on menu items (H-190). Review H-189 notes the unbuilt commit ("Not saved yet") panel; not part of this item.
