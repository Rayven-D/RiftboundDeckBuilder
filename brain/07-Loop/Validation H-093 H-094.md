---
tags: [loop, validation]
item: H-093, H-094
date: 2026-11-24
round: 1
result: PASS
---
# Validation H-093 and H-094: sign-in panel header and text (SPEC-010 v0.9, RJ decision 14)

Scope: uncommitted tree on top of `d3bb2cf` (`git diff HEAD`). [[Accounts and Sync]], [[Spec Index]], the
archived [[Accounts and Sync changelog]], [[UI Index]], [[Session Log]], the board status of H-093,
`web/src/app/core/sync/sign-in-panel.ts` and `web/src/app/pages/gated-pages.spec.ts`.

## Result
2026-11-24 · H-093 · PASS · Accept (SYNC-009 and AC 46 state both), V-009 (version, pins, changelog, old strings, wikilinks) · failures: none
2026-11-24 · H-094 · PASS · Accept (AC 46 with the new text), V-008 (web): lint clean, build OK, `npm test` 23 files / **341 passed** · failures: none

## H-093 (spec-writer)
- **SYNC-009:** "keeps its page header (the page title and description) at the top; everything below the header is
  replaced by a sign-in panel (RJ decision 14)". The signed-out text is "exactly: 'You need a free account to import cards or
  decks.'" The lost-session text and the panel headings are unchanged. OK.
- **AC 46:** each URL "shows its page header (title and description) at the top and, below it in place of the page
  content, its sign-in panel …", and the text is "exactly 'You need a free account to import cards or decks.' (no other
  sentence)". OK.
- **Decisions:** item 14 added, with its source (RJ 2026-11-24, board H-093) and scope. The Summary key-rules line is updated too. OK.
- **V-009:**
  - The frontmatter has `version: 0.9`, `board` + H-093, and `updated: 2026-11-24`.
  - The changelog "Current" line is 0.9, and a 0.9 entry is in the archive note.
  - [[Spec Index]] has SPEC-010 at 0.9.
  - No other spec pins a SPEC-010 version. The "v0.8" mentions left in ADR-0007, [[Current State]] and board rows describe v0.8 content and are not pins.
  - Requirement and AC counts are unchanged. The new text adds no wikilinks; the ones touched resolve.
- **Old string:** "Tournaments are open to everyone" / "…cards and decks. Tournaments…" now appears only in quoted
  places: Decisions 14 ("is dropped"), the archive changelog ("was …"), and the H-093 board row. It is gone from code and tests. The panel
  heading "Sign in to import cards and decks" is a different, unchanged string. OK.
- Nit (not a failure): the SYNC-009 row still opens with "pending build, H-081" (built) and says the text is "pending build, H-094". The spec-writer can drop both on the next SPEC-010 edit.

## H-094 (builder)
- `GATE_TEXT.signedOut` = `'You need a free account to import cards or decks.'` OK.
- In `gated-pages.spec.ts`, the AC 46 `it.each` over the four URLs now asserts the constant **and** that the panel's
  `<p>` text equals it exactly (so there is no other sentence). The new `it.each(GATED_HEADERS)` checks, for `/collection`, `/decks`,
  `/decks/:id` and `/import`, that the `header.page-header` h1 is the page title, the lede is non-empty, and the
  panel follows the header in document order and is outside it. These are real DOM checks of both halves of
  decision 14.
- [[UI Index]] row: "Page header above the panel: decided (RJ decision 14)" plus the new text. OK.
- V-008 (web), rerun by the validator: `npm run lint` all files pass; `npm run build` OK; `npm test -- --watch=false`
  23 files, 341 passed (matches the builder).

## Follow-up in other reports
[[Validation H-081]] builder gap 3 (gated pages keep their h1 above the panel) is now marked **resolved** by RJ decision 14.
