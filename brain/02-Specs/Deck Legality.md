---
tags: [spec]
id: SPEC-002
version: 0.8.1
status: review   # 0.8.1 (H-719): RJ shelved LEGAL-T05, the LEGAL-F06 2v2 sideboard warning and the single 2v2 deck notice (2026-11-28, ADR-0010 part 6); 0.8 (H-704) adds the 2v2 format (own ban list with a banned Legend, team check, chips, section E; RJ 2026-11-28, "any formats you can find. 2v2 is also very popular"; H-706 Q11); 0.7 (H-674, H-676) adds LEGAL-R09 (RJ 2026-11-26: not-checked lists shown as a count); was approved at 0.5 (RJ's H-193 answers, H-197); 0.6 adds the LEGAL-B11 snapshot-wave rules (H-485), the second rotation in C05 (H-652) and the ARC note in C07 (H-645), so it goes back to review
depends_on: [SPEC-001]
research: ["[[Format Catalog]]", "[[Deck Construction Rules]]", "[[Ban List]]", "[[Formats]]", "[[Sets]]", "[[Rules Overview]]", "[[Riot App Application]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]", "[[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]]"]
as_of: 2026-11-28
---
# SPEC-002: Deck Legality

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** decide whether a deck is legal in a format and region as of a date, explaining every failure in plain English. Riot requires rule enforcement for a production key. Formats offered (v0.8): **Standard** and **2v2**, region `global`.

**Key requirements**
- **v0.8 (H-704, RJ 2026-11-28; `review`):** new section E, LEGAL-F01…F08 and LEGAL-T01…T05. (1) Two deck formats, `standard` ("Standard") and `2v2` ("2v2"); Sealed, Draft, 2v2 Sealed and free-for-all are **not** offered (pool-based or no ban list, LEGAL-F07). (2) 2v2 reuses the Standard `deckRules` and legal sets and has its **own ban list with a banned Legend** (Master Yi, Wuju Bladesman); Fight or Flight is legal in 2v2 and banned in Standard (LEGAL-F02, F03, F04). (3) The 2v2 ban list is **shipped** now (LEGAL-B11 rewritten; RJ's 2026-11-25 "data only" is superseded by his 2026-11-28 request); its older names carry placeholder dates, so 2v2 is evaluated only for `asOf >= 2026-11-23` and `banStatus` has `bannedSince: null` for them (LEGAL-F05). (4) 2v2 sideboard: Standard rule, **`unverified`** in the sources; the overflow warning is **Shelved by RJ (2026-11-28), not built** (LEGAL-F06), so 2v2 reuses Standard's deck rules unchanged (LEGAL-F02). (5) A single 2v2 deck is checked alone; a **team check across two decks** (different Legend, no shared battlefield) is a pure function (LEGAL-T01…T04); the teammate picker (LEGAL-T05) and the single-deck notice (LEGAL-T04's notice) are **Shelved by RJ (2026-11-28), not built** (v0.8.1). (6) Each deck has one main format; the other format shows as a status chip that never changes the deck (LEGAL-F08, RJ H-706 Q11). ACs 29-37.
- LEGAL-001…015: construction rules (1 Legend, 40-card main incl. Chosen Champion, ≤ 3 per `cardKey` across zones, 12 runes, 3 unique battlefields, sideboard ≤ 10, domain identity).
- LEGAL-016: no banned card, battlefield or Legend in any zone as of `asOf`, matched by `cardKey`.
- LEGAL-017/018: each card needs a printing in a set legal as of `asOf`; an overnumbered printing alone doesn't count.
- LEGAL-019: every name resolves to exactly one `cardKey`; others are skipped, not guessed.
- LEGAL-B02: banned set as of D = all waves with `effective <= D` (inclusive); inside one wave `remove` runs before `add` (v0.3.1).
- LEGAL-B10: `banStatus(cardKey, format, region, asOf)` → `banned` (with `bannedSince`) / `upcoming` / `not-banned`.
- LEGAL-C02/C08: set legality from Riot-published dates or API release status only; no community dates.
- **v0.7 (H-674, H-676, RJ 2026-11-26, chat, "Shorten to a count"):** new LEGAL-R09: a not-checked reason that lists card names ("Missing champion data for: A, B, ...") is shown as a **count line** ("Missing champion data for 31 cards", "... for 1 card") with the names behind a "Show cards" / "Hide cards" disclosure; `RuleResult` gains `notEvaluatedItems` (the same reasons, structured) next to the unchanged `notEvaluatedReason` string; AC 28. The display work is [[Deck Import]] DECK-107 and [[Your Decks Ownership View]] OWN-117.
- **v0.6 (H-485, H-652, H-645; `review`):** LEGAL-B11 now says what a 2v2 data file may hold (names from the Rules Hub, one dated placeholder snapshot wave, nothing shows its dates); LEGAL-C05 adds the second rotation (start of 2029, Set 14, Sets 6-9 leave; still `partial`, every `legalUntil` stays `null`); LEGAL-C07 notes ARC printings follow the promo name rule, `unverified`, ARC stays out of the set-legal list.
- **v0.5 (H-197, RJ 2026-11-25, H-193 answers; `approved`):** RJ confirmed promos legal by name (LEGAL-C07; the TR 601.2 source note stays), "Sample cards are NOT legal" and "we can just leave them out entirely" (LEGAL-C10: a SAMPLE printing is never a legal printing and the other specs leave it out of import, collection and decks; marker = SPEC-001 CARD-044, still undefined), and "2v2 is data only for deck information" (LEGAL-B11 as specced). Build: H-194.
- **v0.4 (H-164, from H-022 research):** LEGAL-B11 2v2 ban data (1 Legend, 14 cards, 7 battlefields; Radiance wave applies; stored, not shipped); LEGAL-B12 ban dates are zone-less calendar dates; LEGAL-C05 rotation at the start of 2028 (Sets 1-5), kept as data (`legalUntil` stays `null`, OGS unconfirmed); LEGAL-C07/C10 promos legal by name, SAMPLE-stamped printings not; LEGAL-006/006a Signature cap = Main Deck at any time (partial); LEGAL-012 battlefields have no domain (sample only).
- LEGAL-R01/R04: pure function; verdict `illegal` > `incomplete` > `legal`; `incomplete` is never shown as legal.
- LEGAL-R08: messages show dates as `Nov 23, 2026` and the format by its display name, "Standard" or "2v2" (ids `standard`, `2v2`; v0.8).

**Shared types (v0.8 adds `TeamRequest`, `TeamResult`, `TeamViolation`, `BanStatus` `unknown`):** `DeckInput` (zones of a deck) · `LegalityRequest` · `LegalityResult` (verdict, `RuleResult[]`, data versions) · `Violation` · `BanStatus` (per-card status) · `Zone`, `FormatId`, `IsoDate` · `LegalityCardView` (card fields read) · `BanListFile`, `FormatsFile` (data files).
**Depends on:** [[Card Data Model]]. **Consumers:** [[Your Decks Ownership View]], [[Tournament Deck Catalog]], [[Deck Import]], [[My Collection]].
**BLOCKED / open:**
- BLOCKED: card attributes from the API (`category` strings, domains, champion/signature, `variant.kind`), so LEGAL-002/004/006/007/009/012/014/015/018 return `not_evaluated`.
- BLOCKED: set release status in the API (LEGAL-C02 (3)); how the API marks SAMPLE-stamped printings (LEGAL-C10).
- Partial / unverified (kept as the notes say): Signature cap vs sideboard (LEGAL-006a stays a warning; Riot has not settled it); battlefields have no domain (Riftcodex sample only, full check H-020); whether OGS rotates in 2028; the by-name wording of TR 601.2 is a community transcription (promos legal by name is RJ-confirmed, 2026-11-25).

## Purpose
Decide whether a deck is legal in a given **format**, **region**, and **as of a given date**, and
explain every failure in plain language. Riot requires a built-in deckbuilder to **enforce the official
deckbuilding rules** before it grants a production key ([[Riot App Application]]), so this spec is a
compliance requirement as well as a feature.

**Scope (v0.8):** Standard Constructed and 2v2 Constructed, region `global`. The data model (rule parameters per format, ban
lists per format × region, legal sets per format with dates) is built so that regional lists and any further
official Constructed format can be added as data plus a few new rules, without changing the result contract.
Limited (Sealed, Draft) and free-for-all are not offered (LEGAL-F07).

Consumers (per [[ADR-0006 Two Imports - Collection and Decks]]):
- **Decks** ([[Your Decks Ownership View]], SPEC-005): shows **ban status on every card** of an
  imported deck, owned or not, via the per-card ban status query (LEGAL-B10), and may show the deck
  verdict. It does not filter or hide decks by legality.
- **Tournaments** ([[Tournament Deck Catalog]], SPEC-004): "legal as of" label on each Top 8 decklist, and
  the "Contains cards banned since <date>" label for decks with now-banned cards (ADR-0005 #3, shown by
  default, never hidden).
- **Deck import** ([[Deck Import]], SPEC-006) and the deck editor: live feedback.

Card shapes come from [[Card Data Model]] (SPEC-001, source of truth). Cards are identified by
`cardKey`; every result echoes SPEC-001's `catalogVersion`.

## Definitions
- **Legend:** the deck's single Champion Legend. It sets the **Domain Identity** and the **Champion tag**. ([[Deck Construction Rules]] #1, #2)
- **Domain Identity:** the set of domains on the Legend. A card *fits* the identity when: it has no domain (fits any identity); it has one domain and that domain is in the identity; it has several domains and **all** of them are in the identity. ([[Deck Construction Rules]] #2)
- **Chosen Champion:** one Champion Unit (not a Signature card) whose Champion tag matches the Legend's. It is **part of the 40-card Main Deck** but stored in its own field, as published decklists list it separately. ([[Deck Construction Rules]] #3, #4)
- **Signature card:** a card flagged as Signature; it is not a Champion Unit. ([[Deck Construction Rules]] #6)
- **Main Deck:** the Chosen Champion plus the `main` entries. **Main-deck cards** = Chosen Champion + `main`.
- **Rune Deck:** 12 Rune cards, separate from the Main Deck. ([[Deck Construction Rules]] #7)
- **Battlefields:** the 3 battlefields brought to the match. ([[Deck Construction Rules]] #8)
- **Sideboard:** up to 10 main-deck-eligible cards (tournament play). ([[Deck Construction Rules]] #9)
- **Card key (`cardKey`):** SPEC-001's playable-card key, `nameKey(canonical name)`. It is the key for copy limits and ban lookups; all printings and variants with the same name share one limit. Messages show the canonical name. ([[Deck Construction Rules]] #5; [[Card Data Model]] CARD-012/013)
- **Format:** an official deck format. Two (v0.8): `standard` = Standard Constructed, display name **"Standard"**; `2v2` = 2v2 Constructed, display name **"2v2"** (LEGAL-R08). ([[Formats]] #1, #2; [[Format Catalog]])
- **Main format:** the one format a saved deck stores in `deck.format` (default `standard`; SPEC-006 DECK-118). **Other format:** every other offered format; it appears only as a status chip (LEGAL-F08).
- **Team (2v2):** two decks played by two teammates; checked together by LEGAL-T01…T04.
- **Region:** the ban-list / set-legality region. MVP: `global`. ([[Ban List]] #7)
- **As-of date (`asOf`):** an ISO calendar date `YYYY-MM-DD`. "Legal as of D" means legal under the ban list and set list in force on D.
- **Ban wave:** one official ban-list update with an announcement date and an effective date.
- **Upcoming ban:** a ban (or unban) in a wave that is **announced but not yet effective** on `asOf` (`announced <= asOf < effective`).
- **Riot-published date:** a set legality date stated in an official Riot source cited in a research note ([[Sets]], [[Formats]]). Community or creator dates are never used (ADR-0005).

## Card attributes this spec needs from SPEC-001
The evaluator reads cards only through `LegalityCardView` (Data contract), whose names and types are
exactly SPEC-001's. SPEC-001 defines where each attribute comes from.

| Attribute (SPEC-001 name) | Used by | Status |
|---|---|---|
| `cardKey`, `name` (canonical) | all | defined (SPEC-001 CARD-012, CARD-030) |
| `category` (`legend`, `champion`, `unit`, `spell`, `gear`, `rune`, `battlefield`, `token`, `unknown`) | LEGAL-001, -004, -008, -010, -014, -015 | `legend`/`unit`/`rune`/`battlefield` defined; other API strings **BLOCKED: needs research** (SPEC-001 CARD-024) |
| `domains: string[] \| null` | LEGAL-002, -009, -012 | **BLOCKED: needs research** (SPEC-001 CARD-025); `null` until verified |
| `isChampionUnit: boolean \| null` | LEGAL-004 | **BLOCKED: needs research** (SPEC-001 CARD-026) |
| `isSignature: boolean \| null` | LEGAL-004, -006, -007 | **BLOCKED: needs research** (SPEC-001 CARD-027) |
| `championTag: string \| null` | LEGAL-004, -007 | **BLOCKED: needs research** (SPEC-001 CARD-026) |
| `printings[]`: `setCode`, `collectorNumber`, `variant.kind` | LEGAL-017, -018 | defined; `variant.kind` is `unknown` until SPEC-001 CARD-040/041 rules exist (**BLOCKED: needs research**) |
| set `releaseStatus: 'released' \| 'preview' \| null` | LEGAL-C02 | **BLOCKED: needs research** (SPEC-001 CARD-008) |
| `catalogVersion` | result | defined (SPEC-001 CARD-068) |

`null` (and `category: 'unknown'`, `variant.kind: 'unknown'`) means "not known" (SPEC-001 CARD-029).
A rule that needs such a value returns `not_evaluated`, never a silent pass and never a failure (LEGAL-R04).
A Champion Unit is a card with `category === 'champion'` or `isChampionUnit === true`.

## Requirements

### A. Deck construction rules (Standard Constructed)
Each rule is checked independently and reported separately. Parameters in *italics* come from the format's `deckRules` (see Data contract), so other formats can change the numbers.

| ID | Level | Requirement | Source |
|---|---|---|---|
| LEGAL-001 | MUST | The deck has **exactly one Legend**, and that card's `category` is `legend`. | [[Deck Construction Rules]] #1 (Core 103) |
| LEGAL-002 | MUST | Every main-deck card (Chosen Champion + `main`) and every sideboard card **fits the Legend's Domain Identity** (no-domain: any; single-domain: domain in identity; multi-domain: all domains in identity). Each non-fitting card is a separate violation naming the card and its domains. | [[Deck Construction Rules]] #2, #3, #9 (Core 103.2.b; TR 601.1.c) |
| LEGAL-003 | MUST | The Main Deck has **exactly *mainDeckSize* (40) cards, counting the Chosen Champion** (`1 + sum(main qty)` = 40). The message states the actual count and the difference. Tournament "exactly 40" governs over the Core Rules' "at least 40". | [[Deck Construction Rules]] #3 and Conflicts (Core 103.3; TR 402.1, 601.1.b) |
| LEGAL-004 | MUST | There is **exactly one Chosen Champion**; it is a **Champion Unit** (`category === 'champion'` or `isChampionUnit === true`), it is **not a Signature card** (`isSignature === false`), and its **`championTag` equals the Legend's**. Each failed condition is its own violation; a condition whose attribute is `null` is `not_evaluated`. | [[Deck Construction Rules]] #4 (Core 103.3.a) |
| LEGAL-005 | MUST | **At most *copyLimit* (3) copies per `cardKey`**, counted across Chosen Champion + `main` + `sideboard` combined. Different names (e.g. different subtitles) count separately; printings/variants with the same name count together. One violation per over-limit card, with the per-zone breakdown. | [[Deck Construction Rules]] #5, #9 (Core 103.3.b, 132.4; TR 403.4.b) |
| LEGAL-006 | MUST | **At most *signatureLimit* (3) Signature cards in total** in the Main Deck, whatever their names. This is the **safe reading** of Core 103.3.d: the cap binds whatever is in the Main Deck at any time (a sideboard swap may not push it over 3). **Status: partial**, not settled by Riot (v0.4). | [[Deck Construction Rules]] #6, #16 (Core 103.3.d; community-db transcription) |
| LEGAL-006a | SHOULD | Also count Signature cards across Main Deck + sideboard; if that total exceeds 3 while the main-deck total does not, report **severity `warning`**, never `error`: Core 103 does not name the sideboard and no Riot text says sideboarded Signature cards count toward the 3, so it is a heads-up that a swap could break LEGAL-006. **Status: unverified**; it stays a warning until an official FAQ settles it (do not upgrade to `error`). | [[Deck Construction Rules]] #6, #9, #16 |
| LEGAL-007 | MUST | Every Signature card (main or sideboard) **shares the Legend's Champion tag**. | [[Deck Construction Rules]] #6 (Core 103.3.d) |
| LEGAL-008 | MUST | The Rune Deck has **exactly *runeDeckSize* (12) cards and every one has `category` `rune`**. | [[Deck Construction Rules]] #7 (Core 103.4, 161.2.a; TR 402) |
| LEGAL-009 | MUST | Every Rune card **fits the Domain Identity**. | [[Deck Construction Rules]] #7 |
| LEGAL-010 | MUST | There are **exactly *battlefieldCount* (3) battlefields**, each with `category` `battlefield`. | [[Deck Construction Rules]] #8 (Core 103.5; TR 402) |
| LEGAL-011 | MUST | **No two battlefields share a `cardKey`.** | [[Deck Construction Rules]] #8 |
| LEGAL-012 | MUST | Every battlefield **fits the Domain Identity** (by the LEGAL-002 rule; a no-domain battlefield, `domains: []`, fits any identity). **Expected:** battlefields have no domain, so in practice they fit every Legend (every sampled Battlefield in Riftcodex has `domain: ["Colorless"]`, i.e. none). **Status: partial**: a sample only, the full check waits for the live payload (H-020); the rule stays so a battlefield that does carry domains is still checked, and `domains: null` is `not_evaluated`. | [[Deck Construction Rules]] #8 ("where applicable"), #2, #18 (Core 103.5.b; community-db sample) |
| LEGAL-013 | MUST | The sideboard has **at most *sideboardMax* (10) cards** (0 is allowed). | [[Deck Construction Rules]] #9 (TR 601.1.c) |
| LEGAL-014 | MUST | Every sideboard card is **legal for the Main Deck**: its `category` is not `legend`, `rune` or `battlefield` (domain, copy-limit, ban and set checks are covered by LEGAL-002, -005, -016, -017, which include the sideboard). `category: 'unknown'` → `not_evaluated`. | [[Deck Construction Rules]] #9 (TR 601.1.c, 403.5) |
| LEGAL-015 | MUST | `main` contains **no cards with `category` `legend`, `rune` or `battlefield`** (they belong in their own zones). `category: 'unknown'` → `not_evaluated`. | [[Deck Construction Rules]] #1, #7, #8 (Core 103) |
| LEGAL-016 | MUST | **No banned card, battlefield, or Legend** in any zone (Legend, Chosen Champion, `main`, `sideboard`, battlefields) under the ban list for (format, region) **as of `asOf`** (see section B). Ban entries are matched by `cardKey`. Each banned card is one violation that names the ban wave and its effective date. | [[Deck Construction Rules]] #10 (TR 601.2.d); [[Ban List]] |
| LEGAL-017 | MUST | Every card in every zone has **at least one printing in a set legal in the format, for the region, as of `asOf`** (section C, LEGAL-C02). Result per card: pass if any printing's set is legal; fail if every printing's set is definitely not legal ("not legal until <date>" when a Riot-published `legalFrom` exists, "not released yet" for a preview set without a date); otherwise `not_evaluated` (set status unknown). | [[Deck Construction Rules]] #3; [[Formats]] #2, #4 (TR 601.2.b); [[ADR-0005 MVP Product Defaults]] #4 |
| LEGAL-018 | MUST | A printing numbered outside its set's normal range (`variant.kind === 'overnumbered'`, e.g. 300/250) **does not by itself make a card legal** for LEGAL-017. Let *L* = the card's printings in legal sets. Pass if *L* has a printing whose `variant.kind` is neither `overnumbered` nor `unknown`, or if **all** of the card's printings are in legal sets (its in-range printing is then legal too). Fail if *L* is non-empty and every printing in *L* is `overnumbered`. Otherwise `not_evaluated`. **BLOCKED: needs research** for the `variant.kind` mapping (SPEC-001 CARD-040). | [[Deck Construction Rules]] #13 (TR 601.2.c); [[Card Data Model]] CARD-043 |
| LEGAL-019 | MUST | Every name in every zone **resolves to exactly one `cardKey`** in the catalog (SPEC-001 lookup by `nameKey`; no aliases, ADR-0005). Unresolved names fail this rule; the other rules skip them and report them as `not_evaluated` rather than guessing. | design rule; [[Card Data Model]] CARD-033 |

Notes backed by research but not checked (informational only, never a failure):
- At low OPL, an unmodified preconstructed deck may keep banned cards (TR 601.2.d.2). The app does not model OPL; it always applies LEGAL-016. ([[Deck Construction Rules]] #10)
- The Chosen Champion may be swapped for a matching card during sideboarding (TR 601.1.c.4); a sideboarded alternative champion is just a sideboard card under LEGAL-005. ([[Deck Construction Rules]] #4)
- Proxies, alters, and card language (TR 419–420) concern physical cards and are out of scope. ([[Deck Construction Rules]] #12)

### B. Ban list as versioned data
| ID | Level | Requirement | Source |
|---|---|---|---|
| LEGAL-B01 | MUST | The ban list lives in `data/banlist.json` (schema below), as an ordered list of **ban waves** per (format, region). Each wave has an id, name, announced date, effective date, official source URL, and `add` / `remove` entries; each entry has a canonical `name` and a `kind`: `card` \| `battlefield` \| `legend`. | [[Ban List]]; [[ADR-0001 Tech Stack]] (versioned JSON in `data/`) |
| LEGAL-B02 | MUST | **Banned set as of D** = start empty; apply every wave of the (format, region) list with `effective <= D`, in ascending effective-date order (ties: file order); `add` inserts names, `remove` deletes them. **Inside one wave, every `remove` is applied before every `add`** (v0.3.1), so a name listed in both ends up banned after that wave. A wave whose effective date is **after** D has no effect, even if already announced. The effective date is **inclusive** (a card banned "effective 2026-11-23" is banned on 2026-11-23). | [[Ban List]] (effective vs. announced dates) |
| LEGAL-B03 | MUST | Region lookup: use the list for (format, region) if it exists; otherwise fall back to (format, `global`). MVP ships only `global`. | [[Ban List]] #7 |
| LEGAL-B04 | MUST | The file carries `dataVersion` and `lastVerified`; every legality result echoes the `dataVersion` used, so a stored result can be re-checked when the list changes. | [[Spec Index]] (versioned specs/data) |
| LEGAL-B05 | MUST | Every name in the ban list resolves (by `nameKey`) to a catalog `cardKey` of the matching kind (pipeline check). A name that does not resolve is a **data error** that blocks publishing the data, not a silent skip and not fixed by an alias (see the "Dreaming Tree" naming conflict). | [[Ban List]] Conflicts; [[ADR-0005 MVP Product Defaults]] #4 |
| LEGAL-B06 | MUST | Ban data entries trace to an official announcement or the Rules Hub. Creator/community sources may be recorded in `notes` but never set dates on their own. | [[Ban List]] sources |
| LEGAL-B07 | MUST | Waves are **append-only**: corrections are new waves or a bumped `dataVersion` with a changelog line, never silent edits of past waves. When a new wave is added, this spec's version is bumped and a Handoff Board item is posted. | [[spec-writer]] standards |
| LEGAL-B08 | SHOULD | Show the ban wave name and effective date in the failure message. List **upcoming** bans/unbans as a separate `upcomingBans` notice (never a failure) only for waves with `announced <= asOf < effective`. A wave whose `announced` date is after `asOf` is not shown at all (it was not public on that date). | [[Ban List]] #5, #6 |
| LEGAL-B09 | MUST | Standard (`global`) data contains exactly the four waves below; as of 2026-11-23 it yields **15 cards and 7 battlefields**, matching the Rules Hub count. | [[Ban List]] #1–#5 |
| LEGAL-B11 | MUST | **2v2 ban data (v0.8: shipped and evaluated, `FormatDef.supported: true`; was SHOULD and "not shipped")** is stored as its own list `(format: '2v2', region: 'global')`, `status: 'unverified'` (the full names and totals are a Rules Hub reading; the per-wave split and dates are not on the hub, see "2v2 content"), with the same wave rules (B02). As of **2026-11-24** (observed; the Radiance wave is effective 2026-11-23) the Rules Hub 2v2 table shows **1 Legend, 14 cards and 7 battlefields** (as of 2026-11-22: 1 Legend, 6 cards, 5 battlefields; counts for earlier dates are not checked, Open question 9), so the **Radiance wave (effective 2026-11-23) applies to 2v2** as well; the earlier "conflict" is resolved. The Legend is Master Yi, Wuju Bladesman (`kind: legend`, LEGAL-016 already covers Legends). Content in "2v2 content" below. **What the data file MAY hold (v0.6, H-485):** (a) the Legend, card and battlefield names exactly as the [[Ban List]] 2v2 reading lists them (read 2026-11-26), normalised to the catalog names (LEGAL-B05); (b) **one** dated snapshot wave for the names that were on the list before the Radiance wave, plus the real Radiance wave (`2v2-2026-11-23`, effective 2026-11-23); (c) the snapshot wave MUST say in its own `notes` that it is not a Riot wave and that its dates are placeholders, and its `sourceUrl` is the Rules Hub. **The placeholder dates** MAY be any dates on or before 2026-11-22 that keep every snapshot name on the list from the date the snapshot is first in force; the build's choice (announced 2026-09-15, effective 2026-09-18, the September update's dates) is allowed, and no source dates the snapshot as a whole. The real dates are only partly known: [[Ban List]] facts 3 and 4 say the list was created with the Legend effective 2026-07-24 and that Ekko, Recurrent and Stacked Deck were added effective 2026-09-18; the hub does not say which of the other names were on the list on 2026-07-24, so a placeholder date is wrong for some dates before 2026-09-18. **Nothing may show, count, cite or test those placeholder dates**: no UI, API response, message or export may state them, and no AC relies on a count before 2026-11-22. Splitting the snapshot into real waves needs the researcher (H-169) and then a spec change. Open: the Rules Hub 2v2 list does not contain Fight or Flight although the July announcement says the 2v2 list started as "the Standard list at that time" (see Open question 9). **v0.5 (RJ 2026-11-25: "2v2 is data only for deck information"), superseded in v0.8:** RJ's request for H-704 (2026-11-28: legality in "any formats you can find. 2v2 is also very popular"; deck format and chips, H-706 Q11) makes 2v2 a format the app offers and evaluates (section E); the data is shipped. **v0.8 data rules:** (d) the snapshot wave carries `datesArePlaceholder: true`; (e) the list carries `coveredFrom: 2026-11-23` (the Radiance wave, the first date the whole list is a hub reading); behaviour in LEGAL-F05; (f) the list `status` stays `unverified` until H-169 splits the snapshot, and no UI text says "unverified" for it. | RJ 2026-11-25 (H-193); [[Ban List]] #3, #4, #5, #8 and "Current list: 2v2 Constructed" (hub read 2026-11-26; totals as of 2026-11-24) |
| LEGAL-B12 | MUST | **Ban dates are zone-less calendar dates.** Riot publishes only a date ("Monday, November 23"), no time of day or time zone. Evaluation compares `asOf` with `effective` / `announced` as calendar dates only (LEGAL-B02, inclusive), with no time or zone conversion; the UI's "today" is the user's local date (LEGAL-R02). "Banned from the start of that date in the event's local time" is an assumption, not a Riot statement, and MUST NOT appear in user-facing text. | [[Ban List]] #9 (verified that it is **not published**, as of 2026-11-24) |
| LEGAL-B10 | MUST | A **per-card ban status** query `banStatus(cardKey, format, region, asOf)` returns `banned` (with the wave that added it: id, name, effective date = "banned since"; **v0.8:** for a wave with `datesArePlaceholder: true` the wave name and `bannedSince` are `null`, LEGAL-F05), `upcoming` (announced, not yet effective, LEGAL-B08 semantics), `not-banned`, or **`unknown`** (v0.8: the list does not cover `asOf`, LEGAL-F05), computed by LEGAL-B02/B03 from the same data. Decks (SPEC-005) uses it for every card of a deck; Tournaments (SPEC-004) uses the earliest "banned since" date of a deck's banned cards for its "Contains cards banned since <date>" label. | [[ADR-0006 Two Imports - Collection and Decks]] (ban status on every card); [[ADR-0005 MVP Product Defaults]] #3; [[Ban List]] |

### C. Format legality (sets per format, dated)
Per [[ADR-0005 MVP Product Defaults]] #4, set legality comes from Riot data only: Riot-published dates
cited in research, otherwise the set's release status in the Riot API (SPEC-001 CARD-008). No community
or creator release dates are stored or used.

| ID | Level | Requirement | Source |
|---|---|---|---|
| LEGAL-C01 | MUST | Format legality is **data, not code**: `data/formats.json` lists, per format, its `deckRules` parameters and, per region, set entries with `legalFrom` (inclusive, **Riot-published date or `null`**), `legalUntil` (exclusive, or `null` = no rotation scheduled), `basis`, and the official `sourceUrl` + research note. It also lists `excludedSets` (set codes whose printings never make a card legal on their own, e.g. the promo groupings; legal by name, LEGAL-C07). | [[Formats]] Conflicts (recommendation); [[ADR-0005 MVP Product Defaults]] #4 |
| LEGAL-C02 | MUST | A set S is legal in (format, region) as of D when all of (1), (2 or 3) and (4) hold: (1) S is not in `excludedSets`; (2) if S's entry has a `legalFrom` date: `legalFrom <= D`; (3) if S has no entry or `legalFrom` is `null`: S is in the catalog with `releaseStatus: 'released'`, **or** its `releaseStatus` is `null` (unknown) and its entry has `basis: 'riot-listing'` (an official Riot document lists it as legal in the format); and (4) `legalUntil` is `null` or `D < legalUntil`. If S is `preview` in the catalog and has no `legalFrom`, it is **not legal** ("not released yet"). If none of these can be decided (no entry, `releaseStatus: null`), S's status is **unknown** and LEGAL-017 returns `not_evaluated` for cards depending on it. | [[Formats]] #4 (TR 601.2.b); [[ADR-0005 MVP Product Defaults]] #4 |
| LEGAL-C03 | MUST | Standard (`global`) as of 2026-11-23 = **OGN, OGS, SFD, UNL, VEN, RAD**, all with `legalUntil: null`: RAD by its Riot-published date 2026-10-23; OGN, OGS, SFD, UNL, VEN by `basis: 'riot-listing'` (TR 601.3.c) with `legalFrom: null`. | [[Formats]] #2, #3, #4; [[Sets]] #1 |
| LEGAL-C04 | MUST | Upcoming sets with a Riot-published date are listed with that `legalFrom` (LGC 2027-01-29, PG2 2027-02-19, REC 2027-04-30); cards whose only printings are in them fail LEGAL-017 until that date, even if the API already returns them (previews). Previewed cards are therefore never legal before release. | [[Sets]] #2; [[Riot App Application]] (label previewed cards) |
| LEGAL-C05 | MUST | Rotation is **not** computed from a rule ("most recent 5–8 sets", "current + previous year" in TR 601.3 are generic wording). Riot's Organized Play FAQ and the Rules Hub say the **first rotation is at the start of 2028 (when Set 10 releases)**, removing "Sets 1-5" (Origins plus SFD, UNL, VEN, RAD); until then every produced set is legal. The FAQ (re-read 2026-11-26) also gives a **second rotation at the start of 2029, when Set 14 releases, removing Sets 6-9**; Standard then "grows and shrinks" between 4 and 8 sets. The FAQ does not say which year the remaining sets were released in, and this spec does not map set codes to Set numbers beyond the first rotation's list above. No exact date or per-set list is published, so **every `legalUntil` stays `null`** (for both rotations) and is set only by editing the data from a Riot-published source, set by set. **Unconfirmed:** whether OGS rotates with Origins (the FAQ's "Sets 1-5" does not list it); a creator report that Proving Grounds rotates too is unverified and not used. Riot says other formats will support rotated sets; no details yet (not modelled). **Status: partial.** | [[Formats]] #8 (as of 2026-11-24, FAQ re-read 2026-11-26, `partial`) and Conflicts |
| LEGAL-C06 | MUST | Set codes are normalized to upper case ("Ven" → `VEN`). | [[Sets]] Conflicts |
| LEGAL-C07 | MUST | **Promos are legal by name** (v0.4). A card is legal if it comes from a legal set **or shares a name with a card from a legal set** (TR 601.2). The promo groupings OPP, JDG and PR are not legal *as sets* and stay in `excludedSets`: a printing in them never makes a card legal on its own, but because legality is keyed by `cardKey` (the name), a promo printing of a card whose name has a printing in a legal set is legal (LEGAL-017 needs only one legal-set printing). A card whose only printings are in OPP / JDG / PR fails LEGAL-017. The out-of-range reprint rule (LEGAL-018) is the only caveat. **Status: RJ-confirmed (v0.5, RJ 2026-11-25: "For promos the cards are legal by name").** The source note stays: the by-name wording is from a community transcription of TR 601.2 (the official PDF has not been re-read), and neither the Rules Hub nor the Tournament Rules page lists promos separately; RJ's confirmation settles the product rule, not that wording. **ARC (Arcane Box Set) printings (v0.6, `unverified`):** they follow the same name rule: a card whose name is also a card from a legal set would be legal by name, and ARC is not in the set-legal list (it is not in the Standard `sets` list; whether it also goes in `excludedSets` is data detail, not specified). No official source says ARC cards are legal or illegal ([[Formats]] #10, [[Sets]] #7, as of 2026-11-26); this is not an official ruling, and the app MUST NOT show text that claims one. Unaffected: LEGAL-018 (overnumbered reprints). | RJ 2026-11-25 (H-193); [[Formats]] #9, #10 (ARC, `unverified`); [[Sets]] #7; [[Deck Construction Rules]] #17 (as of 2026-11-24; ARC as of 2026-11-26) |
| LEGAL-C10 | MUST | **SAMPLE-stamped printings are not legal** for organized play. LEGAL-017 ignores a printing that is stamped SAMPLE (it never counts as the card's legal printing). **Left out entirely (v0.5, RJ 2026-11-25: "Sample cards are NOT legal", "we can just leave them out entirely"):** such printings are also not imported, counted, shown or matched anywhere (SPEC-003 IMP-077, SPEC-006 DECK-106, SPEC-007 COLL-110, SPEC-005 OWN-120), so a catalog view built for the app does not contain them. LEGAL-C10 still applies to any snapshot that does carry a SAMPLE flag (a flagged printing is ignored by LEGAL-017). How the Riot API marks such printings is not known: until SPEC-001 CARD-044 has a field for it (**BLOCKED: needs research**, H-020) no printing is treated as SAMPLE, and the app does not guess from set code or collector number. | RJ 2026-11-25 (H-193); [[Formats]] #9; [[Deck Construction Rules]] #17 (official Riot Organized Play article, as of 2026-11-24) |
| LEGAL-C08 | MUST | **No community-sourced dates.** A `legalFrom` value is only allowed with an official Riot `sourceUrl` cited in a research note; the data check rejects any other. A set without a Riot-published date has `legalFrom: null`, and the UI shows no "legal since" date for it. | [[ADR-0005 MVP Product Defaults]] #4; [[Sets]] #4 (OGN–VEN dates are community) |
| LEGAL-C09 | SHOULD | The data check reports a `set-status-mismatch` warning when the catalog's `releaseStatus` contradicts `formats.json` (e.g. `preview` on or after a Riot-published `legalFrom`, or `released` before it). `legalFrom` still wins for evaluation. | design rule |

### D. Evaluation behavior
| ID | Level | Requirement | Source |
|---|---|---|---|
| LEGAL-R01 | MUST | Evaluation is a **pure function** of (deck, format, region, asOf, card catalog snapshot, ban data, format data): same inputs, same result. No network calls. | [[ADR-0001 Tech Stack]] (host-neutral services) |
| LEGAL-R02 | MUST | `asOf` is required in the API; the UI defaults it to today's date (see Open questions for the time zone). | design rule (stated-date legality needed by LEGAL-B02 and SPEC-004 "legal as of") |
| LEGAL-R03 | MUST | **All** rules run on every evaluation (no stopping at the first failure); each returns exactly one `RuleResult`. | Riot requirement to enforce rules ([[Riot App Application]]) |
| LEGAL-R04 | MUST | Verdict: `illegal` if any rule has an `error` violation; else `incomplete` if any rule is `not_evaluated`; else `legal`. Warnings never change the verdict. The UI MUST NOT show `incomplete` as legal. | design rule, so that unknown card data (SPEC-001 CARD-029) never yields a false "legal" under Riot's enforce-the-rules requirement ([[Riot App Application]]; [[Card Data & Images]] #4) |
| LEGAL-R05 | MUST | Only official formats are offered (v0.8: `standard` and `2v2`, both on the Rules Hub). A non-official format, if ever added, is labeled "Unofficial". | [[Riot App Application]] (don't alter official formats) |
| LEGAL-R06 | MUST | The same evaluator runs in the API and the Angular editor (shared TypeScript types per ADR-0001); the API result is authoritative. | [[ADR-0001 Tech Stack]] |
| LEGAL-R07 | MUST | Messages are plain English, name the card (canonical name) and zone, and state expected vs. actual (templates below), rendered with the display rules of LEGAL-R08. | design rule |
| LEGAL-R08 | MUST | **Shared display rules for messages** (same as SPEC-004 CAT-037, SPEC-006, SPEC-007 COLL-017): every date in a user-facing message (`{asOf}`, `{effective}`, `{legalFrom}` and any other) is shown as `MMM D, YYYY` with an English short month, e.g. `Nov 23, 2026`; `{format}` is the format's display name `FormatDef.name`, which is **`Standard`** for the id `standard` and **`2v2`** for the id `2v2` (v0.8; written exactly "2v2", lower-case v). Stored data, `Violation`/`RuleResult` fields and the API keep ISO `YYYY-MM-DD` dates and the ids `standard`, `2v2`. | [[ADR-0006 Two Imports - Collection and Decks]] Gate H-036 decision 7; [[Tournament Deck Catalog]] CAT-037 |
| LEGAL-R09 | MUST | **Not-checked reasons that list cards (v0.7, H-676).** (a) **Data.** Each `RuleResult` with status `not_evaluated` carries its reasons as `notEvaluatedItems` (see the data contract), one item per reason, in the order they appear in `notEvaluatedReason`; `notEvaluatedReason` itself is **unchanged** (the reasons joined by a space, each with its full name list) and stays the plain-text form. An item that lists cards has `label` (the text before the colon, e.g. "Missing champion data for") and `cardNames` (the **distinct canonical names**, in the order the engine lists them today, no counts of copies); an item with no card list (e.g. "There is no Legend with domain data, so the deck's domains can't be checked.") has no `cardNames`. (b) **Display rule for every screen that shows these reasons** ([[Deck Import]] DECK-107 for the import review, [[Your Decks Ownership View]] OWN-117 for the Rule check dialog, [[Tournament Deck Catalog]] CAT-045 detail): an item with `cardNames` is shown as **one count line** `<label> {n} cards` (`<label> 1 card` for one), where n = `cardNames.length`, and its names only behind a disclosure (DECK-107); an item without `cardNames` is shown as its text. (c) **Which reasons.** RJ's direction covers the "Missing ... data for" lines; the same shape applies to the other list reasons ("Set status unknown for", "Printing type unknown for", "Unknown cards not checked") as the spec-writer's reading, not RJ's (builder defaults, see DECK-107 (f)). (d) **No new rule, no change to verdict:** only how a reason is carried and shown (LEGAL-R04 unchanged; a reason is never dropped). | RJ 2026-11-26 (chat, multiple choice "Shorten to a count"; his option text: "e.g. 'Card details missing for 31 cards', with the list expandable"; H-484); shape of `notEvaluatedItems` and (c): spec-writer |

### E. Formats: Standard, 2v2, chips and the team check (v0.8, H-704)
Sources: [[Format Catalog]] (H-700, validated, as of 2026-11-28; its "2v2 details" facts 1-8 and "SPEC-002 / H-704 inputs"), [[Ban List]] "Current list: 2v2 Constructed", [[Formats]]. RJ 2026-11-28: legality in "any formats you can find. 2v2 is also very popular"; H-706 Q11 (one stored main format per deck, the other formats as status chips; [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]]).

| ID | Level | Requirement | Source |
|---|---|---|---|
| LEGAL-F01 | MUST | **Offered deck formats: `standard` and `2v2`**, region `global`. `FormatId = 'standard' \| '2v2'`; both have `supported: true`. A request with another format id is rejected as invalid input, never evaluated. | [[Format Catalog]] (official formats table); RJ 2026-11-28 |
| LEGAL-F02 | MUST | **2v2 deck rules = Constructed deck rules.** `deckRules` for `2v2` equal Standard's (`mainDeckSize 40` exact, `copyLimit 3`, `signatureLimit 3`, `runeDeckSize 12`, `battlefieldCount 3`, `sideboardMax 10`) and every rule of section A runs unchanged. TR 603 sets no deck-building rule of its own. | [[Format Catalog]] 2v2 row and fact 1 (Rules Hub; TR 603, community-db transcription of the official TR); inputs 2 |
| LEGAL-F03 | MUST | **2v2 legal sets = Standard's.** The `2v2` `FormatDef` reuses Standard's set entries and `excludedSets` (field `setsSameAs: 'standard'`; one source of truth, so a rotation edit applies to both). LEGAL-C01…C10 apply to it unchanged. | [[Format Catalog]] 2v2 row ("All produced sets, same as Standard (Rules Hub)") |
| LEGAL-F04 | MUST | **2v2 has its own ban list** `(2v2, global)` (LEGAL-B11) that **includes a banned Legend** (Master Yi, Wuju Bladesman, `kind: legend`); LEGAL-016 for a 2v2 request uses only that list, never Standard's. Differences from Standard, both must hold in the data: **Fight or Flight** is banned in Standard and **legal** in 2v2; **Master Yi, Wuju Bladesman** is banned in 2v2 and legal as a Legend in Standard. Totals as of 2026-11-23: 1 Legend, 14 cards, 7 battlefields. | [[Format Catalog]] fact 6 and input 7; [[Ban List]] (Rules Hub, last updated 2026-11-23) |
| LEGAL-F05 | MUST | **Coverage and placeholder dates.** The 2v2 list has `coveredFrom: 2026-11-23` and a snapshot wave with `datesArePlaceholder: true` (LEGAL-B11). (a) For a 2v2 request with `asOf < coveredFrom`, LEGAL-016 is `not_evaluated` with reason "The 2v2 ban list before Nov 23, 2026 isn't known." (so the verdict is `incomplete` unless another rule fails) and `banStatus` returns `unknown`. (b) A name banned by a placeholder-dated wave is `banned` with `waveName: null` and `bannedSince: null`; its LEGAL-016 message omits the wave and date: "{name} is banned in 2v2 as of {asOf}." (c) A name from a real wave keeps the normal message and `bannedSince` (Radiance: wave `2v2-2026-11-23`, "Nov 23, 2026"). (d) Standard has no `coveredFrom` and no placeholder wave; nothing changes there. No output may show a placeholder date (LEGAL-B11). | LEGAL-B11 (v0.6 rule); [[Ban List]] facts 3, 4, 8; research gap H-169 |
| LEGAL-F06 | MUST | **2v2 sideboard: Shelved by RJ (2026-11-28), not built.** RJ shelved the 2v2 sideboard-overflow warning ("for a later day. I need to come up with something on how I want that to work", RJ 2026-11-28, [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]] part 6). **Until RJ decides, the 2v2 sideboard reuses the Standard deck rules unchanged (LEGAL-F02):** `sideboardMax 10`, LEGAL-005, -013, -014 count sideboard cards, and an overflow (LEGAL-013) is an `error` in 2v2 exactly as in Standard, with Standard's message (no "(2v2 sideboard rules aren't confirmed)"). Nothing in the build reads `DeckRules.sideboardStatus`; the field and the warning-severity branch are **not built** (the v0.8 text is kept below for the day RJ decides). *Kept for later (v0.8, not built):* the default was the Standard rule with the overflow as a `warning`, because no official source says whether 2v2 Constructed has a sideboard or its size (`unverified`, [[Format Catalog]] fact 4, TR 603 silent). | RJ 2026-11-28, chat (ADR-0010 part 6); [[Format Catalog]] fact 4 and input 4 (`unverified`, as of 2026-11-28) |
| LEGAL-F07 | MUST | **Not offered as deck formats** (never in `FormatId`, the selector or the chips): **Sealed, Draft, 2v2 Sealed** (a pool of opened packs, Main Deck >= 20 or 25, no quantity limit: there is no fixed card list to check against a ban list or set list, and a Constructed check would be wrong for them); **free-for-all (3 or 4 players)** (an official Core Rules mode played in side events and Nexus Nights only, outside TR 601-603, no ban list of its own and a secondary-source-only deck shape: checking it would just repeat Standard's rules without bans); the **World Showcase three-deck event** (one event, not researched). Revisit free-for-all only if RJ asks: it would be data (Standard `deckRules`, empty ban list), no new rule. | [[Format Catalog]] official formats table, input 5, "Other findings"; [[Formats]] fact 7 |
| LEGAL-F08 | MUST | **Main format and chips (RJ, H-706 Q11).** (a) A deck stores **one main format**, `standard` by default (SPEC-006 DECK-075, DECK-118). (b) For every **other** offered format the deck shows a **status chip** from a separate evaluation of the same deck in that format (`region` global, `asOf` today, the same inputs): text `"{Format}: legal"` (verdict `legal`), `"{Format}: not legal"` (`illegal`), `"{Format}: not checked"` (`incomplete`); e.g. "2v2: legal", "Standard: not legal". (c) A chip is information only: it never changes `deck.format`, never blocks Save, and is not a version (DECK-134). (d) The main format's verdict is the deck's verdict wherever one verdict is shown (import review, editor, Deck detail); ban chips per card use the main format's list. (e) A 2v2 chip describes the deck alone; it says nothing about a teammate and has no tooltip notice (the single-deck notice, LEGAL-T04, is shelved, v0.8.1). | RJ 2026-11-28, chat (H-706 Q11); [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]]; SPEC-006 DECK-118 |
| LEGAL-T01 | MUST | **Team check (2v2), pure function** `evaluateTeam(TeamRequest) -> TeamResult` over **two** decks A and B, as of `asOf`. Both decks are evaluated alone first with `format: '2v2'` (LEGAL-F02, F04; their own `LegalityResult`s), then rules T02 and T03 run. The team verdict follows LEGAL-R04 over all rules of both decks plus T02, T03; same inputs, same result (LEGAL-R01), no network. Which format each deck stores does not matter: the team check always uses the 2v2 rules. | [[Format Catalog]] fact 2 and input 3 (Core Rules patch 2025-10-24, official) |
| LEGAL-T02 | MUST | **No shared Legend.** The two decks' Legends have different `cardKey`s. The same `cardKey` is one violation naming the Legend: "Both decks use {name} as the Legend. Teammates can't share a Champion Legend." Two different Legends of the same champion are **not** compared by `championTag` (the official text says "the same Champion Legend", and no source says an alternate Legend of the same champion counts; `unverified`). A deck with `legend: null` makes T02 `not_evaluated` (reason "Deck {A or B} has no Legend."). | [[Format Catalog]] fact 2 (official); `unverified` for same-champion alternates |
| LEGAL-T03 | MUST | **No shared battlefield.** No `cardKey` appears in both decks' `battlefields`. Each shared battlefield is one violation: "Both decks use the battlefield {name}. Teammates can't share a battlefield." Fewer than 3 battlefields in a deck does not stop the check (it compares the names present); an unresolved name (LEGAL-019) is skipped and the rule is `not_evaluated` with that name. | [[Format Catalog]] fact 2 and fact 5 (official; community Q&A agrees) |
| LEGAL-T04 | MUST | **Everything else may be shared.** The same non-Legend card (main, sideboard, runes) in both decks is **never** a violation. A single 2v2 deck (no teammate yet) is evaluated alone. **The informational notice on a single 2v2 deck is Shelved by RJ (2026-11-28), not built** ("for a later day", ADR-0010 part 6): `LegalityResult.notices` is always `[]` and the line "2v2 is played in teams. This deck needs a teammate deck with a different Legend and different battlefields." is not emitted or shown (not as a tooltip either). The pure `evaluateTeam` function (T01 to T04) **stays**. | [[Format Catalog]] fact 5 (community-db, "no other deck construction restrictions") and input 3; RJ 2026-11-28 (shelved) |
| LEGAL-T05 | SHOULD | **Teammate picker: Shelved by RJ (2026-11-28), not built** ("for a later day. I need to come up with something on how I want that to work", RJ 2026-11-28, ADR-0010 part 6). No picker, no "Check with a teammate deck" action and no team dialog ship; `evaluateTeam` (T01) is a pure function with no screen. *The v0.8 proposal, kept for later (not built):* On Deck detail, with the 2v2 chip's tooltip or a "Check with a teammate deck" action, the user picks a second deck **from their own saved decks** (the list excludes the open deck; sorted by name; shows each deck's Legend) and sees the `TeamResult` in a dialog: the two decks' rule results and the T02 / T03 lines. The pairing is **not stored** (no new field, no sync, no version); closing the dialog forgets it. A teammate's deck that is not in the user's decks is out of scope for now (the user imports it first, SPEC-006). Until RJ approves, the function (T01) ships without the picker. | spec-writer's proposal; RJ to confirm |

Rules T02, T03 are reported as `TeamViolation`s with the `ruleId` `LEGAL-T02` / `LEGAL-T03` (data contract).

## Data contract
```ts
// ---------- Inputs ----------
type IsoDate = string;              // 'YYYY-MM-DD'
type FormatId = 'standard' | '2v2'; // v0.8 (LEGAL-F01); sealed, draft, free-for-all are NOT offered (LEGAL-F07)
type RegionId = 'global' | string;  // later: e.g. 'kr', 'tw' (BLOCKED: needs research)
type Zone = 'legend' | 'champion' | 'main' | 'sideboard' | 'runes' | 'battlefields';

interface DeckEntry { name: string; qty: number }   // qty >= 1, canonical or raw name

interface DeckInput {
  legend: string | null;         // exactly one Legend (LEGAL-001)
  chosenChampion: string | null; // counts toward the 40 (LEGAL-003/004)
  main: DeckEntry[];             // excludes the Chosen Champion (39 in a 40-card deck)
  sideboard: DeckEntry[];
  runes: DeckEntry[];
  battlefields: DeckEntry[];
}

interface LegalityRequest {
  deck: DeckInput;
  format: FormatId;
  region?: RegionId;             // default 'global'
  asOf: IsoDate;
}

// ---------- Card view required from SPEC-001 ----------
// Names and types are SPEC-001's (source of truth). null / 'unknown' = not evaluated (CARD-029).
// CardCategory and VariantKind are imported from the SPEC-001 data contract.
interface LegalityCardView {
  cardKey: string;               // SPEC-001 nameKey(name); no cardId
  name: string;                  // canonical, for messages
  type: string;                  // verbatim API type (display only)
  category: CardCategory;        // SPEC-001: 'legend'|'champion'|'unit'|'spell'|'gear'|'rune'|'battlefield'|'token'|'unknown'
  domains: string[] | null;      // [] = verified no domain
  isChampionUnit: boolean | null;
  isSignature: boolean | null;
  championTag: string | null;
  printings: { setCode: string; collectorNumber: string; variant: { kind: VariantKind } }[]; // overnumbered = variant.kind
}
interface LegalitySetView { code: string; releaseStatus: 'released' | 'preview' | null } // SPEC-001 CardSet (CARD-008)

// ---------- Output ----------
type RuleStatus = 'pass' | 'fail' | 'warning' | 'not_evaluated';
type Severity = 'error' | 'warning';

interface Violation {
  severity: Severity;
  message: string;               // human-readable, see templates
  cardName?: string;              // canonical name
  cardKey?: string;
  zone?: Zone;
  expected?: number | string;
  actual?: number | string;
  banWaveId?: string;            // LEGAL-016
  effectiveDate?: IsoDate;       // LEGAL-016 / LEGAL-017
}

interface RuleResult {
  ruleId: string;                // 'LEGAL-005'
  title: string;                 // 'At most 3 copies per card name'
  status: RuleStatus;
  summary: string;               // one line, e.g. 'All card names are within the 3-copy limit.'
  violations: Violation[];       // empty when status = 'pass'
  notEvaluatedReason?: string;   // e.g. 'Missing domain data for: X, Y' (reasons joined by a space; unchanged)
  notEvaluatedItems?: NotEvaluatedItem[]; // v0.7, LEGAL-R09: the same reasons, structured; present when status = 'not_evaluated'
  source: string;                // research note title, e.g. 'Deck Construction Rules'
}

// v0.7 (LEGAL-R09). `text` is the full single-line reason, as it appears in notEvaluatedReason.
interface NotEvaluatedItem {
  text: string;                  // 'Missing domain data for: X, Y'
  label?: string;                // 'Missing domain data for' (only when cardNames is present)
  cardNames?: string[];          // ['X', 'Y']: distinct canonical names, engine order; absent for a reason with no list
}

// LEGAL-B08: only waves with announced <= asOf < effective
interface UpcomingBan { cardKey: string; name: string; kind: BanKind; change: 'ban' | 'unban'; announced: IsoDate; effective: IsoDate; waveId: string }

// LEGAL-B10: per-card ban status (Decks, Tournaments)
type BanStatus =
  | { status: 'banned'; waveId: string; waveName: string; bannedSince: IsoDate }   // effective date of the wave that added it
  | { status: 'upcoming'; waveId: string; waveName: string; announced: IsoDate; effective: IsoDate }
  | { status: 'not-banned' }
  | { status: 'unknown' };       // v0.8, LEGAL-F05: the list does not cover asOf (2v2 before 2026-11-23)
// v0.8: for a wave with datesArePlaceholder, 'banned' carries waveName: null and bannedSince: null (waveName: string | null, bannedSince: IsoDate | null)

interface LegalityResult {
  verdict: 'legal' | 'illegal' | 'incomplete';  // LEGAL-R04
  format: FormatId;
  region: RegionId;
  asOf: IsoDate;
  banListDataVersion: string;
  formatsDataVersion: string;
  catalogVersion: string;        // SPEC-001 CardSnapshot.catalogVersion (CARD-068)
  counts: { main: number; sideboard: number; runes: number; battlefields: number }; // main includes champion
  rules: RuleResult[];           // one per rule, in ID order
  upcomingBans: UpcomingBan[];   // LEGAL-B08, informational
  notices: string[];             // v0.8, LEGAL-T04: informational lines, never change the verdict; v0.8.1: always [] (the single 2v2 deck notice is shelved, not emitted)
}

// v0.8 (LEGAL-T01…T04): team check across two decks
interface TeamRequest { deckA: DeckInput; deckB: DeckInput; region?: RegionId; asOf: IsoDate } // format is always '2v2'
interface TeamViolation { ruleId: 'LEGAL-T02' | 'LEGAL-T03'; message: string; cardName: string; cardKey: string }
interface TeamResult {
  verdict: 'legal' | 'illegal' | 'incomplete';   // LEGAL-R04 over a.rules, b.rules and the team rules
  a: LegalityResult;                              // deck A evaluated alone as 2v2
  b: LegalityResult;
  teamRules: { ruleId: 'LEGAL-T02' | 'LEGAL-T03'; title: string; status: RuleStatus; summary: string; violations: TeamViolation[]; notEvaluatedReason?: string }[];
}

// v0.8 (LEGAL-F08): chip data for the deck's other formats
interface FormatChip { format: FormatId; verdict: 'legal' | 'illegal' | 'incomplete'; text: string } // 'legal' → "2v2: legal"; 'illegal' → "2v2: not legal"; 'incomplete' → "2v2: not checked"

// ---------- data/banlist.json ----------
type BanKind = 'card' | 'battlefield' | 'legend';
interface BanEntry { name: string; kind: BanKind }
interface BanWave {
  id: string;                    // 'std-2026-11-23'
  name: string;                  // 'Radiance ban list update'
  announced: IsoDate;
  effective: IsoDate;            // inclusive
  sourceUrl: string;             // official
  add: BanEntry[];
  remove: BanEntry[];            // unbans (needed for regional lists)
  notes?: string;
  datesArePlaceholder?: boolean; // v0.8 (LEGAL-B11, F05): announced/effective are not real; never shown, never used for "bannedSince"
}
interface BanList {
  format: FormatId | string; region: RegionId;
  status: 'verified' | 'conflict' | 'unverified';   // v0.8 adds 'unverified' (2v2 already used it in prose)
  coveredFrom?: IsoDate;         // v0.8 (LEGAL-F05): asOf before this is 'unknown' / not_evaluated; absent = covers all dates
  waves: BanWave[];
}
interface BanListFile { schemaVersion: 1; dataVersion: string; lastVerified: IsoDate; lists: BanList[] }

// ---------- data/formats.json ----------
interface DeckRules {
  mainDeckSize: number; mainDeckSizeMode: 'exact' | 'minimum'; // standard: 40, 'exact'
  copyLimit: number | null;      // null = no limit (Limited)
  signatureLimit: number;
  runeDeckSize: number;
  battlefieldCount: number;
  sideboardMax: number;
  sideboardStatus?: 'verified' | 'unverified'; // v0.8 (LEGAL-F06), SHELVED by RJ 2026-11-28, NOT BUILT: optional and never read; every overflow is an error (v0.8.1)
}
interface SetLegality {
  code: string;                  // upper case (LEGAL-C06)
  legalFrom: IsoDate | null;     // Riot-published date only (LEGAL-C08); null = none published
  legalUntil: IsoDate | null;    // exclusive; null = no rotation scheduled
  basis: 'riot-date' | 'riot-listing'; // riot-listing = an official Riot document lists the set as legal, no date
  sourceUrl: string;             // official Riot URL
  research: string;              // research note wikilink, e.g. '[[Sets]] #2'
}
interface FormatDef {
  id: FormatId | string; name: string; official: true;
  supported: boolean;            // v0.8: 'standard' and '2v2' true = offered and evaluated (LEGAL-F01)
  deckRules: DeckRules;
  setsSameAs?: FormatId;         // v0.8 (LEGAL-F03): '2v2' → 'standard'; then `sets` and `excludedSets` are read from that format
  sets: Record<RegionId, SetLegality[]>;   // empty when setsSameAs is set
  excludedSets: string[];        // never auto-legal (LEGAL-C07), e.g. ['OPP','JDG','PR']
}
interface FormatsFile { schemaVersion: 3; /* v0.8: setsSameAs (sideboardStatus shelved, v0.8.1) */ dataVersion: string; lastVerified: IsoDate; formats: FormatDef[] }
```

### `data/banlist.json` content (Standard, global), as of 2026-11-23
```json
{
  "schemaVersion": 1,
  "dataVersion": "2026-11-23.1",
  "lastVerified": "2026-11-23",
  "lists": [
    {
      "format": "standard", "region": "global", "status": "verified",
      "waves": [
        { "id": "std-2026-03-31", "name": "First bans", "announced": "2026-03-30", "effective": "2026-03-31",
          "sourceUrl": "https://playriftbound.com/en-us/news/announcements/announcing-riftbounds-first-bans/",
          "add": [
            { "name": "Called Shot", "kind": "card" },
            { "name": "Draven, Vanquisher", "kind": "card" },
            { "name": "Fight or Flight", "kind": "card" },
            { "name": "Scrapheap", "kind": "card" },
            { "name": "The Dreaming Tree", "kind": "battlefield" },
            { "name": "Obelisk of Power", "kind": "battlefield" },
            { "name": "Reaver's Row", "kind": "battlefield" }
          ], "remove": [],
          "notes": "Rules Hub spells 'Dreaming Tree'; use the catalog's canonical name (LEGAL-B05)." },
        { "id": "std-2026-07-24", "name": "July ban list update", "announced": "2026-07-17", "effective": "2026-07-24",
          "sourceUrl": "https://playriftbound.com/en-us/news/announcements/july-ban-list-updates/",
          "add": [
            { "name": "Stealthy Pursuer", "kind": "card" },
            { "name": "The Arena's Greatest", "kind": "battlefield" },
            { "name": "Aspirant's Climb", "kind": "battlefield" }
          ], "remove": [],
          "notes": "A creator source says Stealthy Pursuer was flagged on 2026-07-07; official article dated 2026-07-17." },
        { "id": "std-2026-09-18", "name": "September ban list update", "announced": "2026-09-15", "effective": "2026-09-18",
          "sourceUrl": "https://playriftbound.com/en-us/news/announcements/september-ban-list-updates-effective-september-18-2026/",
          "add": [
            { "name": "Ekko, Recurrent", "kind": "card" },
            { "name": "Stacked Deck", "kind": "card" }
          ], "remove": [] },
        { "id": "std-2026-11-23", "name": "Radiance ban list update", "announced": "2026-11-13", "effective": "2026-11-23",
          "sourceUrl": "https://playriftbound.com/en-us/news/announcements/radiance-ban-list-updates-effective-november-23-2026/",
          "add": [
            { "name": "Riven, Broken Blade", "kind": "card" },
            { "name": "Zhonya's Hourglass", "kind": "card" },
            { "name": "Stellacorn Herder", "kind": "card" },
            { "name": "Nocturne, Horrifying", "kind": "card" },
            { "name": "Rhasa the Sunderer", "kind": "card" },
            { "name": "Brynhir Thundersong", "kind": "card" },
            { "name": "Dazzling Aurora", "kind": "card" },
            { "name": "Baited Hook", "kind": "card" },
            { "name": "Emperor's Dais", "kind": "battlefield" },
            { "name": "Star Spring", "kind": "battlefield" }
          ], "remove": [] }
      ]
    }
  ]
}
```
### 2v2 content (LEGAL-B11; shipped from v0.8), as of 2026-11-24
Same file, a second list `{ "format": "2v2", "region": "global", "status": "unverified", "coveredFrom": "2026-11-23", "waves": [...] }`; the snapshot wave carries `"datesArePlaceholder": true`, the Radiance wave does not. Sources: [[Ban List]] facts 3, 4, 5, 8 and its "Current list: 2v2 Constructed" section (Rules Hub read 2026-11-26):
- **Now (as of 2026-11-24 for the totals; names read 2026-11-26):** 1 Legend (Master Yi, Wuju Bladesman), 14 cards, 7 battlefields. The 14 cards: Called Shot; Ekko, Recurrent; Draven, Vanquisher (the hub prints "Draven Vanquisher" in this section; normalise); Scrapheap; Stealthy Pursuer; Stacked Deck; Riven, Broken Blade; Zhonya's Hourglass; Stellacorn Herder; Nocturne, Horrifying; Rhasa the Sunderer; Brynhir Thundersong; Dazzling Aurora; Baited Hook. The 7 battlefields: The Arena's Greatest; Aspirant's Climb; The Dreaming Tree (the hub prints "Dreaming Tree"; normalise, [[Ban List]] fact 10); Obelisk of Power; Reaver's Row; Star Spring; Emperor's Dais.
- **The Radiance wave** (`2v2-2026-11-23`, announced 2026-11-13, effective 2026-11-23, official): 8 cards and 2 battlefields (Riven, Broken Blade; Zhonya's Hourglass; Stellacorn Herder; Nocturne, Horrifying; Rhasa the Sunderer; Brynhir Thundersong; Dazzling Aurora; Baited Hook; Emperor's Dais; Star Spring). The research states the Radiance names as "8 + 2"; which names those are comes from the Standard list's Radiance wave (LEGAL-B09), which the hub's 2v2 names match.
- **Before the Radiance wave (the snapshot wave):** the other names: the Legend, 6 cards, 5 battlefields. **As of 2026-11-22 this is 1 Legend, 6 cards, 5 battlefields** (derived: the hub's 14 / 7 minus the 8 + 2 Radiance names; `unverified`). Counts for dates before 2026-11-22 are not stated by any source (Open question 9, H-169).

The split of the older names into real waves is **not on the hub**: the research says only that the older names entered 2v2 on 2026-07-24 (list created with the Legend) and 2026-09-18 (Ekko, Recurrent and Stacked Deck), and that the old / Radiance split "is consistent with those articles, but only the full list is a hub reading". So the data file stores them as **one snapshot wave** (LEGAL-B11 (b), (c)) and invents no further split or per-name dates. Names resolve through the catalog (LEGAL-B05).

### `data/formats.json` content (Standard, global)
| Set | `legalFrom` | `legalUntil` | `basis` | Source |
|---|---|---|---|---|
| OGN | null | null | riot-listing | TR 601.3.c ([[Sets]] #1) |
| OGS | null | null | riot-listing | TR 601.3.c ([[Sets]] #1) |
| SFD | null | null | riot-listing | TR 601.3.c ([[Sets]] #1) |
| UNL | null | null | riot-listing | TR 601.3.c ([[Sets]] #1) |
| VEN | null | null | riot-listing | TR 601.3.c ([[Sets]] #1) |
| RAD | 2026-10-23 | null | riot-date | TR 601.3.c.6.a ([[Formats]] #4; [[Sets]] #1) |
| LGC | 2027-01-29 | null | riot-date | "Products and Sets into 2027" ([[Sets]] #2) |
| PG2 | 2027-02-19 | null | riot-date | "Products and Sets into 2027" ([[Sets]] #2) |
| REC | 2027-04-30 | null | riot-date | "Products and Sets into 2027" ([[Sets]] #2) |

`name` for `standard`: `"Standard"` (display name used in messages, LEGAL-R08). **`2v2` entry (v0.8):** `{ id: "2v2", name: "2v2", official: true, supported: true, setsSameAs: "standard", sets: {}, excludedSets: [], deckRules: <the same numbers as standard> }` (LEGAL-F02, F03; [[Format Catalog]]). **v0.8.1:** the v0.8 `sideboardStatus` values (`verified` / `unverified`, LEGAL-F06) are shelved and not built; leave the field out. A data check fails if a `setsSameAs` target is missing or itself uses `setsSameAs`.
`excludedSets` for `standard`: `["OPP", "JDG", "PR"]` (LEGAL-C07: not legal as sets; legal by name). Every `legalUntil` is `null`: Riot says the first rotation is at the start of 2028, Sets 1-5 (LEGAL-C05), but publishes no per-set date.
`deckRules` for `standard`: `{ mainDeckSize: 40, mainDeckSizeMode: 'exact', copyLimit: 3, signatureLimit: 3, runeDeckSize: 12, battlefieldCount: 3, sideboardMax: 10 }` ([[Deck Construction Rules]] #3–#9).
The community dates for OGN–VEN in [[Sets]] #4 are **not** stored (ADR-0005, LEGAL-C08). Consequence: for
those sets the app cannot say from which date they were legal; it treats them as legal for any `asOf`. This
matters only for decks dated before a set existed, which cannot contain that set's cards.

### Message templates (LEGAL-R07)
Placeholders are rendered per LEGAL-R08. Example: LEGAL-016 for Nocturne, Horrifying as of 2026-11-23 reads "Nocturne, Horrifying is banned in Standard as of Nov 23, 2026 (Radiance ban list update, effective Nov 23, 2026)."

| Rule | Fail message |
|---|---|
| LEGAL-001 | "A deck needs exactly 1 Legend; this deck has {n}." / "{name} is not a Legend." |
| LEGAL-002 | "{name} ({domains}) is outside this deck's domains ({identity})." |
| LEGAL-003 | "The main deck must have exactly 40 cards including the Chosen Champion; it has {n} ({diff:+d})." |
| LEGAL-004 | "{name} can't be the Chosen Champion: {reason}." (reason: "it is not a Champion Unit" / "it is a Signature card" / "its champion ({tag}) doesn't match the Legend ({legendTag})") |
| LEGAL-005 | "{name}: {total} copies (main {m}, champion {c}, sideboard {s}); the limit is 3 per name." |
| LEGAL-006 | "{n} Signature cards in the main deck; the limit is 3." |
| LEGAL-007 | "{name} is a Signature card for {tag}, but the Legend is {legendTag}." |
| LEGAL-008 | "The rune deck must have exactly 12 runes; it has {n}." / "{name} is not a Rune." |
| LEGAL-009 | "{name} doesn't match this deck's domains ({identity})." |
| LEGAL-010 | "A deck needs exactly 3 battlefields; this deck has {n}." |
| LEGAL-011 | "Battlefield {name} appears {n} times; battlefield names must be unique." |
| LEGAL-013 | "The sideboard can have at most 10 cards; it has {n}." |
| LEGAL-014 / -015 | "{name} is a {type} and can't be in the {zone}." |
| LEGAL-016 | "{name} is banned in {format} as of {asOf} ({waveName}, effective {effective})." |
| LEGAL-017 | "{name} isn't legal in {format} on {asOf}: its sets ({sets}) are not legal until {legalFrom}" / "…are not released yet" / "…are no longer legal." |
| LEGAL-019 | "Unknown card: \"{raw}\". Check the spelling." |
| LEGAL-016 (placeholder-dated 2v2 name, LEGAL-F05) | "{name} is banned in 2v2 as of {asOf}." (no wave, no date) |
| LEGAL-016 (2v2 before coverage) | not_evaluated: "The 2v2 ban list before Nov 23, 2026 isn't known." |
| LEGAL-013 (2v2, LEGAL-F06) | *Shelved (RJ 2026-11-28), not built.* 2v2 uses the LEGAL-013 row above, as an error: "The sideboard can have at most 10 cards; it has {n}." |
| LEGAL-T02 | "Both decks use {name} as the Legend. Teammates can't share a Champion Legend." |
| LEGAL-T03 | "Both decks use the battlefield {name}. Teammates can't share a battlefield." |
| Chip (LEGAL-F08) | "{Format}: legal" / "{Format}: not legal" / "{Format}: not checked" |
| 2v2 notice (LEGAL-T04) | *Shelved (RJ 2026-11-28), not built, never emitted:* "2v2 is played in teams. This deck needs a teammate deck with a different Legend and different battlefields." |

## Acceptance criteria
Fixtures: `KENNEN_1` = [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] (1st, RC Europe, 2026-11-08); `RIVEN_2` = [[2026-11 RC Europe - 2 - Sonecon - Riven]] (2nd). Both were registered and played at a sanctioned Regional Championship, so they are expected to pass every construction rule; their attribute-dependent rules (LEGAL-002/004/006/007/009/012) can only be asserted once SPEC-001 provides the card data.

1. **Given** `KENNEN_1` (Legend Kennen, Heart of the Tempest; Chosen Champion Kennen, Storm of Shuriken; 39 main; 9 Chaos Rune + 3 Order Rune; Minefield, Veiled Temple, Zaun Warrens; 10 sideboard), format `standard`, region `global`, **When** evaluated with `asOf = 2026-11-08`, **Then** LEGAL-016 passes, LEGAL-003 passes with `counts.main = 40`, LEGAL-008 passes (12), LEGAL-010 and LEGAL-011 pass, LEGAL-013 passes (10), LEGAL-005 passes (e.g. An Offer You Can't Refuse = 1 main + 1 sideboard = 2), `upcomingBans` is **empty** (the Radiance wave was announced on 2026-11-13, after `asOf`, so it is not shown; LEGAL-B08), and, given complete card data, `verdict = legal`.
2. **Given** `KENNEN_1`, **When** evaluated with `asOf = 2026-11-23`, **Then** `verdict = illegal`, LEGAL-016 fails with exactly two violations: "Nocturne, Horrifying is banned in Standard as of Nov 23, 2026 (Radiance ban list update, effective Nov 23, 2026)." (LEGAL-R08) and the same for Rhasa the Sunderer, each with `banWaveId = std-2026-11-23`, zone `main`. All count rules still pass.
3. **Given** `KENNEN_1`, **When** evaluated with `asOf = 2026-11-22`, **Then** LEGAL-016 passes (effective date is inclusive, the wave was announced but not effective) **and** `upcomingBans` lists Nocturne, Horrifying and Rhasa the Sunderer with `change: 'ban'`, `announced: 2026-11-13`, `effective: 2026-11-23`. The same holds for any `asOf` from 2026-11-13 to 2026-11-22; with `asOf = 2026-11-12` `upcomingBans` is empty.
4. **Given** `RIVEN_2`, **When** evaluated with `asOf = 2026-11-23`, **Then** LEGAL-016 fails with exactly five violations: Riven, Broken Blade (zone `champion`), Stellacorn Herder and Zhonya's Hourglass (zone `main`), Emperor's Dais and Star Spring (zone `battlefields`); **and with `asOf = 2026-11-08`** LEGAL-016 passes.
5. **Given** the Standard ban data, **When** the banned set is computed as of 2026-11-23, **Then** it has 15 `card` and 7 `battlefield` entries (LEGAL-B09); as of 2026-11-22 it has 7 cards and 5 battlefields; as of 2026-07-23 it has 4 cards and 3 battlefields; as of 2026-07-24 it includes Stealthy Pursuer; as of 2026-03-30 it is empty.
6. **Given** `KENNEN_1` with the sideboard changed to include **3** An Offer You Can't Refuse (main 1 + sideboard 3 = 4), **When** evaluated as of 2026-11-08, **Then** LEGAL-005 fails with "An Offer You Can't Refuse: 4 copies (main 1, champion 0, sideboard 3); the limit is 3 per name." and LEGAL-013 fails (sideboard 12).
7. **Given** `KENNEN_1` with 1 sideboard card added (11 total), **When** evaluated, **Then** LEGAL-013 fails with "The sideboard can have at most 10 cards; it has 11."
8. **Given** `KENNEN_1` with Trifarian Captain reduced from 3 to 2, **When** evaluated, **Then** LEGAL-003 fails with "…it has 39 (-1)."; **and given** a deck with `chosenChampion: null`, LEGAL-004 fails and LEGAL-003 counts only `main`.
9. **Given** `KENNEN_1` with battlefields Minefield, Minefield, Zaun Warrens, **When** evaluated, **Then** LEGAL-011 fails naming Minefield (2), and LEGAL-010 passes (3).
10. **Given** `KENNEN_1` with 8 Chaos Rune + 3 Order Rune, **When** evaluated, **Then** LEGAL-008 fails ("…it has 11.").
11. **Given** `RIVEN_2` with Chosen Champion set to Kennen, Storm of Shuriken, **When** evaluated with card data where its Champion tag differs from the Legend's, **Then** LEGAL-004 fails with the "doesn't match the Legend" reason. *(tag values BLOCKED on SPEC-001.)*
12. **Given** a deck containing a card whose only printings are in LGC, **When** evaluated with `asOf = 2026-11-23`, **Then** LEGAL-017 fails ("…not legal until Jan 29, 2027", `effectiveDate = 2027-01-29`), even if the catalog already returns LGC as a preview set; with `asOf = 2027-01-29` it passes.
13. **Given** `KENNEN_1` with "Lightning Rsh" in `main`, **When** evaluated, **Then** LEGAL-019 fails ("Unknown card: \"Lightning Rsh\"…"), other rules don't count it as anything, and `verdict = illegal`.
14. **Given** card data with `domains = null` for one main card and no other failures, **When** evaluated, **Then** LEGAL-002 is `not_evaluated` with that card named, and `verdict = incomplete` (not `legal`).
15. **Given** any request, **When** evaluated, **Then** `rules` has one entry for every rule ID in section A, in ID order, and the result carries the `banListDataVersion`, `formatsDataVersion` and SPEC-001 `catalogVersion` used (e.g. `0.2+2026-11-20T18:04:00Z`).
16. **Set legality without a Riot date** (LEGAL-C02, -C03, -C08) **Given** a card whose only printings are in VEN (`legalFrom: null`, `basis: riot-listing`) **When** evaluated as of 2026-11-23 with VEN `releaseStatus` `released` **or** `null` **Then** LEGAL-017 passes. **Given** a new set `XYZ` with no `formats.json` entry **When** the catalog has it as `released` **Then** its cards pass LEGAL-017; as `preview` **Then** they fail with "…are not released yet"; as `null` **Then** LEGAL-017 is `not_evaluated` and `verdict = incomplete`. **Given** an entry with a `legalFrom` whose `sourceUrl` is not an official Riot URL **When** the data check runs **Then** it fails (LEGAL-C08).
17. **Promos legal by name** (LEGAL-C07) **Given** a card whose only printing is in `OPP` (no printing in a legal set) **When** evaluated **Then** LEGAL-017 fails even if the catalog marks `OPP` `released`; **given** a card with printings in `OPP` and `OGN` (same name, so same `cardKey`) **Then** LEGAL-017 passes, whichever printing the deck lists.
18. **Overnumbered** (LEGAL-018) **Given** a card with an in-range printing in `LGC` and a `variant.kind: 'overnumbered'` printing `RAD` `300` **When** evaluated as of 2026-11-23 **Then** LEGAL-018 fails for it (only legal-set printing is overnumbered) and LEGAL-017 passes. **Given** the same card with the RAD printing's `variant.kind: 'unknown'` **Then** LEGAL-018 is `not_evaluated`. **Given** a card whose printings are all in legal sets, all with `variant.kind: 'unknown'` **Then** LEGAL-018 passes.
19. **Unknown champion data** (LEGAL-004, LEGAL-R04) **Given** `RIVEN_2` with SPEC-001 data where `isChampionUnit`, `isSignature` and `championTag` are `null` **When** evaluated as of 2026-11-08 **Then** LEGAL-004 is `not_evaluated` (not `pass`, not `fail`) and `verdict = incomplete`.
20. **Per-card ban status** (LEGAL-B10) **Given** the Standard ban data **When** `banStatus` is asked as of 2026-11-23 for `cardKey` `zhonyas hourglass` **Then** it returns `banned`, `waveId = std-2026-11-23`, `bannedSince = 2026-11-23`; as of 2026-11-15 **Then** `upcoming` (announced 2026-11-13, effective 2026-11-23); as of 2026-11-10 **Then** `not-banned`; for `stealthy pursuer` as of 2026-11-23 **Then** `banned` with `bannedSince = 2026-07-24`.
21. **Remove before add inside one wave** (LEGAL-B02; v0.3.1) **Given** a list whose earlier wave bans `Card A` and whose later wave (effective 2026-12-01) has `remove: [Card A]` **and** `add: [Card A]` **When** the banned set is computed as of 2026-12-01 **Then** `Card A` is banned (remove runs first, then add). **Given** the same wave with `remove: [Card A]` and no `add` **Then** `Card A` is not banned from 2026-12-01 and still banned as of 2026-11-30.

22. **2v2 ban data** (LEGAL-B11; v0.4, v0.6) **Given** the 2v2 data file (names from the [[Ban List]] 2v2 reading, one snapshot wave plus the Radiance wave) **When** the banned set is computed as of 2026-11-23 **Then** it has 1 `legend` (Master Yi, Wuju Bladesman), 14 `card` and 7 `battlefield` entries; the snapshot wave alone (the names before Radiance) has 1 legend, 6 cards, 5 battlefields (derived, `unverified`). **Given** any date before 2026-11-23 **Then** the list is not evaluated (LEGAL-F05, AC 31) and no AC checks a count: the snapshot wave's dates are placeholders (LEGAL-B11) and no output may show them. *(v0.8: 2v2 is offered; this AC is the data check.)*
23. **Rotation is data** (LEGAL-C05; v0.4) **Given** the shipped Standard data **When** a card with only OGN printings is evaluated as of 2028-01-01 **Then** LEGAL-017 passes (every `legalUntil` is `null`). **Given** test data where `OGN` has `legalUntil: 2028-01-01` **When** evaluated as of 2027-12-31 **Then** it passes; as of 2028-01-01 it fails with "…are no longer legal." No rotation is computed from set counts or years.
24. **SAMPLE printings** (LEGAL-C10; v0.4, v0.5) **Given** test data where a card's only legal-set printing is flagged SAMPLE (field to be defined in SPEC-001 CARD-044) **When** evaluated **Then** LEGAL-017 fails for it; **given** the same card also has an unflagged printing in a legal set **Then** LEGAL-017 passes (the flagged printing is ignored, the name is still legal); **given** the catalog has no way to mark SAMPLE **Then** no printing is ignored. *(flag BLOCKED on SPEC-001; the leave-out rules for import, collection and decks are SPEC-003 AC 50, SPEC-006 AC 41, SPEC-007 AC 42, SPEC-005 AC 37.)*
25. **Signature cap** (LEGAL-006, -006a; v0.4) **Given** a deck with 3 Signature cards in `main` and 1 more in `sideboard` **When** evaluated **Then** LEGAL-006 passes and LEGAL-006a reports a `warning` (total 4, main 3); `verdict` is not changed by the warning. **Given** 4 Signature cards in `main` **Then** LEGAL-006 fails with "4 Signature cards in the main deck; the limit is 3."
26. **Battlefield domains** (LEGAL-012; v0.4) **Given** `KENNEN_1`'s battlefields with `domains: []` **When** evaluated **Then** LEGAL-012 passes for any Legend. **Given** a battlefield with `domains: ['Fury']` under a Legend whose identity lacks Fury **Then** LEGAL-012 fails; **given** `domains: null` **Then** it is `not_evaluated`.
27. **Zone-less dates** (LEGAL-B12; v0.4) **Given** Zhonya's Hourglass (effective 2026-11-23) **When** evaluated as of 2026-11-23 **Then** it is banned however the request was made: `asOf` is a date only, there is no time or zone input, and no message states a time of day.
28. **Not-checked reasons are structured** (LEGAL-R09; v0.7, H-676) **Given** a deck whose 31 distinct cards all have `isChampionUnit = null` **When** evaluated **Then** LEGAL-004 is `not_evaluated`, `notEvaluatedReason` still reads "Missing champion data for: <the 31 names joined by ", ">" (unchanged), and `notEvaluatedItems` holds one item with `label` "Missing champion data for" and `cardNames` of length 31 (distinct names; three copies of one card are one name). **Given** two rules with reasons **Then** their items keep the order of `notEvaluatedReason`. **Given** the "no Legend with domain data" reason **Then** its item has no `cardNames`. **Given** a deck that passes every rule **Then** no rule has `notEvaluatedItems`.

29. **2v2 banned Legend** (LEGAL-F04, -F05; v0.8) **Given** a deck with Legend `Master Yi, Wuju Bladesman`, `format: '2v2'`, `asOf = 2026-11-28` **When** evaluated **Then** LEGAL-016 fails with one violation, zone `legend`: "Master Yi, Wuju Bladesman is banned in 2v2 as of Nov 28, 2026." (no wave name, no date: placeholder wave) and `verdict = illegal`. **Given** the same deck with `format: 'standard'` **Then** LEGAL-016 has no violation for the Legend.
30. **Fight or Flight** (LEGAL-F04; v0.8) **Given** a deck with 1 `Fight or Flight` in `main`, `asOf = 2026-11-28` **When** evaluated as `standard` **Then** LEGAL-016 fails: "Fight or Flight is banned in Standard as of Nov 28, 2026 (First bans, effective Mar 31, 2026)." (`banWaveId std-2026-03-31`); **When** evaluated as `2v2` **Then** LEGAL-016 passes for it. `banStatus('fight or flight', '2v2', 'global', 2026-11-28)` = `not-banned`; for `standard` = `banned`.
31. **2v2 coverage and real wave** (LEGAL-F05; v0.8) **Given** a 2v2 deck with `Nocturne, Horrifying` in `main` **When** `asOf = 2026-11-23` **Then** LEGAL-016 fails with "Nocturne, Horrifying is banned in 2v2 as of Nov 23, 2026 (Radiance ban list update, effective Nov 23, 2026)." (`banWaveId 2v2-2026-11-23`); **When** `asOf = 2026-11-22` **Then** LEGAL-016 is `not_evaluated` ("The 2v2 ban list before Nov 23, 2026 isn't known."), `verdict = incomplete` if nothing else fails, and `banStatus` is `unknown`. `banStatus('stealthy pursuer', '2v2', 'global', 2026-11-28)` = `banned` with `waveName: null`, `bannedSince: null`; `banStatus('zhonyas hourglass', '2v2', …, 2026-11-28)` = `banned`, `bannedSince 2026-11-23`. No response, message or export contains a placeholder date (2026-09-15 / 2026-09-18).
32. **2v2 deck rules and sets are Standard's** (LEGAL-F02, F03; v0.8) **Given** `KENNEN_1` with 1 card removed from `main` **When** evaluated as `2v2` **Then** LEGAL-003 fails exactly as in AC 8; a card whose only printings are in `LGC` fails LEGAL-017 in 2v2 on 2026-11-23 and passes on 2027-01-29, as in AC 12; a test `OGN` `legalUntil` edit in the `standard` entry changes the `2v2` result too.
33. **2v2 sideboard uses the Standard rule** (LEGAL-F06 shelved, LEGAL-F02; v0.8.1) **Given** a deck with 11 sideboard cards **When** evaluated as `2v2` **Then** LEGAL-013 fails with "The sideboard can have at most 10 cards; it has 11." exactly as `standard` does (AC 7), and the verdict is `illegal`. No result is a `warning` for this rule and no message mentions "aren't confirmed". *(v0.8's warning case is shelved by RJ, 2026-11-28, and not built.)*
34. **Team check** (LEGAL-T01…T04; v0.8) **Given** deck A (Legend `Kennen, Heart of the Tempest`, battlefields Minefield, Veiled Temple, Zaun Warrens) and deck B (`RIVEN_2`: its Legend and its battlefields, none of which is in `KENNEN_1`) **When** `evaluateTeam` runs as of 2026-11-28 **Then** T02 and T03 pass and the verdict follows the two decks. **Given** both decks with Legend Kennen **Then** T02 fails with "Both decks use Kennen, Heart of the Tempest as the Legend. Teammates can't share a Champion Legend." and `verdict = illegal`. **Given** both decks with battlefield `Minefield` **Then** T03 fails with one violation naming Minefield (two shared = two violations). **Given** both decks play 3 `Fight or Flight` and the same runes **Then** no team violation. **Given** deck B with `legend: null` **Then** T02 is `not_evaluated` ("Deck B has no Legend.") and the verdict is `incomplete`. **Given** deck A illegal on its own in 2v2 (Master Yi) **Then** the team verdict is `illegal` and `a.verdict = illegal`.
35. **A single 2v2 deck has no notice** (LEGAL-T04 notice shelved; v0.8.1) **Given** one 2v2 deck passing every rule **When** evaluated **Then** `verdict = legal` and `notices` is `[]`, as for `standard`; no screen shows a teammate line for it. *(v0.8's one-line teammate notice is shelved by RJ, 2026-11-28, and not built.)*
36. **Main format and chips** (LEGAL-F08; v0.8) **Given** a deck with `format: 'standard'` that holds Fight or Flight **Then** its verdict is `illegal` (Standard) and its chip reads "2v2: legal" (given every other rule passes). **Given** a deck with `format: '2v2'` and Legend Master Yi **Then** the main verdict is `illegal` (2v2) and the chip reads "Standard: legal". **Given** a chip whose evaluation is `incomplete` (missing card data) **Then** it reads "2v2: not checked", not "legal". A chip never changes `deck.format`, never blocks Save and creates no version.
37. **Formats not offered** (LEGAL-F01, F07; v0.8) **Given** a request with `format: 'sealed'`, `'draft'`, `'2v2-sealed'` or `'free-for-all'` **Then** it is rejected as invalid input and nothing is evaluated; the format selector and chips list only "Standard" and "2v2".

## Out of scope
- **Limited** (Sealed: ≥25 main, no copy limit, 3-domain identity; Draft: ≥20; 2v2 Sealed), **free-for-all** (LEGAL-F07) and the **World Showcase** three-deck format. (v0.8: 2v2 Constructed is now offered, section E.) The data model supports them via `deckRules` and per-format ban lists. ([[Formats]], [[Deck Construction Rules]] #14)
- **Regional lists** (Korea, Traditional Chinese): schema supports them; content not published. ([[Ban List]] #7)
- Physical-card rules (proxies, alters, languages), OPL-level exceptions, decklist registration rules, sideboarding procedure, game rules (scoring, turns).
- Casual "at least 40" Core-Rules decks (would be a `mainDeckSizeMode: 'minimum'` format later).

## Open questions / BLOCKED
1. **Rotation (`partial`, v0.4, v0.6).** Resolved for planning: first rotation at the start of 2028 (Set 10), Sets 1-5 leave; second at the start of 2029 (Set 14), Sets 6-9 leave (LEGAL-C05). Which set codes are Sets 6-9 is not stated. Still open: the exact date and per-set list, and **whether OGS rotates** (unconfirmed). Every `legalUntil` stays `null` until a Riot source gives dates. → researcher. ([[Formats]] #8)
2. **Card attributes in the Riot API** (type strings → `category`, `domains` via `faction`?, `isChampionUnit`, `isSignature`, `championTag`, `variant.kind` for overnumbered). LEGAL-002/004/006/007/009/012/014/015/018 depend on them; until then they return `not_evaluated`. **BLOCKED: needs research** → researcher + SPEC-001.
3. **Signature cap and the sideboard (`partial`, not settled by Riot):** Core 103 does not name the sideboard; safe reading = the cap binds the Main Deck at any time (LEGAL-006); sideboard overage is a `warning` (LEGAL-006a). Needs an official FAQ or judge ruling to become an `error`. → researcher. ([[Deck Construction Rules]] #16)
4. **Canonical names**: "The Dreaming Tree" vs "Dreaming Tree"; the catalog name wins (LEGAL-B05), no alias table (ADR-0005). → researcher to confirm against the API.
5. **Time zone of effective and announced dates:** Riot does not publish one (verified, [[Ban List]] #9). Settled as zone-less calendar dates (LEGAL-B12). Only matters if exact-time legality is ever needed: ask Riot Support or a judge.
6. **Set release status in the API** (SPEC-001 CARD-008): how the API marks preview/unreleased sets. Until known, sets without a Riot date rely on `basis: riot-listing` (LEGAL-C02 (3)). **BLOCKED: needs research.**
7. **Promos and SAMPLE (RJ-confirmed 2026-11-25, v0.5):** promos legal by name, SAMPLE-stamped printings not legal and left out entirely (LEGAL-C07, -C10). Still open: re-read TR 601.2 in the official PDF (the by-name wording is a community transcription; RJ's confirmation is the product rule); how the API marks SAMPLE printings (**BLOCKED: needs research**, H-020, SPEC-001 CARD-044 field).
8. **Riot-published release dates for OGN, OGS, SFD, UNL, VEN**: none cited in research (only community dates, [[Sets]] #4). Optional: researcher looks for official Riot sources; until then `legalFrom: null` (LEGAL-C08).
9. **2v2 (v0.4; v0.8: shipped):** the Radiance-wave conflict is resolved (the hub shows 1 Legend, 14 cards, 7 battlefields, LEGAL-B11). **Fight or Flight (v0.8): settled by the hub list** (legal in 2v2; [[Format Catalog]] fact 6; Riot said no extra 2v2-only bans on 2026-11-13); the earlier worry that the July wording implied it is banned is closed. Still open: the per-wave split (dates and which names) before the Radiance wave: the hub gives only the full current list; the research says the older names entered on 2026-07-24 and 2026-09-18 but not which name entered when. The data file keeps one placeholder snapshot wave (LEGAL-B11, v0.6, H-485; the names are the hub's, the dates are placeholders nothing may show). → researcher item H-169, before 2v2 ships.
10. **Battlefield domains (`partial`, v0.4):** a Riftcodex sample says battlefields have no domain; the full check over the live payload is H-020. LEGAL-012 keeps the general fit rule meanwhile.
11. **2v2 "data only for deck information" (RJ 2026-11-25, v0.5), superseded (v0.8):** RJ's 2026-11-28 H-704 request offers 2v2 as a format (section E). Whether Tournaments (SPEC-004) shows 2v2 labels stays no: its "legal as of" stays Standard.
13. **2v2 sideboard (`unverified`, v0.8; shelved v0.8.1):** RJ shelved the warning (2026-11-28); until he decides, the Standard sideboard of 10 applies with an error on overflow (LEGAL-F06, LEGAL-F02). Still needs TR 603 / 403 read in the official PDF or a judge answer ([[Format Catalog]] fact 4). → researcher.
14. **Same-champion alternate Legends in a team (`unverified`, v0.8):** LEGAL-T02 compares `cardKey` only. → researcher, only if such a Legend exists.
15. **Teammate picker and the single-deck notice: SHELVED by RJ (2026-11-28, v0.8.1).** "For a later day. I need to come up with something on how I want that to work." LEGAL-T05, the single 2v2 deck notice (LEGAL-T04) and the 2v2 sideboard warning (LEGAL-F06) are not built; RJ will say how 2v2 should work.
16. **2v2 rule numbers differ across Core Rules mirrors** ([[Format Catalog]] fact 3); sources are cited by name, not number.
12. **SAMPLE and the catalog (v0.5):** a card whose only printings are SAMPLE: LEGAL-C10 makes LEGAL-017 fail for it; SPEC-003 IMP-077 (d) (RJ 2026-11-26, "Approve both") treats it as not in the card data. The marker is SPEC-001 CARD-044 (BLOCKED, H-020).

## Changelog
Current: **0.8.1 (2026-11-28, H-719; RJ 2026-11-28, chat, ADR-0010 part 6, "for a later day. I need to come up with something on how I want that to work"; requirements shelved, text only):** LEGAL-T05 (teammate picker), LEGAL-F06 (2v2 sideboard-overflow warning) and the single-2v2-deck notice (LEGAL-T04's notice) are each labelled **Shelved by RJ (2026-11-28), not built**; until RJ decides, the 2v2 sideboard reuses the Standard deck rules unchanged (LEGAL-F02, overflow is an error); `notices` is always `[]`; the pure `evaluateTeam` function (T01 to T04) stays; `sideboardStatus` is optional and never read; ACs 33 and 35 rewritten to what is built; LEGAL-F08 (e), message templates and Open questions 13 and 15 aligned. Builder: remove or do not build the three shelved items (see the report). **Previous:** 0.8 (2026-11-28, H-704, source: RJ 2026-11-28, "any formats you can find. 2v2 is also very popular", H-706 Q11; [[Format Catalog]]; status stays `review`, requirements change): new section E (LEGAL-F01…F08, LEGAL-T01…T05); LEGAL-B11 becomes MUST and shipped (RJ's v0.5 "data only" superseded; `datesArePlaceholder`, `coveredFrom 2026-11-23`); LEGAL-B10 `banStatus` gains `unknown` and null `bannedSince` for placeholder waves; LEGAL-R05, R08, Definitions, Purpose, Out of scope, Open questions 9, 11, 13-16; data contract (`FormatId`, `setsSameAs`, `sideboardStatus`, `notices`, `TeamRequest/Result/Violation`, `FormatChip`; `FormatsFile.schemaVersion` 3); 2v2 `formats.json` entry; templates; AC 22 updated, ACs 29-37. Builder item to be filed for H-704 (not filed by this edit). Before: 0.7 (2026-11-26, H-674 and H-676, source: RJ 2026-11-26, chat, multiple choice "Shorten to a count"; status stays `review`): new LEGAL-R09 (a not-checked reason that lists cards is carried as `NotEvaluatedItem { text, label?, cardNames? }` next to the unchanged `notEvaluatedReason`, and every screen shows it as a count line with the names on request; the "Missing ... data for" lines are RJ's direction, the other list reasons are the spec-writer's reading), data contract (`notEvaluatedItems`), AC 28; no rule, verdict or data file changed; builds H-676. Before: 0.6 (2026-11-26, H-485, H-652, H-645; status `approved` → `review` because requirements change): LEGAL-B11 gains the rule for what the 2v2 data may hold (hub names, one placeholder snapshot wave, which dates it may carry, nothing may show them), "2v2 content" now lists the hub names and the derived 2026-11-22 counts instead of "not sourced", AC 22 and Open question 9 aligned; LEGAL-C05 adds the second rotation (start of 2029, Set 14, Sets 6-9; `partial`, `legalUntil` still `null`) and Open question 1; LEGAL-C07 adds the ARC note (`unverified`, name rule, not an official ruling). No data file change needed (the stored snapshot wave is allowed as is); no builder item. Before: 0.5 (2026-11-26, H-197, RJ 2026-11-25 answers to the H-193 gate; status `review` → `approved`): LEGAL-C07 marked RJ-confirmed (promos OPP / JDG / PR legal by name; the TR 601.2 community-transcription note kept); LEGAL-C10 gains "left out entirely" (RJ: "Sample cards are NOT legal", "we can just leave them out entirely") with pointers to SPEC-003 IMP-077, SPEC-006 DECK-106, SPEC-007 COLL-110, SPEC-005 OWN-120; LEGAL-B11 attributes "2v2 is data only for deck information" to RJ and says nothing more than before about where it is shown (Open question 11); AC 24 gains the "unflagged legal printing still passes" case; Open questions 7, 11, 12; no rule, data file or other AC changed; build H-194 (AC 24 stays stubbed until the marker exists). Before: 0.4 (2026-11-25, H-164: 2v2 ban data, rotation as data, promos by name and SAMPLE, Signature cap reading, battlefield domains, zone-less ban dates; `review`). Before: 0.3.1 (2026-11-24, H-076: LEGAL-B02 orders `remove` before `add` inside one wave, AC 21). Full history: [[Deck Legality changelog]] (archived). New entries go in the archive note.
