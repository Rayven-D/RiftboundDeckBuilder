---
tags: [loop, validation]
---
# Validation H-168 (V-001 re-run against the updated ban data)

2026-11-24 · H-168 · **SKIPPED-with-hand-check, no failures** · validator

V-001 is `planned` in [[Validation Checks]] (needs SPEC-002 and the legality engine, neither built), so the check could not run as an automated check. Instead a throwaway script (scratch space, not in the repo) diffed every decklist in `01-Research/Decklists` against [[Ban List]] with effective dates.

## Ban data used
- Standard: 15 cards + 7 battlefields, from the Ban List table (matches the Rules Hub counts, fact 1).
- 2v2: the note does not print the 14 names. It states "this list plus the 8 cards and 2 battlefields of the Radiance wave" (fact 8). Composed list: 6 old cards (Called Shot, Ekko Recurrent, Draven Vanquisher, Scrapheap, Stealthy Pursuer, Stacked Deck) + 8 Radiance cards = 14; 5 old battlefields + Emperor's Dais, Star Spring = 7; Legend Master Yi, Wuju Bladesman. Counts 14 / 7 / 1 check out. Fight or Flight is Standard-only (not in the old 2v2 list), so Standard = 15 and 2v2 = 14 cards.
- Names are inferred from the composition, not read from a printed 2v2 table: filed H-169 (P2).

## Result per deck (all 8 are Standard, event 2026-11-08, legal_as_of 2026-11-06)
Every ban in the list took effect 2026-11-23 or earlier. Only the Radiance wave (2026-11-23) postdates the event, so every hit is a pre-ban flag, not a failure. No deck contains a card banned before 2026-11-08 (no Called Shot, Draven, Scrapheap, Stealthy Pursuer, Ekko Recurrent, Stacked Deck, Fight or Flight, banned battlefield from the older waves, and no Master Yi).

| Deck | Now-banned (effective 2026-11-23, same in Standard and 2v2) |
|---|---|
| 1 ASC Evansrhim, Kennen | Nocturne Horrifying x3, Rhasa the Sunderer x3 |
| 2 Sonecon, Riven | Riven Broken Blade (champion), Stellacorn Herder x3, Zhonya's Hourglass x3, Emperor's Dais, Star Spring |
| 3 DiamondHat, Riven | Riven Broken Blade, Zhonya's Hourglass x3, Emperor's Dais, Star Spring |
| 4 BQO Caravaggio, Riven | Riven Broken Blade, Stellacorn Herder x3, Zhonya's Hourglass x2 main + 1 side, Star Spring |
| 5 CTCG DZiden, Kai'Sa | Brynhir Thundersong x3 |
| 6 lets see lol, Riven | Riven Broken Blade, Stellacorn Herder x3, Zhonya's Hourglass x2 main + 1 side, Star Spring |
| 7 HXN Gonkra, Kennen | Nocturne Horrifying x3, Rhasa the Sunderer x3 |
| 8 On Curve Willy, Kennen | Nocturne Horrifying x3, Rhasa the Sunderer x3 |

(Riven, Broken Blade is the Chosen Champion held in front matter `champion`, not in the Main deck list, so a section parser misses it; the engine must read `champion`.)

## Cross-check with the notes
Each decklist note's "Not legal as of 2026-11-23. Now-banned ..." line equals the script result for all 8 decks (same cards, same battlefields). Dazzling Aurora and Baited Hook appear in none of them. Master Yi is in none. Tournament note statement "all Top 8 are now illegal" holds: 8 of 8 contain at least one Radiance-banned card.

## Not checked
- Regional (KR / TW) lists, which are unpublished (Ban List fact 7).
- Card-name matching against real card data (no catalog yet); matching was by name with apostrophe and "The Dreaming Tree" normalisation.
- Whether the Radiance wave hits rune or Legend slots: no banned Legend in the lists.

## Items filed
H-169 (P2, researcher): print the full 2v2 list in [[Ban List]].
