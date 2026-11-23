---
tags: [research]
area: formats
status: conflict
as_of: 2026-11-23
sources:
  - url: https://playriftbound.com/en-us/rules-hub/
    tier: official
  - url: https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/861752822d217edf37d9febaeaf77a7d924c1bb6.pdf
    tier: official
  - url: https://playriftbound.com/en-us/news/organizedplay/riftbound-world-showcase
    tier: official
---
# Formats

## Summary
Organized play has **Constructed** (the primary format is **Standard Constructed**, with matches usually
Bo3 using the 1v1 Match mode), **Limited** (Sealed, Draft) and **2v2** (Constructed or Sealed). All sets
currently produced are legal in Standard. The Rules Hub says **set rotation for Standard starts in
2028**, but the Tournament Rules define Standard as the "most recent 5–8 sets" / "current year's plus
previous year's sets", which could imply rotation in 2027. That's a conflict. **Recommendation for MVP:
support Standard Constructed only**, with 2v2 as a later option. Limited decks aren't "meta decks".

## Facts
| # | Fact | Source | As of |
|---|---|---|---|
| 1 | Formats in the Tournament Rules: Constructed (601), Limited (602: Sealed, Draft), and 2v2 (603), which can be constructed or sealed. | Tournament Rules PDF (2026-10-09) | 2026-11-23 |
| 2 | Standard Constructed is the primary format. **All currently produced sets are legal** in sanctioned events, and **rotation is intended to start in 2028**. The same set legality applies to 2v2. (Rules Hub, last updated 2026-11-23) | https://playriftbound.com/en-us/rules-hub/ | 2026-11-23 |
| 3 | TR 601.3: Standard is the "most recent 5–8 sets". 601.3.b: each Standard is the current year's sets plus the previous year's. 601.3.c lists the current Standard as **OGS, OGN, SFD, UNL, VEN, RAD**. | Tournament Rules PDF | 2026-11-23 |
| 4 | New sets become legal on their release date, and regional legality follows each region's launch until set parity (TR 601.2.b). RAD's release date is 2026-10-23 (601.3.c.6.a). | Tournament Rules PDF | 2026-11-23 |
| 5 | Matches are mostly **best-of-3** (TR 404.2). Swiss rounds take 60 minutes and the single-elimination cut is untimed (TR 604). | Tournament Rules PDF | 2026-11-23 |
| 6 | 2v2 has its own ban list, including a banned **Legend**. See [[Ban List]]. | Rules Hub | 2026-11-23 |
| 7 | **World Showcase** (Shanghai, 2027-01-22 to 23) uses a special format: **three decks (A/B/C) with no overlapping Domains**, 9 Swiss rounds, and a Top 4 that's Bo3 with a chosen Playoff deck. | https://playriftbound.com/en-us/news/organizedplay/riftbound-world-showcase | 2026-11-23 |

## Conflicts / uncertainties
- **Rotation timing:** Rules Hub (rotation from 2028) vs. TR 601.3/601.3.b (current year plus previous year, 5–8 sets). Taken literally, 601.3.b would rotate 2025 sets (OGN, OGS) out when 2027 begins. → `status: conflict`. Ask spec-writer to model **format legality as data** (a list of legal set codes per format with effective dates), not as a rule.
- The 2027 Premier Play and Local Play program changes (announced 2026-10-26) haven't been researched yet.

## Impacts
_Which specs this affects:_ [[Deck Legality]] · [[Tournament Deck Catalog]]
