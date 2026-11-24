---
tags: [loop, validation]
item: H-140, H-125, H-108
date: 2026-11-24
round: 1
result: PASS
---
# Validation H-140 / H-125 / H-108: sign-in sent state, focus restore, other-device confirm

Items: [[Handoff Board]] H-140 (sent state, carries H-107), H-125 (UI review #22), H-108 (UI review #7).
Spec: [[Accounts and Sync]] v0.10 SYNC-005, SYNC-006 ("Sent state", link opened on another device); ACs 1 (sent line), 39, 50, 51.
Design: [[Brief H-140 H-125 H-108]] (decisions 1-14, plus the ui-engineer's "Check (Playwright)" with its re-check of three fixes: all pass).
Scope: uncommitted tree on `loop/H-140-signin-sent-state` (base 84e6e0d): `sync-dialogs.ts` (sent state in `SignInDialog`,
new `ConfirmEmailDialog`, `SENT_TAIL`, `SPAM_HINT`, `CONFIRM_EMAIL_TEXT`), `sync.service.ts` (`openSignIn(trigger?)`,
`refocusAfterDialog`, `confirmEmail()`, `focusDocumentStart`, no `prompt()`), `account-menu.ts`, `sign-in-panel.ts`,
`sign-in-gate.ts` (trigger passed through); new `sign-in-sent-state.spec.ts` (9 tests), new `sign-in-focus-confirm.spec.ts`
(16 tests), `sign-in-dialog-layout.spec.ts` (+5), `sign-in-dialog.spec.ts` and `gated-pages.spec.ts` (each closes the dialog
before teardown; one H-106 assertion now checks the AC 51 line); [[UI Index]] row, [[API Contracts]] note, [[Session Log]] entries.

## Result
2026-11-24 · H-140 · PASS · Accept (AC 51 + AC 1 sent line as named tests; old string grep), V-008, mutation · failures: none
2026-11-24 · H-125 · PASS · Accept (focus to trigger after failure and sent paths, header and panel, + body fallback), V-008, mutation · failures: none
2026-11-24 · H-108 · PASS · Accept (no `window.prompt` / `prompt(` in `web/src`; Finish and Cancel tests), AC 39, V-008, mutation · failures: none

New board item: **H-146** (spec-writer, P3, spec gap, not a build failure): see "Points judged".

## Checks run
### V-008 (web), rerun by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | bundle generated (exit 0) |
| `npm test` | 42 files, **593 passed** (563 after H-104 round 2 + 30 new: 9 + 16 + 5) (exit 0) |
| `npm run test:rules` | 4 files, **34 passed** (the first run failed with "firebase-tools no longer supports Java version before 21"; passed with the JDK 21 bin prepended to PATH) |

The five affected spec files run on their own (75 tests) print no NG0205 / NG0911 or other errors.

### H-140 Accept: AC 51 and AC 1's sent line
- `AC 51 / AC 1 / H-140 a successful Send link of " rj@example.com " …`: the form and input are gone; the sent line is exactly
  "We sent a sign-in link to rj@example.com. Open it on this device to finish signing in." with the address in `<strong>`,
  `role="status"`, `tabindex="-1"`; then `.note` "Didn't get it? Check your spam folder."; then `.sent-actions` with text
  buttons `['Send again','Use a different email']` (not filled, not in `mat-dialog-actions`); the action row is `['Close']`;
  the request went to `rj@example.com`; stored address `rj@example.com`.
- `AC 51 / H-140 Send again …`: a second request to the same address straight away; `Sending…`, both buttons
  `aria-disabled="true"`, focus stays, presses while pending send nothing and leave the sent state; on success the same
  `role="status"` node reads "We sent a new sign-in link to rj@example.com. …".
- `AC 51 / H-140 a failed Send again …`: the line keeps its text, the exact `SEND_LINK_FAILED` with the error icon under the
  actions inside `role="status"`, `aria-describedby` resolves to it, focus on Send again; pressing again clears it.
- `AC 51 / H-140 Use a different email …`: form with `rj@example.com`, focus in the field, Send link enabled, stored address
  unchanged; then `rj2@example.com` is stored only after the send resolves, and the line names it (plain, not "new").
- `AC 51 / H-140 closing after the first send and opening again shows the email form` and
  `AC 39 / AC 51 on the device that sent the link the stored address signs in with no question`.
- Also: focus moves to the sent line after Send link; the empty failure region exists before a failure; Use a different
  email clears a failure; a Send again that settles after close throws nothing.
- AC 1's sent line: covered by the `AC 51 / AC 1` test above (the chunk-load half of AC 1 is earlier, already validated work).
- AC 50's last clause now checks the AC 51 line (`sign-in-dialog.spec.ts`): passes.
- **No "Check your email for a sign-in link." in `web/src`:** `grep -rn` finds nothing; the source guard test
  `H-140: the pre-H-140 sent line is gone from web/src` scans every `.ts` / `.html` under `web/src`.
- Phone layout source tests (`H-140:` ×3 in `sign-in-dialog-layout.spec.ts`) pass. The H-124 `.email` rules are asserted unchanged.
- Browser evidence: the ui-engineer's Check (Playwright) in [[Brief H-140 H-125 H-108]] (1440 / 375, dark / light, contrast,
  no scrollbar, rings). The validator did not re-drive the browser.

### H-125 Accept: focus returns to the trigger after the failure and sent paths
Real `MatDialog` and focus in jsdom (`sign-in-focus-confirm.spec.ts`):
- header, mouse-opened (`click()` doesn't focus, as in Safari): failed Send link, Escape → header Sign in.
- header: sent state, Close → header Sign in.
- panel (`/import` gate): failed Send link, Escape → panel Sign in.
- panel: Send again succeeded, Escape → panel Sign in.
- trigger removed while open → `#main`; `refocusAfterDialog` unit tests: body → trigger, a focused real element is never moved, no trigger → `#main`.
- `gated-pages.spec.ts` and `sign-in-dialog.spec.ts` also assert focus back on the panel / header Sign in after Close.

### H-108 Accept: no native prompt; Finish and Cancel
- `grep -rnE "window\.prompt|\bprompt\s*\("` over `web/src`: no matches. Source guard `H-108: no native browser prompt call is left in web/src` passes.
- `AC 39 / H-108 with no stored address …`: title, the exact SYNC-006 question, "Email address" field (`type="email"`,
  `autocomplete="email"`), focus in it, buttons `['Cancel','Finish sign-in']`, one filled, Finish disabled empty, panel width `28rem`.
- **Finish:** `H-108 Finish: Finish sign-in signs in with the trimmed address` → `engine.signIn('email-link','rj@example.com')` once, no snack bar.
  `H-108 Enter submits; without an @ it does nothing`.
- **Cancel:** `AC 39 / H-108 Cancel: no sign-in and no message` (no `signIn`, no snack bar, focus at the document start,
  temporary `tabindex` removed on blur). `AC 39 / H-108 Escape: …` likewise. `focusDocumentStart` has 2 unit tests.

### Test quality (mutation check)
Run in a scratch copy of `web/` (node_modules by junction, font `@use` dropped from the copy only); the worktree was not
touched. Specs: `sign-in-sent-state`, `sign-in-focus-confirm`, `sign-in-dialog`, `gated-pages` (64 tests; unmutated 64/64).

| Mutation | Caught |
|---|---|
| no `resent.set(true)` on Send again success | 4 tests |
| Use a different email: no `disabledInteractive` / not disabled while sending | 1 / 1 |
| no focus to the sent line after Send link | 2 |
| Use a different email doesn't focus the field | 1 |
| no `aria-describedby` on Send again | 1 |
| a failed Send again leaves the sent state | 2 |
| Send again sends to a different address | 2 |
| no `refocusAfterDialog` after close | 1 |
| panel / header pass no trigger | 3 / 2 |
| service treats `''` as an address (`email === null`) | 2 |
| confirm: Finish without the '@' check | 1 |
| no `focusDocumentStart` after the confirm | 1 |
| no `width: '28rem'` | 1 |
| Use a different email doesn't reset `resent` | **survived**: `send()` resets it as well (overlapping guards) |
| `restoreFocus: true` instead of the trigger | **survived**: the `refocusAfterDialog` fallback puts focus back anyway (overlapping) |
| no `.trim()` in `SignInDialog` / `ConfirmEmailDialog` `onEmail` | **survived**: see note 1 |

13 of 16 caught. The three survivors are overlapping code paths, not missing behaviour, so the tests aren't hollow.

### Regressions (earlier work intact)
- `web/src/styles.scss`: no diff since 84e6e0d.
- **H-139** `focus-ring.spec.ts`, **H-101** `snackbar-offset.spec.ts`, **H-102** `danger-button.spec.ts`: pass in the 593.
- **H-104 / H-106 / H-124:** all `sign-in-dialog.spec.ts` tests and the 5 earlier `sign-in-dialog-layout.spec.ts` tests pass.
  The two edited tests only add a Close before teardown plus a focus check, and swap the old sent-line assertion for the
  exact AC 51 line, which makes them stronger. The ui-engineer's re-check reports the 375 Send link ring as unchanged.

### Other checks
- **V-009:** [[Brief H-140 H-125 H-108]] links [[Accounts and Sync]], [[Brief H-104 H-106 H-124]], [[Brief H-139]],
  [[Design Direction]], [[UI Index]], [[UI Review 2026-11-24]]: all resolve. The [[UI Index]] row, the [[API Contracts]] note and the [[Session Log]] entries exist.
- **V-011:** no `firebase` import in the five changed sync files.
- **V-012:** `git grep RGAPI-` outside `brain/` and in `web/dist`: no matches.
- V-010: not in scope.

## Points judged
1. **"Disabled" during Send again (SYNC-006) built as `aria-disabled` (`disabledInteractive`).** Not a build failure. The
   button is announced as disabled, presses do nothing (tested: no second request, and the sent state stays when Use a
   different email is pressed), and focus doesn't drop to `<body>`. That is the point of H-125 and of the H-106
   precedent, which the validator accepted for Send link against the same word in AC 50. It is a small spec gap,
   though: SYNC-006 and AC 50/51 say only "disabled", which could be read as the native attribute. → **H-146 (1)**.
2. **H-108 title "Finish signing in" is not in the spec.** SYNC-006 gives only the question. The title, the "Email
   address" label and the **Cancel** / **Finish sign-in** labels came from the board row and the brief (decision 12, which
   calls the title a new string). That's a spec gap, not a build failure: the spec's one exact string is shown exactly,
   and the no-address = cancel behaviour matches. → **H-146 (2)**: record the strings in SYNC-006 / AC 39, or choose other
   wording. Wording is RJ's call.

## Notes (not failures)
1. **Trim is untestable in jsdom (and redundant in browsers):** for `type="email"`, the HTML value sanitization strips
   leading and trailing whitespace from `input.value` (checked: jsdom returns `"rj@example.com"` for `" rj@example.com "`).
   The `.trim()` calls never change the value, so the AC 51 "trimmed" assertion holds because of the input type. The
   Playwright check saw the same result in a real browser. Keep `.trim()` as a belt-and-braces measure; it would matter if
   the type changed.
2. The no-scrollbar, contrast and ring checks at 375 / 1440 are browser-only evidence (the ui-engineer's Check and its
   re-check, with screenshots in side-session notes `h140-screens/`). The validator didn't re-drive the browser.
3. `npm run test:rules` needed the JDK 21 bin prepended to PATH in this shell again (the "Java 21 on PATH" memory doesn't
   hold for this shell).
