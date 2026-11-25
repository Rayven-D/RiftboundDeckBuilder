---
tags: [ui, review]
date: 2026-11-25
board: H-202
spec: SPEC-012
status: done
---
# Critique H-202: "What's new" page (`/changelog`)

Post-build review by `ui-engineer` of branch `loop/H-202-changelog-page` (uncommitted, worktree `competent-satoshi-c6c827`), against [[Changelog]] (SPEC-012 0.1) and [[Design Direction]]. Looked at with Playwright on a local dev server at 1440, 1024, 768, 390 and 320 px, dark and light, signed out. The account menu needs a real sign-in, so its item was reviewed from the markup in `web/src/app/core/sync/account-menu.ts` only.

**Verdict: nothing blocks release.** The page is quiet, readable and right for Direction A. Three small polish fixes below.

## What works
- **Hierarchy:** h1 `What's new` (Archivo 800, 28px), muted intro line, then each entry: h2 title (Archivo, 20px), a small muted meta line `Version 0.0.1 · Coming soon`, and body-size bullets. You can tell at a glance what each line is.
- **Reading width:** a 65ch column centred in the content width (LOG-071). Bullets wrap at about 60 to 70 characters at desktop. Nothing is cut off at 320 px (`scrollWidth` 305 = viewport minus scrollbar, so no horizontal scroll).
- **"Coming soon" state:** reads as plain muted text in the meta line, with no `<time>` element. That's right: the state only appears on `dev` and preview builds, because the release check blocks a null date from reaching production. It doesn't need more visual weight.
- **Footer:** the theme switch and `What's new` share one centred row at 768 px and up. On phones the link drops onto its own centred line under the switch, and the Legal Jibber Jabber line stays unchanged. The link is wrapped in `nav aria-label="Footer"` > `ul`, ready for H-180's `Privacy notice` to slot in first.
- **Calm:** no icons, images or animation beyond the app's route transition (LOG-072). No meta statistics (ADR-0003). No `appVersion` shown.
- **Navigation:** choosing the footer link from the bottom of Home lands on `/changelog` scrolled to the top. Console has no errors or warnings.
- **Account menu markup:** `<a mat-menu-item routerLink="/changelog">What's new</a>` sits after the Theme group (outside its `role="group"`) and before the last divider. That keeps 3 dividers. It is never disabled (LOG-011) and closes the menu on click (Material default). Material's `.mat-mdc-menu-item:link` rule beats the global `a { color: accent }`, so it reads in menu text colour like its neighbours.

## Issues (by severity)

| # | Severity | Issue | Fix | Accept check |
|---|---|---|---|---|
| 1 | Minor | Entry bullets render as **hollow circles**. The `<ul class="bullets">` is nested inside the `<ol class="entries">`, so the browser gives it the second-level `circle` marker. They look like unchecked radio buttons next to a theme radio group, and nowhere else in the app uses them. | In `changelog-page.ts` styles: `.bullets { list-style-type: disc; }`. You could also set `::marker { color: var(--color-text-muted) }` so the dots sit back. | Computed `list-style-type` of `.bullets li` is `disc`; 1440 screenshot shows filled dots. |
| 2 | Minor | The footer link's **focus ring hugs the text** left and right (the link has no horizontal padding, only `min-height: 44px`). The ring is 2px teal and clearly visible, but it touches the first and last letter. | `.footer-links a { padding-inline: var(--space-1); }` in `app.scss`. If it shifts the row, offset it with the `ul` gap. | Tab to `What's new`: the ring has visible space on both sides of the text, in dark and light. |
| 3 | Nice-to-have | The footer link gets **no `aria-current="page"`** while you're on `/changelog`. The main tabs don't show it either here, because `/changelog` isn't a tab. Screen-reader users get no "current page" cue. Not a WCAG failure. | Add `routerLinkActive` with `ariaCurrentWhenActive="page"` on the footer link. H-180 should do the same on `Privacy notice`. Optional: a quieter style (text colour, no underline) for the current link. | On `/changelog` the snapshot shows `link "What's new"` with `aria-current="page"`; on `/` it does not. |
| 4 | Observation | The page column is **centred** (h1 at x=432 at 1440 px) while Decks, Collection and Tournaments line up left with the wordmark (x=152). This is what LOG-071 asks for ("centred like `/privacy`"), and a centred reading column suits a text page. But `/privacy` doesn't exist on this branch yet. | No change now. When H-180 builds `/privacy`, use the same `:host { max-width: 65ch; margin: 0 auto }` pattern so the two text pages match. A shared `.prose-page` class would also work. | `/privacy` and `/changelog` h1 share the same x at 1440. |
| 5 | Observation (account menu, not seen live) | `What's new` comes right after the three Theme radios. The radios are indented by their check column and `What's new` is not, so it should read as a separate item. I couldn't confirm this visually without a sign-in. | The validator or RJ opens the menu once while signed in. If the link looks like a fourth theme option, add `margin-top: var(--space-1)` above it (no new divider: SYNC-151 caps it at 3). | Signed-in screenshot of the open menu at 1440 and 390, dark and light. |

## WCAG 2.1 AA notes
- **1.4.3 Contrast (measured on page bg):**

  | Text | Dark | Light |
  |---|---|---|
  | Body / bullets | 13.49:1 | 15.32:1 |
  | Muted (intro, meta, `Coming soon`) | 6.48:1 | 5.91:1 |
  | Footer link | 8.90:1 | 5.05:1 |

  All pass.
- **1.3.1 Info and relationships:** one h1, then h2 per entry, with no gaps. Entries are an `ol`, bullets a nested `ul`. The `·` separator is `aria-hidden`. The landmarks are `main` (the skip-link target), `contentinfo` and `nav "Footer"`. The accessibility tree reads: heading 1 "What's new" > list > listitem > heading 2 "Accounts are here", "Version 0.0.1", "Coming soon", list of 5.
- **2.1.1 / 2.4.3 Keyboard and focus order:** Skip link, wordmark, Decks, Collection, Tournaments, Sign in, Theme (one roving stop), What's new. The skip link moves focus into `main`, and the next Tab goes to the footer (the page has no focusable content). The order is logical.
- **2.4.7 Focus visible:** the 2px `--color-focus` ring shows on the footer link in both themes (see issue 2 for spacing only).
- **2.5.5 target size (AAA, and the project's 44px rule):** the footer link is 71 x 44 px and menu items are at least 48 px (Material). Pass.
- **1.4.10 Reflow:** 320 px has no horizontal scroll and the text wraps. Pass.
- **2.3.3 / reduced motion:** the page adds no motion of its own. The route transition already rests under the global reduced-motion block.

## Screenshots (outside the repo, scratch)
`h202-1440-dark.png`, `h202-1440-light.png`, `h202-1024-dark.png`, `h202-768-dark.png`, `h202-390-dark.png`, `h202-320-light.png`, `h202-320-light-footer.png`, `h202-1440-footer-focus.png`. Note: the full-page light shots show a grey header and a mid-page tab bar. Those are capture artifacts of the sticky translucent header and the fixed bar in full-page mode. Viewport shots look correct.
