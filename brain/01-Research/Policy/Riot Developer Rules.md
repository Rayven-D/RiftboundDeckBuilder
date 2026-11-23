---
tags: [research, policy]
area: policy
status: verified
as_of: 2026-11-23
sources:
  - url: https://developer.riotgames.com/ (Developer Portal "Please Don't / Please Do" list, provided by RJ from his portal account)
    tier: official
  - url: https://developer.riotgames.com/policies/riftbound
    tier: official
---
# Riot Developer Rules

## Summary
These are the portal's general rules for every Riot API project, as RJ received them on
2026-11-23 along with his development key. They sit on top of the Riftbound-specific policy
in [[Card Data & Images]]. Where the two differ, follow the **stricter** one.

## Rules and what they mean for us
| # | Rule (paraphrased) | Impact on this project |
|---|---|---|
| 1 | A Development or Interim key is only for building a prototype for Riot to review, never for a project the community can access | Local development only. We need an approved **production key** before anyone else uses the site (H-011). |
| 2 | Secure the API key | The key lives only in `.env` on the server side (gitignored). It is never in the Angular app or the repo. |
| 3 | A production key covers one project only | One key for this app. |
| 4 | **No charging money and no exclusive access**, in whole or in part | Stricter than the Riftbound policy (which allows transformative paid content and subscriptions): **the app is entirely free, with no paid tiers.** Conflict noted below. |
| 5 | No official logos; don't build anything designed to look like native Riot or League branding and design | The UI needs its **own visual identity**: no Riftbound/Riot logos and no copying of the official site's look. Card art from the game *is* allowed. |
| 6 | Don't claim a partnership with Riot or approval by Riot | Show the "Legal Jibber Jabber" notice; avoid wording like "official". |
| 7 | Don't scrape undocumented endpoints or any source outside the Riot API and documented third-party tools | Card data and images come from the **Riot API only**. Riftcodex and decklists captured from Riot's articles are a **gray area**, so ask in an App Note. |
| 8 | Don't shame players; honoring or celebrating them is fine | Show placings exactly as published ("1st" to "8th"). No negative framing. |
| 9 | No alternatives to official skill ranking (MMR/ELO and similar) | Consistent with [[ADR-0003 Tournament Results Only]]. |
| 10 | Don't compromise game integrity or create an unfair advantage | A deck builder is fine. |
| 11 | Gray areas: ask in the project application as an App Note | We have questions to ask (H-011). |

Encouraged by Riot: using art assets from the game (not logos), and tools that help players evaluate and improve their own play.

## Conflicts / uncertainties
- Monetization: the general rules say "don't charge money" while the Riftbound policy allows transformative paid content. We'll stay fully free, so this doesn't affect us.
- Development keys expire and must be regenerated regularly. A daily data pipeline would need either the production key or a manual refresh.
- The API is not reachable from Claude's sandboxes (blocked by the network allowlist); it is reachable from RJ's PC.

## Impacts
[[Card Data Model]], [[Tournament Deck Catalog]], [[UI Index]], [[ADR-0001 Tech Stack]]
