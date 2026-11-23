# Test fixtures

**`riftbound-content-sample.json` is SYNTHETIC.** It is not a Riot API response.

- Its shape follows the `riftbound-content-v1` schema as described by a community mirror of
  Riot's docs (research note *Card Data & Images*, fact #9, `status: unverified`). The real
  payload has not been inspected yet, so field names may differ.
- Card **names** are real names taken from the research decklists (e.g. `Kai'Sa, Survivor`,
  `Zhonya's Hourglass`, `Star-Crossed`, `Calm Rune`, `Emperor's Dais`), so name-key tests use
  real punctuation. Everything else is made up: ids (`synthetic-…`), collector numbers, sets per
  card, rarities, stats, text (`SYNTHETIC placeholder text`) and `faction` values.
- Image URLs use the reserved `https://example.invalid/` domain and never resolve.
- Never copy this file into `data/` as if it were real card data.
