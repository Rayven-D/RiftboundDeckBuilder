---
tags: [ui, review]
status: filed
date: 2026-11-25
board: H-189 (also covers H-191)
branch: loop/H-176-header-account (PR #35), reviewed in worktree claude/h189-review-0b21ca at 991a473
reviewer: ui-engineer
---
# Review H-189: H-176 header account control, username, theme, import FABs

Post-build review of H-176 against [[Brief H-175]] (RJ decisions win over its older sections) and
[[Accounts and Sync]] section N (SYNC-150…159, ACs 71–80). Also read: [[Validation H-176]].

**How:** `ng serve` (dev build), services API with the fixture catalog, Firebase Auth and Firestore emulators.
Two invented accounts: `h189-a@example.com` (new account, named through the prompt, then renamed) and
`h189-b@example.com` (new account, **Not now**). Sample collection from `/styleguide` "Load fixture sample"
(123 copies of 46 cards, 3 decks; written through the signed-in account). Playwright at 1440, 1024, 768 and 390
(plus 641 and 320 for name truncation), dark and light (emulated system setting and explicit choice), reduced
motion, offline (simulated with the `offline` event), and a keyboard pass. Measurements were taken with
`getBoundingClientRect` and computed styles. Contrast was computed from the computed colours (WCAG formula).

**Skills applied:** accessibility review (WCAG 2.1 AA: focus visible, names, target sizes, contrast), design critique,
design-system check (shared button variants), UX copy check against §11 and the spec strings.

**Out of scope (already on H-190 or decided):** menu `aria-disabled` vs native `disabled`; the rules `size()` unit;
AC 80 query string kept on `/import?…` → `/?…`; AC 74 line-feed wording; the Decks placeholder line (RJ: "N decks saved.").
**Deferred to H-180 (not a finding):** the **Privacy notice** menu item (SYNC-151 item 7) and footer link (SYNC-104 e)
are not built yet; `app.html` says so.

**H-191 is covered** by this review: 1024 and 768 (header edge, menu, FAB alignment and page-end clearance), reduced
motion (FAB collapse, chevron) and a full keyboard pass (header → menu → theme radios → Escape focus return; Account
Information Tab cycle and nested dialogs; FAB → dialog → Escape; footer theme radios). The keyboard pass found
finding 1.

## Checklist (Brief H-175 Accept 1–16, as amended by the RJ decisions)

PASS / FAIL per width. "–" = not applicable at that width; "n/t" = not tested (reason in Notes).

| # | Check | 1440 | 1024 | 768 | 390 | Notes |
|---|---|---|---|---|---|---|
| 1 | No `/import` route, no Import button or tab; 3 tabs at 390 | PASS | PASS | PASS | PASS | `/import?type=deck` lands on Home (query kept: H-190). Tab bar: Decks / Collection / Tournaments, 125 px each, 64 px tall. |
| 2 | Signed out: only **Sign in**; signed in: ghost button, initial + name + chevron, 44 px, right edge on content edge | PASS | PASS | PASS | PASS | Right edge 1272.5 = grid right 1272.5 (1440); 993 (1024); 737 (768); 359 (390). No fill, no border; name 16 px / 600. |
| 3 | 24-char name: full at 1440, ellipsis (no wrap, no scroll) at 641 / 390 / 320; full accessible name; menu shows full name | PASS | – | – | PASS | 641: 6 characters + ellipsis; 390: 146 px of name; 320: 76 px. No horizontal scroll at any width. Accessible name "Account: Abcdefghijklmnopqrstuvwx". *(Updated 2026-11-26 to SPEC-010 0.17.2, H-210: the limit is now 20 characters (SYNC-153), so the recheck uses a 20-character name; this row is the 24-character v0.14 build.)* |
| 4 | No username: "Account" + person icon | PASS | – | – | PASS | After **Not now**; accessible name "Account". |
| 5 | Menu order and dividers (SYNC-151 supersedes the brief's 2 dividers) | PASS | – | PASS | PASS | Name / Signed in as / status, divider, Sync now, divider, Account Information, Theme (System/Light/Dark radios), divider, Sign out: 3 dividers, no Delete, no Settings. Privacy notice item: H-180. Radio check alignment: finding 8. |
| 6 | (now Account Information dialog + Theme) Light on a dark system turns everything light at once; survives reload with no flash and sign-out; System follows the system live | PASS | PASS | PASS | PASS | Header, page, menus, dialogs and form fields switched; both `theme-color` metas become `#1b1f24` / `#f4f6f8`. Inline script in `index.html` sets `data-theme` before the app loads. After sign-out only `device-theme` was left in storage and the app stayed dark. |
| 7 | Username prompt once for a new account, not for a returning one; errors with icon + `aria-invalid`; Save updates the header without reload; focus returns | PASS | – | – | PASS | Field empty and focused, `nickname` / `words` / `spellcheck=false` / `enterkeyhint=done`; backdrop click does nothing; returning `h189-a` got no prompt. Error-state visuals: findings 5, 6, 7. |
| 8 | FAB: right edge on grid edge at 1440; ≥ 16 px above tab bar at 390; at the page end nothing under it; focused last-row tile visible | PASS | PASS | PASS | PASS | FAB right 1272.5 = grid right. 390: 16 px above the tab bar. Page end: no tile, theme switch or legal text under the FAB at any width. `scroll-padding-bottom` 92 px (measured, not keyboard-driven to the last tile). |
| 9 | FAB contrast ≥ 4.5:1 both themes; focus ring visible | PASS | PASS | PASS | PASS | Dark 5.81:1, light 5.47:1; ring 2 px `--color-focus`, 2 px outside. |
| 10 | Tab order on Collection: header → FAB → search → sort → grid | PASS | – | – | – | Skip link, wordmark, tabs, account control, Export CSV, **FAB**, ban notice Dismiss, search, sort, grid. Export CSV sits in the page header before the FAB, which is fine. |
| 11 | FAB dialog: focus inside, Escape returns to FAB; Undo snack bar above the FAB | PASS | – | – | PASS | Escape → focus on FAB with ring. Commit/Undo **n/t**: Continue still ends in the "Not saved yet" panel (commit isn't built yet, see Observations). Snack-above-FAB rule checked with "You're signed in." at 390: snack bar bottom 695, FAB top 707. |
| 12 | Phone FAB collapses on scroll down, expands on scroll up; reduced motion: no animation; same name | – | – | – | PASS | 234 → 56 px and back. Reduced motion: transitions 0.00001 s, chevron `none`. |
| 13 | FAB absent signed out / first sync / loading / unreadable / empty (empty state has its own button) | PASS | – | – | PASS | Signed out and empty: verified. First sync, loading, unreadable: **n/t** (the emulator's first sync finished before it could be observed). |
| 14 | Decks: **Import deck** (RJ decision 4: FAB like Collection), hidden on the empty state, opens the deck dialog | PASS | – | – | PASS | FAB with `upload` icon, same position and contrast. Empty state: its own **Import deck**, no FAB, but the secondary button is styled wrong: finding 3. "Saved deck stays on Decks": **n/t** (deck save is the same pending panel). |
| 15 | Home buttons open the right dialog on the right page; signed out → panel, dialog after sign-in | PASS | – | – | PASS | Home links to `/collection?add=1` and `/decks?import=1`. Signed out `/collection?add=1` showed the panel, kept `?add=1` in the link's continue URL, and after sign-in and first sync the dialog opened once and the address became `/collection`. |
| 16 | No console errors; reduced motion hides nothing; new hit targets ≥ 44 px | FAIL | FAIL | FAIL | FAIL | 0 errors, 0 warnings across the session. Targets: trigger 44, FAB 56, menu items 48, footer segments 44, dialog buttons 40 visible / 48 touch target. **FAIL is the keyboard focus on the footer theme switch: finding 1.** |

## ACs 71–80 (UI-observable parts)

| AC | Result | Notes |
|---|---|---|
| 71 Header control | PASS | Lost session and offline reload: n/t. |
| 72 Account menu | PASS (Privacy notice: H-180) | Choosing Dark by keyboard applied at once, closed the menu, focus returned to the trigger, footer showed Dark. |
| 73 Account Information | PASS, finding 4 | Change → Cancel/Save returns focus to Change; Delete → SYNC-095 dialog (sign-in-first state) → Escape returns to Delete; no username → "No username yet." + **Add username** (dialog titled "Add username"); offline → Delete `aria-disabled` + "You're offline.". |
| 74 Username rules | PASS (parts tested) | `  RJ   Smith  ` saved as "RJ Smith"; empty / three spaces → "Enter a username."; 25 letters → "Use 24 characters or fewer." (text kept); `👨‍👩‍👧 Squad` → `7 / 24`. Long emoji and control characters: not tested in the UI (unit tests). *(Updated 2026-11-26 to SPEC-010 0.17.2, H-210: rules now 1–20 code points, no emoji, letters / numbers / spaces / `. _ - ' ’` only; counter `n / 20`; errors "Use 20 characters or fewer." and "Use letters, numbers, spaces and . _ - ' only. No emoji." (SYNC-153). `👨‍👩‍👧 Squad` is now refused with the second error. This row is the v0.14 build.)* |
| 75 One-time prompt | PASS | Not now → "Account"; no prompt for the returning account. "Getting your account ready…": n/t (first sync too fast). |
| 76 Saving | PASS (UI parts) | Header and menu update without a reload; focus returns to the opener; "Username saved." lasted about 6.2 s (1153 → 7351 ms). |
| 77 Theme per device | PASS | Live system change, Dark on a light system, reload, `theme-color`. "System removes the key": n/t. |
| 78 Survives cache clears | PASS (sign-out) | Other events: n/t (unit tests). |
| 79 Theme controls | **FAIL** | Footer switch on Home, Collection and Decks, radio semantics, check mark, 44 px, arrow keys select. **Focus is not visible** (finding 1). Menu ↔ footer stay in step. |
| 80 `/import` gone, parameters | PASS, finding 2 | Query-string remainder: H-190. |

## Findings

1. **Blocker: the footer theme switch shows no keyboard focus (WCAG 2.4.7; AC 79 "keyboard operable"; checklist 16).**
   - **Repro:** any width, either theme, signed in or out. Tab from the last control on the page into the footer
     **Theme** group (or press Arrow Right inside it). The focused segment (`button.mat-button-toggle-button`,
     `:focus-visible` true) has `outline: none`. Material's `::before` focus indicator has a transparent 3 px border. The
     only change is a 12 % overlay on a segment that is already filled. Screenshots `h189-29` (focused) and `h189-30`
     (not focused) look the same.
   - **Expected:** the H-139 ring (2 px `--color-focus`) on every keyboard-focusable control.
   - **Fix (builder):** in `web/src/styles.scss`, next to the H-139 rules, add a selector of at least (0,3,0) such as
     `.mat-button-toggle-group .mat-button-toggle .mat-button-toggle-button:focus-visible { outline: 2px solid
     var(--color-focus); outline-offset: -2px; }`. Use an **inset** ring because the segments touch each other and the
     group border. Add it to the `forced-colors` block (`Highlight`) too. It also covers any later use of
     `mat-button-toggle`.
   - **Accept:** with Tab into the footer switch at 1440 and 390, dark and light, the screenshot shows a 2 px ring on
     the focused segment. Ring contrast is ≥ 3:1 against the segment fill in both themes (selected fill dark
     `#2d343c`, light `#e9edf1`).

2. **Should-fix: on Decks, `?import=1` loses focus to `<body>` when the dialog closes (WCAG 2.4.3; AC 80; brief F8 / D1 "focus returns to the button").**
   - **Repro:** signed in with at least one deck, any width. Open `/decks?import=1`. The "Import deck" dialog opens.
     Press Escape: `document.activeElement` is `BODY`. Collection's `/collection?add=1` correctly returns focus to the
     FAB.
   - **Cause (likely):** `decks-page.ts` `openImport()` passes `restoreFocus: this.fab()?.element() ?? true`, which is
     read when the dialog opens. On a parameter launch the FAB isn't rendered yet, so `true` restores focus to the
     element that had it before, which is `<body>`.
   - **Fix:** choose the target when the dialog closes, not when it opens. Use `restoreFocus: false`, then in
     `afterClosed()` (after the next render) focus the FAB's element, or the empty state's **Import deck** if that is
     what shows, or else `#main` through the existing `refocusAfterDialog` fallback. Give Collection the same guard.
   - **Accept:** `/decks?import=1` then Escape puts focus on **Import deck** (FAB) with a visible ring, at 1440 and 390.
     With no decks, focus goes to the empty state's **Import deck**.

3. **Should-fix: on the Decks empty state, "Tournaments" looks exactly like "Import deck" (two filled accent buttons). Spec: OWN-008 says "a filled button Import deck and a link to Tournaments"; brief D2 asks for one main action.**
   - **Repro:** signed in, no decks (`h189-b`), `/decks`, any width (`h189-36`, 390 dark).
   - **Cause:** `decks-page.ts` uses `class="button button--outlined"`, but `.button--outlined` is defined only in
     `pages/collection/collection-page.scss` (component-scoped), so on Decks the modifier has no effect.
   - **Fix (design system):** move the `.button--outlined` variant into the global `web/src/styles.scss` next to
     `.button`, so it is one shared variant, and delete the copy in `collection-page.scss`. Check the `/styleguide`
     buttons preview lists it.
   - **Accept:** at 390 and 1440, dark and light, **Import deck** is accent-filled and **Tournaments** is outlined
     (`--color-border-strong` edge, no fill, 44 px). Collection's Export CSV / Reload look unchanged.

4. **Should-fix: offline, the reason isn't tied to the `aria-disabled` buttons (WCAG 1.3.1 / 4.1.2; SYNC-152 "aria-disabled with 'You're offline.' under it", SYNC-155).**
   - **Repro:** signed in, Account Information open, go offline. **Delete account and data** has
     `aria-disabled="true"`, but its `aria-describedby` points only to "Deletes your account…", so "You're offline." is
     not read with it. In Change / Add username offline, **Save** is `aria-disabled` with no `aria-describedby` at all.
     A screen reader announces "dimmed" or "unavailable" with no reason.
   - **Fix:** while offline, add the id of the "You're offline." line to each button's `aria-describedby` (Delete:
     description id + offline id; Save: offline id).
   - **Accept:** offline, the accessibility snapshot shows Delete described as "Deletes your account … You're offline."
     and Save described as "You're offline.".

5. **Nit: the username field does not look invalid (brief U5; SYNC-153 errors).**
   - **Repro:** any width. Change username, clear the field, press Enter. "Enter a username." shows with its icon and
     `aria-invalid="true"`, but the field outline stays accent (`rgb(0,107,95)` light), and the form field has no
     `mat-form-field-invalid` class (`h189-18`).
   - **Cause:** the `[errorStateMatcher]` never runs, because `MatInput` updates its error state only when it has an
     `NgControl`, and this input has none.
   - **Fix:** after setting the error, set the `MatInput` instance's `errorState = true` and call `stateChanges.next()`
     (clear both on input). Or bind the field to a `FormControl`.
   - **Accept:** with an error, the outline and label are `--color-danger` in both themes. They go back to normal on
     the next keystroke.

6. **Nit: pressing Enter with an invalid value shows the error silently for screen readers.**
   - **Repro:** focus in the Username field, press Enter on an empty field. The error appears and is linked by
     `aria-describedby`, but focus doesn't move (it is already in the field) and there is no live region, so nothing is
     announced. Clicking **Save** works, because focus moves back to the field and the description is read.
   - **Fix:** when the error is set while focus is already in the field, announce it once through `LiveAnnouncer`
     (polite). Or blur the field and focus it again in the next frame, as the sign-in dialog does for its failure line.
     The same gap probably affects the sign-in dialog's Enter path, so check it there too.
   - **Accept:** NVDA/VoiceOver (or an `aria-live` check in a unit test) reads "Enter a username." after Enter.

7. **Nit: the username input's `aria-describedby` lists the counter twice** (`"username-error-1 username-count-1 username-count-1"`).
   - **Repro:** any width, any username dialog, after an error.
   - **Fix:** set the counter id in one place only: either the manual `aria-describedby` or Material's
     hint / `userAriaDescribedBy`, not both.
   - **Accept:** each id appears once.

8. **Nit: in the menu's Theme group, the check mark and the selected label are out of line.**
   - **Repro:** 1440, 768 and 390, either theme, open the account menu (`h189-05`, `h189-22`, `h189-26`). The selected
     row's text box is 25 px tall against 20 px on the other rows, so its label sits about 3 px lower. The check glyph
     sits about 5 px above the label's centre.
   - **Fix:** give the `.check` span `display: inline-flex; align-items: center; height: 20px` (the label line height).
     Keep an empty slot of the same size on unselected rows (`visibility: hidden`), so all three labels share one
     baseline and x-position.
   - **Accept:** in a 768 screenshot, System / Light / Dark have equal row rhythm (48 px) and the check is vertically
     centred on its label.

9. **Nit (for RJ / builder): at 390 the "You're signed in." notice is hidden under the "Add to your collection" dialog when `?add=1` opens it after sign-in.**
   - **Repro:** signed out, 390, `/collection?add=1`, sign in by email link. The notice is announced, but the dialog
     covers the snack bar (`h189-32`).
   - **Suggestion:** none needed for screen readers. If RJ wants sighted users to see it, open the parameter dialog
     only after the success notice closes (6 s is too long). The simpler option is to accept this.

## Re-check round 1 (de84200)

2026-11-25. Same setup, after builder's commit `de84200` (hot-reloaded). Accounts `h189-a` (3 decks, sample
collection, 24-character name) and `h189-b` (no decks, no username). Screenshots are `h189-r1-*.png` in the same
scratchpad folder. Console: 0 errors, 0 warnings.

| # | Result | Evidence |
|---|---|---|
| 1 Footer theme focus | **PASS** | Tab into the group: the focused segment shows a 2 px inset ring (`outline-offset: -2px`). Dark: `#2dd4bf` on fill `#2d343c`, about 7:1. Light: `#0f766e` on `#e9edf1`, 4.65:1. Forced colors (emulated): ring uses the system Highlight colour (`rgb(26,235,255)`). `h189-r1-01`, `-02`, `-03`. |
| 2 Focus after `?import=1` / `?add=1` | **PASS** | `/decks?import=1` then Escape: focus on the **Import deck** FAB with its ring (`h189-r1-04`). With no decks, focus goes to the empty state's **Import deck**. `/collection?add=1` then Escape still puts focus on the FAB. The FAB's own open and close still returns focus to the FAB. |
| 3 Tournaments outlined | **PASS** | Empty Decks: **Import deck** has the accent fill. **Tournaments** has no fill, a 1 px `rgb(114,125,137)` border and 44 px height (`h189-r1-10`). Collection's Export CSV is still outlined (variant now global). |
| 4 Offline reason linked | **PASS** | Offline: Delete is described by "Deletes your account… / You're offline." and Save by "You're offline.". Back online, the offline id is dropped and `aria-disabled` cleared. |
| 5 Field looks invalid | **PASS** (see N2) | On an error the form field gets `mat-form-field-invalid`; outline and label turn red in light (`h189-r1-06`) and dark (`h189-r1-09`). |
| 6 Announce after Enter | **PASS** (see N1) | Enter on an empty field with focus already in it: the CDK live announcer (polite) received "Enter a username.". |
| 7 Ids once | **PASS** | `aria-describedby="username-error-1 username-count-1"`. |
| 8 Menu check alignment | **PASS** | At 1440, 768 and 390, every Theme row is 48 px. Label text sits 14 px from the row top at x 1069 / 533 / 155 on all three rows. Check glyph centre 24 px against label centre 23.5 px (`h189-r1-05`, `-07`, `-08`). |
| Decks count line | **PASS** | "3 decks saved." (count only). |
| Regression: header and menu at 1440 and 390 | **PASS** (see N3) | Trigger 44 px, right edge on the content edge (1272.5 / 359). Name truncates at 390 and 768 with the full accessible name. Menu order unchanged with 3 dividers. Choosing Dark from the menu applies at once. Tab bar: 3 tabs. No horizontal scroll at 390. |

**New defects (all nits; none caused by de84200):**

- **N1 (nit, Material default): every keystroke reads out the `n / 20` counter (was `n / 24`; updated 2026-11-26 to SPEC-010 0.17.2, H-210).**
  - **Repro:** any width, any username dialog, type in the field.
  - **Cause:** the counter is a `mat-hint`, which Material renders inside its form-field subscript wrapper. That
    wrapper is `aria-live="polite" aria-atomic="true"`, so screen readers announce "1 / 20", "2 / 20" and so on, and
    the same region also announces the error.
  - **Fix:** move the counter out of `mat-hint` into a plain element below the field that is not inside the live
    region. Keep it in the input's `aria-describedby` so it is read on focus. Optionally announce once, through the
    `LiveAnnouncer`, when the 20-character limit is crossed.
  - **Accept:** typing 5 characters adds nothing to any `aria-live` region. The error still goes through the
    announcer.
- **N2 (nit, tokens): the field outline uses Material's error colour, not `--color-danger`.**
  - **Repro:** username error. Outline and label are `#ba1a1a` (light) and `#ffb4ab` (dark). The error line and its
    icon are `--color-danger` (`#a32d2d` / `#f09595`), so there are two different reds in one field.
  - **Fix:** in the Material theme overrides in `styles.scss`, map the form-field error tokens (outline, label,
    caret, hover) to `var(--color-danger)`.
  - **Accept:** outline, label and message are the same red in both themes. Contrast against the dialog surface is
    ≥ 3:1 for the outline and ≥ 4.5:1 for the text.
- **N3 (nit, existed before this commit, also in `h189-05`): at 1440 the account menu can sit 15 px left of the trigger.**
  - **Repro:** 1440, signed in, Decks (`h189-r1-11`), open the account menu. The menu's right edge is at 1257.5 while
    the trigger's is at 1272.5; the gap equals the scrollbar width. It doesn't happen every time (Home and some
    reloads line up).
  - **Likely cause:** `html { scrollbar-gutter: stable }` together with the CDK popover overlay, which is positioned
    in the top layer against the viewport.
  - **Fix:** check the overlay's bounding box against `document.documentElement.clientWidth`, then align the menu to
    the trigger's right edge, for example by adding a negative-offset `overlayPanelClass` only when a gutter is
    reserved, or by fixing the CDK viewport ruler setting. Keep `xPosition="before"`.
  - **Accept:** at 1440 on Home, Collection and Decks, the menu's right edge is within 1 px of the trigger's.

**Round 1 verdict:** findings 1–8 and the Decks line pass. There are no blockers or should-fix items left from this
review, only nits N1–N3 (plus finding 9, RJ's call).

## Re-check round 2 (098df32)

2026-11-25. Same setup after builder's commit `098df32` (hot-reloaded). I used account `h189-b`; I gave it the
username "Bee Tester" during the check. Screenshots are `h189-r2-*.png` in the scratchpad h189 folder. Console:
0 errors, 0 warnings.

| Nit | Result | Evidence |
|---|---|---|
| N3 Menu edge | **PASS** | Gap between the menu's right edge and the trigger's right edge, in px: 0 at 1440 on Decks (`h189-r2-01`), Home and Collection. With the menu open, resizing 1440 → 1100 → 1440 keeps the gap at 0 (1069, then 1272.5). With the menu open, resizing 1440 → 390 also keeps it at 0 (menu 114–359, trigger right 359, no horizontal scroll; `h189-r2-02`). |
| N2 One red | **PASS** | On error the outline, floating label, caret, error text and icon all use `--color-danger`. Light: `#a32d2d` on white, 7.07:1. Dark: `#f09595` on `#2d343c`, 5.66:1. The field returns to the accent outline and `aria-invalid="false"` on the next valid input. `h189-r2-04` (1440 dark), `h189-r2-05` (390 light). |
| N1 Counter not live | **PASS** | The counter is now a `<p id="username-count-n">` outside the Material subscript, not inside any `aria-live` region. It is still in the input's `aria-describedby` (`username-error-n username-count-n` on error, `username-count-n` otherwise). Typing 5 characters added nothing to any live region; the errors still go through the announcer ("Enter a username.", "Use 24 characters or fewer." (now "Use 20 characters or fewer.", SYNC-153; updated 2026-11-26 to SPEC-010 0.17.2, H-210)). **Layout:** right-aligned, 12 px, 4 px below the field, inset to match the field's text like Material's hint. Contrast: 4.93:1 dark, 6.4:1 light. It looks right at 1440 (`h189-r2-03`) and 390 (`h189-r2-05`). |
| Regression: username dialog | **PASS** | Add username: errors, then a valid save. The dialog closes, the row and the header ("Account: Bee Tester") update without a reload, focus returns to **Change username**, and "Username saved." is announced. |
| Regression: menu | **PASS** | 390 light (`h189-r2-06`): name, Signed in as, status, divider, Sync now, divider, Account Information, Theme group, divider, Sign out. Theme rows are 48 px each; the menu edge is level with the trigger; keyboard open focuses Sync now. |

**New defects:** none.

**Final verdict (round 2; replaced by round 3 below):** **H-189 PASS.** All findings 1–8 and nits N1–N3 are fixed and verified on screen. Finding 9 is
left to RJ: the "You're signed in." notice is hidden under the `?add=1` dialog at 390, and my suggestion is to accept
it. The items deferred to H-180 (the Privacy notice) and H-190 are tracked elsewhere. **H-191 PASS:** the 1024 / 768,
reduced motion and keyboard coverage from the first pass still holds, and the keyboard focus fix (finding 1) is
verified in light, dark and forced colors.

## Re-check round 3 (7af77d1)

2026-11-25. RJ decided finding 9: notices must show above an open dialog. Builder's commit `7af77d1` adds
`core/notice-layer.ts`: when a dialog opens, each open notice is shown again, which moves it to the top of the
top layer.

Setup: servers restarted with empty emulators. I cleared the old session (local storage except `device-theme`, and
the Firebase IndexedDB) and used a new account `h189-c` (username "Cee Tester", later "Cee Two"). Light theme. Some
checks used a test notice opened through the dev-mode `ng.getComponent(...).sync.notify()`. With no kind, that notice
stays open until OK, which gave time for the keyboard checks. Screenshots are `h189-r3-*.png` in the scratchpad h189
folder. Console: 0 errors and 0 warnings after the reset. Before the reset there were 400 errors from the stale
token of the old emulator; those are expected.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | 390, signed out, `/collection?add=1`, email-link sign-in: "You're signed in." above the dialog; focus and Tab stay in the dialog | **PASS** | Timeline after the link opened: notice at 0 ms, dialog at 61 ms, focus in the dialog's textarea at 216 ms. From 270 ms the hit-test at the notice's centre lands on the notice, so it is on top. It closed normally at about 6.2 s while focus stayed in the textarea. The same raise also lifts "Username saved." above the `?add=1` dialog that opens after the first-sign-in prompt (`h189-r3-02`), and the test notice (`h189-r3-05`). With the notice showing, Tab ×5 and Shift+Tab ×2 stayed inside the dialog (textarea → Upload file → Cancel → Continue → wraps). |
| 2 | Re-show replays the 150 ms entrance? Reduced motion? | **PASS** | In Chromium no entrance replays. The re-show fires a popover `toggle open`, but no `animationstart`, and opacity and transform stay at 1 / identity in every frame for 900 ms. Hiding and showing in the same task means no frame passes in between, so the notice simply moves on top with no flicker, which is acceptable. Under emulated reduced motion it is the same: no animation, animation duration 0.00001 s, notice on top. Other engines (Safari, Firefox) were not tested; if one does replay it, 150 ms is acceptable. |
| 3 | OK while a dialog is open dismisses only the notice | **PASS**, nit N4 | Clicking OK closed the notice; the dialog stayed open. **N4 below:** focus fell to `<body>`, and the next Tab went back into the dialog (to Continue). |
| 4 | "Username saved." and other notices as before, also at 1440 | **PASS** | 1440: Account Information → Change → Save. "Username saved." appears at 602 ms and is on top (`h189-r3-06`). It closes at 6855 ms (about 6.25 s). Focus returns to **Change username** and the header updates. At 390 the notice still sits above the tab bar. |
| 5 | Not announced twice | **PASS** | A MutationObserver on the notice's polite live region (text, children and attributes) recorded **no** change during the re-show; the text stayed the same. The CDK live announcer stayed empty. The live region was only filled once, when the notice opened. |

**New defect:**

- **N4 (nit): clicking a notice's OK while a dialog is open drops focus to `<body>`.**
  - **Repro:** any width. With a dialog open and a notice above it, click or tap the notice's **OK**. The notice
    closes and `document.activeElement` is `BODY`. The next Tab goes back into the dialog, so the focus trap holds.
  - **Expected:** focus goes back to where it was in the dialog (WCAG 2.4.3). This matters for screen-reader users on
    touch, who activate OK by double-tap.
  - **Fix:** in `NoticeLayer`, when a notice that is above an open dialog is dismissed by its action
    (`afterDismissed`, `dismissedByAction`), focus the top dialog's last focused element if one was recorded,
    otherwise its first tabbable element. Use the CDK `FocusTrap` / `FocusMonitor`, or keep the element that had focus
    before the pointer went down on the notice.
  - **Accept:** with the dialog open, click OK; `document.activeElement` is inside the dialog (the field it held
    before).
- **Observation (no change asked):** while a dialog is open, a notice that stays until OK (info or error) can't be
  reached with the keyboard, because the dialog traps focus. It stays on screen and can be dismissed once the dialog
  closes. This is acceptable, since notices are non-modal by design (H-116).

**Final verdict (updated):** **H-189 PASS.** Findings 1–9 (finding 9 per RJ) and nits N1–N3 are fixed and verified
on screen. N4 is an optional nit and does not block. **H-191 PASS.**

## Observations (not H-176 findings)
- **Import commit isn't built:** pressing Continue in "Add to your collection" (or "Import deck") shows the
  "Collection list ready: 1 card / Not saved yet. Matching names to cards and saving come once card data is
  connected." panel (`h189-11`). Card data **is** connected in this build, so the line no longer explains why
  nothing is saved. This dates from H-024 and is unchanged in meaning. Because of it, checklist 11 (Undo above the FAB
  after a commit) and 14 ("saved deck stays on Decks") could not be checked. Suggest that spec-writer or RJ reword the
  interim line ("Saving imports comes in a later update.") or track the commit build.
- **Short pages:** on Decks with a few decks, the FAB reserve leaves a blank band of about 90 px under the footer
  (`h189-12`). This is intended by F4, but worth a look once the deck list (H-060) fills the page.

## Not tested
Lost session (AC 27 path), offline reload, the first-sync and loading states, the unreadable banner, "System removes the
key", account deletion, a different account taking over a cache, the "Getting your account ready…" line, drag-and-drop
(F9), Windows high contrast.

## Screenshots
All in `C:\Users\Rayven\AppData\Local\Temp\claude\f651a1a103025ca5\75ebaf74-2a32-4a1f-82eb-71700754cd0d\scratchpad\h189\`
(not in the repo): `h189-01-home-out-1440-dark.png`, `h189-02-home-footer-1440-dark.png`,
`h189-03-username-prompt-1440-dark.png`, `h189-04-username-empty-error-1440-dark.png`, `h189-05-menu-1440-dark.png`,
`h189-06-menu-1440-light-system.png`, `h189-07-collection-fab-1440-dark.png`, `h189-08-collection-end-1440-dark.png`,
`h189-09-add-dialog-1440-dark.png`, `h189-10-fab-focus-1440-dark.png`, `h189-11-after-continue-1440-dark.png`,
`h189-12-decks-1440-dark.png`, `h189-13-account-info-1440-dark.png`, `h189-14-username-saved-1440-dark.png`,
`h189-15-delete-signin-first-1440-dark.png`, `h189-16-account-info-offline-1440-dark.png`, `h189-17-menu-1440-light.png`,
`h189-18-change-error-1440-light.png`, `h189-19-collection-1024-light.png`, `h189-20-collection-end-1024-light.png`,
`h189-21-collection-end-768-light.png`, `h189-22-menu-768-light.png`, `h189-23-collection-390-light.png`,
`h189-24-fab-collapsed-390-light.png`, `h189-25-collection-end-390-light.png`, `h189-26-menu-390-light.png`,
`h189-27-account-info-390-light.png`, `h189-28-account-info-kbd-390-light.png`, `h189-29-footer-toggle-focus-390-dark.png`,
`h189-30-footer-toggle-nofocus-390-dark.png`, `h189-31-footer-toggle-tabfocus-390-dark.png`,
`h189-32-add-after-signin-390-dark.png`, `h189-33-header-641-dark.png`, `h189-34-header-320-dark.png`,
`h189-35-no-username-390-dark.png`, `h189-36-decks-empty-390-dark.png`, `h189-37-account-info-no-username-390-dark.png`,
`h189-38-snack-over-fab-390-dark.png`.
