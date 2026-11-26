---
tags: [loop, validation]
---
# Validation H-196 (ARC legality research)

2026-11-26 · H-196 · **PASS** · checks: diff review, source re-fetch, wikilink check (V-009), H-645 row review

## Claims vs sources
| Claim | Result |
|---|---|
| Official preorder page: six collectible Champion legend cards, exclusive Arcane art, display case, English version with updated designs, first at TFT Macao Open | Re-fetched 2026-11-26: matches. The page has no legality or set-code wording. |
| Creator guide (riftboundguide.com): six foil alt-art Champion Legends "all drawn from ... Origins", reprinted with new art | Re-fetched: matches. Labelled single-source and unconfirmed in the note (OGN-202B for Jinx not re-checked; labelled unconfirmed). |
| TR 601.2.a name clause | Re-fetched riftjudge 601: "from a set that is legal ... or it has the same name as a card from a set that is legal". Matches. Labelled community-db. |
| TR 601.2.c, 601.3.c (ARC not listed) | Match existing [[Deck Construction Rules]] fact 13 and [[Sets]] fact 1. |
| Merch page (second official source) | Not re-fetched; only cited for the same product facts. Minor. |

## Honesty and status
- Both facts are `unverified`, with an explicit "no official statement found" line. The legal-by-name result is stated as conditional ("if they are Origins reprints", "would be") and as inference, not as a ruling. The official PDF is stated as not re-read.
- Sources, tier labels and a 2026-11-26 date on both rows. Conflicts sections updated in both notes.
- Nit (no failure): the [[Sets]] frontmatter `as_of` is still 2026-11-24 while fact 7 is dated 2026-11-26.

## H-645
Well formed: spec-writer, P3, depends H-196, Accept testable, and it says not to claim an official ruling and to keep ARC out of the set-legal list. Matches the "spec-writer item filed if it changes SPEC-001/002" Accept clause (it closes Open question 17, which exists in [[Card Data Model]]).

## V-009
Wikilinks in added lines ([[Sets]], [[Formats]], [[Card Data Model]], [[Validation H-165]], [[Deck Legality]] none new) resolve. Research notes keep sources, as_of and status.

## Failures
None.
