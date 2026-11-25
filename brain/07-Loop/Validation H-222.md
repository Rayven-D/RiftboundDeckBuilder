# Validation H-222

2026-11-25 · H-222 · PASS · V-008 (lint, build, test), diff scope, selector scoping, token existence · failures: none

## Checks run
- `npm run lint`: all files pass.
- `npm run build`: complete, no errors.
- `npm test -- --watch=false`: 65 files, 891 tests passed (includes the new disc test and the `aria-current` test).
- Diff scope: only `changelog-page.ts` (`list-style-type: disc` plus muted `li::marker`), `app.scss` (`padding-inline: var(--space-1)`), `app.html` (`routerLinkActive` + `ariaCurrentWhenActive="page"`), two spec files, and brain notes. Nothing under `web/public/` or `brain/Build Matching.md`.
- `.active` on the footer link: the only `.active` rules in `app.scss` are scoped to `.site-nav a` and the phone tab bar, so the footer link gets no main-nav styling.
- Footer link keeps `min-height: 44px`, `display: inline-flex` and its wrapping.
- Tokens: `--space-1` (0.25rem) exists in `styles.scss`; `--color-text-muted` exists in both themes (#9aa3ad dark, #56606b light).
- Tests: the disc test asserts computed `list-style-type` is `disc`. The `aria-current` test checks `/` null, `/changelog` `page`, `/decks` null.

## Not run
- Focus ring "both themes": judged from CSS only. The global `:focus-visible` ring is 2px with a 2px offset in `--color-focus`, and the link now has 0.25rem side padding. The ring stays clear of the text in either theme because the ring colour is a token. A visual check rides on RJ's review gate H-221.
- Account-menu check ("What's new" not reading as a fourth Theme option): needs a signed-in browser session and is not covered by the Accept column. Left to H-221.

New board items: none.
