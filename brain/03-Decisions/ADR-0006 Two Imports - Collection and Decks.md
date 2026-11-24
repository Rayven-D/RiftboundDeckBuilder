---
tags: [adr, product]
status: accepted
date: 2026-11-23
supersedes_part_of: "[[ADR-0003 Tournament Results Only]] (the Your decks part), [[ADR-0005 MVP Product Defaults]] (decision 3)"
---
# ADR-0006: Two Imports, Collection and Decks

## Context
Earlier notes treated "Your decks" as tournament decks matched against the collection. That was
wrong. RJ clarified the product model on 2026-11-23.

## Decision (RJ)
### Two kinds of import
1. **Owned-card import:** card lists the user scanned or kept in another app, brought in here.
   These go into **My collection**. ([[Collection Import]])
2. **Deck import:** complete deck builds made by the community (forums, deck sites) that the user
   doesn't necessarily own. These go into **Your decks**. ([[Deck Import]])

### Your decks
- Shows the decks the user imported. **Tournament Top 8 decks are not part of this screen.**
- Every card in the deck is shown with all its information, **including ban status**, whether
  or not the user owns it.
- Ownership is shown visually on each card:
  - Owned in full (owned ≥ required): the card in **full colour**.
  - Not owned at all: the card **darkened/faded but still readable**.
  - Partly owned (owned < required): that **fraction of the card is in colour** and the rest is
    darkened. 1 of 3 → ⅓ in colour, 1 of 2 → ½, 2 of 3 → ⅔.
- Ownership is matched by card name across all printings and variants (ADR-0005), against My collection.

### My collection
- A full list of the cards the user owns.
- Users can add **their own tags** (any text) to cards.
- Sort, order and filter by name, **any card attribute**, or user tag.
- **Default order (no sort or filter):** by set (set order), then by collector number within the
  set, with **overnumbered** cards included in their numeric position after the regular numbers.

### Tournaments
- Stays its own screen: recent events with their full Top 8 and placing labels (ADR-0003).
  Its decks are not shown in Your decks unless the user adds one with "Add to Your decks".

## Consequences
- SPEC-003 Collection Import covers owned cards only. New **SPEC-006 Deck Import**.
- SPEC-005 is now **Your Decks: Ownership View** (per-card owned/required, partial colouring, ban
  status), replacing "Build Matching".
- New **SPEC-007 My Collection** (tags, sort, filter, default order).
- SPEC-004 CAT-042/043 ("Decks I can build" behaviour) no longer apply. ADR-0005 decision 3 now
  applies to the Tournaments screen only (banned decks shown with a label).
- User decks and tags are stored in the browser, like the collection (ADR-0005).

## Follow-up decisions (RJ, 2026-11-23)
- **Partial fill runs left to right:** owning 1 of 3 colours the left third of the card, and the
  rest stays darkened.
- **One-click "Add to Your decks"** on every Top 8 deck in Tournaments. It copies the list into Your
  decks as if imported, with the event and placing recorded as its source.

## Gate H-036 decisions (RJ, 2026-11-23)
1. **"Add to Your decks" default name:** Legend + pilot + placing, e.g. `Kennen: ASC Evansrhim (1st, Regional Championship: Europe)`.
2. **Already added:** the button reads **"In Your decks"** and opens the existing copy. A separate **"Add another copy"** link adds a second copy named `… (2)`.
3. **My Collection treats every printing type separately.** Regular, foil, alt-art, overnumbered, and signature printings are each their own entry. When the user owns several copies of a printing, the entry shows a **count badge**. Default order is still set → collector number (`printingSortKey`).
4. **Tags attach to printings**, not to card names. A tag on the foil doesn't apply to the regular copy.
5. **Your decks groups by card name** regardless of printing (ownership by `cardKey`). Each card can **expand to show the exact printings** the user owns that count toward it.
6. **Tags can be excluded from decks.** The user marks a tag as "exclude from decks" (e.g. a $500 collector card tagged `Collector`). Printings carrying an excluded tag still appear in My Collection, but **don't count toward ownership in Your decks** (the deck view can show them as "owned but excluded").
7. Defaults chosen by Claude (RJ may change them): dates shown as `Nov 23, 2026`; an `incomplete` legality result is labelled **"Not fully checked"**.

Note: RJ's row-layout answer said "per card name + expand", but his detailed answer applied that to Your decks and per printing to My Collection. Recorded as above. Ownership rule for SPEC-005: owned(cardKey) = Σ copies of that card's printings that carry no excluded tag.

## Your decks view decisions (RJ, 2026-11-23, SPEC-005 review)
- Card tiles show the **default printing** art, regardless of which printings the user owns.
- Owned copies are allocated **main deck first**; the sideboard shows what remains.
- Deck sections follow **Riot's decklist order**: Legend, Chosen Champion, Main Deck, Battlefields, Runes, Sideboard (the same order as pasted exports).
- Cards the user doesn't own are shown **grayscale and dimmed** (~55% brightness). Text drawn by the app stays readable.
- Default chosen by Claude: a card no longer in the card data counts as 0 owned, with a placeholder tile.

## Screen rename (RJ, 2026-11-23, H-044)
- The screens are renamed: **"Your decks" → "Decks"** and **"My collection" → "Collection"** (nav, page titles, screen names, back links). The decisions above keep their original wording; read "Your decks" as the Decks screen and "My collection" as the Collection screen. Section headings here are unchanged, because specs cite them (e.g. "Your decks view decisions").
- **Button and status copy stays sentence-style** with lower-case "your decks": "Add to your decks", "In your decks", "Added to your decks", "Not counted in your decks", "… will no longer count in your decks". "Add another copy" is unchanged. Where text names the screen itself, it says "Decks" or "Collection".
- Note names stay as they are so links keep working: [[Your Decks Ownership View]] (SPEC-005) and [[My Collection]] (SPEC-007).

## Shared cards, lock in and runes (RJ, 2026-11-23, H-058)
- **Shared cards:** every deck shows when a card is also used by other decks, which decks, and how many each needs.
- **Lock in:** when a deck is complete the user can lock it. Its cards don't count toward other decks until it is unlocked or deleted. Example: 3 Hextech Ray owned, two decks need 3, deck 1 locked → deck 2 shows 0 of 3 available (with 4 owned, 1 of 3). Clicking the card shows which decks locked it and how many each holds.
- **Scope:** every physical section counts: Legend, Chosen Champion, Main Deck, Sideboard and Battlefields, one pool per card name across all printings ([[Physical Copies Across Decks]]). Unlocked decks don't reserve copies from each other.
- ~~**Runes are ignored:** the user is assumed to have the runes. They never count as missing, never block completion or lock in, and are not needed in the Collection.~~ **Reversed by RJ on 2026-11-24**, see "Runes are cards" below.
- Defaults chosen by Claude in [[Shared Cards and Lock-in]], **accepted by RJ 2026-11-23**: when locked decks together need more than the user owns, the **earliest lock is served first**; a lock never gives copies to an unlocked deck; a locked deck that falls short **stays locked and is flagged short**; a locked deck's cards can't be edited until it is unlocked; Undo after a delete restores the deck **unlocked**. No force lock: a deck short only because of copies locked elsewhere can't be locked (RJ, 2026-11-23).

## Runes are cards (RJ, 2026-11-24, H-097)
- RJ: **"Let's change the rune specifications. Allow users to import runes as well and treat them like any other card."**
- Runes are imported with Owned Cards Import and Deck Import, counted in the Collection and in deck ownership (full / partial / missing), shared across decks and held by locked decks, shown in Collection like any card, and included in the CSV export. This replaces "Runes are ignored" above.
- [[Runes Assumed Owned]] (SPEC-009) is withdrawn. The rules now live in SPEC-003 IMP-071, SPEC-005 OWN-028/029, SPEC-007 COLL-089 and SPEC-008 SHARE-006. Legality (SPEC-002) is unchanged.
- No data migration and no one-time notice; runes the user hasn't imported show as missing. RJ confirmed **"No notice"** on 2026-11-24 (SPEC-005 OWN-029, open question 7 resolved).

