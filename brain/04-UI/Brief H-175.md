---
title: Brief H-175 - Header account control, Account settings, username, "Add to your collection" FAB, "Import deck"
status: rj-approved (H-178, with changes)
board: H-175 (feeds spec H-174, build H-176)
source: "[[ADR-0006 Two Imports - Collection and Decks]] \"Header and import entry points\" (RJ 2026-11-24, accepted); [[ADR-0007 Firebase Accounts and Firestore]] amendment 2 (account-only); [[Accounts and Sync]] v0.12 SYNC-003, SYNC-009, SYNC-090, SYNC-095, SYNC-100, SYNC-142; [[Collection Import]] IMP-072…076; [[Deck Import]] DECK-001, DECK-097; [[My Collection]] COLL-093"
date: 2026-11-24
---

# Brief H-175: the account moves into the header, imports move onto their pages

**Status: RJ answered the gate (H-178, 2026-11-24): see "RJ decisions" below, which win over §2, §3 and §7.** After RJ answers, spec-writer folds the agreed
behaviour and copy into the specs (H-174), then builder builds it (H-176). Where today's specs still say `/import`
or "Import", this brief follows the ADR.

**What RJ decided (not up for debate here):** the header's Import button becomes the account (username top right);
username is a display name, not unique, chosen when the account is made, editable in settings; account settings hold
Change username, Theme (light / dark / system, per device, system when nothing is saved), Delete account and data,
and Sign out; collection import is **"Add to your collection"**, a FAB at the bottom right of Collection; deck import
stays **"Import deck"** on Decks; both are dialogs; `/import` is removed with no redirect.

> **Superseded (2026-11-25):** the theme "light / dark / system" below (here and in point 5, with the footer switch and the menu Theme item) is superseded by [[Accounts and Sync]] decision 22 (SYNC-157, SYNC-158) and the ADR-0006 amendment of 2026-11-25: light / dark only, one header toggle, the OS used only until the user picks.

**What I looked at (2026-11-24, dev server, signed out, Playwright):** `/collection` at 1440 light
(`.playwright-mcp/h175-collection-1440-dark.png`, the browser defaulted to light), 1024 light
(`h175-collection-1024-light.png`), 768 dark (`h175-collection-768-dark.png`) and 390 dark
(`h175-collection-390-dark.png`). No console errors. The signed-in header, menu and the filled Collection grid
could not be opened without the Auth emulator; those parts are designed from the code (`app.html`, `app.scss`,
`core/sync/account-menu.ts`, `pages/collection/collection-page.html`, `pages/decks/decks-page.ts`,
`shared/import/import-dialog.ts`, `styles.scss`). Measured at 1024: wordmark 16–137, tabs 161–445, Sign in 756–850,
Import 875–994; the footer notice spans 181–828 (so a bottom-right FAB would cover it at the page end, see F6).

**Skills used:** `design:ux-copy` (every string below: verb-first actions, what + why + fix errors, the same term for
the same thing), with the accessibility-review, design-system and handoff criteria applied by hand (no Figma; no
connectors used).

---

## RJ decisions (2026-11-24, gate H-178), these win over the sections above
1. **Username:** ~~1–24 characters, any script and emoji (an emoji counts as 1)~~ **1–20 characters, no emoji**
   (RJ 2026-11-25, H-206, and the allowed set confirmed in H-212: letters and numbers of any script, spaces and
   `.` `_` `-` `'` `’`; see U3), no line breaks, not unique; the prompt after a new account's first sign-in is
   **skippable** ("Not now"). As recommended (§5). *(Updated 2026-11-26 to SPEC-010 0.17.2, H-210.)*
2. **No `/account` page. Settings live in the header menu** (replaces §3 and changes §2). RJ: settings go "inside
   the menu. but have 'Account Information' as a menu item for username changing and deleting account". The menu:
   username / "Signed in as {email}" / sync status, then **Account Information** (opens a **dialog** with the
   username and Change, and a separated red "Delete account and data"), **Theme** (System / Light / Dark, in the
   menu), then **Sign out**. The Account Information dialog replaces the `/account` page in the gate list (no new
   route).
3. **"Add to your collection" FAB:** collapses to a + icon on phones while scrolling down, label back on scroll up;
   **hidden on the empty collection** (the empty state has its own button). As recommended (§6, F3).
4. **"Import deck" behaves exactly like the collection button** (replaces §7): a FAB at the bottom right of Decks,
   same form, position, page-end spacing, collapse on scroll and hidden on the empty state (with its own button).
5. **Theme while signed out: yes, a footer switch** (light / dark / system) for everyone, plus the Theme item in the
   signed-in menu; both set the same per-device value (§4).
6. **`/import` goes to Home** like every other unknown path (no not-found page). As recommended (§9).
7. **Copy in §11 approved**, including "New here? Signing in with your email creates your account.", with the
   changes above (Account Information label and dialog, Import deck FAB, footer theme switch need strings: H-174
   writes them in the same style).

## 1. Header account control

### Layout per breakpoint
```
≥ 40rem   [Rift Builder]  Decks  Collection  Tournaments ................ [(R) RJ Smith ▾]
< 40rem   [Rift Builder] ........................................... [(R) RJ Smith ▾]
          (tabs live in the bottom bar)
signed out, any width: ................................................ [ Sign in ]
```
- The account control takes the place of **both** today's Sign in / Account button and the Import button. Nothing
  else sits at the right. Its right edge stays on the content edge (same `--content-gutter` rule as today).
- **H1. Anatomy (signed in):** one `<button>` (the `mat-menu` trigger), 44px tall, `--radius-md`, padding
  `0 var(--space-2) 0 var(--space-1)`: a **28px round initial** + the **username** + an `expand_more` chevron (new
  icon, 20px). Gap `--space-2`.
  - Style: **ghost**, like the nav tabs: no fill, no border; hover and open state `--color-surface-raised`; text
    `--color-text`, `--font-size-md`, weight 600. Why: it is navigation-like chrome, not the page's main action (the
    main action is now on each page), and a filled or outlined pill would compete with the FAB.
  - The initial: first grapheme of the username, upper-cased where the script has case (use `Intl.Segmenter`, so an
    accented letter stays whole; new names cannot hold emoji, but a name saved before v0.15 may still start with one
    and must stay whole too; updated 2026-11-26 to SPEC-010 0.17.2, H-210), on `--color-accent` with `--color-accent-contrast` text (5.81:1 dark,
    5.47:1 light), `--font-size-sm`, weight 700, `aria-hidden`. It keeps one touch of the accent in the header now that
    the filled Import button is gone.
  - Chevron turns 180° while the menu is open (`--dur-fast`, `--ease-out`; under reduced motion it just swaps, no
    turn).
- **H2. Truncation.** The name is one line, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
  The button is `flex: 0 1 auto; min-width: 0; max-width: 14rem`; the wordmark and the tab list are `flex: none`. So
  the name gives way first: at 1440 / 1024 / 768 a 20-character name (the longest allowed; was 24, updated
  2026-11-26 to SPEC-010 0.17.2, H-210) shows in full or nearly; at 641px (just above
  the phone breakpoint) about 140px is left for the whole control (measured), so the name cuts to about 9
  characters; at 390 it has up to about 14rem. The initial and the chevron never shrink. The **full** name is always
  in the accessible name (H4) and at the top of the menu (M1), so a cut name is never the only place it appears. No
  `title` tooltip (it does nothing on touch and repeats the menu).
- **H3. No username yet** (an account made before this feature, or the user chose **Not now** in U1): the label reads
  **Account** and the circle shows a `person` icon (new icon) instead of an initial.
- **H4. Accessible name:** `aria-label="Account: {username}"` (or "Account" when there is none). It contains the
  visible text (WCAG 2.5.3) and the full untruncated name. `aria-haspopup="menu"` and `aria-expanded` come from the
  Material trigger.
- **H5. Signed out, or session lost (SYNC-086):** the outlined **Sign in** button exactly as built today (44px,
  `--color-border-strong` edge, H-123), opening the sign-in dialog. One label for new and returning users: with email
  link, signing in creates the account, and the dialog says so (S1).
- **H6. While the first sync runs** (signed in, gate not open yet) the control already shows the name: the user is
  signed in.
- **H7. Loading:** the control is deferred today (`@defer (on immediate)`). Reserve its slot so the header does not
  jump: until the session state is known, render nothing at the right (as now); there is no Import button left to
  shift.

### Copy
| Where | String |
|---|---|
| Signed-out button | **Sign in** (unchanged) |
| Signed-in button | `{username}`, or **Account** with no username |
| Its accessible name | "Account: `{username}`" / "Account" |

## 2. Account menu

```
┌────────────────────────────────┐
│ RJ Smith                       │  username, --color-text, weight 600, wraps
│ Signed in as rj@example.com    │  existing identity line (muted + address)
│ Synced just now                │  existing status line (role=status)
│ You're offline.                │  only offline
├────────────────────────────────┤
│ Sync now                       │  or Try deleting again / Cancel deletion (SYNC-096, unchanged)
├────────────────────────────────┤
│ ⚙ Account settings             │  → /account
│   Sign out                     │
└────────────────────────────────┘
```
- **M1. Username line** first, above "Signed in as …": full name, wraps (`overflow-wrap: anywhere`), plain text, not an
  item. It joins the menu's `aria-describedby` (`usernameId identityId statusId`). Left out when there is no username.
- **M2. Account settings** is a menu item that navigates to `/account` (an `<a mat-menu-item routerLink>`), with a
  `settings` icon (new icon). It stays enabled offline: the page itself handles offline per action.
- **M3. Sign out** keeps its SYNC-090 dialog unchanged and stays in the menu (it is the most-used account action).
  It now shares a group with Account settings.
- **M4. Delete account and data leaves the menu** and lives on the Account settings page (A5). SYNC-003 already says it
  moves "when Settings is built". This removes the danger item and its divider from a menu people open often.
- **M5. Dividers:** exactly 2 (after the text group, after the Sync group). The H-110 rule "never first or last"
  still holds.
- Offline: Sync now and Sign out disabled as today; Account settings enabled.

## 3. Account settings page (`/account`, recommended; see open choice 2)

Gated like Collection (SYNC-009: signed out or session lost shows the sign-in panel under the page header). Not in
the tab bar or the top tabs; reached from the account menu. Page title "Account settings · Rift Builder".

```
Account settings                                    (h1)
Your username, theme and account.                   (page-lede)

┌ Username ──────────────────────────────────────┐  h2 per section, sections are
│ RJ Smith                          [ Change ]    │  surface cards, --radius-lg,
│ Shown at the top right. Only you can see it.    │  1px --color-border, padding
└─────────────────────────────────────────────────┘  --space-5, gap --space-4
┌ Theme ─────────────────────────────────────────┐
│ [✓ System | Light | Dark ]                      │
│ Saved on this device. System follows your       │
│ device's setting.                               │
└─────────────────────────────────────────────────┘
┌ Sign out ──────────────────────────────────────┐
│ Signed in as rj@example.com                     │
│ [ Sign out ]                                    │
└─────────────────────────────────────────────────┘
┌ Delete account ────────────────────────────────┐
│ Deletes your account and everything saved in    │
│ it, on every device. This can't be undone.      │
│ [ Delete account and data ]  (danger fill)      │
└─────────────────────────────────────────────────┘
```
- **Width:** the sections column is `max-width: 40rem`, left-aligned on the content edge (forms don't stretch to
  72rem). Same at 1440 / 1024 / 768; at 390 the cards are full width with `--space-4` padding.
- **A1. Username row:** the name in `--color-text` (wraps), **Change** as a text button at the right (stacks under the
  name below 40rem). Its accessible name "Change username" (contains the visible "Change"). Opens the username dialog
  (U2). No username: the row reads "No username yet." (muted) and the button **Add username**.
- **A2. Theme:** a three-option single-select segmented control, **System / Light / Dark**, built on
  `mat-button-toggle-group` (radio semantics, M3 check mark on the selected option, so selection is never colour
  alone), group labelled by the "Theme" h2. 44px tall; at 390 it spans the card width in three equal parts. Applies
  at once; no notice, no Save. Selected = `--color-surface-raised` fill + check icon + `--color-text`; focus ring per
  H-139. Icons optional; if used: `contrast` (System), `light_mode`, `dark_mode`.
- **A3. Sign out:** the identity line (same text as the menu) and an outlined **Sign out** that opens the SYNC-090
  dialog. Offline: disabled (`disabledInteractive`) with "You're offline." under it.
- **A4. Delete account:** heading, one line, and the filled danger button (H-102 style) opening the SYNC-095 dialog
  unchanged (including its sign-in-first state). Offline: disabled with "You're offline.". Focus returns to this
  button when the dialog closes (or to `#main` after a real deletion, as built).
- **A5. Order** is fixed: Username, Theme, Sign out, Delete account. Danger last.
- During an unfinished deletion (SYNC-096) the page shows the same error status line as the menu above the Delete
  section; Try deleting again stays in the menu (no second copy here).

## 4. Theme (per device)

- **T1. Values:** `system` (default, also when nothing is saved), `light`, `dark`. Saved in browser storage under its
  own key (for example `rift.theme`). **It must survive sign-out, account deletion and a different account
  signing in**: SYNC-142 clears "every local store", so H-174 must name this key as a device setting outside the
  cache. It is never synced (ADR).
- **T2. How it applies (guidance for builder):** set `html[data-theme='light'|'dark']` for an explicit choice and no
  attribute for system. The light token block in `styles.scss` today sits only in
  `@media (prefers-color-scheme: light)`; it needs to apply for `html[data-theme='light']` and for
  `@media (prefers-color-scheme: light) { html:not([data-theme='dark']) }` (a mixin used twice), and the dark tokens
  must win under `html[data-theme='dark']` on a light system. Set `color-scheme: light` / `dark` on `html` for an
  explicit choice so Material's `light-dark()` tokens and native controls follow. The `html[data-accent='green']`
  preview's light block needs the same treatment. Update the two `theme-color` meta tags to the chosen bg
  (`#1b1f24` / `#f4f6f8`) when the choice is explicit.
- **T3. No flash:** the saved value must be on `<html>` before first paint: a few lines of inline script in
  `index.html` reading the key (there is no CSP today; if one is added it needs this script's hash). Reading it in
  `main.ts` is too late (the body paints first).
- **T4. Switching** is instant, with no cross-fade and no transition on every element.

## 5. Choosing a username

- **U1. When:** once, right after the **first sign-in that creates the account** (SYNC-048 case (a): no account
  document existed). A returning user on a new device is never asked. Accounts made before this feature get no
  prompt; they see **Account** (H3) and can add a name in settings (A1).
- **Dialog "Choose a username"** (shared component with U2), shown over the page the sign-in returned to, after
  "You're signed in." It opens even while the first sync is still running.
  ```
  Choose a username
  It's shown at the top right of every page. Only you can see it,
  and you can change it any time in Account Information.
  ┌ Username ───────────────────────┐
  │                                 │   7 / 20
  └─────────────────────────────────┘
                         [ Not now ]  [ Save ]
  ```
  *(Updated 2026-11-26 to SPEC-010 0.17.2, H-210: counter `n / 20`; the text says "Account Information" as in
  SYNC-154.)*
  - Field focused on open, empty (no guess from the email: the address is private and its local part is often not
    what people want shown). `autocomplete="nickname"`, `autocapitalize="words"`, `spellcheck="false"`,
    `enterkeyhint="done"`; Enter saves.
  - **Not now** (text button) and Escape close it with no name (H3). Backdrop click does nothing (avoids losing it by a
    stray tap). The dialog is never shown again on its own.
  - **Save** (filled) stays enabled; pressing it with an invalid value shows the error (no silent disabled button).
- **U2. "Change username"** is the same dialog opened from A1: title **Change username**, no explanatory line beyond
  "Only you can see it.", the current name filled and selected, buttons **Cancel** / **Save**. Saving the same
  value just closes.
- **U3. Rules (decided; updated 2026-11-26 to SPEC-010 0.17.2 SYNC-153 and SYNC-160, H-210; was 1–24 graphemes
  with emoji):** NFC-normalized; trimmed; inner runs of spaces collapsed to one; **1–20 characters**, a character
  being one Unicode code point of the normalized name (a separate combining mark counts as 1); **allowed:** letters
  and numbers of any script (with the combining marks those scripts need), spaces, and `.` `_` `-` `'` `’`, the first
  character a letter or digit; **no emoji**, symbols, other punctuation, line breaks, tabs or control characters. Not
  unique (RJ). The counter shows `n / 20` (the count after normalizing, so a trailing space does not count) and turns
  to the error colour with an icon above 20; going over does not cut pasted text (no `maxlength`), it shows the
  error. The Firestore rules check the same set and the 20 again when the name changes (SYNC-160), so the client
  check is for the message, not the only guard. A name saved before v0.15 (emoji, over 20) keeps showing until it is
  changed.
- **U4. After Save:** the dialog closes, the header and menu update at once, focus returns to the opener (the Change
  button; after U1, to the header account control), success notice "Username saved." (SYNC-087 success kind: 6 s,
  polite).
- **U5. Errors (inline under the field, icon + `--color-danger`, `aria-invalid`, `aria-describedby`, focus stays in
  the field; as the sign-in send-failure line, H-106):**
  - empty: "Enter a username."
  - too long: "Use 20 characters or fewer."
  - not allowed (any character outside the U3 set, emoji included; checked after the length): "Use letters,
    numbers, spaces and . _ - ' only. No emoji."
  - both can apply: the length error shows first.
  - *(Updated 2026-11-26 to SPEC-010 0.17.2 SYNC-153, H-210; strings copied exactly from the spec.)*
  - save failed: "Couldn't save your username. Check your connection and try again."
  - offline: Save `aria-disabled` and "You're offline." above the buttons (SYNC-081 pattern).
- **U6. Where it is stored (for spec-writer, H-174):** the ADR says "stored with the account", but SYNC-012 allows no
  name in `users/{uid}` and SYNC-100 keeps the display name in Firebase Auth. **Recommendation: the Firebase Auth
  profile `displayName`.** It is with the account, follows the user to every device, costs no Firestore write and
  needs no rules change. Another device sees a change after its next token refresh or reload, which is fine for a
  name only its owner sees. Never copied into Firestore, logs or analytics.

## 6. "Add to your collection" FAB (Collection)

```
1440 / 1024 / 768                                 390
┌──────────────────────────────────────┐        ┌─────────────────────┐
│ Collection          [Export CSV]     │        │ Collection      [⤓] │
│ 1,204 copies of 412 cards            │        │ 1,204 copies of 412 │
│ [search…………………]       Sort [Set ▾]  │        │ [search………]   [⇅]   │
│ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢                      │        │ ▢ ▢ ▢               │
│ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢                      │        │ ▢ ▢ ▢               │
│ ▢ ▢ ▢ ▢ ▢ ▢   ┌────────────────────┐ │        │ ▢ ▢ ▢  ┌─────────┐  │
│               │ + Add to your coll…│ │        │        │ + Add … │  │  (collapses to [+]
│               └────────────────────┘ │        │        └─────────┘  │   while scrolling down)
└──────────────────────────────────────┘        │ Decks Coll. Tourn.  │
                                                └─────────────────────┘
```
- **F1. Form:** an **extended FAB**: `add` icon (new icon, 24px) + the label **Add to your collection**, 56px tall,
  padding `0 var(--space-5) 0 var(--space-4)`, gap `--space-2`, `--radius-lg` (8px; the system's largest radius, not
  M3's 16px), `--color-accent` fill, `--color-accent-contrast` label (5.81 / 5.47), weight 600, `--shadow-lift`.
  Hover `--color-accent-hover` and the 1px lift; press per the motion tokens; focus ring H-139 (2px outside, never
  animated). It is the page's one accent-filled control.
- **F2. Position:** `position: fixed`.
  - ≥ 40rem: `bottom: var(--space-5)`; right edge on the **content** edge, not the window corner:
    `right: max(var(--content-gutter), calc((100% - var(--content-max-width)) / 2 + var(--content-gutter)))`
    (`100%` of a fixed element's containing block is the viewport without the scrollbar, unlike `100vw`). At 1440 it
    lines up with the Export button and the grid's right edge; below 72rem it sits `--content-gutter` from the edge.
  - < 40rem: right `--content-gutter`; bottom above the tab bar: `calc(var(--tabbar-height) + var(--tabbar-border) +
    env(safe-area-inset-bottom) + var(--space-4))`.
  - `z-index` above page content and below the header, tab bar, menus, dialogs and snack bars (it must never sit on
    top of an overlay).
- **F3. Phone label (open choice 3):** recommended: extended at rest and while scrolling up; while the user scrolls
  **down** the grid it collapses to a 56×56 icon-only button (label hidden visually but kept in the DOM, so the
  accessible name never changes), and it expands again on scroll up or at the top. Width change `--dur-med`
  `--ease-out`; under reduced motion it switches with no animation. Tablet and desktop: always extended.
- **F4. Clearance over the virtual-scroll grid:** the grid uses `scrollWindow`, so the page itself must end clear of
  the FAB: reserve `56px + var(--space-5)` (desktop) or the same plus the phone offset below the **footer** on
  Collection (like the tab-bar reserve on `:host`), so that scrolled to the very end the last tile row **and** the
  Legal notice sit fully above the FAB. Measured: at 1024 the notice spans x 181–828 and the FAB would start near
  x 760, so without this the FAB covers the notice. `scroll-padding-bottom` on Collection adds the same amount, so a
  tile focused by keyboard (grid arrows, COLL-093 roving focus) is scrolled clear of the FAB, not under it.
- **F5. Snack bars on Collection** (the IMP-073 Undo notice lands here right after a commit, exactly when the FAB is
  on screen): while the FAB is shown, snack bars sit **above** it: bottom margin = FAB bottom offset + 56px +
  `--space-3`, at every width (one rule; at 1440 the centred snack bar simply floats a little higher). Extends the
  H-101 rule, same `:has()` technique. Undo must never be hidden behind the FAB.
- **F6. When it shows:** gate open **and** the collection phase is `ready`. Hidden (not rendered) when: signed out /
  session lost / first sync running (the sign-in panel shows), `loading`, `unreadable` (a commit could overwrite data
  it can't read), and `empty` (the empty state carries the same action, F8; open choice 4). `catalog-error`: hidden
  until spec-writer says the dialog can commit without the catalog (question for H-174).
- **F7. Keyboard and screen reader:** a native `<button type="button">` whose text is the label;
  `aria-haspopup="dialog"`; icon `aria-hidden`. **DOM order:** right after the page header (h1 / count line), before
  the toolbar, so Tab reaches it before search, sort and the 5,000-tile grid (the grid is one Tab stop but the FAB
  must not be last on the page). It is fixed visually, so the order differs from its visual place; that is the usual
  FAB pattern and the label makes its role plain. No landmark of its own.
- **F8. Dialog open:** opens the import dialog (kind `collection`) titled **Add to your collection**. While open the
  FAB is under the backdrop and inert (Material hides the rest of the page from assistive tech); it does not move or
  hide. On close (Cancel, Escape, or a commit) focus returns to the FAB (`restoreFocus`). A commit stays on Collection
  (ADR; IMP-072 "lands on /collection" with no navigation when opened here), the grid updates in place, and the Undo
  snack bar appears above the FAB (F5).
- **F9. Drop a file (keeps the H-085 feature, SHOULD):** dragging a file over the Collection page (gate open) shows a
  full-content drop overlay, accent outline and tint over `<main>`, centred text "Drop to add to your collection";
  dropping opens the dialog with the file loaded through the single upload path (`loadFile`). A file dropped while the
  phase isn't `ready` / `empty` is ignored without opening the browser's file view. Keyboard and click paths
  unchanged. Same on Decks with "Drop to import a deck".

### Collection empty state (gate open, no cards)
- Heading **Your collection is empty**, line "Add the cards you own and they'll show up here.", one filled button
  **Add to your collection** (same dialog). No FAB while this shows (F6).

### Phone header on Collection
- With COLL-074 withdrawn the phone **More** menu holds only Export CSV. Replace it with one icon button
  (`download`, 44px, `aria-label="Export CSV"`). The desktop More button (local-only delete) goes away.

## 7. "Import deck" on Decks

- **D1. Placement (open choice 5):** a filled accent button **Import deck** with the `upload` icon, 44px, at the
  right of the Decks page title row (same row and alignment as Collection's Export CSV), at every width. At 390 "Decks"
  is short, so the button fits on the same row. `aria-haspopup="dialog"`. Opens the import dialog (kind `deck`),
  title **Import deck** (unchanged); a saved deck stays on Decks (ADR). Focus returns to the button.
- **D2. Empty state:** heading **No decks yet**, line "Import a deck list to see which of its cards you own.", button
  **Import deck**. While it shows, the title-row button is hidden (same one-action rule as F6).
- **D3. Gate closed:** no Import deck button; the sign-in panel shows.
- Why not a second FAB: decks are a list of a few dozen rows, not a 5,000-tile wall, and Decks will grow its own
  toolbar (H-060); a title-row button is enough and keeps the FAB meaning "add cards" only.

## 8. Phone bottom tab bar

- **B1.** Three tabs: Decks, Collection, Tournaments; `grid-template-columns: repeat(3, minmax(0, 1fr))`; drop the
  `.tab--action` style and the Import tab. Everything else as built (64px, icon over label, accent bar + accent text
  + `aria-current` on the active tab, safe area).
- **B2.** Account settings is not a tab; on phones it is reached from the header account control (H1).

## 9. Entry points that pointed at `/import`

- Home hero "Import your collection" → **Add to your collection**, link to `/collection` that opens the dialog;
  "Import a deck" → **Import deck**, link to `/decks` that opens the dialog; the "Import your cards" button and the two
  step tiles the same way. Proposed mechanism (spec-writer names it, H-174): a one-shot query parameter
  (`/collection?add=1`, `/decks?import=1`) that opens the dialog once the gate is open and is then removed with
  `replaceUrl`. Signed out, the page shows the sign-in panel; the SYNC-006 return path keeps the parameter, so the
  dialog opens after sign-in and first sync. This keeps the home page's promise of "one click to import".
- Every `routerLink="/import"` in Collection and Decks empty states is replaced by the dialog (F8 / D2).
- **Not-found:** the ADR says old `/import` links "show the not-found page", but the router has no not-found page
  today: `**` redirects to `/`. Spec-writer to settle: either a not-found page (new screen, needs a brief) or accept
  that `/import` lands on Home. My recommendation: accept Home for now (it's the existing rule for every unknown path,
  and no release used `/import`).

## 10. Sign-in dialog copy (small change for new users)

- **S1.** The SYNC-003 intro is about importing; with the account now in the header, add one sentence so a new user
  knows this is also how to create an account: "Sign in to import your cards and decks. They're saved to your
  account, so you'll see them on any device you sign in on. **New here? Signing in with your email creates your
  account.**" (proposed; RJ approves the wording, spec-writer updates SYNC-003).

## 11. All new strings (for RJ; American spelling)
| Where | String |
|---|---|
| Header, no username | Account |
| Header accessible name | Account: `{username}` |
| Menu item | Account settings |
| Page h1 / lede | Account settings / Your username, theme and account. |
| Section headings | Username · Theme · Sign out · Delete account |
| Username hint | Shown at the top right. Only you can see it. |
| No username | No username yet. · button **Add username** |
| Change button | Change (accessible name "Change username") |
| Theme options / hint | System · Light · Dark / Saved on this device. System follows your device's setting. |
| Delete section line | Deletes your account and everything saved in it, on every device. This can't be undone. |
| Username dialog (create) | Choose a username / It's shown at the top right of every page. Only you can see it, and you can change it any time in Account Information. / Username / Not now / Save |
| Username dialog (change) | Change username / Only you can see it. / Username / Cancel / Save |
| Username counter | `n / 20` |
| Username errors | Enter a username. · Use 20 characters or fewer. · Use letters, numbers, spaces and . _ - ' only. No emoji. · Couldn't save your username. Check your connection and try again. *(Updated 2026-11-26 to SPEC-010 0.17.2, H-210.)* |
| Username saved | Username saved. |
| FAB / collection dialog title | Add to your collection |
| Collection empty state | Your collection is empty / Add the cards you own and they'll show up here. / Add to your collection |
| Collection drop overlay | Drop to add to your collection |
| Decks button / dialog title | Import deck |
| Decks empty state | No decks yet / Import a deck list to see which of its cards you own. / Import deck |
| Decks drop overlay | Drop to import a deck |
| Phone export button | Export CSV (accessible name) |
| Home buttons | Add to your collection · Import deck |
| Sign-in intro addition | New here? Signing in with your email creates your account. |
Existing strings kept as written: Sign in, Signed in as `{email}`, Sync now, Sign out (+ its dialog), Delete account
and data (+ its dialog), You're offline., the status lines.

## 12. New icons
`add`, `expand_more`, `person`, `settings`; optional `light_mode`, `dark_mode` (Material Symbols, Apache 2.0, via
`app-icon`, as the rest).

## Accept (ui-engineer Playwright pass after H-176: 1440 / 1024 / 768 / 390, dark and light, plus 641 and 320)
1. No `/import` route, no Import button in the header and no Import tab; the tab bar has exactly 3 tabs at 390.
2. Signed out, the header right shows only **Sign in**; signed in, a ghost button with the initial, the username and a
   chevron, 44px tall, right edge on the content edge (± 1px of the page content at 1440).
3. A 20-character name (was 24; updated 2026-11-26 to SPEC-010 0.17.2, H-210): shows in full at 1440; ellipsis (no wrap, no overflow, no horizontal scroll) at 641 and 390
   and 320; the accessible name is "Account: {full name}"; the menu shows the full name on its first line.
4. No username: label "Account" with the person icon.
5. Menu: username, Signed in as, status; Sync now; Account settings + Sign out; exactly 2 dividers; no Delete item.
6. `/account`: four sections in order, 40rem column, gated (sign-in panel when signed out); Theme is a radio group
   with a check on the selected option; choosing Light on a dark system turns the whole app light at once (Material
   dialogs, menus and form fields included), survives reload with no flash of the other theme, and survives sign-out.
   System follows `emulateMedia` changes live.
7. Username dialog: appears once after a new account's first sign-in, not for a returning account; each error string
   appears with icon and `aria-invalid`; Save updates the header without a reload; focus returns to the opener.
8. FAB: at 1440 its right edge lines up with the grid's right edge; at 390 it sits ≥ 16px above the tab bar's top
   hairline; scrolled to the end, no tile and no footer text is under it at any width (screenshots at the page end);
   a keyboard-focused last-row tile is fully visible.
9. FAB contrast: label on fill ≥ 4.5:1 in both themes (5.81 / 5.47 by the tokens); focus ring visible on it.
10. Tab order on Collection: header controls → FAB → search → sort → grid. Screen reader reads "Add to your
    collection, button, has popup dialog" (wording varies by reader).
11. Opening the dialog from the FAB: focus in the dialog; Escape returns focus to the FAB; after a commit the Undo
    snack bar is fully above the FAB at all four widths and the page stays on Collection.
12. Phone: FAB collapses to icon-only while scrolling down, expands on scroll up; under reduced motion no width
    animation; accessible name unchanged when collapsed.
13. FAB is absent when signed out, while the first sync runs, while loading, on the unreadable banner and on the
    empty state (which shows its own **Add to your collection** button).
14. Decks: **Import deck** in the title row at all widths (hidden on the empty state, which has its own); opens the
    deck dialog; a saved deck stays on Decks.
15. Home's import buttons open the right dialog on the right page; signed out they show the sign-in panel and the
    dialog opens after sign-in.
16. No console errors; reduced motion leaves nothing hidden; all new hit targets ≥ 44px.

## Open choices for RJ
1. **Username rules:** 1–24 characters, any letters / numbers / spaces / punctuation / emoji (recommended), or a
   tighter set (letters, numbers, `_ - .`, no spaces), or a longer cap (32)? **Closed:** RJ chose 1–24 with emoji
   (H-178), then changed it to 1–20, no emoji, letters, numbers, spaces and `.` `_` `-` `'` `’` (H-206, H-212); see
   U3 *(updated 2026-11-26 to SPEC-010 0.17.2, H-210)*.
2. **Where Account settings lives:** (a) **a page `/account`** (recommended: room for "more later", a real URL and
   Back button, no dialog opening a dialog for Delete or Change username); (b) a dialog from the menu (faster, but
   the Delete and username dialogs would open on top of it); (c) everything inside the menu (Theme as radio items),
   which gets long and has no room to grow.
3. **FAB on phones:** (a) **extended, collapsing to icon-only while scrolling down** (recommended); (b) always
   extended (covers more of the 2–3 column grid); (c) always icon-only "+" (smallest, least clear).
4. **FAB on an empty collection:** **hide it and show the button in the empty state** (recommended, one action), or
   show both.
5. **"Import deck" placement:** **filled button in the Decks title row** (recommended), or a second FAB for symmetry.
6. **Theme while signed out:** with the setting on a gated page, a signed-out visitor (Home, Tournaments) can't change
   the theme and gets the system theme or what they saved earlier. OK, or also put a small theme switch in the footer?
   (Recommended: OK for now.)
7. **Username prompt:** **skippable with "Not now"** (recommended; RJ said users "will be able to" create one), or
   required before using the app?
8. **Copy:** the strings in section 11, especially the sign-in intro addition (S1) and the empty-state lines.
