---
tags: [validation, loop]
board: H-200, H-181
as_of: 2026-11-25
---
# Validation H-200 and H-181 (SPEC-010 v0.14.2, [[Privacy Notice Draft]] 0.3)

2026-11-25 · H-200 + H-181 · **FAIL (1 spec-writer follow-up, small)** · V-009 (frontmatter, wikilinks, numbered requirements, G/W/T ACs, pins), content checks against H-182 / H-181 Accept, placeholder-rule consistency, research over-claim check · 1 failure

## Passed
- **H-182 answers applied:** controller "Rift Builder, an independent fan project" (Who we are; SYNC-103 item 1), contact `riftbuilder.support@gmail.com` (Who we are, Your choices, Your rights, Contact), no personal name in page text (RJ appears only in gate and instructions, not in the proposed page text), age 16 with no age check (Children; sign-in line "For ages 16 and over."; SYNC-103 item 20; SYNC-104 f), changes in the public changelog (Changes; SYNC-103 item 3; H-201 named), three original Confirm wordings kept (console access, legal basis, one month), effective and last-updated date `[set on release: date dev → main ships sign-in]` in both places.
- **H-181:** (1) "Rift Builder sets no cookies" is marked **Confirm** until AC 70, matching research row 25 ("in-browser confirmation" pending) and SYNC-103 item 12; (2) Firebase Hosting request logs named in "What we do not collect" and "Who receives it", hedged to "may keep standard ... logs", and flagged Confirm because no research row backs it (stated honestly in the draft and SYNC-103 item 6); (3) sign-in email replies go to `riftbuilder.support@gmail.com`, matching H-063 ("set it as the email-template reply-to") and the production gate.
- **Placeholder rule consistent** across SYNC-101 (check 1 `[RJ:` fails every build; check 2 `[set on release` production deploy and release step only), SYNC-007 condition 2 (date filled), AC 66 (dev/preview show the marker and pass; release check fails then passes after date replaced), AC 70 (production rule unmet while marker or no approval), and the H-180 row (same two-check wording, preview only).
- **No research over-claim:** `Privacy Notice Requirements` is unmodified (status partial, as_of 2026-11-24 kept); the draft and spec keep `status: review` / `draft`, say "not legal advice", and list unverified rows as open. Draft front matter version 0.3, as_of 2026-11-25.
- **V-009:** all wikilinks in the draft, SPEC-010, Current State, Spec Index and the changelog archive resolve (0 broken). SPEC-010 version 0.14.2 pinned in the spec header, Summary, changelog "Current", Spec Index, Current State and the changelog archive; draft spec pin "v0.14.2" matches. SYNC-101/103 numbered MUST rows; ACs 66, 67, 70 are Given/When/Then. AC 66's required strings ("no cookies", "Firebase Hosting", "public changelog", "under 16", "Dallas", "180 days", etc.) are all present in the draft text.

## Failure
1. **A blank is still in the page text, and the spec says there is none.** [[Privacy Notice Draft]] "Who receives it" still contains `[RJ/builder: image host name, e.g. Riot's image servers]` (and its italic "Keep only while ..." instruction). It is not caught by the literal `[RJ:` check, so the builder's build check (SYNC-101 check 1, AC 66) would let it ship, yet SYNC-101 says the page holds "exactly one kind of placeholder", SYNC-103 and the gate table say "no RJ-supplied blanks left", and H-200 Accept says no blank left but the release-day date. Expected: either the image host is named (H-020 decides the source) or the line is reworded into a form that cannot ship as a blank, and the check text and AC 66 name this marker (or the marker is changed to start with `[RJ:` so the check catches it); the approval-gate table and SYNC-101 then state it accurately. Actual: contradiction, and the "ready for RJ's final read" claim is slightly overstated. Everything else in the draft is clean.

## Follow-up (not filed on the board; for the orchestrator)
- **H-208 (spec-writer, P1):** resolve the image-host placeholder in [[Privacy Notice Draft]] "Who receives it" and align SYNC-101, SYNC-103 item 9, AC 66 and the gate table with it (needs H-020's current image source; ask researcher or RJ if unknown). Accept: a build check that fails on `[RJ:` also fails on this blank (or no blank remains); V-009 clean.
- Non-blocking: SYNC-007 text could name the release check script explicitly; it only says "date filled". Fine as is.
