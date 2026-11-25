---
tags: [loop, validation]
---
# Validation H-022 (open research sweep)

2026-11-24 · H-022 · **PASS** · validator

Scope: uncommitted researcher changes under `brain/01-Research/` (Ban List, Collection Import Formats, Sets, Formats, Deck Construction Rules, Tournament Results, Change Feed, Research Index). Accept: "Notes updated, statuses honest."

## Checks
| Check | Result |
|---|---|
| Every new fact has source URL(s), tier and an as_of date | PASS (each new row carries URLs and 2026-11-24) |
| Statuses honest | PASS. Formats `conflict` to `partial` (OGS rotation residual stated). Sets and Import Formats `partial`. Ban List stays `verified` (the time zone is recorded as "not published", not claimed). Community sources are labelled community-db or community; the Signature cap is explicitly "not settled by an official FAQ"; CSV/TXT samples list what was tried (TCGplayer help, TCG Stacked, carde.io 404) and stay unverified; derived player totals are labelled derived |
| Inferences marked | PASS (Dreaming Tree "not yet checked against the official gallery", battlefield domains "only H-020 can confirm", zone-less dates "an assumption, not a Riot statement") |
| No long verbatim copying | PASS (short label/line samples only) |
| Research Index and Change Feed consistent with the notes | PASS (statuses and summaries match; Change Feed entry links resolve) |
| V-009 wikilinks | PASS. One unresolved link, `[[Meta Overview]]` in Research Index, is pre-existing (archived note, unchanged) |
| V-006 freshness | PASS (all research as_of 2026-11-23 or 2026-11-24) |
| Spot-check sources (fetched) | npm registry: latest 1.5.0, published 2026-09-19, README has `VEN-SP1a` and UNL/RAD rows. silhouette-card-maker `deck_formats.py`: pattern `{Set ID}-{Card ID}-{Art Number}`, alternate-art suffix `a`. Riot Organized Play FAQ: "Start of 2028 ... first rotation occurs: Sets 1-5 removed from Standard" and SAMPLE cards not legal. Rules Hub still lists Broken Blade (Emperor's Dais not matched by a plain string, likely apostrophe encoding) |

## Minor observations (no item filed)
- Ban List still carries the old 6-card 2v2 table with an "Update 2026-11-24" line above it; the 14-card list is described as old list + wave rather than printed in full. H-168 (V-001 re-run) and H-164 will need the full 14 names, so the next research refresh should print them.
- Core rule numbering differs by version (103.2.d vs 103.3.d); the note says so.
- The board's `next_id` on disk was 161 while the caller said H-164; filed from H-164 (other branches already use H-162 and H-163) and set `next_id: 169`.

## Items filed
H-164 (SPEC-002), H-165 (SPEC-001), H-166 (SPEC-003 and SPEC-006), H-167 (SPEC-004), H-168 (P0 validator: re-run V-001).
