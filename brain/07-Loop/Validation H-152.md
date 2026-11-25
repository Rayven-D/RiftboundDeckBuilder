---
tags: [validation, loop]
board: H-152
as_of: 2026-11-25
---
# Validation H-152 (SPEC-010 v0.13: privacy notice, SYNC-101/103/104)

2026-11-25 · H-152 · **PASS** · V-009 (frontmatter, numbered requirements, Given/When/Then, wikilinks), checklist coverage, truth check against code/specs, version and pin consistency · 0 blocking failures, 4 non-blocking follow-ups.

## Checks
- **Checklist coverage:** all 24 items of [[Privacy Notice Requirements]] "Checklist" appear in SYNC-103 (1-24, same numbering). Items 1-22 are in [[Privacy Notice Draft]] (23 links and 24 Google sign-in are correctly outside the page text; the draft's "Not in this text on purpose" says so). Auth IP and user agent, us-south1 (Dallas), 180 days, DNT/GPC, no cookies, Riot line (verbatim, matches `web/src/app/app.html` footer), under-13s, card-image host (conditional on H-020) all present.
- **No overreach:** unverified research rows (GDPR applicability, COPPA 2025, Spark DPA, Firebase business-use wording) are not stated as law; legal basis, "one month" and console-access sentences are marked Confirm.
- **Truth vs code/specs:** `us-south1` matches `firebase.json` and ADR-0007; email-link only matches H-063; noreply sender matches the board note on H-063 (authDomain `riftbound-deckbuilder.firebaseapp.com`); no analytics or cookie code found in `web/src`; `rift.` keys and `rift.emailForSignIn` match SYNC-141/SYNC-006.
- **ACs 65-70:** Given/When/Then, testable (strings to find, link placement, new-tab behaviour, DevTools launch check). Menu order matches Brief H-175 decisions.
- **V-009:** frontmatter present on both notes; every wikilink in the four changed brain notes resolves (scripted check, 0 unresolved); no broken multi-line link. Version 0.13 in frontmatter, Spec Index row, changelog and body "What v0.13 changes" agree; `board:` lists H-152; `research:` lists the new note. Open question 10 vs decision 10 confusion is explained in a note; decision 10 is closed in v0.13.
- **Approval gate:** recorded in the draft (`status: review`, "not yet" rows) and tied to SYNC-007 condition 2 and AC 70.
- Code checks (tests/build): SKIPPED (docs-only change).

## Non-blocking follow-ups
1. spec-writer, draft: "Rift Builder sets no cookies" is stated as fact, but research fact 25 says in-browser confirmation is unverified. Add a "Confirm after DevTools check" mark (AC 70 covers the check, the draft text does not show it).
2. spec-writer, draft: "Nothing about you when you only visit Home or Tournaments" and "Nobody else receives it" ignore that Firebase Hosting (Google) serves those pages and sees the visitor IP in ordinary request logs. Soften to "we store nothing about you in the cloud" or name Hosting for visits.
3. spec-writer, draft: "replies are not read" for the noreply sender conflicts with the H-063 console step that sets reply-to to a support inbox. Reword once RJ decides.
4. orchestrator: builder item for the `/privacy` page and links (SYNC-104, ACs 65-70) is described in the spec ("H-152 build") but has no row on the Handoff Board yet; file it (depends: none for code, production still waits on RJ approval).
