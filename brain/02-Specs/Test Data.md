---
tags: [spec]
id: SPEC-013
version: 0.1.3
status: review
depends_on: ["SPEC-007", "SPEC-003", "SPEC-008", "SPEC-010"]
research: ["[[Firestore Data Shape]]", "[[Collection Test Data]]"]
decisions: ["[[ADR-0007 Firebase Accounts and Firestore]]", "[[ADR-0004 Hosting (Deferred)]]"]
board: H-204, H-205
as_of: 2026-11-25
sources:
  - url: https://firebase.google.com/docs/firestore/quotas
    tier: official
    status: confirmed
    as_of: 2026-11-25
  - url: https://firebase.google.com/pricing
    tier: official
    status: confirmed
    as_of: 2026-11-25
---
# SPEC-013: Test Data on live (invented cards for signed-in testers)

## Summary
> Read this first. Full detail below only if needed.

**Why:** sign-in ships to live before imports can save (no Riot card data until H-020, possibly weeks; `/api` has no production host, [[ADR-0004 Hosting (Deferred)]]). Signed-in testers need something in their account to try Collection and Decks. RJ, 2026-11-25: make the `/styleguide` "import 5,000" injection and the other test collections available on live.

**What it is:** a **Test data** control on the **Collection** page, signed-in only, behind a build flag `testDataEnabled` (on in production and preview until real imports can save, then off). It offers two **invented** sets, **Small** (150 entries) and **Large** (5,000 entries), writes them to the user's own account through the normal sync path, labels them as test data everywhere they show, and a **Remove test data** action takes out exactly what the tool wrote.

**Key decisions (spec-writer defaults, flagged for RJ in Open questions)**
- **Entry point: the Collection page only** (empty-state secondary button, and a persistent banner while test data is present). No account-menu item, so [[Accounts and Sync]] SYNC-151 (its exact menu order and divider count) stays untouched.
- **Sets on live: Small and Large, both from the generator** `generateLargeSample(n)`. The **fixture sample is not offered** (TEST-005): it needs card data from `/api`, which has no production host. It stays a dev-only tool on `/styleguide`.
- **How test data is told apart from real data, with no new fields and no rules change:** the collection document's `catalogVersion` is the **reserved value `test-data-<n>`** (`test-data-150`, `test-data-5000`); a real import writes the real catalog version. Test decks have the **reserved ids** `00000000-0000-4000-8000-0000000000NN` (NN = 01…03) and the same `catalogVersion`. The marker travels with the account, so every device sees it (TEST-020…024).
- **No mixing:** a test load is allowed only when the collection is empty or already test data (TEST-011); while test data is present, **Add to your collection** asks for "Remove test data" first (TEST-032); Replace import replaces it like any collection and ends the test state (TEST-033).
- **Numbers (checked 2026-11-25, section "Size and quota"):** the Large collection document is **≈ 254 KB = 24 % of the 1 MiB limit** (4.1× headroom); the whole test set for one account is **≈ 265 KB**. One Load or one Remove is **5 writes** (6 on the first push after a build change), 0 reads; Remove's 3 deck writes go out after the 10 s Undo window. After Remove the collection's `catalogVersion` is `""` and an empty collection is never test data. The free tier allows ≈ **3,300 to 4,000 loads a day** across all testers (20,000 / 6 or 5) before anything else runs, and ≈ **1,300 cold pulls of the Large document a day** on the outbound-data limit. **Everything fits one document: no fallback needed**; RJ has nothing to decide on quota.
- **Sunset (TEST-040…043):** the tool is hidden when `testDataEnabled` is false; the Remove banner stays for anyone who still has test data until they remove it. The build item that turns on real imports (after H-020) sets the flag to `false`.

**Depends on:** [[My Collection]] 0.14.1, [[Collection Import]] 0.14, [[Shared Cards and Lock-in]] 0.4.4, [[Accounts and Sync]] 0.17.2, [[Firestore Data Shape]], [[Collection Test Data]] (the existing generators). **Consumers:** builder item H-205.
**BLOCKED (needs research):** none. Nothing here states a game rule; the cards are invented.

## Purpose
Give testers real, synced, clearly fake data on the live site until real card data and the Riot API key exist (H-020), without a second code path for storage: the data is written like any import, so it exercises sign-in, sync and the Collection page for real.

## Definitions
- **Test data:** the invented cards, decks and locks this spec writes. Never real Riot data.
- **Test marker:** the reserved `catalogVersion` value `test-data-<n>` (n = number of owned printings, a positive integer) in `users/{uid}/state/collection`, and in each test deck.
- **Test decks:** the three decks of the generator, `sampleDeckId(1…3)` = `00000000-0000-4000-8000-000000000001` … `…003` (a UUID v4 whose random part is all zeros; a real deck id is random, so a clash is not a practical concern). They pass the rules' deck-id pattern and `sourceFormat: 'manual'`, `format: 'standard'`.
- **Test set:** Small = `generateLargeSample(150)` (50 cards × 3 printings, 150 tiles); Large = `generateLargeSample(5000)` (1,667 cards, 5,000 tiles). Both: two locked decks and one unlocked deck. Set codes `GNA…GNF`, set names `Generated 1…6`, card names like "Ashen Warden 1".
- **`testDataEnabled`:** a boolean in `web/src/environments/*` (public config, not a secret), `true` in `environment.ts` (production and preview) while imports cannot save, `true` in `environment.development.ts`.

## Requirements
### A. Where it lives and who sees it
| ID | Level | Requirement | Source |
|---|---|---|---|
| TEST-001 | MUST | **Signed-in only, flag-gated.** The Load controls exist only when the SYNC-009 gate is open (signed in, first sync done) **and** `testDataEnabled` is true. Signed out, they are never rendered (the Collection page shows the sign-in panel). The flag false hides **Load** everywhere (TEST-040). | H-204; [[Accounts and Sync]] SYNC-009 |
| TEST-002 | MUST | **Entry point.** On Collection, when the collection is empty (the page's empty state, [[My Collection]] COLL-094), a text button **Load test data** sits under the "Add to your collection" button and opens the TEST-003 dialog. Nothing is added to the account menu, the header, the footer, Home or Decks. When the collection is not empty and holds no test data there is no Load control (a user with real cards is never offered one). | H-204; SYNC-151 left unchanged |
| TEST-003 | MUST | **Load dialog** (title **Load test data**). Text: "Fill your account with invented cards so you can try Rift Builder before real card data is ready. These are not real cards. You can remove them any time." Two radio options, none preselected: **Small**: "150 cards, 3 decks" and **Large**: "5,000 cards, 3 decks (a long list, to test scrolling)". Buttons **Cancel** and **Load**; Load is disabled until an option is chosen. Escape and Cancel close it with nothing written. Focus returns to the Load test data button. | H-204; [[Collection Test Data]] |
| TEST-004 | MUST | **Offline.** Load needs the network (it is a sync write). Offline: Load is `aria-disabled` and "You're offline." shows above the buttons ([[Accounts and Sync]] SYNC-081 style). The test catalog needs no network (TEST-024). | SYNC-081 |
| TEST-005 | MUST | **Sets offered on live: Small and Large only.** The fixture sample (`sampleOverCatalog`, 123 copies of 46 cards with unassigned copies, a missing printing and an unresolved card) is **not** offered on live: it needs the fixture catalog from `/api`, which has no production host ([[ADR-0004 Hosting (Deferred)]], [[Collection Test Data]] "Expected, not bugs"). It stays a dev-only tool on `/styleguide`. | H-204 |
| TEST-006 | MAY | A later build may bundle the fixture catalog as a static file and add a third set **Edge cases** (the fixture sample's unassigned / missing / unresolved states). Out of scope for H-205 (Open question 2). | H-204 |

### B. Labelling
| ID | Level | Requirement | Source |
|---|---|---|---|
| TEST-010 | MUST | **Banner while test data is present** (the collection's `catalogVersion` starts with `test-data-`): on Collection, above the list, in the notice style (not a modal): "You're looking at test data: invented cards, not yours. **Remove test data**" with two text buttons inside the banner: **Change set** (opens the TEST-003 dialog; choosing a set then asks the TEST-022 confirmation, and only while `testDataEnabled`) and **Remove test data**. It is always visible (not dismissible), also when the filter or search shows no results, and is announced politely (`role="status"`). It shows even when `testDataEnabled` is false (TEST-041). | H-204 |
| TEST-011 | MUST | **The cards are clearly fake.** Names carry a number ("Ashen Warden 1"), sets are "Generated 1…6" with codes `GNA…GNF`, art is the invented placeholder SVG in `web/public/fixture-cards/`, never a Riot image or logo. The card dialog and tiles need no extra label (the banner is the label). The test decks are named "Generated Locked A", "Generated Locked B", "Generated Open". | [[Card Data & Images]] (invented data only); [[Collection Test Data]] |
| TEST-012 | MUST | **Load rule (no mixing).** Load runs only when the collection is **empty** (no cards) **or already test data**. If real entries exist, the control is not offered (TEST-002); a Load that finds real entries at write time (another device imported meanwhile) stops, writes nothing and shows "You already have real cards, so test data can't be loaded." A **different** test set over an existing one is allowed and replaces it (TEST-020). | H-204 |

### C. Load, replace and confirm
| ID | Level | Requirement | Source |
|---|---|---|---|
| TEST-020 | MUST | **What Load writes**, through the **tracked** stores (`stores.collection`, `stores.decks`, `stores.locks`, which stamp changes so sync pushes them; never `stores.raw`, which the dev tool uses and sync never stamps): (1) the collection as **one replacement** (`StoredCollection`, `catalogVersion` = `test-data-<n>`, the generator's `cards`); (2) the three test decks, each with `catalogVersion` = `test-data-<n>`; (3) the two test locks, **added** to the user's existing locks (never a replacement of `state/locks`, TEST-021). Tags and printing codes are not written (printing codes are not synced and are rebuilt from the catalog, [[Firestore Data Shape]]). | H-204; SYNC-031, SYNC-041 |
| TEST-021 | MUST | **Decks.** Load writes the three decks by id (`put`). If the user already has decks of their own, they are **kept**: Load never deletes or edits a deck whose id is not a test id. (Unlike the dev tool, which clears every deck first.) Existing test decks (same ids) are overwritten. The user's own locks are kept; the two test locks are added to them. | H-204 |
| TEST-022 | MUST | **Confirm.** When test data already exists, choosing a set shows a confirmation "Replace your test data with the {Small / Large} set? Your own decks are kept." (**Replace** / **Cancel**). First load needs no confirmation (the dialog is the confirmation, TEST-003). | H-204 |
| TEST-023 | MUST | **Progress and result.** While writing, Load shows "Loading…" and is disabled; the Large write is one document `set()`. On success the dialog closes, the SYNC-087 success notice **Test data loaded.** shows and the list renders. A failed write leaves the account unchanged on the server (the sync engine retries as for any save); the dialog stays open with "Couldn't load test data. Check your connection and try again." | H-204; SYNC-087 |
| TEST-024 | MUST | **Catalog for test data.** While the stored collection's `catalogVersion` starts with `test-data-`, the card-data layer returns the **generated catalog** for that `n` (`generateLargeSample(n).catalog`) instead of calling `/api`, so Collection renders on live, on every device and after a reload, with no dev flag and no `localStorage` key (the dev key `rift.dev.sample` stays dev-only). The generator is loaded on demand (outside the main bundle). If `/api` works (real card data exists) and the marker is present, the generated catalog is **still** used for the test entries until they are removed (TEST-043). | H-204; `CardData` today |

### D. Marker and telling it apart from real data
| ID | Level | Requirement | Source |
|---|---|---|---|
| TEST-030 | MUST | **Marker rule.** A collection is test data **if and only if** it has at least one card **and** its `catalogVersion` starts with `test-data-` (a collection with no cards, or none stored at all, is never test data, whatever its `catalogVersion`, so TEST-010's banner never shows on an empty collection and TEST-002 offers Load there); a deck is a test deck iff its id is one of the three reserved ids **and** its `catalogVersion` starts with `test-data-`. Real catalog versions never start with `test-data-` (they come from the card snapshot). No new Firestore field is added, so `firestore.rules` needs **no change** (the rules accept any `catalogVersion` string up to 100 characters; the reserved ids match the deck-id pattern; `cards.size()` 1,667 is under the 6,000 cap). | [[Accounts and Sync]] SYNC-112; `firestore.rules` read 2026-11-25 |
| TEST-031 | MUST | **Marker syncs.** Because it lives in synced fields, a second device shows the banner and the generated catalog after its normal sync, and **Remove test data** works from either device. | SYNC-140… |
| TEST-032 | MUST | **Add import while test data is present.** "Add to your collection" ([[Collection Import]] IMP-060) opens a notice instead of the import: "Remove your test data before adding cards, so test and real cards don't mix." with **Remove test data** and **Cancel**. The Remove button runs TEST-050 and then opens the import. (Today imports cannot save; this covers the day they can.) | H-204 |
| TEST-033 | MUST | **Replace import while test data is present.** The existing Replace confirmation ([[Collection Import]] IMP-050) is unchanged and replaces the whole collection, so the new `catalogVersion` ends the test state. The banner (and so Remove) disappears with the marker, so a Replace import must also remove the three test decks and their locks in the same commit, or they would be left behind. | H-204 |
| TEST-034 | SHOULD | A stray test deck (reserved id present, collection not test data) is removed by the next Remove or Replace; it is never presented as the user's own work. | H-204 |

### E. Remove test data
| ID | Level | Requirement | Source |
|---|---|---|---|
| TEST-050 | MUST | **Remove test data** (button in the TEST-010 banner). Confirm dialog: "Remove test data?" "This removes the invented cards and the three test decks from your account. Your own decks are not touched." **Remove** (danger) / **Cancel**. Removes **only**: (1) every entry of the collection, and the document's `catalogVersion` is set to the **empty string `""`** in the same write (the code has no other "empty collection" value: a never-imported account has no stored collection at all, and `""` satisfies the stored shape, a string, and the rules' `shortString(…, 100)`); the marker thus goes with the cards, leaving an empty, non-test collection (TEST-030); (2) the decks with the three reserved ids; (3) their lock entries. Nothing else: **own decks, own locks, tags, username, account document** stay. Because Load needs an empty collection, the collection has no real cards to protect (TEST-012). | H-204 |
| TEST-051 | MUST | **How the removal syncs.** Through the tracked stores as ordinary removals: cards become **tombstones** (`q: 0`, `p: {}`, dropped after 30 days, [[Firestore Data Shape]]) pushed as **one document write** together with `catalogVersion: ""`; the three decks are soft-deleted (`deletedAt`, hard-deleted after 30 days by the existing clean-up), one write each, which the sync engine pushes only **after the 10 s Undo window** of a deck delete ([[Accounts and Sync]] SYNC-035), so the decks vanish on other devices about 10 s later than the cards; their locks are removed from `state/locks` in one write at once. A Remove is complete (and a second Load allowed on another device without a stale test deck) once those writes land. After sync, another device shows the banner gone, the empty collection and no test decks. | Firestore Data Shape; SYNC-016 |
| TEST-052 | MUST | **Result.** The notice **Test data removed.** shows (SYNC-087); Collection shows its normal empty state with the "Add to your collection" button and, while `testDataEnabled`, **Load test data** again. | H-204 |
| TEST-053 | MUST | **Sign-out and account deletion** need nothing special: test data is ordinary account data, cleared from the device by sign-out (SYNC-142) and deleted with the account (SYNC-095). | [[Accounts and Sync]] |

### F. Sunset (when real imports work)
| ID | Level | Requirement | Source |
|---|---|---|---|
| TEST-040 | MUST | **Flag.** `testDataEnabled` false: no Load control (TEST-002 never renders) and no Load dialog. | H-204 |
| TEST-041 | MUST | **Remove stays.** With the flag false, anyone whose account still holds test data keeps the TEST-010 banner and **Remove test data** (TEST-050) and the TEST-032 notice, so nobody is stuck with fake cards. The code for Remove, the banner and the generated catalog is deleted in a later cleanup item once the flag has been `false` for one release and RJ agrees (Open question 3). | H-204 |
| TEST-042 | MUST | **Who flips it.** The flag is set to `false` in the same build item that turns real imports on (after H-020 provides the card snapshot and `/api` or its static replacement works on live). That item adds the AC "Given `testDataEnabled` is false, no Load control shows". Until then it is `true` in production and preview. | H-020, H-204 |
| TEST-043 | MUST | **Real data never reads test entries as real.** With the marker present, ownership, Decks and lock logic run over the test entries and the generated catalog only (they cannot match real catalog `cardKey`s). Decks shows the test decks against the test collection; on a real catalog (flag off, marker still present) test entries that do not resolve show as unresolved cards ([[My Collection]] COLL-015) until removed, and the banner explains why. | H-204 |

## Size and quota (checked 2026-11-25)
**Sources:** Firestore limits and free quota from [quotas](https://firebase.google.com/docs/firestore/quotas) and [pricing](https://firebase.google.com/pricing), both read 2026-11-25 (`status: confirmed`; neither page shows a last-updated date): 1 MiB (1,048,576 bytes) per document; free: 1 GiB stored, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, 10 GiB/month outbound; quotas reset around midnight Pacific time. Size rules (string = UTF-8 bytes + 1, integer = 8, map as a document, document = name + field names + values + 32) from [storage-size](https://firebase.google.com/docs/firestore/storage-size) as recorded in [[Firestore Data Shape]] (read 2026-11-23, `as_of: 2026-11-23`, not re-fetched).

### Bytes per entry (the serialized shape the code writes)
`state/collection.cards` is a map `cardKey → { q, t, p: { printingId → count } }` (adapter `mapWrite` writes `c.cards` as is; keys `q`, `t`, `p` per [[Firestore Data Shape]]). Measured on the generator's names for the Large set (1,667 cards: 1,666 with 3 printings, the last with 2):
- `cardKey` (lower-case "adjective noun n"): average 16.3 characters + 1 = **17.3 B** (adjectives avg 5.1, nouns avg 5.9, number 1…1667 avg 3.34 digits).
- Per card without printings: key 17.3 + map 32 + `q` (2 + 8) 10 + `t` 10 + `p` (2 + map 32) 34 = **103.3 B**.
- Per printing: id `GNA-001` / `GNA-001a` / `GNA-379…656`, avg 7.33 chars + 1 + count 8 = **16.3 B**.
- Large: 1,667 × 103.3 + 5,000 × 16.3 = 172.2 KB + 81.5 KB = **≈ 253.7 KB** (≈ 52 B per tile). Document name 68 B + top fields (`schemaVersion`, `updatedAt`, `syncedAt`, `catalogVersion`) ≈ 100 B + 32 ⇒ **≈ 254 KB = 24.2 % of 1,048,576**. Cross-check with [[Firestore Data Shape]]'s own constants (105 B per card + 17 B per printing): 1,667 × 105 + 5,000 × 17 = 260 KB, the same within 3 %.
- Small (150): 50 × 103.3 + 150 × 16.3 ≈ 7.6 KB.

### The whole test set for one account
| Document | Bytes (Large) | Notes |
|---|---|---|
| `state/collection` | ≈ 254,000 | 24 % of the limit; 4.1× headroom |
| 3 decks | ≈ 8,000 | 20 entries × 95 B + ≈ 700 B base, each |
| `state/locks` | ≈ 300 | 2 locks × 45 B + overhead |
| indexes | ≈ 2,000 | `syncedAt` only (≈ 400 B per document; heavy fields are exempt in `firestore.indexes.json`) |
| **Total** | **≈ 265 KB** | Small ≈ 20 KB |

- **After Remove:** the collection document holds 1,667 tombstones × 103.3 B ≈ **172 KB** for up to 30 days (still ≤ 17 % of the limit); loading again within that time rewrites the same card keys (the generator is deterministic), so the document does not grow.
- **Rules caps** (`firestore.rules`, read 2026-11-25): `cards.size() ≤ 6000`: Large has 1,667 keys; decks ≤ 150 entries per list: 20. The Large set fits with room; a generator size above ≈ 18,000 entries would reach the cap, which is not offered.
- **Fits one document: no fallback needed.** (If a future set were > ≈ 700 KB, [[Firestore Data Shape]]'s 8-bucket split is the migration path; not required here.)
- **Storage:** 1 GiB / 265 KB ≈ **4,000 accounts** with a Large set, ≈ 50,000 with Small. A tester count in the tens uses < 0.1 % of storage.

### Writes, reads and deletes per action
| Action | Writes | Reads | Deletes | Why |
|---|---|---|---|---|
| **Load** (Small or Large) | **5** (6 on the first push after a build change) | 0 | 0 | 1 collection `set()` + 3 deck `set()` + 1 locks write = 5. The account `update()` (`updatedAt`, `lastClientVersion`, SYNC-012) is added **only when the app build changed** since the last push (`sync-engine.ts`, `planPush` `opts.account`), so a normal Load is 5. A write is one write however many cards it carries. |
| **Remove** | **5** (6 on the first push after a build change) | 0 | 0 | 1 collection write (tombstones) + 1 locks write immediately, plus 3 deck soft-delete writes that are pushed only **after the 10 s Undo window** ([[Accounts and Sync]] SYNC-035, `DECK_UNDO_MS`; the push plan skips a deck tombstone until `pushAfter`), so the last 3 writes land about 10 s after the click (a later sync pass picks them up). A later clean-up hard-deletes the 3 decks after 30 days: **3 deletes**. |
| Another device pulling it | 0 | 5 (the changed docs) + 2 (the `state` and `decks` delta queries) = **≈ 7** | 0 | cold pull of the collection document downloads ≈ 254 KB |
| Replace one set by another | 5 (6 after a build change) | 0 | 0 | same as Load |

(The write count assumes the Tracked stores batch each document once per push, SYNC-040…; if the sync log also writes the `tags` document it is 1 more. The builder records the count it observes, H-205 Accept.)

### Free-tier headroom ("Spark", numbers as of 2026-11-25)
- **Loads per day:** 20,000 writes / 5 = **4,000 loads (or Remove actions) a day** if nothing else wrote (3,333 at the 6-write worst case); ≈ **416 to 500 Load + Remove cycles** (12 or 10 writes each) at a 25 % share (5,000 writes) of the daily budget, which leaves 75 % for normal sync. Ten testers who load, remove and reload five times each use at most 10 × 5 × 12 = 600 writes (3 % of the day).
- **Reads:** 0 for Load or Remove; a second device ≈ 7 reads. 50,000 / 7 ≈ 7,000 cold pulls a day.
- **Outbound data:** 10 GiB / 30 ≈ 358 MB a day ÷ 254 KB ≈ **≈ 1,400 cold pulls of the Large document a day** across all testers (≈ 1,300 counting the decks); a reopen on the same device downloads 0 (delta cursor). Uploads count as free ingress.
- **Deletes:** 3 per Remove, 20,000 / 3 ≫ any use.
- **Verdict:** all within the free tier; **no RJ decision on quota or plan is needed**. The only limit a heavy tester could hit first is the day's outbound data at ≈ 1,400 cold Large pulls, i.e. not with friends-and-testers numbers.

## Data contract
```ts
// Shapes only. Reuses SPEC-003 StoredCollection, SPEC-006 UserDeck, SPEC-008 DeckLock.
type TestSetId = 'small' | 'large';
const TEST_SETS: Record<TestSetId, number> = { small: 150, large: 5000 };       // entries (owned printings)
const TEST_MARKER_PREFIX = 'test-data-';                                       // catalogVersion = `test-data-${n}`
const isTestCollection = (c: StoredCollection) => c.catalogVersion.startsWith(TEST_MARKER_PREFIX);
const TEST_DECK_IDS = [1, 2, 3].map(sampleDeckId);                              // 00000000-0000-4000-8000-00000000000N
const isTestDeck = (d: UserDeck) =>
  TEST_DECK_IDS.includes(d.id) && d.catalogVersion.startsWith(TEST_MARKER_PREFIX);

// Build flag (web/src/environments/*): public config, never a secret.
interface Environment { testDataEnabled: boolean }

// Operations (browser side; all through the tracked stores so sync stamps them)
loadTestData(set: TestSetId): Promise<void>;     // TEST-020…023
removeTestData(): Promise<void>;                 // TEST-050…051: cards, test decks, test locks only
```
`generateLargeSample(n)`'s `STAMP`, `catalogVersion: 'generated'` and deck `catalogVersion: 'sample'` become `test-data-${n}` when used for Load (the dev tool may keep its old values).

## Acceptance criteria
1. **Given** a signed-out visitor **When** they open `/collection` **Then** they see the sign-in panel and no "Load test data" (TEST-001).
2. **Given** a signed-in user with an empty collection and `testDataEnabled` true **When** they open Collection **Then** "Add to your collection" and a text button "Load test data" show; choosing it opens a dialog with Small ("150 cards, 3 decks") and Large ("5,000 cards, 3 decks") and Load disabled until one is picked (TEST-002, TEST-003).
3. **Given** the dialog **When** they pick Large and press Load **Then** 5,000 tiles render on Collection (summary "N copies of 1,667 cards"), the banner "You're looking at test data: invented cards, not yours." with **Remove test data** shows, and the notice "Test data loaded." appears (TEST-010, TEST-020, TEST-023).
4. **Given** the Large load **When** the push finishes **Then** `users/{uid}/state/collection` has `catalogVersion == "test-data-5000"`, 1,667 keys under `cards`, and **one** `set()` wrote it; the serialized document is **≤ 262,144 bytes** (25 % of 1 MiB; measured ≈ 254 KB) (TEST-020, size section). The builder records the measured size and the write count (**5 expected; 6 is also correct on the first push after a build change**).
5. **Given** the Large load **When** the user reloads and then signs in on a second device **Then** both show the banner and the same tiles with no `/api` call for cards and no dev key (TEST-024, TEST-031).
6. **Given** the account has one deck of its own and the user loads Small **When** the load finishes **Then** the own deck is still there and three decks named "Generated Locked A", "Generated Locked B", "Generated Open" are added, the first two locked (TEST-021).
7. **Given** Small is loaded **When** the user presses **Change set** in the banner, picks Large and presses Load **Then** a confirmation "Replace your test data with the Large set? Your own decks are kept." shows; Cancel writes nothing; Replace leaves 5,000 tiles, still three test decks, and the own deck intact (TEST-010, TEST-022).
8. **Given** a collection that holds real cards (`catalogVersion` not `test-data-`) **When** the page shows **Then** no "Load test data" is offered; **and** a Load attempted when real entries appear at write time writes nothing and shows "You already have real cards, so test data can't be loaded." (TEST-012).
9. **Given** test data is present and one own deck exists **When** the user presses **Remove test data** and confirms **Then** the collection is empty, the three test decks and their locks are gone, the own deck and its lock are intact, the notice "Test data removed." shows, and the Collection empty state returns (TEST-050…052).
10. **Given** Remove finished **When** another device syncs **Then** it shows no banner, no test cards and no test decks (TEST-051), and the Remove costs 5 writes (6 on the first push after a build change) and 0 reads, the three deck writes pushed about 10 s after the click (SYNC-035 Undo window) (recorded as a range).
10a. **Given** test data is present **When** Remove finishes **Then** the collection document holds `catalogVersion == ""` and no cards, the banner is gone, Collection shows the empty state with "Load test data" (flag on), and a reload and a second device agree; **and Given** any collection with zero cards, whatever its `catalogVersion` **Then** it is not test data (no banner, TEST-002 offers Load) (TEST-030, TEST-050).
11. **Given** test data is present **When** the user opens "Add to your collection" **Then** the notice "Remove your test data before adding cards, so test and real cards don't mix." shows with **Remove test data** and **Cancel**; **Remove** runs the removal and then opens the import (TEST-032).
12. **Given** test data is present **When** a Replace import commits **Then** the new collection carries the real `catalogVersion`, the three test decks and their locks are removed in the same commit, and the banner is gone (TEST-033).
13. **Given** `testDataEnabled` is false **When** an empty-collection user opens Collection **Then** there is no "Load test data"; **and** a user whose account still holds test data sees the banner and **Remove test data** (TEST-040, TEST-041).
14. **Given** the Firestore rules emulator **When** a test-data load is written with the reserved ids and `test-data-5000` **Then** the rules accept it (owner), with no rules change (TEST-030; a rules test is added to `web/rules-tests`).
15. **Given** the generated catalog **When** its cards render **Then** every name carries a number, no image is a Riot asset and no Riot or Riftbound logo shows (TEST-011, V-012).
16. **Given** a signed-in user on the dev build **When** they use the `/styleguide` sample tool **Then** it works as before (dev only, `stores.raw`), unaffected (TEST-005).
17. **Given** this spec **When** V-009 is run **Then** every research fact carries a source, tier, status and `as_of`, requirements are numbered with MUST / SHOULD / MAY and Given/When/Then, and the wikilinks resolve.

## Out of scope
The fixture sample on live and an "Edge cases" set (TEST-006); other card data on live (H-020, ADR-0004); editing test data; per-tester roles (everyone signed in sees the tool while the flag is true; the data is the user's own account, nobody else can read it); analytics on use; any change to SYNC-151 or the header.

## Open questions / BLOCKED
Nothing blocks the build. Defaults below stand unless RJ answers (the spec-writer's reading, `review`):
1. **Entry point:** Collection page only (empty-state button and banner), not the account menu. The menu is possible but touches SYNC-151's exact order and divider count (Accounts and Sync is being edited by H-206). **Default: Collection only.**
2. **Fixture sample on live:** not offered, because it needs `/api`. A static fixture catalog would add an "Edge cases" set (unassigned copies, missing printing, unresolved card). **Default: skip for now.**
3. **Removing the tool's code:** keep Remove, banner and generated catalog for one release after the flag goes off, then delete them. **Default: yes.**
4. **Switching sets:** a **Change set** text button in the banner (TEST-010, TEST-022). **Default: yes**; dropping it (Remove, then Load) is a harmless cut, then AC 7 is tested at the store level.
5. **Privacy notice:** test data is ordinary collection and deck data (an invented card id and count), so [[Privacy Notice Draft]]'s existing lines ("your collection: card identifiers, counts and printing identifiers", "collection, tags, decks and locks") already cover it; **no wording change is required**. A one-line mention is optional, not needed. Another session edits that draft, so it is not touched here.

## Changelog
- 0.1 (2026-11-25, H-204): new. Test data on live: Collection-only entry, Small / Large generated sets, reserved `catalogVersion` marker and deck ids (no rules change), Load / Remove through the tracked stores, flag-based sunset, size and quota numbers (Large ≈ 254 KB, 6 writes per Load or Remove).
- 0.1.1 (2026-11-25, H-204 attempt 2): H-230: after Remove the collection's `catalogVersion` is `""`, a collection with no cards is never test data (TEST-030, TEST-050, TEST-051), new AC 10a. H-231: write counts corrected to 5 per Load or Remove (6 on the first push after a build change, the account update), Remove's three deck writes are pushed after the 10 s Undo window (SYNC-035); quota numbers and ACs 4 and 10 updated to ranges.
- 0.1.2 (2026-11-25, H-204 merge into `dev`): renumbered SPEC-012 → SPEC-013 (H-201 [[Changelog]] took SPEC-012 first); depends-on pin [[Accounts and Sync]] 0.14.1 → 0.15.0 (H-206 changed only usernames, SYNC-112/153/156; SYNC-035, 095, 142, 151 used here are unchanged). No requirement changes.
- 0.1.3 (2026-11-25, H-212): depends-on pin [[Accounts and Sync]] 0.15.0 → 0.16.0 (H-212 changed only the username rules, SYNC-112/153/156/160; nothing used here changed; test data writes no `username`). No requirement changes.
