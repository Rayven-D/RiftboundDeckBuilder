---
tags: [spec]
id: SPEC-002
version: 0.2
status: draft
depends_on: [SPEC-001]
research: ["[[Deck Construction Rules]]", "[[Ban List]]", "[[Formats]]", "[[Sets]]", "[[Rules Overview]]", "[[Riot App Application]]"]
decisions: ["[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
as_of: 2026-11-23
---
# SPEC-002: Deck Legality

## Purpose
Decide whether a deck is legal in a given **format**, **region**, and **as of a given date**, and
explain every failure in plain language. Riot requires a built-in deckbuilder to **enforce the official
deckbuilding rules** before it grants a production key ([[Riot App Application]]), so this spec is a
compliance requirement as well as a feature.

**MVP scope:** Standard Constructed, region `global`. The data model (rule parameters per format, ban
lists per format × region, legal sets per format with dates) is built so that 2v2, Limited, and regional
lists can be added as data plus a few new rules, without changing the result contract.

Consumers (per [[ADR-0006 Two Imports - Collection and Decks]]):
- **Your decks** ([[Your Decks Ownership View]], SPEC-005): shows **ban status on every card** of an
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
- **Format:** an official play format. MVP: `standard` = Standard Constructed. ([[Formats]] #1, #2)
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
| LEGAL-006 | MUST | **At most *signatureLimit* (3) Signature cards in total** in the Main Deck, whatever their names. | [[Deck Construction Rules]] #6 (Core 103.3.d) |
| LEGAL-006a | SHOULD | Also count Signature cards across Main Deck + sideboard; if that total exceeds 3 while the main-deck total does not, report **severity `warning`**, not `error`, until research confirms whether the cap spans the sideboard (see Open questions). | [[Deck Construction Rules]] #6, #9; Conflicts |
| LEGAL-007 | MUST | Every Signature card (main or sideboard) **shares the Legend's Champion tag**. | [[Deck Construction Rules]] #6 (Core 103.3.d) |
| LEGAL-008 | MUST | The Rune Deck has **exactly *runeDeckSize* (12) cards and every one has `category` `rune`**. | [[Deck Construction Rules]] #7 (Core 103.4, 161.2.a; TR 402) |
| LEGAL-009 | MUST | Every Rune card **fits the Domain Identity**. | [[Deck Construction Rules]] #7 |
| LEGAL-010 | MUST | There are **exactly *battlefieldCount* (3) battlefields**, each with `category` `battlefield`. | [[Deck Construction Rules]] #8 (Core 103.5; TR 402) |
| LEGAL-011 | MUST | **No two battlefields share a `cardKey`.** | [[Deck Construction Rules]] #8 |
| LEGAL-012 | MUST | Every battlefield **fits the Domain Identity** (by the LEGAL-002 rule; a no-domain battlefield fits any identity). | [[Deck Construction Rules]] #8 ("where applicable"), #2 |
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
| LEGAL-B02 | MUST | **Banned set as of D** = start empty; apply every wave of the (format, region) list with `effective <= D`, in ascending effective-date order (ties: file order); `add` inserts names, `remove` deletes them. A wave whose effective date is **after** D has no effect, even if already announced. The effective date is **inclusive** (a card banned "effective 2026-11-23" is banned on 2026-11-23). | [[Ban List]] (effective vs. announced dates) |
| LEGAL-B03 | MUST | Region lookup: use the list for (format, region) if it exists; otherwise fall back to (format, `global`). MVP ships only `global`. | [[Ban List]] #7 |
| LEGAL-B04 | MUST | The file carries `dataVersion` and `lastVerified`; every legality result echoes the `dataVersion` used, so a stored result can be re-checked when the list changes. | [[Spec Index]] (versioned specs/data) |
| LEGAL-B05 | MUST | Every name in the ban list resolves (by `nameKey`) to a catalog `cardKey` of the matching kind (pipeline check). A name that does not resolve is a **data error** that blocks publishing the data, not a silent skip and not fixed by an alias (see the "Dreaming Tree" naming conflict). | [[Ban List]] Conflicts; [[ADR-0005 MVP Product Defaults]] #4 |
| LEGAL-B06 | MUST | Ban data entries trace to an official announcement or the Rules Hub. Creator/community sources may be recorded in `notes` but never set dates on their own. | [[Ban List]] sources |
| LEGAL-B07 | MUST | Waves are **append-only**: corrections are new waves or a bumped `dataVersion` with a changelog line, never silent edits of past waves. When a new wave is added, this spec's version is bumped and a Handoff Board item is posted. | [[spec-writer]] standards |
| LEGAL-B08 | SHOULD | Show the ban wave name and effective date in the failure message. List **upcoming** bans/unbans as a separate `upcomingBans` notice (never a failure) only for waves with `announced <= asOf < effective`. A wave whose `announced` date is after `asOf` is not shown at all (it was not public on that date). | [[Ban List]] #5, #6 |
| LEGAL-B09 | MUST | Standard (`global`) data contains exactly the four waves below; as of 2026-11-23 it yields **15 cards and 7 battlefields**, matching the Rules Hub count. | [[Ban List]] #1–#5 |
| LEGAL-B10 | MUST | A **per-card ban status** query `banStatus(cardKey, format, region, asOf)` returns `banned` (with the wave that added it: id, name, effective date = "banned since"), `upcoming` (announced, not yet effective, LEGAL-B08 semantics), or `not-banned`, computed by LEGAL-B02/B03 from the same data. Your decks (SPEC-005) uses it for every card of a deck; Tournaments (SPEC-004) uses the earliest "banned since" date of a deck's banned cards for its "Contains cards banned since <date>" label. | [[ADR-0006 Two Imports - Collection and Decks]] (ban status on every card); [[ADR-0005 MVP Product Defaults]] #3; [[Ban List]] |

### C. Format legality (sets per format, dated)
Per [[ADR-0005 MVP Product Defaults]] #4, set legality comes from Riot data only: Riot-published dates
cited in research, otherwise the set's release status in the Riot API (SPEC-001 CARD-008). No community
or creator release dates are stored or used.

| ID | Level | Requirement | Source |
|---|---|---|---|
| LEGAL-C01 | MUST | Format legality is **data, not code**: `data/formats.json` lists, per format, its `deckRules` parameters and, per region, set entries with `legalFrom` (inclusive, **Riot-published date or `null`**), `legalUntil` (exclusive, or `null` = no rotation scheduled), `basis`, and the official `sourceUrl` + research note. It also lists `excludedSets` (codes never auto-legal until research confirms, LEGAL-C07). | [[Formats]] Conflicts (recommendation); [[ADR-0005 MVP Product Defaults]] #4 |
| LEGAL-C02 | MUST | A set S is legal in (format, region) as of D when all of (1), (2 or 3) and (4) hold: (1) S is not in `excludedSets`; (2) if S's entry has a `legalFrom` date: `legalFrom <= D`; (3) if S has no entry or `legalFrom` is `null`: S is in the catalog with `releaseStatus: 'released'`, **or** its `releaseStatus` is `null` (unknown) and its entry has `basis: 'riot-listing'` (an official Riot document lists it as legal in the format); and (4) `legalUntil` is `null` or `D < legalUntil`. If S is `preview` in the catalog and has no `legalFrom`, it is **not legal** ("not released yet"). If none of these can be decided (no entry, `releaseStatus: null`), S's status is **unknown** and LEGAL-017 returns `not_evaluated` for cards depending on it. | [[Formats]] #4 (TR 601.2.b); [[ADR-0005 MVP Product Defaults]] #4 |
| LEGAL-C03 | MUST | Standard (`global`) as of 2026-11-23 = **OGN, OGS, SFD, UNL, VEN, RAD**, all with `legalUntil: null`: RAD by its Riot-published date 2026-10-23; OGN, OGS, SFD, UNL, VEN by `basis: 'riot-listing'` (TR 601.3.c) with `legalFrom: null`. | [[Formats]] #2, #3, #4; [[Sets]] #1 |
| LEGAL-C04 | MUST | Upcoming sets with a Riot-published date are listed with that `legalFrom` (LGC 2027-01-29, PG2 2027-02-19, REC 2027-04-30); cards whose only printings are in them fail LEGAL-017 until that date, even if the API already returns them (previews). Previewed cards are therefore never legal before release. | [[Sets]] #2; [[Riot App Application]] (label previewed cards) |
| LEGAL-C05 | MUST | Rotation is **not** computed from a rule ("most recent 5–8 sets", "current + previous year"). It is set only by editing `legalUntil` from a Riot-published source once the conflict is resolved. | [[Formats]] Conflicts (`status: conflict`) |
| LEGAL-C06 | MUST | Set codes are normalized to upper case ("Ven" → `VEN`). | [[Sets]] Conflicts |
| LEGAL-C07 | MUST | Promo groupings (OPP, JDG, PR) are in `excludedSets` for every format until research confirms their legality: **BLOCKED: needs research**. Promo printings of a card that also exists in a legal set are fine (LEGAL-017 needs only one legal printing). | [[Sets]] (promo groupings, community-db) |
| LEGAL-C08 | MUST | **No community-sourced dates.** A `legalFrom` value is only allowed with an official Riot `sourceUrl` cited in a research note; the data check rejects any other. A set without a Riot-published date has `legalFrom: null`, and the UI shows no "legal since" date for it. | [[ADR-0005 MVP Product Defaults]] #4; [[Sets]] #4 (OGN–VEN dates are community) |
| LEGAL-C09 | SHOULD | The data check reports a `set-status-mismatch` warning when the catalog's `releaseStatus` contradicts `formats.json` (e.g. `preview` on or after a Riot-published `legalFrom`, or `released` before it). `legalFrom` still wins for evaluation. | design rule |

### D. Evaluation behavior
| ID | Level | Requirement | Source |
|---|---|---|---|
| LEGAL-R01 | MUST | Evaluation is a **pure function** of (deck, format, region, asOf, card catalog snapshot, ban data, format data): same inputs, same result. No network calls. | [[ADR-0001 Tech Stack]] (host-neutral services) |
| LEGAL-R02 | MUST | `asOf` is required in the API; the UI defaults it to today's date (see Open questions for the time zone). | design rule (stated-date legality needed by LEGAL-B02 and SPEC-004 "legal as of") |
| LEGAL-R03 | MUST | **All** rules run on every evaluation (no stopping at the first failure); each returns exactly one `RuleResult`. | Riot requirement to enforce rules ([[Riot App Application]]) |
| LEGAL-R04 | MUST | Verdict: `illegal` if any rule has an `error` violation; else `incomplete` if any rule is `not_evaluated`; else `legal`. Warnings never change the verdict. The UI MUST NOT show `incomplete` as legal. | design rule, so that unknown card data (SPEC-001 CARD-029) never yields a false "legal" under Riot's enforce-the-rules requirement ([[Riot App Application]]; [[Card Data & Images]] #4) |
| LEGAL-R05 | MUST | Only official formats are offered. A non-official format, if ever added, is labeled "Unofficial". | [[Riot App Application]] (don't alter official formats) |
| LEGAL-R06 | MUST | The same evaluator runs in the API and the Angular editor (shared TypeScript types per ADR-0001); the API result is authoritative. | [[ADR-0001 Tech Stack]] |
| LEGAL-R07 | MUST | Messages are plain English, name the card (canonical name) and zone, and state expected vs. actual (templates below). | design rule |

## Data contract
```ts
// ---------- Inputs ----------
type IsoDate = string;              // 'YYYY-MM-DD'
type FormatId = 'standard';         // MVP; later: '2v2', 'sealed', 'draft'
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
  notEvaluatedReason?: string;   // e.g. 'Missing domain data for: X, Y'
  source: string;                // research note title, e.g. 'Deck Construction Rules'
}

// LEGAL-B08: only waves with announced <= asOf < effective
interface UpcomingBan { cardKey: string; name: string; kind: BanKind; change: 'ban' | 'unban'; announced: IsoDate; effective: IsoDate; waveId: string }

// LEGAL-B10: per-card ban status (Your decks, Tournaments)
type BanStatus =
  | { status: 'banned'; waveId: string; waveName: string; bannedSince: IsoDate }   // effective date of the wave that added it
  | { status: 'upcoming'; waveId: string; waveName: string; announced: IsoDate; effective: IsoDate }
  | { status: 'not-banned' };

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
}

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
}
interface BanList { format: FormatId | string; region: RegionId; status: 'verified' | 'conflict'; waves: BanWave[] }
interface BanListFile { schemaVersion: 1; dataVersion: string; lastVerified: IsoDate; lists: BanList[] }

// ---------- data/formats.json ----------
interface DeckRules {
  mainDeckSize: number; mainDeckSizeMode: 'exact' | 'minimum'; // standard: 40, 'exact'
  copyLimit: number | null;      // null = no limit (Limited)
  signatureLimit: number;
  runeDeckSize: number;
  battlefieldCount: number;
  sideboardMax: number;
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
  supported: boolean;            // MVP: only 'standard' true
  deckRules: DeckRules;
  sets: Record<RegionId, SetLegality[]>;
  excludedSets: string[];        // never auto-legal (LEGAL-C07), e.g. ['OPP','JDG','PR']
}
interface FormatsFile { schemaVersion: 2; dataVersion: string; lastVerified: IsoDate; formats: FormatDef[] }
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
2v2 (not MVP) may be stored in the same file as `{ "format": "2v2", "region": "global", "status": "conflict", ... }`
with waves 2026-07-24 (Master Yi, Wuju Bladesman as `legend`, plus the Standard list at that time) and 2026-09-18
(Ekko, Recurrent; Stacked Deck). Whether the 2026-11-23 Radiance wave applies to 2v2 is a **conflict**
([[Ban List]] Conflicts): do not ship 2v2 until resolved.

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

`excludedSets` for `standard`: `["OPP", "JDG", "PR"]` (LEGAL-C07).
`deckRules` for `standard`: `{ mainDeckSize: 40, mainDeckSizeMode: 'exact', copyLimit: 3, signatureLimit: 3, runeDeckSize: 12, battlefieldCount: 3, sideboardMax: 10 }` ([[Deck Construction Rules]] #3–#9).
The community dates for OGN–VEN in [[Sets]] #4 are **not** stored (ADR-0005, LEGAL-C08). Consequence: for
those sets the app cannot say from which date they were legal; it treats them as legal for any `asOf`. This
matters only for decks dated before a set existed, which cannot contain that set's cards.

### Message templates (LEGAL-R07)
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

## Acceptance criteria
Fixtures: `KENNEN_1` = [[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]] (1st, RC Europe, 2026-11-08); `RIVEN_2` = [[2026-11 RC Europe - 2 - Sonecon - Riven]] (2nd). Both were registered and played at a sanctioned Regional Championship, so they are expected to pass every construction rule; their attribute-dependent rules (LEGAL-002/004/006/007/009/012) can only be asserted once SPEC-001 provides the card data.

1. **Given** `KENNEN_1` (Legend Kennen, Heart of the Tempest; Chosen Champion Kennen, Storm of Shuriken; 39 main; 9 Chaos Rune + 3 Order Rune; Minefield, Veiled Temple, Zaun Warrens; 10 sideboard), format `standard`, region `global`, **When** evaluated with `asOf = 2026-11-08`, **Then** LEGAL-016 passes, LEGAL-003 passes with `counts.main = 40`, LEGAL-008 passes (12), LEGAL-010 and LEGAL-011 pass, LEGAL-013 passes (10), LEGAL-005 passes (e.g. An Offer You Can't Refuse = 1 main + 1 sideboard = 2), `upcomingBans` is **empty** (the Radiance wave was announced on 2026-11-13, after `asOf`, so it is not shown; LEGAL-B08), and, given complete card data, `verdict = legal`.
2. **Given** `KENNEN_1`, **When** evaluated with `asOf = 2026-11-23`, **Then** `verdict = illegal`, LEGAL-016 fails with exactly two violations: "Nocturne, Horrifying is banned in Standard Constructed as of 2026-11-23 (Radiance ban list update, effective 2026-11-23)." and the same for Rhasa the Sunderer, each with `banWaveId = std-2026-11-23`, zone `main`. All count rules still pass.
3. **Given** `KENNEN_1`, **When** evaluated with `asOf = 2026-11-22`, **Then** LEGAL-016 passes (effective date is inclusive, the wave was announced but not effective) **and** `upcomingBans` lists Nocturne, Horrifying and Rhasa the Sunderer with `change: 'ban'`, `announced: 2026-11-13`, `effective: 2026-11-23`. The same holds for any `asOf` from 2026-11-13 to 2026-11-22; with `asOf = 2026-11-12` `upcomingBans` is empty.
4. **Given** `RIVEN_2`, **When** evaluated with `asOf = 2026-11-23`, **Then** LEGAL-016 fails with exactly five violations: Riven, Broken Blade (zone `champion`), Stellacorn Herder and Zhonya's Hourglass (zone `main`), Emperor's Dais and Star Spring (zone `battlefields`); **and with `asOf = 2026-11-08`** LEGAL-016 passes.
5. **Given** the Standard ban data, **When** the banned set is computed as of 2026-11-23, **Then** it has 15 `card` and 7 `battlefield` entries (LEGAL-B09); as of 2026-11-22 it has 7 cards and 5 battlefields; as of 2026-07-23 it has 4 cards and 3 battlefields; as of 2026-07-24 it includes Stealthy Pursuer; as of 2026-03-30 it is empty.
6. **Given** `KENNEN_1` with the sideboard changed to include **3** An Offer You Can't Refuse (main 1 + sideboard 3 = 4), **When** evaluated as of 2026-11-08, **Then** LEGAL-005 fails with "An Offer You Can't Refuse: 4 copies (main 1, champion 0, sideboard 3); the limit is 3 per name." and LEGAL-013 fails (sideboard 12).
7. **Given** `KENNEN_1` with 1 sideboard card added (11 total), **When** evaluated, **Then** LEGAL-013 fails with "The sideboard can have at most 10 cards; it has 11."
8. **Given** `KENNEN_1` with Trifarian Captain reduced from 3 to 2, **When** evaluated, **Then** LEGAL-003 fails with "…it has 39 (-1)."; **and given** a deck with `chosenChampion: null`, LEGAL-004 fails and LEGAL-003 counts only `main`.
9. **Given** `KENNEN_1` with battlefields Minefield, Minefield, Zaun Warrens, **When** evaluated, **Then** LEGAL-011 fails naming Minefield (2), and LEGAL-010 passes (3).
10. **Given** `KENNEN_1` with 8 Chaos Rune + 3 Order Rune, **When** evaluated, **Then** LEGAL-008 fails ("…it has 11.").
11. **Given** `RIVEN_2` with Chosen Champion set to Kennen, Storm of Shuriken, **When** evaluated with card data where its Champion tag differs from the Legend's, **Then** LEGAL-004 fails with the "doesn't match the Legend" reason. *(tag values BLOCKED on SPEC-001.)*
12. **Given** a deck containing a card whose only printings are in LGC, **When** evaluated with `asOf = 2026-11-23`, **Then** LEGAL-017 fails ("…not legal until 2027-01-29", `effectiveDate = 2027-01-29`), even if the catalog already returns LGC as a preview set; with `asOf = 2027-01-29` it passes.
13. **Given** `KENNEN_1` with "Lightning Rsh" in `main`, **When** evaluated, **Then** LEGAL-019 fails ("Unknown card: \"Lightning Rsh\"…"), other rules don't count it as anything, and `verdict = illegal`.
14. **Given** card data with `domains = null` for one main card and no other failures, **When** evaluated, **Then** LEGAL-002 is `not_evaluated` with that card named, and `verdict = incomplete` (not `legal`).
15. **Given** any request, **When** evaluated, **Then** `rules` has one entry for every rule ID in section A, in ID order, and the result carries the `banListDataVersion`, `formatsDataVersion` and SPEC-001 `catalogVersion` used (e.g. `0.2+2026-11-20T18:04:00Z`).
16. **Set legality without a Riot date** (LEGAL-C02, -C03, -C08) **Given** a card whose only printings are in VEN (`legalFrom: null`, `basis: riot-listing`) **When** evaluated as of 2026-11-23 with VEN `releaseStatus` `released` **or** `null` **Then** LEGAL-017 passes. **Given** a new set `XYZ` with no `formats.json` entry **When** the catalog has it as `released` **Then** its cards pass LEGAL-017; as `preview` **Then** they fail with "…are not released yet"; as `null` **Then** LEGAL-017 is `not_evaluated` and `verdict = incomplete`. **Given** an entry with a `legalFrom` whose `sourceUrl` is not an official Riot URL **When** the data check runs **Then** it fails (LEGAL-C08).
17. **Promo sets excluded** (LEGAL-C07) **Given** a card whose only printing is in `OPP` **When** evaluated **Then** LEGAL-017 fails even if the catalog marks `OPP` `released`; **given** a card with printings in `OPP` and `OGN` **Then** LEGAL-017 passes.
18. **Overnumbered** (LEGAL-018) **Given** a card with an in-range printing in `LGC` and a `variant.kind: 'overnumbered'` printing `RAD` `300` **When** evaluated as of 2026-11-23 **Then** LEGAL-018 fails for it (only legal-set printing is overnumbered) and LEGAL-017 passes. **Given** the same card with the RAD printing's `variant.kind: 'unknown'` **Then** LEGAL-018 is `not_evaluated`. **Given** a card whose printings are all in legal sets, all with `variant.kind: 'unknown'` **Then** LEGAL-018 passes.
19. **Unknown champion data** (LEGAL-004, LEGAL-R04) **Given** `RIVEN_2` with SPEC-001 data where `isChampionUnit`, `isSignature` and `championTag` are `null` **When** evaluated as of 2026-11-08 **Then** LEGAL-004 is `not_evaluated` (not `pass`, not `fail`) and `verdict = incomplete`.
20. **Per-card ban status** (LEGAL-B10) **Given** the Standard ban data **When** `banStatus` is asked as of 2026-11-23 for `cardKey` `zhonyas hourglass` **Then** it returns `banned`, `waveId = std-2026-11-23`, `bannedSince = 2026-11-23`; as of 2026-11-15 **Then** `upcoming` (announced 2026-11-13, effective 2026-11-23); as of 2026-11-10 **Then** `not-banned`; for `stealthy pursuer` as of 2026-11-23 **Then** `banned` with `bannedSince = 2026-07-24`.

## Out of scope
- **2v2 Constructed** (own ban list with a banned Legend; Radiance-wave scope in conflict), **Limited** (Sealed: ≥25 main, no copy limit, 3-domain identity; Draft: ≥20), and the **World Showcase** three-deck format. The data model supports them via `deckRules` and per-format ban lists. ([[Formats]], [[Deck Construction Rules]] #14)
- **Regional lists** (Korea, Traditional Chinese): schema supports them; content not published. ([[Ban List]] #7)
- Physical-card rules (proxies, alters, languages), OPL-level exceptions, decklist registration rules, sideboarding procedure, game rules (scoring, turns).
- Casual "at least 40" Core-Rules decks (would be a `mainDeckSizeMode: 'minimum'` format later).

## Open questions / BLOCKED
1. **Rotation (`status: conflict`).** Rules Hub: rotation starts in 2028. TR 601.3/601.3.b: "current year + previous year" (would drop OGN/OGS on 2027-01-01). Spec keeps every `legalUntil: null` and changes it only by data from a Riot source once resolved. → researcher. ([[Formats]])
2. **Card attributes in the Riot API** (type strings → `category`, `domains` via `faction`?, `isChampionUnit`, `isSignature`, `championTag`, `variant.kind` for overnumbered). LEGAL-002/004/006/007/009/012/014/015/018 depend on them; until then they return `not_evaluated`. **BLOCKED: needs research** → researcher + SPEC-001.
3. **Signature cap and the sideboard:** does the "3 Signature cards" cap span main + sideboard like copy limits? Treated as `warning` (LEGAL-006a) until confirmed. → researcher (re-read Core 103.3.d / TR 403).
4. **Canonical names**: "The Dreaming Tree" vs "Dreaming Tree"; the catalog name wins (LEGAL-B05), no alias table (ADR-0005). → researcher to confirm against the API.
5. **Time zone of effective and announced dates**: a ban "effective 2026-11-23" — local event time, PT, or UTC? Spec treats dates as calendar dates with no time; UI "today" uses the user's local date. → researcher.
6. **Set release status in the API** (SPEC-001 CARD-008): how the API marks preview/unreleased sets. Until known, sets without a Riot date rely on `basis: riot-listing` (LEGAL-C02 (3)). **BLOCKED: needs research.**
7. **Promo sets (OPP, JDG, PR) legality**: excluded until research (LEGAL-C07). **BLOCKED: needs research.**
8. **Riot-published release dates for OGN, OGS, SFD, UNL, VEN**: none cited in research (only community dates, [[Sets]] #4). Optional: researcher looks for official Riot sources; until then `legalFrom: null` (LEGAL-C08).
9. **2v2 Radiance wave scope** (`status: conflict`) — only blocks 2v2, not MVP.
10. **Battlefield domains** ("where applicable"): confirm whether any battlefields carry domains. LEGAL-012 applies the general fit rule meanwhile.

## Changelog
- 0.2 (2026-11-23): H-015, H-018, H-026 (ADR-0005/0006). `LegalityCardView` aligned to SPEC-001 (`cardKey`, `category`, nullable `domains`/`isChampionUnit`/`isSignature`/`championTag`, overnumbered via `variant.kind`; `catalogVersion` = SPEC-001 CARD-068); LEGAL-001/004/005/008/010/011/014/015/016/017/018/019 restated on `category`/`cardKey`. Set legality per ADR-0005: `formats.json` schema 2 (`legalFrom` Riot-published or `null`, `basis`, `sourceUrl`, `excludedSets`; `sourceTier` and community dates removed), LEGAL-C01–C05/C07 rewritten, new LEGAL-C08 (no community dates) and LEGAL-C09 (status mismatch warning). LEGAL-C04 is now MUST in wording too. LEGAL-B08: upcoming bans only from the announced date (AC1 fixed: empty as of 2026-11-08; AC3 extended). New LEGAL-B10 per-card ban status for Your decks and Tournaments. Source links on LEGAL-019/R02/R04/R07 (design rules). Consumers updated per ADR-0006 (Your decks shows ban status per card; no legality filtering of decks). New AC16–20.
- 0.1 (2026-11-23): draft. 19 construction rules (LEGAL-001…019, plus LEGAL-006a warning), ban-list data rules (B01–B09) with all four Standard waves through the Radiance update (effective 2026-11-23), format-legality data rules (C01–C07), evaluation rules (R01–R07), result contract, 15 acceptance criteria using the RC Europe Top 8 lists.
