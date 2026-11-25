---
tags: [loop, validation]
---
# Validation H-164 (SPEC-002 Deck Legality 0.4)

2026-11-25 · H-164 · **FAIL** (2 small fixes, docs only; the six points themselves match their sources)

Checks run: `git diff` of Deck Legality, Spec Index, Your Decks Ownership View, the archived changelog; each point against [[Ban List]] #8-9, [[Formats]] #8-9, [[Deck Construction Rules]] #16-18; pin grep over `02-Specs/`; V-009 wikilink script over the added lines (0 missing targets); V-006 freshness.

## Per point
| # | Verdict | Notes |
|---|---|---|
| 1 2v2 data | PARTIAL | 1 Legend / 14 cards / 7 battlefields, Radiance applies: matches Ban List #8 (verified, 2026-11-24). **But** the per-wave split (July 07-24: Called Shot, Draven, Scrapheap, Stealthy Pursuer + 5 battlefields; Sept 09-18: Ekko, Stacked Deck) is inferred from the Standard table dates and the old 6/5/1 hub table. The research note gives no 2v2 per-card dates, and the announcement says the list began as "the Standard list at that time" (which would include Fight or Flight). LEGAL-B11 declares the list `status: 'verified'` and AC 22 asserts counts as of 2026-07-23 / 2026-11-22 as data. Open question 9 admits the split is open, so B11 and the "2v2 content" section contradict it. Only the totals (14/7/1 now, 6/5/1 before 2026-11-23) are sourced. H-169 (full 2v2 list in Ban List) is still `todo`. |
| 2 Rotation | OK | C05 matches Formats #8 and its Residual line: start of 2028, Sets 1-5, `legalUntil` all `null`, OGS unconfirmed, Proving Grounds report not used, other formats not modelled; status partial kept; TR 601.3 called generic as the note says. AC 23 is testable. |
| 3 Promos / SAMPLE | OK | C07 and C10 match Formats #9 and DCR #17, with the community-db (TR 601.2) caveat and status partial; SAMPLE flag marked BLOCKED (H-020, SPEC-001). Behaviour of C07 and AC 17 is the same as 0.3.1 (only the wording changed). C10 is new but inert until a field exists. AC 24 can't run yet (flag undefined), marked as such. |
| 4 Signature cap | OK | LEGAL-006 safe reading = Main Deck at any time, `partial`; 006a stays `warning`, `unverified`, "do not upgrade". Matches DCR #16. AC 25 testable. |
| 5 Battlefield domains | OK | 012 says "sample only, full check H-020", `partial`; `domains: null` stays `not_evaluated`. Matches DCR #18. AC 26 testable. |
| 6 Zone-less dates | OK | B12 matches Ban List #9: not published; the "start of date in local time" assumption is flagged as an assumption and banned from user text. AC 27 testable. |

## Other checks
- No silent behaviour change: C01's `excludedSets` definition is reworded, not changed. C07 and AC 17 give the same verdict as before. B02, R01-R08 untouched. New C10 (SAMPLE) and B11 (data only) are the behaviour additions, both listed.
- `status: review` is warranted (legality behaviour: SAMPLE exclusion, promo rule, 2v2 data).
- Version 0.4 in frontmatter, Spec Index row, changelog entry and "Version" line agree. Spec Index rows for SPEC-005/006/007 say SPEC-002 0.4. SPEC-005 body and its data-contract comment say 0.4.
- V-009: all new wikilinks resolve; Given/When/Then present for ACs 22-27.
- V-006: Ban List, Formats and Deck Construction Rules all `as_of: 2026-11-24` (1 day), within the 14-day limit.

## Failures
1. **Inferred 2v2 wave split stated as verified data** (LEGAL-B11 `status: 'verified'`, "2v2 content" waves, AC 22). Expected: the sourced totals stay, and the split is marked inferred/unverified or reduced to what the hub shows, until H-169. Actual: B11 says verified and Open question 9 says the split is open. Owner spec-writer (and researcher for H-169).
2. **Pins disagree.** `02-Specs/Deck Import.md` line 39 and `02-Specs/My Collection.md` line 39 still say "[[Deck Legality]] v0.3.1" while the Spec Index rows for SPEC-006 and SPEC-007 say SPEC-002 0.4. Owner spec-writer; pin-only edit (the Index rows then agree with the notes).

## Non-blocking
- [[Ban List]] fact 5 still says "see the conflict below" although fact 8 resolves it (researcher, minor).
- [[Formats]] #8 says Standard "holds Origins plus the next two years" right after "removes Sets 1-5: Origins plus ..." (reads as contradictory; researcher to reword).

## Attempt 2 (2026-11-25)

Result: **FAIL** (one narrow defect left; everything else fixed).

Checked with `git diff ae6bb89` (uncommitted): changes are limited to Deck Legality (B11, 2v2 content, AC 22, Open q 9), the two pins, and one changelog line. Nothing else changed.

Fixed:
- Failure 1 mostly fixed: July 24 / Sept 18 split removed; LEGAL-B11 `unverified`; 2v2 content shows only totals; split sent to Open q 9 / H-169. Totals match [[Ban List]]: 1 Legend (Master Yi, Wuju Bladesman, fact 3), 14 cards and 7 battlefields now (fact 8, Radiance effective 2026-11-23, fact 5), 6 cards and 5 battlefields before (fact 1).
- Failure 2 fixed: Deck Import and My Collection now pin [[Deck Legality]] v0.4. Remaining `0.3.1` in `02-Specs` are history text only (B02 note, AC 21, changelog line, Spec Index "0.3.1:" history).
- V-009: changed lines add no new wikilinks beyond existing ones; AC 22 still has Given/When/Then.

Still failing:
1. **AC 22 over-claims a dated count.** Input: 2v2 banned set as of "any date before 2026-11-23". Expected: only what [[Ban List]] sources (6 cards, 5 battlefields as of the hub read just before the Radiance wave, fact 1). Actual: AC says every earlier date has 1 legend, 6 cards, 5 battlefields. That contradicts facts 3-4 (the list was created 2026-07-24 and gained cards on 2026-09-18, so earlier dates had fewer) and the spec's own "split not sourced" text. Fix: reword to "as of 2026-11-22" (or drop the pre-Radiance clause); same loosening in the B11 "before 2026-11-23" wording is acceptable once AC 22 is fixed. Owner spec-writer, P1.

Minor (non-blocking): B11 and the content section say "as of 2026-11-23" for the 14/7 totals, while fact 8 was observed 2026-11-24 (the Source column keeps 2026-11-24).

Non-blocking researcher follow-ups unchanged (filed as H-192).
