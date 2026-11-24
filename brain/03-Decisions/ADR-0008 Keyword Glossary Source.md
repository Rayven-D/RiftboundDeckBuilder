---
tags: [adr]
status: proposed
date: 2026-11-24
updated: 2026-11-24
---
# ADR-0008: Keyword Glossary Source

## Context
The Collection card dialog should explain each keyword on a card ([[Collection]] §5.5, H-090,
[[Keyword Explanations]] SPEC-011). Keyword definitions are game facts. These rules apply:
- [[ADR-0005 MVP Product Defaults]] #4: **Riot data only**, with no hand-curated tables beside Riot's data (named:
  no alias table, no release-date table). Its interpretation note allows Riot-*published* data stored with a
  citation (ban waves, Top 8 decklists) "because they are Riot-published … not a curated alias or date table".
- CLAUDE.md: every game fact needs a source and an as-of date.

### What research found (H-089, [[Card Keywords]], as of 2026-11-24)
- **The API names keywords but does not define them.** The documented card schema has `keywords: List[string]`,
  `description` and `tags`. There is **no** definition, reminder or glossary field and **no** rules or rulesets
  endpoint (A1). Riot's docs list "rulesets" among API assets, and the policy says apps "must implement all
  applicable rules for Riftbound found within the Riot API", but no such resource is documented (A2). The live
  payload (H-020) may still show something.
- **Reminder text is not a glossary.** It sits in the card text, differs per card, has no game function (Core
  Rules 135.2.d.3) and is missing from many printings (B1, B5). SPEC-011 KW-004 never uses it as a definition.
  The card text, reminder text included, is already shown as Riot's card text wherever the app shows a card.
- **Official definitions exist only in the Core Rules** (rules 805-832, 28 keywords, rev. 2026-10-09, in effect
  2026-10-16). None of the 28 definitions in our research has been checked against the official PDF yet (F).
- **Policy (E1-E3).** Riot's Riftbound app policy, verbatim: "Your App may only use Riftbound assets (including
  cards) provided by the Riot API." and "No external or unofficial materials." The general fan policy sends any app
  using Riot IP to the API policy (E2). **No Riot statement allows or forbids quoting Core Rules text in an app**,
  and none says whether the Core Rules PDF is a "Riftbound asset" (E3). Read strictly, rules text that does not
  come through the API is an "external material", so options B and C are **not clearly allowed**. That reading is
  ours, not Riot's.

## Options
**A. Riot API data only.** Definitions come only from a structured API field or a rules resource. Card text and
reminder text are not mined (SPEC-011 KW-004, KW-031). With the API as documented today, there are no definitions,
so the Keywords section is hidden on every card (KW-056).
- + Clearly within Riot's policy and ADR-0005 #4. No upkeep. Nothing to take down later.
- − No feature today. It appears only if the live API (H-020) or a later API version carries definitions.

**B. Sourced glossary file.** A file in `data/` holds one `KeywordEntry` per keyword: Riot's verbatim Core Rules
text, rule number, URL and as-of date, copied from a verified research note. Research refreshes it with each set and
errata, like ban waves. Matching uses the file.
- + Works whatever the API carries.
- − Not clearly allowed under the policy (E1, E3). Needs ADR-0005 #4 extended. Upkeep per set. Matching against the
  file goes beyond Riot's card data. **Dominated by C**: SPEC-011 already takes keywords only from the API.

**C. Hybrid.** **Which** keywords a card has always comes from the API `keywords[]` field. **Definitions** come from
the API when it has them, otherwise from the cited glossary file of option B (Riot's Core Rules text only, each entry
`verified` against the official PDF). The file never adds a keyword to a card.
- + Delivers the feature. Card data stays Riot-only. A missing entry hides one keyword (KW-052) and is reported.
- − Same policy doubt as B: it shows Riot text that the API did not provide. Showing it before Riot answers could
  hurt the production key application (H-011). Needs ADR-0005 #4 extended. Research must first verify the 28
  definitions against the PDF. Upkeep per Core Rules revision (SPEC-011 KW-060).

## Decision
**Proposed, not accepted. RJ decides.**

**Recommendation (revised after H-089): accept A now, and ask Riot.**
1. Accept **A** now. SPEC-011's keyword engine and the hidden section can be built and tested on fixtures; the
   section stays hidden because the glossary is empty.
2. Add a question to the App Note for the production key ([[Riot App Application]], H-011), for example: *"May an
   approved app show the keyword definitions from the Riftbound Core Rules (verbatim, cited with rule number and
   date) next to a card, or must rules text come only from the Riot API? Is there, or will there be, a ruleset
   resource in the API?"*
3. If Riot says yes, RJ revisits this ADR and moves to **C** (and extends ADR-0005 #4). If the live payload (H-020)
   or a new API version carries definitions, A turns the feature on with no new decision.

Why not C now: the policy line is explicit about "external or unofficial materials", the gain (definitions in a
dialog that already shows Riot's card text, reminder text included where printed) is small, and the risk lands on
the production key that the whole app needs.

### What RJ must decide
1. **Source of definitions.** Pick one:
   - **(a) Accept A now** (recommended). Feature hidden until the API has definitions or Riot allows rules text.
   - **(b) Accept C now**, pending Riot's answer. Research verifies the 28 definitions against the PDF, builder adds
     the glossary file; RJ accepts the policy risk and agrees to remove it if Riot says no.
   - **(c) Keep this ADR open** until Riot answers. Same app behaviour as (a), but SPEC-011's blocked rows stay open.
2. **Ask Riot?** Yes or no to adding the question above to the H-011 App Note.
3. **Only if (b):** extend ADR-0005 #4's interpretation to a cited glossary of Riot's Core Rules text (like ban waves).
4. **Separate, SPEC-011 RJ-1:** keep "hide a keyword with no definition" (spec default) or show a "No definition yet"
   chip.

## Consequences
- **If A:** SPEC-011 KW-003 reads "option A"; KW-011b, KW-015 and KW-060…062 are parked. builder may build the engine
  (KW-030…037) and the hidden section (KW-050…056) on fixtures, with no glossary file. The KW-035 build report still
  lists the keywords the live data uses.
- **If C:** ADR-0005 #4 gets a note. researcher verifies each definition against the official Core Rules PDF
  (SPEC-011 KW-013); SPEC-011 KW-011b settles the definition form and symbol-token display; builder gets an item for
  `data/keywords.json` and its loader; `/research-refresh` re-checks entries per Core Rules revision (KW-060).
- **Either way:** a card's keywords never come from a project-made list or from card text (SPEC-011 KW-030, KW-031),
  and definitions never come from reminder text (KW-004).
