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

## Header and import entry points (RJ, 2026-11-24, H-174)
**Status: accepted** (RJ, in chat). RJ: "let's also replace the Import button in the header with the account. Users will be able to create a username when making their account. That name will pop up in the top right. They can see their account settings there (delete/theme and others if we get to it) and to sign out. Import will be broken up to the two different types. For importing collection - we will rebrand it to "Add to you collection" with a FAB bottom right. For decks, we'll keep "Import Desk". No need for a full /import screen anymore, just their respective dialogs popping up on the respective screens" ("you" = "your", "Desk" = "deck"). RJ's follow-up answers the same day:
usernames are display names, not unique; editable in settings; theme is per device, default system; remove
`/import` with no redirect.

- **Header:** the **Import** button is replaced by the **account**. Signed in, the top right shows the user's
  **username**; it opens the account menu with account settings (Delete account and data, Theme, more later) and
  Sign out. Signed out, that spot offers sign-in / create account.
- **Username:** chosen when the account is created. It is a **display name, not unique** (duplicates allowed; it is
  shown only to its owner today). It can be **changed later in account settings**. Stored with the account.
- **Theme:** ~~light / dark / system~~ **light / dark only** (amended 2026-11-25, see *Amendment: theme and phone account* below),
  remembered **per device** (browser storage). With nothing saved on the device, the app follows the **system theme**
  behind the scenes. It is not stored in the account.
- **Collection import** is renamed **"Add to your collection"** and opens from a **floating action button (FAB) at
  the bottom right of the Collection page**, in a dialog.
- **Deck import** keeps the name **"Import deck"** and opens from the Decks page, in a dialog.
- **The `/import` page is removed**, route included: old links show the not-found page (no redirect, RJ).
  Each import dialog opens on its own screen; a finished collection import stays on Collection, a deck import on Decks.

**Consequences**
- The two imports stay two imports (this ADR); only where they open changes. "Owned Cards Import" is now labelled
  "Add to your collection" in the UI.
- The phone bottom tab bar loses its Import tab (Decks, Collection, Tournaments remain); the account moves to the top
  right on phones too. [[Design Direction]] / the fluid pass (H-085) need the new header (H-175).
- Specs to update (H-174): [[Accounts and Sync]] (username, account menu contents, theme per device),
  [[Collection Import]] (entry point, label, landing), [[Deck Import]] (entry point, landing), [[My Collection]]
  (FAB), [[Your Decks Ownership View]] (Import deck on Decks), and every spec or brief that mentions `/import`.
- Works with [[ADR-0007 Firebase Accounts and Firestore]] amendment 2 (account-only): both import entry points need a
  signed-in user.

### Follow-up (RJ, 2026-11-24, gate H-178 on [[Brief H-175]])
- Account settings live **in the header menu**, not on a page: **Account Information** (a dialog: change username,
  delete account and data), ~~**Theme**~~ (moved to a header toggle, 2026-11-25), **Sign out**.
- **"Import deck" is a floating button on Decks**, behaving exactly like "Add to your collection" on Collection.
- Both buttons collapse to an icon on phones while scrolling down and are hidden on empty pages (which have their own
  button).
- Username: 1–24 characters, any script, not unique, the prompt after the first sign-in can be skipped.
- ~~Theme can also be changed signed out, from a footer switch; it stays per device.~~ Superseded 2026-11-25: a header toggle, see below.
- `/import` (like any unknown path) goes to Home; there is no not-found page.

### Amendment: theme and phone account (RJ, 2026-11-25)
**Status: accepted** (RJ, in chat). RJ: "we'll only do light/dark and the system will be used behind the scenes until the user specifically chooses a theme". Earlier the same day: "move the theme to a light/dark switch next to the sign in/account area. No more \"system\". use only system if cached theme is not available", and on phones "move the signin/account to the bottom right next to tournaments", with the theme switch "in the top right where account used to be".
- **Theme is light / dark only.** There is no System option. Until the user picks a theme, the app follows the OS theme behind the scenes; once they pick, the choice is stored per device and wins.
- **Where:** a light/dark toggle in the header next to sign-in / account. It is no longer in the account menu or the footer.
- **Phones:** the account moves to a 4th bottom tab after Tournaments; the theme toggle takes the header's top-right corner.
- Specified in [[Accounts and Sync]] 0.17.1 (decision 22, SYNC-150 g, SYNC-151, SYNC-157, SYNC-158) and [[Brief H-245 H-246 H-247]]; built in H-246.
