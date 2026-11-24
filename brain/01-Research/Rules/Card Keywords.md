---
tags: [research]
area: rules
status: unverified
as_of: 2026-11-24
sources:
  - url: https://playriftbound.com/en-us/rules-hub/
    tier: official
  - url: https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/5c7946f7c3b8c6e0faff85ab6dadc6d2e721ea94.pdf
    tier: official
  - url: https://playriftbound.com/en-us/news/rules-and-releases/riftbound-core-rules-patch-notes/
    tier: official
  - url: https://playriftbound.com/en-us/news/rules-and-releases/riftbound-core-rules-spiritforged-patch-notes/
    tier: official
  - url: https://playriftbound.com/en-us/news/rules-and-releases/riftbound-core-rules-unleashed-patch-notes/
    tier: official
  - url: https://playriftbound.com/en-us/news/announcements/core-rules-vendetta-patch-notes
    tier: official
  - url: https://playriftbound.com/en-us/news/announcements/core-rules-radiance-patch-notes-effective-october-16-2026/
    tier: official
  - url: https://playriftbound.com/en-us/news/announcements/the-radiance-overview/
    tier: official
  - url: https://playriftbound.com/en-us/news/rules-and-releases/riftbound-origins-card-errata/
    tier: official
  - url: https://playriftbound.com/en-us/news/rules-and-releases/riftbound-spiritforged-errata/
    tier: official
  - url: https://playriftbound.com/en-us/news/rules-and-releases/unleashed-errata-updates/
    tier: official
  - url: https://playriftbound.com/en-us/news/announcements/vendetta-errata-updates
    tier: official
  - url: https://playriftbound.com/en-us/news/announcements/radiance-errata-updates
    tier: official
  - url: https://playriftbound.com/en-us/news/rules-and-releases/riftbound-origins-faq/
    tier: official
  - url: https://developer.riotgames.com/policies/riftbound
    tier: official
  - url: https://developer.riotgames.com/docs/riftbound
    tier: official
  - url: https://www.riotgames.com/en/legal
    tier: official
  - url: https://raw.githubusercontent.com/chirpon9/riot-docs-mcp/main/src/riot_docs/riftbound-content-v1.md
    tier: community-db
  - url: https://riftlens.pages.dev/rules/keywords/
    tier: community-db
  - url: https://riftlens.pages.dev/rules/<keyword>/ (per-keyword pages, rows 1-13, 16, 18-21, 26-28 of table F)
    tier: community-db
  - url: https://riftbound.gg/rules/core-rules/
    tier: community-db
  - url: https://jeff425.github.io/hyperlinked-rb-cr/
    tier: community-db
  - url: https://api.riftcodex.com/cards/search
    tier: community-db
  - url: https://wiki.leagueoflegends.com/en-us/Riftbound:Keywords
    tier: community-db
---
# Card Keywords

## Summary
The current Core Rules (Last Updated 2026-10-09, in effect 2026-10-16 with Radiance) have a keyword
glossary at rules 804-832 with **28 keywords**. Riot's patch notes and overview name 24 of them directly;
the other 4 (Ganking, Tank, Temporary, Vision) are confirmed only by community transcriptions
and card text mirrors. **The verbatim rule text in this note comes from community transcriptions of the
official PDF.** The PDF could not be text-extracted in this session, so every definition is
`status: unverified` until someone checks it against the PDF. The documented Riot API card schema has a `keywords: List[string]` field
and **no definition, reminder or glossary field**. Values, casing and the empty-card result can only be seen in
the live payload (H-020). Printed cards put **reminder text in parentheses** after a bracketed keyword
(`[Accelerate] (…)`), but reminder text is per card (domain icons, values, "me"/"it"), is often left off
alt-art, overnumbered, signature and Legend printings, and Rule 135.2.d.3 says it has no game function.
**Policy (Q8):** Riot's Riftbound policy says an app "may only use Riftbound assets (including cards) provided
by the Riot API" with "No external or unofficial materials". No Riot statement on quoting Core Rules text in
apps was found, so options B/C of [[ADR-0008 Keyword Glossary Source]] are **not clearly allowed. Ask Riot (App Note, H-011).**

## Facts

### A. Riot API (Q1, Q2)
| # | Fact | Source | As of |
|---|---|---|---|
| A1 | The documented `GET /riftbound/content/v1/contents` CardDTO has `keywords` typed **List[string]** with **no description**, next to `description: string` (no description) and `tags: List[string]` (no description). No other keyword, reminder, glossary or rules field or endpoint is documented. (community mirror of Riot's API reference; the portal page doesn't render the DTO without login) | chirpon9/riot-docs-mcp `riftbound-content-v1.md` (raw GitHub) | 2026-11-24 |
| A2 | Riot's docs say the API gives "authorized access to select Riftbound assets—including card art, rulesets, and other materials". The policy says "Your App must implement all applicable rules for Riftbound found within the Riot API." No rules or rulesets endpoint is documented anywhere we can see. (official) | https://developer.riotgames.com/docs/riftbound ; https://developer.riotgames.com/policies/riftbound | 2026-11-24 |
| A3 | Riot's Origins FAQ (2025-10-16): updated card wordings go into "our database of official card wordings, Watcher", and "You'll soon be able to access Watcher and its official wordings through our website and also the Riftbound API." That is **card text**, not a keyword glossary. Whether it is live in the API is unknown. (official) | https://playriftbound.com/en-us/news/rules-and-releases/riftbound-origins-faq/ | 2026-11-24 |
| A4 | **Unknown until H-020:** whether `keywords[]` is filled at all; exact strings (casing, brackets, `"Assault 2"` vs `"Assault"`, `"Level 6"`); order; duplicates (a card with Level 3/6/11/16); whether keywords *granted* to other cards (e.g. "Your Mechs have [Disarm]") are listed; and the empty-card result (`[]`, missing or `null`). Also whether `description` holds reminder text, `[…]` brackets and `:rb_…:` icon tokens like the community mirror below. `data/raw/` and `data/samples/fixture/` are invented and say nothing about this. | — | 2026-11-24 |
| A5 | `tags[]`: Riftcodex (community mirror of the gallery) tags are **champion names, regions and creature types**, not keywords: Blazing Scorcher `["Dragon","Noxus"]`, Kai'Sa `["Kai'Sa","The Void"]`, Stalwart Poro `["Poro"]`. The official gallery detail view also shows "tags" separately from the ability text ([[Card Data & Images]] #10). The Core Rules treat tags as nameable card traits (rules 759-762). Whether the API's `tags[]` matches this: **unverified (H-020)**. (community-db; official gallery) | https://api.riftcodex.com/cards/riftbound/ogn-001 ; rules 759-762 via https://riftbound.gg/rules/core-rules/ | 2026-11-24 |
| A6 | Riftcodex has **no** `keywords` field (only `text.rich` / `text.plain` / `tags`), so it can't show the API's keyword format. Riftcodex still has **no Radiance (RAD)** cards. (community-db) | https://riftcodex.com/docs/endpoints/cards ; https://api.riftcodex.com/sets | 2026-11-24 |

### B. How keywords appear in card text (Q3)
| # | Fact | Source | As of |
|---|---|---|---|
| B1 | Core Rules 135.2.c: keywords are "short words or phrases that represent longer abilities or instructions"; 135.2.c.2: "Keywords may or may not have reminder text." 135.2.d: "Reminder text appears in italics and parentheses"; 135.2.d.3: "The presence, absence, or exact wording of reminder text has no effect on game function." 135.2.e.7: a keyword tied to an ability is marked with the `[>]` symbol. (official text via community transcription, **unverified** against the PDF) | riftbound.gg (rev. 2026-10-09); jeff425 hyperlinked CR (2026-07-16) | 2026-11-24 |
| B2 | Card text format (Riftcodex `text.plain`, mirrors the gallery): the keyword is in **square brackets**, the value **inside** the brackets, reminder text in **parentheses** right after, and costs and stats as **`:rb_…:` icon tokens**. `text.rich` wraps the same in `<p>` / `<br />` HTML. Examples, verbatim: Blazing Scorcher (OGN 001) `[Accelerate] (You may pay :rb_energy_1::rb_rune_fury: as an additional cost to have me enter ready.)`; Cleave (OGN) `Give a unit [Assault 3] this turn. (+3 :rb_might: while it's an attacker.)`; Master Yi - Unstoppable (UNL) `[Level 3][>] I cost :rb_energy_2::rb_rune_calm: less. (While you have 3+ XP, get the effect.)`; Dredge Up (VEN) `[Flow] :rb_energy_2: (You may play this from your trash for its Flow cost. Then banish it.)`. (community-db) | https://api.riftcodex.com/cards/riftbound/ogn-001 ; https://api.riftcodex.com/cards/search?query=… | 2026-11-24 |
| B3 | Riot's image alt text (Riftcodex `media.accessibility_text`, apparently Riot's) uses `[1][C]` / `[S]` placeholders instead of `:rb_…:`: `Riftbound Unit: Petty Officer. [Assault] (+1 [S] while I'm an attacker.)`. (community-db) | https://api.riftcodex.com/cards/name?fuzzy=Petty%20Officer | 2026-11-24 |
| B4 | **Brackets don't mean "keyword":** game actions are bracketed too, e.g. `[Add]`, `[Stun]` (Vi - Peacekeeper, Seal of Strength). Brackets are also **not always present**: Riot's Origins errata (2025-10-28) rewrote Disintegrate's `[Action]` as plain "Action (Play on your turn or in showdowns.)", and Riftcodex shows Laurent Bladekeeper (SFD) as `Ganking (I can move…)` with no brackets. So bracket parsing would give false hits and misses (input to SPEC-011 KW-031). (official errata; community-db) | https://playriftbound.com/en-us/news/rules-and-releases/riftbound-origins-card-errata/ ; Riftcodex search | 2026-11-24 |
| B5 | Reminder text is **per printing**: alt-art, overnumbered and signature printings often drop it. Examples: Rengar - Unseen (Alternate Art) is just `[Accelerate][Assault 2][Deflect][Ganking]`; LeBlanc - Everywhere At Once has `[Backline] (I must be assigned combat damage last.)` but her alt-art has bare `[Backline]`. (community-db) | Riftcodex search | 2026-11-24 |
| B6 | The official Card Gallery is client-rendered: its "ability" text couldn't be read with a fetch tool. Markup on playriftbound.com: **unverified**. | https://playriftbound.com/en-us/card-gallery/ | 2026-11-24 |

### C. What counts as a keyword (Q4)
| # | Fact | Source | As of |
|---|---|---|---|
| C1 | Rule 801 (as transcribed): a Keyword is "a specific term that appears on Cards that acts as a shorthand for a specific game effect, or ability of any variety." Rule 804 is the Keyword Glossary; the keywords are rules 805-832. (community transcription, unverified) | jeff425 hyperlinked CR; riftbound.gg TOC (rev. 2026-10-09); riftlens (says 2026-10-09, in effect 2026-10-16, 28 keywords) | 2026-11-24 |
| C2 | **Not keywords** under the glossary, though they look like it: game actions (Add, Stun, Buff, Predict, Kill, Banish, Hide, Burn Out…: rules ~400-433); **Burn** (Vendetta notes: "NEW RULE: Burn action added", so an action, although the LoL wiki lists it as a keyword); **Mighty** (a state term, not in 805-832); Bonus Damage and Neutral (they have reminder text on cards per Radiance and Origins errata, but are not in 805-832); tags (champion name, region, creature type); domains (Fury, Calm, Mind, Body…); card types and supertypes (Unit, Spell, Gear, Champion, Legend, Battlefield, Rune); **Signature** (a card attribute, see [[Deck Construction Rules]]); "Untargetable" (Vendetta notes call it a "property"). (official patch notes plus community TOC) | Vendetta CR patch notes; Radiance and Origins errata; riftbound.gg | 2026-11-24 |
| C3 | **Unique** is in the glossary (825) but works as a deck-building rule ("Deck Constraint Permission", 825.1 as transcribed). Riot's Unleashed notes: "Unique as a keyword was added" (it already appeared on three Spiritforged cards). | Unleashed CR patch notes (2026-03-30); riftlens /rules/unique/ | 2026-11-24 |
| C4 | Legends carry keywords: Master Yi - Wuju Master (UNL Legend) `[Level 6][>] …`; Diana - Scorn of the Moon (UNL Legend) `[Reaction][>] …`; Empower can target "this permanent or legend". The only card found carrying **Temporary** natively (pre-Radiance) is a token, the Sprite token (OGN). Battlefields seen only *grant* keywords (Kinkou Temple mentions [Tank]). No keyword seen on Runes. No keyword is limited to Legends, Battlefields or Runes in the rules. (community-db; **unverified**) | Riftcodex search | 2026-11-24 |
| C5 | Conflict: the LoL wiki lists 30 "keywords" (adds Buff, Mighty, Predict, Burn; omits Action, Reaction). The Core Rules glossary (as transcribed) has 28. **Follow the Core Rules**: the wiki is community, and Riot's Vendetta notes call Burn an action. | https://wiki.leagueoflegends.com/en-us/Riftbound:Keywords | 2026-11-24 |

### D. Changes (Q7)
| # | Fact | Source | As of |
|---|---|---|---|
| D1 | Core Rules patch notes (published 2025-10-24, Origins): Hidden's cost clarified to [A] (any domain), facedown-played cards gain Reaction; Accelerate cost matches the unit's domain, [A] if none or several; Deflect: refusing a triggered cost now makes it fail to finalize; Legion clarified. No renames or removals. (official) | https://playriftbound.com/en-us/news/rules-and-releases/riftbound-core-rules-patch-notes/ | 2026-11-24 |
| D2 | Spiritforged notes (published 2025-12-05, **effective 2025-12-12**): new Equip, Quick-Draw, Weaponmaster, Repeat; Deathknell clarified to track a unit after it dies. (official) | Spiritforged CR patch notes | 2026-11-24 |
| D3 | Unleashed notes (published 2026-03-30, effective date not stated): new Hunt, Level, Ambush, Unique, Backline; Legion rebuilt as a dependent keyword; new `[>]` symbol before abilities tied to Reaction, Action, Deathknell, Level and Legion (templating, not effect). (official) | Unleashed CR patch notes | 2026-11-24 |
| D4 | Vendetta notes (published 2026-07-17, **effective 2026-07-24**): new Empower, Empowered, Flow; Burn added as an action; Accelerate clarified (delayed replacement effect, so the unit still enters ready if it loses Accelerate). (official) | Vendetta CR patch notes | 2026-11-24 |
| D5 | Radiance notes (published 2026-10-09, **effective 2026-10-16**): new Deploy, Disarm, Show Off. On Disarm the notes say "Disarm stacks just like Assault or Shield" (an official mention of Assault and Shield) and give "If a unit has Disarm 2, they'll give an enemy unit -2 [M] this turn." "Pick" added as a rules term (not a keyword); Empower abilities may be activated again even at max Empowered. No renames or removals. (official) | Radiance CR patch notes | 2026-11-24 |
| D6 | Card errata touching keywords: Origins (2025-10-28) Disintegrate `[Action]` written without brackets; Pack of Wonders "[Hidden] card" → "facedown card". Spiritforged (2026-01-14) Jax, Unmatched: Quick-Draw reminder "It gains" → "Each gains [Reaction]" and grant widened to "Your Equipment everywhere"; Blood Rush: `[Assault 2]` now "this turn". Unleashed (2026-04-03): none. Vendetta (2026-07-23) Resonating Strike: Reaction reminder changed to "Play any time, even before spells and abilities resolve." Radiance (2026-10-09): none. No keyword was renamed or removed in any set. (official) | errata pages listed in sources | 2026-11-24 |

### E. Policy (Q8)
| # | Fact | Source | As of |
|---|---|---|---|
| E1 | Riftbound policy, verbatim lines: "Your App may only use Riftbound assets (including cards) provided by the Riot API." / "No external or unofficial materials." / "All Riftbound cards must display the official English text or—if available via the API—Riot's official translation…" / "Your App must implement all applicable rules for Riftbound found within the Riot API." The page has no last-updated date (footer © 2021). (official) | https://developer.riotgames.com/policies/riftbound | 2026-11-24 |
| E2 | The general fan policy ("Legal Jibber Jabber", Last Updated August 2018), section 3: "Please do not take any part of our IP (e.g., character appearance, character abilities, maps, icons, items, etc.) and use it in a game or app", unless the project has a written license or "a valid Riot API key" and complies with the API Terms and Policies. So an app's use of Riot material is governed by the API policy (E1). (official) | https://www.riotgames.com/en/legal | 2026-11-24 |
| E3 | **No Riot statement found** that allows or forbids showing Core Rules or glossary text in an app, or that says whether the Core Rules PDF is a "Riftbound asset". The docs list "rulesets" among API assets (A2), which suggests Riot expects rules to come **through the API**. | searched developer.riotgames.com docs and policies, riotgames.com/legal, Rules Hub | 2026-11-24 |

### F. Per-keyword table (Q4, Q5, Q6, Q9)
Rule numbers and the verbatim "functionally short for" text are from **community transcriptions** of the
official Core Rules (riftlens says rev. 2026-10-09, effective 2026-10-16; riftbound.gg says rev. 2026-10-09;
jeff425 is rev. 2026-07-16). The **reminder text** column is printed card text as mirrored by Riftcodex
(community), quoted from one named card. Reminder wording varies per card (values, domain icons, "me"/"it").
"Exists" = **verified** when an official Riot page (patch notes or overview) names it as a keyword.
**Every Definition entry is `status: unverified`** until checked against the official PDF.

**Per-row sourcing (columns Source / As of / Status):**
- **Rule quote:** either **RL** = riftlens per-keyword page `https://riftlens.pages.dev/rules/<keyword>/` (says Core Rules rev.
  **2026-10-09**, in effect 2026-10-16), or **JF** = jeff425 hyperlinked CR `https://jeff425.github.io/hyperlinked-rb-cr/`
  (rev. **2026-07-16**, from before Radiance). For every row, the rule *number* matches the riftbound.gg table of contents of rev.
  2026-10-09 (`https://riftbound.gg/rules/core-rules/`). Rows 26-28 (rules 830-832) are RL only. JF can't contain them.
- **Reminder quote:** the exact Riftcodex URL fetched (community mirror of Riot's gallery text), or the official Riot page where
  one exists.
- **Status** gives three parts: existence / rule text / reminder text.

| # | Keyword | Rule | Set added | Exists | Value / cost | Several instances | Short definition (own words) | Official text: rule (transcribed) / reminder text (card) | Reminder on ≥1 card? | Source | As of | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Accelerate | 805 | Origins | verified (D1, D4) | fixed extra cost, no value | redundant (805.4) | Pay 1 Energy plus 1 Power of the unit's domain as you play it, and it enters ready. | Rule 805.1.b: "As you play me, you may pay [1][C] as an additional cost. If you do, I enter ready." / Blazing Scorcher OGN 001: "(You may pay :rb_energy_1::rb_rune_fury: as an additional cost to have me enter ready.)" | yes | Rule: RL https://riftlens.pages.dev/rules/accelerate/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/riftbound/ogn-001 | 2026-11-24 | verified / unverified / unverified (community) |
| 2 | Action | 806 | Origins | verified (D3, D6) | no | not stated | The card can be played in showdowns on any player's turn, not only your own main phase. | Rule 806: "This can be played during showdowns on any player's turn." / Riot errata Disintegrate: "(Play on your turn or in showdowns.)" (official, 2025-10-28) | yes (official) | Rule: RL https://riftlens.pages.dev/rules/action/ (rev. 2026-10-09). Reminder: https://playriftbound.com/en-us/news/rules-and-releases/riftbound-origins-card-errata/ (official) | 2026-11-24 | verified / unverified / **verified** |
| 3 | Assault | 807 | Origins | verified (D5: "Disarm stacks just like Assault or Shield") | integer X in the brackets; omitted = 1 (807.1.b.3) | summed (807.2) | +X Might while this unit is attacking. | Rule 807.1.c: "While I am an attacker, I have +X [M]." / Petty Officer OGN: "(+1 :rb_might: while I'm an attacker.)" | yes | Rule: RL https://riftlens.pages.dev/rules/assault/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/name?fuzzy=Petty%20Officer. Existence: Radiance CR notes | 2026-11-24 | verified / unverified / unverified (community) |
| 4 | Deathknell | 808 | Origins | verified (D2, D3) | no | each triggers separately (808.2) | An effect that happens when this permanent dies. | Rule 808.1.c: "When I die, [Effect]." / Watchful Sentry OGN: "(When I die, get the effect.)" | yes | Rule: RL https://riftlens.pages.dev/rules/deathknell/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/name?fuzzy=Clanging%20Sentry (returns Watchful Sentry) | 2026-11-24 | verified / unverified / unverified (community) |
| 5 | Deflect | 809 | Origins (rules) | verified (D1) | integer X; omitted = 1 (809.1.b.3); no printed value found | summed (809.2) | Opponents' spells and abilities that choose this pay X extra Power of any domain. | Rule 809.1.c (paraphrased: opponent-controlled spells and abilities that target it cost the Deflect Value in Power more) / Allay, Eager Admirer UNL: "(Opponents must pay :rb_rune_rainbow: to choose me with a spell or ability.)" | yes | Rule: RL https://riftlens.pages.dev/rules/deflect/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Deflect&size=50 | 2026-11-24 | verified / unverified / unverified (community) |
| 6 | Ganking | 810 | Origins | **unverified** | no; no activation cost (810.1.c.2) | redundant (810.2) | The unit's standard move can go straight from one battlefield to another. | Rule 810.1.b: "I may move to a battlefield from another battlefield with a standard move." / Master Yi - Honed OGS: "(I can move from battlefield to battlefield.)" | yes | Rule: RL https://riftlens.pages.dev/rules/ganking/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Ganking&size=50 | 2026-11-24 | **unverified** / unverified / unverified (community) |
| 7 | Hidden | 811 | Origins | verified (D1) | fixed cost 1 Power of any domain | redundant (811.4) | Pay 1 Power to set the card facedown at a battlefield you control; play it later as a Reaction. | Rule 811.1 (paraphrased: prerequisite for the Hide action) / Teemo - Strategist OGN: "(Hide now for :rb_rune_rainbow: to react with later for :rb_energy_0:.)" | yes | Rule: RL https://riftlens.pages.dev/rules/hidden/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Hidden&size=10 | 2026-11-24 | verified / unverified / unverified (community) |
| 8 | Legion | 812 | Origins | verified (D1, D3) | no (dependent) | each Legion ability on by one card played | Extra text applies if you've already played another card this turn. | Rule 812 (as summarized: "If you have played another card this turn, this card gains [Text]") / Noxus Hopeful OGN: "(Get the effect if you've played another card this turn.)" | yes | Rule: RL https://riftlens.pages.dev/rules/legion/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Legion&size=10 | 2026-11-24 | verified / unverified / unverified (community) |
| 9 | Reaction | 813 | Origins | verified (D3, D6) | no | not stated | Playable any time, including in closed states before spells and abilities resolve. | Rule 813: "This can be played during Closed States on any player's turn." / Riot errata Resonating Strike: "(Play any time, even before spells and abilities resolve.)" (official, 2026-07-23) | yes (official) | Rule: RL https://riftlens.pages.dev/rules/reaction/ (rev. 2026-10-09). Reminder: https://playriftbound.com/en-us/news/announcements/vendetta-errata-updates (official); also Wind Wall OGN at https://api.riftcodex.com/cards/search?query=Play%20any%20time&size=20 | 2026-11-24 | verified / unverified / **verified** |
| 10 | Shield | 814 | Origins | verified (D5: "Disarm stacks just like Assault or Shield") | integer X; omitted = 1 (814.1.b.3) | summed (814.2) | +X Might while this unit is defending. | Rule 814.1.c: "While I am a defender, I have +X [M]." / Stalwart Poro: "(+1 :rb_might: while I'm a defender.)" | yes | Rule: RL https://riftlens.pages.dev/rules/shield/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/name?fuzzy=Stalwart%20Poro. Existence: Radiance CR notes | 2026-11-24 | verified / unverified / unverified (community) |
| 11 | Tank | 815 | Origins | **unverified** | no | redundant (815.2) | In combat this unit must be assigned lethal damage before your other non-Tank units. | Rule 815.1.b: "I must be assigned lethal damage before any other unit…" / Lecturing Yordle OGN: "(I must be assigned combat damage first.)" | yes | Rule: RL https://riftlens.pages.dev/rules/tank/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Tank&size=10 | 2026-11-24 | **unverified** / unverified / unverified (community) |
| 12 | Temporary | 816 | Origins | **unverified** | no | redundant (816.2) | The permanent is killed at the start of its controller's Beginning Phase, before scoring. | Rule 816.1.b: "At the start of this permanent's controller's Beginning Phase, before scoring, kill this." / Sprite token OGN: "(Kill me at the start of your Beginning Phase, before scoring.)" | yes (token) | Rule: RL https://riftlens.pages.dev/rules/temporary/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Temporary&size=10 | 2026-11-24 | **unverified** / unverified / unverified (community) |
| 13 | Vision | 817 | Origins | **unverified** | no | each triggers separately | When played, look at the top card of your Main Deck and you may recycle it (Predict). | Rule 817 (as summarized: "When this is played, [Predict].") / Mystic Poro OGN: "(When you play me, look at the top card of your Main Deck. You may recycle it.)" | yes | Rule: RL https://riftlens.pages.dev/rules/vision/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Vision&size=10 | 2026-11-24 | **unverified** / unverified / unverified (community) |
| 14 | Equip | 818 | Spiritforged | verified (D2) | `[Equip] <cost>` (icon tokens) | separate activated abilities (818.4) | Pay the cost to attach this Equipment to a unit you control. | Rule 818.1.c.2: "[Cost]: Attach this gear to a unit you control." / Rabadon's Deathcrown SFD: "(:rb_rune_rainbow:: Attach this to a unit you control.)" | yes | Rule: JF https://jeff425.github.io/hyperlinked-rb-cr/ (rev. **2026-07-16**). Reminder: https://api.riftcodex.com/cards/search?query=Unique&size=10 | 2026-11-24 | verified / unverified (older revision) / unverified (community) |
| 15 | Quick-Draw | 819 | Spiritforged | verified (D2) | no | not stated | The Equipment has Reaction and attaches to a unit you control when played. | Rule 819.1.d: "[Reaction]" and "When you play this, attach it to a Unit you control." / Sterak's Gage SFD: "(This has [Reaction]. When you play it, attach it to a unit you control.)" | yes | Rule: JF (rev. **2026-07-16**). Reminder: https://api.riftcodex.com/cards/search?query=Quick-Draw&size=10 | 2026-11-24 | verified / unverified (older revision) / unverified (community) |
| 16 | Repeat | 820 | Spiritforged | verified (D2) | `[Repeat] <cost>` | each cost paid or not individually (820.1.c.2) | Pay the extra cost to resolve the spell's effect one more time. | Rule 820.1.d: "You may pay [Cost] as an additional cost as you play this." / Desert's Call SFD: "(You may pay the additional cost to repeat this spell's effect.)" | yes | Rule: RL https://riftlens.pages.dev/rules/repeat/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Repeat&size=10 | 2026-11-24 | verified / unverified / unverified (community) |
| 17 | Weaponmaster | 821 | Spiritforged | verified (D2) | no (uses Equip cost minus 1 Power) | not stated | When played, you may attach one of your Equipment to it, paying its Equip cost reduced by 1 Power. | Rule 821.1.c (starts "When you play me, you may choose a Card you control with the Equipment tag…") / Master Bingwen SFD: "(When you play me, you may [Equip] one of your Equipment to me for :rb_rune_rainbow: less, …)" (truncated in our read) | yes | Rule: JF (rev. **2026-07-16**). Reminder: https://api.riftcodex.com/cards/search?query=Weaponmaster&size=10 | 2026-11-24 | verified / unverified (older revision) / unverified (community, truncated) |
| 18 | Ambush | 822 | Unleashed | verified (D3) | no | redundant (822.2) | The unit may be played as a Reaction to a battlefield where you control units. | Rule 822.1.b (as summarized: "I may be played to a battlefield where you control Units", with Reaction while doing so) / Soulspinner VEN: "(You may play me as a [Reaction] to a battlefield where you have units.)" | yes | Rule: RL https://riftlens.pages.dev/rules/ambush/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Ambush&size=50 | 2026-11-24 | verified / unverified / unverified (community) |
| 19 | Hunt | 823 | Unleashed | verified (D3) | integer X; omitted = 1 (823.1.c.2) | summed (823.2) | When this unit conquers or holds, its controller gains X XP. | Rule 823.1.c.1: "When I Conquer or Hold, my controller gains X XP." / Voracious Gromp UNL `[Hunt 3]`: "(When I conquer or hold, gain 3 XP.)" | yes | Rule: RL https://riftlens.pages.dev/rules/hunt/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Hunt&size=10 | 2026-11-24 | verified / unverified / unverified (community) |
| 20 | Level | 824 | Unleashed | verified (D3) | integer N threshold inside the brackets (`[Level 6][>]`) | **one card can carry several Level abilities with different N** (Master Yi - Unstoppable: 3, 6, 11, 16); no stacking rule found | Extra text applies while you have N or more XP. | Rule 824.1.b.1: "While you have [N] or more XP, this card gains '[Text]'." / Master Yi - Unstoppable UNL: "(While you have 3+ XP, get the effect.)" | yes | Rule: RL https://riftlens.pages.dev/rules/level/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Level&size=10 | 2026-11-24 | verified / unverified / unverified (community) |
| 21 | Unique | 825 | Unleashed (rule; printed on SFD cards first) | verified (C3) | no | n/a | A deck may contain only one card with this name. | Rule 825.3.a: "A deck can contain only one card of a given name if the card has Unique." / Rabadon's Deathcrown SFD: "(Your deck can have only 1 card with this name.)" | yes | Rule: RL https://riftlens.pages.dev/rules/unique/ (rev. 2026-10-09). Reminder: https://api.riftcodex.com/cards/search?query=Unique&size=10 | 2026-11-24 | verified / unverified / unverified (community) |
| 22 | Backline | 826 | Unleashed | verified (D3) | no | redundant (826.5) | In combat this unit is assigned lethal damage after your other non-Backline units. | Rule 826.3 (starts "I must be assigned lethal damage after any other unit with the same…") / LeBlanc - Everywhere At Once UNL: "(I must be assigned combat damage last.)" | yes | Rule: JF (rev. **2026-07-16**). Reminder: https://api.riftcodex.com/cards/search?query=Backline&size=10 | 2026-11-24 | verified / unverified (older revision) / unverified (community) |
| 23 | Empower | 827 | Vendetta | verified (D4) | `[Empower] <cost>` | separate activated abilities (827.3) | Pay the cost to give this card the Empowered status, only if it isn't Empowered yet. | Rule 827.1.c.1: "[Cost]: Empower this. Play only if not Empowered." / Punching Poro VEN: "(Pay the cost: Empower me. Use only if not Empowered.)" | yes | Rule: JF (rev. **2026-07-16**; Radiance later changed Empower re-activation, D5). Reminder: https://api.riftcodex.com/cards/search?query=Empower&size=10 | 2026-11-24 | verified / unverified (older revision) / unverified (community) |
| 24 | Empowered | 828 | Vendetta | verified (D4) | no (dependent) | not stated | Extra text applies while this card has the Empowered status. | Rule 828.1.b.1: "While I have the Empowered status, this card gains "[Text]"." / **no reminder text found** | **none found** | Rule: JF (rev. **2026-07-16**). No reminder: https://api.riftcodex.com/cards/search?query=Empowered&size=50 | 2026-11-24 | verified / unverified (older revision) / n/a |
| 25 | Flow | 829 | Vendetta | verified (D4) | `[Flow] <cost>` | different costs: controller picks one (829.1.c.3) | You may play the spell from your trash for its Flow cost, then banish it. | Rule 829.1.b: "You may play this from your trash for its flow cost. Then banish it." / Dredge Up VEN: "(You may play this from your trash for its Flow cost. Then banish it.)" | yes | Rule: JF (rev. **2026-07-16**). Reminder: https://api.riftcodex.com/cards/search?query=Flow&size=10 | 2026-11-24 | verified / unverified (older revision) / unverified (community) |
| 26 | Deploy | 830 | Radiance | verified (D5) | no | redundant (830.2) | Gear played only to a battlefield; it stays there and is killed when an opponent holds that battlefield. | Rule 830.1: "Deploy is a Passive Ability and a Triggered Ability keyword." / Riot overview: "Play this Gear only to a Battlefield and it will grant benefits while there." (no card reminder text checked) | **unknown** (RAD not mirrored) | Rule: RL https://riftlens.pages.dev/rules/deploy/ (rev. 2026-10-09). Overview: https://playriftbound.com/en-us/news/announcements/the-radiance-overview/ (official) | 2026-11-24 | verified / unverified / unknown |
| 27 | Disarm | 831 | Radiance | verified (D5) | integer X; omitted = 1 (831.1.c.3). Riot's example: "If a unit has Disarm 2, they'll give an enemy unit -2 [M] this turn." | summed, one trigger (831.1.d.1, 831.2). Riot: "Disarm stacks just like Assault or Shield" | The first time this unit attacks in a combat, an enemy unit at its battlefield gets -X Might this turn. | Rule 831.1.d: "When I attack, give an enemy unit here -X [M] this turn." / Riot notes: "The first time a unit with Disarm attacks each combat, they will give an enemy unit at their battlefield -1 [M] this turn." / card reminder text not checked | **unknown** | Rule: RL https://riftlens.pages.dev/rules/disarm/ (rev. 2026-10-09). Example, stacking and first-attack wording: https://playriftbound.com/en-us/news/announcements/core-rules-radiance-patch-notes-effective-october-16-2026/ (official) | 2026-11-24 | verified / unverified (rule), **verified** (Riot notes wording) / unknown |
| 28 | Show Off | 832 | Radiance | verified (D5) | no | treated separately (832.2) | As you play the card, reveal a qualifying card from hand or pick one on your board to unlock an extra effect. | Rule 832 (as summarized: an "as you play this" reveal or pick) / Riot overview: "Reveal, or "Show Off," a qualifying card from your hand or on your board to unlock a new effect of the played card." | **unknown** | Rule: RL https://riftlens.pages.dev/rules/show-off/ (rev. 2026-10-09). Overview: https://playriftbound.com/en-us/news/announcements/the-radiance-overview/ (official) | 2026-11-24 | verified / unverified / unknown |

Counts: **28 keywords.** Existence verified from an official Riot page: **24**. Existence unverified (community
only): **4** (Ganking, Tank, Temporary, Vision). Verbatim definitions checked against the official PDF: **0**
(all 28 rule-text entries `status: unverified`; 7 of them (rows 14, 15, 17, 22-25) come from the older 2026-07-16 copy).
Official reminder text seen in a Riot document: 2 (Action, Reaction).

### G. Answers to the SPEC-011 research questions
| Q | Answer | Status |
|---|---|---|
| Q1 | Documented: `keywords: List[string]`. Format, casing, value-in-string, order, duplicates, granted keywords and the empty result: **H-020 only**. | partly unverified |
| Q2 | No definition or reminder field and no rules endpoint is documented. Reminder text probably sits inside `description`, like the printed card (H-020). Docs and policy mention "rulesets" / "rules … found within the Riot API" without an endpoint. `tags[]` = champion, region, creature type in community data (H-020 to confirm). | unverified |
| Q3 | `[Keyword N]` in square brackets, value inside, reminder text in parentheses after it, `:rb_…:` icon tokens, `[>]` before tied abilities, HTML `<p>` in rich text. Brackets also mark game actions and are sometimes missing (B4). See B2 for 4 verbatim examples. | community mirror; official markup unverified |
| Q4 | Table F (28). Introductions from official patch notes; the Origins 13 are inferred from base rules plus OGN cards. None is limited to Legends, Battlefields or Runes; Temporary found natively only on a token. Non-keywords: C2. | mixed |
| Q5 | Integer value: Assault, Shield, Deflect, Hunt, Disarm (omitted = 1, summed); Level (threshold, several per card). Cost-bearing: Accelerate (fixed), Hidden (fixed), Equip, Repeat, Empower, Flow (printed cost). No `X` value seen on a printed keyword. | unverified (rule text) |
| Q6 | Two official forms exist: **full rule** (Core Rules 805-832) and **reminder text** (per card, optional, non-functional, varies per card). No official per-keyword short glossary text on Riot's site was found. "As of": the Core Rules' own date **2026-10-09** ("Last Updated"; in effect 2026-10-16), plus the date research checked it (2026-11-24). | unverified |
| Q7 | Table D. No renames or removals. Definition clarifications: Hidden, Accelerate, Deflect, Legion (2025-10-24); Deathknell (2025-12-12); Legion (Unleashed); Accelerate (2026-07-24). | verified (official) |
| Q8 | E1-E3. Strict reading: rules text not delivered by the API is an "external … material", so B/C are **not clearly allowed**. Ask Riot in the App Note (H-011). Card `description` text from the API is allowed. | verified policy lines; interpretation is ours |
| Q9 | Reminder text found on ≥1 card: 24 of the 25 pre-Radiance keywords; **none found for Empowered**; Deploy, Disarm, Show Off **unknown** (no RAD mirror). Reminder text is missing on many alt-art, overnumbered, signature and Legend printings, and its wording is card-specific, so it doesn't make a per-keyword glossary by itself. | community-db, unverified |

## Conflicts / uncertainties
- **status: conflict** Disarm value: the LoL wiki says Disarm has no value ("-1"); Riot's Radiance notes say "Disarm stacks just like Assault or Shield" and give a "Disarm 2" example, and the overview says each instance makes it stronger; the transcribed rule 831 has X (default 1). Official sources win: **Disarm takes a value**.
- **status: conflict** Keyword count: wiki 30 (adds Buff, Mighty, Predict, Burn); other guides 27 or 28; the Core Rules glossary as transcribed has 28 (805-832). Using 28.
- The official Core Rules PDF (2026-10-09) was fetched but couldn't be text-extracted here (no PDF tool). **All rule numbers and verbatim rule text need a check against the PDF** before any of it is shown in the app.
- The rule-text quotes come from three community transcriptions of different revisions (2026-07-16 and 2026-10-09). Rules 805-817 were not changed between them per the Radiance notes, but this hasn't been diffed.
- Riftcodex text is a community copy of Riot's gallery text and lags (no RAD). Bracket and icon markup in the **official API** may differ.
- Introduction set for Deflect: in the Origins rules (D1), but the first printed card wasn't identified (examples found are UNL).

## Impacts
_Which specs this affects:_ [[Keyword Explanations]] (KW-011a, KW-012a, KW-030a-034a, KW-054, refresh rows) ·
[[ADR-0008 Keyword Glossary Source]] (Q8 answer) · [[Card Data Model]] CARD-028 (format of `keywords[]` still H-020) ·
[[Riot App Application]] (App Note question on showing rules text)
