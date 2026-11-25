---
tags: [loop, validation]
item: H-144, H-114, H-115
date: 2026-11-24
round: 1
result: PASS (H-144, H-114, H-115)
---
# Validation H-144 / H-114 / H-115: gate panel, one line, no heading, progress bar

Items: [[Handoff Board]] H-144 (gate panel text, RJ decision 15 + lost-session line), H-114 (UI review #12, the
panel built from `app-empty-state`) and H-115 (UI review #13, first-sync progress bar, no panel heading). All three
were built together on one branch.
Spec: [[Accounts and Sync]] v0.10 SYNC-009, SYNC-086; ACs 26, 27, 46, 47, 57. RJ confirmed Open questions 7 (one
neutral lost-session line) and 8 (no panel heading in any state).
Design: [[Brief H-144 H-114 H-115]], plus the ui-engineer's Playwright pass.
Scope: uncommitted tree on `loop/H-144-gate-panel` (base fd5057e). Files: `core/sync/sign-in-panel.ts`,
`shared/empty-state.ts`, the four gated pages (`page` input removed), `pages/gated-pages.spec.ts`,
`core/sync/sign-in-focus-confirm.spec.ts`, and the new `shared/empty-state.spec.ts` and `tooling/gate-panel.spec.ts`.
Notes: [[UI Index]], [[Session Log]] and the new brief. No file under `brain/02-Specs/` changed (`git status` shows
nothing there).

**Browser evidence:** the ui-engineer ran the app with Playwright at 1440, 375 and 320, in dark and light, with the
keyboard and with reduced motion. Screenshots `h144-screens/01…12` are in the side-session notes, outside the repo.
The validator looked at 04 (Decks, session lost, 1440 dark) and 10 (Import, running, 320 light, after the fix) and
did not drive the browser again. Two findings from that pass were fixed and rechecked as PASS at 320, 375 and 1440:
(1) the bar overflowed below about 337px, now fixed with `width: min(16rem, 100%)` and a stretched action row;
(2) the segment looked empty too often, now fixed with `linear` easing. The ui-engineer also confirmed by computed
style that the gate and Tournaments' empty state have the same padding, border, radius, mark and gap.

## Result
2026-11-24 · H-144 · PASS · Accept (AC 46 ×4 + header ×4, AC 26 ×4 page + engine AC 26, AC 27 ×4 + first-frame, AC 47 ×4 running + failed, AC 57 ×4 lost + ×4 running; retired-copy grep), V-008, V-009, V-011, V-012 · failures: none
2026-11-24 · H-114 · PASS · Accept (panel is `app-empty-state` with the deck mark and action row on all 4 gated URLs; `text-wrap: balance`; computed-style match at 1440/375 by the ui-engineer), V-008 · failures: none
2026-11-24 · H-115 · PASS · Accept (AC 57 first-sync part, running bar on all 4 URLs, reduced-motion `animation: none`, no heading in all 4 states), V-008 · failures: none

No new board items. `next_id` stays 148.

## Checks run
### V-008 (web), run by the validator from `web/`
| Command | Result |
|---|---|
| `npm run lint` | All files pass linting (exit 0) |
| `npm run build` | Application bundle generation complete, initial total 406.26 kB (exit 0) |
| `npm test` | 45 files, **645 passed** (exit 0) |
| `npm run test:rules` (JDK 21 on PATH) | 4 files, **34 passed** (exit 0) |

### H-144 Accept: ACs 46, 26, 27, 47, 57 as tests named by AC; no retired copy
- `SYNC-009 / AC 46 / AC 26 signed out, %s keeps its URL and shows the signed-out line, no panel heading, and Sign in`
  runs for `/collection`, `/decks`, `/decks/0b7c…` and `/import`. Each test checks: URL kept; `GATE_TEXT.signedOut`
  is exactly "Sign in or create an account to start keeping track of your collections and decks" (no full stop);
  exactly one `p` in the panel, with that text and no role; no `h1`/`h2`/`h3`/`[role=heading]`; the section has no
  `aria-label`, `aria-labelledby` or role; buttons are exactly `['Sign in']`; no page content; no firebase adapter
  load. `SYNC-009 / AC 46 … keeps its page header` (×4) still passes.
- AC 26: the restart half (no Firebase, no "Sign in again to sync." message, stores empty) is covered by
  `AC 26 / SYNC-002 sign out then reload…` in `sync-engine-account-required.spec.ts`. The Decks panel line is
  covered by the page test above, which uses the same signed-out sync log.
- AC 27 and AC 57 (lost session): `SYNC-086 / AC 27 / AC 57 a lost session on %s shows the one neutral lost-session
  line, no heading` (×4: exact "You've been signed out. Sign in again to continue.", no signed-out line, no `h2`,
  only Sign in, no content). `SYNC-086 / AC 27 a stored lost session shows the panel from the first frame and turns
  deck controls off` also passes, as do the engine AC 27 tests (sets `sessionLostUid`, reload keeps the gate closed,
  same uid resumes, uB clears).
- AC 47 and AC 57 (first sync): `SYNC-048 / AC 47 / AC 57 / H-115 first sync running on %s …` (×4, including
  `/import`, which is AC 57's case) and `SYNC-048 / AC 25 / AC 47 / AC 57 a failed first sync …` (alert line, no
  heading, deck mark, no bar, only Try again; Try again reruns the flow; content appears without a reload). The
  engine AC 47 tests (offline at start-up, undetected loss window, download running) pass.
- Retired copy: `grep -rnF` in `web/src` for "Sign in to see your collection", "Sign in to see your decks",
  "Sign in to import cards and decks", "You need a free account" and "Sign in again to see them" found **no
  matches**. `tooling/gate-panel.spec.ts` `H-144 no retired gate copy is left anywhere in web/src` makes the same
  check on every test run; the phrases in that test are split, so the file doesn't match its own check.
- [[UI Index]] gate row now has the v0.10 lines, no heading, the bar and the focus rule. `GATE_HEADINGS` and the
  `page` input are gone, and all four pages use `<app-sign-in-panel />`.

### H-114 Accept: gate and Tournaments empty state look like one pattern
- `H-114 the %s panel is built from app-empty-state: deck mark and the action row` (×4): `app-empty-state` is inside
  the panel, `app-deck-mark` is present, Sign in is in `.actions`, and the old `.gate` box is gone.
- `empty-state.spec.ts`: with a heading it renders as before (named section, `h2`, muted line, no role, not
  focusable), so Tournaments and the other empty states are unchanged. Without a heading the section has no `h2`,
  no name, the line is `.primary` and the role comes from `messageRole`. `focusable` gives `tabindex="-1"` and
  `focus()` moves focus to it.
- `gate-panel.spec.ts` `H-114 the empty state balances its message…`: `p { text-wrap: balance }` and
  `p.primary { color: var(--color-text) }`.
- Visual match at 1440 and 375: the ui-engineer's computed-style comparison (padding, border, radius, mark, gap)
  and screenshots 01, 02, 11 and 12.

### H-115 Accept: AC 57 first-sync part, bar, reduced motion, no heading in any state
- AC 57 first-sync part: the running test above on `/import` (page header, then the exact line, `role="status"`,
  no `h2`).
- Running state shows a bar: `.progress` is inside `.actions` on all four URLs, with `aria-hidden="true"`, no role,
  and no `aria-busy` anywhere in the panel.
- Reduced motion: `gate-panel.spec.ts` reads the stylesheet source, because jsdom has no media queries. Inside
  `@media (prefers-reduced-motion: reduce)` the segment has `animation: none` and `transform: translateX(75%)`. The
  global reduced-motion rule in `styles.scss` is still there. Screenshots 07a, 07c and 07d show the segment resting.
- No heading in any state: signed out, lost session, running and failed are each checked (`h2` null, and also
  `h1`/`h3`/`role=heading` for signed out).
- Focus: `H-115 / Brief H-144 focus: Try again → running focuses the panel (not body); a second failure focuses
  Try again` passes.
- Bar geometry tests: `width: min(16rem, 100%)` with no bare `16rem`, `height: 4px`, `margin-block: 18px`,
  `linear` timing, and `justify-self: stretch` on the action row.

### Other checks
- **V-009:** every link in [[Brief H-144 H-114 H-115]] resolves: [[Accounts and Sync]], [[Brief H-139]],
  [[Brief H-140 H-125 H-108]], [[Design Direction]], [[UI Index]], [[UI Review 2026-11-24]], [[Validation H-102]].
  The new UI Index link resolves too.
- **V-011:** the diff adds no `firebase` import.
- **V-012:** `git grep RGAPI-` in `web/` and `services/` finds no matches.

## Notes (not failures)
1. **Mutation check not run.** The validator tried to mutate production lines one at a time, run the three specs,
   and restore from backup. The session's permission policy refused the file changes. The tests' strength therefore
   rests on reading them: they assert exact strings, roles, element absence and CSS declarations, not just that
   something is present.
2. The ui-engineer's figure "segment ≥20px about 89% of each cycle" comes from geometry and was not re-sampled in
   the browser after the change to `linear`. Accept doesn't require it.
3. `.empty-state:focus { outline: none }` hides the ring when script moves focus to the panel after Try again. The
   brief chose this on purpose: the panel isn't a control, and the status line is announced. No item filed.
4. `justify-self: stretch` on `.actions` affects every `app-empty-state`. Its items stay centred
   (`justify-content: center`). Screenshots 11 and 12 (Collection and Decks empty states) look unchanged.

## After the code review (orchestrated session, 2026-11-24)
The code review found one real bug: the Try again focus flag stayed set after a second failure, so a later
automatic rerun (back online, or the tab shown again after 5+ minutes) moved focus into the panel. Fixed in
`sign-in-panel.ts` (the flag is cleared once the retry fails) with the test "H-115 / Brief H-144 focus: after Try
again fails once, an automatic rerun (running → failed) does not move focus". Mutation-checked by hand: with the fix
removed that test fails; with it back it passes. Re-run: lint clean, build clean, `npm test` **646/646**,
`npm run test:rules` **34/34** (JDK 21 on PATH). Verdicts unchanged: H-144, H-114 and H-115 **PASS**.
