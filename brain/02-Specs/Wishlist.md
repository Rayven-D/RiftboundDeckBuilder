---
tags: [spec]
id: SPEC-016
version: 0.1
status: draft
depends_on: [SPEC-001, SPEC-002, SPEC-003, SPEC-005, SPEC-007, SPEC-010, SPEC-013, SPEC-014, SPEC-015]
research: ["[[Firestore Data Shape]]", "[[Card Data & Images]]"]
decisions: ["[[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]]", "[[ADR-0003 Tournament Results Only]]", "[[ADR-0007 Firebase Accounts and Firestore]]"]
ui: ["[[Direction H-708 Wishlist]]", "[[Brief H-698 Card Dialog Mobile]]"]
board: H-705, H-708, H-709
as_of: 2026-11-28
---
# SPEC-016: Wishlist

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** a **Wishlist** tab listing the cards the user is looking for, each with a wanted count, in **full colour**. Entries are **per printing** (the card's default printing unless the user picks a variant). Deck detail adds a deck's missing cards in **one click**, and the counts **sum across decks**. A **"Needed for"** chip names the decks that still miss the card and stays live. The list **counts down by itself** when the user gets the card. (RJ 2026-11-28, chat, ADR-0010 §4 and "RJ answers" parts 1 and 2.)

**Key rules (RJ unless marked *default, proposed*)**
- WISH-001…007: its own tab `/wishlist`. Desktop tabs: Decks · Collection · **Wishlist** · Tournaments. **Phone bar, five tabs:** Decks · Collection · Wishlist · **Events** · Account ("Events" is Tournaments' phone label only). Icon `bookmark`. Behind the same sign-in gate as Collection (*default, proposed*). Full-colour tiles with the name and "Want 2", for any card and any amount.
- WISH-010…016: an entry = `cardKey` + `printingId` (default printing) + **Any printing** or a **picked printing** + `want` 1…99. Entries added from a deck accept any printing. A picked variant counts only that printing (RJ). Add cards also starts as Any printing (*default, proposed*). Each card has at most one Any entry and one entry per picked printing. Limits are 99 copies and 2,000 entries (*default, proposed*).
- WISH-020…022: page search = SPEC-014 Wishlist host. **Add cards** searches the **whole catalog** in full colour, and each result's **Add** adds 1.
- WISH-030…034: card details are the H-698 **bottom sheet on phones**, the centred dialog on tablets (*default, proposed*) and a **sticky sidebar on desktop**, Wishlist only for now (RJ). All three show one shared content.
- WISH-040…043: Want stepper, Printing select, **Remove from wishlist** with Undo (*default, proposed*). **Only the user, "Add missing" and the automatic update change a count. Later deck edits never do** (RJ).
- WISH-050…056: **Add missing to wishlist** on Deck detail (SPEC-005 OWN-152), one click (RJ). It adds each card's shortfall, the missing copies that free copies can't cover (*default, proposed*). It adds **per deck, never twice**, so Jinx 2 + Kennen 2 = Want 4 (sum: RJ; per-deck rule: *default, proposed*).
- WISH-060…063: **"Needed for `<deck>`"** / "Needed for 2 decks" chip and a details list "`<deck>` · needs 2". Both are live, computed from the decks' current missing counts (RJ).
- WISH-070…077: **automatic update**. A collection import that adds copies counts matching entries down ("Want 2"), and an entry at 0 leaves. **Deck-linked entries count only free copies** (RJ). Which changes count as arrivals, re-keyed printings, the matching order, one sentence in the import notice ("3 cards left your wishlist: you have them now.") and Undo are *default, proposed*.
- WISH-080…085: states (empty, no match, card data, unreadable, ban data, accessibility).
- WISH-090…095: `StoredWishlist` in a new cloud document `state/wishlist`, merged per entry. One write per action. Size ≈ 440 KB at the cap (`unverified` estimate). The final Firestore mapping belongs to SPEC-010.

**Shared types:** `WishlistEntryId`, `WishlistEntry`, `StoredWishlist`, `WishlistInput`, `WishlistView`, `WishlistEntryView`, `NeededFor`, `AddMissingResult`, `ArrivalResult`. Pure functions: `computeWishlistView()`, `addMissing()`, `applyArrivals()`, `mergeWishlist()`.
**Depends on:** SPEC-001 v0.4.2 (`defaultPrintingId`, `printingSortKey`), SPEC-002 v0.8 (`banStatus`), SPEC-003 v0.19 (import commit and Undo), SPEC-005 v0.24 (OWN-152), SPEC-007 v0.20 (printing label, card-data states), SPEC-010 v0.21.1 (gate, sync; changes listed for H-714), SPEC-013 v0.2, SPEC-014 v0.3 (Wishlist host, SEARCH-062), SPEC-015 v0.1.1 (`free`, `missing`, `CardPlaces`).
**Open:** every *default, proposed* item is listed in Open questions for RJ. Nothing is BLOCKED on research: this spec states no game rule. The only `unverified` items are the size estimates (WISH-093), and the variant labels wait on H-020 (CARD-040).

## Purpose
RJ wants one place for "what do I still need to buy or trade for?" (ADR-0010 §4). Physical copies (SPEC-015) make "missing" exact per deck: two decks that each miss 2 Ion Arc need 4 more. The wishlist takes those numbers from Deck detail in one click, lets the user add any other card and pick the printing they want, and shrinks by itself as cards arrive. This spec owns the wishlist's entries, page, card details, the Add missing rule, the "Needed for" display, the automatic update and the wishlist record. SPEC-005 owns the Deck detail button (OWN-152). SPEC-014 owns the search mechanics, SPEC-015 the place model it reads, SPEC-003 the import that triggers the update, and SPEC-010 the cloud document.

## Definitions
- **cardKey**, **printingId**, **defaultPrintingId**, **printingSortKey**: SPEC-001 (CARD-012, CARD-016, CARD-070).
- **Printing label**: SPEC-007 COLL-101 (e), the printing code plus the variant label when the variant is not base or unknown (e.g. "OGN-012a Showcase"). Until H-020 every variant is `unknown` (CARD-040), so the label is the code alone.
- **Entry**: one `WishlistEntry` (WISH-010).
- **Any entry**: an entry with `anyPrinting: true`. Any printing of the card counts for it. Its `printingId` is only what it shows, and it is the default printing.
- **Specific entry**: an entry with `anyPrinting: false`. Only copies of its `printingId` count for it.
- **want(e)**: the entry's wanted count, an integer 1…99.
- **fromDecks(e)**: copies added to the entry by Add missing, per deck (WISH-016). **Deck part** = Σ fromDecks(e). **User part** = want(e) − deck part.
- **Deck-linked entry**: an entry whose deck part is ≥ 1.
- **missing(D, k)**, **free(k)**, **owned(k)**, **owned(k, c)**, **excluded copy**: SPEC-015 Definitions. missing = need − held. free = non-excluded copies in Not in a folder and in folders used for decks.
- **Shortfall** s(D, k) = max(0, missing(D, k) − free(k)) (WISH-051).
- **Arrival**: copies that enter the collection through an import commit (WISH-070, WISH-071).
- **Decks list order**: SPEC-005 OWN-005.
- **Phone** = 40rem and below. **Desktop panel width** = 64rem and wider (SPEC-010 0.17.1, SPEC-005 OWN-111).

## Requirements
Source key: *RJ* = RJ 2026-11-28, chat, recorded in [[ADR-0010 Deck Building, Physical Copies, Folders and Wishlist]] §4 and "RJ answers" part 1 item 3 (five tabs), part 1 item 5 (which printings count) and part 2 item 8 (count goes down, counts don't follow deck edits, free copies only, sidebar Wishlist-only, `bookmark`). *Direction* = [[Direction H-708 Wishlist]] (ui-engineer draft; its strings are proposals). ***default, proposed*** = the spec-writer's choice where RJ has not decided, listed in Open questions.

### A. Tab and page
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-001 | MUST | **Its own tab, route `/wishlist`.** Desktop (above 40rem) top tabs, in order: **Decks · Collection · Wishlist · Tournaments**. Phone bottom bar, **five tabs** in five equal cells (`repeat(5, minmax(0, 1fr))`), in order: **Decks · Collection · Wishlist · Events · Account**. "**Events**" is the Tournaments tab's label **in the phone bar only**. It keeps the trophy icon and opens `/tournaments`, and the page title and the desktop tab stay "Tournaments". The Account tab keeps SYNC-150 (g): "Sign in" with the person icon when signed out, the letter avatar alone when signed in, last in the bar. | *RJ* (ADR-0010 §4.1; answers part 1 item 3: H-708 Q1, option A) |
| WISH-002 | MUST | **Icon `bookmark`** on both tab bars. It is outlined, and filled when the tab is active, the same active treatment as the other tabs. | *RJ* (answers part 2 item 8: H-708 Q7); outlined/filled *Direction* §2.1 |
| WISH-003 | MUST | **Sign-in gate.** The Wishlist page sits behind the SPEC-010 SYNC-009 gate like Collection and Decks. While the gate is closed, the page header is followed by the shared sign-in panel (the same panel and wording as Collection). Signed-out guest test data (SYNC-009 exception, SPEC-013 section G) has **no wishlist**: the panel shows. No Firestore read or write happens while signed out (SYNC-125). | *default, proposed* (same gate as Decks and Collection) |
| WISH-004 | MUST | **Page layout** (*Direction* §3). In order: (a) the title row: heading "Wishlist" and an **Add cards** button (outlined, `add` icon; on phones icon-only with accessible name "Add cards"). There is no floating button. (b) The count line "`<c>` cards · `<n>` copies wanted", where c = distinct `cardKey`s over the entries and n = Σ want ("1 card · 1 copy wanted"). It is hidden when the list is empty. (c) The SPEC-014 search bar for the Wishlist host (WISH-020) with the sort (WISH-006). (d) The grid of tiles (WISH-005). (e) From 64rem, the sidebar (WISH-032) to the right of the grid. | *Direction* §3; count-line definition *default, proposed* |
| WISH-005 | MUST | **Tiles: full colour, name and count, for any card.** Each tile shows: the art of the entry's `printingId` (`art.thumbnailUrl`, 63:88, lazy, alt = card name; a missing URL shows the COLL-006 text placeholder), **always in full colour** (never the Deck detail ownership fill or darkening, OWN-030); the card name (2 lines at most, then an ellipsis); the line "Want `<n>`" (also at 1: "Want 1"), followed by " · `<printing label>`" for a **specific** entry; and the "Needed for" chip (WISH-060). The whole tile is **one button**. Accessible name: "`<card name>`, `<printing label>` or 'any printing', want `<n>`" + ", needed for `<deck name>`" or ", needed for `<m>` decks" + ", banned" when the Standard `banStatus` is `banned` (WISH-033 (a)). There is no ban text on the tile face (as Collection, COLL-102 (d)). Grid: columns at least 9rem (4 columns beside the sidebar at 1440, 3 at 1024, 4 at 768, 2 on phones). | *RJ* (ADR-0010 §4.1: "full-colour images, card names and the number of copies"; coordinator brief: "for any card and any amount"); layout *Direction* §3 |
| WISH-006 | MUST | **Sort** (a select, in the URL as `?sort=`): **Recently added** (default; `createdAt` descending, then `id`), **Name** (SPEC-007 COLL-034 name comparison, then `printingSortKey`), **Set & number** (`printingSortKey` of the entry's `printingId`, then Any before specific), **Deck** (entries with a "Needed for" deck first, ordered by the first such deck's name A–Z, then by card name; entries with none last, by card name). An unknown `sort` value falls back to Recently added. | *Direction* §3; ordering details *default, proposed* |
| WISH-007 | MUST NOT | The Wishlist shows no prices, shop or marketplace links, trade suggestions, or meta or community data (play rate, popularity, tiers, "most wanted"). | [[ADR-0003 Tournament Results Only]]; SPEC-005 Out of scope |

### B. Entries
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-010 | MUST | **What an entry is.** One wanted card printing with a count: `cardKey`, `printingId` (a printing of that card), `anyPrinting`, `want` (integer 1…99), `fromDecks`, `createdAt`, `updatedAt`, `id` (Data contract). It can be **any card** in the catalog, owned or not, of any category, tokens included. A SAMPLE printing is never offered or stored (SPEC-001 CARD-044; no effect until the marker exists, H-020). | *RJ* (ADR-0010 §4.2: "Any card, any amount") |
| WISH-011 | MUST | **Default printing.** A new entry's `printingId` is the card's `defaultPrintingId` (CARD-016). | *RJ* (ADR-0010 §4.2: "An entry is the card's default printing by default") |
| WISH-012 | MUST | **Picking a variant.** The card details' **Printing** select lists **Any printing** first, then every printing of the card in `printingSortKey` order, each labelled with its printing label. Choosing a printing makes the entry **specific** (`anyPrinting: false`, `printingId` = that printing), and from then on **only that printing counts** (WISH-072). Choosing **Any printing** makes it an Any entry again and sets `printingId` back to `defaultPrintingId`. The tile art follows `printingId`. A change sets `updatedAt` and leaves `want` and `fromDecks` unchanged, except for a merge (WISH-014). | *RJ* (ADR-0010 §4.2: "the user can pick the variant they want"; answers part 1 item 5: "an entry where the user picked a variant counts only that printing") |
| WISH-013 | MUST | **Which entries accept any printing.** Entries created or raised by **Add missing** (WISH-050) accept any printing. **Add cards** (WISH-021) also creates or raises the card's **Any** entry (*default, proposed*: the user has not picked a variant yet, and picking one is WISH-012). | *RJ* (answers part 1 item 5: "entries added from a deck accept any printing"); Add cards *default, proposed* |
| WISH-014 | MUST | **One entry per card and printing choice.** Each `cardKey` has at most **one Any entry** and at most **one specific entry per `printingId`**. So a card can show "Want 2" (any) next to "Want 1 · OGN-012a Showcase". When a Printing change (WISH-012) would make a second entry of the same choice, the two **merge** into the older one (`createdAt`, then `id`): `want` = the sum, capped at 99; `fromDecks` summed per deck, then capped by WISH-043. The info notice "Combined with your other `<printing label or 'Any printing'>` entry." shows, and the details stay open on the merged entry. | *default, proposed* |
| WISH-015 | MUST | **Limits.** `want` is 1…99, and an account has at most **2,000 entries**. At 99 the + control and Add are `aria-disabled` with "You can want up to 99 copies.". At 2,000 entries an Add that would create an entry is `aria-disabled` with "Your wishlist is full (2,000 cards).", while raising an existing entry still works. Add missing then raises existing entries only, and its notice adds " `<x>` cards didn't fit: your wishlist is full." | *default, proposed* (keeps the document under SYNC-123's warning level, WISH-093) |
| WISH-016 | MUST | **Deck contributions.** `fromDecks` maps a `deckId` to the copies Add missing added to this entry for that deck (WISH-052). It never exceeds `want` in total (WISH-043). It decides only two things: whether the entry is **deck-linked** (WISH-072) and what Add missing adds again (WISH-052). It is **never shown**; the "Needed for" display is computed live (WISH-060). | *default, proposed* (needed for RJ's "sum across decks" without adding twice, and for "only free copies count" on deck-linked entries) |

### C. Searching and adding cards
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-020 | MUST | **Page search** is the SPEC-014 **Wishlist host** (SEARCH-062). The result unit is the **entry**, and it filters the user's entries only. The groups are the shared groups plus **Owned** (SEARCH-034: the user's `quantity` ≥ 1, any printing) and **Variant** (SEARCH-030, the entry's `printingId`; an Any entry matches on its default printing). **Ban status** (SEARCH-033) uses `standard`, as "elsewhere". The query lives in the URL with the same keys as Collection (SEARCH-070). Chips, Clear all, the phone **Filters** sheet and the count line follow SEARCH-050…055. No match: "No wishlist cards match these filters." with **Clear all**. | ADR-0010 §2.2 ("the same search ... and the Wishlist"); SPEC-014 SEARCH-030, 033, 034, 062; host settings *default, proposed* |
| WISH-021 | MUST | **Add cards** opens the SPEC-014 search in **add mode** over the **whole catalog** (any card, owned or not; tokens included; SAMPLE never). Results are **per card** with the default printing's art, **in full colour**. Each result has an **Add** button that adds 1 to the card's Any entry, creating it with `want` 1 when there is none (WISH-011, WISH-013). A result whose card is already wanted shows the badge "Want `<n>`" (n = Σ want over that card's entries). Add keeps the search open and announces "Added `<card name>`." (polite status). The search is a dialog on desktop and a full-screen sheet on phones (the H-706 §2.3 add-mode pattern). Closing it returns focus to **Add cards**. The Owned group (SEARCH-034) is offered. | *RJ* (ADR-0010 §4.2 "any card"; §2.2 same search); full colour as the editor (ADR-0010 §1.4) applied here because RJ wants full-colour wishlist tiles; layout *Direction* §3, *default, proposed* |
| WISH-022 | MUST | **Card data needed.** While the card data is not loaded, Add cards is `aria-disabled` with the SPEC-007 COLL-090 reason. | SPEC-007 COLL-090 |

### D. Card details: sheet, dialog, sidebar
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-030 | MUST | **Container by width.** **Phones** (40rem and below): the H-698 **bottom sheet**, opened by a tile tap. **40rem to 64rem:** today's centred card dialog (*default, proposed*). **64rem and wider:** a **sticky sidebar** on the right (about 22rem wide, under the sticky headers, with its own scroll when taller than the viewport). The sidebar is **on the Wishlist only for now**: Collection and Deck detail keep their current containers. | *RJ* (ADR-0010 §4.3: "a dialog on phones, a sidebar on desktop"; answers part 2 item 8: H-708 Q6 "sidebar on the Wishlist only for now"); tablet *default, proposed* (*Direction* §4) |
| WISH-031 | MUST | **One content, three containers, no fork.** One shared **card details content** renders in all three containers (WISH-033). The phone sheet **reuses H-698's shared sheet chrome**: grab handle, title and Close, swipe down to close, system Back closes and stays on the page, focus on the container on open, the S1–S7 rules and the 40rem query. The tablet dialog uses the existing `.card-dialog-panel` shell. The desktop sidebar uses the **Deck detail panel shell** (SPEC-005 OWN-111), so the app has one desktop panel pattern. This item must not copy or change the Collection or Deck detail dialog content: it extracts the shared content where needed. | *Direction* §4 ("must not fork it"); [[Brief H-698 Card Dialog Mobile]] (RJ's B1, B2) |
| WISH-032 | MUST | **Sidebar behaviour.** (a) It is **not a dialog**: no focus trap and no backdrop. (b) On load, the **first entry in the current order** is selected (*default, proposed*, as OWN-111 (b)). An empty list or no match shows no sidebar content. (c) Pressing a tile selects it: a 2 px accent ring and `aria-current="true"`. Opening by keyboard (Enter or Space) moves focus to the sidebar heading (`tabindex="-1"`). A mouse click leaves focus on the tile. (d) **✕** in the sidebar clears the selection, and the sidebar then shows the muted hint "Select a card to see its details.". (e) `[` and `]` step to the previous and next entry in the current order. (f) When a card is selected, a "Skip to card details" link follows the grid. In the DOM the grid comes before the sidebar. (g) A selected entry that leaves the list (removed, merged away, or counted to 0, WISH-070) clears the selection to the hint, with the polite status "That card left your wishlist.". (h) The selection is not stored. | *Direction* §4; (b), (g) *default, proposed* |
| WISH-033 | MUST | **Content, in order** (*Direction* §4). (a) The card art (`art.fullUrl` of `printingId`, full colour) with the ban label under it, from SPEC-002 `banStatus(cardKey, 'standard', 'global', today)`: `banned` shows "Banned since `<date>`", or "**Banned**" with no date when `bannedSince` is `null`; `upcoming` shows "Banned from `<date>`"; ban data not loaded shows "Ban status unknown"; an `unknown` status shows no label. (b) The card name (the dialog or sheet title; the sidebar heading). (c) **Want** stepper (WISH-040). (d) **Printing** select (WISH-012). (e) **Needed for** (WISH-061). (f) **You own**: "You own `<n>`" (n = owned(k)) followed by one row per place holding copies, from SPEC-015 `CardPlaces` (place name and count, Not in a folder first, then folders, then decks; no Move action here). A specific entry leads with "You own `<p>` of this printing · `<n>` in all". With no copies: "You don't own any yet". (g) **Card**: type · category, domains, the non-null stats, rules text and keywords (the OWN-014 fields; keywords per SPEC-011). (h) **Remove from wishlist** (WISH-042). | *Direction* §4; ban wording SPEC-005 OWN-015 and SPEC-002 LEGAL-F05 (b); place rows SPEC-015 COPY-070 |
| WISH-034 | MUST | **Stepping in the dialog and sheet.** Previous and Next step through the entries in the current order. On phones they sit in the H-698 S5 step bar ("Previous" / "Next", accessible names "Previous card" / "Next card"). On tablets they sit in the dialog head as in the deck dialog. `[` / `]` work in both. An entry that leaves while open closes the dialog or sheet with the notice "That card left your wishlist.". | [[Brief H-698 Card Dialog Mobile]] S5; SPEC-005 OWN-113; leave rule *default, proposed* |

### E. Editing and removing
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-040 | MUST | **Want stepper:** − / value / +, 1…99, 44 px targets, the value read as "Want `<n>`". At 1 the − control is replaced by **Remove** (WISH-042). Each press saves at once locally and sets `want` and `updatedAt`. Sync is debounced (SYNC-121). Lowering applies WISH-043. | *Direction* §4; RJ (answers part 2 item 8: the count changes through the user) |
| WISH-041 | MUST | **Only three things change a count:** (1) **the user**: the stepper, Add cards, Remove, a Printing merge (WISH-014); (2) **Add missing** (WISH-050); (3) **the automatic update** (WISH-070). Deck edits, Restore, Fork, deck delete, lock and unlock, moves, folder changes and auto-fill **never** change `want`. A sync pull only brings another device's value (WISH-091). | *RJ* (answers part 2 item 8: H-708 Q4, "deck-linked counts don't follow later deck edits") |
| WISH-042 | MUST | **Remove from wishlist** (a text button with danger-colour text, in the details, and the stepper's Remove at 1) removes the entry with **no confirmation**. Notice: "Removed `<card name>` from your wishlist." with **Undo** for 10 s (the H-087 notice rules, at the top, SYNC-161). Undo puts the entry back as it was: the same `id`, `want`, `printingId`, `anyPrinting`, `fromDecks` and `createdAt`. | *Direction* §4 ("Undo notice instead of a confirm"); *default, proposed* |
| WISH-043 | MUST | **Contribution cap.** Whenever `want` goes down (the user, the automatic update), if Σ fromDecks > want, contributions are lowered until Σ fromDecks = want, starting with the **least recently updated** deck (Decks list order reversed). A contribution of 0 is removed. When the entry is next written, keys of decks that no longer exist are dropped, and `want` stays unchanged (that part becomes user part). | *default, proposed* |

### F. Add missing from a deck
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-050 | MUST | **One click.** Deck detail's **Add to wishlist** button (SPEC-005 OWN-152) adds the deck's missing cards to the wishlist with **no dialog and no confirmation**, as one user action. | *RJ* (ADR-0010 §4.4: "one click adds the deck's missing cards") |
| WISH-051 | MUST | **What it adds per card.** For each counted card k of deck D with missing(D, k) ≥ 1 (SPEC-015: need − held, all six counted zones), the **shortfall** is s = max(0, missing(D, k) − free(k)): the copies this deck still can't get from free copies the user already owns (*default, proposed*: the wishlist is what to get, and a free copy the deck could take now is not wanted). Free copies are counted for each deck at the moment it is added. If two short decks share the same free copy, WISH-052 adds the difference once one of them has taken it and the user presses Add missing again. A card not in the card data (OWN-061) is skipped. | *RJ* (ADR-0010 §4.4: "Missing counts sum across decks, since each deck needs its own copies"); shortfall *default, proposed* |
| WISH-052 | MUST | **Per deck, never twice; decks add up.** Let c = Σ over the entries of card k of fromDecks[D]. If s > c, the card's **Any** entry (created with `printingId` = `defaultPrintingId` when there is none) gets `want += s − c` (capped at 99) and `fromDecks[D] += s − c`. If s ≤ c, nothing changes for that card. So pressing Add missing twice on one deck adds nothing the second time, and **two decks that each miss 2 give "Want 4"**. | sum *RJ* (§4.4); per-deck rule *default, proposed* |
| WISH-053 | MUST | **Only the Any entry.** Add missing never changes a specific entry. Entries added from a deck accept any printing. | *RJ* (answers part 1 item 5) |
| WISH-054 | MUST | **Feedback** (at the top, SYNC-161). (a) When something was added: success notice "Added `<n>` copies of `<m>` cards to your wishlist." ("1 copy", "1 card"), with **Undo** for 10 s. Undo puts back every entry the action created or changed, unless that entry has changed since; such an entry is left as it is and the notice reads "Undid part of it: some cards had changed since.". (b) When nothing was added: info notice "Your wishlist already has every missing card from `<deck name>`.". (c) Extra sentences, in this order, only when they apply: " `<f>` missing cop(y/ies) `<wasn't/weren't>` added because you already have `<it/them>` free." (f = Σ over cards of min(missing, free)); " `<u>` card(s) `<isn't/aren't>` in the card data and `<wasn't/weren't>` added."; the WISH-015 "didn't fit" sentence. | *Direction* §5 (wording, proposal); Undo only, no View action, *default, proposed* (one action per notice, SYNC-162) |
| WISH-055 | MUST | **When the button works.** It is shown when the deck has at least one card with missing ≥ 1 (so never on a complete or locked deck) and ownership is available (OWN-062). It works on **read-only** decks too, since it doesn't change the deck. It is `aria-disabled` and its press shows the reason as an info notice when: the wishlist can't be read ("Your wishlist couldn't be read, so cards can't be added right now."); SPEC-015's folders record can't be read, so free counts are unknown (the COPY-026 reason); or the card data is not loaded (COLL-090 reason). | *default, proposed* |
| WISH-056 | MUST | **One write.** Add missing (and its Undo) is one write of the wishlist record (WISH-092). It is **not** a SPEC-010 SYNC-126 major action: it uses the normal debounce. | *default, proposed* (RJ's six major actions are SYNC-126 (a); adding one is his call) |

### G. "Needed for"
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-060 | MUST | **Chip on the tile, live.** For the entry's `cardKey`, the **needing decks** are every deck with missing(D, k) ≥ 1 now (SPEC-015; a locked deck never misses), in Decks list order. This is computed from the current decks, not from `fromDecks`, and applies to Any and specific entries alike. With one deck the chip reads "**Needed for `<deck name>`**" (the name truncated with an ellipsis; full in the accessible name and tooltip). With two or more: "**Needed for `<m>` decks**". With none there is no chip. The chip is text plus a deck icon, outlined (`--color-text` on `--color-surface`, `--color-border-strong`), xs size, and **not interactive** on the tile. | *RJ* (ADR-0010 §4.5: "a chip or small subtext naming the deck"; answers part 2 item 8: "the 'Needed for' chip stays live"); look *Direction* §3, §7 |
| WISH-061 | MUST | **Details list.** The **Needed for** section lists one row per needing deck: "`<deck name>` · needs `<m>`" (m = missing(D, k)), each a link to `/decks/:id` with a trailing chevron (the H-698 S3 row style, 44 px rows). With no needing deck, the section reads "None of your decks need this card right now.". | *Direction* §4; empty text *default, proposed* |
| WISH-062 | MUST | **Follows deck changes at once.** The chip and list are recomputed whenever decks, places or the collection change (here, in another tab or after a pull; as OWN-070). A deleted deck's row and chip drop, and **the entry stays with its count**. | *RJ* (counts don't follow deck edits; "Needed for" stays live); *Direction* §7 |
| WISH-063 | MUST NOT | "Needed for" never ranks decks or suggests which deck to finish first. | [[ADR-0003 Tournament Results Only]]; SPEC-015 COPY-039 |

### H. Automatic update when the user gets a card
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-070 | MUST | **Counts go down by themselves.** When a **collection import commit** on this device (SPEC-003, Add or Replace, IMP-049 / IMP-050) adds copies of a card, the matching entries **count down** by the copies that arrived. An entry that reaches 0 **leaves** the list. Example: "Want 3" and 1 arrives gives "**Want 2**", not "1 of 3". This runs once per commit, in the **same local save** as the collection change (so the import's Undo can reverse it, WISH-076), and before the commit notice shows. | *RJ* (ADR-0010 §4.6: "When the user gets a wishlisted card ... the wishlist updates"; answers part 2 item 8: H-708 Q3, "count goes down: 'Want 2'"); import commits as the trigger *default, proposed* |
| WISH-071 | MUST | **What arrived.** Per card k, N = max(0, `quantity` after − `quantity` before). If N = 0, nothing arrived for k. A Replace that only **re-keys** printings (3 unassigned copies become 3 × OGN-012) satisfies nothing. When N ≥ 1, the arrived copies are taken from the copy keys whose count rose (SPEC-015 `CopyKey`), in the SPEC-015 COPY-033 (b) order (`u`, base printings, other printings, missing-printing keys), until N copies are attributed. | *default, proposed* |
| WISH-072 | MUST | **Which entries the arrived copies satisfy, in order.** (1) **Specific entries** of k, oldest first: each takes up to its `want` from arrived copies of **its own printing**. (2) The **Any entry** of k takes the rest, up to its `want`. If it is **deck-linked, only free copies count**: an arrived copy whose copy key is excluded from decks (SPEC-015 COPY-040, a tag with `excludeFromDecks`) doesn't count for it. Every other arrived copy is free, because added copies land in Not in a folder (COPY-060). An Any entry that is not deck-linked counts every arrived copy. Unassigned (`u`) copies count only for Any entries. Each arrived copy satisfies at most one entry. | *RJ* (answers part 1 item 5: picked variant counts only that printing; part 2 item 8: H-708 Q5, "only free copies satisfy deck-linked entries"); order *default, proposed* |
| WISH-073 | MUST | After the count goes down, WISH-043 caps `fromDecks`. | design rule |
| WISH-074 | MUST | **One notice per import.** When e ≥ 1 entries left the list, the import's own commit notice (SPEC-003 IMP-073, which keeps its Undo) gains the sentence " `<e>` cards left your wishlist: you have them now." (" 1 card left your wishlist: you have it now."). Entries that only counted down are not announced. There is no separate wishlist notice. | sentence *Direction* §6 (proposal); placement in the commit notice *default, proposed* (Direction drafted a separate notice with View wishlist) |
| WISH-075 | MUST NOT | **Nothing else counts as getting a card:** moves between places, a folder's "Use for decks" switch, a deck edited, deleted or unlocked, Fill with free copies, Undo of Delete from collection (COPY-073), **a sync pull** (the device that imported has already updated the wishlist and syncs it, so a pull never runs the update again and a copy is never counted twice), and **Test data** Load or Remove (SPEC-013). Removing copies from the collection **never adds or raises** an entry. | *Direction* §6 ("Removing copies ... never adds wishlist entries by itself"); the rest *default, proposed* (Direction §6 listed a test-data load as a trigger) |
| WISH-076 | MUST | **Undo of the import** (SPEC-003 IMP-052) also restores every wishlist entry that commit counted down or removed, per entry, when the entry has not changed since the commit. An entry changed since is left as it is. The IMP-052 snapshot keeps the wishlist entries the commit touched. | *default, proposed* (same pattern as SPEC-015 COPY-064) |
| WISH-077 | MUST | **Live page.** When the Wishlist page is open (here or in another tab) while entries change, it updates in place and keeps its scroll position. A tile that leaves fades out over `--dur-fast`, or disappears at once under reduced motion. The sidebar follows WISH-032 (g). | *Direction* §6, §7 |

### I. States and accessibility
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-080 | MUST | **Empty** (no entries): the deck mark, heading "Your wishlist is empty", the line "Add cards you're looking for, or add a deck's missing cards from the deck page." and a filled **Add cards** button. There is no count line, no search bar and no sidebar. | *Direction* §7 (wording, proposal) |
| WISH-081 | MUST | **No match** (filters hide every entry): "No wishlist cards match these filters." with **Clear all** (SEARCH-050: keeps the typed text). | *Direction* §7; SPEC-014 SEARCH-050 |
| WISH-082 | MUST | **Card data.** (a) While the card data is not loaded, the page shows Collection's card-data-unavailable state (SPEC-007 COLL-090), and Add cards and editing are unavailable. (b) An entry whose `cardKey` is no longer in the card data shows the text placeholder "Card no longer in the card data" with its stored key, keeps its count, offers only Remove in its details, and is never matched by arrivals. (c) An entry whose `printingId` no longer resolves shows the default printing's art and "Printing no longer found: `<printingId>`" (the COLL-014 pattern). It stays as it is, and arrivals of that id still count for it. | SPEC-007 COLL-014, COLL-090; *default, proposed* |
| WISH-083 | MUST | **Unreadable wishlist** (newer `schemaVersion` or damaged record): it is **never overwritten**. The page shows the banner "Your wishlist couldn't be read." and no tiles. Add cards, editing and Add missing are unavailable (WISH-055), and the automatic update is skipped for as long as the record is unreadable. Skipped updates are never applied later. | design rule (same pattern as SPEC-015 COPY-104, SPEC-007 COLL-071) |
| WISH-084 | MUST | **Ban data not loaded:** the details read "Ban status unknown", the tile's accessible name has no "banned", and the Ban status filter group is hidden (SEARCH-033). | SPEC-005 OWN-015; SPEC-014 SEARCH-033 |
| WISH-085 | MUST | **Accessibility.** Targets are at least 44 px (tiles, stepper, Printing select, Remove, rows, Add buttons). Information is never conveyed by colour alone (the chip is text; Want is text). Only existing colour tokens are used (contrast as Collection). Notices open at the top (SYNC-161) and follow SYNC-162. Under reduced motion nothing slides or fades (WISH-077). | *Direction* §7; SPEC-010 SYNC-161, SYNC-162 |

### J. Storage, sync and computation
| ID | Level | Requirement | Source |
|---|---|---|---|
| WISH-090 | MUST | **Wishlist record** `StoredWishlist` (`schemaVersion: 1`) lives in the signed-in account, with a browser cache like the other stores (SPEC-010 SYNC-140…145), behind a `WishlistStore` interface (as SYNC-130). Cloud document (*default, proposed*, for SPEC-010 to confirm, H-714): `users/{uid}/state/wishlist`, with `entries` as a map `WishlistEntryId` → entry fields plus `updatedAt`. A removed entry is the tombstone `{ deleted: true, updatedAt }`. Writes use one `FieldPath` per changed entry (as SYNC-015). The merge after a pull is **per entry: the newer `updatedAt` wins** (as tags, SYNC-041). | *default, proposed* (follows [[Firestore Data Shape]] "Layout" and SPEC-010 SYNC-015 pattern) |
| WISH-091 | MUST | **Duplicates after a merge.** When a merge leaves two entries of the same choice (two Any entries of one card, or two specific entries of one printing, e.g. made offline on two devices), they combine into the **older** (`createdAt`, then `id`). `fromDecks` takes the **larger** contribution per deck, the user part is the larger of the two user parts, and `want` = Σ merged fromDecks + that user part (capped at 99). The newer entry becomes a tombstone. The result is stamped as a user change so it syncs. Example: both devices pressed Add missing on Jinx Aggro offline, so the result is Want 2, not 4. | *default, proposed* |
| WISH-092 | MUST | **Cost.** One user action is one `update()` of `state/wishlist`. The stepper, Printing, Remove and Add missing use the 2 s debounce (SYNC-121). The automatic update and the import Undo restore are saved with the import and pushed by the import's own major-action sync (SYNC-126 (c): it pushes every pending item). A pull adds 1 read only when the document changed (SYNC-040). There is no listener and no polling (SYNC-122). | [[Firestore Data Shape]] sync flows; SPEC-010 SYNC-120…126 |
| WISH-093 | MUST | **Size** (`unverified` estimate, from [[Firestore Data Shape]] item sizes: `printingId` ≈ 8 B, a count or timestamp 8 B, `cardKey` ≈ 19 B, a map +32 B; 1 MiB document limit, fact 3; as of 2026-11-23). One entry ≈ 8 (id) + 19 + 8 + 8 (want) + 1 + 16 (two timestamps) + 32 (entry map) + 32 (`fromDecks` map) ≈ 125 B, plus ≈ 44 B per contributing deck (36-character `deckId` + count). At the 2,000-entry cap with 2 contributing decks each, that is ≈ 2,000 × 215 ≈ 430 KB, plus tombstones (≈ 50 B each), under SYNC-123's 700 KB warning and the 1 MiB limit (SYNC-124 applies). The builder measures it. | [[Firestore Data Shape]] facts 3, 6; sizing assumptions |
| WISH-094 | MUST | **Lifecycle.** Sign-out and a different account clear the cached wishlist (SYNC-145). Deleting the account deletes `state/wishlist` (SYNC-095). The wishlist is not part of Test data (SPEC-013) and not part of any export. | SPEC-010 SYNC-095, SYNC-145; *default, proposed* (export) |
| WISH-095 | MUST | **Computed, never stored:** needing decks, owned counts and places, the count line, and every label. Pure functions: `computeWishlistView()` (entries + decks + places + catalog → view), `addMissing()`, `applyArrivals()` (collection before/after + tags → entry changes) and `mergeWishlist()`. The same inputs give the same output. **Performance:** `computeWishlistView()` for 2,000 entries and 200 decks of 150 entries in under 50 ms on a mid-range laptop, reading the shared SPEC-015 `PlacesView` (COPY-107). `applyArrivals()` for a 5,000-card import in under 50 ms. | design rule; SPEC-015 COPY-103, COPY-107 |

## Data contract
```ts
// shapes only; no implementation
import type { CardKey, PrintingId, StoredCollection } from './collection-import';   // SPEC-003
import type { StoredTags, CollectionCatalogView } from './my-collection';           // SPEC-007
import type { UserDeck } from './deck-import';                                      // SPEC-006
import type { PlacesView, CardPlaces } from './physical-copies';                    // SPEC-015
import type { BanStatus } from './deck-legality';                                   // SPEC-002

type IsoDateTime = string;                 // ISO 8601 UTC
type WishlistEntryId = string;             // 'w_' + 6 chars [0-9A-Za-z], unique per account (like TagId, FolderId)

interface WishlistEntry {                  // WISH-010
  id: WishlistEntryId;
  cardKey: CardKey;
  printingId: PrintingId;                  // default printing for an Any entry (WISH-011, WISH-012)
  anyPrinting: boolean;                    // true = any printing counts; false = only printingId (WISH-012, WISH-013)
  want: number;                            // integer 1..99 (WISH-015)
  fromDecks: Record<string, number>;       // deckId -> copies added by Add missing; Σ ≤ want (WISH-016, WISH-043)
  createdAt: IsoDateTime;                  // Recently added sort; merge winner (WISH-014, WISH-091)
  updatedAt: IsoDateTime;                  // per-entry merge (WISH-090)
}

interface StoredWishlist {                 // WISH-090
  schemaVersion: 1;
  updatedAt: IsoDateTime;
  entries: WishlistEntry[];                // max 2,000 (WISH-015); invariants WISH-014
}

interface WishlistInput {
  wishlist: StoredWishlist; decks: UserDeck[]; places: PlacesView;
  catalog: CollectionCatalogView; banStatus: (cardKey: CardKey) => BanStatus | 'unknown'; // standard, global, today
}

interface NeededFor { deckId: string; deckName: string; needs: number; }   // WISH-060, WISH-061

interface WishlistEntryView {
  entry: WishlistEntry;
  cardName: string | null;                 // null = card no longer in the card data (WISH-082 (b))
  printingLabel: string;                   // SPEC-007 COLL-101 (e), or "Printing no longer found: <id>"
  imageUrl: string | null;
  deckLinked: boolean;                     // Σ fromDecks ≥ 1
  neededFor: NeededFor[];                  // live, Decks list order
  chipText: string | null;                 // "Needed for Jinx Aggro" | "Needed for 2 decks" | null
  owned: number; ownedThisPrinting: number | null; places: CardPlaces | null;
  ban: BanStatus | 'unknown';
}

interface WishlistView { entries: WishlistEntryView[]; cardCount: number; copiesWanted: number; }

interface AddMissingResult {               // WISH-051..054
  changes: { entryId: WishlistEntryId | null /* null = new entry */; cardKey: CardKey; added: number }[];
  addedCopies: number; addedCards: number;
  coveredByFree: number;                   // Σ min(missing, free)
  skippedUnknown: number; didNotFit: number;
}

interface ArrivalResult {                  // WISH-070..073
  changes: { entryId: WishlistEntryId; before: number; after: number /* 0 = removed */ }[];
  removedCount: number;                    // e in the WISH-074 sentence
}

declare function computeWishlistView(input: WishlistInput): WishlistView;                       // pure
declare function addMissing(input: WishlistInput, deckId: string, now: IsoDateTime):
  { wishlist: StoredWishlist; result: AddMissingResult };                                        // pure
declare function applyArrivals(wishlist: StoredWishlist, before: StoredCollection, after: StoredCollection,
  tags: StoredTags, decks: UserDeck[], now: IsoDateTime): { wishlist: StoredWishlist; result: ArrivalResult }; // pure
declare function mergeWishlist(local: StoredWishlist, cloud: StoredWishlist, now: IsoDateTime): StoredWishlist; // WISH-090, 091
```

## Acceptance criteria
Example data unless an AC says otherwise: **Ion Arc** has printings `OGN-012` (default) and `OGN-012a` (Showcase; fixture `variant.kind: 'showcase'`, so its printing label is "OGN-012a Showcase"). **Lightning Rush** has `OGN-030` (default). Decks: **Jinx Aggro** and **Kennen Tempo** each need 2 Ion Arc in Main and hold none. Jinx Aggro is more recently updated. The user owns no Ion Arc and the wishlist is empty.

1. **Tabs (WISH-001, 002).** **Given** a signed-in user at 360 × 780, **When** the app loads, **Then** the bottom bar shows five equal tabs "Decks", "Collection", "Wishlist" (`bookmark` icon), "Events" and the avatar, and no label is truncated. **When** "Events" is tapped, **Then** `/tournaments` opens with the page title "Tournaments". **Given** 1440 px, **Then** the top tabs read Decks · Collection · Wishlist · Tournaments.
2. **Gate (WISH-003).** **Given** a signed-out visitor, **When** `/wishlist` opens, **Then** the heading "Wishlist" is followed by the shared sign-in panel, and no Firestore request is made. **Given** guest test data is on, **Then** the same panel shows.
3. **Add cards (WISH-021, 004, 005, 013).** **Given** the example, **When** the user opens Add cards, types "Ion Arc" and presses Add, **Then** the result shows "Want 1", the page shows one full-colour tile "Ion Arc" / "Want 1" with the OGN-012 art and no printing label, and the count line reads "1 card · 1 copy wanted". **When** Add is pressed again, **Then** "Want 2". The entry is an Any entry.
4. **Pick a variant (WISH-012, 072).** **Given** AC 3, **When** the user chooses "OGN-012a Showcase" in Printing, **Then** the tile reads "Want 2 · OGN-012a Showcase" with the Showcase art. **When** an import adds 1 × OGN-012, **Then** it still reads "Want 2". **When** an import adds 1 × OGN-012a, **Then** it reads "Want 1".
5. **Add missing sums across decks, never twice (WISH-050…054, 060, 061).** **Given** the example, **When** the user presses Add to wishlist on Jinx Aggro, **Then** the notice reads "Added 2 copies of 1 card to your wishlist." with Undo, the entry reads "Want 2", and the chip reads "Needed for 2 decks" (both decks miss it). **When** it is pressed again on Jinx Aggro, **Then** the info notice reads "Your wishlist already has every missing card from Jinx Aggro." and it still reads "Want 2". **When** it is pressed on Kennen Tempo, **Then** "Want 4", and the details list "Jinx Aggro · needs 2" and "Kennen Tempo · needs 2".
6. **Free copies aren't wanted (WISH-051, 052, 054 (c)).** **Given** 1 Ion Arc in Not in a folder (free), **When** Add to wishlist is pressed on Jinx Aggro, **Then** it adds 1 ("Added 1 copy of 1 card to your wishlist. 1 missing copy wasn't added because you already have it free."). **When** Jinx Aggro then uses Fill with free copies (holds 1, free 0) and Add to wishlist is pressed again, **Then** nothing is added (s = 1, c = 1).
7. **Count goes down, then leaves (WISH-070, 072, 074, 043).** **Given** AC 5's end (Want 4, fromDecks Jinx 2, Kennen 2), **When** an Add import of 3 × OGN-012 is committed, **Then** the entry reads "Want 1", `fromDecks` sums to 1 (Kennen Tempo lowered first, then Jinx Aggro), and the commit notice has no wishlist sentence. **When** another import adds 1 × OGN-012, **Then** the entry leaves and the commit notice ends " 1 card left your wishlist: you have it now."
8. **Deck-linked counts only free copies (WISH-072).** **Given** the Ion Arc Any entry Want 2 from Jinx Aggro, and the printing OGN-012a carries the tag Collector (`excludeFromDecks: true`), **When** an import adds 1 × OGN-012a, **Then** it still reads "Want 2". **Given** a Lightning Rush Any entry added with Add cards (not deck-linked) and the same tag on OGN-030, **When** an import adds 1 × OGN-030, **Then** its count goes down by 1.
9. **Re-keying satisfies nothing (WISH-071).** **Given** 3 unassigned Ion Arc owned and a specific OGN-012 entry Want 1, **When** a Replace import sets Ion Arc to 3 × OGN-012, **Then** the entry still reads "Want 1".
10. **Undo of the import (WISH-076).** **Given** AC 7's first import, **When** the user presses the commit notice's Undo, **Then** the entry reads "Want 4" again with fromDecks Jinx 2, Kennen 2.
11. **Counts don't follow deck edits (WISH-041, 062).** **Given** Want 2 from Jinx Aggro only, **When** the user edits Jinx Aggro to 3 Ion Arc and saves, **Then** the entry still reads "Want 2" and the details read "Jinx Aggro · needs 3". **When** Add to wishlist is pressed on Jinx Aggro, **Then** "Want 3". **When** Jinx Aggro is deleted and its Undo window ends, **Then** the chip shows only Kennen Tempo ("Needed for Kennen Tempo") and the entry still reads "Want 3".
12. **Stepper and Remove (WISH-040, 042).** **Given** an entry at Want 1, **Then** the stepper shows Remove instead of −. **When** Remove is pressed, **Then** the tile leaves and "Removed Ion Arc from your wishlist." shows with Undo. **When** Undo is pressed within 10 s, **Then** the same entry (same id and `createdAt`) is back.
13. **Merge on a printing change (WISH-014).** **Given** an Any entry Want 2 and a specific OGN-012a entry Want 1 (older), **When** the user sets the Any entry's Printing to OGN-012a Showcase, **Then** one entry remains, "Want 3 · OGN-012a Showcase", with the notice "Combined with your other OGN-012a Showcase entry."
14. **Containers (WISH-030…034).** **Given** 1440 px and 3 entries, **When** the page loads, **Then** the first entry is selected in the sidebar (ring and `aria-current="true"`), no focus trap exists, and pressing ✕ shows "Select a card to see its details.". **When** a tile is focused and Enter is pressed, **Then** focus moves to the sidebar heading. **Given** 768 px, **When** a tile is pressed, **Then** the centred dialog opens. **Given** 375 px, **When** a tile is tapped, **Then** the H-698 bottom sheet opens with the handle, a swipe down closes it, and system Back closes it with the URL unchanged.
15. **Details content (WISH-033).** **Given** an Ion Arc Any entry, 1 OGN-012 owned in "Main binder" and Ion Arc banned in Standard since Nov 23, 2026 (test fixture), **When** its details open, **Then** they show, in order: the art with "Banned since Nov 23, 2026", the name, the Want stepper, Printing "Any printing", Needed for rows, "You own 1" with "Main binder 1", the Card facts and Remove from wishlist.
16. **Limits (WISH-015).** **Given** an entry at Want 99, **Then** + and that card's Add are disabled with "You can want up to 99 copies.". **Given** 2,000 entries, **When** Add is pressed on a card with no entry, **Then** nothing is added and "Your wishlist is full (2,000 cards)." shows.
17. **Offline duplicates (WISH-091).** **Given** two devices each pressed Add to wishlist on Jinx Aggro offline (each made an Ion Arc Any entry Want 2, fromDecks Jinx 2), **When** both sync, **Then** one entry remains with Want 2 and fromDecks Jinx 2, and the newer one is a tombstone. **Given** instead that one device added 1 by Add cards and the other pressed Add missing for 2, **Then** Want 3.
18. **Nothing else counts (WISH-075).** **Given** an Ion Arc Any entry Want 2 and 2 Ion Arc held by Kennen Tempo, **When** Kennen Tempo is deleted and its copies go to Not in a folder, **Then** the entry still reads "Want 2". **When** a pull brings a collection change from another device, **Then** the wishlist changes only by the pulled wishlist document.
19. **Empty and unreadable (WISH-080, 083).** **Given** no entries, **Then** "Your wishlist is empty" shows with Add cards and no count line. **Given** a cloud `state/wishlist` with `schemaVersion: 2`, **Then** "Your wishlist couldn't be read." shows, nothing is written to it, and Deck detail's Add to wishlist is disabled with "Your wishlist couldn't be read, so cards can't be added right now."

## Out of scope
- Prices, shops, marketplace links, trading, sharing a wishlist (ADR-0003; no request).
- Several named wishlists. There is one list per account (ADR-0010 §4.1 says "lists"; one list until RJ asks for more, Open question 1).
- A bookmark glyph on Deck detail tiles for wanted cards (*Direction* §5: not now).
- A desktop sidebar on Collection (RJ: Wishlist only for now, H-708 Q6).
- "Add to wishlist" from the Collection card dialog or Deck detail card details (not requested).
- Exporting the wishlist.

## Open questions / BLOCKED
Nothing is BLOCKED on research: this spec states no game rule. **`unverified`:** the size figures (WISH-093), for the builder to measure. Variant labels show the code alone until H-020 fills `variant.kind` (CARD-040). These *default, proposed* items need RJ's yes or change:
1. **One list.** ADR-0010 §4.1 says "lists of cards". This spec has **one** wishlist per account. Do you want several named lists?
2. **Add cards starts as Any printing** (WISH-013). The user picks a variant to make it specific.
3. **Add missing adds the shortfall after free copies** (WISH-051): a free copy the deck could take now isn't wanted, and the notice says how many were left out. Free copies are counted per deck at the time of adding.
4. **Per deck, never twice** (WISH-052): pressing Add missing again adds only what grew since. The hidden `fromDecks` record and its cap when counts go down (WISH-016, WISH-043).
5. **Which changes count as getting a card** (WISH-070, WISH-075): import commits only. Not test data (the H-708 draft listed it), not Undo of a delete, not moves, not a sync pull.
6. **Re-keyed printings satisfy nothing, arrivals capped by the card's net increase** (WISH-071). **Matching order:** specific entries first, then the Any entry (WISH-072).
7. **The notice** is one sentence added to the import's commit notice ("3 cards left your wishlist: you have them now."), and count-downs are silent (WISH-074). The H-708 draft had a separate notice with View wishlist.
8. **Undo of the import restores the wishlist** (WISH-076).
9. **Limits:** 99 copies per entry, 2,000 entries (WISH-015).
10. **Remove** with Undo and no confirmation; the stepper turns − into Remove at 1 (WISH-040, WISH-042).
11. **Account:** the same sign-in gate as Decks and Collection; signed-out guest test data has no wishlist (WISH-003).
12. **Containers:** the centred dialog on tablets (40–64rem); the sidebar selects the first entry on load (WISH-030, WISH-032).
13. **Merging** two entries of the same printing choice on a Printing change (WISH-014) and after an offline sync (WISH-091).
14. **Add missing** notice has Undo only (no View wishlist), is not a SYNC-126 major action, works on read-only decks, and is disabled while folders or the wishlist can't be read (WISH-054…056).
15. **Storage:** a new `state/wishlist` document merged per entry (WISH-090). SPEC-010 (H-714) confirms the mapping, the rules cap and the cost lines.
16. **Strings:** the count line definition, sort options, empty state, "None of your decks need this card right now.", "That card left your wishlist." and every *Direction* string (WISH-004, 006, 032, 061, 080).

## Changelog
- 0.1 (H-705, 2026-11-28): first draft from ADR-0010 §4 and RJ's answers (part 1 items 3 and 5, part 2 item 8; RJ 2026-11-28, chat) and [[Direction H-708 Wishlist]]: tab and page, entries per printing, Add cards from the whole catalog, sheet / dialog / sidebar, editing, Add missing from a deck (sum across decks, per deck once), live "Needed for", automatic update (free copies only for deck-linked entries), states, storage and sync. WISH-001…095; ACs 1–19; 16 open questions for RJ.
