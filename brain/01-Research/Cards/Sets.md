---
tags: [research]
area: cards
status: unverified
as_of: 2026-11-24
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
| 5 | **Release dates OGN to VEN, official-ish (H-022, 2026-11-24):** Riot-issued press releases (distributed by TriplePoint PR / gamespress) confirm **OGN 2025-10-31** ("now available", dated that day), **SFD 2026-02-13** (release dated that day; Riot's site itself says only "February 2026" and "December 2025" for China), **UNL 2026-05-08** and **VEN 2026-07-31** (both in Riot press releases; Vendetta/Radiance dates first announced 2026-03-05). RAD 2026-10-23 is in the Tournament Rules. These are tier "official publisher press release", better than the community sources in fact 4, but no playriftbound.com page prints all four. OGS shipped with Origins (Proving Grounds, 2025-10-31). | https://pressreleases.triplepointpr.com/2025/10/31/riftbound-league-of-legends-trading-card-game-first-set-origins-now-available/ ; https://pressreleases.triplepointpr.com/md/what-you-wield-defines-you-in-riftbound-spiritforged-available-now.md ; https://www.gamespress.com/Step-Into-The-Jungle-In-Riftbound-Unleashed-Available-Now ; https://www.gamespress.com/Rivalries-Ignite-as-Riot-Reveals-New-Details-for-Riftbound-Vendetta-an | 2026-11-24 |
| 6 | **Piltover Archive set IDs (npm 1.5.0, 2026-09-19):** OGN 0, OGS 1 ("Proving Grounds"), **ARC 2 ("Arcane Box Set")**, SFD 3, UNL 4, VEN 5, RAD 6. ARC is the Arcane box set, a set code that is **not** on the Standard list and not in Riftcodex's `/sets`. Details in [[Collection Import Formats]]. | https://app.unpkg.com/@piltoverarchive/riftbound-deck-codes@1.5.0/files/README.md (community-db) | 2026-11-24 |
| 7 | **ARC contents and legality (H-196, `status: unverified`):** the Arcane Box Set is a limited product of **six collectible Champion Legend cards** (Jinx, Vi, Heimerdinger, Caitlyn, Viktor, Warwick) with "exclusive Arcane art" and a display case, "not a Champion deck"; English version has updated designs and foil treatments, first released at the TFT Macao Open; preorders opened 2025-09-02. Riot's two pages say **nothing** about tournament legality, a set code, or Standard. One community guide says the six are reprinted Origins cards with new art and gives Jinx as OGN-202B (single source, not confirmed). If they are Origins reprints, they share names with legal-set cards and would be legal by the name clause (TR 601.2.a as transcribed, [[Formats]] fact 10). **No official statement that ARC cards are legal or illegal was found.** The Rules Hub only says all sets currently produced are legal. | https://playriftbound.com/en-us/news/announcements/how-to-preorder-the-riftbound-lol-arcane-box-set/ (official); https://merch.riotgames.com/product/riftbound-arcane-box-set (official); https://riftboundguide.com/2026/07/07/riftbound-arcane-box-set/ (creator); https://app.riftjudge.com/rules/tournament/601 (community-db) | 2026-11-26 |

## Conflicts / uncertainties
- **ARC legality (fact 7):** no official ruling found. Research queue: check the official Tournament Rules PDF 601.2 wording and ask Riot / a judge whether a box-set printing counts as its Origins card; confirm the six cards' real names and codes against the Riot API (H-020).
- Card counts for OGN, SFD, UNL and VEN come from Riftcodex and include alt-art, overnumbered and signature printings, so they're **not** official base-set sizes. Get them from the Riot API once we have a key.
- Abbreviation case differs ("Ven" in the TR vs. VEN elsewhere). Normalize to upper case.

## Impacts
_Which specs this affects:_ [[Card Data Model]] · [[Deck Legality]] · [[Formats]]
