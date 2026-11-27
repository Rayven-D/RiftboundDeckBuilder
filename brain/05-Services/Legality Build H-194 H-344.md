---
tags: [services, build]
board: H-194, H-344
specs: ["[[Deck Legality]] 0.5", "[[Deck Import]] 0.16"]
branch: loop/H-194-H-344-legality
as_of: 2026-11-26
---
# Legality Build H-194 H-344

Builder note for the validator and RJ. Contracts: [[API Contracts]] v1.35, section "Deck legality engine" and
"Deck Import save" (legality in the review).

## What was built
- **H-194, SPEC-002 data and engine.** `data/banlist.json` (Standard `verified`, the four waves; `2v2` `unverified`),
  `data/formats.json` (Standard only, `excludedSets` OPP / JDG / PR with a `notes` field saying why: not legal as sets,
  legal by name, LEGAL-C07). Pure evaluator in `web/src/app/core/legality/`: one function per rule
  (LEGAL-001…019 incl. 006a), set legality (LEGAL-C02…C07), the data check (B05, B06, C06, C08, C09).
  `core/decks/ban-status.ts` now exposes `bannedSet` / `banListFor` / `orderedWaves`; `banStatus` is unchanged in
  behaviour.
- **H-344, legality in the Deck Import review.** `CardData.loadLegalityData()` bundles the two data files as one lazy
  chunk; `loadBans()` returns the real list. `DeckImport.prepare` passes the data in; `reviewDeck` returns
  `DeckReview.legality` and the review shows a "Rule check" block (verdict, Rules not met, Not checked, Banned cards,
  "N unresolved cards not checked"). Save is never blocked by it.

## Files
- `data/banlist.json`, `data/formats.json`
- `web/src/app/core/legality/` (`types.ts`, `rules.ts`, `set-legality.ts`, `evaluate.ts`, `data-check.ts`, `index.ts`,
  `legality-fixtures.ts`, `legality.spec.ts`)
- `web/src/app/core/decks/ban-status.ts`, `types.ts` (`BanList.format` widened, `status` + `'unverified'`),
  `deck-ownership-view.ts` (`verdictLabel`), `index.ts`
- `web/src/app/core/cards/card-data.ts`, `web/src/app/core/import/deck-import.ts`
- `web/src/app/shared/import/deck-import.ts`, `deck-review.ts`, `import-dialog.scss`, `deck-import-legality.spec.ts`
- `web/src/app/shared/deck-detail/detail-view.ts` (`RULE_CHECK_WORDS`, `BAN_LINE_TEXT`), `deck-dialogs.ts`

## Requirement → test
`legality.spec.ts` (SPEC-002):
| AC | Requirements | Test name starts with |
|---|---|---|
| 1–4 | LEGAL-003/005/008/010/011/013/016, B02, B08 | `AC 1` … `AC 4` |
| 5, 21 | B02, B09 | `AC 5 LEGAL-B09`, `AC 21 LEGAL-B02` |
| 6–10, 13 | LEGAL-003/004/005/008/010/011/013/019 | `AC 6` … `AC 10`, `AC 13` |
| 11, 14, 15, 19 | LEGAL-002/004, R03, R04 | `AC 11`, `AC 14`, `AC 15`, `AC 19` |
| 12, 16, 17, 18, 23, 24 | LEGAL-017/018, C02–C10 | `AC 12` … `AC 24` |
| 20, 22, 27 | B10, B11, B12 | `AC 20`, `AC 22`, `AC 27` |
| 25, 26 | LEGAL-006/006a/012 | `AC 25`, `AC 26` |
| data files | B01, B05, B06, C01, C03, C07, C08 | `LEGAL-C01/C03/C07`, `LEGAL-B06 / LEGAL-C08`, `LEGAL-B05` |

`deck-import-legality.spec.ts` (SPEC-006 section F): DECK-050 / 051 / AC 1, DECK-051 legal label, DECK-050 / 055 /
AC 2, DECK-055 (computed per day), DECK-052 / AC 18, DECK-052 (no data), DECK-053, DECK-054, DECK-056, DECK-050 (no
card → no block), and two component tests (DECK-051 display, DECK-053 upcoming).

## Stubbed or open
- **AC 24 / LEGAL-C10 stubbed:** `LegalityCatalog.isSample` decides SAMPLE; the browser catalog uses
  `NO_SAMPLE_MARKER` (never SAMPLE) until SPEC-001 CARD-044 defines the field (H-020). Tests use a test-only predicate.
- **2v2 data (LEGAL-B11):** only the totals are sourced. Stored as one snapshot wave `2v2-before-2026-11-23` (Master Yi
  + the 6 cards and 5 battlefields = the Rules Hub 2v2 table read 2026-11-26 in [[Ban List]], minus the Radiance names)
  plus the Radiance wave. The snapshot is not a Riot wave; it carries the September update's dates (2026-09-15 /
  2026-09-18), the earliest date by which every one of its names was on the 2v2 list per the research, and its
  `notes` say so. Counts before 2026-11-22 are not checked (Open question 9, H-169). No 2v2 `FormatDef` (no 2v2 deck
  rules are specified), so 2v2 is never offered and `evaluateLegality` refuses it.
- **Not wired yet:** the Decks list, Deck detail and its Rule check dialog still show "Not fully checked" (they do not
  run the engine; not part of H-344). They now get real ban status, because `loadBans()` returns the data.
- **No API copy** of the evaluator (LEGAL-R06): `services/` has no legality endpoint and is not hosted.

## Behaviour chosen (not stated by the spec)
- `dataVersion` / `lastVerified` of both files: `2026-11-24.1` / `2026-11-24` (the spec's 2v2 and formats "as of").
- Data is bundled with the build (lazy chunk), not fetched.
- Unresolved names: count rules still count their quantities; per-card rules skip them and report `not_evaluated`.
- LEGAL-016: one violation per banned card, in its first zone (Legend, Champion, Main, Sideboard, Runes, Battlefields).
- `upcomingBans`: only the deck's cards; `ban` only if not banned now, `unban` only if banned now.
- Set entries fall back to the `global` region (as LEGAL-B03 does for bans).
- The data check treats `playriftbound.com`, `riotgames.com` and `rgpub.io` (Riot's CMS, the TR PDF) as official.
- The review lists errors only under "Rules not met"; the LEGAL-006a warning is not shown there.
- Banned rows are per (zone, card), zone order, with " · zone · wave name".

## Wording not given by the spec (for RJ)
Engine messages (no SPEC-002 template):
- LEGAL-004, no Chosen Champion: "A deck needs exactly 1 Chosen Champion; this deck has 0." (LEGAL-001 pattern)
- LEGAL-006a: "{n} Signature cards in the main deck and sideboard together; a sideboard swap could go over the limit of 3."
- LEGAL-010, a non-battlefield: "{name} is a {type} and can't be in the battlefields." (LEGAL-014/015 template)
- LEGAL-012: the LEGAL-009 template, "{name} doesn't match this deck's domains ({identity})."
- LEGAL-014/015 `{zone}`: "main deck", "sideboard".
- LEGAL-017, only excluded sets or no counted printing: "{name} isn't legal in {format} on {asOf}: it has no printing in a legal set."
- LEGAL-018: "{name} isn't legal in {format} on {asOf}: its only printings in legal sets are overnumbered ({set} {number})."
- `notEvaluatedReason`s (`NOT_EVALUATED_TEXT`): "Missing domain data for: …" is the spec's example; the others
  ("Missing card type for: …", "Missing champion data for: …", "Missing Signature data for: …", "Set status unknown
  for: …", "Printing type unknown for: …", "Unknown cards not checked: …", "There is no Legend with domain data, so
  the deck's domains can't be checked.") are mine. Rule `title` / `summary` texts are mine too (not shown in the UI).

Review (closest existing strings reused, nothing new except the singular):
- Block heading and sub-headings: "Rule check", "Rules not met", "Not checked", "Banned cards" (OWN-117 dialog).
- No data: "The ban list couldn't load, so banned cards can't be checked." (existing `RULE_CHECK_TEXT.noBans`).
- DECK-056 singular: "1 unresolved card not checked" (the spec gives only "N unresolved cards not checked").

## What RJ should look at
With real card data most attributes are `null` (SPEC-001 BLOCKED), so a real import reads "Not fully checked" with
long "Missing … for: <every card>" lines under "Not checked". That is what DECK-052 asks for, but it is a lot of text;
a shorter form would need spec wording. Try it in the review step (H-340).
