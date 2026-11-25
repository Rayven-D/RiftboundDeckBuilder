---
tags: [research]
area: cards
status: unverified
as_of: 2026-11-24
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
| Piltover Archive deck code | piltoverarchive.com, npm `@piltoverarchive/riftbound-deck-codes` | base32 string. Header nibble = format/version (V2 from 2025-11-20 adds sideboard) | `SET-NNN[variant]` e.g. `OGN-007a`, with set IDs OGN = 0, OGS = 1, ARC = 2, SFD = 3 and variant IDs a/s/b | Only main deck + sideboard. Doesn't validate rules. The set table in v1.0.0 stopped at SFD; **v1.5.0 adds UNL 4, VEN 5, RAD 6** (see fact 7). |
| Pixelborn code | Pixelborn (online client) | base64-like string ending `==` | — | Pixelborn reportedly **shut down 2025-08-07**. Low priority. |
| TTS | Tabletop Simulator mods | space-separated `SET-NUMBER-COPY` tokens, one per physical copy | set + collector number | e.g. `OGN-265-1 OGN-265-1`. The last number is an art number, not a copy count (fact 8). |
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
| 7 | **Piltover Archive set and variant tables (npm 1.5.0, 2026-09-19; H-022):** set IDs OGN 0, OGS 1, ARC 2 (Arcane Box Set), SFD 3, UNL 4, VEN 5, RAD 6. Variant IDs: none = base (0), `a` = alternate art A (1), `s` or `*` = signed (2), `b` = alternate art B (3). The code also accepts a special prefix, e.g. `VEN-SP1a`. Format versions: v2 sideboard (2025-11-20), v3 chosen champion (2026-01-10), v4 runes (2026-03-04), v5 sparse copy counts and `SP` cards (2026-07-15), v6 additional legends (2026-09-19). Example codes from the README: `OGN-007a`, `VEN-SP1a`. (community) | https://app.unpkg.com/@piltoverarchive/riftbound-deck-codes@1.5.0/files/README.md ; https://registry.npmjs.org/@piltoverarchive/riftbound-deck-codes | 2026-11-24 |
| 8 | **TTS suffix (H-022):** in `SET-NUMBER-N` the trailing number is an **art number, not a copy count**. In the silhouette-card-maker parser the pattern is `SET-<digits+optional letter>-<art number>`; art 1 = the base card, art above 1 is treated as alternate art (`ABC-012-2` becomes `ABC-012a`). One token is listed per physical copy (`OGN-245-1` three times = three copies), and the tool ignores names and sets quantity 1 per line. This is one community tool's reading; the Riftseer TTS mod page does not document its importer syntax. (community, code) | https://raw.githubusercontent.com/Alan-Cha/silhouette-card-maker/main/plugins/riftbound/deck_formats.py ; https://alan-cha.github.io/silhouette-card-maker/plugins/riftbound ; https://steamcommunity.com/sharedfiles/filedetails/?id=3732199052 | 2026-11-24 |
| 9 | **Riot decklist text, sample (RC Europe article, #1 list):** bold labels with a trailing colon (`Legend:`, `Champion:`, `Main Deck:`, `Battlefields:`, `Rune Pool:`, `Sideboard:`), then `<qty> <full card name>` lines with single line breaks and no blank lines between sections. Short example: `Legend:` / `1 Kennen, Heart of the Tempest`, `Champion:` / `1 Kennen, Storm of Shuriken`, `Battlefields:` / `1 Minefield`, `Rune Pool:` / `9 Chaos Rune`, `Sideboard:` / `2 Decree of Unity`. The labels are markdown bold in the web page, so a copy may arrive as `**Legend:**`; a parser should strip `*` and trailing `:`. (official) | https://playriftbound.com/en-us/news/organizedplay/best-ofs-for-the-european-championship | 2026-11-24 |
| 10 | **CSV and TXT export samples: not obtainable from public sources (H-022).** Tried: TCGplayer help pages (describe only the legacy-app collection export, no Riftbound columns), TCG Stacked's tracker page (only says it auto-detects TCGplayer, Moxfield, Deckbox, Dreamborn CSVs and needs a name column), Riftbound Play Network / carde.io support article (the URL returned 404 on 2026-11-24). Real sample files require exporting from the apps. Status stays `unverified`: the first Collection Import should accept a header row, a name column, and optional quantity, set, number and printing columns. | https://www.tcgstacked.com/riftbound/collection-tracker ; https://help.tcgplayer.com/hc/en-us/articles/17474327281303 | 2026-11-24 |

## Conflicts / uncertainties
- Names are ambiguous across printings (base vs. alt-art vs. Showcase vs. signature). For *collection* import, ask for or keep set + number when available. For *matching*, collapse printings by name (the copy limit is per name: [[Deck Construction Rules]]).
- The full export layouts of the Play Network, TCGplayer and other trackers weren't confirmed. Get real sample files.
- Possible apps to check: Riftbound Companion (iOS), Rift TCG Scanner, DeckTradr. Their exports haven't been reviewed.

## Impacts
_Which specs this affects:_ [[Collection Import]] · [[Card Data Model]] (name normalization, set/number/variant keys, external IDs such as TCGplayer)
