---
tags: [research]
area: cards
status: unverified
as_of: 2026-11-23
sources:
  - url: https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/861752822d217edf37d9febaeaf77a7d924c1bb6.pdf
    tier: official
  - url: https://playriftbound.com/en-us/news/announcements/products-and-sets-into-2027/
    tier: official
  - url: https://mobalytics.gg/riftbound/guides/new-set-release-schedule
    tier: community-db
  - url: https://articles.starcitygames.com/riftbound/riftbound-2026-set-release-schedule/
    tier: creator
  - url: https://api.riftcodex.com/sets
    tier: community-db
---
# Sets

## Summary
Six sets are Standard-legal today: **OGN** Origins, **OGS** Origins supplemental set in Proving Grounds,
**SFD** Spiritforged, **UNL** Unleashed, **VEN** Vendetta and **RAD** Radiance. Next up are **LGC**
Legacy (2027-01-29), **PG2** Proving Grounds 2nd Edition (2027-02-19) and **REC** The Reckoning
(2027-04-30). China launched the first sets earlier, and from Vendetta onward release dates are global.
Some regions (KR, TW) are behind on set releases. Rotation: see [[Formats]].

## Sets
| Code | Name | EN release | China release | Cards (Riftcodex count, incl. variants) | Source tier |
|---|---|---|---|---|---|
| OGN | Origins | 2025-10-31 | 2025-08-01 | 352 | community (mobalytics + Riftcodex agree) |
| OGS | Origins supplemental (Proving Grounds) | 2025-10-31 | ? | 24 | community (Riftcodex); code is official (TR 601.3.c) |
| SFD | Spiritforged | 2026-02-13 | 2025-12-12 | 288 | community x2 (mobalytics, SCG) |
| UNL | Unleashed | 2026-05-08 | 2026-04-10 | 280 | community x2 |
| VEN | Vendetta | 2026-07-31 | 2026-07-31 (first global-parity set) | 358 | community x2 |
| RAD | Radiance | **2026-10-23** | ? | 167 (61 Showcase), official | **official** |
| LGC | Legacy | 2027-01-29 (Pre-Rift Jan 22–28) | ? | 239 (93 Showcase) | **official** |
| PG2 | Proving Grounds, 2nd Ed. (4 champion decks, no booster-exclusive cards) | 2027-02-19 | ? | — | **official** |
| REC | The Reckoning | 2027-04-30 (Pre-Rift Apr 23–29) | ? | 264 (67 Showcase) | **official** |
| — | Set 8 (Bandle City theme) | Q3 2027 | ? | — | official (name TBA) |
| — | Set 9 | Q4 2027 | ? | — | official (no details) |

Promo groupings in Riftcodex: OPP (Organized Play promos, 133), JDG (Judge promos, 3), PR (promos, 13).
Official public codes look like `OGN-001`, with variant suffixes and Showcase codes such as `RAD-SP1/005`.

## Facts
| # | Fact | Source | As of |
|---|---|---|---|
| 1 | TR 601.3.c lists the Standard sets: OGS, OGN, SFD, UNL, VEN ("Ven"), RAD, with RAD released 2026-10-23. | Tournament Rules PDF (2026-10-09) | 2026-11-23 |
| 2 | Riot's "Products and Sets into 2027" (2026-08-03) gives Radiance 167 cards (61 Showcase), Legacy 239 (93 Showcase), Reckoning 264 (67 Showcase) and PG2 on 2027-02-19, plus Sets 8 and 9 in Q3/Q4 2027. | https://playriftbound.com/en-us/news/announcements/products-and-sets-into-2027/ | 2026-11-23 |
| 3 | **From Legacy, card templating changes** ("When you play me" becomes "When I enter", tokens are "Created"), and boosters swap one common for a Legend-or-Battlefield slot. This affects text search and parsing. | same | 2026-11-23 |
| 4 | Release dates for OGN, SFD, UNL and VEN come from mobalytics (last updated 2026-02-13) and StarCityGames (2026-08-03). These are community sources and agree where they overlap. | mobalytics; SCG | 2026-11-23 |

## Conflicts / uncertainties
- Card counts for OGN, SFD, UNL and VEN come from Riftcodex and include alt-art, overnumbered and signature printings, so they're **not** official base-set sizes. Get them from the Riot API once we have a key.
- Abbreviation case differs ("Ven" in the TR vs. VEN elsewhere). Normalize to upper case.

## Impacts
_Which specs this affects:_ [[Card Data Model]] · [[Deck Legality]] · [[Formats]]
