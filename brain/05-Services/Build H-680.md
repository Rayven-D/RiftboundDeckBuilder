---
tags: [services, build]
board: H-680
specs: ["[[Accounts and Sync]] 0.20.1 (SYNC-162, AC 89)"]
branch: loop/H-679-guest-test-data
as_of: 2026-11-26
---
# Build H-680

**What.** Every notice in the app renders one component, `NoticeSnackBar` (`web/src/app/shared/notice/`), in place of
Material's text-only snack bar:
- a notice **without an action** shows **OK** (an action passed as "OK" is the same button); OK closes it at once;
- a notice **with an action** (Undo, View deck, Open, Try again) shows **only that action** (RJ's revision, 2026-11-26);
- both buttons are at least 44 × 44 px (closes H-149's 40 px), Tab-reachable, and opening never moves focus;
- **swipe (touch / pen pointers only):** a mostly horizontal drag (past 8 px, |dx| > 1.5 |dy|) moves the notice; on
  release past 30 % of its width, or a flick (≥ 24 px at ≥ 0.5 px/ms), it slides out (150 ms) and closes; otherwise it
  snaps back. `touch-action: pan-y` leaves vertical scrolling to the browser; a vertical start is never taken over.
  Reduced motion: no slide, it just closes. A swipe calls `dismiss()`, never the action, so an Undo notice's change
  stays and no timer changes (SYNC-162 (g), builder default);
- OK or a swipe that closes the notice puts focus back on the element that had it before focus entered the notice,
  when focus would otherwise be lost (a dialog keeps its focus, H-198).

**How.** `injectNotices()` = `inject(MatSnackBar)` with `simpleSnackBarComponent` set to `NoticeSnackBar`; every
service and component that opened notices uses it (10 files). Set per call site, not in `app.config`, so the
snack-bar code stays in the lazy chunks (H-671 budget): the initial bundle is unchanged. Durations, politeness and the
top placement still come from each caller's options (`noticeOptions`, `NOTICE_POSITION`). The host keeps Material's
`mat-mdc-simple-snack-bar` class, so its layout rules and existing selectors still apply.

Behaviour chosen (SPEC-010 says "builder default"): the thresholds above; mouse drags never swipe; focus return.

Tests: `shared/notice/notice-snack-bar.spec.ts` (H-680: thresholds; OK on plain notices, "OK" action = one OK; Undo
only, no OK; OK dismisses and returns focus; swipe past 30 % left and right dismisses; short slow drag snaps back;
vertical drag ignored; swipe on Undo doesn't undo; reduced motion; mouse ignored); `deck-detail.spec.ts` (H-680: Deck
deleted shows only Undo and a swipe leaves the deck deleted; Missing list copied shows OK, which closes it);
`collection-test-data.spec.ts` (H-680: Test data loaded shows OK).

Checks (2026-11-26, Node 22.23.5): `npm run lint` pass; `npm run build` pass (initial total 461.58 kB, unchanged);
`ng test` 100 files, 1589 tests pass; `npm run e2e` 6 / 6 pass.
