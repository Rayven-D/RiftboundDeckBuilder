---
tags: [research]
area: rules
status: verified
as_of: 2026-11-23
sources:
  - url: https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/5c7946f7c3b8c6e0faff85ab6dadc6d2e721ea94.pdf
    tier: official
  - url: https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/861752822d217edf37d9febaeaf77a7d924c1bb6.pdf
    tier: official
  - url: https://playriftbound.com/en-us/rules-hub/
    tier: official
---
# Deck Construction Rules

## Summary
A constructed Riftbound deck has **1 Champion Legend**, a **Main Deck of exactly 40 cards in tournaments**
(Core Rules say *at least* 40) that **includes 1 Chosen Champion**, a separate **12-card Rune Deck**, and
**3 Battlefields with unique names**. Legality is governed by the Legend's **Domain Identity**. Copy limit
is **3 per card name** (the Chosen Champion counts), plus a cap of **3 Signature cards total**. Tournaments
allow a **sideboard of up to 10**, with copy limits counted across main deck and sideboard together.
Sources: Core Rules and Tournament Rules, both "last updated 2026-10-09" (no version numbers printed).

## Facts
| # | Fact | Source | As of |
|---|---|---|---|
| 1 | A deck is a Main Deck, a Rune Deck, exactly one Champion Legend, and the number of Battlefields set by the Mode of Play. (Core 103) | Core Rules PDF (2026-10-09) | 2026-11-23 |
| 2 | The **Legend** sets the deck's **Domain Identity**. Single-domain cards need their domain in the identity, multi-domain cards need *all* of their domains in it, and no-domain cards fit any identity. (Core 103.2.b) | Core Rules PDF | 2026-11-23 |
| 3 | **Main Deck: at least 40 cards** in the Core Rules (103.3), and **exactly 40** in tournament constructed (TR 402.1, 601.1.b), in both cases **including the Chosen Champion**. Every card must match Domain Identity and format legality. | Core Rules PDF; Tournament Rules PDF | 2026-11-23 |
| 4 | **Chosen Champion:** one Champion Unit (not a Signature card) whose Champion tag matches the Legend's. It starts in the Champion Zone. It can be swapped during sideboarding for a matching card. (Core 103.3.a; TR 601.1.c.4) | Core; TR | 2026-11-23 |
| 5 | **Copy limit: up to 3 copies per card *name***, with the Chosen Champion counting. Different names, such as different subtitles, count separately. (Core 103.3.b, 132.4) **Implication:** printings and variants that share a name share the limit. | Core Rules PDF | 2026-11-23 |
| 6 | **Signature cards:** at most **3 in total**, whatever their names, and all must share the Legend's Champion tag. Signature cards are not Champion Units. (Core 103.3.d) | Core Rules PDF | 2026-11-23 |
| 7 | **Rune Deck:** **12 Rune cards** matching the Domain Identity, kept separate from the Main Deck. (Core 103.4, 161.2.a; TR 402) | Core; TR | 2026-11-23 |
| 8 | **Battlefields:** in all sanctioned modes each player brings **3**, with **no two sharing a name**, matching Domain Identity where applicable. (Core 103.5, 483–491; TR 402) | Core; TR | 2026-11-23 |
| 9 | **Sideboard** (tournaments, where allowed): **up to 10 cards**, each legal for the Main Deck. **Copy limits apply across main + sideboard combined.** Swaps are 1-for-1 between games, with no sideboard use in game 1. Legend, Runes and Battlefields are locked at registration. (TR 601.1.c, 403.3–403.5, 403.4.b) | Tournament Rules PDF | 2026-11-23 |
| 10 | **Banned cards** can't be in constructed decks (TR 601.2.d). See [[Ban List]]. At low OPL only, an unmodified preconstructed deck may keep its banned cards. (TR 601.2.d.2) | Tournament Rules PDF | 2026-11-23 |
| 11 | **Decklist registration** must list Legend, Battlefields, Main Deck (with Chosen Champion), Rune Deck and sideboard. It's required at high OPL and at the Head Judge's discretion at low OPL. (TR 401) | Tournament Rules PDF | 2026-11-23 |
| 12 | **Proxies aren't allowed.** Official cards in **any language** are legal. Alters are allowed within limits. (TR 419–420) | Tournament Rules PDF | 2026-11-23 |
| 13 | A reprint numbered outside a set's normal range (for example 300/250) **does not automatically become legal** with that set. (TR 601.2.c) | Tournament Rules PDF | 2026-11-23 |
| 14 | **Limited (Sealed):** 6 boosters, **main deck at least 25**, **no copy limit**, domain identity of any three domains (or a domain plus the Legend's domains), and runes matching it. **Draft:** 3 boosters, **main deck at least 20**. Basic runes and blank battlefields can come from any source. (TR 602) | Tournament Rules PDF | 2026-11-23 |
| 15 | **Card types by section:** Legends and Battlefields are separate card types and are never Main Deck cards (Core 133.6, 170, 174). Runes aren't Main Deck cards either (161.1). There are six basic runes (164.1), and the 3-copy limit (103.3.b) covers only the Main Deck, so runes have no per-name limit. The Chosen Champion is a normal Champion Unit, and same-name copies count as it (103.3.a.3). Tokens aren't cards (185.1). Detail and cross-deck implications: [[Physical Copies Across Decks]]. | Core Rules 2026-10-09 via riftjudge.com transcription (community-db) | 2026-11-23 |

## Validation checklist (for [[Deck Legality]])
1. Exactly 1 Legend. 2. Main = 40 (constructed), including 1 Chosen Champion whose tag matches the Legend's.
3. Every main, sideboard and battlefield card fits the Domain Identity. 4. At most 3 per name across main + sideboard.
5. At most 3 Signature cards. 6. Rune Deck = 12, in identity domains. 7. 3 battlefields, unique names.
8. Sideboard ≤ 10. 9. No banned cards, legends or battlefields for the selected format ([[Ban List]]). 10. All sets legal in the format ([[Formats]]).

## Conflicts / uncertainties
- Core "at least 40" vs. tournament "exactly 40". For constructed meta decks use **exactly 40** (TR governs sanctioned play).
- Whether Signature cards also count toward the per-name limit isn't spelled out beyond the total cap of 3. Treat both limits as applying.
- The PDFs were read via an extraction tool and only partly paraphrased. Re-read 103.x and 601.x directly when writing the spec.

## Impacts
_Which specs this affects:_ [[Deck Legality]] · [[Your Decks Ownership View]] · [[Card Data Model]] (card name as the copy-limit key; domain, champion tag and signature flags)
