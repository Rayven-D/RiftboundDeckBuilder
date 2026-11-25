---
title: Brief H-143 H-122 - Delete dialog sign-in-first state, sign-out dialog explanation and "Syncing…"
status: ready
board: H-143, H-122
source: "[[UI Review 2026-11-24]] findings #10, #19; [[Accounts and Sync]] v0.10 SYNC-084, SYNC-090, SYNC-095, SYNC-096 step 1, ACs 38, 55, 56, Open question 6"
date: 2026-11-24
---

# Brief H-143 / H-122: say "sign in again first" before the user types `delete`, and keep the sign-out dialog explaining itself while it syncs

**Problem.** The delete dialog (`DeleteAccountDialog`, `web/src/app/core/sync/sync-dialogs.ts`) always asks for
`delete`, and only after confirming says a fresh sign-in is needed, in an 8 s snack bar (#10). The sign-out dialog
(`SignOutDialog`) swaps the explanation out for the warning, and Sync now gives no sign it's running (#19).
All strings are SYNC-090 / SYNC-095 / SYNC-096 text, written exactly. **No new strings.**

## H-143: delete dialog, sign-in-first state

1. **State is decided once, at open.** `openDelete()` reads `needsRecentSignIn() && !canReauthenticate()` and
   passes it in the dialog data (for example `{ signInFirst: boolean }`). The dialog doesn't switch state while
   open (SYNC-095: if the 5 minutes run out in the type-to-confirm state, the step 1 check on confirm still applies,
   as built).
2. **Layout, top to bottom:** title "Delete your Rift Builder account?" (unchanged) / the SYNC-095 paragraph
   (unchanged) / the step 1 sentence as its own `<p>`: "To delete your account, sign out, sign in again, then choose
   Delete account and data within 5 minutes." / actions. No field, no Delete account button.
3. **The step 1 sentence is plain body text.** Use the same colour and size as the paragraph above (`--color-text`),
   no icon, no box, no `.note`, no bold. Why: it's the instruction the user has to follow, so muting it would make it
   look less important than the warning. Nothing is wrong yet, so it isn't an error. The default paragraph margin
   separates it from the paragraph above.
4. **No `role` or `aria-live` on it.** It's there from the moment the dialog opens, so there's nothing to announce
   as a change. A `role="alert"` would read it twice. Give it an id (from a counter, like `errorId`) and set
   `aria-describedby` on the **Sign out** button to that id, so a screen-reader user who tabs to Sign out hears why.
5. **Buttons: `Cancel` (text) then `Sign out` (`matButton="filled"`, no `.danger` class)**, `align="end"`, the same
   order as every other dialog (Cancel first in the DOM, primary last on the right). Why not danger: signing out
   deletes nothing from the account, and the danger fill stays reserved for Delete account (H-102).
6. **Initial focus.** In both states use `autoFocus: 'first-tabbable'`. In the type-to-confirm state that's the
   "Type delete to confirm" field (as today). In the sign-in-first state it's **Cancel**. Why: it matches the
   sign-out dialog (Cancel comes first there too), and Sign out leads to a step that clears this device, so it
   shouldn't be the Enter default.
7. **Hand-off.** Sign out closes the delete dialog with a distinct result (for example `'sign-out'`). Then
   `openDelete()` calls the same `openSignOut()` the menu uses, so the unsynced warning, offline rules and
   Sync now all come along (AC 55: "1 change hasn't synced yet…"). The second dialog opens only after
   `afterClosed()`, so the two never stack. Nothing is deleted on this path.
8. **Focus return: the Account menu trigger, for both dialogs and for the hand-off.** Pass the trigger element
   explicitly (`restoreFocus: trigger`, plus the guarded "body → trigger.focus()" fallback from
   [[Brief H-140 H-125 H-108]] decision 11). The menu item that opened the dialog is gone by then. On the hand-off,
   the delete dialog gives focus back to the trigger, the sign-out dialog then opens from it, and when that one
   closes (Cancel / Escape) focus goes back to the trigger again. After a real sign-out the button becomes "Sign in",
   and the same fallback applies.
9. **Phone (375).** Two buttons fit on one row (about 70 + 90px, well under the roughly 295px content width). No
   stacking.
10. **Offline while open (non-binding).** The spec sets no offline rule for this state. Leave Sign out enabled.
    The SYNC-090 dialog then shows its own offline state (Sign out disabled, "You're offline."). Disabling it here
    instead would need a spec-writer row.

```
 1440 (dialog ~560px)                                   375
 Delete your Rift Builder account?                      Delete your Rift Builder
                                                        account?
 This deletes your account and the collection, tags,    This deletes your account …
 decks and locks saved in it, … This can't be undone.   … This can't be undone.

 To delete your account, sign out, sign in again,       To delete your account, sign
 then choose Delete account and data within 5 minutes.  out, sign in again, then …

                                [Cancel] [ Sign out ]                [Cancel] [ Sign out ]
                                  text     filled                      text     filled
```

## H-122: sign-out dialog, explanation under the warning, "Syncing…"

11. **One explanation `<p>`, always rendered.** Render the warning `<p>` above it only `@if (warning())`. Don't
    swap between the two in an `@if/@else`. The explanation gets the muted style (`--color-text-muted`, the dialog's
    `.note`) **only while the warning shows** (`[class.note]="!!warning()"`), and the normal text colour in the plain
    question state. Why: the explanation stays in the same element, so when the warning goes away it just becomes the
    main line without being redrawn or re-read. The title stays "Sign out?".
12. **Announce only the warning.** Keep `role="alert"` on the warning `<p>` only. The explanation has no role and no
    live region, so it isn't read as an alert. When a failed sync changes the count, the alert's text changes and it
    is read once with the new count.
13. **Spacing.** The warning gets `margin-bottom: var(--space-2)` (8px) so the two lines read as one pair. The
    explanation keeps its default bottom margin before "You're offline." or the actions. Size: both lines use the
    dialog body size. Muted is the only difference.
14. **"Syncing…".** While `syncing()` is true the filled button's label is `Syncing…` (the single `…` character,
    as in SYNC-084), and `Sync now` otherwise. Give the button a `min-width` equal to the wider of the two labels,
    rounded up (around `7rem` as a starting value; measure it), so it doesn't change width and the row doesn't
    shift. Same pattern as `.send` in the sign-in dialog (H-106).
15. **Disabled while it runs.** Sync now and Sign out anyway are disabled. **Cancel stays enabled** (it closes the
    dialog, and the sync carries on). Put `disabledInteractive` on **Sync now** (recommended): it has focus when it
    disables, and a plainly disabled button would drop focus to `body`. Because `disabledInteractive` still sends
    clicks, add a guard at the top of `syncNow()` (`if (this.disabled()) return;`), as `send()` does. Leave Sign out
    anyway plainly `[disabled]`. It doesn't have focus at that moment, and with `disabledInteractive` its
    `[mat-dialog-close]` would still close the dialog on click.
16. **After the sync.** If items are still pending, the warning stays with the new count, the explanation stays
    under it, the label goes back to "Sync now", and focus stays on it. If nothing is pending, the dialog shows the
    plain question with Cancel and Sign out. Sync now has left the DOM, so move focus to **Sign out** with
    `afterNextRender` (the user's next step). Otherwise it drops to `body`.
17. **Phone (375), three actions.** "Cancel", "Sign out anyway" and "Sync now" don't fit on one row (about 330px
    for roughly 295px). Material would wrap them unevenly. Below `40rem` (the H-124 breakpoint), and **only in the
    warning state**, stack the actions in a column, full width (`flex-direction: column; align-items: stretch;
    gap: var(--space-2)`). Reset Material's `margin-inline-start` between dialog buttons. Keep the DOM order: Cancel
    on top, Sign out anyway, then Sync now at the bottom (closest to the thumb, last as on desktop). Tab order then
    matches what the user sees, so don't use `column-reverse`. The plain two-button state stays a row.

```
 1440, warning, while syncing                           375, warning
 Sign out?                                              Sign out?
 2 changes haven't synced yet. They'll be lost if       2 changes haven't synced yet.
 you sign out now.                       (alert)        They'll be lost if you sign out now.
 Your collection and decks stay in your account and     Your collection and decks stay …
 are removed from this device. Sign in again …  (muted) … Sign in again to get them back.
                                                        [          Cancel          ]
          [Cancel] (Sign out anyway) [ Syncing… ]       (      Sign out anyway     )
           enabled     disabled      disabled,focus     [         Sync now         ]
```

**Out of scope:** dialog copy, the engine's sync notices, the header status. **Must keep:** H-139 focus ring (the
actions keep enough padding that the ring isn't clipped, including the stacked column), H-102 danger fill on Delete
account in the type-to-confirm state, the sign-in dialog (H-104…H-108, H-140, H-124), the account menu (H-141, H-142,
H-110), and the SYNC-090 offline behaviour (all but Cancel disabled, "You're offline." above the buttons).

## Accept (ui-engineer Playwright pass, 1440 and 375, dark and light)
Reach the states through the fakes or the dev hooks from [[Validation H-102]] (the sign-in age, pending count, a
slow or rejected push). Never do a real deletion.
- **AC 55.** Signed in 20 min ago by email link: title, the paragraph, the step 1 sentence in body colour (not
  muted, no icon), no field, no Delete account button, Cancel (text) + Sign out (filled, not danger: computed
  background ≠ `--color-danger`). Focus starts on Cancel. Sign out's `aria-describedby` resolves to the sentence.
  No delete request is made. Sign out closes it and opens "Sign out?" with "1 change hasn't synced yet…". Cancel
  there: focus on the Account trigger, nothing cleared.
- **AC 38.** Signed in 1 min ago (or a Google identity with Google on): type-to-confirm state, focus in the field,
  danger Delete account disabled until `delete`.
- **AC 56.** 2 pending: warning (`role="alert"`) and directly under it the explanation, muted (`#9aa3ad` dark /
  `#56606b` light, at least 4.5:1), no role. Sync now with a slow push: the label reads "Syncing…", the width is the
  same as "Sync now" (±1px), Sync now and Sign out anyway are disabled, Cancel is enabled, and focus is still on the
  button (not `body`). Rejected push: the warning is still there with its count, the explanation is under it, the
  label is back to "Sync now". Push succeeds: plain question in body colour, focus on Sign out.
- **375.** Warning state: three full-width stacked buttons in DOM order, no horizontal scroll, focus rings
  unclipped. Plain and sign-in-first states: one row.
- Escape and the backdrop close both dialogs with focus on the Account trigger. Console clean. The AC 38, 55 and 56
  tests pass by name.

Links: [[Brief H-102]], [[Brief H-139]], [[Brief H-104 H-106 H-124]], [[Brief H-140 H-125 H-108]],
[[Brief H-141 H-142 H-110]], [[UI Review 2026-11-24]], [[Accounts and Sync]], [[Design Direction]], [[UI Index]].

## Build check (ui-engineer, 2026-11-24)

**Result: PASS (re-checked 2026-11-24 after the fix; the first check was FAIL with one small must-fix, kept below for the record).**

How I checked it: a real email-link sign-in on the Auth and Firestore emulators at 1440 and 375, dark and light, using only the keyboard for Tab, Escape and focus return. I made the pending changes by editing two card counts while the browser was set to offline, then blocked or delayed the Firestore Write channel in the page so the push was slow or failed. Nothing was deleted and nobody was signed out. The AC 38, 55 and 56 tests pass (`delete-sign-out-dialogs.spec.ts` + `account-menu.spec.ts`, 49/49). Screenshots `01`–`17` are in the side-session notes `h143-screens/`.

**Must-fix**
1. **The gap between the warning and the explanation is 14px, not 8px (decision 13).** `.warning { margin-bottom: var(--space-2) }` (`web/src/app/core/sync/sync-dialogs.ts:438`) collapses into the explanation's default 1em `margin-top` (14px), so the visible gap is 14px. That's the same gap as between two separate paragraphs, so the two lines don't read as one pair. Fix: also set `margin-top: 0` on the explanation when it follows the warning (for example `.warning + .explanation { margin-top: 0 }`). Check: in the warning state, `getComputedStyle(.explanation).marginTop` is `0px` and the gap from the bottom of the warning line box to the top of the explanation is 8px, at 1440 and at 375.

**Verified OK**
- H-143 type-to-confirm (signed in under 5 minutes): unchanged. Focus is in the field and Delete account is disabled until you type `delete`, then it shows the danger fill (`02`, `03`).
- H-143 sign-in-first (signed in over 5 minutes): title, paragraph, then the step 1 sentence as plain body text (same colour, size and weight as the paragraph, no role or live region, id `delete-step1-N`). No field and no Delete account. Cancel is a text button and Sign out is filled teal (not `--color-danger`), and `aria-describedby` points at the sentence. Focus starts on Cancel and the two buttons fit on one row at 375 (`13`, `14`, `15`). Tab stays inside the dialog (Cancel ↔ Sign out).
- Hand-off: Sign out closes the delete dialog, then "Sign out?" opens with "2 changes haven't synced yet…" and focus on Cancel. Only one dialog is open at a time. Cancel puts focus back on the Account trigger (focus ring shows) and nothing is cleared, so 2 changes are still pending.
- H-122 warning state: `role="alert"` is on the warning only, and the explanation below it is muted with no role. Muted text contrast is 6.48:1 in dark (`#9aa3ad`) and 5.91:1 in light (`#56606b`) (`05`, `08`, `12`).
- "Syncing…" works by mouse and by keyboard. Sync now / Syncing… stays 120px wide (no shift). Sync now is `aria-disabled` and keeps focus, Sign out anyway is `disabled`, and Cancel stays enabled and works mid-sync (Shift+Tab skips the disabled button) (`06`, `10`, `16`).
- After the sync: when the push succeeds you get the plain question in body colour with focus on Sign out (`07`). When the push fails or stalls, the warning and its count stay, the explanation stays under it, the label goes back to "Sync now" and focus stays on it.
- 375: the warning state stacks full width in DOM order (Cancel, Sign out anyway, Sync now) with an 8px gap, no horizontal scroll and the H-139 ring not clipped (`11`, `12`). The plain and sign-in-first states stay one row (`13`, `17`).
- Escape, the backdrop and Cancel return focus to the Account trigger for both dialogs. The account menu (H-141 identity line, status with count, dividers, the offline line, everything disabled offline) still looks right (`01`, `04`).
- Console: no errors from these dialogs. The only error is a ViewTransition abort caused by my fast route clicks. The Firestore transport warnings were caused by my own network patch.

**Not blocking (for later):** in light mode the dialog body text is Material's `#3c4947`, not `--color-text` `#1a1f24`, so the warning (8.67:1) and the muted explanation (5.91:1) look quite alike. This applies to every dialog and was already the case before this build. It could be its own `builder` item if RJ wants a stronger contrast between the two lines.

**Re-check after the builder fix (2026-11-24): PASS.**
- Must-fix 1 is fixed. In the warning state the explanation's `margin-top` is `0px` and the gap from the warning is 8px at both 1440 and 375, with no horizontal scroll (`18`, `19`).
- Clean Sync now, done by keyboard at 375: the label read "Syncing…" with focus on the button. When the sync stalled, the warning and its count stayed, the label went back to "Sync now" and focus stayed on it. On a second Sync now the push went through: pending dropped to 0, the dialog showed the plain question, and focus moved to Sign out with the focus ring showing (`20`).
- Not checked in the browser: the new "focus stays on Cancel" rule and the #main fallback after a real sign-out. I didn't do a real sign-out. Both rely on the builder's unit tests.
