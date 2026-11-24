---
tags: [loop, validation]
item: H-104, H-106, H-124
date: 2026-11-24
round: 2
result: PASS
---
# Validation H-104 / H-106 / H-124: sign-in dialog layout, Send link failure, phone width

Items: [[Handoff Board]] H-104 (UI review #4, carries H-103), H-106 (UI review #5, carries H-105), H-124 (UI review #21).
Spec: [[Accounts and Sync]] v0.10 SYNC-005, SYNC-006 "Dialog layout" + "Send link", SYNC-002; ACs 1 (dialog part), 49, 50.
Design: [[Brief H-104 H-106 H-124]] (decisions 1-8, and the ui-engineer's "Acceptance run 1", 22 browser checks, PASS).
Scope: uncommitted tree on `loop/H-104-signin-dialog-layout` (base 04f9ae2): `web/src/app/core/sync/sync-dialogs.ts`
(`SignInDialog`, `SEND_LINK_FAILED`), `web/src/styles.scss` (`.mat-mdc-form-field.send-failed` outline override, additions
only), new `web/src/app/core/sync/sign-in-dialog.spec.ts` (9 tests), new `web/src/tooling/sign-in-dialog-layout.spec.ts`
(5 tests), 1 engine test (`sync-engine-account-required.spec.ts`), 1 adapter test (`firebase-auth-service.spec.ts`), 2 renamed
and tightened tests in `account-menu.spec.ts`, [[UI Index]] row, [[Session Log]] entry, new [[Brief H-104 H-106 H-124]].

## Result
2026-11-24 · H-104 · PASS · Accept (AC 49 + AC 1 dialog part as named tests, keyboard focus (a) on open and (b) after reveal, one filled button), V-008, test quality (mutation), SYNC-002 bundle check · failures: none
2026-11-24 · H-106 · PASS · Accept (AC 50 as named tests, error screenshots dark/light, aria check, Sending…), V-008, mutation · failures: none
2026-11-24 · H-124 · PASS · Accept (no scrollbar at 375, full-width controls: browser evidence + source tests), V-008, mutation · failures: none

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0) |
| `npm test -- --watch=false` | 40 files, **558 passed** (542 after H-102 + 16 new: 9 + 5 + 1 + 1) (exit 0) |
| `npm run test:rules` | 4 files, **34 passed** (needed the JDK 21 bin prepended to PATH; without it firebase-tools reports Java < 21) |

### H-104 Accept: AC 49 and AC 1 (dialog part)
- `AC 49 / AC 1 / H-104 opened from the header…`: real open path (header Sign in → `SyncService.openSignIn` → `MatDialog`
  with `autoFocus: 'first-tabbable'`); asserts the intro, no "Sign in with an email link", no `.providers` element, label
  "Email address", filled buttons = `['Send link']`, buttons = `['Send link','Close']`, `document.activeElement` is the input,
  and the `SYNC_ADAPTERS` loader was called 0 times.
- `AC 49 (b) / H-104 …` (2 tests): both providers `mat-mdc-outlined-button`, no input, no filled button; after the reveal
  the form sits directly after `.providers`, focus is in the input, Send link is the only filled button; a second press
  keeps the form and refocuses (not a toggle, no `aria-expanded`).
- AC 1 dialog part: `account-menu.spec.ts` `SYNC-003 / SYNC-006 (a)` (only Send link, input present, no Google) and
  `SYNC-006 (b)` (both buttons in order, no input).
- **No `firebase` on open (SYNC-002), checked in the built bundle as well:** `SignInDialog` is in the `account-menu` lazy
  chunk; neither it, its 6 static imports, nor `main` statically import the `firebase-adapters` chunk. The only reference
  is the `SYNC_ADAPTERS` factory's dynamic `import()`. Browser: brief check #2 (0 `/firebase/` resources after open).
- Keyboard: brief checks #1, #5-#8 (focus in field from mouse and keyboard opens; Enter/Space on reveal; tab order (a) and
  (b) both directions; Escape closes).

### H-106 Accept: AC 50, aria, Sending…, screenshots
- `AC 50 / H-106 while the request runs…`: label "Sending…", `aria-disabled="true"`, focus stays on the button, a second
  submit sends nothing.
- `AC 50 / H-106 a failed send…`: exact `SEND_LINK_FAILED` text, `app-icon name="error"`, no `role`, no
  `MESSAGES.signInFailed`, value kept, `aria-invalid="true"`, `aria-describedby` resolves to the message, `send-failed`
  class, focus on the input, Send link pressable again.
- `H-106 the failure clears on the first edit…`: message, both attributes (removed, not `"false"`) and the class go.
- `AC 50 / H-106 pressing Send link again…`: cleared on press; success shows today's sent line (H-140 replaces it).
- "No address stored on a failed send": `firebase-adapters.ts` `sendEmailLink` writes `localStorage` only after
  `sendSignInLinkToEmail` resolves (unchanged); adapter test `AC 50 / H-106 …stores no address` and engine test
  `AC 50 / SYNC-005 …leaves the device stores unchanged` (no notice, backend map unchanged, gate `signed-out`).
- **Error-state screenshots dark/light exist** in `.playwright-mcp/h104/` (untracked): `a-error-1440-dark.png`,
  `a-error-1440-light-2.png` (use this one, not `a-error-1440-light.png`), `a-error-375-dark.png`, `a-error-375-light.png`,
  `b-error-375-light.png`. Opened `a-error-1440-dark`, `a-error-1440-light-2`, `a-error-375-light`: red outline, icon on
  line 1, exact text, address kept; at 375 field and Send link full width. Contrast 7.44 dark / 6.53 light on the real
  surface (brief check #13).

### H-124 Accept: no scrollbar at 375, full-width controls
- Browser evidence (brief checks #15, #17): 375 field / Send link / error all 280px at left 40; `scrollHeight ==
  clientHeight` at 375 and 1440 in form, error and offline states, (a) and (b). Screenshot `a-error-375-light` agrees.
- Source tests (`sign-in-dialog-layout.spec.ts`, 5 `H-124:` / `H-106:` tests): phone `@media (max-width: 40rem)` column +
  stretch, field `flex: none`; desktop `flex: 1 1 16rem` and error `flex-basis: 100%`; no `overflow:` in the component
  styles; `.email` keeps `padding-bottom: var(--space-1)`; danger outline override without `!important`.
- No unit test can measure the scrollbar (jsdom has no layout); that part rests on the ui-engineer's run.

### Test quality (mutation check)
Run in a scratch copy of `web/` (node_modules by junction, font `@use` dropped from the copy only); the worktree was not
touched. Specs: `sign-in-dialog.spec.ts`, `sign-in-dialog-layout.spec.ts`, `account-menu.spec.ts` (41 tests).

| Mutation in `sync-dialogs.ts` | Caught by |
|---|---|
| unmutated | 41/41 pass |
| `emailOnly` always false (provider button back) | 8 tests incl. AC 49 header test |
| Google button filled | both AC 49 (b) tests |
| reveal without focus | AC 49 (b) reveal test |
| failure shows `MESSAGES.signInFailed` | 2 AC 50 tests |
| no `aria-invalid` | AC 50 failure + clear-on-edit |
| `aria-invalid="false"` instead of removed | clear-on-edit |
| no focus to the field on failure | AC 50 failure |
| no `disabledInteractive` | Sending… test + Send-waits test |
| no "Sending…" label | Sending… test |
| edit does not clear the error | clear-on-edit |
| `role="alert"` added | AC 50 failure |
| no `canSend()` guard in `send` | Sending… test (second request) |
| phone column removed | H-124 phone test |
| desktop `flex: 1 1 16rem` removed | H-124 desktop test |
| error icon removed | AC 50 failure |
| `send-failed` class removed | AC 50 failure |

16/16 caught. Not hollow.

### Out of scope, confirmed not built
- **H-140 sent state:** "Check your email for a sign-in link." still at `sync-dialogs.ts:94`; no Send again / Use a
  different email.
- **H-125 focus restore:** no `restoreFocus` change in the sign-in open (`sync.service.ts` untouched).
- **H-108 other-device confirm:** engine, adapters and `sync.service.ts` code untouched (only one engine spec added).

### Regressions
- **H-139 / H-101 / H-102:** `styles.scss` diff has no removed lines (one added block). `focus-ring.spec.ts`,
  `snackbar-offset.spec.ts`, `danger-button.spec.ts` pass in the 558. Brief checks #3 (0 `.danger` in the dialog), #19-#20
  (ring 2px, offset 2px, unclipped; 0px spare below Send link at 375, see note 2).

### Other checks
- **V-009 (changed notes):** [[Brief H-104 H-106 H-124]] links [[UI Review 2026-11-24]], [[Accounts and Sync]],
  [[Brief H-139]], [[Brief H-101]], [[Brief H-102]], [[Design Direction]], [[UI Index]]: all resolve. [[UI Index]] has its row.
- **V-011:** no `firebase` import in `sync-dialogs.ts`.
- **V-012:** `git grep RGAPI-` outside `brain/`: no matches.
- V-010: not in scope.

## Notes (not failures)
1. The no-scrollbar and equal-width checks for H-124 are browser-only evidence (ui-engineer run 1, screenshots inspected);
   the validator did not re-drive the browser.
2. Send link's H-139 ring at 375 has 0px spare below (brief row 19, "PASS (tight)"). Any change to `.email` padding or the
   dialog content's bottom padding would clip it; the source test guards the `padding-bottom` only.
3. Brief polish P1 (label stays teal on the red outline when focused) and P2 (ragged provider buttons at 375 in (b)) are
   optional and for RJ to decide; not acceptance criteria.
4. `npm run test:rules` needs the JDK 21 bin on PATH in this shell (contradicts the "Java 21 on PATH" memory for this session).

## Round 2 (after code-review fixes, 2026-11-24)
Scope: same uncommitted worktree. `sync-dialogs.ts`: `DestroyRef` guard (`destroyed`) so a send that settles after close
updates and focuses nothing (NG0911); form `novalidate`; `aria-invalid` now owned by MatInput through an
`errorStateMatcher` (`error() !== null`) + `updateErrorState()`, `[aria-describedby]` only while the error shows;
per-instance id `send-error-N`. `styles.scss`: `.send-failed` also sets plain and error label/outline tokens (red label).
5 new tests (4 in `sign-in-dialog.spec.ts`, 1 in `sign-in-dialog-layout.spec.ts`; one existing test reworded for "false").
Browser: ui-engineer "Acceptance run 2" in [[Brief H-104 H-106 H-124]], 11 checks PASS, screenshots `.playwright-mcp/h104/r2-*`.

### Result
2026-11-24 · H-104 · PASS (round 2) · V-008, AC 49 / AC 1 tests, bundle check · failures: none
2026-11-24 · H-106 · PASS (round 2) · V-008, AC 50 tests + aria wording, r2 screenshots, mutation of new code · failures: none
2026-11-24 · H-124 · PASS (round 2) · V-008, layout source tests, run 2 #7-#8 (no scrollbar, 280 px controls) · failures: none

### V-008, rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | exit 0; the dialog's chunk still only reaches `firebase-adapters` via the `SYNC_ADAPTERS` dynamic `import()`; none of its static imports contain Firebase Auth code |
| `npm test -- --watch=false` | 40 files, **563 passed** (558 + 5) (exit 0) |
| `npm run test:rules` | 4 files, **34 passed** (JDK 21 bin on PATH) |

### AC 50 aria wording vs the MatInput change
AC 50 requires, on failure, `aria-invalid="true"` with the failure text as the description: asserted by the AC 50
failure test (`aria-invalid` = `"true"`, `aria-describedby` = the `.error` id, `getElementById` resolves to it) and seen in
run 2 #2 (`send-error-1`, `send-error-2`). AC 50 says nothing about the no-error state. Material now writes
`aria-invalid="false"` on a filled field with no error (absent while empty); ARIA treats "false" as absent. This departs
from brief decision 4 ("remove, not false") for `aria-invalid` only; the ui-engineer accepted it in run 2. Not a spec
failure. `aria-describedby` is still removed when there is no error (test + run 2 #9).

### Mutation spot-check of the round 2 code (scratch copy of `web/`, worktree untouched)
| Mutation | Caught by |
|---|---|
| unmutated | 46/46 pass (3 spec files) |
| fixed id `'send-error'` | `H-106 each dialog gets its own send-failure id` |
| `novalidate` removed | the novalidate unit test + the source test |
| no `updateErrorState()` call | AC 50 failure test (`aria-invalid` not "true") |
| matcher always false | AC 50 failure test |
| `aria-describedby` always set | before-failure test + clear-on-edit test |
| only the catch guard removed / only the `focusEmail` guard removed | not caught (each guard alone is enough; they overlap) |
| **all** `destroyed` guards removed | `H-106 a send that fails after the dialog closed throws nothing` (NG0911 rejects the promise) |

The fail-after-close test is real. The **succeed-after-close** test also passes with every guard removed: success
after close throws nothing either way, so that test asserts no regression, not the guard. That's fine as a smoke test,
and not a failure.

### Screenshots (round 2)
`r2-error-1440-dark`, `r2-error-1440-light`, `r2-error-375-dark`, `r2-error-375-light` exist. I opened `r2-error-375-dark` and
`r2-error-1440-light`: the label and the outline are red (brief polish P1 is now done), the icon is on line 1, the text is
exact, and at 375 the field and Send link are full width.

### Notes (not failures)
1. `aria-invalid="false"` on a filled field without an error (see above). Decision 4 of the brief is out of date on this
   point. The ui-engineer or the brief owner could reword it so the brief matches the build.
2. The succeed-after-close test doesn't pin the guard (see the mutation table).
3. Earlier round notes 1, 2 and 4 still apply. Note 3's P1 is now built; P2 is still optional.
