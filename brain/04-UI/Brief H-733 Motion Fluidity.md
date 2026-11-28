---
title: Brief H-733 - Motion fluidity pass (build H-734)
status: ready (RJ request 2026-11-28; the motion design is ui-engineer's recommendation, nothing here changes behaviour)
board: H-733 (brief), H-734 (build)
source: "RJ 2026-11-28 (via the orchestrator): 'run through these pages. Improve the fluidity of the motion as a user goes through the application. Not too much motion, but not too blocky.' Builds on [[Design Direction]] (H-085 fluid pass, motion tokens), [[Brief H-698 Card Dialog Mobile]] (bottom sheet, Back closes, swipe, scroll restore), [[Scrolling Guidance H-173]]"
date: 2026-11-28
tags: [ui, brief, rj-requested, motion]
---

# Brief H-733: motion fluidity pass

> **Summary.** The app already has a calm base: one route cross-fade, a sheet that slides and follows the finger, hover lifts, and reduced motion that stops everything. What makes it feel blocky is the **moments in between**. These moments get no motion: the footer jumping on every route change, the Card / List switch throwing the page 1,700px, the sheet vanishing in one frame on a link-out, the theme toggle changing the page in one frame while the header fades, chips that change width, a filter row that pops in, and card art that pops in. Material's dialog and snack-bar zoom from 80% also doesn't match our motion.
> The fix is a few cheap continuity moves, mostly View Transitions and CSS using the **existing tokens**, plus two places where we *remove* motion. No new library. Build: **H-734**.

## 1. Motion principle
**Motion explains where things came from and went. It never decorates or makes you wait.** Every change of state gets one short, continuous move (120–220 ms, transform and opacity only). Data that changes while you type and the content of long lists stays still.

Corollaries for H-734:
- One element moves per interaction. Everything else either fades or stays still.
- Enter on `--ease-enter`, exit and state changes on `--ease-out`. Exits are shorter than entrances (`--dur-fast` out, `--dur-med` in).
- A change you caused (tap, click, key) may animate. A change caused by typing, syncing or scrolling may not.
- Nothing shifts layout after the first paint unless you asked for it, and even then the anchor stays put.

## 2. What I looked at
Local dev server from the H-698 worktree (port 4300, live reload off so the builder's commits didn't reload the page), signed out with **guest test data** (Large, 5,000 entries; H-679). Playwright at **1440×900** and **375×812**. I logged `document.getAnimations()` during each transition, layout shifts with a `PerformanceObserver('layout-shift')`, and sampled the sheet's transform every ~30ms. Preview `card-sheet-wgpc4gdf` used for the cold load of Tournaments on a phone.

Screenshots (in `.playwright-mcp/` of the main checkout, not committed): `h716-01-home-1440`, `-03-collection-1440`, `-04-collection-search-1440`, `-05-card-dialog-1440`, `-06-decks-1440`, `-07-decks-filtered-1440`, `-08-deck-detail-1440`, `-09-deck-list-view-1440`, `-10-collection-375`, `-11-card-sheet-375`, `-12/13-tournaments-375` (cold load, then loaded).

**Couldn't observe** (judged from code instead): the page FAB (guest mode shows none), skeletons (guest data is in memory, so loads finish before the 200ms skeleton delay), real card images (sample art), Tournaments with data (the catalog is empty), Safari and Firefox View Transition support, finger feel and frame rate on a real phone, and Home's Winning-decks expand (already built with `::details-content`).

**What already works and stays:** the route cross-fade (`main` out 120ms, in 220ms with a 6px rise), `vt-instant` for query-only changes, the phone sheet (220ms slide-up measured: 353 → 131 → 24 → 2px; the close slides down; swipe follows the finger), the restrained hover lifts, the ownership fill (`--dur-fill`), search-as-you-type swapping results instantly, the home entrance, and the global reduced-motion block.

## 3. Findings, ranked by impact

| # | Flow | What happens now (measured) | Why it feels blocky | Fix (§4) |
|---|---|---|---|---|
| F1 | Deck detail: **Card view ↔ List view** | Hard swap. Layout shift **0.56**, and scroll jumped **3,296 → 1,588px** (the page got shorter and the browser clamped the scroll) | You lose your place, and the whole page jumps | S1 |
| F2 | **Sheet → link out → Back** (phone, and the desktop dialog) | Link-out: the sheet is gone **within one frame (<67ms)**, then the page cross-fades. Back: the page cross-fades **and** the restored sheet does the full 800px slide-up at the same time | The exit is a cut. The return is two motions at once and reads as a fresh open, not "I'm back where I was" | S2 |
| F3 | **Theme toggle** | The page and content change colour in one frame. The header background and nav text fade over 120–220ms (their own transitions) | Two speeds at once: the page snaps while the chrome fades | S3 |
| F4 | **Every route change** | Footer layout shift **0.05** (1440) / **0.12** (375). The footer sits outside `main`, in the un-animated root snapshot | The only thing that moves without easing during an otherwise soft transition | S4 |
| F5 | Decks: **filter chips / sort** | Layout shift **0.12**: the active-filter row ("Partly available ×", "Clear filters") pops in and pushes the grid down **57px**; the selected chip turns bold and wider, so the chips after it slide **4px**; tiles vanish and reflow at once | Three jumps from one tap | S5 |
| F6 | Card dialog **Previous / Next**; desktop deck panel when you pick another card | Content swaps with no animation (`getAnimations()` empty) | Nothing tells you which way you moved or that something changed | S6 |
| F7 | **Desktop dialogs and notices** | Material defaults: the dialog surface and the snack bar zoom from `scale(0.8)` over 150ms; the snack bar fades out in 75ms | A zoom-pop that doesn't match our rise-and-fade; notices now open at the top (H-671), so a zoom has no direction | S7 |
| F8 | **Card art loading** (deck detail, collection) | 10 of 12 images were still loading after the route animation finished; each appears in one frame over the placeholder | Images pop in one by one | S8 |
| F9 | **Skeleton → content** (Decks, Collection, Deck detail) | From code: `@if (showSkeleton())` swaps the skeleton for content in one frame. A skeleton that appears at 200ms can be replaced 10ms later (a flash) | A hard swap and a possible flicker | S9 |
| F10 | **Tab switches** (header tabs, phone tab bar) | The old tab's marker fades out and the new one fades in on the spot (color + scaleX) | No sense of moving from one tab to the next | S10 |
| F11 | **FAB** collapse on scroll (phone) | From code: `.collapsed .label` turns `position:absolute` at once, so the width snaps while padding and gap animate over 220ms | One half eases, the other half snaps | S11 |
| F12 | **Collection** sort / filter | Grid swaps in one frame (fine for typing) | A sort is one deliberate action, and the instant swap reads as a glitch | S12 |
| F13 | **Expand / collapse** (deck notes "Show more", any disclosure) | Hard height change (`line-clamp` toggle) | Text below jumps | S13 |
| F14 | **Cold load** (any route, phone) | `main` is empty while the lazy chunk loads (footer visible, page blank), then the content pops in (`skipInitialTransition`) | One pop on first paint | S14 |
| F15 | **Too much motion** | Section bar → "Runes" smooth-scrolled **~2,900px in ~480ms** (content streaks past). `.zoom-art` hover zoom lingers 600ms | Too long and too fast for the eye to follow | S15 |

## 4. Specs

Token use: **`--dur-fast` 120ms, `--dur-med` 220ms, `--ease-out`, `--ease-enter`** for everything below. `--dur-slow` stays for the home entrance and the art zoom only. **One small token extension (proposed):** distance tokens so the same numbers aren't repeated in 10 files:

```scss
--move-rise: 6px;   /* the route rise, enters, notices */
--move-shift: 12px; /* the direction cue for Prev/Next */
```

No new durations or curves. **No Angular `@angular/animations`** (not in the app today; keep it that way). CSS, `::view-transition-*`, and `document.startViewTransition` with a feature check are enough.

**One helper for builder (pattern, not code):** a small `startScopedTransition(update, className)` used by S1, S3, S5 and S12. It runs `update` directly when the browser has no `startViewTransition`, under `prefers-reduced-motion: reduce`, or while another view transition is running. Otherwise it adds `className` to `<html>` for the transition's lifetime (like `vt-instant` today) and calls `document.startViewTransition(update)`. The class picks the CSS for that kind of transition.

### S1. Card / List switch on deck detail (F1)
- **Anchor first (layout, the main fix):** before the switch, note the section whose heading is at or just above the sticky section bar's bottom edge and its offset from the top of the viewport. After the new view renders, scroll so that heading is at the same offset, instantly (`behavior: 'instant'`). If you're at the very top, stay at the top.
- **Then a calm swap:** wrap the switch in `startScopedTransition(…, 'vt-view-swap')`. `main`: old `opacity 1→0` over `--dur-fast` `--ease-out`; new `opacity 0→1` over `--dur-med` `--ease-enter`, **no rise** (the content stays in place, only its form changes). The section bar and the view toggle stay still: give the sticky bar its own name (`deck-section-bar`) with `animation: none`.
- **Leave still:** the header, the summary, the desktop side panel (name it `deck-panel`, `animation: none`).
- **Reduced motion:** the anchor still applies; the swap is instant.

### S2. Sheet / dialog link-out and Back (F2)
- **Link-out (exit):** while a card sheet or card dialog is open, give its overlay pane **and** backdrop one shared name. Simplest: `view-transition-name: card-overlay` on `.cdk-overlay-container` while `.card-dialog-panel` is in it. Then `::view-transition-old(card-overlay)`: `opacity 1→0`, `transform: translateY(var(--move-rise))`, `--dur-fast` `--ease-out`. `::view-transition-new(card-overlay)` doesn't exist (the overlay is closed). The page behind does the normal route cross-fade. Result: the sheet sinks a little and fades while the new page rises in.
- **Back (restore):** when the sheet or dialog is **reopened by Back** (the H-698 restore path), it is not a new open:
  - the route change behind it uses `vt-instant` (the page is under the sheet, so animating it is wasted motion),
  - the sheet pane fades in place: `opacity 0→1` over `--dur-med` `--ease-enter`, **no `translateY(100%)`**. The backdrop fades with it. On desktop the dialog surface does the same: fade, no rise.
- A normal open (tap a card) keeps today's slide-up (phone) and S7's rise (desktop).
- **Reduced motion:** both instant (already the case for the slide via the global block; the new keyframe obeys the same block).

### S3. Theme toggle (F3)
- Run the theme change inside `startScopedTransition(…, 'vt-theme')`. Under `html.vt-theme`: every group (`root`, `main`, `site-header`, `tab-bar`, `site-footer`, the indicators) has `animation: none` (nothing moves). Every old/new pair is a plain cross-fade over **`--dur-med` `--ease-out`**: old `opacity 1→0`, new `opacity 0→1`. **No rise.**
- Keep the icon's 120ms rotate-in (it's inside the header snapshot and plays in the live new state).
- **Without View Transitions** (fallback): add `html.theme-switching` for 2 frames with `transition: none !important` on everything, so the whole page snaps together instead of the header fading on its own.
- **Reduced motion:** instant, everything at once (the fallback path).
- Check in **both directions** (light → dark, dark → light): a cross-fade between a light and a dark full page can flash grey in the middle. If the midpoint looks muddy, use old `opacity 1→0` on `--dur-fast` and new on `--dur-med` (the old fades faster).

### S4. Footer on route change (F4)
- `.site-footer { view-transition-name: site-footer; }`. `::view-transition-group(site-footer) { animation: none; }`. Old: the existing `route-out` (`--dur-fast`). New: **opacity only** (`--dur-med` `--ease-enter`, no rise; a rising footer draws attention).
- Result: the footer fades out of its old place and into its new one instead of jumping.
- **Reduced motion:** instant (global block already sets every `::view-transition-*` animation to none).

### S5. Decks list: chips, filters, sort (F5)
1. **Chips never change width.** The selected chip keeps the same `font-weight` as the rest (use 600 for all chips, or reserve the bold width with the `data-text` / `::after` `font-weight: 600; visibility: hidden; height: 0` trick). Selected state = fill + check icon, as today. Accept: chip x-positions identical before and after a tap (±0.5px).
2. **Active-filter row ("Partly available ×", "Clear filters")**: animate its height instead of popping. Use a wrapper with `display: grid; grid-template-rows: 0fr → 1fr` transition **`--dur-med` `--ease-out`**, inner `overflow: hidden`, content `opacity 0→1` over `--dur-fast` delayed 60ms. Removing reverses it (`--dur-fast` for the opacity, `--dur-med` for the height). The grid below moves with it smoothly. This is a small, layout-animated container, which is allowed (§6).
3. **Tiles follow the filter or sort (View Transition):** in `routeViewTransition`, when the route is `decks` and only the **filter or sort** params changed (not the search text; typing stays `vt-instant`), add `vt-list` instead of `vt-instant`. Each deck tile that is **in or near the viewport** carries `view-transition-name: deck-<id>` (set via an IntersectionObserver, max **24** named tiles; tiles off-screen stay unnamed and ride in the `main` snapshot).
   - Under `html.vt-list`: `main` old/new `animation: none` (the page itself doesn't fade); tile groups move to their new place over **`--dur-med` `--ease-out`** (the default group animation with our timing); entering tiles `opacity 0→1`, `scale .98→1`, `--dur-fast`, delayed 60ms; leaving tiles `opacity 1→0` over `--dur-fast`.
   - **Stagger:** none needed (the move itself reads as order). If builder adds one, cap it at 6 tiles × 20ms (≤100ms total).
   - If more than 24 tiles change, or the toggle is the phone Filters dialog's **Show**, skip the tile names and just cross-fade `main` (`--dur-fast` out, `--dur-med` in, no rise).
- **Reduced motion:** chips and row 1–2 instant; no list transition.

### S6. Prev / Next in the card dialog and sheet; picking a card in the desktop deck panel (F6)
- On Next: the content block (art + facts, **not** the title bar or the nav buttons) is re-created with an enter animation: `opacity 0→1`, `translateX(var(--move-shift))` → 0, **`--dur-med` `--ease-enter`**. On Previous: from `translateX(calc(-1 * var(--move-shift)))`. No exit animation (the old content is replaced at once; a 220ms in is enough).
- The title text: `opacity` only, `--dur-fast`. The sheet's scroll position resets to the top before the enter.
- Desktop deck panel (Card tab) when another card is picked: the same enter but **without** the horizontal shift (opacity + `translateY(4px)`), since there's no direction. Card / Missing tab switch in the panel: content `opacity` over `--dur-fast`; the tab underline as S10.
- Fast clicks: each click restarts the enter; never queue animations.
- **Reduced motion:** instant swap.

### S7. Desktop dialogs and notices (F7)
- **Dialogs (all MatDialog except the phone sheet):** replace Material's `scale(.8)` zoom. Enter: surface `opacity 0→1`, `transform: translateY(8px) scale(.98) → none`, **`--dur-med` `--ease-enter`**; backdrop `opacity` over `--dur-med`. Exit: surface `opacity 1→0`, `scale(.98)`, **`--dur-fast` `--ease-out`**; backdrop `--dur-fast`. Set it once, globally (the Material dialog transition tokens / `enterAnimationDuration` + a surface override in `styles.scss`), not per dialog.
- **Phone full-screen dialogs** (Filters, Import deck at ≤40rem): no zoom; enter `translateY(var(--move-rise))` + opacity over `--dur-med`, exit opacity only over `--dur-fast`.
- **Snack bar / notices (top, H-671):** enter `opacity 0→1`, `translateY(-8px) → 0` (from the header, downwards), **`--dur-med` `--ease-enter`**. Exit `opacity 1→0`, `translateY(-4px)`, **`--dur-fast` `--ease-out`**. The swipe-to-dismiss in `notice-snack-bar.ts` should read `--dur-fast` / `--ease-out` from CSS (as `card-sheet.ts` does) instead of `SLIDE_MS = 150` and the `ease-in` / `ease-out` keywords.
- A notice replacing another notice: the new one enters, the old one leaves; never both moving vertically at once.
- **Reduced motion:** instant (the snack bar code already checks `reducedMotion()` for the swipe; the CSS enter and exit obey the global block).

### S8. Card art arrives (F8)
- `app-card-art` `.card-image`: if the image **isn't `complete` at first render**, start it at `opacity: 0` and fade to 1 on `load` over **`--dur-fast` `--ease-out`**. Cached images (complete at render) show at once with no fade. On `error` the fallback shows at once.
- The placeholder (`--color-surface-raised` behind the reserved `aspect-ratio`) stays as it is. That's what stops layout shift.
- Opacity only, so it's allowed inside virtual-scroll rows (§6), but never with a transform there.
- **Reduced motion:** no fade.

### S9. Skeleton → content (F9)
- When the skeleton **was shown**, the content that replaces it enters with `opacity 0→1` over **`--dur-med` `--ease-enter`**, no movement. When the data arrived before the 200ms delay (no skeleton), there's no extra fade (the route transition already covered it).
- **Proposed (needs a spec note):** once the skeleton is visible, keep it at least **300ms** so it never flashes for a frame or two. OWN-119 (a) and the Collection / Decks skeleton rules only fix the 200ms delay; spec-writer should confirm the minimum before the builder adds it. Without the minimum, ship the fade only.
- The skeleton geometry must match the content: same tile `aspect-ratio`, same grid gaps, same title height. Accept: CLS < 0.01 at the swap.
- No shimmer (OWN-119 (a) says "no shimmer"; keep it).
- **Reduced motion:** instant swap.

### S10. Tab indicator (F10)
- **Header tabs (≥40rem):** render a real element for the active underline (e.g. `<span class="nav-indicator">` in the active `.site-nav a`, replacing the `border-bottom-color` underline) with `view-transition-name: nav-indicator`. **Phone tab bar:** the same for the top marker (`tab-indicator`), replacing the `::before` (a pseudo-element can't carry a view-transition-name).
- On a route change, the indicator's group moves from the old tab to the new one: `::view-transition-group(nav-indicator | tab-indicator) { animation-duration: var(--dur-med); animation-timing-function: var(--ease-out); z-index: 2; }` (above the `site-header` / `tab-bar` groups, which stay `animation: none`). The tab text and icon colours keep their 120ms transition.
- From Home (no active tab) to a tab: the indicator just fades in. Same-route (`vt-instant`): it doesn't move.
- Without View Transitions: today's fade + scaleX stays as the fallback.
- **Reduced motion:** the indicator jumps (global block).

### S11. FAB (F11)
- **Collapse / expand on scroll (phone):** don't remove the label from layout in one frame. Animate the label's `max-width` (e.g. `12rem → 0`) and `opacity 1→0` together with the existing padding and gap, all **`--dur-med` `--ease-out`**. The label stays in the accessibility tree (no `display: none`, no `visibility: hidden`), so the accessible name is unchanged. The button is right-anchored, so it shrinks toward its right edge and the icon stays put (accept: the icon's x stays within ±1px during the collapse).
- **Enter / exit with the page:** give the button `view-transition-name: page-fab`. Between Decks and Collection (both have one) the group morphs size and label over `--dur-med` `--ease-out`. Entering a page with a FAB: `opacity 0→1`, `scale .92→1`, `--dur-med` `--ease-enter`, delayed 60ms after `main`. Leaving to a page without one: `opacity` over `--dur-fast`.
- **Leave still:** the footer dock (`translate` tracks the footer 1:1, H-245 D1). Keep that without a transition.
- **Reduced motion:** instant collapse, no enter (the component already drops the transitions; extend that to the new properties).

### S12. Collection sort and filter (F12)
- **Typing in search:** stays instant (already right).
- **Sort change, filter apply (phone Filters "Show"), Clear filters:** cross-fade the results area only. The grid container fades `opacity 0→1` over **`--dur-fast` `--ease-out`** after the new rows render. The toolbar, the count line and the banner don't animate. No per-tile motion, no View Transition names on virtual-scroll tiles (thousands of rows).
- **Reduced motion:** instant.

### S13. Expand / collapse (F13)
- **One pattern for every disclosure:** the Home Top 8 pattern (`::details-content` + `interpolate-size: allow-keywords`, `block-size` over **`--dur-med` `--ease-out`**) for `<details>`. For other toggles (deck notes "Show more", the phone deck name expand), use `grid-template-rows: 0fr ↔ 1fr` or `interpolate-size` on `block-size` from the clamped height to `auto`, over `--dur-med` `--ease-out`. Chevrons rotate over `--dur-fast`.
- Content inside fades `opacity 0→1` over `--dur-fast`, delayed 60ms, on open only.
- Browsers without `interpolate-size` open at once (progressive enhancement; already the house rule).
- **Leave still:** what's above the toggle. Only content below may move, and it moves with the height animation, never jumps.
- **Reduced motion:** instant.

### S14. Cold load (F14)
- On the very first paint of a route (where `skipInitialTransition` skips the route animation), the routed page's first child enters with `opacity 0→1` over **`--dur-med` `--ease-enter`**, no rise, once. Home keeps its own entrance and is excluded.
- While the lazy chunk loads, `main` keeps a `min-height` (e.g. `calc(100svh - var(--header-height))`) so the footer doesn't flash at mid-screen before the page arrives (seen on `/tournaments` at 375).
- **Reduced motion:** no fade.

### S15. Remove motion (F15)
- **Section bar jumps (deck detail):** if the target is more than **1.5 viewport heights** away, first jump without animation to one viewport above (or below) the target, then smooth-scroll the last viewport. Short jumps keep the smooth scroll. The same rule applies to the "back to top" of any list.
- **`.zoom-art` hover:** keep the 1.03 zoom (home and Top 8 only) but shorten the *return* to `--dur-med` so the art doesn't hang zoomed after the pointer leaves. Zoom-in stays at `--dur-slow`.
- **Don't add:** scroll-triggered reveals, stagger on Collection or deck detail grids, parallax, tilt, card flips, number count-ups, bouncy easings, or a card-tile → sheet-art shared-element morph (see §7).

### What stays still (on purpose)
Search typing results, count lines and numbers, virtual-scroll rows while scrolling, sticky header and section bar (only their existing border/background change), the FAB dock, scroll restore on Back (H-698; it must land in place, never animate there), ownership fills after the first render (`--dur-fill` already), focus rings, and the sheet while the finger drags it.

## 5. Reduced motion (one table)
| Spec | With `prefers-reduced-motion: reduce` |
|---|---|
| S1 view switch | Anchor kept, swap instant |
| S2 link-out / restore | Instant; no slide, no fade |
| S3 theme | Instant, whole page at once (fallback path) |
| S4 footer | Instant |
| S5 chips, filter row, list | Instant; no list transition |
| S6 Prev / Next | Instant |
| S7 dialogs, notices | Instant (swipe-to-dismiss closes without sliding, as today) |
| S8 art | No fade |
| S9 skeleton | Instant swap |
| S10 indicator | Jumps |
| S11 FAB | Instant collapse; no enter |
| S12 collection | Instant |
| S13 disclosures | Instant |
| S14 cold load | No fade |
| S15 scroll | `scroll-behavior: auto`, jumps (already) |

The global block in `styles.scss` covers CSS animations, transitions and every `::view-transition-*`. `startScopedTransition` must **also** skip `document.startViewTransition` under reduced motion. That isn't just the CSS: it avoids the brief frozen-input window as well.

## 6. Performance rules
1. **Animate `transform` and `opacity` only.** Allowed exceptions: `clip-path` (ownership fill, existing), and **height on small containers** (disclosures, the active-filter row) via `interpolate-size` / `grid-template-rows`, never on a list with more than ~20 children and never inside the virtual-scroll viewport.
2. **Virtual scroll (Collection):** no enter, exit or stagger animations on rows, ever. Image fade (S8) is opacity-only and allowed. No `view-transition-name` on virtual rows.
3. **View Transitions budget:** at most **30 named elements** per transition (chrome 6–7 + ≤24 tiles). Names only on elements in or near the viewport. Never run two at once; the helper drops the animation, not the update.
4. **Durations:** UI ≤ 220ms (`--dur-med`); the only things longer are the home entrance and the art zoom-in (`--dur-slow`). Exits ≤ 120ms.
5. **Per-interaction budget:** one moving element plus fades. Max stagger 6 × 20ms.
6. `will-change` only while animating (the sheet pane already does this; don't add a permanent `will-change` elsewhere).
7. No JS animation loops. The two JS-driven motions (sheet drag, notice swipe) stay pointer-driven, and their settle animations use CSS transitions with token values read from CSS.
8. **Layout shift:** after the first paint, CLS from non-input changes ≤ **0.01** per page (measured with a `layout-shift` observer, as in §2).

## 7. Considered and not recommended
- **Card tile → sheet / dialog art morph:** opening a MatDialog inside `startViewTransition` freezes input for the length of the animation, fights the CDK overlay's own focus and scroll-block, and the art must have decoded in both places. The phone sheet's slide already gives continuity, and on desktop S7's rise is enough. Revisit only if RJ asks for it.
- **Deck tile title → deck detail H1 morph:** cheap-ish (one name set on the clicked tile, the H1 always named), but text snapshots scale from ~17px to ~32px and look stretched halfway through unless the old/new images use `object-fit: none`. **Optional P3** for H-734: do it only if it looks clean at 1440 and 375 in both directions (needs the list tile named again on Back for the reverse morph). If not clean, skip it.
- **Direction-aware route transitions** (drill-in rises, Back sinks): small gain, more rules. Not now.

## 8. Priority for H-734
P1: S1, S2, S4, S5 (1–2), S7. P2: S3, S5 (3), S6, S8, S9, S10, S11. P3: S12, S13, S14, S15, optional title morph.
Builder may split H-734 into parts by priority. Keep them on the same branch / PR (related UI items, one PR).

## 9. Acceptance checklist (reviewer checks each at 1440 and 375, light and dark)
1. Deck detail Card ↔ List: the section heading at the top of the viewport stays within **±4px** of its offset. No scroll clamp jump. The swap is a fade (no rise).
2. Phone: open a card sheet on deck detail, tap a printing link: the sheet sinks ≤6px and fades out within 120ms while the Collection page rises in. No frame where the sheet is gone and the old page is still fully visible.
3. Then Back: the deck page is in place at once (no cross-fade), and the sheet **fades** in place (no slide from the bottom). Scroll position as before (H-698).
4. Theme toggle both ways: the header, page, tab bar and footer change together in one 220ms cross-fade. No part changes on its own timing.
5. Route changes Home → Decks → Collection → Tournaments: the footer never jumps. A layout-shift observer shows **no shift attributed to `site-footer`**.
6. Decks: tapping each ownership chip moves no other chip (x-positions identical ±0.5px). The active-filter row grows and shrinks over ~220ms. Tiles move to their new places, leaving tiles fade, and typing in "Search decks" animates nothing.
7. Card dialog / sheet Next and Previous: content enters from the right on Next and from the left on Previous (12px, 220ms). Rapid clicks never queue.
8. Desktop dialogs (card, Import deck, account dialogs) rise 8px from 98% scale. No dialog zooms from 80%. Exits are 120ms.
9. Notices enter downward from under the header (8px, 220ms) and leave in 120ms. The swipe-to-dismiss timings come from the tokens.
10. Card art that loads after the page fades in over 120ms. Cached art shows at once. No layout shift while images load.
11. With a throttled network (Slow 4G): the skeleton appears after 200ms, and the content fades in over it. Layout shift at the swap < 0.01. No shimmer.
12. Header tabs and the phone tab bar: the indicator slides from the old tab to the new one in 220ms. From Home it fades in.
13. Phone FAB (signed in, Collection and Decks): scrolling down, the label narrows and fades smoothly, and the icon doesn't move. Its accessible name is unchanged (snapshot). Decks ↔ Collection morphs the button. The footer dock still tracks 1:1.
14. Collection: sort change and Filters "Show" fade the grid in over 120ms. Typing doesn't. Fast scrolling through 5,000 entries shows no row animations, and frames stay smooth (no long tasks over 50ms from animation).
15. Deck notes "Show more" / "Show less" and any disclosure animate their height over 220ms. Content above never moves.
16. Cold load of `/tournaments` on a phone: no footer at mid-screen before content. The page fades in once.
17. Section bar → a section more than 1.5 screens away: an instant jump, then at most one screen of smooth scroll.
18. **Reduced motion on** (`emulateMedia`): every item in §5 holds. Nothing animates, nothing is left hidden, and no `startViewTransition` runs (`document.getAnimations()` stays empty across 1–17).
19. No new dependency. No `@angular/animations`. Every duration and easing in new CSS is a token (grep finds no raw `ms` values in the new rules except the 60ms delays and `0.01ms` in the reduced-motion block).
20. Console free of View Transition errors (e.g. `InvalidStateError` from overlapping transitions, or duplicate `view-transition-name`).

## Open points
- **spec-writer:** S9's 300ms minimum skeleton time is presentational, but OWN-119 (a) and the Collection / Decks skeleton rules only state the 200ms delay. Please confirm or reject the minimum (builder ships the fade either way).
- **RJ:** the optional deck-title morph (§7). Default is skip unless it looks clean.

## Decisions (RJ 2026-11-28, via the orchestrator)
- **Deck-title morph (§7, optional P3): skipped.** Not built in H-734.
- **No minimum skeleton time (S9).** Data shows the instant it is ready; there is no artificial delay anywhere. A skeleton → content crossfade is allowed only if it never delays the content (the content is visible from its first frame; the fade only covers the swap). This closes the spec-writer open point above: the 300ms minimum is rejected.
