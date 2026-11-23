# Rift Builder sample cards (fixture)

These cards are invented for local UI work while we wait for the Riot API key. None of the data or images comes from Riot or any community source, so you can commit it to the repo. Remove the files once real card data is in.

## Where things are in the repo
| Path | What it is |
|---|---|
| `data/samples/fixture/riot-contents.fixture.json` | 58 printings (52 card names) across OGN, OGS, SFD, UNL, VEN, RAD, in the shape of Riot's `riftbound-content-v1` `/contents` response |
| `web/public/fixture-cards/*.svg` | Placeholder art, one per printing. `art.thumbnailURL` and `art.fullURL` point to `/fixture-cards/<id>.svg` |
| `data/samples/fixture/fixture-bans.json` | Two ban waves: one in effect (Nov 23, 2026) and one upcoming (Dec 15, 2026). Rename the fields to match SPEC-002 |
| `data/samples/fixture/imports/collection.txt` | Owned Cards Import, `qty name` |
| `data/samples/fixture/imports/collection.csv` | Same collection by printing (Quantity, Card Name, Set, Collector Number), including alt-art and overnumbered copies |
| `data/samples/fixture/imports/deck-*.txt` | Deck Import lists with Riot-style section labels |
| `data/samples/fixture/generate.py` | Regenerates the JSON and SVGs: `python3 generate.py <out_dir>` |

## Load it into the API
From `services/`:

```
npm run ingest:fixture
```

This writes `data/cards.json` from the fixture. Running the real ingest later replaces it.

## What each test case covers
- **Two legal decks:**
  - Varrow (Fury + Body) and Sorrel (Mind + Calm).
  - Each has a 40-card main deck including the Chosen Champion, 3 Signature cards, 12 runes and 3 distinct battlefields.
- **One illegal deck** (`deck-varrow-illegal.txt`) breaks almost every rule:
  - 4 copies of Cinder Recruit.
  - Off-domain cards: Chaos Gambit, Recall Current, Iron Magistrate, Oathbound Squire.
  - 5 Signature cards.
  - 11 runes.
  - A duplicate battlefield.
  - A sideboard of 11.
  - The banned Iron Magistrate and Gallows Market.
- **Ownership against the collection:**
  - The Varrow deck mixes cards you fully own, partly own (Kiln Brawler 2 of 3, Ironbark Hauler 1 of 3, Furnace Charge 2 of 3) and don't own (Rampart Ox, Trailbreaker, Bloodline Gauntlet).
  - The Sorrel deck is mostly unowned.
  - Recall Current is owned ×4, which is more than a deck can use.
- **Ban status:** Iron Magistrate and Gallows Market are banned. Thought Snare (Sorrel deck) is upcoming, so the deck is still legal today.
- **Printings:**
  - Alt-art versions: OGN-001a, OGN-004a, SFD-005a.
  - Overnumbered versions: OGN-301, SFD-251.
  - A reprint in a later set: Flashfire, at OGN-005 and RAD-011.
  - These test My collection's ×N badges, sort order, and grouping by name in Your decks.
- **Card types:** Legend, Champion, Unit, Spell, Gear, Rune, Battlefield. Battlefield art is landscape.

## Guesses to replace once the real API responds
The response shape was taken from a secondhand copy of Riot's docs. These choices are mine:
- `type` uses `Champion` for champion units.
- `faction` is a comma-separated string, e.g. `"Fury, Body"` for Legends.
- Champion and Legend links use a shared tag: the champion's name in `tags`.
- Signature cards carry a `"Signature"` tag.
- Energy cost goes in `stats.energy`, power cost in `stats.power`, and `stats.cost` is `null`.
- Variant printings use a letter suffix on the collector number. Overnumbered cards use numbers above 200.
- There are no foil printings. SPEC-007 is still waiting on how Riot represents foils.
