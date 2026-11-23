---
tags: [research]
area: cards
status: unverified
as_of: 2026-11-23
sources:
  - url: https://developer.riotgames.com/policies/riftbound
    tier: official
  - url: https://developer.riotgames.com/docs/riftbound
    tier: official
  - url: https://www.riotgames.com/en/legal
    tier: official
  - url: https://developer.riotgames.com/terms
    tier: official
  - url: https://playriftbound.com/en-us/card-gallery/
    tier: official
  - url: https://glama.ai/mcp/servers/@chirpon9/riot-docs-mcp/blob/bd23bbcbe155efed4c6774a7dde0bb8020d76191/src/riot_docs/riftbound-content-v1.md
    tier: community-db
  - url: https://riftcodex.com/faq
    tier: community-db
  - url: https://riftcodex.com/docs/endpoints/cards
    tier: community-db
  - url: https://api.riftcodex.com/sets
    tier: community-db
  - url: https://github.com/apitcg/riftbound-tcg-data
    tier: community-db
---
# Card Data & Images

## Summary
Riot runs an official **Riftbound Developer API** (`riftbound-content-v1`) that returns every set and
card with art URLs. Its Riftbound policy says an app **may only use Riftbound assets (card images included)
that come from the Riot API**, which needs an **app-specific API key** that Riot approves case by case.
Deck builders and card libraries are named as approved use cases. The same policy **forbids publishing or
keeping "metagame-defining data"** (play rates, win rates, matchup data). That is a direct risk for our
"rank meta decks by strength" feature and needs a product decision. Riftcodex (an unofficial, Scryfall-like
API) is the best no-key source for prototyping. Its image URLs point at Riot's own CDN, but it is a
**month behind**: no Radiance cards as of today.

**Recommendation:** apply for a Riot Riftbound API key now and build the card pipeline on
`riftbound-content-v1` (official IDs, official images, policy-compliant). Use Riftcodex only for local
prototyping and as a cross-reference (it has TCGplayer IDs). Don't ship images that aren't served via the
Riot API. Until the key is approved, treat images as **hotlink-only from Riot's CDN, no self-hosted copies**
(the policy doesn't say whether caching is allowed, so ask Riot Developer Support).

## Facts
| # | Fact | Source | As of |
|---|---|---|---|
| 1 | Riot's Riftbound developer docs say the Riot API gives authorized access to select Riftbound assets, including card art and rulesets. Use needs a written license or an **app-specific API key**, applied for through the Developer Portal (app description, user flow, URL, and a prototype or mockup). Riot may grant, deny or revoke keys at its discretion. (official) | https://developer.riotgames.com/docs/riftbound | 2026-11-23 |
| 2 | **Approved use cases:** deck builders and card libraries. **Prohibited:** automated rules enforcement in digital play, standalone Riftbound clients, small or personal-audience apps, "middle-man" data resellers, blockchain, gambling, ranked ladders or matchmaking, and **apps that publish or retain metagame-defining data** (for example play rates for decks or cards, win rates, matchup differentials). (official) | https://developer.riotgames.com/policies/riftbound | 2026-11-23 |
| 3 | **Assets rule:** the app may only use Riftbound assets (including cards) provided by the Riot API. No external or unofficial materials. Cards must show official English text, or Riot's official translation from the API. Previewed, unreleased cards are allowed if labelled. (official) | https://developer.riotgames.com/policies/riftbound | 2026-11-23 |
| 4 | Apps must implement the applicable rules from the API. For example, **a built-in deckbuilder must enforce official deckbuilding rules**. Riot expects timely support for new card properties. (official) | https://developer.riotgames.com/policies/riftbound | 2026-11-23 |
| 5 | **Monetization:** the app must be registered and Approved, a free tier is required (ads are allowed in it), and paid content must be transformative. Allowed payment models: subscriptions, donations, crowdfunding, and non-cashable currency. (official) | https://developer.riotgames.com/policies/riftbound | 2026-11-23 |
| 6 | **Required notice:** the app must show Riot's "Legal Jibber Jabber" statement where users can easily find it, ending with the line that Riot Games does not endorse or sponsor the project. It must not imply Riot endorsement. (official) | https://developer.riotgames.com/policies/riftbound ; https://www.riotgames.com/en/legal | 2026-11-23 |
| 7 | **Hotlink vs. cache:** neither the Riftbound policy, the general API policies (last updated 2025-05-29), nor the API Terms (last updated 2013-12-09) has an explicit rule on caching or hotlinking images. The Terms do require deleting all Game Information if the agreement ends. **Unresolved.** (official, by absence) | https://developer.riotgames.com/policies.html ; https://developer.riotgames.com/terms | 2026-11-23 |
| 8 | Riot's general fan-content policy ("Legal Jibber Jabber", last updated Aug 2018) grants a non-commercial license to use Riot IP. Commercial use is allowed for **API projects with a valid key** under the API terms. Riot logos and trademarks can't be used in project names or domains. (official) | https://www.riotgames.com/en/legal | 2026-11-23 |
| 9 | Endpoint: `GET /riftbound/content/v1/contents?locale=en` (regions AMERICAS, ASIA, EUROPE; only `en` during beta). It returns `{game, version, lastUpdated, sets[{id, name, cards[]}]}`. Each card has `id, collectorNumber, set, name, description, type, rarity, faction, stats{energy, might, cost, power}, keywords[], art{thumbnailURL, fullURL, artist}, flavorText, tags[]`. **No explicit variant field** in this schema. (community mirror of the official docs; not confirmed on developer.riotgames.com, whose page didn't render endpoint details) | https://glama.ai/mcp/servers/@chirpon9/riot-docs-mcp/blob/bd23bbcbe155efed4c6774a7dde0bb8020d76191/src/riot_docs/riftbound-content-v1.md | 2026-11-23 |
| 10 | The official **Card Gallery** (playriftbound.com, formerly riftbound.leagueoflegends.com, which now 302-redirects) lists cards by set, with filters and search. Alternate printings (for example Showcase versions) appear as **separate entries**. The detail view shows a public code such as `RAD-SP1/005`, a URL anchor such as `#card-gallery--rad-sp1-005`, and energy, power, might, domain, type, tags, ability, rarity (for example "Showcase"), artist, and set. No public API or download. (official, seen in browser) | https://playriftbound.com/en-us/card-gallery/ | 2026-11-23 |
| 11 | **Riftcodex** is an unofficial fan REST API ("inspired by Scryfall"), not affiliated with Riot, says it operates under Riot's fan content policy, and needs no auth. Base `https://api.riftcodex.com`, with endpoints `/cards`, `/cards/{id}`, `/cards/riftbound/{id}`, `/cards/tcgplayer/{id}`, `/cards/name`, `/sets`, paginated (max 100). Rate limits and data license aren't stated. (community-db) | https://riftcodex.com/faq ; https://riftcodex.com/docs/endpoints/cards | 2026-11-23 |
| 12 | Riftcodex card shape (sample `ogn-001`): `riftbound_id` `ogn-001-298`, `tcgplayer_id`, `collector_number`, `set{set_id, label}`, `classification{type, supertype, rarity, domain[]}`, `media{image_url, artist, accessibility_text}`, `metadata{alternate_art, overnumbered, signature, updated_on}`. The **`image_url` points to Riot's CDN** (`cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/...png`). (community-db) | https://api.riftcodex.com/cards/riftbound/ogn-001 | 2026-11-23 |
| 13 | Riftcodex `/sets` returns OGN (352), OGS (24), SFD (288), UNL (280), VEN (358), plus promo sets OPP (133), JDG (3) and PR (13). **Radiance (RAD, released 2026-10-23) is missing**, and `?set_id=rad` returns 0 cards. (community-db) | https://api.riftcodex.com/sets | 2026-11-23 |
| 14 | `apitcg/riftbound-tcg-data` on GitHub is a small repo (6 commits) with no stated license or recency. Not suitable as a primary source. (community-db) | https://github.com/apitcg/riftbound-tcg-data | 2026-11-23 |

## Source comparison
| Source | Tier | IDs | Variants | Images | Freshness | Terms fit |
|---|---|---|---|---|---|---|
| Riot `riftbound-content-v1` | official | `id`, `collectorNumber`, `set` | not explicit in the schema (check the live payload) | `art.fullURL` / `thumbnailURL` | official | **Required** by policy; needs an approved key |
| Official Card Gallery | official | public code (`RAD-SP1/005`) | separate entries | Riot CDN | current (has Radiance) | Link-out target only (no API) |
| Riftcodex | community | `riftbound_id`, `tcgplayer_id` | `alternate_art` / `overnumbered` / `signature` flags | hotlinks Riot CDN | **lags** (no RAD) | Policy says assets must come via the Riot API |

## Conflicts / uncertainties
- **Metagame-data prohibition vs. our product.** Ranking decks by "competitive strength" or showing play and win rates probably counts as metagame-defining data under the API policy. Listing *published tournament decklists and placings* isn't named explicitly. Needs RJ's call, and possibly a question to Riot Developer Support.
- Caching and hotlinking of images: no explicit rule found. Ask Riot.
- Endpoint schema is from a community mirror. Re-check on the portal once logged in or once we have a key.
- How variants (foil, alt-art, signature, overnumbered, Showcase) show up in the official API is unknown. The gallery lists them as separate cards with their own codes.

## Impacts
_Which specs this affects:_ [[Card Data Model]] · [[Tournament Deck Catalog]] · [[Your Decks Ownership View]] · [[ADR-0001 Tech Stack]]
