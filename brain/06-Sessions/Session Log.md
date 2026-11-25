---
tags: [sessions]
---
# Session Log

Newest first. One short entry per working session.

Older entries: [[Session Log 2026-11-23 (early)]] (archived).

## 2026-11-24: Self-starting loop (orchestrator)
- Did: renamed the project command `/loop` → `/board` so it stops hiding Claude Code's built-in `/loop` (`/loop /board` now reruns the board on its own). Gates 1–4 now **park** the item as `needs-RJ` and the run carries on; only gate 5 (destructive / outside services) stops it. Preflight allows untracked files. Nightly scheduled task `rift-builder-nightly-board` (desktop app, 02:05 local, Auto mode) runs `/board 5`, never pushes.
- Notes: [[Loop Protocol]], [[board]], CLAUDE.md, ADR-0002 driver line. H-042 (weekly research refresh) is still open.

## 2026-11-24: Runes are cards, H-098 (builder)
- Did: removed every rune exception from the deck engine (`runes.ts` deleted; `COUNTED_ZONES` = `ZONE_ORDER`; `canLock` `no-cards` only for an empty deck, "Lock in needs at least one card"; runes allocated, summed, missing and copied under `Rune Pool:`; `OwnershipCard.isRune` gone) and from Collection (`CardSummary.isRune`, the dialog's rune line, styleguide rune sample, sample decks). Parser and CSV exporter unchanged (they never skipped runes).
- Tests: `runes-are-cards.spec.ts` replaces `runes.spec.ts` (SPEC-005 ACs 7, 8, 17–19; SPEC-008 ACs 12, 17, 18; SPEC-007 AC 25); AC 12/15 in `shared-pool.spec.ts`, OWN-028 in `deck-ownership-view.spec.ts`, A6 + COLL-089 in `collection-view.spec.ts`, SPEC-003 AC 42 in the parser and export specs. Lint clean, build OK, 425 web tests green. The Accept search in `web/src` finds nothing.
- Notes: [[Collection]], [[Collection Components]], [[API Contracts]] v1.8. H-098 → `verify`. Uncommitted on `loop/H-086-collection-page`; nothing staged.

## 2026-11-24: Runes are cards, H-097 (spec-writer)
- Did: recorded RJ's decision ("Allow users to import runes as well and treat them like any other card.") in ADR-0006 and the Decision Log; withdrew SPEC-009 (v0.3, RUNE-001…010 → replacement table); SPEC-003 0.9 IMP-071 + AC 42, SPEC-005 0.5 OWN-028/029 (OWN-022a withdrawn) + ACs 7/8/17 rewritten, 18/19 new, SPEC-007 0.8 COLL-089 (COLL-087 withdrawn) + AC 25, SPEC-008 0.4 SHARE-006 + ACs 12/15 rewritten, 17/18 new; changelogs, Spec Index, Current State; H-060 text updated.
- Migration: none (no schema bump); runes not in the collection show as missing; no one-time notice (default, open question for RJ).
- Open: H-098 builder (engine, Collection dialog, tests, brief lines), H-099 researcher (rune printings in the API, needs H-020). SPEC-010 still pins SPEC-009 (left for H-074). No files outside `brain/` changed; nothing committed.

## 2026-11-24: Collection code-review fixes, H-086 (builder)
- Did: fixed the 7 RJ-approved code-review findings on `loop/H-086-collection-page` (uncommitted): styleguide Clear confirms and deletes only sample decks (`rift.dev.sampleDecks`); load sequencing + one reload per frame for storage bursts; unreadable-decks notice and dialog line; serialised view-state saves; known battlefield orientation in `app-card-art`; dev sample generator behind a dynamic `import()`; singular CSV notice.
- Checks: lint clean, build OK, 413 web tests green (10 new; the 3 page tests fail on the old code). `sample-data` is only in a 3.4 kB lazy chunk, not in `main` or `collection-page`.
- Open: H-096 (spec-writer records the singular export notices in SPEC-003). Then the RJ gate for H-086.

## 2026-11-24: Collection review fixes, H-095 (builder)
- Did: fixed all 9 items of [[Collection Review H-086]] on `loop/H-086-collection-page` (uncommitted): no view transition on search or sort (URL via `Location.replaceState`; transitions are never skipped, so no AbortError), landscape art shown whole, `<button class="button">` border reset, 44px phone targets, the lock band at 320, the teal focus ring on Material icon buttons, the corrected "None of your decks" copy, `scrollbar-gutter: stable`, eager images for the first screen (NG0913).
- Checks: lint, build, 403 web tests green. Headless Edge, dark and light, reduced motion on and off: 0 transitions for query changes, 1 for a tab change, 0 console errors.
- Next: ui-engineer re-check at 1440 and 390, then the RJ gate for H-086.

## 2026-11-24: Collection page built, H-086 (builder)
- Did: built `/collection` from [[Collection]] rev 3 and [[Collection Components]] on `loop/H-086-collection-page` (uncommitted): tiles per entry, `×N` badge, card-level lock band, read-only card dialog, search + three sorts in URL and memory, CSV export (SPEC-003 AC 35 exact), Unresolved cards, window virtual scroll by rows. New components and tokens shown on `/styleguide`, with a dev-only sample loader (fixture or 5,000 generated entries).
- Checks: lint, build, 395 web tests green (49 new, named by requirement ID). Headless Edge at 1440 / 1024 / 768 / 390, dark and light, fixture and 5,000 entries: 7/6/4/2 columns, no sideways scroll, about 9 rows in the DOM, no console errors.
- Changed notes: [[API Contracts]] v1.7 (Collection page section), board H-086 → `verify`.
- Open: H-087 (import landing, S10 wording), H-091 (deferred SPEC-007 parts), ban data has no web source yet (dialog shows "Ban status unknown"), the 320px two-column rule needs tiles under 144px. ui-engineer review, then RJ gate.

## 2026-11-24: Card keyword explanations, H-089 / H-090 (spec-writer → researcher → spec-writer)
- Did: spec-writer set up the spec task. riftbound-researcher wrote [[Card Keywords]] (28 keywords; 24 confirmed on official Riot pages; 0 definitions checked against the official PDF; the API documents only `keywords: List[string]`; Riot's policy doesn't clearly allow rules text from outside the API). spec-writer finished [[Keyword Explanations]] SPEC-011 0.2.1: 33 requirements, 23 ACs. Validator: H-089 PASS round 2, H-090 PASS round 3 ([[Validation Runs]]).
- Changed notes: [[Card Keywords]], [[Keyword Explanations]], [[ADR-0008 Keyword Glossary Source]] (proposed; recommends A + ask Riot), [[Decision Log]], [[Spec Index]], [[Research Index]], [[Change Feed]], board.
- Open questions: H-092 (RJ) decides ADR-0008 and SPEC-011 RJ-1 (hide keywords with no definition vs show "No definition yet"). SPEC-007 still needs a pointer to SPEC-011 (H-091).
- Next: H-093 (builder) builds the unblocked engine and the hidden section on fixtures. H-094 (research, PDF check) runs only if RJ picks option (b). H-020 re-checks the keyword string format. No code touched, nothing committed.

## 2026-11-24: Collection brief approved
- RJ approved [[Collection]] rev 3 (one tile per printing) and answered every open choice: "ALL cards available" = cards the user owns; no badge at 1 copy; Could fit in = unlocked decks using the card with the a-of-q chip; ban status in the dialog only; an import lands on Collection with Undo.
- H-086 (builder) is now `todo`; the import-landing / missing-catalog parts still wait on H-087 and the deferred SPEC-007 parts on H-091.

## 2026-11-24: Collection page design brief (ui-engineer)
- RJ asked for the first brief: [[Collection]] (`status: proposed`), linked from [[UI Index]]. Read SPEC-007 in full, SPEC-003 Replace / Undo / export, SPEC-008 SHARE-034, SPEC-010 where it touches the page.
- Looked at the running app (Playwright, dev server stopped after): Collection placeholder at 1440 (light), 1024 (light), 768 and 390 (dark), `/styleguide`, Import and home at 1440 dark. Screenshots in `.playwright-mcp/` (not git-ignored; untracked).
- Design: art grid by default (list toggle proposed), filter rail from 64rem, sticky toolbar, detail sheet with stepper / tags / full art, nothing dimmed in Collection, one-sentence summary instead of stat tiles, virtual scroll by rows with the existing `@angular/cdk`. Every state, all copy (spec strings verbatim), confirmations with `shortfallWarning()` text, keyboard map, requirement map, acceptance points A1–A23.
- Measured: `--color-border` is 1.29:1 (dark) / 1.42:1 (light) on the surface, too low for control edges (WCAG 1.4.11); proposed `--color-border-strong` `#727D89` / `#7F8994` (≥ 3:1).
- Filed H-086 (builder, build the page, blocked on RJ approving the brief), H-087 (spec-writer: import landing / Undo placement, missing catalog, layout preference, tag-limit wording), H-088 (builder P3: placeholder art hard-codes the old blue `#3a5f7d`). Six open choices for RJ in the brief.
- Same day, RJ's review: "much simpler". Brief rewritten as rev 2: image-only full-color tiles (one per card), `×N` total badge, lock band "2 locked in <deck>" / "3 locked in 2 decks", read-only card dialog (You own N, Locked in, Could fit in with the existing availability chip, ban, keyword slot). The spec parts it no longer covers are listed in its §9. H-086 and H-087 rewritten; new H-089 (researcher: sourced keyword glossary), H-090 (spec-writer: glossary data vs the Riot-data-only rule), H-091 (spec-writer: SPEC-007 simplification decisions).
- RJ picked one tile per printing (SPEC-007 COLL-011 stands). Brief rev 3: badge = copies of that printing (none at 1); the lock band is card-level ("2 of this card locked in <deck>") on every printing tile, because the engine holds copies per `cardKey` only; dialog opens on the clicked printing with "You own N across all printings". H-086 and H-091 rows updated.
- RJ approved rev 3; builder started H-086. Wrote [[Collection Components]] (handoff per component: tokens incl. `--color-border-strong` / `--lock-scrim` / `--tile-min`, sizes per breakpoint, states, accessible names, roving-tabindex grid, dialog, page states, copy), linked from the brief and UI Index.
- Reviewed the built page (H-086) at 1440/1024/768/390/320, dark, light, reduced motion, keyboard, 5,000 entries: [[Collection Review H-086]]. Not ready for RJ yet: 4 blocking fixes (view transition on every search + console AbortError, cropped landscape battlefield art, UA border on `button.button`, phone targets < 44px) and 5 polish, filed as H-095. Verdict on 320px: keep 2 columns (~138px tiles); brief and Components updated.
- Re-checked H-095 (all 9 fixes) at 1440 / 390 / 320-equivalent, dark, light, reduced motion: all pass, console clean (no AbortError, no NG0913). H-095 Result added; Collection is ready for the RJ gate.

## 2026-11-24: New agent ui-engineer (design advisor)
- RJ asked for a UI/UX engineer agent that uses every installed UI/UX skill and plugin. Added [[ui-engineer]] (`brain/Agents/ui-engineer.md`, installed in `.claude/agents/`).
- RJ: `builder` stays the only agent that writes code. `ui-engineer` only guides: design briefs in `04-UI/` before a build, critiques and accessibility audits after (Playwright at 1440 / 1024 / 768 / 390, dark, light, reduced motion), and RJ's sparring partner for ideas. Every change it wants becomes a `builder` item.
- Skills it uses per step: user-research / research-synthesis, frontend-design, design-taste-frontend (home page and polish reviews), design-system, dataviz, ux-copy, accessibility-review, design-critique, design-handoff.
- Updated CLAUDE.md team table, [[Loop Protocol]] owners, `/loop`, [[validator]] routing, [[builder]] (reads briefs; Skill tool + design skills section now in the tracked copy too), Agents README, Handoff Board owners.
- The design plugin's Figma / Notion / Linear / Slack connectors need `/mcp` sign-in before the agent can use them.

## 2026-11-24: H-085 fluid UI pass, teal accent, phone tab bar (builder)
- RJ's brief: fluid pass + home redesign, teal (green as an alternative) instead of blue, fixed bottom tab bar on phones. Built on `loop/H-065-fluid-ui`; details, accent values and contrast ratios in [[Design Direction]] ("Fluid pass and teal accent").
- Teal `#14B8A6` (light `#0F766E`) with AA text and label tones; green preview via `html[data-accent="green"]` and a switch on `/styleguide`. Material theme, favicon SVG/ICO/PNG regenerated.
- Motion tokens and layer, Angular view transitions on `<main>` only, a global reduced-motion block. Sticky header aligned to the content edges; phone tab bar with `aria-current`. Home: full-screen hero, one-time deal-in + ownership fill, bands with one rhythm, the arrow-link row removed. Import: drop a file on a card or the text box (same upload path). Empty states have the deck mark.
- Lint, build, 164 tests pass (new: tab bar, drop → dialog, dialog drop). Component-style budget warning raised from 4 to 6 kB. Checked with headless-Edge screenshots at 1440, 1024, 768 and 390. H-085 → verify (filed as H-065 at first; that ID was already taken on `dev`, so the branch keeps the old name); RJ review gate.
- Same day (main session): installed the `design-taste-frontend` skill (project-level, `.claude/skills/`, reviewed; used as motion/layout reference only, Direction A kept). Merged `dev` into the branch (`9a026e5`, account menu moved into the new header row), then RJ approved: branch → `dev` (`38aab0b`), `dev` → `main` (`36ceb2c`, 346 tests, build clean), both pushed. The deploy drops `riot.txt` again (H-056). Open: validator run for H-085, RJ's teal vs green pick.

## 2026-11-24: H-058 family merged into one branch, PR to `dev` (with RJ)
- Merged `loop/H-058-shared-cards-lockin`, `H-050-spec004-bump`, `H-045-tags-column`, `H-049-spec-followups`, `H-059-lockin-engine`, `H-062-accounts-sync-build` into `loop/H-058-family-merge` (from `dev`).
- Version clash: H-045 keeps SPEC-003 0.7 / SPEC-007 0.6; H-049 renumbered to SPEC-003 0.8 / SPEC-007 0.7, its new ACs 35–40 → 36–41. SPEC-008 0.3 also holds H-059's 0.2.1 fix; SPEC-005 0.4.1. Board ID clash: H-059's H-069 → H-076 (H-062's privacy research keeps H-069), next_id 77. API Contracts 1.6.
- Validator FAIL (SPEC-003/007 frontmatter versions, stale renumbering text, Validation Runs order, H-061 Done row pipes, Done table > 10) → fixed. Code review: engine and store record types had drifted (`StoredTags` schema 2 vs 3) → builder made `shared/storage/records.ts` the single source. Lint, build, 339 tests green.
- Still open: H-074 (SPEC-010 follow-ups, incl. its stale pins) running in its own session; H-060 not built.

## 2026-11-23: H-058 shared cards + lock-in, runes, then sessions per item (with RJ)
- Researcher: [[Physical Copies Across Decks]]. The Chosen Champion shares the per-name pool with Main/Sideboard. RJ chose to count every physical section (Legend, Champion, Main, Sideboard, Battlefields) and to ignore runes.
- SPEC-008 [[Shared Cards and Lock-in]] and SPEC-009 [[Runes Assumed Owned]]. RJ accepted the five lock-in defaults and decided no force lock.
- Validator round 1 FAIL (missing When steps, filter overlap, cross-spec warning placement) → H-065..H-068; round 2 PASS. Code review: 2 nits, both fixed. Committed on `loop/H-058-shared-cards-lockin`. `loop/ui-direction-a` deleted locally (fully in `dev`).
- One session per remaining item: H-050, H-045, H-049, H-059 done on their own branches; H-061 grew into H-062 (build) and H-074 (still running). Merge plan and the SPEC-003/007 version clash are in [[Current State]].

## 2026-11-23: Hero note text, local deploy with riot.txt (with RJ)
- RJ shortened the home hero note to "Free". Committed on `dev`, merged into `main` (not pushed).
- Local `firebase deploy --only hosting` from `dev` with the uncommitted `web/public/import/riot.txt`, so it is served at `/import/riot.txt` again (H-056 still open: the next Actions deploy of `main` drops it).

## 2026-11-23: One `builder` agent replaces service-builder and ui-builder (with RJ)
- Checked whether spec-writer had been building. Its definition never said to, and it has no Bash, but spec-writer items still shipped code: H-058 (8 `web/` files for the "available" label), H-029 (page text, routes), and H-048 (spec work and parser in one commit). Much UI work also ran in the main session without a builder.
- RJ chose to replace both builders with one [[builder]] agent for UI, browser business logic and services. It keeps the RJ review gate for screens and the API Contracts rule, and must run lint, build and tests before it reports.
- [[spec-writer]] now has a "You don't write code" rule: spec changes that need code become `builder` board items. `/loop` dispatches only `builder` for code. Validator routes code bugs to `builder`.
- Open board items H-047, H-057, H-059, H-060, H-062 and H-064 moved to `builder`. Done rows keep their old owners as history. Updated CLAUDE.md, [[Loop Protocol]], [[Home]], the [[Agents/README|Agents README]], and the owner lines in UI Index, Design Direction and API Contracts. `.claude/` copies refreshed. Nothing committed.

## 2026-11-23: H-050 SPEC-004 version bump (spec-writer)
- SPEC-004 0.4 → 0.5 to record the H-044 lower-case "your decks" strings (CAT-070/074/076, ACs 16–18); archive changelog entry added. Pins → SPEC-004 0.5 in [[Spec Index]] (SPEC-004/005/006 rows), SPEC-005 and SPEC-006 Summary "Depends on" lines; SPEC-006 metadata-only changelog line. Validator PASS (V-009 + pins). H-050 → done. Branch `loop/H-050-spec004-bump`, no code.

## 2026-11-23: H-045 collection CSV export vs positional import (spec-writer, validator)
- RJ decided: the collection CSV export has **no Tags column** (tags and exclude flags are not in the CSV backup; sync per ADR-0007), and it **writes printing codes** (`2,Lightning Rush RAD 001`) so `byPrinting` round-trips. Unassigned, missing-printing and no-code copies go on a name-only row, the export re-parses each row before writing it, and counts above 999 split across rows.
- SPEC-003 0.7 (IMP-055, export rules 1–10, round-trip guarantee, AC 35), SPEC-007 0.6 (COLL-059 withdrawn, AC 24); changelogs, Spec Index, Current State updated.
- Validator: round 1 FAIL (AC row order, guarantee vs rule 7, no-code printings, 999-multiple rest row) → fixed → round 2 PASS. H-045 done. Follow-up for H-050: SPEC-005/006/008/009 still cite SPEC-003 0.6 / SPEC-007 0.5.

## 2026-11-23: H-049 spec follow-ups (spec-writer + validator)
- SPEC-003 0.7 (0.8 after the merge renumbering): import code behaviour written into the spec (interim CSV delimiter rule, decimal quantities, `2. Gust`, label-cell rows, seven upload checks with exact messages, upload kept/dropped, encoding rejection, row limit on the converted line, pre-catalog summary fields, Line grammar steps 3/5); IMP-050 split into MUST + IMP-050a SHOULD; new ACs 35–40.
- SPEC-007 0.6 (0.7 after the merge renumbering) / SPEC-008 0.3: an import Undo warns about locked decks inside the COLL-058 confirmation, or asks for one only on a shortfall (no notice after). H-060 wording updated to match.
- Validator PASS (strings probed against `parse-card-list.ts`, 157 web tests). RJ then decided: straight `'` in all UI messages (three import messages changed in code, 157 tests green) and Undo keeps the notice after it, with the warning before; every locked-deck warning ends "It stays locked." Validator PASS again. Committed on `loop/H-049-spec-followups`.

## 2026-11-23: H-059 shared pool / lock-in engine (builder, validator)
- Built the pure SPEC-008 / SPEC-009 engine and SPEC-005 v0.4.1 `computeDeckOwnership` in `web/src/app/core/decks/` (decision on the board: browser-only consumer, `services/` not hosted, `web/` can't import `services/`). Minimal SPEC-007 `deckOwnership` and SPEC-002 `banStatus`; `nameKey` moved to `web/src/app/core/cards/`; `tileOwnership` moved to core with a "… locked in" option. No new dependencies.
- Cycle: validator round 1 FAIL (split-card label: OWN-033 vs SPEC-005 AC 4 / SPEC-008 AC 6) → spec-writer made OWN-033 explicit and fixed both ACs (SPEC-005 0.4.1, SPEC-008 0.2.1, no behaviour change). Code review (/code-review high, then an independent reviewer): lock comparator made a total order, rune detection uses the pool's catalog, `banStatus` memoized (OWN-080 was ~430 ms with a real ban list), caller duties documented. Rounds 2 and 3 PASS; web lint / build ok, 217 tests.
- Changed notes: [[API Contracts]] (1.4, browser-side shared types), [[UI Index]], [[Your Decks Ownership View]], [[Shared Cards and Lock-in]], [[Validation Runs]], [[Handoff Board]] (H-059 done, H-060 blocked on Decks page only, new H-076 (H-069 on its branch)).
- Open questions: H-076 (numbered H-069 on its branch; ownership-unavailable values, unparseable `lockedAt`, per-card vs total shortfall). Branch `loop/H-059-lockin-engine`, committed, not merged or pushed.
- Next: Decks page, then H-060.

## 2026-11-23: H-061 accounts and sync spec (spec-writer + validator)
- New SPEC-010 [[Accounts and Sync]] v0.4 (88 rows, 36 ACs): optional sign-in behind `signInEnabled`, the [[Firestore Data Shape]] layout, device-local sync log with 30-day tombstones, latest change wins per card count / tag target / lock / deck (monotonic stamps), first sign-in Combine or Cancel, offline, sign-out, delete account, owner-only rules with field validation. Locks sync (`state/locks`, `{lockedAt|null, updatedAt}`).
- Validator FAIL ×3 (rounds 1–3: 6 + 4 + 2 blockers), PASS round 4 ([[Validation H-061]]). Spec Index and Current State rows added.
- Board: H-061 done; H-062 → todo (after H-071); new H-069 (privacy notice research), H-070 (`existsAfter()` billing research + Data Shape estimates), H-071 (SPEC-010 impacts on SPEC-003/006/007/008, ADR-0007), H-072 (V-011 `web/` adapter path), H-073 (RJ: 11 open questions). No code. Committed on `loop/H-061-accounts-sync-spec`.
- RJ answered all 11 questions (H-073): SPEC-010 v0.5 (89 rows, 38 ACs, new SYNC-077 same deck status on every device), validator PASS round 5. H-062 handed to `builder`.
- H-062 built (branch `loop/H-062-accounts-sync-build`): local stores, sync engine, Firebase adapters (lazy), account UI behind `signInEnabled`, owner-only rules. Validator FAIL round 1 (3) + code review (7 findings, incl. deleted-account mapping: emulator says `auth/user-token-expired` / `auth/invalid-refresh-token`), all fixed; PASS round 2. 271 web + 27 emulator tests (Java 21 = Android Studio JBR). New H-074 (spec follow-ups), H-075 (build leftovers).
- RJ enabled the Email link provider and filled in the Firebase web config. SPEC-010 v0.6: providers from build config `authProviders` (default email link; Google later by config). Build matches; validator PASS round 3 (278 web + 27 emulator tests).

## 2026-11-23: H-065 / H-066 / H-067 validator fixes for H-058 (spec-writer)
- When steps added to every flagged AC; SHARE-051 makes each deck one ownership group (empty / runes-only → None available, "No cards to count"); `no-cards` message; Deck 3 = `Kennen Aggro`; locked-deck warning now always inside the confirmation (incl. the IMP-050 Replace confirmation), Undo of an import is the only notice. SPEC-003 0.6, SPEC-005 0.4, SPEC-007 0.5, SPEC-008 0.2, SPEC-009 0.2, SPEC-006 pins only; Spec Index, Current State and changelogs updated; H-065/066/067 → verify. RJ's decisions unchanged; no code, nothing committed.

## 2026-11-23: Home page copy pass (ui-builder, with RJ)
- Rewrote `/` copy shorter and more casual; RJ picked the headline "Know what you own. Own what you need." and approved the rest from a before/after table. Unbuilt features (deck view, Tournaments) now say "coming soon". American spelling ("color").
- Ownership section: title "Collect the cards each deck needs.", text "Know what you need at a glance. Collect every copy you need of a card to fill it with color."
- Tournaments reframed as **Winning decks** ("Pick a winning deck to work towards."): tournaments exist to supply winning constructed decks to add as a goal. New `top-eight-panel`: events expand to their Top 8 as full Legend cards (placing, player, Legend name). Three layouts shown as screenshots; RJ picked swipe on phones and a grid on wider screens, then: same flow as Ownership, no cropping, panel no taller than Ownership's (8 across). 157 web tests.
- Reviewed on a Firebase preview channel and headless-Edge screenshots. RJ: pushed `dev` (`af8806a`), merged into `main` (`e8a4ae2`), Actions deployed; then a local hosting deploy put `riot.txt` back (H-056: still uncommitted, every Actions deploy drops it). Notes in [[Design Direction]] and [[Current State]].

## 2026-11-23: Firestore data shape and sizing (input to H-061)
- New [[Firestore Data Shape]] (05-Services): `users/{uid}`, `state/collection` (one document, per-card map), `state/tags`, `state/locks`, `decks/{deckId}`; `schemaVersion` / `updatedAt` / `syncedAt`, per-card and per-tag timestamps, 30-day tombstones, indexing off except `syncedAt`.
- Sizing: ≈ 95 KB per realistic user, ≈ 640 KB per heavy user; Spark supports about 1,300 DAU (writes bind) and about 7,000 accounts at a 90/10 mix. Free-tier limits checked on the official Firebase pages 2026-11-23.
- ADR-0007 gained a "Data shape" section. H-061 row updated with the layout; Current State links the note.

## 2026-11-23 (evening): bug fixes, deploy, Firestore
- Built, code-reviewed and validated H-046 + H-053 (parser: delimiter, one upload path, limits, encoding, summary), H-054 (skip link, card-art alt), H-055 (`/api` dev proxy, hosting rule). Each on a `loop/` branch merged into `dev`; 156 web tests.
- Pushed `dev` and `main` (RJ, no PR); GitHub Actions deployed `0b7e668`. Live check: the `!/api{,/**}` rule only excludes `/api/` on real Hosting.
- Hosting discussion: no server needed; card data as a static snapshot built in CI (proposed, ADR-0004 open). RJ chose Firebase for optional accounts: ADR-0007, Firestore `(default)` Standard in `us-south1`, rules deny all. Board H-061 (sync spec), H-062 (build), H-063 (Auth providers).
- Tooling: `.agents/` and the ingest snapshot ignored, `skills-lock.json` committed, `Untitled.base` deleted.
- Next: DB sizing and shape session for Firestore.

## 2026-11-23: H-058 shared cards, lock in, runes (spec-writer)
- RJ's decisions recorded in ADR-0006 "Shared cards, lock in and runes" (every physical section shares one per-name pool; runes ignored), plus Claude defaults RJ may change.
- New SPEC-008 [[Shared Cards and Lock-in]] v0.1 (available = ownedForDecks − held by other locked decks; earliest lock wins; short locks stay locked and flagged; no card edits while locked) and SPEC-009 [[Runes Assumed Owned]] v0.1.
- SPEC-005 0.3 ("available" labels, breakdown, runes out of counts), SPEC-006 0.6 (lock rules on edit/delete/duplicate), SPEC-007 0.4 (per-name pool note, runes never needed, shortfall warning). Spec Index updated.
- Board: H-058 → verify; new H-059 (service-builder, pure engine) and H-060 (ui-builder, Decks UI), both blocked; H-021 also checks for non-basic runes. No code touched, nothing committed.
- RJ accepted the five lock-in defaults (earliest lock wins, no yield to unlocked decks, short locks stay locked, no card edits while locked, Undo restores unlocked). RJ also decided no force lock (SPEC-008 open question 2); SPEC-008 has no open questions.

## 2026-11-23: spec catch-up H-043 / H-040 / H-044 + code review
- Verified the import code already does RJ's decisions (quantity required, .xlsx, deck CSV, spaceless labels, one dialog); specs updated to match: SPEC-003/006 v0.4.
- SPEC-005 v0.2 (Riot section order, CAT-045 labels, `deckOwnership(input, cardKey)`); SPEC-007 calls aligned. Screens renamed to Decks / Collection in specs and ADR-0006.
- Validator: all three PASS. Code review (web 54, services 88 tests green; no key or XSS issues) filed as H-045…H-056.
- RJ: deleted the broken Firebase workflows (H-051), removed the unused `firebase` dep (H-052); `riot.txt` is the Riot API verification file. H-048 decided and built: `x3 Name`, `Name x3`, printing codes (`RAD 001/167`); SPEC-003/006 v0.5, 105 web tests, PASS. Code resolution → H-057 (needs H-020).

## 2026-11-23: UI direction, Rift Builder, home page and imports (with RJ, Claude chat)
- H-023 decided: direction A with a blue accent `#378ADD`, B/C-style ownership chip, small source line, Import as a raised button, Angular Material, slight 4/6/8px corners, Archivo headlines.
- Renamed to **Rift Builder** (from Riftbound Deck Builder, briefly Rift Decks); tabs **Decks** / **Collection**; deck-stack favicon.
- Built: home page at `/` (ui-builder ideas, Rift Atlas as layout reference only), Import paste-or-upload dialogs with the shared parser, shared card art / tile / chip components.
- PR #2 merged into `dev`, PR #3 `dev` → `main`, Firebase deploy succeeded. Follow-up PR for two later commits.
- New board items: H-043 (import spec updates), H-044 (screen-name spec updates).

## 2026-11-23: /loop round 3 + lighter brain
- Gate H-036 answered (ADR-0006): Legend + pilot + placing names; In Your decks + Add another copy; per-printing collection with ×N badge; tags on printings; exclude-from-decks tags; Your decks grouped by name.
- PASS: H-030 (SPEC-006 v0.2), H-034 (SPEC-007 v0.2), H-035 + H-037 (SPEC-004 v0.3, legal_as_of = event start), H-008 (services scaffold, 88 tests; V-003 waits on the live payload).
- Lighter brain (H-038): [[Current State]], `Archive/`, reading order for all agents.
- Next: H-039 (spec summaries + clean-ups) and H-007 (SPEC-005 Your Decks Ownership View).

## 2026-11-23: /loop round 2
- RJ feedback applied first: straight button borders (H-027), "Your decks" rename + one-line descriptions (H-028), product model correction ADR-0006 (H-029, H-032), Import option cards (H-033).
- Done: H-015 (SPEC-001/002 v0.2), H-016 (SPEC-004 v0.2), H-017, H-018, H-019, H-025, H-026, H-031 (SPEC-007 v0.1).
- FAIL: H-030 SPEC-006 Deck Import contradicts SPEC-004 on Add to Your decks (source shape, default name, duplicates) and uses old field names. WIP kept on its branch.
- Stopped at gate H-036 (RJ decisions). The services scaffold H-008 is now unblocked.
