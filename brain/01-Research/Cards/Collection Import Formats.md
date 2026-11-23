---
tags: [research]
area: cards
status: unverified
as_of: 2026-11-23
sources:
  - url: https://playriftbound.com/en-us/news/organizedplay/best-ofs-for-the-european-championship
    tier: official
  - url: https://support.carde.io/en/articles/13773699-submit-a-riftbound-deck-for-an-event
    tier: organizer
  - url: https://app.unpkg.com/@piltoverarchive/riftbound-deck-codes@1.0.0/files/README.md
    tier: community-db
  - url: https://piltoverarchive.com/news/piltover-archive-update-whats-new
    tier: community-db
  - url: https://alan-cha.github.io/silhouette-card-maker/plugins/riftbound
    tier: community-db
  - url: https://www.tcgstacked.com/riftbound/collection-tracker
    tier: community-db
  - url: https://riftcodex.com/docs/endpoints/cards
    tier: community-db
---
# Collection Import Formats

## Summary
There's **no standard collection export format** for Riftbound yet. Most tools exchange **decklists**,
not collections. The formats worth supporting are: (1) a **plain text list**, `<qty> <card name>` per line,
optionally with section headers like Riot's own (`Legend:`, `Champion:`, `Main Deck:`, `Battlefields:`,
`Rune Pool:`, `Sideboard:`); (2) **Piltover Archive deck codes** (an open, Apache-2.0 base32/varint
format adapted from LoR deck codes, using card codes like `OGN-007a`); (3) **TTS** lines of
`SET-NUMBER-COPY`; and (4) **CSV** with at least a card-name column (TCGplayer-style exports). Matching by
**name** covers everything. Matching by **set + collector number (+ variant)** is more precise for
collections. Riftcodex exposes `tcgplayer_id`, which helps map TCGplayer CSVs.

## Formats
| Format | Used by | Shape | Identifies cards by | Notes |
|---|---|---|---|---|
| Riot decklist text | Riot event recaps; the Riftbound Play Network "Export → Copy/Download TXT" | Section labels Legend / Champion / Main Deck / Battlefields / Rune Pool / Sideboard, then `<qty> <name>` lines | exact card name (with subtitle, e.g. `Kennen, Storm of Shuriken`) | Layout seen directly on Riot's page. The Play Network export layout itself is **unconfirmed**. |
| Piltover Archive text | piltoverarchive.com | `<qty> <name>` lines, groups separated by blank lines, no headers | name | from the silhouette-card-maker docs |
| Piltover Archive deck code | piltoverarchive.com, npm `@piltoverarchive/riftbound-deck-codes` | base32 string. Header nibble = format/version (V2 from 2025-11-20 adds sideboard) | `SET-NNN[variant]` e.g. `OGN-007a`, with set IDs OGN = 0, OGS = 1, ARC = 2, SFD = 3 and variant IDs a/s/b | Only main deck + sideboard. Doesn't validate rules. **The set table in v1.0.0 stops at SFD**, so check the latest package version for UNL/VEN/RAD. |
| Pixelborn code | Pixelborn (online client) | base64-like string ending `==` | — | Pixelborn reportedly **shut down 2025-08-07**. Low priority. |
| TTS | Tabletop Simulator mods | space-separated `SET-NUMBER-COPY` tokens, one per physical copy | set + collector number | e.g. `OGN-265-1 OGN-265-1` |
| CSV (collection) | TCGplayer app exports, TCG Stacked (also reads Moxfield, Deckbox, Dreamborn CSVs) | header row. "Card name" is the minimum column | name (+ set/number/printing if present) | Exact TCGplayer Riftbound column set **not verified** |

## Facts
| # | Fact | Source | As of |
|---|---|---|---|
| 1 | Riot publishes decklists with labelled sections (Legend, Champion, Main Deck, Battlefields, Rune Pool, Sideboard) and `<qty> <name>` entries. (official) | Riot RC Europe article | 2026-11-23 |
| 2 | The Riftbound Play Network supports deck submission by pasting full text exported from "My Decks → Export" (Copy to Clipboard / Download TXT). (organizer) | https://support.carde.io/en/articles/13773699-submit-a-riftbound-deck-for-an-event | 2026-11-23 |
| 3 | Piltover Archive deck codes: VarInt arrays, base32-encoded, grouped by copy count. Card code = 3-char set + 3-digit number + optional variant letter. Apache-2.0, adapted from Riot's LoRDeckCodes. (community) | npm README | 2026-11-23 |
| 4 | Piltover Archive (2025-06-22 update) switched to LoR-style deck codes and added a Pixelborn export. (community) | https://piltoverarchive.com/news/piltover-archive-update-whats-new | 2026-11-23 |
| 5 | TCG Stacked's collection tracker imports CSV and auto-recognizes TCGplayer, Moxfield, Deckbox and Dreamborn exports. Other CSVs need a card-name column. (community) | https://www.tcgstacked.com/riftbound/collection-tracker | 2026-11-23 |
| 6 | Riftcodex lets you look up cards by `tcgplayer_id` (`/cards/tcgplayer/{id}`) and by Riftbound ID (`ogn-011`, partial match). (community) | https://riftcodex.com/docs/endpoints/cards | 2026-11-23 |

## Conflicts / uncertainties
- Names are ambiguous across printings (base vs. alt-art vs. Showcase vs. signature). For *collection* import, ask for or keep set + number when available. For *matching*, collapse printings by name (the copy limit is per name: [[Deck Construction Rules]]).
- The full export layouts of the Play Network, TCGplayer and other trackers weren't confirmed. Get real sample files.
- Possible apps to check: Riftbound Companion (iOS), Rift TCG Scanner, DeckTradr. Their exports haven't been reviewed.

## Impacts
_Which specs this affects:_ [[Collection Import]] · [[Card Data Model]] (name normalization, set/number/variant keys, external IDs such as TCGplayer)
