---
tags: [validation]
item: H-244
---
# Validation H-244

2026-11-25 · H-244 · PASS · V-009 (numbering, GWT, wikilinks, versions), quote check against [[Brief H-245 H-246 H-247]] and RJ's 2026-11-25 decisions, version-pin grep over `brain/` and `web/`, cross-spec conflict grep (theme, footer, menu), AC testability · failures: none blocking; 2 minor leftovers filed as H-248

- **Versions:** SPEC-010 0.16.1 to 0.17.0, SPEC-007 0.13 to 0.14, SPEC-005 0.7 to 0.8, SPEC-012 0.1.1 to 0.1.2; frontmatter equals the Spec Index rows. Pin-only: SPEC-008 (SPEC-005 0.8, SPEC-007 0.14), SPEC-013 Test Data (SPEC-007 0.14, SPEC-010 0.17.0), SPEC-011 row (SPEC-007 0.14), SPEC-012 row (SPEC-010 0.17.0).
- **Stale pins left (acceptable):** `Collection Import` and `Deck Import` pin SPEC-010 0.14 in their history lines (nothing they use changed). **Report only, not spec-owned:** `brain/Current State.md` still shows SPEC-005 0.7, SPEC-007 0.13, SPEC-010 0.16.0 (orchestrator). No API Contracts pins found to these specs in `brain/02-Specs/`; `web/` has none.
- **Quotes:** the RJ quotes in SYNC-150 g, 151, 157, 158, decision 22 and the Changelog entry agree with the brief and the orchestrator's summary; the signed-in tab (no label, enlarged avatar) is quoted as RJ's, and the 40 px, the "Sign in" label, the icon-button form, the 16 px dock gap, the stray-value removal and live OS following are all marked as not RJ's words (decision 22, Open question 15). No over-claimed status or `as_of` (status stays `draft` / `review`).
- **Cross-spec:** Changelog LOG-010, LOG-013, ACs 2 and 3 no longer name the footer switch or menu Theme; SYNC-003, 104 d/e, 151 item 6 withdrawn with 3 dividers still true (4 groups); COLL-094 (d) / OWN-094 agree (16 px above the footer, room above, no band below, snack bars above).
- **Privacy Notice Draft** ("light, dark or system", line 127) left as Open question 15 (f): ACCEPTABLE. The notice is `review` and awaits RJ's re-approval of its wording, the spec flags it in the Spec Index and in Impacts, and the change is one word. Note for later: the built `web/src/app/core/privacy/privacy-notice.md` line 55 copies it, and `web/src/app/app.spec.ts` line 38 still asserts the footer Theme switch (both are H-246 / post-approval work).
- **ACs testable:** 54, 68, 69, 71, 72, 77, 79, 81, 82 each have Given/When/Then with measurable values (px, aria attributes, storage key, tab order).
- **Minor, filed as H-248:** "below 40rem" in the spec vs "at 640 and below" in AC 71 and `max-width: 40rem` (inclusive) in `app.scss`; ADR-0006 and Brief H-175 still say Theme "light / dark / system" without a pointer to decision 22.
- Nothing run in code (docs-only change).
