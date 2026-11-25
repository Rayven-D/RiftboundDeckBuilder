---
tags: [moc, research]
---
# Research Index

Owner: **researcher**. Every note needs sources and an *as-of* date. Status: `todo` · `unverified` · `verified` · `conflict` · `stale`

## Queue (initial)
| Topic | Note | Status | Key questions |
|---|---|---|---|
| Core rules | [[Rules Overview]] | verified | Latest official rules doc & version? Turn structure, win condition |
| Deck construction | [[Deck Construction Rules]] | verified | Deck size, copy limits, legend/champion, runes, battlefields, domain restrictions |
| Card keywords | [[Card Keywords]] | unverified | 28 keywords (Core Rules 805-832, rev. 2026-10-09), set added, values and stacking, reminder text, API `keywords[]` (format needs H-020), policy on showing rules text (H-089) |
| Physical copies across decks | [[Physical Copies Across Decks]] | verified | Which sections share physical cards (champion = main pool; Legend / Battlefields separate but physical); can runes be ignored? |
| Organized play formats | [[Formats]] | conflict | Which formats exist (constructed, limited)? Which do we support? |
| Ban & restriction list | [[Ban List]] | verified | Current official list for organized play, effective dates, change history |
| Sets & release schedule | [[Sets]] | unverified | Released sets, set codes, upcoming releases & rotation (if any) |
| Card data & images | [[Card Data & Images]] | unverified | Official card gallery/API? Community DBs? Stable IDs? **Terms: hotlink vs. cache?** |
| Meta overview | [[Meta Overview]] (archived) | archived | Background only; app shows no meta stats (ADR-0003) |
| Tournaments | [[Tournament Results]] | unverified | Major events worldwide (Regionals, Nationals, Worlds…), placings, decklist sources |
| Import formats | [[Collection Import Formats]] | unverified | Formats other deck sites/apps export, to support importing from them |

## Policy
| Topic | Note | Status | Notes |
|---|---|---|---|
| Applying for a production key | [[Riot App Application]] | verified | Register Product, then the application; needs a reachable URL to a prototype or mockup |
| Riot developer rules | [[Riot Developer Rules]] | verified | Development key = prototype only; the app stays free; no Riot logos or lookalike design; Riot API is the only data source |
| Privacy notice for accounts (H-069) | [[Privacy Notice Requirements]] | partial | Not legal advice. CalOPPA most likely applies; write to GDPR standard anyway; Google = processor; no cookie banner needed (strictly necessary storage, no analytics); Riot sets no user-data rule; ends with the SYNC-101 checklist |

## Decklists
Stored one per note in `Decklists/` using the Decklist template.

| Event | Note | Status |
|---|---|---|
| RC Europe 2026 (Stuttgart, 2026-11-06 to 08), #1 | [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] | verified · banned cards now |
| RC Europe 2026, #2 | [[2026-11 RC Europe - 2 - Sonecon - Riven]] | verified · banned cards now |
| RC Europe 2026, #3 | [[2026-11 RC Europe - 3 - DiamondHat - Riven]] | verified · banned cards now |
| RC Europe 2026, #4 | [[2026-11 RC Europe - 4 - BQO Caravaggio - Riven]] | verified · banned cards now · identical to #6 in source |
| RC Europe 2026, #5 | [[2026-11 RC Europe - 5 - CTCG DZiden - Kai'Sa]] | verified · banned cards now |
| RC Europe 2026, #6 | [[2026-11 RC Europe - 6 - lets see lol - Riven]] | verified · banned cards now · identical to #4 in source |
| RC Europe 2026, #7 | [[2026-11 RC Europe - 7 - HXN Gonkra - Kennen]] | verified · banned cards now |
| RC Europe 2026, #8 | [[2026-11 RC Europe - 8 - On Curve Willy - Kennen]] | verified · banned cards now |

_First pass 2026-11-23. Headlines: the Riot API policy limits image sources and bans "metagame-defining data"
(see [[Card Data & Images]]). A new ban wave takes effect 2026-11-23 (see [[Ban List]]). Rotation timing conflicts (see [[Formats]])._
