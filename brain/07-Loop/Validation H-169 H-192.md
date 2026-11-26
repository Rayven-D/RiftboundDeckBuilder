---
tags: [loop, validation]
item: H-169, H-192
date: 2026-11-26
round: 1
result: H-169 PASS, H-192 FAIL
---
# Validation H-169 and H-192: 2v2 ban list names, research note tidy-ups

Items: [[Handoff Board]] H-169 and H-192. Scope: commit a5990f3 on `loop/H-169-H-192-ban-list-notes`
(`git diff origin/dev...HEAD`: [[Ban List]], [[Formats]], the board). Docs only, so no code or test suites ran.

## Checks run
| Check | Result |
|---|---|
| H-169: I re-fetched https://playriftbound.com/en-us/rules-hub/ myself (curl, 2026-11-26, "Last updated: November 23, 2026" on both sections) and compared the 2v2 section name by name | PASS: 1 Legend (Master Yi, Wuju Bladesman), 14 cards, 7 battlefields, every name in [[Ban List]] matches. The hub prints "Draven Vanquisher" (no comma) in 2v2 and "Draven, Vanquisher" in Standard; the note says so. The Standard list (15 cards, 7 battlefields, Fight or Flight extra) also matches the note |
| H-169: source and `as_of` on the section; old 6-card table dropped | PASS (`as_of` 2026-11-26, source URL, table removed, conflicts line updated) |
| H-192: [[Ban List]] fact 5 no longer says "see the conflict below" | PASS (points to fact 8) |
| H-192: [[Formats]] fact 8 claims nothing beyond its sources | **FAIL** (see below) |
| V-009 on the two changed notes: sources, tier, `as_of`, `status` in frontmatter; wikilinks resolve | PASS (all wikilinks resolve) |
| V-001 | SKIPPED (planned, needs SPEC-002 and the legality engine) |

## Failure: Formats fact 8 now states something the FAQ contradicts
The new wording: "After that Standard is built from the sets released from 2028 on, at four Standard sets a year".
Source, re-read 2026-11-26 at https://playriftbound.com/en-us/news/organizedplay/riftbound-organized-play/
("Rotation and the Standard Format"):
- "Start of 2028: Set 10 release, first rotation occurs: Sets 1-5 removed from Standard"
- "2028: Sets 11-13 release."
- "Start of 2029: Set 14 releases, second rotation occurs: Sets 6-9 removed from Standard"

So after the 2028 rotation Standard still holds **Sets 6-9** (released before 2028) plus Sets 10-13, and Sets 6-9 leave
only in 2029. "Sets released from 2028 on" is wrong, and it would make the legality data wrong if copied into SPEC-002.
The old "Origins plus the next two years" was also wrong, but this replacement is not safe either.
Expected: only what the FAQ says, for example "the first rotation (start of 2028, Set 10) removes Sets 1-5 (Origins and
the four 2026 sets); the second (start of 2029, Set 14) removes Sets 6-9; Standard then 'grows and shrinks' between 4 and 8
sets". Say nothing on which year the remaining sets were released in.
Minor, not filed: the [[Ban List]] Summary still says the wave "takes effect today, 2026-11-23".
