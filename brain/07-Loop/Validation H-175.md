---
tags: [validation, loop]
---
# Validation H-175

2026-11-24 · H-175 · **PASS** · ui-engineer design brief (uncommitted on `loop/H-175-header-brief`): new [[Brief H-175]], edits to [[UI Index]] and [[Collection]] (checked with `git diff --ignore-cr-at-eol`). Docs only, so no code checks apply (V-008 not in scope).

## Checks run
- **Accept: brief in `brain/04-UI/` with acceptance points, RJ review gate.** `Brief H-175.md` (status `rj-review`, 8 open choices for RJ, "waiting for RJ's review gate"); 16 numbered acceptance points, each checkable in a Playwright pass at named widths (1440 / 1024 / 768 / 390, plus 641 and 320), dark and light. PASS.
- **Every ADR-0006 "Header and import entry points" decision honoured or flagged.** Display name, not unique, editable (U3, A1); theme per device, default system, not synced (T1); FAB bottom right on Collection (F1, F2); "Import deck" on Decks (D1); dialogs, landing stays on the page (F8, D1); Import tab gone from the phone bar (B1); `/import` removed (section 9). Deviations flagged: not-found page (router has only `**` to `/`, so recommends Home, for spec-writer to settle); username storage (ADR "stored with the account" vs SYNC-012 "no name" / SYNC-100 "display name stays in Firebase Auth": U6 recommends Auth `displayName`, checked against the SYNC-100 text). Sign out is kept in the menu and on the settings page (ADR lists it in both places). PASS.
- **No unflagged contradiction with ADR-0007 amendment 2 or SPEC-010 0.12.** Account-only gating (SYNC-009) applied to `/account` and the FAB; the FAB is hidden while the gate is closed; SYNC-142 "clear every local store" is called out so H-174 names the theme key as a device setting outside the cache (T1); SYNC-003 "Delete moves when Settings is built" is honoured (M4); SYNC-006 return path keeps `?add=1` / `?import=1` (section 9); the `catalog-error` FAB case is raised for H-174 (F6). PASS.
- **Acceptance points concrete.** Pixel and ratio values given (44px, 56px, 16px above the tab bar hairline, 40rem column, 14rem max name width, tab order, contrast 5.81 / 5.47). The tokens it cites exist in `web/src/styles.scss` (`--tabbar-height`, `--tabbar-border`, `--shadow-lift`, `--content-max-width`, `--content-gutter`, `--color-accent-hover`, `--color-accent-contrast`). The 5.81 / 5.47 ratios were not recomputed. PASS.
- **Copy for every control.** Sections 1 to 10 plus the all-strings table (section 11) cover header, menu, settings sections, username dialogs and errors, FAB, empty states, drop overlays, Decks button, Home buttons, sign-in intro. PASS.
- **Accessibility.** Accessible names (H4, A1, F7), `aria-haspopup`, focus return (F8, D1, U4), focus ring H-139, 44px / 56px targets (AC 16), reduced motion (H1 chevron, F3, T4, AC 12), keyboard order (F7, AC 10), non-colour selection (A2), error semantics (U5). PASS.
- **V-009 wikilinks.** Every `[[...]]` in the three changed files resolves to a live note: 0 unresolved.
- **Evidence.** The four `h175-collection-*` screenshots exist in `.playwright-mcp/`. The brief says the browser defaulted to light, so the file named `...1440-dark.png` is a light capture (the brief's own text says so). Not a defect.

## Non-blocking notes (no board item)
- [[Collection]] COLL-074 row says removal of the H-154 More menu item is "builder work, see [[Brief H-175]]", while H-172 already lists it; the brief's phone More-to-icon-button change belongs to H-176. The orchestrator can split this when it files the build list.
- The UI Index "Account and sync" row still describes the old Sign in button left of Import. It is a built-state description, superseded by the new H-175 row.
- The signed-in header, menu and filled grid were designed from code (no Auth emulator); H-176's Playwright pass covers them.

## Failures
None. No board items filed.
