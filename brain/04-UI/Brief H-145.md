---
title: Brief H-145 - Email link returns to the start page, "You're signed in." once
status: ready
board: H-145
source: "[[Accounts and Sync]] v0.10 SYNC-006 (Return, \"You're signed in.\"), SYNC-002, SYNC-005, SYNC-009; ACs 39, 52; Open question 9 (RJ confirmed 2026-11-24)"
date: 2026-11-24
---

# Brief H-145: the email link returns to the start page, and "You're signed in." shows once

**Problem.** `FirebaseAuthService.sendEmailLink` sends `url: ${location.origin}/` (`core/sync/adapters/firebase-adapters.ts`),
so every link lands on Home. After the sign-in, `history.replaceState(null, '', location.pathname)` drops the whole query,
including the user's own `?type=deck`, and it does that without the Router knowing. No sign-in shows a confirmation.
**RJ confirmed Open question 9 (2026-11-24):** app paths only, else `/`. The notice shows once after any sign-in the
user started (email link or Google), and never on a restore or a reload. The only new string is "You're signed in."
(SYNC-006, exact, with a straight apostrophe like the other `MESSAGES`).

## Decisions

### Return path
1. **What is captured:** `router.url` at the moment **Send link** or **Send again** is pressed, so the path plus the
   query, without the `#fragment`. The same rule applies to the header and to the SYNC-009 panel. Remove the five
   Firebase parameters first (`mode`, `oobCode`, `apiKey`, `lang`, `continueUrl`), in case the page still has them.
   The dialog is modal, so the page under it is the page the user started from. Why: `router.url` is the app's own
   view of "where I am", and it is always a relative app path.
2. **How it travels: the continue URL only.** `sendSignInLinkToEmail(..., { url: origin + returnPath, handleCodeInApp: true })`.
   Don't store the path next to the address. Why: the continue URL is the only thing that reaches another device
   (spec), and one source means the same device and another device behave the same. Pass the path into the adapter
   (for example `sendEmailLink(email, returnPath)` down through engine → service → dialog data). The dialog doesn't need
   to know the path: `SyncService` reads `router.url` when it calls the adapter.
3. **Validation, used on both sides** (one pure helper, for example `safeReturnPath(raw): string`, unit-tested):
   the result is `/` unless the input starts with exactly one `/` (it must not start with `//` or `/\`) and
   `new URL(raw, location.origin).origin === location.origin`. Then it drops the five Firebase parameters and any
   fragment. An unknown app path is allowed through, because the router's `**` → `''` already sends it home.
   Why: a tampered link must never take the user to another site, and an encoded `//evil.example` must not slip past.
4. **On return, never read the `continueUrl` query parameter.** The browser is already on the continue URL's path.
   The target is **the current location's own path and query**, with the Firebase parameters removed and run through
   `safeReturnPath`. Why: this covers AC 52's tampered link, and a `continueUrl=https://other.site` in the query can
   never be followed. If the check fails, the target is `/`.
5. **Unverified Firebase behaviour:** check on the Auth emulator what the landing URL looks like when the continue URL
   already has a query (`/import?type=deck`). Does Firebase append `&mode=…` or nest the query, and does `continueUrl`
   appear? Write the result in [[API Contracts]] (row requirement). Decision 4 works whichever way it turns out, as long
   as the stripping is done with parameter names (`URLSearchParams.delete`) and not by position.

### Stripping the link parameters
6. **Use the Router, not `history.replaceState`:** `router.navigateByUrl(target, { replaceUrl: true })`. Why: a raw
   `replaceState` leaves `ActivatedRoute.queryParams` and `router.url` stale (they keep `oobCode`). The Router
   replaces the history entry, so Back doesn't return to the link. A same-path navigation is already instant
   (`routeViewTransition` adds `vt-instant`), so nothing fades. Check that the page doesn't flash or rebuild.
   Import's `?type=deck` must still pick the deck option.
7. **When:** right after Firebase accepts the code, before the first-sign-in flow starts. Move it out of the adapter
   into `SyncService` (the adapter stays free of Angular), or have the adapter return and the service navigate.
   **On a failed link** (expired or already used), strip too, then show the SYNC-005 error. A reload would only fail
   again. **On a cancel** (Cancel, Escape or backdrop in the H-108 dialog, so no address), keep the URL as it is, so a
   reload offers the dialog again. Why: a cancel may be a slip, and a dead code is useless.

### "You're signed in."
8. **Kind: `success`** (6 s, polite, OK closes it). Why: it confirms something the user just did (the H-116 rule). It
   isn't an instruction, so it doesn't need to stay.
9. **Where it fires:** in the engine's `signIn()` after `this.auth!.signIn(...)` returns a uid, **before**
   `openSession(uid)`. That path is the only one user-started sign-ins use (the email-link completion and Continue with
   Google). The start-up restore (`start()` → `restore()` → `openSession`) never goes through it. Add
   `MESSAGES.signedIn: "You're signed in."`. Why "before": MatSnackBar shows one notice at a time, so a first-sign-in
   message (SYNC-048 / SYNC-097: half-deleted account, account deleted, session lost, first-sync failure) opened
   later **replaces** it, exactly as the spec allows. It never covers those messages.
10. **Never on a reload:** this follows from decisions 7 and 9. After success the URL no longer has `oobCode`, so a
    reload is a restore, and a restore never notifies. No "shown" flag is stored (nothing to write to the sync log).
    Tests: a restore notifies nothing, and a second `start()` with a clean URL notifies nothing.
11. **Order on screen:** the notice and the first-sync line ("Getting your collection and decks from your account…",
    SYNC-009) show together. That's fine: the notice says what happened, and the page says what's happening now.

### Focus
12. **Same device (fresh load, no dialog):** don't move focus. It stays at the start of the document, so the first
    Tab reaches Skip to content. The notice never takes focus, and its OK can be reached with Tab (H-116).
13. **Another device:** the H-108 confirm dialog runs first, unchanged. After it closes, `focusDocumentStart()`
    (existing), and then the notice shows. Cancel: no sign-in, no notice, the URL is kept (decision 7).
14. **Google (off at launch):** H-125 returns focus to the trigger. If the trigger is the panel's Sign in, the panel is
    replaced by the first-sync line, so the button is removed. Then use H-125's fallback: if focus is on `body` when
    the gated content changes, focus `#main`. Unit test only; you can't check it in the running app with the launch config.

## Out of scope
- The first tab's Sign in dialog stays in the sent state after the link signs the user in from another tab (cross-tab).
  Leave as is and note it for RJ.
- Opening a link while already signed in. Spec behaviour applies, and nothing new is designed here.

## Accept (ui-engineer, running app on the Auth emulator: 1440 and 375, dark and light, keyboard)
Use the recipe "Signed-in check with the Auth emulator" (`demo-rift-builder`, never the real project). This time, get the
link by pressing **Send link** in the app, not with curl, so the app sets the continue URL. Then read `oobLink` from the
emulator's `oobCodes` endpoint and open it.
- **AC 52 a:** signed out on `/import?type=deck`, then panel Sign in, then Send link, then open the link in the same
  profile. The final URL is exactly `/import?type=deck`, with none of the five parameters, and `router.url` matches.
  "You're signed in." shows once (polite live region, closes after about 6 s), then "Getting your collection and decks
  from your account…", then the deck import option, with no reload. Back doesn't return to a URL that has `oobCode`.
  Reload, and close and reopen the tab: no notice.
- **AC 52 b:** Send link from the header on `/`, then open the link in a second, isolated browser context (no stored
  address). The H-108 dialog appears, Finish takes the user to `/`, and the notice shows once. In a third context,
  Cancel: no notice, and the URL still holds the code.
- **Tampered:** in the link, change the path to `//example.org/` and add `&continueUrl=https://example.org/`. The sign-in
  completes on `/` at `localhost:4200`, and no request goes to `example.org`.
- **Expired or used code:** open the same link again after success. The SYNC-005 error (assertive, stays until OK) shows,
  the parameters are stripped, and there is no "You're signed in.".
- **Keyboard:** after the same-device return, the first Tab focuses Skip to content, and the notice's OK can be reached
  with Tab. At 375 the notice sits clear of the bottom tab bar and the OK target is ≥ 44 px. Measure the notice's
  contrast in both themes (≥ 4.5:1).
- **Console:** no errors besides expected emulator noise. API Contracts records the Firebase query result (decision 5).
- **Tests named by AC:** AC 39 (still passes, with the URL no longer holding `oobCode`), AC 52, and `safeReturnPath` cases:
  `/`, `/import?type=deck`, `//x.org`, `/\x.org`, `https://x.org/`, `''`, `/decks#a`, and a path that carries the five parameters.

Links: [[Brief H-140 H-125 H-108]], [[Brief H-113 H-116 H-123 H-126]], [[Brief H-144 H-114 H-115]], [[Accounts and Sync]], [[Design Direction]], [[UI Index]].

## Verdict (ui-engineer Playwright check, 2026-11-24, uncommitted build on `loop/H-145-email-link-return`)
**H-145 PASS.** Two findings outside the AC are listed below for RJ; neither blocks the merge. Setup: a development build
with the Auth and Firestore emulators (`demo-rift-builder`, JDK 21). Every link was sent with **Send link** in the
app, and its code was read from the emulator. "Another device" was a separate isolated browser context. Screenshots
`01`–`10` are in the notes folder `h145-screens`.

- **Continue URL:** the emulator's link carries `continueUrl=http://localhost:4200/import?type=deck` (and `/collection`, `/`).
  Its redirect lands on `/import?type=deck&mode=signIn&lang=en&oobCode=…&apiKey=…`, so Firebase appends its parameters
  after the query, which matches API Contracts.
- **Return to `/import?type=deck`** (1440 dark `01`, 375 dark `07`, 1440 light `09`): the address is already `/import?type=deck`
  with none of the five parameters at the first poll (≈120 ms). "You're signed in." opens. The page shows "Getting your
  collection and decks from your account…", then the Import deck dialog opens and the page drops `?type=deck`
  (Import behaved this way before H-145, as builder noted). Reload: no notice, still signed in.
- **Return to `/collection`** (1440 dark `02`, `03`): URL `/collection`. The first-sync line shows, then the empty state. The
  notice shows once and closes after about 6 s. Focus stays on `<body>`, and the first Tab reaches Skip to content.
  Back doesn't return to a URL that holds `oobCode`.
- **Other device** (375 light `04`, `05`): the H-108 dialog opens with focus in the field. Escape gives no sign-in, no
  notice, and the URL keeps the code. Reopening the link brings the dialog back, and Finish lands on `/` with
  "You're signed in." once. The notice sits above the tab bar (bottom 739, tab bar top 747). Reload: no notice.
- **Tampered:** `//example.org/?…&continueUrl=https%3A%2F%2Fexample.org%2F` completes the sign-in on `http://localhost:4200/`
  with the notice. No resource request to `example.org` is in the page's resource timing.
- **Used or expired code** (375 light `06`): the dialog, then "Sign-in didn't complete. Your data on this device is unchanged."
  (assertive). The URL is stripped to `/collection`, there's no "You're signed in.", and the user is still signed out.
- **Contrast of the notice:** light theme, label 11.56:1 and OK 7.68:1. Dark theme (pixel sample), label 10.15:1 and OK 4.97:1.
- **Console:** only the expected emulator 400s (a stale `accounts:lookup` from an earlier profile, and `signInWithEmailLink` for the used code).

**Findings for RJ (not blocking H-145)**
1. **The notice is hidden under the Import `?type=` dialog** (`08`, `10`). On `/import?type=deck` the deck dialog opens
   ≈60 ms after the notice, and its backdrop (and at 375 its surface) covers the notice for its whole 6 s life. Material
   stacks overlays in the order they open. The notice is still in a polite live region, and the header shows Account,
   but a sighted user never sees "You're signed in." on this path. Options: (A) accept, because the open dialog and the
   Account button already show the sign-in worked; (B) when a dialog opens while a success notice is showing, open the
   notice again once all dialogs close; (C) stack notices above dialog backdrops at ≥ 600 px only (at 375 it would cover
   the dialog's Continue). **Recommendation: A**, unless RJ wants the words seen on every path, then B.
2. **The notice's OK target is 40 px tall** (64 × 40 at 375, no Material touch target), which is below the project's 44 px rule.
   It affects every notice and came with H-116. It passes WCAG 2.2 AA 2.5.8 (24 px). Fix: give the snack-bar action
   `min-height: 44px`. Accept: at 375 the OK box is ≥ 44 px tall and the notice still clears the tab bar.

Not checked: reduced motion (H-145 adds no motion), Google (off at launch, unit tests only).
