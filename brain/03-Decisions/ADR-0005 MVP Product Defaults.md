---
tags: [adr, product]
status: accepted
date: 2026-11-23
---
# ADR-0005: MVP Product Defaults

## Decisions (RJ, 2026-11-23)
1. **Collection storage:** browser only (local storage), with no accounts and no server-side user data for the MVP. → [[Collection Import]] IMP-053 confirmed. *(Superseded 2026-11-24 by [[ADR-0007 Firebase Accounts and Firestore]] amendment 2: all user data lives in the account; the browser is only a cache.)*
2. **Variants:** all printings and variants of a card (foil, alt-art, overnumbered, signature printings) count as the **same card** for collections and matching, keyed by card name. → [[Card Data Model]] and [[Collection Import]] IMP-048 confirmed.
3. **Decks with now-banned cards** are **shown by default** in "Your decks", with a clear label ("Contains cards banned since <date>"). No hide-by-default toggle. → changes [[Tournament Deck Catalog]] CAT-042/043.
4. **Riot data only:** no hand-curated tables beside Riot's data. That means **no name-alias table and no hand-made set release-date table.**
   - Typos are handled by fuzzy suggestions in import (SPEC-003), never by curated aliases.
   - A set's legality comes from Riot's data. A set counts as legal once it appears in the Riot API as released (not marked preview). Exact legal dates come only from Riot-published sources cited in research.
   - **Interpretation, open for RJ to correct:** the ban list and tournament decklists are still stored as data, because they *are* Riot-published (official ban announcements and Riot's Top 8 articles) and the product needs them. Each entry cites its Riot source. This is not a curated alias or date table.

## Consequences
- SPEC-001: remove the curated alias table (SHOULD) and any curated release-date table.
- SPEC-002: `formats.json` set legality comes from the API's released sets plus Riot-published dates only. No community-sourced release dates.
- SPEC-004: CAT-042/043 become "shown by default with a label". The empty-state toggle is no longer needed.
