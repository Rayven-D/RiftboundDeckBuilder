---
tags: [spec, accounts, sync, firestore]
id: SPEC-010
version: 0.16.0
status: draft
depends_on: [SPEC-003, SPEC-004, SPEC-005, SPEC-006, SPEC-007, SPEC-008, SPEC-009]
research: ["[[Firestore Data Shape]]", "[[Card Data & Images]]", "[[Privacy Notice Requirements]]"]
decisions: ["[[ADR-0007 Firebase Accounts and Firestore]]", "[[ADR-0001 Tech Stack]]", "[[ADR-0005 MVP Product Defaults]]", "[[ADR-0006 Two Imports - Collection and Decks]]"]
board: H-061, H-074, H-080, H-134, H-103, H-105, H-107, H-109, H-111, H-112, H-117, H-118, H-119, H-121, H-083, H-146, H-171, H-172, H-152, H-174, H-179, H-183, H-206, H-212
as_of: 2026-11-25
updated: 2026-11-25
---
# SPEC-010: Accounts and Sync

## Summary
> Read this first. Full detail below only if needed.

**Purpose:** accounts so a user's collection, tags, decks and deck locks follow them across devices
([[ADR-0007 Firebase Accounts and Firestore]], amendments 2026-11-24 and 2026-11-24 (2)). **Account-only (v0.12,
RJ decision 17):** there is one mode. All of a user's collection, tags, locks and decks live in their account
in Firestore; importing cards or decks needs an account (RJ decision 13); Home and Tournaments are public. The
browser holds only a **cache** of the account, there to make loading fast and to work offline (SYNC-140…SYNC-145):
the signed-in session plus the account data the app has downloaded. Sign-out, account deletion and a different
account signing in clear it; it is never uploaded; deleting the account deletes everything (SYNC-095).

**What v0.16 changes (H-212, RJ 2026-11-25 in chat: "stick with my allowed characters. set up our own validation";
asked what the rules should check, RJ chose "Rules check 20 too").** The **allowed set is RJ-confirmed** (Open question
14 closed, decision 21): letters and numbers of any script, the combining marks they need, spaces, `.` `_` `-` `'` `’`,
first character a letter or digit, no emoji. The **Firestore rules now enforce it themselves** (new SYNC-160): when a
request changes `username`, the rules require a string, the allowed set and **1 to 20 code points**, no variation
selector, and no leading, trailing or doubled space; the old "`size()` 1 to 80, character set client-only" backstop
(v0.15) is replaced (`size()` at most 80 stays as a cheap first bound). **Invariant:** every name the client accepts the
rules accept, and every name the rules accept the client would accept, except what rules cannot see (NFC) and Unicode
version skew (SYNC-160 (f)). **To verify before it counts as done:** that the rules' regular expression engine
supports `\p{..}` classes and counts repetitions in code points, in the emulator and in production (SYNC-160 (g)); the
fallbacks never loosen silently. Unchanged legacy names (v0.14 emoji names) still pass because the checks run only when
`username` changes; create still denies `username`. Build: board H-213.

**What v0.15 changes (H-206, RJ 2026-11-25: "let's limit usernames to 20 characters and not include emojis").** The
username is at most **20 characters** (Unicode code points of the NFC-normalized, trimmed, space-collapsed name; was 24
graphemes and 500 UTF-16 units) and has **no emoji**. **Allowed set:** letters and numbers of any script (with the
combining marks those scripts need), spaces, and `.` `_` `-` `'` `’`; nothing else (SYNC-153); confirmed by RJ in v0.16.
The v0.15 rules backstop (`size()` at most **80**, no character check) is superseded by SYNC-160. The counter
reads `n / 20`. Storage is unchanged (`users/{uid}.username`, not the Auth `displayName`). Build: board H-207.

**What v0.14 changes (H-174, RJ 2026-11-24, [[ADR-0006 Two Imports - Collection and Decks]] "Header and import
entry points", [[Brief H-175]] "RJ decisions", gate H-178; H-179 answers).** The header's Import button is replaced
by the **account control** (SYNC-150): signed out, **Sign in**; signed in, the **username** at the top right, opening
the account menu (SYNC-151): username, "Signed in as", status, Sync now, **Account Information**, **Theme**,
Privacy notice, Sign out. There is no Settings page and no `/account` route: **Account Information** is a dialog
with the username (**Change**) and **Delete account and data** (SYNC-152). New: **username** (SYNC-153…156, rules SYNC-160; limits changed in v0.15, rules check in v0.16): 1–20
characters, no emoji, not unique, asked once after an account is created and skippable, stored in the
account document `users/{uid}.username` (data contract, rules SYNC-112, privacy SYNC-100 and SYNC-103 item 4 updated);
**theme per device** (SYNC-157, 158): System (default) / Light / Dark in browser storage under the key `device-theme`,
**outside the `rift.` prefix and outside the cache**, so it survives sign-out, account deletion and another account
signing in (SYNC-141 d, SYNC-142), set from the account menu and from a **footer switch** for everyone, never synced.
`/import` is **removed** and, like any unknown path, goes to Home (RJ's later word, H-178 decision 6; no not-found
page); each import opens in a dialog on its own page; Home's buttons link to `/collection?add=1` and `/decks?import=1`
(SYNC-159). Gate wording (SYNC-009, SYNC-006 return path, ACs 46, 52, 57) no longer names Import. ACs 71–80; open
question 13. **H-179 recorded (RJ 2026-11-24):** open question 10 answered ("don't merge `dev` → `main` until sign-in is
ready in production; no deploy guard"), open question 11 confirmed as specced (whole-account cache; view state and
printing codes stay per device), decision 18. Code changes: board H-176 (list in Impacts).

**What v0.13 changes (H-152, from [[Privacy Notice Requirements]]).** SYNC-101 is no longer `BLOCKED`: the privacy
notice is a public page at `/privacy` (SYNC-104) linked from the sign-in dialog, the account menu and the footer,
and SYNC-103 is the 24-item checklist of what it states (Auth IP and user agent, Google as processor and US
transfer, 180-day backup retention, browser storage and no cookie banner, DNT / GPC, no Riot account data and the
Riot line, age line, effective date and change notice, image host if third-party). Launch is email link only
(H-063), so the text does not name Google sign-in. The draft text is [[Privacy Notice Draft]] (`review`, not legal
advice, RJ-supplied blanks); **RJ's approval of it is the gate** for SYNC-007 condition 2. ACs 65–70. Build item
listed for `builder`.

**What v0.12 changes (H-171, RJ decision 17, ADR-0007 amendment 2).** The `signInEnabled` build flag and the
local-only mode are gone: SYNC-008 is withdrawn, SYNC-007 becomes the **production release rule** (the
account-only build is not deployed to production until Auth providers (H-063), the privacy notice (H-152) and the
Firestore rules are done), SYNC-009 (the gate) and SYNC-002 (lazy `firebase` loading) hold for every build,
SYNC-052 is withdrawn (it only existed for the local delete action, SPEC-007 COLL-074, also withdrawn). New
section **M. Browser cache, SYNC-140…SYNC-146**: what is cached (the whole collection, tags, locks and every
deck, because a full read at first sign-in already downloads them, plus the session and the public card catalog),
when it is cleared, that it is never uploaded, and that scrolling reads nothing from Firestore. Card and deck
lists scroll with no pagination (SPEC-007 COLL-093, SPEC-005 OWN-084, SPEC-004 CAT-079). Code changes: board H-172.

**What v0.8 changes (RJ decision 13).** No Combine dialog, no "Keep a copy", no signed-out data. The first
sign-in on a device clears it, then downloads the account (writes at most 1 document, SYNC-050). Sign-out,
the half-deleted branch and account deletion clear the device. Decks, Collection and "Add to your
decks" are gated behind sign-in (SYNC-009). Items marked **built H-081** were the v0.8 build work (done); the rest
is as built in H-062. (v0.8's "account-required mode" is now simply how the app works, v0.12.)

**What v0.10 changes (UI review 2026-11-24, RJ decision 15).** Sign-in dialog: with email link as the only
provider the form shows at once; a send-failure string of its own; a sent state with the address, **Send again**
and **Use a different email**; the link returns to the page sign-in started from and says "You're signed in."
once (SYNC-006). Account menu: "Signed in as {email}" (SYNC-003, allowed by SYNC-100); during an unfinished
deletion no Sync now, no pending count, and **Try deleting again** (SYNC-096). Delete dialog says up front when a
fresh sign-in is needed and offers **Sign out** (SYNC-095). Sign-out dialog: "Syncing…" and the plain line under
the warning (SYNC-090). Gate panel: one line, no heading (RJ decision 15, SYNC-009). Build items: H-140…H-145,
plus H-104, H-106, H-110, H-115, H-122 extended (all built, board `done`).

**What v0.11 changes (H-146, documents the build; RJ 2026-11-24).** No behaviour change. "Disabled" for Send link,
Send again and Use a different email means `aria-disabled="true"` with focus kept (SYNC-006); the other-device
confirm dialog's strings ("Finish signing in", "Email address", Cancel, Finish sign-in) are recorded (SYNC-006,
AC 39); new **SYNC-087** records the three notice kinds (success 6 s polite, info and error stay until OK, only
error assertive; COLL-054 Undo outside it); AC 52 says when the URL is `/import?type=deck`. RJ confirmed Open
questions 1–9 and the title "Finish signing in" ("all those look good to me", 2026-11-24).

**Key rules**
- SYNC-001…009 (v0.12, account-only): signed out or with a lost session, only Home
  and Tournaments show content; Decks and Collection keep their page header and show a one-line sign-in
  panel below it (RJ decisions 14 and 15), and Tournaments shows no
  deck controls (SYNC-009, always on). The gate is decided from the sync log without loading Firebase. The `firebase` package is lazy-loaded only when the user
  starts a sign-in, at start-up when a session is **expected**, or at start-up when the URL is an email sign-in
  link (SYNC-002). **Production release rule (SYNC-007):** the account-only build is not deployed to production
  until H-063 (Auth providers), H-152 (privacy notice, SYNC-101) and the Firestore rules (SYNC-117) are done; until
  then production keeps its current build and only preview channels get the new one. `appVersion` must change
  with every build and the preview build has its own deploy path (SYNC-007, SYNC-012; H-078).
- SYNC-010…019: the layout is the [[Firestore Data Shape]] one: `users/{uid}`, `users/{uid}/state/collection`,
  `…/state/tags`, `…/state/locks`, `users/{uid}/decks/{deckId}`. Every document has `schemaVersion`,
  `updatedAt` (client clock) and `syncedAt` (server time, the delta cursor). Printing codes, view state and the
  import Undo snapshot are **not** synced (SYNC-019).
- SYNC-030…035: a device-local **sync log** stamps a change time on every card, tag, tag target, lock and
  deleted deck on every user save, and keeps **tombstones** for 30 days. Deck `updatedAt` and
  `deletedAt` are made monotonic too (SYNC-031). The existing store record shapes (SPEC-003/006/007/008) do not
  change, except tag ids become 8 characters (SYNC-016).
- SYNC-040…053: open = account check + pull changes since the cursor (3 reads at start-up, 2 later), merge,
  push what is newer locally. Writes made by the merge keep the pulled times and are never pending
  (SYNC-041). **First sign-in** on a device: clear every local store and the sync log, full read, download;
  the account is linked only once that completes, and an interrupted one starts over (SYNC-048). It never
  uploads device data and writes **at most 1 document**: the account creation, or one account `update()` for
  a new build (SYNC-050). No Combine (SYNC-049). No write before a successful account check (SYNC-053);
  whether a write is a create comes from `cloudDocs`.
- SYNC-060…068: **latest change wins** per card (`cardKey` record: quantity and printings together), per tag,
  per tag target's assignment list, per deck and per lock. Ties go to the cloud copy.
  New stamps are monotonic per item (`max(now, known + 1)`) so clock skew cannot undo an edit made on top of a
  newer one.
- SYNC-070…077: locks sync per deck. Deletion wins over a lock; a deck edited elsewhere while locked stays
  locked with its new cards; a merge that leaves a locked deck short **keeps it locked and flagged** (SPEC-008
  SHARE-033) with a notice (RJ decisions 2–4). **Every deck status is identical on every signed-in device once
  synced** (SYNC-077): statuses are computed only from synced data and the card catalog, never stored.
- SYNC-080…087: offline is normal; signed in, the local cache keeps working offline, changes queue on the
  device and push later; a write not confirmed in time stays pending and is checked by the next pull
  (SYNC-080); status line shows Synced / Syncing / Offline / Sync paused / Sync error. Notices come in three
  kinds: success closes after 6 s, info and error stay until OK, only error is assertive (SYNC-087, v0.11).
- SYNC-090…098: sign-out **clears this device** (one choice, no Keep a copy); unsynced changes are flagged
  first with **Sync now** (SYNC-090). "Delete account and data" deletes the account document first (the
  "deleted" marker other devices check), then every other cloud document, then the sign-in account, and always
  clears the deleting device. With email link, the user signs in again first. An unfinished deletion stops all
  sync on that device (no Sync now in the menu); the account menu offers **Try deleting again**, and **Cancel
  deletion** while nothing was removed (RJ decision 12; built H-127; v0.10 menu changes built H-142). A device that finds the account half-deleted signs out and
  **clears** itself (SYNC-097, v0.8).
- SYNC-110…119: owner-only security rules with per-document field validation; the only rule lookup is
  `existsAfter()` on document creates (so a deleted account is not recreated; counted as ≤ 1 read per create,
  billing details `unverified`); index exemptions on every field
  but `syncedAt`; a rejected write stays pending and is reported, and is retried when **this device's** build
  changes (SYNC-118).
- SYNC-120…125: cost limits from [[Firestore Data Shape]] (debounce ≥ 2 s, no listener on all decks).
- SYNC-100…104 privacy (SYNC-101 notice, 103 contents checklist, 104 `/privacy` route and links, v0.13); SYNC-130…131 adapters and pure merge functions.
- **SYNC-150…159 (v0.14): header, username, theme, no `/import`.** 150 header control; 151 account menu (order, offline);
  152 Account Information dialog (username, Delete account and data); 153 username rules; 154 the one-time prompt; 155
  Change username and Save; 156 stored in `users/{uid}.username`, cached in the sync log, not in Auth; 157 theme per
  device (`device-theme`, outside the cache); 158 theme controls (menu and footer); 159 `/import` removed, `?add=1` /
  `?import=1`.

**Shared types:** `AuthService`, `RemoteStore`, `PushChanges`, `PushOutcome`, `RemoteErrorCode`,
`StoredSyncLog`, `SyncStatus`, Firestore document shapes `AccountDoc`, `CollectionDoc`, `TagsDoc`, `LocksDoc`,
`DeckDoc`. Source of truth in code: `web/src/app/shared/sync/sync-types.ts` (v0.11 matches it; the v0.10
additions were built in H-141, H-143 and H-145).
**Depends on:** [[Collection Import]] v0.12, [[Tournament Deck Catalog]] v0.6, [[Your Decks Ownership View]]
v0.7, [[Deck Import]] v0.9, [[My Collection]] v0.13 (pin-only), [[Shared Cards and Lock-in]] v0.4.4 (SPEC-009 [[Runes Assumed Owned]]
is withdrawn since 2026-11-24: runes are cards, so nothing here treats them differently). **Consumers:** H-062 (built v0.7), H-081 (sign-in gate, built as "account-required mode"), H-127 (Cancel deletion), H-077
(first-sign-in writes), H-078 (build id and preview deploy), v0.10 UI items H-104, H-106, H-110, H-115, H-122 and
H-140…H-145, H-172 (builds v0.12: removes local-only mode, adds the browser cache rules), H-173 (scrolling brief), H-176 (builds v0.14: header, username, theme, FABs, no `/import`), [[ADR-0007 Firebase Accounts and Firestore]].
**Open:** the ADR-0007 amendments are accepted (RJ, 2026-11-24, decisions 13 e–h and 17). Open questions 1–9 were
confirmed by RJ on 2026-11-24 (defaults kept, see Open questions); questions 10–11 (v0.12) were **answered by RJ on 2026-11-24 (H-179)**: hold `dev` → `main` with no deploy guard, whole-account cache; **question 13 (v0.14) is new** (proposals for RJ, defaults specced, nothing blocks H-176). The privacy-notice content is specified (v0.13, SYNC-101, 103, 104; draft [[Privacy Notice Draft]] awaits RJ's approval and blanks, open question 12); production does not get the account-only build until RJ approves the notice and H-063, H-152 and the Firestore rules are done (SYNC-007). Built (board `done`): the sign-in gate (H-081), Cancel deletion
and the account-menu Try again (H-127), first sign-in at most 1 write (H-077), per-build `appVersion` and the
preview deploy path (H-078), the v0.10 UI items (H-140…H-145 and the extended H-104, H-106, H-110, H-115, H-122)
and the notice kinds (H-116).

## Purpose
RJ wants users to be able to sign in so the collection and decks persist across devices (ADR-0007, RJ
2026-11-23). This spec defines who can sign in and how, exactly what is stored where, how two devices'
changes are combined, and how an account and its data are deleted. It is the contract for H-062 (client
sync, `firestore.rules`, `firestore.indexes.json`) and for H-081 (the sign-in gate).

There is one mode (v0.12): the account is the home of the user's data. This spec adds one thing to the
features: the sign-in gate on Decks, Collection and Tournaments' deck controls (SYNC-009). Inside the gate,
Collection, Decks, tags and locks behave as their specs say; this spec decides where their records live (the
account, with a browser cache of it, SYNC-140…) and which version wins.

## Definitions
- **Signed out / signed in**: whether a Firebase Auth user is present in this browser.
- **Device setting** (v0.14): a preference that belongs to one browser, not to an account: today only the theme
  (SYNC-157). It is not account data, not part of the browser cache, never synced, and no cache-clearing event
  (SYNC-142) touches it.
- **Gate**: the check of SYNC-009 that decides whether Decks and Collection show their content or a
  sign-in panel, and whether Tournaments shows its deck controls. Always on (v0.12).
- **Browser cache** (v0.12): everything the browser keeps for the signed-in account: the sign-in session, the
  local stores below, the sync log, and the public card catalog (SYNC-141). It is a copy for speed and offline
  use, never the record of truth and never uploaded (SYNC-143).
- **Stale local data**: any card, tag, deck or lock in the local stores when a first sign-in (SYNC-048)
  starts on this device: left by another account, by a lost session of another account, or by an older build
  (including a build from before the account-only change that saved data without an account).
- **Local stores**: the browser stores of SPEC-003 `CollectionStore`, SPEC-007 `TagStore`, SPEC-006
  `DeckStore`, SPEC-008 `DeckLockStore`. They are the working copy the screens read, and they hold only the
  signed-in account's data: they are the cache of that account's documents (SYNC-141).
- **Cloud**: the user's Firestore documents (SYNC-010).
- **Item**: the unit that "latest change wins" compares (SYNC-060): a collection card (`cardKey`), a tag (`TagId`),
  a tag target's assignment list (`TagTarget`), a deck (`deckId`), a lock (`deckId`).
- **Change time `t`**: an item's last change, milliseconds since the Unix epoch, from the client clock, stamped
  per SYNC-031.
- **Tombstone**: a record that an item was deleted, with its change time, kept for 30 days (SYNC-034).
- **Sync log**: the device-local record of change times, tombstones, pending items and cursors (SYNC-030).
- **Pending item**: an item changed locally and not yet confirmed written to the cloud.
- **Cursor**: the largest `syncedAt` this device has received for the `state` documents, and for `decks`.
- **Linked uid**: the uid this browser's cache last completed a first sync with (`StoredSyncLog.uid`,
  SYNC-048). Everything that clears the cache clears it too (SYNC-091, SYNC-142), so it survives only a lost
  session (SYNC-086), where signing in again with the same account resumes.
- **Session expected**: `StoredSyncLog.sessionExpected`, true from a successful sign-in until any sign-out,
  account deletion or the SYNC-097 sign-outs. It decides whether `firebase` loads at start-up, and with the
  linked uid it opens the gate (SYNC-009).
- **Account check**: a `get` of `users/{uid}` (1 read) that succeeds and finds the document (SYNC-053).
- **Now**: the client clock.

## Design decisions (summary)
1. **Account-owned, cache-first** (v0.8, rewritten v0.12). The account is the only home of user data (RJ
   decision 17). The browser stores are a **cache** of one account: the screens read them (so pages open at
   once and work offline), sync runs beside them, and they hold nothing before the first sign-in completes and
   nothing after sign-out (RJ decisions 13, 17; this replaces ADR-0007 "Accounts stay optional" and its
   local-only mode). Device data is never uploaded into an account at sign-in, which removes the Combine merge
   entirely. Keeping the existing local-first engine (stores as the working copy, a sync log, pending queue) is
   a design choice: it already gives the cache, offline use and the one-document-per-collection reads RJ asked
   for, so v0.12 removes the mode, not the engine.
2. **Layout as in [[Firestore Data Shape]]**, including the `state/` subcollection instead of ADR-0007's first
   `collection/…`, `tags/…` sketch. Where ADR-0007's text says `users/{uid}/collection`, `decks`, `tags`, this
   spec's layout is the authoritative one.
3. **Sync bookkeeping in its own store, not in the records** (spec-level choice). [[Firestore Data Shape]]
   proposed adding per-card `t` and tombstones to `StoredCollection`. Existing consumers load a record, change
   it and save it whole, so tombstones inside the record would leak into every consumer. A separate sync log,
   written in the same save, keeps SPEC-003/006/007/008 record shapes as they are.
4. **Two small shape additions in the cloud** beyond the Data Shape note, both needed to tell "removed" from
   "never had": tag assignments carry a per-target change time (`{ a, t }`), and locks carry an unlock
   tombstone (`{ lockedAt | null, updatedAt }`). Sizes stay within the note's estimates (+≈ 10 B per tag target,
   +≈ 12 B per lock).
5. **Latest change wins** per item, with monotonic stamps (SYNC-062) and ties to the cloud copy (SYNC-061).
6. **Locks follow SPEC-008's accepted rules** across devices: earliest lock wins, short locks stay locked,
   deletion removes the lock (SHARE-024, SHARE-030…033).
7. **Map caps in the rules are raised above [[Firestore Data Shape]]'s 200 for tags** (spec-level choice). The
   rules cap each map at about twice the largest live count the specs allow, because tombstones sit in the same
   map for 30 days: `cards` 6,000 (Data Shape worst case 3,000 cards), `tags` 400 (COLL-022: 200), `assignments`
   6,000 (Data Shape worst case 3,000 targets), `locks` 400 (DECK-092: 200 decks). When tombstones would push a map
   over its cap, the oldest tombstones are dropped early (SYNC-119).
8. **The account document is the "account exists" marker.** It is created only by the first-sign-in flow and
   deleted first when the account is deleted, so every other device can tell a deleted account from a missing
   session (SYNC-053, SYNC-097).
9. **The username lives in the account document, the theme on the device** (v0.14). RJ's ADR says the username is
   "stored with the account" and the board row says "the account document", so it is one optional field,
   `users/{uid}.username` (SYNC-156): it follows the user to every device, costs no extra read (the account check
   already reads that document, SYNC-053) and one write per change, and is deleted with the account. [[Brief H-175]]
   U6 had recommended the Firebase Auth `displayName` instead (no rules change); the account document was chosen
   because the board row asks for it and because SYNC-100's "nothing personal in Firestore" is about **email and
   provider data**, which stay out. Spec-writer choice, flagged in Open question 13. The **theme** is the opposite
   case: RJ says it is per device and "not stored in the account" (ADR-0006), so it is a **device setting** in its
   own browser key outside the cache (SYNC-157).

## Requirements
### A. Modes, sign-in and the gate
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-001 | MUST | **Account-only** (v0.12; replaces v0.8 "Accounts by mode"). Importing cards or decks, and every page that shows the user's cards or decks, needs an account (SYNC-009); Home and Tournaments need none. All of a user's collection, tags, locks and decks are saved in their account (SYNC-010) and nowhere else as the record of truth: there is no browser-only storage of user data, no no-account import and no build in which sign-in is optional or off. The browser keeps only a cache (SYNC-140…SYNC-146). | RJ 2026-11-24 (decisions 13, 17); [[ADR-0007 Firebase Accounts and Firestore]] amendments 2026-11-24 and 2026-11-24 (2) (accepted) |
| SYNC-002 | MUST | Unless one of the three triggers below applies, the app **does not load** the `firebase` package and makes **no request** to any Firebase Auth or Firestore endpoint, whether or not a linked uid is stored. The package is loaded only: (1) when the user **starts** a sign-in: **Send link** in the email-link form or **Continue with Google** (opening the Sign in dialog alone loads nothing, wherever it was opened from: the header or a gated page's panel, SYNC-009); (2) at start-up when `sessionExpected` is true (SYNC-004); (3) at start-up when the page URL is an **email sign-in link** (query parameters `mode=signIn` and `oobCode`, which Firebase adds to the link). The app detects (3) from the URL without loading `firebase`, then completes that sign-in (SYNC-006). There is no build flag that turns these triggers off (v0.12: `signInEnabled` is removed). The gate (SYNC-009) is decided without loading the package. As built, except that the v0.11 build skips all three triggers when `signInEnabled` is false (removed by H-172). | [[ADR-0007 Firebase Accounts and Firestore]] consequences (lazy-loaded on sign-in); as built in H-062 (`isEmailLinkUrl`) |
| SYNC-003 | MUST | A **Sign in** action is in the app header (SYNC-150) and on the SYNC-009 panels. It opens a dialog: "Sign in to import your cards and decks. They're saved to your account, so you'll see them on any device you sign in on. New here? Signing in with your email creates your account." (v0.14: the last sentence is new, approved by RJ in H-178 decision 7; one **Sign in** label serves new and returning users, because an email-link sign-in creates the account) followed by the enabled sign-in providers laid out as SYNC-006 says (`authProviders`; v0.10: with email link as the only provider there is no provider button, only the email form; with two or more, one button per provider) and a link to the privacy notice (SYNC-101). There is **no** warning about stale local data; the first sign-in clears it silently (SYNC-048; RJ decision 13 g). Signed in, the header shows the account control (SYNC-150) and its menu (SYNC-151) with the sync status (SYNC-084), **Sync now**, **Account Information** (a dialog where **Delete account and data** lives, SYNC-152, SYNC-095), **Theme** (SYNC-158) and **Sign out** (SYNC-090); during an unfinished deletion it offers **Try deleting again** and, when allowed, **Cancel deletion**, and no Sync now (SYNC-096, v0.10). **Identity line (v0.10, H-109; built H-141):** the line of the account menu after the username line (SYNC-151) and above the sync status reads "Signed in as `{email}`", where `{email}` is the signed-in user's address exactly as Firebase Auth reports it on this device (`AuthService.currentEmail()`), shown in full (it may wrap; it is never cut off without the full address being available to assistive technology). It is plain text, not an action. If Auth reports no address (`null`), the line is left out. The address is read from Auth each time the menu renders; it is never written to a local store, the sync log, Firestore, logs or analytics (SYNC-100). (Confirmed by RJ 2026-11-24, Open question 4.) **Placement (v0.14; replaces the interim placement and the "Settings page" plan; there is no Settings page and no `/account` route):** Sign in and the signed-in account control are the one header control of SYNC-150; **Delete account and data** moved out of the menu into the Account Information dialog (SYNC-152). Offline, Sync now and Sign out are disabled and the menu shows "You're offline." (SYNC-081); Account Information stays enabled (SYNC-151). v0.8 changes only the dialog text (built H-081). | [[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24; RJ decision 13; design rule; interim placement as built in H-062 ([[Validation H-062]]); v0.14: [[Brief H-175]] RJ decisions 2, 7 (H-178) |
| SYNC-004 | MUST | A successful sign-in sets `sessionExpected = true`. **Every** sign-out (SYNC-090), account deletion (SYNC-096) and the SYNC-097 `deleted` and half-deleted sign-outs set it to false: each of them clears the sync log with the other local stores (SYNC-091), and an empty log has `sessionExpected: false`. While it is true the app restores the session at start-up (loading `firebase`) and syncs. The **linked uid** is written only when a first sync completes (SYNC-048) and is cleared by everything that clears the device. If the tab closes after sign-in but before the first sync completed, the next start-up restores the session and runs the first-sign-in flow again from its first step (SYNC-048). As built, except that the Combine Cancel and Keep a copy paths no longer exist (built H-081). | design rule; RJ decision 13 a |
| SYNC-005 | MUST | A failed or cancelled sign-in changes no local data and shows "Sign-in didn't complete. Your data on this device is unchanged." (cancelled by the user: no message). **v0.10:** a failed **Send link** or **Send again** is not a failed sign-in and does not show this text; it shows the SYNC-006 send-failure text. | design rule; UI review 2026-11-24 #5 (H-105) |
| SYNC-006 | MUST | **Providers.** Two providers are specified: **email link** and **Google**. At launch only **email link** is on (RJ decision 1, 2026-11-23; it is the only provider RJ enabled in the console, H-063). The enabled providers come from build configuration: environment `authProviders`, default `['email-link']`. The SYNC-003 dialog offers each enabled provider and no others: email link and, only when `'google'` is in `authProviders`, a "Continue with Google" button. Turning Google on later needs only `authProviders: ['email-link', 'google']` plus enabling the provider in the Firebase console, with no spec change. The rest of this spec does not depend on the provider. **Dialog layout (v0.10, H-103; built H-104):** (a) **email link is the only provider** (`authProviders` is `['email-link']`, the launch config): there is no provider button; under the SYNC-003 intro the dialog shows the email form straight away: an "Email address" field and one filled **Send link** button, and the field has focus when the dialog opens. (b) **Two or more providers:** one button per provider, "Sign in with an email link" and "Continue with Google"; choosing "Sign in with an email link" reveals the email form below the buttons, moves focus to the field, and leaves **Send link** as the only filled button in the dialog. **What "disabled" means here (v0.11, H-146; as built in H-106 and H-140):** wherever this requirement says **Send link**, **Send again** or **Use a different email** is disabled, the button stays in the tab order and keeps focus if it has it, is exposed as `aria-disabled="true"`, and a press (click, Enter or Space) does nothing (Material `disabledInteractive`). It is not the native `disabled` attribute, so a check of `button.disabled` is not the requirement. Send link is also disabled while the field holds no '@' and while offline (SYNC-081), as built. **Send link:** while the request runs the button reads "Sending…" and is disabled. If it fails, the dialog shows exactly "Couldn't send the link. Check the address and your connection, then try again." under the field (not the SYNC-005 text, H-105; built H-106), the field keeps the address and is marked invalid, and Send link can be pressed again. **Sent state (v0.10, H-107; built H-140):** after a successful Send link the email form is replaced by: "We sent a sign-in link to `{address}`. Open it on this device to finish signing in." (`{address}` is the address as sent, after trimming), then "Didn't get it? Check your spam folder." and two text buttons, **Send again** and **Use a different email**. **Send again** sends a new link to the same address (no cooldown, default; Firebase's own rate limit surfaces as a failed send); while it runs it reads "Sending…" and both actions are disabled; on success the first line becomes "We sent a new sign-in link to `{address}`. Open it on this device to finish signing in."; on failure the sent state stays and the send-failure text above shows under it. **Use a different email** returns to the email form with the field holding the last address, focused, and Send link enabled; the address stored for the earlier link is replaced only when a new Send link succeeds. Closing and reopening the dialog shows the email form again; a link already sent still works. (Confirmed by RJ 2026-11-24, Open question 3.) The address is kept on this device only (browser storage) from a successful Send link until the sign-in completes, then removed; it is never synced (SYNC-100). **Return (v0.10, H-119; built H-145):** the link returns to the page the sign-in started from: the app path and query (for example `/decks?import=1`, SYNC-159) of the page that was showing when Send link (or Send again) was pressed, the same for the header and the SYNC-009 panels. Only a path inside this app is used; anything else returns to `/`. After the sign-in completes the page shows that path and query with the Firebase parameters (`mode`, `oobCode`, `apiKey`, `lang`, `continueUrl`) removed, and the gate opens there when the first sync completes (SYNC-009). How the path travels (Firebase's continue URL, a path stored beside the address, or both) is the builder's choice; it must also work when the link is opened on another device (continue URL), and on the Auth emulator Firebase appends its parameters after the continue URL's own query (checked in H-145, [[API Contracts]] v1.13; production `unverified`, and the app strips the parameters by name, so either shape works). **"You're signed in."** shows once, as a `success` notice (SYNC-087), when a sign-in the user started completes (email link on this or another device, or Google): a session restore at start-up, a reload, or a later open never shows it again. A message from the first-sign-in flow (SYNC-048, SYNC-097) may replace it. (Confirmed by RJ 2026-11-24, Open question 9.) When the link is opened (SYNC-002 trigger 3) on the device that sent it, the sign-in completes without a question. When it is opened on **another device or browser** (no stored address), the app opens a dialog (v0.11 records the strings as built in H-108; title confirmed by RJ 2026-11-24): title exactly "Finish signing in", the text "Confirm your email address to finish signing in.", one field labelled "Email address" with focus in it, and the buttons **Cancel** and **Finish sign-in** (filled), in that order. **Finish sign-in** stays disabled until the trimmed value contains an '@'; Enter in the field submits (and does nothing while there is no '@'). Finish sign-in completes the sign-in with the trimmed address. **Cancel**, Escape or a click outside the dialog count as giving no address. If the user gives no address, the sign-in does not complete and no message is shown (as a cancel, SYNC-005). A link that fails (e.g. expired) shows the SYNC-005 failure message. After a successful sign-in the one-time code is removed from the page URL. | RJ 2026-11-23 (decision 1); [[ADR-0007 Firebase Accounts and Firestore]] consequences; board H-063; as built in H-062; [[UI Review 2026-11-24]] #4, #5, #6, #7, #17 (H-103, H-105, H-107, H-119); as built in H-106, H-140, H-108 ([[Brief H-104 H-106 H-124]] decision 6, [[Brief H-140 H-125 H-108]] decisions 4, 12, 13; H-146); RJ 2026-11-24 (Open questions 3, 9 and the confirm title) |
| SYNC-007 | MUST | **Production release rule; no sign-in flag** (v0.12; replaces the v0.8 "Sign-in is gated by a build flag"). The build flag `signInEnabled` **no longer exists**: no build configuration (production, `preview`, development) turns sign-in, the gate or the account requirement off, and no Sign in action is hidden by configuration. **The account-only build MUST NOT be deployed to production** (the live site, `firebase deploy --only hosting`, the GitHub Actions deploy of `main`) until all three are done: (1) the Firebase Auth sign-in providers are enabled in the console (board H-063; email link at launch, SYNC-006), (2) RJ has approved the privacy notice (SYNC-101, board H-152), and (3) `firestore.rules` and `firestore.indexes.json` are deployed (SYNC-117). Until then **production keeps its current build** (the earlier build that is live today, where imports need no account and are saved in the browser) and only preview channels and local builds run the account-only code. After they are done, deploying it is RJ's decision. Whatever is on production when the account-only build first goes live: browser data saved by the old no-account build is stale local data and is cleared by the first sign-in (SYNC-048), as RJ decided (ADR-0007 amendment 2026-11-24 (d)). **Preview channels are obscurity, not access control:** preview-channel URLs are public to anyone who has the link, so anyone who finds one can sign in there (and, once the Auth providers are enabled, create an account); RJ shares preview links only privately and lets them expire. **Preview deploys:** the `firebase.json` hosting `predeploy` runs `npm --prefix web run build` (the production configuration) before every hosting deploy, including `firebase hosting:channel:deploy` and the GitHub Actions deploy of `main`; the production and preview configurations now differ only in `appVersion` (and any Firebase project settings), not in behaviour. **Preview deploy path (built H-078).** The repo MUST have one documented command that deploys a preview channel. After it runs, all of these are true: (1) the channel serves the output of `ng build --configuration preview` (the preview `appVersion` of SYNC-012); (2) nothing rebuilt that output with the production configuration between the build and the upload; (3) it deployed to the named preview channel only, never to `live`, with an expiry (the Firebase default unless RJ passes another); (4) the production paths are unchanged: `firebase deploy --only hosting` and the GitHub Actions deploy of `main` still build and ship the production configuration (and are held back by the release rule above, not by a flag); (5) the command, its channel-name argument and the reminder that preview URLs are public to anyone with the link are written down where the repo keeps its other deploy notes. The mechanism is the builder's choice (for example a second Firebase config file passed with `--config`, or a predeploy step that takes the configuration from an environment variable) and adds no dependency. Until it exists, sign-in is tested on a local preview or development build. | [[ADR-0007 Firebase Accounts and Firestore]] consequences ("a privacy policy"); design rule; `firebase.json`, `web/angular.json`, `.github/workflows/firebase-hosting-deploy.yml` ([[Validation H-062]] note); board H-078 |
| SYNC-008 | — | **Withdrawn in v0.12 (2026-11-24, H-171; RJ decision 17, [[ADR-0007 Firebase Accounts and Firestore]] amendment 2).** It defined two modes chosen by `signInEnabled`. There is one mode: the gate (SYNC-009), the first-sign-in clear and download (SYNC-048), sign-out clearing the device (SYNC-091) and the browser cache rules (SYNC-140…) apply to every build. A browser that still holds data saved by the old no-account build is not migrated: the data is stale (see Definitions) and is cleared by the first sign-in (SYNC-048). The ID is retired and not reused. | RJ 2026-11-24 (decision 17) |
| SYNC-009 | MUST | **Sign-in gate** (always on since v0.12; built H-081 as "account-required mode"). **Public, never gated:** Home `/`, Tournaments `/tournaments` and every page under it, `/styleguide`, and the privacy notice. **Gated:** Decks `/decks`, deck detail `/decks/:id`, Collection `/collection`, and Tournaments' deck controls (SPEC-004 CAT-070 **Add to your decks**, CAT-074 **In your decks** and **Add another copy**). **Gate open** when `sessionExpected` is true, the linked uid is set, `lastFullSyncAt` is set (a first sync completed, SYNC-048), and the session is **not lost** (SYNC-086; RJ decision 13 f): `sessionLostUid` is not equal to the linked uid. At start-up it is decided from the sync log, without loading `firebase` and without waiting for the session restore, so a signed-in reload shows the gated pages at once, also offline (SYNC-080: an offline restore is not a lost session). A lost session that was already detected is stored (`sessionLostUid`, SYNC-086), so a reload keeps the gate **closed** from the first frame and never shows the cards before the check finishes. **Remaining window:** a loss not yet detected (the restore or a later check is the first to find it, e.g. the first start-up after the token was revoked) shows the gated pages until that check finishes; then the gate closes at once. Edits made in that window are allowed: they are stamped, kept and pending like any other change, and are pushed if the same uid signs in again (SYNC-086). **Gate closed** (signed out, or session lost): the header tabs and the header account control (its **Sign in** button, SYNC-150) stay visible and the tabs navigate as usual (v0.14: there is no Import page or Import button; `/import` goes to Home, SYNC-159); a gated page keeps its URL (deep links too) and keeps its page header (the page title and description) at the top; everything below the header is replaced by a sign-in panel (RJ decision 14), reading nothing from the browser cache (stale local data, and a lost session's kept data, stay hidden; the header shows no stored data). **Panel content (v0.10, RJ decision 15; built H-144):** the panel has **no heading of its own** in any state (the page header's title names the page; the v0.9 per-page panel headings "Sign in to see your collection", "Sign in to see your decks" and "Sign in to import cards and decks" are removed; spec-writer reading of RJ's "just", confirmed by RJ 2026-11-24, Open question 8). It shows one line of text and a **Sign in** button (opens the SYNC-003 dialog). The line when signed out is exactly, on every gated page: "Sign in or create an account to start keeping track of your collections and decks" (RJ decision 15, verbatim, with no closing full stop as RJ gave it; replaces decision 14's "You need a free account to import cards or decks."). The line during a lost session is exactly, on every gated page: "You've been signed out. Sign in again to continue." (H-117; replaces "You've been signed out. Sign in again to see them.", which had no referent on Import; confirmed by RJ 2026-11-24, Open question 7). **First sync running** (`sessionExpected` true, first sync not complete): a gated page shows "Getting your collection and decks from your account…" below its page header (no panel heading, as above) and allows no edits; if the flow fails it shows "Couldn't get your collection and decks. Check your connection and try again." with **Try again** (reruns the flow, as Sync now). When the flow completes the page shows its content without a reload. **Tournaments while the gate is not open** (signed out, session lost, or first sync running; RJ decision 13 h): Tournaments shows **no** Add to your decks, In your decks or Add another copy control, and the CAT-074 "already added" check reads nothing from the browser cache (so a stale deck never shows as "In your decks"). Everything else on Tournaments shows as usual. When the gate opens, the controls appear without a reload, with the CAT-074 state computed from the account's decks. | RJ 2026-11-24 (decision 13 b, f, h; decision 14; decision 15, board H-118); [[UI Review 2026-11-24]] #15, #16 (H-117, H-118); design rule |

### B. Cloud layout and documents
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-010 | MUST | A user's cloud data is exactly these documents: `users/{uid}` (account), `users/{uid}/state/collection`, `users/{uid}/state/tags`, `users/{uid}/state/locks`, and `users/{uid}/decks/{deckId}` (one per deck, `deckId` = `UserDeck.id`). No other path is written. | [[Firestore Data Shape]] "Layout"; board H-061 |
| SYNC-011 | MUST | Every document has `schemaVersion` (integer, 1 for every document in this version), `updatedAt` (Firestore timestamp from the **client** clock: the latest change in the document) and `syncedAt` (set with the server timestamp on every write; the rules require it to equal the request time, SYNC-112). `syncedAt` is the only field any query filters on. | [[Firestore Data Shape]] "Layout" |
| SYNC-012 | MUST | **Account document** `users/{uid}`: `schemaVersion`, `createdAt` (first sign-in), `updatedAt`, `syncedAt`, `lastClientVersion` (the app build that last wrote it, ≤ 40 characters, a design cap for a version string) and, since v0.14, the optional **`username`** (SYNC-156; absent until the user chooses one, never present at creation). Nothing else: no email, photo or provider data (SYNC-100). It is **created only by the first-sign-in flow** (SYNC-048), as the first write of that flow, and updated after that only by an `update()`, never a `set()` (the rules keep `createdAt` unchanged, SYNC-112): at most once per app build, plus one `update()` per username change (SYNC-155). **"App build"** is the build configuration value `appVersion`. **`appVersion` value (built H-078):** it MUST change whenever the deployed code changes, so it is set when the build runs, not edited by hand. Format `web-<configuration>-<id>`: `<configuration>` is `prod` or `preview`; `<id>` is the short commit id of the source being built, **exactly 7** lowercase hex characters (the first 7 of the full id, e.g. `web-prod-5c2292c`; not `git rev-parse --short`, whose length can grow), or, when no commit id is available, the UTC build time `YYYYMMDDTHHMMSSZ`. The value is never empty, never the old fixed `web-0.0.0`, at most 40 characters, and uses only `[0-9A-Za-z._+-]`. Two builds of the same commit and configuration may share a value. The development server MAY keep a fixed value (`web-dev`), and tests inject their own. How the value reaches the build (a generated file, a build define, an environment variable) is the builder's choice, with no new dependency. The value is not personal data (SYNC-100). **"The build changed"** is decided per device: the device keeps the build it last synced with (`StoredSyncLog.lastBuild`). On the first pull of a session where `lastBuild` differs from this build, the device records the new build and updates the account document only if its `lastClientVersion` differs from this build; the first-sign-in flow does the same check. So each device updates the account at most once per change of its own build, and not at all if another device already wrote that build. | [[Firestore Data Shape]] "`users/{uid}`"; design decision 8 |
| SYNC-013 | MUST | **Collection document** `state/collection` (SPEC-003 `StoredCollection`): `catalogVersion` (string) and `cards`: map `cardKey` → `{ q, t, p }` where `q` = `quantity` (integer 0–9999), `p` = `byPrinting` (map `printingId` → integer 1–9999), `t` = the card's change time (integer ms). A card removed from the collection is the **tombstone** `{ q: 0, t, p: {} }`. Live cards have `q ≥ 1` and `Σ p ≤ q` (SPEC-007 COLL-002). | [[Firestore Data Shape]] "`state/collection`"; [[Collection Import]] `StoredCollection`; [[My Collection]] COLL-052 |
| SYNC-014 | MUST | **Collection writes.** A change to some cards is one `update()` with one `FieldPath('cards', cardKey)` per changed card (never a dotted string path: card names contain spaces, commas and apostrophes), plus `updatedAt` and `syncedAt`. Each card value is replaced whole; nested maps are never deep-merged (a printing removed from `p` must disappear). An Owned Cards Import in **Replace** mode is one `set()` of the whole document carrying every card of the new collection and a tombstone for every card it removed. The first write of the document is a `set()`. | [[Firestore Data Shape]] "`state/collection`", sync-flow table; [[Collection Import]] IMP-050 |
| SYNC-015 | MUST | **Tags document** `state/tags` (SPEC-007 `StoredTags`): `tags`: map `TagId` → `{ label, key, colour \| null, excludeFromDecks, createdAt, updatedAt }` (`createdAt`, `updatedAt` timestamps) or, for a deleted tag, the tombstone `{ deleted: true, updatedAt }`; `assignments`: map `TagTarget` (`p:<printingId>` / `u:<cardKey>`) → `{ a: TagId[], t }` (`a` ≤ 20 ids, `t` = change time ms). An unassigned target is the tombstone `{ a: [], t }`. Dormant assignments (COLL-029) are kept like any other. Writes use one `FieldPath` per changed tag or target, as SYNC-014. | [[Firestore Data Shape]] "`state/tags`"; [[My Collection]] COLL-019…029, `StoredTags`; design decision 4 |
| SYNC-016 | MUST | **Short tag ids.** A `TagId` is `t_` followed by 6 characters from `[0-9A-Za-z]` (8 characters), unique among the user's tags and tag tombstones; a new id that collides is drawn again. Tags created before this version with another id format are given a short id once, on load, and every reference is rewritten in the same save: `assignments`, the SPEC-007 view state's tag filter and saved views (COLL-060, COLL-064). This is `StoredTags` `schemaVersion: 3` (shape unchanged from 2; 3 means "ids are short"). | [[Firestore Data Shape]] "`state/tags`" (1.7 MB vs ≈ 620 KB worst case); [[My Collection]] `TagId`, COLL-071 |
| SYNC-017 | MUST | **Locks document** `state/locks` (SPEC-008 `StoredDeckLocks`): `locks`: map `deckId` → `{ lockedAt, updatedAt }`, where `lockedAt` is the lock time (timestamp, the SPEC-008 lock-order key) and `updatedAt` the change time of this entry; an unlock is the tombstone `{ lockedAt: null, updatedAt }`. Writes use one `FieldPath` per changed deck. | [[Firestore Data Shape]] "`state/locks`"; [[Shared Cards and Lock-in]] SHARE-022, SHARE-030; design decision 4 |
| SYNC-018 | MUST | **Deck documents** `decks/{deckId}`: the SPEC-006 `UserDeck` fields as they are, without `id` (it is the document id), with `createdAt`/`updatedAt` as timestamps, plus `syncedAt` and `deletedAt` (`null` on a live deck). The document's `schemaVersion` is `UserDeck.schemaVersion` (1). A **deleted deck** is the tombstone `{ schemaVersion, createdAt, updatedAt, deletedAt, syncedAt }` with `updatedAt = deletedAt` (timestamp). Each deck write is one `set()` of the whole document **without merge**, so writing a tombstone removes every other field. | [[Firestore Data Shape]] "`decks/{deckId}`"; [[Deck Import]] `UserDeck`, DECK-074 |
| SYNC-019 | MUST NOT | Never synced: SPEC-007 printing-code memory (`PrintingCodeStore`, COLL-075; each device rebuilds it), Collection view state and saved views (COLL-060, COLL-064), the previous collection kept for import Undo (IMP-052), the sync log, and any card data, image, ban list or tournament data. | [[Firestore Data Shape]] "What gets synced", decision 2; [[ADR-0007 Firebase Accounts and Firestore]] |

### C. Change tracking on the device
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-030 | MUST | The app keeps a device-local **sync log** (`StoredSyncLog`, `schemaVersion: 1`) with: linked uid, `sessionExpected`, cursors, last full sync time, change times and tombstones per item, the known deck versions (`knownDecks`), each store's last stamped record `updatedAt` (`recordUpdatedAt`), a value hash per card, tag and tag target (`h`, SYNC-032), the items the rules rejected (`rejected`, SYNC-118), and the pending set. Added in the H-062 build: the cloud documents this device knows exist (`cloudDocs`, SYNC-053), a Replace-import flag (`pending.collectionReplace`, SYNC-014), each deck's `createdAt` (`deckCreated`, for tombstones, SYNC-018), whether a deleted deck was pending before the delete (`deckTombstones[id].wasPending`, for Undo, SYNC-035), this device's last synced build (`lastBuild`, SYNC-012, SYNC-118), an unfinished first-sign-in upload (`uploadingUid`, SYNC-048) and an unfinished account deletion (`deletingUid`, SYNC-096). **v0.8:** `uploadingUid` is no longer written, because the first sign-in never uploads (SYNC-048); a value left by an older build is ignored and disappears with the first-sign-in clear (built H-081). Added for H-127: `deletingRemovedAny` (SYNC-096). Added for H-081: `sessionLostUid` (SYNC-086, SYNC-009). The Data contract describes each field. It is behind its own store interface, like the other stores. | design decision 3; as built in H-062 |
| SYNC-031 | MUST | **Stamping.** Every save of a local store made by a user action (not by the sync engine, SYNC-041) compares the new record with the previous one and, for each item that changed, appeared or disappeared, stamps `t = max(now, previous t of that item + 1)` and adds it to the pending set; a disappeared item gets a tombstone. A card is "changed" when its `quantity` or any `byPrinting` entry differs; a tag when any of its fields differ; a tag target when its id list differs; a lock when it is added, removed or its `lockedAt` differs. **Decks** use `UserDeck.updatedAt` as their change time, made monotonic in the same way: a saved deck gets `updatedAt = max(now, previous updatedAt + 1 ms)` (the previous version being the one this device last held, local or pulled), and a deletion gets the tombstone `deletedAt = max(now, updatedAt + 1 ms)`. User saves happen only while the gate is open (SYNC-009), so every stamped change belongs to the signed-in account, including changes made offline (SYNC-080). No user change can be made after a lost session is detected (the gate is closed, SYNC-009, SYNC-086); changes made before detection are stamped as usual and stay pending. (v0.12: the v0.8 "local-only mode" branch, where stamps were made but never pushed, is gone: code that stamps without an account is removed by H-172.) Stamping code otherwise does not change. | design rule; [[Deck Import]] DECK-074 |
| SYNC-032 | MUST | The stamps and the record are saved **together** (one transaction where the adapter allows it). **Reconcile on load:** the sync log keeps, per store, the record `updatedAt` it last wrote or stamped, and per card, tag and tag target a short **value hash** (e.g. 32-bit FNV-1a of the item's canonical JSON; locks compare `lockedAt` directly). If a loaded record's `updatedAt` differs (a save whose stamps were lost), only items whose hash differs, items new to the log, and items the log knows as live but the record lacks are stamped (`t` = the record's `updatedAt`, made monotonic as in SYNC-031; missing items get tombstones) and marked pending; unchanged items keep their stamps. For decks, a deck whose `updatedAt` differs from `knownDecks` is pending, and a known deck missing from the `DeckStore` gets a tombstone. Records saved before this version have no log entries, so every item is stamped with the record's `updatedAt` once. Such records are stale local data (Definitions): whatever stamps they get are cleared with them by the first sign-in and never pushed (SYNC-048). | design rule; [[Collection Import]] IMP-054 |
| SYNC-033 | MUST | A store record that is **missing or unreadable** (SPEC-003/007/008 newer or corrupt record, SHARE-061, COLL-071, DECK-091) never produces tombstones: its area is not pushed and not merged until it is readable again, and the status shows Sync error with "Some data on this device could not be read, so it isn't being synced." Only a user's change (or a pulled remote change) deletes an item. Clearing the device (first sign-in SYNC-048, sign-out SYNC-091) is not a deletion: it removes unreadable records too, writes nothing to the cloud and creates no tombstones. | design rule (prevents an unreadable store from wiping the cloud) |
| SYNC-034 | MUST | **Tombstones are kept 30 days** from their `t` (deck: `deletedAt`), locally and in the cloud. Older tombstones are dropped from the sync log and, in the cloud, removed in the next write of their document (collection, tag, assignment, lock: `deleteField()` on that `FieldPath` in the same `update()`, no extra write); deck tombstone documents older than 30 days are hard-deleted by the next device that syncs. | [[Firestore Data Shape]] decision 3 (accepted for now, RJ decision 9) |
| SYNC-035 | MUST | **Deck delete and Undo.** A deck deletion is pushed only after the SPEC-006 Undo window (10 s, DECK-083) ends. Undo within the window cancels the pending tombstone, so the restored record is identical (same id and timestamps) and nothing reaches the cloud. A deletion still pending when the tab closes is pushed on the next open. | [[Deck Import]] DECK-083; [[Shared Cards and Lock-in]] SHARE-024 |

### D. Sync flows
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-040 | MUST | **Pull.** While signed in, the app pulls on start-up, right after sign-in, when the tab becomes visible after being hidden for 5 minutes or more, when the browser comes back online, and on **Sync now**. A pull is two queries: `users/{uid}/state where syncedAt > stateCursor` and `users/{uid}/decks where syncedAt > decksCursor`, each billed at least 1 read even when empty, plus 1 read per returned document. The **first pull after start-up or sign-in** is preceded by the account check (SYNC-053), so it costs 3 reads with no changes; later pulls cost 2. Each cursor then becomes the largest `syncedAt` received (server time, never the client clock). | [[Firestore Data Shape]] "Reopen, same device", fact 8 |
| SYNC-041 | MUST | **Merge after pull.** Every pulled document is validated (SYNC-047) and merged into the local stores item by item with the rules of section E. Local stores are written only for items whose winner is the cloud copy; the screen updates as for a change in another tab (SPEC-005 OWN-071, SPEC-007 COLL-073, SPEC-008 SHARE-064). **Sync-engine writes are not user changes:** a local save made by a merge (including SYNC-044 deletions, SYNC-065 tag merges and SYNC-071 dropped locks) is **exempt from SYNC-031 stamping**. Each item it writes keeps the pulled change time (`t`, tag/lock `updatedAt`, deck `updatedAt` / `deletedAt`), is **not** added to the pending set. **Exceptions, stamped `max(now, pulled t + 1)` (or `+ 1` on the local `t` when that is later) and pending:** items SYNC-042 marks pending because the local version won (these keep their local stamp); the tombstones SYNC-065/071 create; and every tag assignment list the merge **rewrites** to a value neither side had: lists that received ids moved by SYNC-065 and lists with ids removed by SYNC-066 (v0.8: the Combine unions are gone, SYNC-064). So the other devices receive the rewritten lists on their next pull; and the same save updates the sync log's `recordUpdatedAt`, item hashes and `knownDecks` (SYNC-032), so the next load reconciles nothing. | design rule |
| SYNC-042 | MUST | **Convergence.** After a merge, every item whose local version won (newer than the pulled one) is added to the pending set, and so is every pending item the pull did not touch. So a device that pushed an older value after a newer one was written elsewhere is corrected on the next pull of the device holding the newer value. | design rule (the server keeps the last write, not the latest `t`) |
| SYNC-043 | MUST | **Push.** Pending items are pushed after the debounce (SYNC-121), right after a merge that left items pending, when the tab is hidden, and on Sync now. A push is preceded by a pull when the last pull is older than 60 s. One write per changed document: collection, tags and locks by `FieldPath` per item (SYNC-014, 015, 017), decks one `set()` each. An item leaves the pending set only when its write succeeds; a failed write keeps it pending. **Known limitation:** a write made between another device's pull and push can be overwritten by an older value in that window (the server keeps the last write, not the latest `t`); the cloud may then briefly hold the older value until the device holding the newer one pulls and pushes it again (SYNC-042). | [[Firestore Data Shape]] sync-flow table |
| SYNC-044 | MUST | **Absent means deleted, after a first sync.** When a full state document is pulled, a local item that is **not** in its map and **not** pending, on a device that has completed a full read with this uid before (`lastFullSyncAt` set, linked uid = this uid), is deleted locally: its tombstone was purged (SYNC-034) or a Replace import on another device removed it (SYNC-014). For decks the same holds for documents missing from a **full** `decks` read (SYNC-045). | design rule; [[Firestore Data Shape]] decision 3 |
| SYNC-045 | MUST | **Full read.** The app reads every `state` and `decks` document (no cursor) on first sign-in on this device, when the cursors are missing, and when the last successful sync is more than **30 days** ago (tombstones may have expired, SYNC-034). | [[Firestore Data Shape]] "Open on a second device" |
| SYNC-046 | MUST | **Newer cloud schema.** A cloud document whose `schemaVersion` is higher than the app knows is never written by this app. Its area (collection, tags, locks, or that deck) is shown from local data read-only on this device, its local changes are disabled with "Update Rift Builder to change this: your account data was saved by a newer version. Reload the page.", and the rest keeps syncing. | [[Firestore Data Shape]] "Layout" (`schemaVersion`); [[Deck Import]] DECK-091 |
| SYNC-047 | MUST | **Validate pulled data.** Security rules cannot check every map entry (SYNC-112), so the client checks each pulled item against SYNC-013…018 and SPEC-003/006/007 limits. An invalid item is skipped (never written locally, never pushed back over), and the status shows Sync error with "Some account data couldn't be read." A valid item next to it is still merged. | design rule |
| SYNC-048 | MUST | **First sign-in on this device** (v0.8, RJ decision 13; built H-081). It runs when a sign-in (or a session restored at start-up) has a uid and the first sync with that uid has not completed (linked uid unset or different, or `lastFullSyncAt` unset). Steps: **(1) Clear.** Clear every local store, readable or not (collection, tags, decks, locks, printing codes, view state, import Undo snapshot), and reset the sync log to empty except `sessionExpected: true`. Stale local data (data saved without an account by the old no-account build, in another older build, or for another account) is never imported, uploaded or merged (RJ decision 13 d; SYNC-143). Clearing writes nothing to the cloud (SYNC-033). **(2) Full read** with the account check (SYNC-045, SYNC-053). **(3) By what the read finds:** (a) **no account document and no other document** → create the account document (SYNC-012), the flow's only write; (c) **account document exists** → download every `state` and `decks` document into the local stores, with the merge rules of SYNC-041 (writes keep the pulled times, nothing becomes pending), and write the account only if SYNC-012 asks for it (`lastClientVersion` differs from this build); (e) an account document with no data is case (c) with nothing to download; (f) **no account document but `state` or `decks` documents exist** (a half-finished deletion) → write nothing, import nothing, and follow SYNC-097's half-deleted branch (the device is already empty). Cases (b) "upload" and (d) "Combine" no longer exist (SYNC-049). **(4) Complete.** Only when the read, the local writes and the flow's write (if any) have all succeeded does the app write the linked uid (this uid), `lastFullSyncAt`, the cursors and `lastBuild`; then the gate opens (SYNC-009). No notice is shown on success (the pages fill in). A flow that fails or is interrupted (error, offline, tab closed) writes neither, keeps the gate in its "first sync running" state, and on the next attempt (Try again, Sync now, reopen) starts again at step 1. `uploadingUid` is never written (SYNC-030). **As built vs new:** the full read, case (f) detection, case (c) download and the "link only on success" rule are as built; step 1, the removal of cases (b) and (d) and of the upload resume are new (H-081). | RJ 2026-11-24 (decision 13 a, d); [[Firestore Data Shape]] first sign-in rows (upload rows superseded); full read and linking as built in H-062 |
| SYNC-049 | MUST NOT | **No Combine** (v0.8; supersedes v0.7 SYNC-049 and RJ decision 5). There is no Combine dialog and no Cancel-at-sign-in path. The app never merges device data into an account at sign-in, never shows the counts of "this device" against "account", and never shows "This device's data was last synced with a different account." The `mergePulled` `'combine'` mode is no longer called (the builder may remove it). | RJ 2026-11-24 (decision 13 a) |
| SYNC-050 | MUST | **First-sign-in writes** (v0.8; built H-077). The first-sign-in flow (SYNC-048) makes **at most 1 write** in total: case (a) exactly 1, the `set()` that creates `users/{uid}`; cases (c) and (e) 0, or exactly 1 account `update()` when `lastClientVersion` differs from this build (SYNC-012); case (f) 0. It writes **no** `state` or `decks` document, so no rule lookup is billed (SYNC-113), and it does not use the `PushChanges.batch` flag. Reads: at most 3 (account `get` and the two queries of the full read) plus 1 per document returned (SYNC-040, SYNC-120). After the flow completes nothing is pending, so the first regular push afterwards writes only what the user changes. The H-062 build pushes every logged item after a case (c) download (up to 3 extra `state` writes): that is a defect against this row (H-077). | RJ 2026-11-24 (decision 13); [[Firestore Data Shape]] sync-flow table; board H-077 |
| SYNC-051 | SHOULD | **One syncing tab.** In one browser, at most one tab pulls or pushes at a time; other tabs see the results through their store-change handling (OWN-071, COLL-073, SHARE-064). | design rule |
| SYNC-052 | — | **Withdrawn in v0.12 (2026-11-24, H-171; RJ decision 17).** It said how "Delete all local data" (SPEC-007 COLL-074, also withdrawn) behaved by mode. There is no such action: sign-out clears this device's cache and never deletes account data (SYNC-091), and deleting the account's data, and the cache with it, is Delete account and data (SYNC-095). The ID is retired and not reused. | [[My Collection]] COLL-074 (withdrawn); RJ decision 17 |
| SYNC-053 | MUST | **Account check before writing.** In each session (after start-up or sign-in), before its first write other than the first-sign-in flow's account creation, the device does the account check (`get users/{uid}`). If the document exists, writes may follow. If it is **missing** on a device with a linked uid equal to this uid, the device writes nothing and follows SYNC-097. In addition, an `update()` that fails with not-found (the document is gone), and a **create** (`set()` of a document that doesn't exist yet) denied by the rules, are treated the same way: stop writing, keep the item pending, and run the account check again. If it finds the account document **missing**, follow SYNC-097. If it finds it **present**, the denial was not about the account: the item falls back to SYNC-118 (rejected, not retried until it changes), and writing resumes for everything else, so there is no retry loop. **A write is a create** when the document is not in `StoredSyncLog.cloudDocs`, the device's list of cloud documents it knows exist (`collection`, `tags`, `locks`, `deck:<id>`). A document joins `cloudDocs` when a pull returns it (valid and of a known schema) or when this device writes it successfully. It leaves `cloudDocs` when a write to it fails with not-found while the account document is present, when its deck tombstone is hard-deleted (SYNC-034), when a full read no longer returns a deck tombstone, and when the sync log is reset (first-sign-in clear SYNC-048, sign-out SYNC-091, SYNC-097 sign-outs, deletion). A `state` document that is not in `cloudDocs` is written with one `set()` of the whole document (SYNC-014); one that is, with an `update()`. For the account document, a create is the first-sign-in creation only. Only the first-sign-in flow (SYNC-048) may create documents in an account whose account document is missing. | design decision 8; [[Firestore Data Shape]] fact 8 |

### E. Conflict rules: latest change wins
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-060 | MUST | **Items.** Two versions of the same item are compared by change time, and the later one wins **as a whole**: a collection card (`quantity` and `byPrinting` together, so `Σ byPrinting ≤ quantity` always holds), a tag (all fields), a tag target's id list, a deck (all fields; change time = `updatedAt`, which equals `deletedAt` for a tombstone), a lock (`lockedAt` or the unlock, by its `updatedAt`). Different items never affect each other: edits to two different cards, tags or decks on two devices both survive. | board H-061 ("latest change wins per deck and per card count"); [[Firestore Data Shape]] |
| SYNC-061 | MUST | **Ties** (equal change times, different content) go to the **cloud** copy. A tombstone and a live version compare like any two versions (a newer tombstone deletes; a newer edit restores). | design rule (deterministic) |
| SYNC-062 | MUST | **Monotonic stamps** (SYNC-031): a change always gets a time later than the version it was made on, so an edit on a device whose clock is behind still beats the version it replaced. **Clock skew note:** across devices that have not seen each other's change, "latest" means latest by each device's own clock; a device whose clock runs ahead wins those races. | design rule |
| SYNC-063 | SHOULD | **Clock check.** When a pull returns a document this device wrote, the app compares its `syncedAt` with the client time of that write (no extra read). If they differ by more than 5 minutes, the app shows the `info` notice (SYNC-087) "Your device clock is off by about `<m>` minutes. If you edit on several devices, the wrong change may win." (v0.11: a notice, as built; v0.10 said the account menu shows it). | design rule; as built (H-116, [[Validation H-146]]) |
| SYNC-064 | MUST | **Tag assignments.** Each tag target's id list is one item (SYNC-060), always. v0.8 removes the Combine union (there is no Combine, SYNC-049), together with its "more than 20 tags" summary line. | [[My Collection]] COLL-022; RJ decision 13 |
| SYNC-065 | MUST | **Same label, two tags.** When a merge leaves two live tags with the same `key` (created separately on two devices), the one with the earlier `createdAt` (then lower id) is kept; every assignment of the other is moved to it (no duplicates), the other becomes a tombstone, and the kept tag keeps its own label, colour and `excludeFromDecks`. | [[My Collection]] COLL-021, COLL-024 (merge rules) |
| SYNC-066 | MUST | **Deleted tags.** An id whose tag is a tombstone (or unknown) is removed from every assignment list on merge and is never shown (COLL-025). | [[My Collection]] COLL-025 |
| SYNC-067 | MUST | **Limits after a merge.** A merge never drops a live card, tag or deck to meet a limit. If it leaves more than 200 tags (COLL-022) or 200 decks (DECK-092), creating new ones is blocked with the existing limit message until the user is back under the limit; everything else keeps working. | [[My Collection]] COLL-022; [[Deck Import]] DECK-092 |
| SYNC-068 | MUST | **Collection-side warnings.** Remote changes have no confirmation step, so a pulled change that lowers what a locked deck holds shows SPEC-008's after-the-fact notice "'`<deck name>`' (locked) is now `<n>` cards short." computed with `lockedShortfalls(before, after)` (SHARE-034, as for an import Undo). | [[Shared Cards and Lock-in]] SHARE-034 |

### F. Locks across devices
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-070 | MUST | Locks sync per deck (SYNC-017, SYNC-060). The SPEC-008 rules apply to the merged set unchanged: lock order by `lockedAt` then `deckId` across all devices (SHARE-030), earliest lock wins, holds and shortfalls are computed, never stored (SHARE-035). | [[Shared Cards and Lock-in]] SHARE-030…035; [[Firestore Data Shape]] "`state/locks`" |
| SYNC-071 | MUST | **Lock on a deck deleted elsewhere.** Deletion wins (RJ decision 4): a lock never restores a deck, whatever the times. If the merged deck is a tombstone, its lock is dropped (SHARE-062) and written as an unlock tombstone; a deck deleted on one device releases its lock everywhere (SHARE-024). | RJ 2026-11-23 (decision 4); [[Shared Cards and Lock-in]] SHARE-024, SHARE-062 |
| SYNC-072 | MUST | **Deck edited elsewhere while locked.** When the merged deck's cards changed and the merged lock is live (e.g. device B edited the deck before it learned of device A's lock), the deck **stays locked** with its new contents; need and holds are recomputed (SHARE-028) and it may become short (SHARE-033). The app shows "'`<deck name>`' changed on another device while it was locked." (RJ decision 3: keep the lock with the new cards.) | RJ 2026-11-23 (decision 3); [[Shared Cards and Lock-in]] SHARE-025, SHARE-028, SHARE-033 |
| SYNC-073 | MUST | **Locked and unlocked on two devices.** The later of lock and unlock wins (SYNC-060). A deck locked on two devices keeps the lock with the later `updatedAt` and that entry's `lockedAt`. | design rule |
| SYNC-074 | MUST | **Merge makes a lock short.** When a pulled collection, tag or deck change leaves a locked deck short, the deck **stays locked and is flagged** "Locked · `<n>` cards short" (SHARE-033); it is never unlocked automatically. A notice lists each such deck: "'`<deck name>`' (locked) is now `<n>` cards short." (RJ decision 2: locked and flagged.) | RJ 2026-11-23 (decision 2); [[Shared Cards and Lock-in]] SHARE-033, SHARE-034, design decision 5 |
| SYNC-075 | MUST | A pull never creates a lock: a lock exists only where the user locked a deck on some device (SHARE-020). A lock pulled onto a device is valid even if that device's view would not let the user lock it now; it is shown per SHARE-033. | [[Shared Cards and Lock-in]] SHARE-020, SHARE-033 |
| SYNC-076 | MUST | Decks are never locked on the cloud without a deck document: a push writes the deck before its lock. A `state/locks` entry whose deck is unknown on a device after a full read is ignored there and dropped on the next lock save (SHARE-062). | [[Shared Cards and Lock-in]] SHARE-062 |
| SYNC-077 | MUST | **Same deck status on every device** (RJ decision 3). Every deck status the user sees must be **identical on every signed-in device once they have synced**: the ownership group `ready` / `partial` / `none` / `locked` (SHARE-051), the lock badge "Locked" / "Locked · `<n>` cards short" (SHARE-033, SHARE-041), complete or short, holds, tile fill and labels "`<a>` of `<q>` available" / "locked in" (SHARE-040, SPEC-005 OWN-023), "`<A>` of `<R>` copies …" (SHARE-050), the shared indicator (SHARE-042), and whether Lock in is enabled and why (SHARE-020). To guarantee it: (a) **no status is stored**: all of them are computed (SHARE-035, SPEC-005 OWN-026), including "flagged short"; only the lock itself (`DeckLock`) is stored, and it syncs (SYNC-017). (b) The computation reads **only synced user data**: decks, locks, collection quantities and `byPrinting`, tags with `excludeFromDecks` and assignments, plus the card catalog snapshot (SPEC-001; not user data, the same for every device on the same `catalogVersion`). (c) **Device-local data never changes a status:** Collection view state and saved views only filter and sort lists (COLL-060, COLL-064); printing-code memory is display text and never a key (COLL-075); the import Undo snapshot is not read (an Undo is a collection change that is stamped and syncs, SYNC-031); the sync log is not read; the Decks page "Show ownership colouring" toggle (SPEC-005 OWN-039) and the Decks list sort and filters (OWN-006) are presentation only and change no computed status. None of these is synced (SYNC-019) because none affects status. (d) A device may differ **only** while it shows why: changes still pending or rejected (SYNC-084, SYNC-118), a local store unreadable (SYNC-033, SHARE-061), ownership unavailable (SPEC-005 OWN-062/063), a newer cloud or local schema shown read-only (SYNC-046, DECK-091), a skipped invalid item (SYNC-047), or a different `catalogVersion`. Notices about a change (SYNC-068, SYNC-072, SYNC-074) are events on the device that receives the change, not statuses. | RJ 2026-11-23 (decision 3); [[Shared Cards and Lock-in]] SHARE-035; [[Your Decks Ownership View]] OWN-026; [[My Collection]] COLL-060, COLL-075 |

### G. Offline and status
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-080 | MUST | Signed in and offline, every feature works on the local stores; changes are stamped and stay pending (SYNC-031) and are pushed when the browser is online again or on the next open. Correctness never depends on Firestore's own offline cache. **Offline use (v0.8, kept in v0.12):** the local stores are the account's cache (SYNC-141), so the gated pages (SYNC-009) open and work offline, including at start-up with no connection: the gate is read from the sync log, not from Firebase. Imports work offline too (they parse on the device); the result is pending until online. Only actions that need a connection are disabled (SYNC-081), and a first sign-in that has not completed cannot run offline (SYNC-048). **Unconfirmed writes:** a write that the server does not acknowledge within 20 s (`RemoteErrorCode` `'unconfirmed'`) may still land later, so it is neither failed nor rejected: its items stay pending, no error status is shown, and about 60 s later the device pulls and then pushes again. If the write landed, the pull returns the same change time, the cloud copy wins the tie (SYNC-061) and the items leave the pending set without a second write; if not, they are pushed again. | [[Firestore Data Shape]] "Offline"; unconfirmed handling as built in H-062 (`WRITE_TIMEOUT_MS`, `PULL_BEFORE_PUSH_MS`) |
| SYNC-081 | MUST | Sign-in, Sync now, sign-out and account deletion need a connection; offline they are disabled with "You're offline." (as built, `account-menu.ts`). **v0.8:** this includes every button of the Sign out dialog that signs out (**Sign out**, **Sign out anyway**) and its **Sync now**: if the connection drops while the dialog is open, those buttons become disabled, the dialog shows "You're offline." and only **Cancel** works. So a device is never cleared by a sign-out while offline (SYNC-090; confirmed by RJ 2026-11-24, Open question 2). | design rule; as built in H-062; validator H-080 failure 1 |
| SYNC-082 | MUST | A pending change survives a closed tab or a restart (the sync log is persistent) and is pushed on the next signed-in open. | [[Firestore Data Shape]] "Offline" |
| SYNC-083 | MUST | **Free tier used up.** When Firestore rejects reads or writes because the project's quota is exhausted, sync stops until the next pull attempt after the reset, nothing local is lost, and the status reads "Sync paused. Your changes are saved on this device." | [[Firestore Data Shape]] decision 1 (accepted for now, RJ decision 9), fact 2 |
| SYNC-084 | MUST | The account menu shows one **sync status**: `Synced` ("Synced · `<time>`"), `Syncing…`, `Offline` ("Offline · changes are saved on this device"), `Paused` (SYNC-083), `Error` (SYNC-033, SYNC-047, or a failed write: "Couldn't sync. Your changes are saved on this device. Try again."). With pending items the text adds "· `<n>` changes not synced yet" ("· 1 change not synced yet" for one), **except** during an unfinished deletion (SYNC-096, v0.10), when the status is exactly "Some data couldn't be deleted. Try again." with no pending count. Status is text, not colour alone. The word `Syncing…` is also the label of the Sign out dialog's Sync now button while it runs (SYNC-090). | design rule (accessibility); [[UI Review 2026-11-24]] #9 (H-111) |
| SYNC-085 | MUST | A sync failure never blocks or undoes a local save: the local store keeps the change (SPEC-003/006/007/008 save rules apply only to the local store). | design rule; [[Deck Import]] DECK-093; [[My Collection]] COLL-072 |
| SYNC-086 | MUST | **Session lost.** This applies only while `sessionExpected` is true: if the session cannot be restored at start-up or ends without the user signing out (token expired or revoked, account disabled) and `AuthService.checkAccount()` does **not** return `deleted` (SYNC-097), the app stops syncing, keeps local data and pending items, keeps `sessionExpected` true, and shows "You've been signed out. Sign in again to sync." Signing in again with the same uid resumes as a normal pull and push. A deliberate sign-out (SYNC-090) never shows this message. **Gate on a lost session (v0.8, RJ decision 13 f; built H-081; always, v0.12):** when the loss is detected, the device sets `sessionLostUid` = the linked uid in the sync log (persistent), and the gate **closes** (SYNC-009). `sessionLostUid` is cleared by a successful sign-in (same or different uid; then as below), by a later start-up whose session restore returns the linked uid and passes the account check (the loss was temporary), and by every clear of the sync log (sign-out, first-sign-in clear, deletion, SYNC-097). With the gate closed: gated pages show the sign-in panel with "You've been signed out. Sign in again to continue." (v0.10, SYNC-009) and Tournaments hides its deck controls. The local data, the sync log and the pending items **stay on the device** (not cleared) until the user signs in again. Signing in as the **same** uid resumes: the gate opens, and the pending items are pushed. Signing in as a **different** uid runs that uid's first sign-in, which clears this device, including the first account's unsynced changes (SYNC-048, SYNC-098). | design rule; RJ decision 13 f |
| SYNC-087 | MUST | **Notice kinds** (v0.11, H-146; documents the build, H-116). Every notice this spec shows (a snack bar with an **OK** action, or **Try again** where a requirement says so) has exactly one of three kinds, set where the notice is sent (never guessed from its text): **`success`** (confirms the user's own action): closes on its own after **6 s**, announced **politely**: "Your account and its data were deleted." (SYNC-096), "Your account wasn't deleted." (SYNC-096 Cancel deletion and a cancelled re-authentication), "You're signed in." (SYNC-006). **`info`** (instructions and events): **stays until the user presses OK**, announced **politely**: "You've been signed out. Sign in again to sync." (SYNC-086), the SYNC-096 step 1 text, both SYNC-097 messages, the lock notices of SYNC-072 and SYNC-074, and the SYNC-063 clock warning. **`error`**: **stays until the user presses OK** (or its action), announced **assertively**; it is the only assertive kind: the SYNC-005 failure text, "You're offline." when an action is refused (SYNC-081), and the SYNC-096 "Some data couldn't be deleted. Try again." notice with **Try again**, which is assertive. **Not notices:** the sync status messages of SYNC-033, SYNC-047, SYNC-083, SYNC-084 and SYNC-118 (unreadable or invalid account data, "Sync paused…", a failed, rejected or too-large write) are account-menu status text, not notices, and have no kind (as built). A notice sent **without a kind** is treated as `info` (stays, polite), so no new message closes on its own by accident. Opening a notice never moves focus; its action is reachable with Tab. **Scope:** only the notices of this spec. Notices of other specs keep their own rules; in particular the [[My Collection]] **COLL-054** Remove-card **Undo** notice stays up for at least 8 s and is **not** covered by the 6 s `success` rule. | WCAG 2.2.1 ([[UI Review 2026-11-24]] #14); as built in H-116 ([[Brief H-113 H-116 H-123 H-126]], [[Validation H-113 H-116 H-123 H-126]]); H-146 |

### H. Sign-out and account deletion
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-090 | MUST | **Sign out** (v0.8, RJ decision 13 a; supersedes decision 6; built H-081) asks: "Sign out? Your collection and decks stay in your account and are removed from this device. Sign in again to get them back." with **Sign out** (primary) and **Cancel**. There is no Keep a copy and no Remove choice. **Unsynced changes:** when there are pending items (SYNC-084) the dialog first shows "`<n>` changes haven't synced yet. They'll be lost if you sign out now." ("1 change hasn't synced yet. It'll be lost if you sign out now." for one) with **Sync now** (primary), **Sign out anyway** and **Cancel**. **Explanation under the warning (v0.10, H-121; built H-122):** while the warning shows, the plain explanation "Your collection and decks stay in your account and are removed from this device. Sign in again to get them back." stays in the dialog, directly under the warning line, in the muted text style; the dialog title stays "Sign out?". Sync now runs a sync (SYNC-040, SYNC-043) with the dialog open: **while it runs, the Sync now button reads "Syncing…"** (the SYNC-084 status word; v0.10, H-121; built H-122), Sync now and Sign out anyway are disabled, and **Cancel** stays enabled (it closes the dialog; the sync carries on, as built). If nothing is pending afterwards, the dialog switches to the plain question above; if items are still pending while online (failed, rejected, too large), the warning stays with the new count and the button reads "Sync now" again. **Sign out anyway** signs out at once. **Offline** (SYNC-081): Sign out is disabled in the account menu, so the dialog does not open offline; if the connection drops while it is open (for example during Sync now), Sync now, Sign out and Sign out anyway are disabled, the dialog shows "You're offline." above the buttons, the warning keeps its count, and only Cancel works. When the connection returns the buttons are enabled again. Nothing is cleared while offline. Rejected items (SYNC-118) count as pending here. | RJ 2026-11-24 (decision 13 a); board H-080; [[UI Review 2026-11-24]] #19 (H-121) |
| SYNC-091 | MUST | **Sign-out clears this device** (v0.8; built H-081; this is the cache clear of SYNC-142, v0.12). Signing out ends the Firebase session (SYNC-092) and clears every local store (collection, tags, decks, locks, printing codes, view state, import Undo snapshot) and the sync log (so `sessionExpected` is false and no linked uid remains). The next start-up loads no Firebase (SYNC-002), and the gate is closed (SYNC-009). This is v0.7's "Remove from this device", which the build already has (`signOut('remove')`); the "Keep a copy" path goes. The cloud data is never touched. **Device settings are not cleared (v0.14):** the theme (SYNC-157) is not part of the cache and is kept; so are the browser's own HTTP cache and the public catalog (SYNC-141 e). The cleared set is the SYNC-141 (a)…(d) set, stated as a closed list, so a builder cannot satisfy "clear everything" by deleting every key with a given prefix that the theme key also matches (H-172 note: the `rift.` prefix wipe must not touch the theme key). | RJ 2026-11-24 (decision 13 a); clearing as built in H-062; RJ 2026-11-24 (theme per device, ADR-0006) |
| SYNC-092 | MUST | Signing out ends the Firebase session in this browser; no Firestore request is made afterwards until the next sign-in. | design rule |
| SYNC-095 | MUST | **Delete account and data** (a button in the Account Information dialog, SYNC-152; v0.14, there is no Settings page) shows: "Delete your Rift Builder account? This deletes your account and the collection, tags, decks and locks saved in it, including the copy on this device and on every other device that syncs it. This can't be undone." The user types `delete` to enable **Delete account** (Cancel always available). There is **no** option to keep a copy (RJ decision 7). **Recent sign-in needed (v0.10, H-112; built H-143):** the dialog checks, when it opens, whether SYNC-096 step 1 would need the user to sign in again: `AuthService.needsRecentSignIn()` is true **and** `AuthService.canReauthenticate()` is false (no Google popup is possible; with the launch config, email link only, that is every sign-in more than 5 minutes old or of unknown age). If so it opens in its **sign-in-first state**: the same title "Delete your Rift Builder account?" and the paragraph above, then exactly "To delete your account, sign out, sign in again, then choose Delete account and data within 5 minutes." (the SYNC-096 step 1 text, reused so there is one string), **no** type-to-confirm field and **no** Delete account button, and the buttons **Cancel** and **Sign out** (filled, not danger-styled). **Sign out** closes this dialog and opens the SYNC-090 Sign out dialog exactly as the account menu's Sign out does (with its unsynced-changes warning and offline rules); nothing is deleted. Otherwise (no fresh sign-in needed, or a Google popup is possible) the dialog opens in the type-to-confirm state above. If the 5 minutes run out while the type-to-confirm dialog is open, SYNC-096 step 1 still applies when the user confirms (the step 1 message shows, nothing is deleted). (Confirmed by RJ 2026-11-24, Open question 6.) | RJ 2026-11-23 (decision 7); [[ADR-0007 Firebase Accounts and Firestore]] consequences ("delete my account and data" option); [[UI Review 2026-11-24]] #10 (H-112) |
| SYNC-096 | MUST | **Deletion order:** (1) if the sign-in provider needs a recent sign-in to delete the account, get it first, before anything is deleted. A recent sign-in is needed when the last sign-in is more than 5 minutes ago or unknown (`AuthService.needsRecentSignIn()`). With **email link** (the launch provider) the user must **sign in again** with a fresh link: `reauthenticate()` returns `'needs-sign-in'`, the app shows "To delete your account, sign out, sign in again, then choose Delete account and data within 5 minutes." and deletes nothing. A **Google** popup re-authentication (`AuthService.reauthenticate()`) applies only when Google is enabled (SYNC-006) and the user has a Google identity; a cancelled popup shows "Your account wasn't deleted." and deletes nothing; (2) delete `users/{uid}` **first** (the marker other devices check, SYNC-053), then every document under `users/{uid}/decks` (tombstones included) and the three `state` documents; the deck list is read before the first delete, so a failed list read deletes nothing; (3) delete the Firebase Auth user; if the provider asks for a recent sign-in again at this point, step 1 runs again (documents are already gone, so the deletion stays unfinished until a retry); (4) clear every local store on this device, as for sign-out (SYNC-091: collection, tags, decks, locks, printing codes, view state, import Undo snapshot, sync log), so `sessionExpected` is false and no linked uid remains; (5) show "Your account and its data were deleted." If any step fails, stop, say what is left ("Some data couldn't be deleted. Try again."), and allow a retry that continues from where it stopped (a missing account document is not an error for the deleting device); the Auth user is deleted only after every document is gone. A delete that is not acknowledged within 20 s counts as failed. **Retry:** the failure notice has a **Try again** action that reruns the deletion without the confirmation dialog; choosing Delete account and data again shows the SYNC-095 dialog. **Unfinished deletion (`deletingUid`):** after step 1 succeeds and before step 2 starts, the device records `deletingUid` = this uid. While it equals the signed-in uid, the device does **no pull and no push** for that uid, across reloads and after signing in again; the status is Error with "Some data couldn't be deleted. Try again." (so it never treats its own unfinished deletion as SYNC-097's half-deleted account). It is cleared only by a completed deletion (step 4), by a **sign-out** (which clears the sync log, SYNC-091; v0.7 said "Remove from this device"; sign-out stays allowed here, confirmed by RJ 2026-11-24, Open question 1), and by Cancel deletion below. **Account menu during an unfinished deletion (built H-127; v0.10 changes H-111, built H-142):** while `deletingUid` equals the signed-in uid, the account menu shows the Error status exactly "Some data couldn't be deleted. Try again." with **no** pending count (SYNC-084), a **Try deleting again** action (the same as the notice's **Try again**: reruns the deletion without the confirmation dialog; the menu label says what is retried, the notice keeps "Try again"), and **no Sync now** item (hidden, not disabled: it could do nothing while pull and push are blocked). Sign out and Delete account and data stay. This holds after a reload and after signing in again, not only while the failure notice is on screen. When `deletingUid` is cleared (Cancel deletion, or a completed deletion), Sync now and the pending count return. (Confirmed by RJ 2026-11-24, Open question 5.) **Cancel deletion (RJ decision 12, 2026-11-23; built H-127):** `RemoteStore.deleteAll` reports on failure whether anything was (or may have been) removed (`removedAny`). The device keeps `deletingRemovedAny` in the sync log: set to false when `deletingUid` is first recorded; set to true, and never back to false, as soon as one attempt reports `removedAny: true`; kept across reloads and retries; cleared with `deletingUid`. A delete that timed out (`'unconfirmed'`) may have landed, so it counts as removed. While `deletingRemovedAny` is false (nothing removed: the first delete, `users/{uid}`, failed, or the deck list read failed before it), the account menu also offers **Cancel deletion** (the failure notice MAY offer it too). It clears `deletingUid` and `deletingRemovedAny`, shows "Your account wasn't deleted.", and resumes normal syncing (account check, pull, push of pending items). Once it is true, only **Try deleting again** is offered (or Sign out, which clears this device). The v0.7 gap (no `removedAny`, no Cancel deletion, no menu retry) was closed by H-127. | [[ADR-0007 Firebase Accounts and Firestore]]; [[Firestore Data Shape]] ("Delete account and data: N + 4 deletes"); RJ 2026-11-23 (decision 12, board H-074); as built in H-062 ([[Validation H-062]] rounds 2–3); [[UI Review 2026-11-24]] #9 (H-111) |
| SYNC-097 | MUST | **Deleted account on another device.** The signals are: the account document is missing on a device whose linked uid is this uid (SYNC-053), an `update()` fails with not-found, a create is denied and the repeated account check finds the account document missing (SYNC-053), or the session cannot be restored. On any of them the device stops writing and calls `AuthService.checkAccount()`, which returns `ok`, `deleted` (the provider reports that the user no longer exists), `signed-out`, or `offline`. **`deleted`:** it signs out and clears this device as for sign-out (SYNC-091: every local store and the sync log, so `sessionExpected` is false and no linked uid remains), and shows "This account was deleted. Its data has been removed from this device." (RJ decision 8.) **`ok` with the account document missing** (a deletion in progress or one that stopped half-way): it writes nothing and **signs out** (RJ decision 11). **v0.8 (RJ decision 13 a; built H-081):** it also **clears this device** as for sign-out, because there is no signed-out data any more. It shows "This account is being deleted, so you've been signed out and its data was removed from this device." **Why clearing is consistent:** once `users/{uid}` is gone the deletion can only go forward (Cancel deletion is offered only while nothing was removed, RJ decision 12), and a kept copy could never be shown or uploaded (SYNC-009, SYNC-048). Unsynced changes on this device are lost with it. In the first-sign-in case (SYNC-048 f) the device is already empty. Leftover cloud documents are never imported or changed; the deleting device's retry (SYNC-096) removes them. **As built vs new:** the detection and the sign-out are as built (the built half-deleted branch keeps the data); the clearing and the new message are new (H-081). The v0.7 H-075 item "`halfDeleted()` also clears `uploadingUid`" is covered by clearing the whole sync log. **`signed-out`:** SYNC-086. **`offline`:** retry on the next SYNC-040 trigger. **Mapping inside the `AuthService` adapter:** `checkAccount()` first forces a token refresh (`getIdToken(true)`), then `reload()`s the user. **Verified on the Auth emulator** (H-062, 2026-11-23, `web/rules-tests/auth.test.ts`): for a deleted user, `reload()` fails with `auth/user-token-expired` and the forced refresh fails with `auth/invalid-refresh-token`; for revoked tokens, `reload()` fails with `auth/user-token-expired` while the refresh still succeeds; for a disabled user, both fail with `auth/user-disabled`. So `reload()` alone cannot tell deleted from revoked, and the refresh runs first. Codes: `auth/invalid-refresh-token` and `auth/user-not-found` → `deleted`; `auth/network-request-failed` → `offline`; every other code (including `auth/user-token-expired` and `auth/user-disabled`) → `signed-out`, so local data is kept. **Production** codes are still `unverified` (the adapter assumes production reports a deleted user as `auth/user-not-found`); any unclear result counts as `signed-out`. | design decision 8; design rule; Auth emulator codes as verified in H-062 ([[Validation H-062]] round 2) |
| SYNC-098 | MUST | After deletion, no document remains under `users/{uid}`, and a device that still holds a valid session cannot recreate one: it never writes before the account check (SYNC-053), and the rules refuse to create a `state` or `decks` document unless the account document exists after the write (SYNC-113). A later sign-in with the same provider identity is a new, empty account. **Residual risks (v0.8, reported, not prevented):** (1) a device that runs or reruns its first-sign-in flow with a still-valid token after the deletion finished finds nothing and creates an empty `users/{uid}` (case a); since the first sign-in never uploads, no collection, tag, deck or lock comes back (v0.7's "could recreate an account" with data is gone); (2) while a deletion stays half-finished, every sign-in to that account signs out again (SYNC-048 f) until the device that started it retries; if that device signs out first (which clears `deletingUid`), no device can finish the deletion from the app; (3) after a lost session (SYNC-086), signing in as a different account clears the first account's unsynced changes on this device (SYNC-048); (4) **Sign out anyway** with pending items loses them (the user was warned, SYNC-090); (5) the SYNC-097 half-deleted sign-out drops that device's unsynced changes. v0.7's risk "a half-deleted sign-out keeps a signed-out copy" no longer exists. | design rule; RJ decision 13 |

### I. Privacy
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-100 | MUST | The cloud stores only what SYNC-010…018 list: card keys, counts and printing ids; tag labels, colours and flags; deck names, sources, notes and card lists; lock times; timestamps; app build. Email address and photo stay with the sign-in provider in Firebase Auth and are not copied into Firestore, logs or analytics. **The one exception (v0.14, SYNC-156):** the **username** the user chooses (a display name only they see) is stored in the account document `users/{uid}.username`, in the sync log's cache of it, and nowhere else: not in the Firebase Auth profile, not in logs or analytics, and not in any other document. **Showing the address to its owner is allowed (v0.10, H-109):** the account menu's "Signed in as `{email}`" (SYNC-003) and the sent state's address (SYNC-006) show it only on the user's own device, read from Firebase Auth (or, before sign-in, from the address the user just typed and the SYNC-006 stored address); neither adds a copy anywhere: nothing new is written to a local store, the sync log, Firestore, logs or analytics. | [[ADR-0007 Firebase Accounts and Firestore]] (user data is text only); [[UI Review 2026-11-24]] #8 (H-109) |
| SYNC-101 | MUST | **Privacy notice** (v0.13, H-152; legal content from [[Privacy Notice Requirements]], H-069, `as_of` 2026-11-24; **not legal advice**). The app has one public privacy notice page, at the route **`/privacy`** (SYNC-104), that is never gated (SYNC-009) and is linked from the sign-in dialog, the account menu and the footer (SYNC-104). It MUST state every item of the checklist SYNC-103, in plain language, in the order of the draft [[Privacy Notice Draft]] (the draft is the proposed text; the page is built from the version RJ approves). **RJ approves the notice text before the account-only build is deployed to production** (RJ decision 10, "Privacy notice", Decisions section below; SYNC-007 condition 2). The approval gate is recorded in [[Privacy Notice Draft]] (`status: review`; it becomes `approved` with RJ's date) and on board H-152. **Launch scope:** sign-in is **email link only** (SYNC-006, RJ 2026-11-24, H-063). The notice describes what Firebase Authentication email-link sign-in and Cloud Firestore actually collect and does **not** name Google sign-in; if `'google'` is later added to `authProviders`, SYNC-103 item 24 applies and the notice is re-approved first. "Settings" in earlier versions means the **account menu** since Brief H-175 (RJ decisions 2, H-178): the notice is linked from that menu, and delete-everything lives in its Account Information dialog (SYNC-095). | [[ADR-0007 Firebase Accounts and Firestore]] consequences ("a privacy policy"); [[Card Data & Images]] #7 (data removal); [[Privacy Notice Requirements]] checklist; RJ 2026-11-24 (decision 10; H-063 email link only; Brief H-175 decisions); CalOPPA 22575 (conspicuous link, effective date, DNT, changes) |
| SYNC-103 | MUST | **What the notice states** (each item is checkable; numbering follows [[Privacy Notice Requirements]] "Checklist", the draft marks RJ-supplied values as `[RJ: …]` blanks). (1) **Who we are:** Rift Builder is a free, non-commercial fan project run by one individual in the US, with the controller's name and a **contact email** (the dedicated support inbox, RJ supplies both); no postal address. (2) **Effective date** and last-updated date (RJ supplies). (3) **How changes are announced:** the page shows a new date; a material change also shows a notice in the app (method chosen by RJ, blank in the draft). (4) **Data categories we store:** email address (Firebase Authentication), Firebase user id, **username** (the display name the user chooses, v0.14, stored in the account document), collection (card keys, counts, printing ids), tags (labels, colours, flags), decks (names, sources, notes, card lists), lock times, timestamps, app build version; tag labels, deck names and notes are free text the user controls and should not hold personal data (SYNC-100). (5) **What Google collects for us:** Firebase Authentication also keeps the **IP address and user agent** of sign-in requests for security and abuse prevention (IP logs a few weeks). Auth emails are sent from `noreply@riftbound-deckbuilder.firebaseapp.com` (send-only; replies are not read; the contact email is the support inbox). (6) **What we do not collect:** no analytics, advertising or tracking tools, no payment data, no **Riot account or Riot login data** (Rift Builder does not use Riot Sign On), nothing from signed-out use of Home and Tournaments. (7) **Purposes:** run the account, keep collection, tags, decks and locks in sync across the user's devices, keep the service secure, delete on request; never marketing or sale. (8) **Legal basis** (for people in the EU or UK): the service the user asks for, and our legitimate interest in security (RJ approves the wording; no consent basis is used). (9) **Recipients:** Google (Firebase Authentication, Cloud Firestore, Firebase Hosting) as our service provider / processor, nobody else, no sale or sharing; plus the **card-image host** if card images load from a Riot or other third-party host (the browser then sends its IP address and user agent to that host; conditional on H-020, [[Card Data & Images]]: keep the line while the source is not final, drop it only when images are same-origin). (10) **Where it is stored:** Firestore in `us-south1` (Dallas, USA), Firebase Authentication from US data centers; people outside the US are told the data goes to the US, protected by Google's transfer mechanisms (EU-US Data Privacy Framework or standard contractual clauses). (11) **Who can read it:** only the signed-in owner through the app (SYNC-110, SYNC-102); the operator can technically open the database console as administrator (RJ confirms the wording). (12) **Browser storage:** the browser caches the account's data and view settings (`rift.` keys, SYNC-141), the email typed during an email-link sign-in (`rift.emailForSignIn`, removed when sign-in completes, SYNC-006), the Firebase sign-in session and the **theme choice** (`device-theme`, light or dark, kept on the device even after sign-out because it is a device setting, not account data, SYNC-157); used only to run what the user asked for, the app sets **no cookies** and shows **no cookie banner** (verify in DevTools before launch, [[Privacy Notice Requirements]] fact 25); sign-out and account deletion clear the copy on the device (SYNC-091, SYNC-142). (13) **Do Not Track and Global Privacy Control:** we do not track people across sites or over time and do not sell or share data, so DNT and GPC signals change nothing; no third party tracks users on this site through us (true only while no analytics, ad or embed is added). (14) **Retention:** kept until the user deletes the account; local copy cleared on sign-out; after deletion Google removes data from live and backup systems within about **180 days**; Auth IP logs a few weeks. (15) **Seeing, changing and deleting:** edit in the app; delete everything with **Delete account and data** in the account menu's Account Information dialog (SYNC-095, SYNC-096); other requests by email. (16) **Rights** for people in the EU or UK: access, correction, erasure, restriction, objection, portability; ask by email; answered within one month. (17) **Right to complain** to a data protection authority. (18) **Whether providing the data is required:** an email is needed only to make an account; Home and Tournaments work without one. (19) **No automated decisions or profiling.** (20) **Children:** not directed to children under 13, no knowing collection from them; accounts are for people **[RJ: 13 or 16]** and over (and, where local law sets a higher age, with a parent's permission); an under-age account found is deleted with its data. (21) **Security:** HTTPS in transit, encrypted at rest by Google; affected users are told of a breach where the law requires. (22) **Riot:** a fan project not endorsed by Riot Games, with the footer's legal line (verbatim: `Rift Builder was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.`) and no Riot account or API data about the user collected. (23) **Links:** the notice is the target of the links of SYNC-104. (24) **Google sign-in (only if later enabled):** not in the launch text; the notice is updated and re-approved before `'google'` is added to `authProviders`. Wording that depends on an unverified research row (GDPR applicability, COPPA 2025 dates, Spark-plan DPA, Firebase "business use" terms) is `status: unverified` in [[Privacy Notice Requirements]]; the draft states facts only and hedges nothing as law. | [[Privacy Notice Requirements]] (checklist 1–24, facts 1–29); [[Firestore Data Shape]]; SYNC-100; SYNC-141 |
| SYNC-104 | MUST | **Notice page and links** (builder item H-152 build). (a) **Route:** `/privacy`, public (SYNC-009 never gates it), reachable signed out, signed in, offline once loaded (it is static text bundled with the app, no Firebase load, SYNC-002, no network request beyond the app's own files). Unknown paths still go to Home. (b) **Page content:** the page heading "Privacy notice", the effective date near the top (SYNC-103 item 2), then the sections of the approved text; plain text and headings only (no tracking, no embeds); the normal header and footer stay. (c) **Sign-in dialog:** a text link "Privacy notice" under the email form (and in the sent state) that opens `/privacy` in a **new tab** (`target="_blank"`, `rel="noopener"`), so a sign-in in progress is not lost. (d) **Account menu:** a menu item "Privacy notice" (Brief H-175 order: username, Signed in as, sync status, Account Information, Theme, Sign out), placed **after Theme and before Sign out**; it navigates to `/privacy` in the same tab (the menu closes). (v0.14: this order is unchanged and is the order of SYNC-151; Theme stays in the menu and the footer also carries the Theme switch, SYNC-158, next to the Privacy notice link.) (e) **Footer:** a text link "Privacy notice" in the site footer on every page, next to the Riot legal line, visible signed in and out. (f) **Age line (SHOULD):** the sign-in dialog shows one short line near the form, for example "For ages [RJ: 13 or 16] and over." with the wording RJ approves in the draft. (g) The links are real anchors with the text "Privacy notice" (no icon-only link), keyboard reachable, and the page has one `<h1>`. (h) No new data field, request or storage key is added by the page or its links (SYNC-100). | RJ 2026-11-25 (context in H-152 brief); [[Privacy Notice Requirements]] checklist 23; Brief H-175 decisions 2 and 5 (menu order, footer) |
| SYNC-102 | MUST NOT | User data is never shared with other users, never readable by anyone but its owner through the app, and never used to compute anything about other users (no cross-user counts; ADR-0003). | [[ADR-0003 Tournament Results Only]]; design rule |

### J. Security rules and indexes (implemented in H-062)
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-110 | MUST | **Owner only.** A request may read, list, create, update or delete a document under `users/{uid}` only when `request.auth != null` and `request.auth.uid == uid`. Every other path, and every request without auth, is denied. | [[Firestore Data Shape]] "Security rules"; [[ADR-0007 Firebase Accounts and Firestore]] |
| SYNC-111 | MUST | **Known paths only.** Allowed: `users/{uid}`; `users/{uid}/state/{doc}` with `doc` one of `collection`, `tags`, `locks`; `users/{uid}/decks/{deckId}` with `deckId` matching a lowercase UUID (`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`). Anything else is denied. The name and id checks apply to get, create, update and delete. A `list` (query) of `users/{uid}/state` or `users/{uid}/decks` is allowed for the owner only, because a query cannot name its documents. | design rule; as built in H-062 (`firestore.rules`) |
| SYNC-112 | MUST | **Field validation on create and update** (delete needs only SYNC-110): only the listed keys may be present; `schemaVersion == 1` (int); `updatedAt` is a timestamp; `syncedAt == request.time`. Per document: account: `createdAt` timestamp, `lastClientVersion` string ≤ 40, optional `username` (v0.14, SYNC-156; **not allowed on create**, allowed on update. **v0.16 (H-212, RJ 2026-11-25 "Rules check 20 too"): when the request sets a `username` different from the stored one, the rules enforce the full SYNC-153 test themselves: a string, `size()` 1 to 80 (cheap first bound, not the user limit), the allowed character set and 1 to 20 code points, no variation selector, no leading, trailing or doubled space; the exact expression, the invariant and the verification are SYNC-160.** (v0.15 had only the 80 bound and no character check; superseded.) **Unchanged names are not re-checked:** an update that leaves `username` as stored (or absent) passes without any username test, so a name saved under the old limits (v0.14: emoji, up to 456 units; only test accounts have one, sign-in is not live) never blocks the per-build `lastClientVersion` update (SYNC-012); the username checks apply only when the request sets a different `username`. **Worked worst case:** the longest name the client accepts is 20 code points, and the widest per code point is a letter outside the Basic Multilingual Plane, e.g. 20 × `𝐀` (U+1D400 MATHEMATICAL BOLD CAPITAL A, `\p{L}`) or 20 × `𠀀` (U+20000, a CJK letter): **20 code points = 40 UTF-16 units = 80 UTF-8 bytes**. Combining marks count toward the 20 (SYNC-153 (3)), so they add no extra units beyond that (a name of 20 code points never exceeds 40 units and 80 bytes, whatever mix it holds). Which unit `string.size()` counts: on the **Firestore emulator it counts UTF-16 code units** (verified 2026-11-25, H-183 probe in `web/rules-tests/firestore.rules.test.ts`, see [[API Contracts]]); in **production it is `unverified`** (code points or UTF-8 bytes are possible). The 80 is at or above the worst case under all three units (40 units, 20 code points, 80 bytes), so **this bound never rejects a name the client accepted**, in any of them; under UTF-16 units it is twice the exact bound (40), which is the price of not depending on the unverified production unit. Since v0.16 the exact 20-code-point limit is the pattern's `{0,19}` (SYNC-160), which counts code points whatever `size()` counts; the 80 only keeps a very long string away from the pattern. (Previously, v0.14.1: cap 2000 for 24 graphemes and 500 UTF-16 units; superseded.)), and on update `createdAt` must equal the stored value. collection: `catalogVersion` string ≤ 100, `cards` map with `size() ≤ 6000`. tags: `tags` map `size() ≤ 400`, `assignments` map `size() ≤ 6000`. locks: `locks` map `size() ≤ 400` (caps: design decision 7). deck (live): exactly the keys `schemaVersion`, `updatedAt`, `syncedAt`, `deletedAt` (`== null`), `createdAt` (timestamp), `name` (string 1–80, DECK-070), `format` (one of the SPEC-002 `FormatId` values, today `'standard'`), `source` (map), `sourceFormat` (one of the SPEC-006 `DeckSourceFormat` values), `notes` (string ≤ 4000, DECK-073), `catalogVersion` (string ≤ 100), `legend`, `champion` (map or null), `main`, `sideboard`, `runes`, `battlefields` (lists, `size() ≤ 150`, DECK-092), and optionally `duplicatedFrom` (string ≤ 36 characters, 36 = UUID length, DECK-084; the rules check the length only, not the UUID format) and `importRemovedLines` (list; no size cap, SPEC-006 sets none: the 1 MiB document limit bounds it, SYNC-124). deck tombstone: exactly `schemaVersion`, `createdAt`, `updatedAt`, `deletedAt` (timestamp), `syncedAt`. The 100-character `catalogVersion` and 40-character `lastClientVersion` caps are design caps: SPEC-001 CARD-068 builds `catalogVersion` as `<schemaVersion>+<lastUpdated>`, e.g. `0.2+2026-11-20T18:04:00Z` (24 characters). A new `FormatId` or `DeckSourceFormat` value needs a rules update in the same change. Map entries inside `cards`, `tags`, `assignments`, `locks` are not checked by rules (SYNC-047 covers them). | [[Firestore Data Shape]] "Security rules", fact 3; [[Deck Import]] DECK-070…073, DECK-084, DECK-092, `DeckSourceFormat`; [[Deck Legality]] `FormatId`; [[Card Data Model]] CARD-068 |
| SYNC-113 | MUST NOT | Rules use no `get()` or `exists()` lookups (each is billed as a read), with one exception: **creating** a `state` or `decks` document requires `existsAfter(/databases/$(database)/documents/users/$(uid))`, so documents can only be created in an account whose account document exists (or is created in the same batch). Creates are rare (a new deck, or the first write of a `state` document after the account is created). This spec counts **1 billed read per created document** as an upper bound (SYNC-120). Updates and deletes use no lookup. `unverified` (H-070): whether `existsAfter()` is billed when the looked-up document is written in the same batch, whether repeated identical lookups in one batch are billed once, and the per-request limit on rule lookups. **v0.8:** the first sign-in creates no `state` or `decks` document (SYNC-050), so there is no multi-create upload any more and these points matter much less; regular pushes create documents one write at a time, after the account document exists. The `PushChanges.batch` split stays in the code but the first-sign-in flow no longer uses it. | [[Firestore Data Shape]] fact 10; design decision 8; batch split as built in H-062 |
| SYNC-114 | MUST | **Rules tests** (Firestore emulator) show at least: user B cannot get, list, create, update or delete any of user A's documents (all five paths); an unauthenticated request is denied on every path; an unknown path (`users/A/other/x`, `users/A/state/views`) is denied for A; a write with an extra key, a wrong `schemaVersion`, a client-set `syncedAt`, or a 151-entry `main` is denied; creating `users/A/decks/<id>` while `users/A` does not exist is denied, and allowed in a batch that also creates `users/A`; each valid document shape of SYNC-012…018 (including both tombstone forms) is allowed for its owner. The tests run with `cd web; npm run test:rules` (Firestore and Auth emulators). The emulators need **Java 21**. On RJ's PC, Android Studio's bundled JBR works: set `JAVA_HOME` to `C:\Program Files\Android\Android Studio\jbr` for that command. | board H-062 (rules tested against other-user access); [[Validation H-062]] (Java note) |
| SYNC-115 | MUST | **Indexes.** `firestore.indexes.json` exempts every field except `syncedAt` from single-field indexing (`fieldOverrides` with `indexes: []`): on `state`: `cards`, `catalogVersion`, `tags`, `assignments`, `locks`, `updatedAt`, `schemaVersion`; on `decks`: every `UserDeck` field plus `deletedAt`, `updatedAt`, `createdAt`, `schemaVersion`. `syncedAt` keeps its default index. No composite index is needed. | [[Firestore Data Shape]] "Indexes", fact 4 |
| SYNC-116 | MUST | The only queries are the two cursor queries of SYNC-040 (and the same without a cursor for SYNC-045 and SYNC-096). | [[Firestore Data Shape]] "Indexes" |
| SYNC-117 | MUST | `firestore.rules` and `firestore.indexes.json` are deployed with `firebase deploy --only firestore` before the sign-in UI ships; until then the deny-all rules of ADR-0007 stay. | [[ADR-0007 Firebase Accounts and Firestore]] "Rules today" |
| SYNC-118 | MUST | **Rejected writes.** A write the rules reject (permission denied while the session is valid) keeps its items local and pending, marks them rejected in the sync log, shows Sync error "Some data couldn't be synced: `<area>` (`<deck name>` for a deck)." and is not retried until one of those items changes or **this device's** app build changes. Other documents keep syncing. The build change is device-local (`StoredSyncLog.lastBuild`, SYNC-012): on the first pull of a session where `lastBuild` differs from this build, the device clears its `rejected` list, so those items are pushed again; it does not matter whether another device already wrote this build to the account. **Note:** the build is the `appVersion` string in the build configuration, which is a fixed value today (`web-0.0.0` in production); it changes only when someone edits it, so today a release never retries rejected items. v0.8 makes `appVersion` change with every build (SYNC-012; built H-078), which makes this retry and the SYNC-012 account update fire once per deployed build. | design rule; device-local build as built in H-062 ([[Validation H-062]] round 2) |
| SYNC-119 | MUST | **Map caps.** Before writing `state/collection`, `state/tags` or `state/locks`, if the map would exceed its SYNC-112 cap, the client drops tombstones from the write (`deleteField()`), oldest `t` first, even before 30 days, until it fits; dropping a tombstone early can let a device that has not synced since bring the item back (SYNC-044 limits this). If live items alone exceed the cap, the write is not sent and SYNC-124's "This data is too large to sync." applies. | design decision 7 |

### K. Cost and free tier
Facts from [[Firestore Data Shape]] (official Firebase pages, read 2026-11-23): Spark free quota 50,000 reads,
20,000 writes and 20,000 deletes per day, 1 GiB stored, 10 GiB/month outbound; max document 1 MiB; a disconnected
listener (over 30 minutes) re-reads every matching document; rule lookups are billed as reads.

| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-120 | MUST | Per-flow cost stays at or under the [[Firestore Data Shape]] table, plus the account check: reopen with no changes = 3 reads (account check + 2 empty queries; the note counted 2) and 0 writes; a later pull with no changes = 2 reads; import of 300 cards = 1 write; lock or unlock = 1 write; a new deck = 1 write + at most 1 rule-lookup read (SYNC-113); **changing the username = 1 write and 0 reads** (v0.14, SYNC-155; the value arrives with the account check that is already made, SYNC-053); **first sign-in (v0.8, SYNC-050)** = at most 3 reads + 1 per downloaded document (upper bound, as SYNC-040 counts), no rule lookups, and at most 1 write: into a new account 3 reads and 1 write; onto a device for an account with 10 decks and 3 `state` documents at most 16 reads and 0 writes (1 if the build changed). The rule-lookup read for new decks is an upper bound pending the SYNC-113 `unverified` points. | [[Firestore Data Shape]] "Sync flows" |
| SYNC-121 | MUST | Pushes are **debounced** by at least 2 s after the last change per document (collection +/− clicks, typing a quantity, tag edits, deck edits), so a burst of edits is one write. | [[Firestore Data Shape]] "Edit a deck", "What makes the biggest difference" |
| SYNC-122 | MUST NOT | No long-lived listener on the whole `decks` collection, and no polling while the tab is visible beyond SYNC-040's triggers. | [[Firestore Data Shape]] fact 9 |
| SYNC-123 | SHOULD | A heavy collection document stays under 700 KB; above that the app logs a warning for RJ (the 8-bucket split in [[Firestore Data Shape]] is the migration path, a future `schemaVersion: 2`). | [[Firestore Data Shape]] "Why not finer or coarser" |
| SYNC-124 | MUST | A write rejected because a document would exceed 1 MiB keeps the change local and pending, shows Sync error "This data is too large to sync.", and does not retry until the document's content changes. | [[Firestore Data Shape]] fact 3 |
| SYNC-125 | MUST NOT | No Firestore read or write happens for signed-out users (SYNC-002), so they cost nothing. This covers every visitor who only reads Home and Tournaments. Scrolling a list of cards or decks never reads Firestore (SYNC-141, SPEC-007 COLL-093). | [[Firestore Data Shape]] "Per day" |

### L. Architecture
| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-130 | MUST | Storage stays behind interfaces: features keep using `CollectionStore`, `TagStore`, `DeckStore`, `DeckLockStore` unchanged; Firestore is reached only through a `RemoteStore` adapter and sign-in only through an `AuthService` adapter. Firebase imports appear only in those adapter files, which are lazy-loaded (SYNC-002). | [[Spec Index]] cross-cutting constraints; [[ADR-0001 Tech Stack]]; [[Validation Checks]] V-011 |
| SYNC-131 | MUST | Merge, stamping and conflict resolution are **pure functions** of (local records, sync log, pulled documents, now), testable without Firestore. | design rule |

### M. Browser cache (v0.12, RJ decision 17)
RJ, 2026-11-24: "we can keep cached data in the browser to speed up load times like we can cache their
authentication and a few cards/decks." The account is the record of truth; this section says what the browser
keeps, why, and when it lets go. No mode exists in which the browser is the record of truth (SYNC-001).

| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-140 | MUST | **The browser holds a cache, never the record of truth.** The browser cache (Definitions) exists to make pages open fast and to keep them working offline. It holds data of **one** account at a time (the linked uid, SYNC-048). Nothing the user owns exists only in the browser, with one exception: changes the user made that are still **pending** (SYNC-031, SYNC-080) live in the cache and the sync log until the push succeeds. If the cache is lost (the browser clears site data, SYNC-146) the account still holds everything that was pushed. | RJ 2026-11-24 (decision 17); [[ADR-0007 Firebase Accounts and Firestore]] amendment 2 |
| SYNC-141 | MUST | **What is cached** (decision: cache the whole account, not only recent items). (a) **The session:** the sign-in session kept by Firebase Auth on this device, and the sync log's `sessionExpected` and linked uid (SYNC-004), so a reload restores the session and opens the gate without a sign-in (SYNC-009). (b) **All the account data the app has downloaded**, which after the first sign-in is all of it: the whole **collection** (`state/collection`, one document, so caching it whole costs exactly the one read that caching part of it would), the whole **tags** and **locks** documents, and **every live deck** (`decks/{deckId}`, up to 200, DECK-092), kept in the SPEC-003 / SPEC-007 / SPEC-006 / SPEC-008 stores. This covers, and goes beyond, RJ's "a few cards/decks" minimum (every card and deck the user has viewed is cached because every card and deck is). (c) **The sync log:** change times, tombstones, pending items, cursors (SYNC-030). (d) **Device preferences** that are not account data: Collection view state and saved views (SPEC-007 COLL-060, COLL-064), printing-code memory (COLL-075, rebuilt display data) and the import Undo snapshot (IMP-052): never synced (SYNC-019) and cleared with the cache (SYNC-142, as built); **the theme choice** (SYNC-157, browser key `device-theme`) is a **device setting**, not cache: it is not under the `rift.` prefix, it is never cleared by SYNC-142 and survives sign-out, account deletion and a different account signing in; other per-device preferences specified elsewhere are not cache and are not cleared either. (v0.14 also keeps the username in the sync log, `StoredSyncLog.username`, so the header shows it at once and offline; it is cleared with the log.) (e) **The public card catalog and card images:** not user data and not part of the account; kept by the browser's ordinary HTTP cache and a catalog snapshot request, they are **not** cleared by sign-out. **Why the whole account:** the first sign-in already downloads every `state` and `decks` document (SYNC-045, SYNC-048), later opens read only what changed (SYNC-040: 2 reads when nothing changed), and a partial cache would add a read per card or deck viewed and break offline use (SYNC-080). Size is small: [[Firestore Data Shape]] estimates ≈ 95 KB for a realistic user, ≈ 640 KB heavy, ≈ 1.9 MB worst case. **Not cached:** the user's email address (SYNC-100) beyond what Firebase Auth itself keeps for the session. | RJ 2026-11-24 (decision 17); [[Firestore Data Shape]] "Size", "Per day"; SYNC-040, SYNC-045 |
| SYNC-142 | MUST | **When the cache is cleared.** Exactly these events clear the whole cache in one step (every local store, the sync log, view state, printing-code memory and the import Undo snapshot; `sessionExpected` becomes false; no linked uid remains; nothing is written to the cloud and no tombstone is made, SYNC-033): (1) **sign-out** (SYNC-090, SYNC-091); (2) **account deletion** (SYNC-096 step 4); (3) a device that finds its account **deleted or half-deleted** (SYNC-097); (4) **a different account signing in**, or any sign-in whose first sync has not completed for that uid (the first-sign-in clear, SYNC-048 step 1), which also clears data left by the old no-account build. The cache is **not** cleared by: closing the tab or the browser, a reload, going offline, a lost session (SYNC-086: it is kept but hidden by the gate, so the same account signing in again resumes with its pending changes), or a failed or interrupted first sync (it starts over, SYNC-048). While the cache belongs to a uid other than the signed-in one, or no first sync has completed, nothing in it is shown (SYNC-009). **Never cleared by any of these events (v0.14):** the theme device setting (SYNC-157). | RJ 2026-11-24 (decision 17: "Sign-out, account deletion and a different account signing in clear it"); SYNC-048, SYNC-090, SYNC-091, SYNC-096, SYNC-097 |
| SYNC-143 | MUST NOT | **The cache is never uploaded.** No code path writes the contents of the cache into an account as a whole, at sign-in or at any other time. The only data that goes from the device to the cloud is **the pending items** the signed-in user changed while signed in to that account (SYNC-031, SYNC-043), pushed as latest-change-wins items. The first sign-in uploads nothing and makes at most 1 write (SYNC-048, SYNC-050). Cache data of another account or an older build is cleared, not merged (SYNC-049, SYNC-142). | RJ 2026-11-24 (decisions 13 d, 17); SYNC-048, SYNC-049 |
| SYNC-144 | MUST | **Cache first, then fresh.** With the gate open (SYNC-009) every screen is drawn from the cache at once, with no wait for the network and no loading state for cached data, also offline; the pull (SYNC-040) then updates what changed in place, as for a change in another tab (SPEC-005 OWN-071, SPEC-007 COLL-073). A cache that has not completed a full read in 30 days is refilled by a full read (SYNC-045). The cache never shows data of a different account than the session's (SYNC-142). | RJ 2026-11-24 (decision 17: "speed up load times"); SYNC-040, SYNC-045, SYNC-080 |
| SYNC-145 | MUST | **Scrolling and browsing cost no reads.** Scrolling or filtering a card or deck list, opening a card, a deck or a tag, and moving between pages read only the cache: they make **no Firestore request** (reads happen only at the SYNC-040 triggers). Lists load as you scroll without pagination ([[My Collection]] COLL-093, [[Your Decks Ownership View]] OWN-084, [[Tournament Deck Catalog]] CAT-079); "load" there means rendering rows and requesting card images, because the data is already cached. | RJ 2026-11-24 (decision 17: "no physical pagination"); SYNC-122, SYNC-125 |
| SYNC-146 | SHOULD | **When the browser drops the cache.** Browsers may clear site data under storage pressure or when the user clears it. The account keeps everything already pushed (SYNC-140). On the next start-up a cache that lost its sync log looks like a device that never signed in (`sessionExpected` is false): the gate asks to sign in (SYNC-009), and signing in runs the first-sign-in flow, which downloads the account again (SYNC-048). A cache that lost only some stores is handled by SYNC-033 (unreadable records are never pushed as deletions). Changes that were still pending in a cache the browser dropped are lost (residual risk, SYNC-098). The app MAY ask the browser for persistent storage to make this less likely; it MUST NOT warn the user about it. A failed write to the cache (storage full) is reported by the stores' own save rules (SPEC-007 COLL-072, SPEC-006 DECK-093) and never blocks sync (SYNC-085). | design rule; RJ 2026-11-24 (decision 17) |

### N. Header account control, username, theme, and no `/import` (v0.14, H-174)
RJ, 2026-11-24 ([[ADR-0006 Two Imports - Collection and Decks]] "Header and import entry points" and its H-178
follow-up): the Import button becomes the account; usernames are display names; the theme is per device; imports
open from their own pages; `/import` is gone. Layout, spacing and visual detail are [[Brief H-175]] (RJ decisions
win over its older sections); this section holds the testable behaviour and strings. The strings written here are
spec-writer text in the brief's style, listed for RJ in Open question 13.

| ID | Level | Requirement | Source |
|---|---|---|---|
| SYNC-150 | MUST | **Header account control.** The right end of the header holds **exactly one** control at every width; the phone bottom tab bar has three tabs (Decks, Collection, Tournaments), no Import tab, and on phones the account is reached from this control. There is no Import button anywhere in the header. (a) **Signed out, or session lost (SYNC-086):** the outlined **Sign in** button, which opens the SYNC-003 dialog (one label for new and returning users). (b) **Signed in:** one 44 px-tall **ghost** button (no fill, no border; hover and open state use the raised surface colour) holding a 28 px round **initial** (first grapheme of the username, upper-cased where the script has case; decorative, `aria-hidden`), the **username** and a chevron, and opening the account menu (SYNC-151). The name is one line, cut with an ellipsis when there is not room (it gives way before the wordmark and the tabs; at most `14rem` wide); the initial and chevron never shrink. (c) **No username** (the user chose **Not now**, SYNC-154, or the account was made before v0.14): the label is **Account** and the circle shows a person icon instead of an initial. (d) **Accessible name** `Account: {username}` (or `Account`): it contains the visible text and the **full** name even when the visible name is cut; the button exposes menu semantics (`aria-haspopup="menu"`, `aria-expanded`); no `title` tooltip. (e) **When it shows:** while the session state is not known yet, nothing is rendered at the right (the gate is decided from the sync log without loading `firebase`, SYNC-009). A signed-in user sees the control, with the name, **at once on a reload and offline**, because the name is read from `StoredSyncLog.username` (SYNC-156); while the first sync of a new device is running, until the account document has been read the label is **Account**, then the name. (f) The control's right edge is on the content edge. | RJ 2026-11-24 (ADR-0006 header change); [[Brief H-175]] H1…H7, RJ decisions 2, 5 (H-178) |
| SYNC-151 | MUST | **Account menu.** Top to bottom: (1) the **username** line, full name, plain text, wraps, left out when there is no username (included in the menu's accessible description); (2) "Signed in as `{email}`" (SYNC-003); (3) the sync status (SYNC-084), with "You're offline." when offline; **divider**; (4) **Sync now**, or, during an unfinished deletion, **Try deleting again** and, while allowed, **Cancel deletion**, with no Sync now (SYNC-096); **divider**; (5) **Account Information** (opens the SYNC-152 dialog); (6) **Theme**, a group of three radio items **System**, **Light**, **Dark** with exactly one checked (a check mark, so the choice is not shown by colour alone); choosing one applies it at once (SYNC-157) and closes the menu; (7) **Privacy notice** (SYNC-104 d); **divider**; (8) **Sign out** (SYNC-090). Exactly 3 dividers, never first, last or adjacent (H-110). **No** "Settings" item, no `/account` link and **no Delete account and data item**: that action is in the Account Information dialog (SYNC-152). **Offline:** Sync now and Sign out are disabled as `aria-disabled` (SYNC-081); Account Information, Theme and Privacy notice stay enabled (they need no network). During an unfinished deletion all of items 1 to 3 and 5 to 8 stay. The grouping and dividers are the spec-writer's reading of RJ's order (menu: username, Account Information, Theme, Sign out; SYNC-104 d adds Privacy notice); the look is the brief's. | RJ 2026-11-24 (H-178 decision 2); [[Brief H-175]] §2 (superseded where it says `/account`); SYNC-104 d (order); SYNC-096, SYNC-081 |
| SYNC-152 | MUST | **Account Information dialog** (opened by the menu item; there is no Settings page and no `/account` route). Title **Account Information**. Content: (a) a **Username** row: the current name (wraps) and a text button **Change** (accessible name "Change username"), or, with no username, "No username yet." and the button **Add username**; the line "Shown at the top right. Only you can see it."; both open the SYNC-155 dialog on top, and when it closes (Save or Cancel) focus returns to the button that opened it, the row showing the new name; (b) below a separating rule, a **Delete account and data** button in the danger style with the line "Deletes your account and everything saved in it, on every device. This can't be undone."; it opens the SYNC-095 dialog on top, unchanged (type `delete`, or the sign-in-first state), and focus returns to this button when that dialog is cancelled; (c) a **Close** button; Escape and **Close** close it. After a completed deletion (SYNC-096 step 5) every dialog closes. The SYNC-095 sign-in-first state's **Sign out** button closes **both** dialogs and opens the SYNC-090 dialog. **Offline:** Change / Add username opens its dialog with Save disabled (SYNC-155); **Delete account and data** is `aria-disabled` with "You're offline." under it (as the menu's Sign out, SYNC-081). **During an unfinished deletion** (SYNC-096) Delete account and data stays enabled and the dialog shows the same Error status text above it. It is reachable only with the gate open (the menu exists only for a signed-in user); it holds no sign-out button (Sign out is in the menu). | RJ 2026-11-24 (H-178 decision 2: "Account Information" as a menu item for username changing and deleting account); [[Brief H-175]] A1, A4 adapted to a dialog |
| SYNC-153 | MUST | **Username rules** (v0.15, H-206. RJ decision 20, 2026-11-25: "let's limit usernames to 20 characters and not include emojis" (supersedes decision 1 of H-178: 1–24 characters, any script and emoji). **RJ confirmed the allowed set in (4) on 2026-11-25 (H-212, "stick with my allowed characters. set up our own validation"; Open question 14 closed)** and that the server enforces it and the 20-character limit (SYNC-160, "Rules check 20 too"). RJ did **not** speak about the counting unit in (3) (code points), the NFC step, or `’` by name; those stay as specified and are covered by his "stick with" and by the rules' regex counting code points (SYNC-160). The value is normalized then checked, in this order: (0) **NFC-normalize** (`String.prototype.normalize('NFC')`), so `e` + U+0301 and `é` are the same name and count the same; (1) **trim** leading and trailing whitespace; (2) **collapse** every inner run of whitespace (`\p{Zs}`: spaces, no-break spaces) to one U+0020; (3) **length 1 to 20 characters**, where a character is **one Unicode code point** of the normalized value (`[...value].length`, no `Intl.Segmenter`): a combining mark counts as 1, so a name written with separate marks (Devanagari, Thai, decomposed accents that have no precomposed form) uses more of the 20 than it looks; this keeps the count the same in every browser and makes the bound in SYNC-112 exact; (4) **allowed (the only characters accepted):** the value must match `^[\p{L}\p{Nd}][\p{L}\p{Mn}\p{Mc}\p{Nd} ._'’-]*$` (JavaScript, `u` flag): that is letters of any script, decimal digits of any script, the combining marks that scripts need (`\p{Mn}`, `\p{Mc}`), the space, and the punctuation `.` `_` `-` `'` and the typographic apostrophe `’` (U+2019, what phone keyboards type); the first character must be a letter or digit (so a name cannot start with a space, mark or punctuation); **and** the value contains no variation selector (U+FE00 to U+FE0F, U+E0100 to U+E01EF; U+FE0F would otherwise turn a digit into a keycap emoji with U+20E3, which is `\p{Me}` and so already refused) (that second test is a separate check, because the character class cannot subtract); (5) **everything else is refused, which is what "no emoji" means in practice:** emoji and every other pictograph and symbol (`\p{So}`, `\p{Sk}`, `\p{Sm}`, `\p{Sc}`; skin-tone modifiers; regional-indicator flags), the zero-width joiner and other invisible or format characters (`\p{Cf}`: U+200B to U+200F, U+2060, U+FEFF), the bidirectional override and isolate controls (U+202A to U+202E, U+2066 to U+2069), all control characters (tab, line feed, carriage return: **no line breaks**), the line and paragraph separators (U+2028, U+2029), private-use, unassigned and surrogate code points, and punctuation other than the five above; (6) **not empty:** after trimming at least one non-whitespace character must remain; a name cannot be cleared once set (there is no "remove username" action: the name is shown only to its owner, so there is nothing to hide). **Not unique:** two accounts may have the same username; nothing checks or reveals other accounts' names (SYNC-102). The name is shown as plain text everywhere (never as HTML). Errors (inline under the field, with an icon, `aria-invalid="true"`, tied by `aria-describedby`, focus stays in the field): empty → "Enter a username."; over 20 characters → "Use 20 characters or fewer." (pasted text is never cut, the error shows; the field has no `maxlength`); a not-allowed character (the SYNC-153 (4) test fails; checked after the length) → "Use letters, numbers, spaces and . _ - ' only. No emoji."; the field shows a counter `n / 20` (the code-point count of the value after steps 0 to 2, so a trailing space does not count; it updates as RJ types and turns to the error colour with an icon above 20; it is `aria-describedby` text, announced politely, not on every key). Both errors can apply; the length error shows first. **Two checks, one rule (v0.16):** the client check above is for the user's message; the Firestore rules enforce the same set and length again when `username` changes (SYNC-160), so a modified client cannot store another name. The client's output (NFC, trimmed, collapsed) is always inside what the rules accept; the rules cannot check NFC (SYNC-160 (f)). | RJ 2026-11-25 (H-206: 20 characters, no emoji); RJ 2026-11-24 (H-178 decision 1, superseded for length and emoji); [[Brief H-175]] U3, U5 |
| SYNC-154 | MUST | **The username prompt, once.** Right after the first sign-in that **creates the account** (SYNC-048 case (a): no account document existed), after the "You're signed in." notice, a dialog **Choose a username** opens over the page the sign-in returned to, also while the first sync is still running. Text: "It's shown at the top right of every page. Only you can see it, and you can change it any time in Account Information." Field **Username** focused and empty (nothing is guessed from the email), `autocomplete="nickname"`, `autocapitalize="words"`, `spellcheck="false"`, Enter saves, counter `n / 20` (SYNC-153); buttons **Not now** (text) and **Save** (filled). **Not now** and Escape close it with no username (the header then reads **Account**, SYNC-150 c); a click on the backdrop does nothing. It is **never shown again on its own**: not on another device, not on a later sign-in, not for an account made before v0.14 (those users add a name in Account Information, SYNC-152). If the tab is closed before it is answered it is not shown again (accepted: the name can be added in Account Information). **Save while the first sync is still running** is `aria-disabled` with the line "Getting your account ready…" above the buttons (the account document may not exist yet, SYNC-053), and works as soon as the flow completes (SYNC-048 step 4). | RJ 2026-11-24 (H-178 decision 1: the prompt is skippable, "Not now"); [[Brief H-175]] U1 |
| SYNC-155 | MUST | **Change username, and saving.** From Account Information (SYNC-152) the same dialog opens with the title **Change username** (or **Add username**), the line "Only you can see it.", the field filled with the current name and selected, and the buttons **Cancel** and **Save**; saving the unchanged value just closes. **Save** stays enabled and pressing it with an invalid value shows the SYNC-153 error (no silent disabled button). A valid Save normalizes the value (SYNC-153), makes **one `update()`** of `users/{uid}` setting `username`, `updatedAt` (now) and `syncedAt` (server time) (SYNC-156), immediately (no debounce, not a pending item, not in the sync log's pending set: it needs the network). On success: the dialog closes, `StoredSyncLog.username` is updated, the header and menu show the new name at once without a reload, focus returns to the opener (for the prompt: the header account control), and the success notice **Username saved.** shows (SYNC-087, 6 s, polite). On failure the dialog stays open, the value stays, and "Couldn't save your username. Check your connection and try again." shows under the field. **Offline:** Save is `aria-disabled` and "You're offline." shows above the buttons (SYNC-081). Two devices: the last write wins (server order); there is no tombstone and no merge; another device shows the new name from its next account check (SYNC-053: at its next start-up or sign-in), not live. A username save is a user write after the gate opened, so it never counts against the first sign-in's single write (SYNC-050). | RJ 2026-11-24 (ADR-0006: editable in account settings); [[Brief H-175]] U2, U4, U5 |
| SYNC-156 | MUST | **Where the username is stored.** (a) **Cloud:** the optional string field `username` of the account document `users/{uid}` (SYNC-012, SYNC-112): absent until chosen, never set at creation, normalized (SYNC-153), at most 20 code points and the SYNC-153 (4) character set, checked on the client and again in the rules when it changes (SYNC-160, SYNC-112). (b) **Device:** `StoredSyncLog.username` (string or `null`), read from the account document whenever the app reads it (the account check and the full read, SYNC-053, SYNC-045, and the `getAccount` result), written after a successful save (SYNC-155), and cleared with the sync log by every SYNC-142 event, so a signed-out device shows no name. (c) **Not stored:** in the Firebase Auth profile (`displayName` stays unset), in any `state` or `decks` document, in logs, analytics or URLs. (d) **Deletion:** deleting the account deletes `users/{uid}` and with it the username (SYNC-096). (e) **Cost and privacy:** no extra read (SYNC-120), one write per change; the username is personal data the notice lists (SYNC-103 item 4). | board H-174 ("add the username to the account document in the data contract and rules"); ADR-0006 ("Stored with the account"); [[Brief H-175]] U6 (Auth `displayName` recommended there; not used, design decision 9) |
| SYNC-157 | MUST | **Theme per device.** (a) **Values:** `system` (the default, and the result when nothing is saved or the saved value is unknown), `light`, `dark`. (b) **Storage:** one browser storage key, **`device-theme`**, holding `light` or `dark`; absent means system. The key is **outside the `rift.` prefix and is not part of the browser cache**: no cache-clearing event (SYNC-142: sign-out, account deletion, a deleted-account sign-out, a different account's first sign-in, SYNC-048 step 1) removes it, so the choice survives all of them, and "clear every `rift.` key" code must not match it. If the browser refuses the write (private mode, full storage) the theme still applies for this page load and no error is shown. (c) **Never synced:** not in Firestore, the sync log or any account document; a new device starts on system. (d) **How it applies:** `system` follows the device's light or dark setting and changes live when that setting changes while the app is open; `light` or `dark` overrides it; the whole app follows, including dialogs, menus, form fields and native controls, and the browser's theme colour. Switching is instant (no animation). (e) **No flash:** the saved choice is on the document before the first paint (a small script that runs before the app, since reading it in the app's start-up code is too late). (f) **Works signed out** and loads no Firebase (SYNC-002). The value holds no personal data. | RJ 2026-11-24 (ADR-0006: "remembered per device (browser storage); with nothing saved the app follows the system theme; not stored in the account"); [[Brief H-175]] T1…T4; H-172 builder note (the `rift.` wipe) |
| SYNC-158 | MUST | **Theme controls: the account menu and the footer.** Both set the same SYNC-157 value. (a) **Footer switch (everyone, signed in or out, on every page):** a three-option single-select control labelled **Theme** with **System**, **Light**, **Dark** (radio semantics, a check mark on the selected option so the choice is not colour alone, each option at least 44 px tall, keyboard operable); it sits in the site footer with the Privacy notice link and the Riot legal line, which stay as they are. (b) **Menu** (signed in): the Theme group of SYNC-151 item (6). (c) Both always show the current value, and changing one updates the other at once; a change made in another tab applies on that tab's next load (SHOULD: live, through the storage event). (d) Choosing applies at once: no Save button, no notice, no network request. | RJ 2026-11-24 (H-178 decision 5: "Theme while signed out: yes, a footer switch for everyone, plus the Theme item in the signed-in menu"); [[Brief H-175]] A2 (control), T1 |
| SYNC-159 | MUST | **`/import` is removed; imports open from their own pages.** (a) There is **no `/import` route, page, option cards, Import tab or Import button**. A request for `/import` (with or without a query) is handled like **any unknown path: it goes to Home `/`**. There is **no not-found page** and no special redirect rule for it (RJ's later answer, H-178 decision 6, supersedes the ADR's first text "old links show the not-found page" and the board row's "no redirect, not-found page"). (b) The collection import is **"Add to your collection"**, opened from the Collection page ([[My Collection]] COLL-094, [[Collection Import]] IMP-060); the deck import is **"Import deck"**, opened from the Decks page ([[Your Decks Ownership View]] OWN-094, [[Deck Import]] DECK-001). A finished collection import stays on Collection, a saved deck stays on Decks. (c) **One-shot query parameters** open the dialog from elsewhere (Home's buttons, a return after sign-in): `/collection?add=1` opens "Add to your collection" and `/decks?import=1` opens "Import deck", **once**, as soon as the gate is open and that page is ready to import, and the parameter is then removed from the address without adding a history entry. While the gate is closed the page shows the sign-in panel (SYNC-009) and the parameter is kept in the sign-in return path (SYNC-006), so the dialog opens after sign-in and the first sync. Any other value or parameter is ignored and left alone; a page that cannot import (card data unavailable, an unreadable collection) opens no dialog and still removes the parameter. (d) Home's buttons are **Add to your collection** (links to `/collection?add=1`) and **Import deck** (links to `/decks?import=1`); the "Import your cards" button and the how-it-works step tiles link the same way. No other place links to `/import`. | RJ 2026-11-24 (ADR-0006 header change; H-178 decision 6); [[Brief H-175]] §9 (parameters proposed there, named here) |
| SYNC-160 | MUST | **The rules check the username itself** (v0.16, H-212; RJ 2026-11-25 in chat: "stick with my allowed characters. set up our own validation"; asked what the rules should add, he chose "Rules check 20 too"). **(a) When:** in the account update (SYNC-112), only when the request sets a `username` that differs from the stored one (`before.get('username', null) != d.username`); an unchanged or absent `username` is not tested (legacy v0.14 names, e.g. emoji, keep passing, so the per-build `lastClientVersion` update never fails); a `username` on **create** is still denied. **(b) What must hold** (all of it, in this order, so the cheap test runs first): the value is a string; `size()` 1 to 80; it matches the **allowed pattern** `^[\p{L}\p{Nd}][\p{L}\p{Mn}\p{Mc}\p{Nd} ._'’-]{0,19}$` (one letter or digit first, then at most 19 more of letter, digit, combining mark, space, `.` `_` `'` `’` `-`; that is SYNC-153 (4) and **1 to 20 code points**); it contains no variation selector (U+FE00 to U+FE0F, U+E0100 to U+E01EF: they are category `Mn`, so the class admits them); it does not end in a space; it holds no two spaces in a row. **(c) The expression** (Firestore rules, whose `matches()` takes an RE2 expression and matches the **whole** string; inside a rules string `\\` is one backslash and `\'` one apostrophe; the builder may use double quotes instead): `function validUsername(u) { return u is string && u.size() >= 1 && u.size() <= 80 && u.matches('^[\\p{L}\\p{Nd}][\\p{L}\\p{Mn}\\p{Mc}\\p{Nd} ._\'’-]{0,19}$') && !u.matches('.*[\\x{FE00}-\\x{FE0F}\\x{E0100}-\\x{E01EF}].*') && !u.matches('.* $') && !u.matches('.*  .*'); }`, and `validAccountUpdate` accepts the `username` part when **any one** of these three holds: the request has no `username` key (`!('username' in d)`); `before.get('username', null) == d.username` (unchanged); `validUsername(d.username)` (joined with logical OR; no pipe characters are written here because this is a table cell). No change to `exactKeys`, create or the other fields. **(d) Why a regex counts the 20:** in RE2 a repetition counts **code points** (runes), not UTF-16 units or bytes, so `{0,19}` after the first character is exactly SYNC-153 (3) and 20 × `𝐀` (U+1D400, 40 units) passes while 21 does not; `size()` is not used for the 20 because its unit is `unverified` in production (SYNC-112). **(e) Spaces:** the client trims the ends and collapses runs to one U+0020 (SYNC-153 (1), (2)), so a name it accepts never starts or ends with a space or holds two in a row; the rules therefore refuse those (a leading space is already refused by the first-character class), and they allow only U+0020, not other `\p{Zs}`. **(f) The invariant:** every name the client accepts (after its normalization) the rules accept, and every name the rules accept the client would accept, **except** these, which rules cannot check or which differ by design: (1) **NFC**: the rules language has no normalization, so a name that is not in NFC (`Zoe` + U+0301 instead of `Zoé`) passes the rules if the pattern matches; the client always sends the NFC form, and an NFD name from a hand-made request only changes how the owner's own name is stored and counted (it is still at most 20 code points, which is the stricter side); (2) **Unicode version skew**: a letter assigned in a newer Unicode version than the rules engine knows is accepted by a new browser and refused by the rules (the save shows the SYNC-155 failure text; rare and accepted); (3) the client's counter and trimming happen before the rules see the value, so the rules see only the normalized result; (4) nothing else may differ: any other difference the builder finds is a bug to report, not to fix by loosening. **(g) Verification (BLOCKED until recorded, `unverified` today):** the claims that the rules engine supports `\p{..}` classes and `\x{..}` escapes, and counts `{0,19}` in code points, rest on RE2's documented syntax and are **not yet tested in this project**, in the emulator or in production. The builder's rules tests (`web/rules-tests`, `npm run test:rules`, Java 21) must prove them: **20 × U+1D400 allowed and 21 × U+1D400 denied** (proves `\p{L}` outside the Basic Multilingual Plane and code-point counting, because under UTF-16 or byte counting 20 would be denied or 21 allowed); 20 × `a` allowed, 21 × `a` denied; `नमस्ते` and `Zoe` + U+0301 allowed (proves `\p{Mn}`, `\p{Mc}`); `O’Neil` allowed (proves the non-ASCII apostrophe in the rules source; if the file's encoding is the problem use `\\x{2019}`); `a` + U+FE0F denied (proves the variation-selector exclusion works, since the class alone admits it). The emulator is not the production engine (its `size()` unit was only confirmed for the emulator, SYNC-112), so after the rules deploy the builder or orchestrator also records **one production check** (the Firebase Security Rules `projects.test` API run against the deployed ruleset with the same cases, or a throwaway test account saving and then deleting them): until that is recorded the spec's statement for production stays `unverified`, and the builder's report must say which was done. If the rules fail to **compile** at deploy, the deploy is refused and nothing changes (safe). **(h) Fallback, never a silent loosening:** if any proof above fails (a class or escape is rejected, or repetitions do not count code points), the builder **must not** weaken the rules (not back to the v0.15 length-only check, not a wider bound) and must not deploy them; it reports the failing case and the engine's message on the Handoff Board for the spec-writer, who puts the options to RJ: (1) restate the pattern with the syntax that does work (this may narrow the allowed set, RJ decides); (2) if only the counting is different, keep the character set in the rules and bound the length with the unit that is verified (looser than 20 for names of short characters, RJ decides); (3) client-only checks plus the `size()` bound as in v0.15 (what RJ decided against). | RJ 2026-11-25 (H-212, in chat, quoted above); [[Firestore Data Shape]] "Security rules" (RE2 `matches()` not yet verified here); SYNC-153, SYNC-112; RE2 syntax (github.com/google/re2/wiki/Syntax), Firestore rules `string.matches()` reference: **not re-fetched in this item, `unverified`** |

## Field mapping (for H-062)
| Local (spec) | Local field | Cloud document | Cloud field | Conversion |
|---|---|---|---|---|
| SPEC-003 `StoredCollection` | `schemaVersion` | `state/collection` | `schemaVersion` | own version (1), independent |
| | `updatedAt` (ISO) | | `updatedAt` | ISO ↔ timestamp; = latest card `t` written |
| | `catalogVersion` | | `catalogVersion` | as is |
| | `cards[k].quantity` | | `cards[k].q` | as is; tombstone `0` |
| | `cards[k].byPrinting` | | `cards[k].p` | as is; tombstone `{}` |
| sync log | `cards[k].t` | | `cards[k].t` | ms integer |
| sync log (v0.14) | `username` | `users/{uid}` | `username` | optional string; absent ↔ `null`; written only by SYNC-155 and read by the account check (SYNC-156) |
| SPEC-007 `StoredTags` | `schemaVersion` (3, SYNC-016) | `state/tags` | `schemaVersion` | own version (1), independent |
| | `updatedAt` (ISO) | | `updatedAt` | ISO ↔ timestamp |
| | `tags[]` (array) | | `tags` (map by id) | array ↔ map keyed by `Tag.id` |
| | `Tag.label`, `key`, `colour`, `excludeFromDecks` | | same names | as is |
| | `Tag.createdAt` (ISO) | | `createdAt` | ISO ↔ timestamp |
| sync log | `tags[id].t` | | `tags[id].updatedAt` | ms ↔ timestamp |
| | `assignments[target]` | | `assignments[target].a` | as is |
| sync log | `assignments[target].t` | | `assignments[target].t` | ms integer |
| SPEC-008 `StoredDeckLocks` | `schemaVersion` (1) | `state/locks` | `schemaVersion` | own version (1), independent |
| | `updatedAt` (ISO) | | `updatedAt` | ISO ↔ timestamp |
| | `locks[].deckId` | | `locks` key | array ↔ map |
| | `locks[].lockedAt` (ISO) | | `locks[id].lockedAt` | ISO ↔ timestamp; null = unlock tombstone |
| sync log | `locks[id].t` | | `locks[id].updatedAt` | ms ↔ timestamp |
| SPEC-006 `UserDeck` | `id` | `decks/{deckId}` | document id | not repeated |
| | `schemaVersion` (1) | | `schemaVersion` | same number (DECK-091) |
| | `createdAt`, `updatedAt` (ISO) | | same names | ISO ↔ timestamp; `updatedAt` monotonic (SYNC-031) |
| | every other field | | same names | as is (`DeckCard` = `{ cardKey, name, qty }`) |
| sync log | deck tombstone `deletedAt` | | `deletedAt` | ms ↔ timestamp; null for a live deck; a tombstone document has only `schemaVersion`, `createdAt`, `updatedAt` (= `deletedAt`), `deletedAt`, `syncedAt` (SYNC-018) |
| — | — | every document | `syncedAt` | server timestamp; becomes the cursor |

## Data contract
```ts
// shapes only; no implementation
import type { CardKey, PrintingId, StoredCollection } from './collection-import';   // SPEC-003 v0.11
import type { TagId, TagTarget, TagColour, StoredTags } from './my-collection';     // SPEC-007 v0.11 (TagId per SYNC-016)
import type { UserDeck } from './deck-import';                                       // SPEC-006 v0.8
import type { StoredDeckLocks } from './shared-cards';                              // SPEC-008 v0.4.4
type Ms = number;                 // ms since Unix epoch, client clock
type Timestamp = unknown;         // Firestore timestamp (adapter type)

// ---- Firestore documents (SYNC-010..018) ----
interface DocMeta { schemaVersion: 1; updatedAt: Timestamp; syncedAt: Timestamp }   // syncedAt = server time
interface AccountDoc extends DocMeta {
  createdAt: Timestamp; lastClientVersion: string;
  username?: string;                // v0.14 (SYNC-156): absent until chosen; never set at creation; 1-20 code points
                                    // after SYNC-153 normalization (NFC, trim, collapse), no emoji (allowed set in
                                    // SYNC-153 (4)); the rules re-check type, character set and 1-20 code points
                                    // when it changes, on update only (SYNC-160, SYNC-112; H-212)
}
interface CollectionDoc extends DocMeta {
  catalogVersion: string;
  cards: Record<CardKey, { q: number; t: Ms; p: Record<PrintingId, number> }>;      // q 0 + p {} = tombstone
}
interface TagsDoc extends DocMeta {
  tags: Record<TagId,
    | { label: string; key: string; colour: TagColour | null; excludeFromDecks: boolean;
        createdAt: Timestamp; updatedAt: Timestamp }
    | { deleted: true; updatedAt: Timestamp }>;                                      // tombstone
  assignments: Record<TagTarget, { a: TagId[]; t: Ms }>;                            // a [] = tombstone
}
interface LocksDoc extends DocMeta {
  locks: Record<string /* deckId */, { lockedAt: Timestamp | null; updatedAt: Timestamp }>; // null = unlocked
}
type DeckDoc =
  | (DocMeta & Omit<UserDeck, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>
      & { createdAt: Timestamp; deletedAt: null })
  | (DocMeta & { createdAt: Timestamp; deletedAt: Timestamp });                      // tombstone, updatedAt = deletedAt

// Engine form: inside the sync engine every Timestamp above is Ms; the Firebase adapter converts both ways
// and writes syncedAt with the server timestamp (SYNC-011). Source: web/src/app/shared/sync/sync-types.ts.

// ---- Device-local sync log (SYNC-030..035) ----
interface ItemStamp { t: Ms; deleted: boolean; h: string }   // h = value hash (SYNC-032); '' for a tombstone
interface StoredSyncLog {
  schemaVersion: 1;                         // the fields marked "optional" were added in H-062; older logs load
  uid: string | null;                       // linked uid: written only when a first sync completes (SYNC-048)
  sessionExpected: boolean;                 // SYNC-004; false after any sign-out or deletion (the log is cleared);
                                            // with uid + lastFullSyncAt it opens the gate (SYNC-009)
  recordUpdatedAt: { collection: string | null; tags: string | null; locks: string | null }; // SYNC-032
  knownDecks: Record<string, Ms>;           // deckId → updatedAt (or deletedAt) last stamped or pulled (SYNC-031/032)
  rejected: string[];                       // item refs '<list>:<key>' rejected by the rules (SYNC-118)
  cursors: { state: Ms | null; decks: Ms | null };   // largest syncedAt received (server time)
  lastFullSyncAt: Ms | null;                // client time of the last successful full read (SYNC-044/045)
  lastSyncAt: Ms | null;                    // client time of the last successful pull
  clockOffsetMs: number | null;             // SYNC-063
  cards: Record<CardKey, ItemStamp>;
  tags: Record<TagId, ItemStamp>;
  assignments: Record<TagTarget, ItemStamp>;
  locks: Record<string, { t: Ms; unlocked: boolean; h: string }>;  // h = lockedAt of the live lock, '' when
                                                                   // unlocked: lets reconcile see a re-lock (SYNC-032)
  deckTombstones: Record<string, {
    deletedAt: Ms;
    pushAfter: Ms;                          // delete + 10 s, the Undo window (SYNC-035); 0 when pulled from the cloud
    createdAt: Ms;                          // the deck's createdAt, needed by the tombstone document (SYNC-018)
    wasPending: boolean;                    // the deck was pending before the delete: an Undo keeps it pending (SYNC-035)
  }>;
  pending: { account: boolean; cards: CardKey[]; tags: TagId[]; assignments: TagTarget[];
             locks: string[]; decks: string[];
             collectionReplace?: boolean }; // next collection write is a Replace import: one set() (SYNC-014)
  cloudDocs: string[];                      // cloud documents known to exist: 'collection' | 'tags' | 'locks' |
                                            // 'deck:<id>'; decides set() vs update() and create detection (SYNC-053)
  deckCreated?: Record<string, Ms>;         // deckId → createdAt, so a reconciled tombstone carries it (SYNC-018)
  lastBuild?: string | null;                // this device's appVersion when it last synced: a change retries
                                            // rejected items (SYNC-118) and updates the account once (SYNC-012)
  uploadingUid?: string | null;             // v0.7 only. v0.8 never writes it (the first sign-in never uploads,
                                            // SYNC-048); an old value is ignored and dropped by the first-sign-in
                                            // clear (built H-081)
  deletingUid?: string | null;              // account deletion of this uid started here, not finished: no pull or
                                            // push for it; cleared by a completed deletion, a sign-out (clears the
                                            // log), or Cancel deletion (SYNC-096)
  sessionLostUid?: string | null;           // built H-081: set to the linked uid when SYNC-086 detects a
                                            // lost session; while it equals the linked uid the gate is closed, also
                                            // at start-up (SYNC-009); cleared by a successful sign-in, a restore of
                                            // the linked uid that passes the account check, and every log clear
  username?: string | null;                 // v0.14 (SYNC-156): cache of users/{uid}.username for the header (SYNC-150);
                                            // read with the account check, written after SYNC-155; cleared with the log
  deletingRemovedAny?: boolean;             // built H-127: false when deletingUid is first set; true once
                                            // any attempt removed (or may have removed, 'unconfirmed') a document;
                                            // never back to false; false → Cancel deletion offered (SYNC-096)
}
interface SyncLogStore { load(): Promise<StoredSyncLog | null>; save(s: StoredSyncLog): Promise<void> }
// emptySyncLog() resets every field, so sign-out, the first-sign-in clear (then sessionExpected = true),
// own deletion and the SYNC-097 paths clear all of the above.

// ---- Adapters (SYNC-130) ----
type AccountCheck = 'ok' | 'deleted' | 'signed-out' | 'offline';
type AuthProviderId = 'email-link' | 'google';
interface AuthService {
  currentUid(): string | null;
  restore(): Promise<string | null>;        // waits for the persisted session at start-up (SYNC-004); null = none
  providers(): { id: AuthProviderId; label: string }[]; // from build config authProviders, default ['email-link'] (SYNC-006)
  signIn(providerId: string, email?: string): Promise<{ uid: string } | 'cancelled'>;
                                            // Google: popup. Email link: completes the link in the page URL;
                                            // `email` is needed when the link is opened on another device (SYNC-006).
                                            // A provider not enabled throws without calling Firebase.
  sendEmailLink(email: string, returnTo?: string): Promise<void>;
                                            // SYNC-006: sends the link, keeps the address on this device.
                                            // built H-145: `returnTo` = app path + query of the page
                                            // sign-in started from (e.g. '/decks?import=1'); default '/'
  isEmailLinkReturn(): boolean;             // the page URL is an email sign-in link waiting to be completed
  currentEmail(): string | null;            // built H-141: the signed-in user's address as Auth reports
                                            // it, for "Signed in as {email}" (SYNC-003); never stored (SYNC-100)
  signOut(): Promise<void>;
  needsRecentSignIn(): boolean;             // SYNC-096 step 1: last sign-in more than 5 minutes ago or unknown
  canReauthenticate(): boolean;             // built H-143: true only when Google is enabled (SYNC-006)
                                            // and the user has a Google identity, so reauthenticate() can use a
                                            // popup; false = a fresh sign-in is needed (SYNC-095 sign-in-first state)
  reauthenticate(): Promise<'ok' | 'cancelled' | 'needs-sign-in'>; // SYNC-096 step 1; Google popup only when enabled
                                            // and the user has a Google identity; otherwise (email link)
                                            // 'needs-sign-in': the user signs out and signs in again
  checkAccount(): Promise<AccountCheck>;    // SYNC-097: forced token refresh, then reload; unclear → 'signed-out'
  deleteUser(): Promise<'ok' | 'needs-recent-sign-in'>;
}
type RemoteErrorCode =
  | 'offline' | 'quota' | 'permission-denied' | 'not-found' | 'too-large' | 'unauthenticated' | 'unknown'
  | 'unconfirmed';                          // sent but not acknowledged within 20 s; may still land: kept pending,
                                            // confirmed by the next pull (SYNC-080)
class RemoteError extends Error { readonly code: RemoteErrorCode }
interface PullResult {
  account?: AccountDoc | null;              // present only with withAccount or on a full read; null = missing
  collection?: CollectionDoc; tags?: TagsDoc; locks?: LocksDoc;
  decks: Record<string, DeckDoc>;
  cursors: StoredSyncLog['cursors'];
}
interface PushChanges {                     // one push (SYNC-043); Ms timestamps; the adapter adds syncedAt
  account?: { create: boolean; createdAt: Ms; updatedAt: Ms; lastClientVersion: string };
                                            // create: set() in the first-sign-in flow only; else update() (SYNC-012)
  collection?: { replace: boolean;          // set() of the whole document (Replace import, or not in cloudDocs),
                 updatedAt: Ms;             // else update() with one FieldPath per card (SYNC-014)
                 cards: CollectionDoc['cards']; purge: CardKey[]; catalogVersion: string };
  tags?: { replace: boolean; updatedAt: Ms; tags: TagsDoc['tags']; assignments: TagsDoc['assignments'];
           purgeTags: string[]; purgeAssignments: string[] };
  locks?: { replace: boolean; updatedAt: Ms; locks: LocksDoc['locks']; purge: string[] };
  decks?: Record<string, DeckDoc>;          // one set() each, without merge (SYNC-018)
  hardDelete?: string[];                    // deck tombstones older than 30 days (SYNC-034)
  batch?: boolean;                          // batches of at most 10, account creation first. v0.8: not used by
                                            // the first-sign-in flow (SYNC-050); the builder may remove it
}
// Outcome per document ref: 'account' | 'collection' | 'tags' | 'locks' | 'deck:<id>' | 'delete:<id>'.
type PushOutcome = Record<string, 'ok' | RemoteErrorCode>;
interface RemoteStore {
  pull(uid: string, cursors: StoredSyncLog['cursors'] | null,   // null cursors = full read (SYNC-045)
       opts?: { withAccount?: boolean }): Promise<PullResult>;  // withAccount adds the account get (SYNC-053);
                                                                // throws RemoteError when the reads fail
  getAccount(uid: string): Promise<AccountDoc | null>;          // the account check alone, 1 read (SYNC-053)
  setUsername(uid: string, username: string): Promise<'ok' | RemoteErrorCode>;
                                            // v0.14 (SYNC-155): one update() of users/{uid}: username, updatedAt,
                                            // syncedAt; never a set(); needs the network, no pending item
  push(uid: string, changes: PushChanges): Promise<PushOutcome>; // never throws for one document: each
                                                                // document's result is in the outcome (SYNC-043, 118)
  deleteAll(uid: string): Promise<'ok' | { remaining: number }>; // SYNC-096 step 2: account, decks, state
  // built H-127: the failure result also says whether anything was (or may have been) removed:
  //   Promise<'ok' | { remaining: number; removedAny: boolean }>
}

type SyncStatus =                           // pendingCount on every signed-in status (SYNC-084)
  | { kind: 'signed-out' }
  | { kind: 'synced'; at: Ms; pendingCount: number }
  | { kind: 'syncing'; pendingCount: number }
  | { kind: 'offline'; pendingCount: number }
  | { kind: 'paused'; pendingCount: number }
  | { kind: 'error'; message: string; pendingCount: number };

// Pure (SYNC-131):
// stamp(prev, next, log, now): StoredSyncLog                       — SYNC-031
// mergePulled(local, log, pulled, mode: 'regular' | 'combine', now):
//   { local: <records to write>; log: StoredSyncLog; notices: string[] }  — sections E, F
//   v0.8: only 'regular' is called (no Combine, SYNC-049); 'combine' may be removed.
```

## Acceptance criteria
Unless stated: user RJ has uid `uA`; a second user has uid `uB`; devices are "laptop" and "phone"; cards
`hextech ray` and `lightning rush`; deck `Kennen Tempo` (id `0b7c…`) needs 3 `Hextech Ray`; times are on
2026-11-23 UTC. **One mode (v0.12):** every AC runs in the one account-only build; there is no flag and no
second mode (older ACs written against "account-required mode" now simply apply, ACs 31, 35, 45 and 48 were
rewritten or withdrawn in v0.12). "Signed in" means the gate is open (SYNC-009). Write counts are Firestore document writes seen
by the emulator or a counting `RemoteStore` fake. ACs marked *(H-081)*, *(H-127)*, *(H-077)* or *(H-078)* name the
build item that built them (all `done`); ACs marked with a v0.10 build item (H-104, H-106, H-122, H-140…H-145)
are pending that item.

1. **Signed out loads no Firebase** (SYNC-001, SYNC-002, SYNC-125)
   **Given** a fresh browser with no sync log **When** the visitor opens Home and
   Tournaments and expands an event **Then** both work, the network log shows no request to Firebase Auth or
   Firestore, and no `firebase` chunk was loaded. **When** the user clicks Sign in **Then** the dialog shows the
   SYNC-003 text and the enabled providers only, and still no `firebase` chunk has loaded: with the default
   config (`['email-link']`) no provider button, just the "Email address" field and Send link (SYNC-006 a, AC
   49); with `['email-link', 'google']` the buttons "Sign in with an email link" and "Continue with Google"
   (SYNC-006 b). **When** he enters `rj@example.com` and presses Send link **Then** the `firebase` chunk loads and
   the sent state shows "We sent a sign-in link to rj@example.com. Open it on this device to finish signing in."
   (AC 51).
2. **Stamping** (SYNC-031, SYNC-032)
   **Given** signed in as `uA`, offline, `hextech ray` quantity 2 with stamp `t = 1000` **When** the user presses
   + at a clock of `900` (clock behind) **Then** the stamp is `1001` and `hextech ray` is pending; **When** the
   user removes `lightning rush` **Then** the sync log holds a tombstone for it with `t` = now.
3. **First sign-in, new account, stale data cleared** (SYNC-048 a, SYNC-050, SYNC-003, SYNC-120) *(H-081,
   H-077)*
   **Given** the laptop, never signed in, holding stale local data (350 cards,
   20 tags, 10 decks, 3 locks saved by the old no-account build), and `uA` has no documents **When** RJ opens Sign in
   **Then** the dialog shows the SYNC-003 text and no warning about the stale data; **When** he signs in
   **Then** the local stores are cleared
   before the full read, no Combine dialog or upload notice appears, **exactly 1 write** is made (the `set()` of
   `users/uA`) and 3 reads, the cloud holds `users/uA` only (no `state` or `decks` document), the linked uid is
   `uA`, and Collection and Decks open empty.
4. **Second device downloads, write count** (SYNC-048 c, SYNC-045, SYNC-050) *(H-077)*
   **Given** `uA` holds `users/uA` (`lastClientVersion` = the phone's build), three `state` documents with
   350 cards, 20 tags and 3 locks, and 10 decks **When** RJ signs in on an empty phone **Then** no dialog appears,
   the phone shows 350 cards, 20 tags, 10 decks and the same 3 locked decks, at most 16 reads and **0 writes** are
   made, and nothing is pending. **Given** instead the account's `lastClientVersion` is an older build **When**
   RJ signs in **Then** exactly 1 write is made: the account `update()` (SYNC-012). **When**, in either case, the
   laptop next pulls **Then** it receives no changed document (no `syncedAt` moved).
5. **No Combine: stale data is not merged** (SYNC-049, SYNC-048, SYNC-050, SYNC-143) *(H-081)*
   **Given** the phone, never signed in, holding stale `hextech ray` q 1, tag `Trade Binder` on `p:OGN-001a`
   and deck `Draft A`; the account has `hextech ray` q 3, `Collector` on `p:OGN-001a` and deck `Kennen Tempo`
   **When** RJ signs in **Then** no Combine dialog appears; the phone shows `hextech ray` q 3, `p:OGN-001a` with
   only `Collector`, and only `Kennen Tempo` (`Draft A` and `Trade Binder` are gone); no `state` or `decks`
   document is written; and the laptop's next pull changes nothing.
6. **Latest change wins per card, both edits kept** (SYNC-060, SYNC-042, SYNC-043)
   **Given** laptop and phone synced **When**, both offline, the laptop sets `hextech ray` to 4 at 12:00 and the
   phone sets it to 2 at 12:05 and `lightning rush` to 3 at 12:06, then the **laptop goes online first** and
   pushes, then the phone pulls and pushes, then the laptop pulls **Then** both devices and the cloud end with
   `hextech ray` 2 and `lightning rush` 3. **Given** instead the laptop pulled at 12:10:00 (before the phone's
   push), the phone pushes `hextech ray` 2 (`t` 12:05) at 12:10:20, and the laptop, still within 60 s of its
   pull, pushes 4 (`t` 12:00) at 12:10:30 over it **When** the phone next pulls **Then** it receives 4 (`t` 12:00),
   keeps its own 2 (12:05 is later), marks it pending and pushes 2 again; **When** the laptop then pulls **Then**
   it receives 2 (`t` 12:05), which beats its 4, and takes it, so the cloud and both devices end at 2 (convergence,
   SYNC-042; the cloud held 4 in between, SYNC-043 limitation).
7. **Tie goes to the cloud** (SYNC-061)
   **Given** local `lightning rush` q 2 `t` 5000 and pulled q 3 `t` 5000 **When** merged **Then** local becomes
   q 3 and nothing is pending.
8. **Tombstones and expiry** (SYNC-034, SYNC-044, SYNC-045)
   **Given** the phone removes `lightning rush` on Nov 1 and syncs **When** the laptop pulls on Nov 5 **Then**
   it removes `lightning rush`. **When** a later write on Dec 2 happens **Then** that write deletes the
   `cards['lightning rush']` field. **Given** a tablet last synced Oct 20 that still has `lightning rush`
   unchanged **When** it opens on Dec 3 **Then** it does a full read and removes `lightning rush` (absent, not
   pending, synced before) instead of uploading it.
9. **Replace import on another device** (SYNC-014, SYNC-044)
   **Given** both devices hold `hextech ray` and `lightning rush` **When** the laptop commits a Replace import
   containing only `3 Hextech Ray` **Then** one `set()` is written with `lightning rush` as a tombstone, and the
   phone's next pull removes `lightning rush`.
10. **Deck delete, Undo and sync** (SYNC-035, SYNC-018, SYNC-060)
    **Given** signed in **When** RJ deletes `Kennen Tempo` and presses Undo after 4 s **Then** no write is made
    and the deck is identical. **When** he deletes it and waits 10 s **Then** one `set()` writes the tombstone
    (only `schemaVersion`, `createdAt`, `updatedAt`, `deletedAt`, `syncedAt`) and the phone removes the deck on
    its next pull. **Given** instead the phone renamed the deck at a later time than the delete **When** both
    sync **Then** the renamed deck is restored on both devices.
11. **Lock on a deck deleted elsewhere** (SYNC-071)
    **Given** the laptop locks `Kennen Tempo` at 10:00 offline and the phone deletes it at 10:30 **When** both
    sync **Then** the deck is gone everywhere, `state/locks` has an unlock tombstone for it, and the other decks'
    counts no longer subtract its copies.
12. **Edited elsewhere while locked** (SYNC-072, SHARE-028)
    **Given** the laptop locks `Kennen Tempo` at 10:00 and the phone, which hasn't pulled, changes its Hextech
    Ray from 3 to 4 at 10:10 with 3 owned **When** both sync **Then** the deck stays locked, shows "Locked · 1
    card short", and the notice "'Kennen Tempo' changed on another device while it was locked." shows.
13. **Pulled change leaves a lock short** (SYNC-074, SYNC-068)
    **Given** the laptop and phone synced as `uA`, `Kennen Tempo` locked and `hextech ray` q 3 **When** the phone
    lowers `hextech ray` to 2 and the laptop pulls **Then** on the laptop `hextech ray` is 2, the deck stays
    locked with "Locked · 1 card short", and the notice "'Kennen Tempo' (locked) is now 1 card short." shows.
14. **Same tag label on two devices** (SYNC-065)
    **Given** the laptop created `Trade Binder` (`t_a1B2c3`, created 09:00) on `p:OGN-001a` and synced, and the
    phone, offline, created `trade binder` (`t_Z9y8x7`, created 10:00) on `p:OGN-002a` **When** the phone comes
    online, pulls and merges **Then** one live tag remains, `t_a1B2c3` labelled `Trade Binder`; `p:OGN-002a` is
    rewritten to `[t_a1B2c3]` with a stamp later than any pulled `t` and is pending, `t_Z9y8x7` is a pending
    tombstone, and both are pushed. **When** the laptop next pulls **Then** it has one tag `Trade Binder`,
    `p:OGN-001a` and `p:OGN-002a` both carry `t_a1B2c3`, and `t_Z9y8x7` is a tombstone there too.
15. **Short tag ids** (SYNC-016)
    **Given** a `StoredTags` v2 with tag id `t_01HX3K9…` (26 characters) assigned to 3 targets and used in a
    saved view **When** the app loads it **Then** the tag gets an id matching `^t_[0-9A-Za-z]{6}$`, the 3
    assignments and the saved view use the new id, and the record is `schemaVersion: 3`.
16. **Unreadable store never wipes the cloud** (SYNC-033)
    **Given** signed in and the local `StoredTags` has `schemaVersion: 9` **When** the app syncs **Then** no tag
    write is made, the cloud tags are unchanged, the collection and decks still sync, and the status is `Error`
    with the text "Some data on this device could not be read, so it isn't being synced."
17. **Newer cloud schema** (SYNC-046)
    **Given** `state/collection` has `schemaVersion: 2` **When** the laptop (knowing 1) pulls **Then** it writes
    nothing to that document, Collection edits are disabled with the SYNC-046 message, and decks still sync.
18. **Reopen cost and debounce** (SYNC-040, SYNC-120, SYNC-121, SYNC-122)
    **Given** a laptop signed in as `uA` (`sessionExpected` true, linked uid `uA`) with 10 decks, last synced 1 hour
    ago, cursors set, nothing pending, and no device has written to `uA` since **When** RJ reopens the app **Then**
    exactly 3 reads are billed (the account `get` and 2 empty queries), no full read runs, and 0 writes are made;
    **When** he presses Sync now a minute later **Then** 2 reads are billed. **When** he presses + five times
    on one card within 1.5 s **Then** one collection write is made about 2 s after the last press.
19. **Offline and quota** (SYNC-080, SYNC-082, SYNC-083, SYNC-084)
    **Given** signed in and offline **When** RJ edits 2 cards and closes the tab **Then** the status read
    "Offline · changes are saved on this device · 2 changes not synced yet"; **When** he reopens online **Then**
    the 2 cards are pushed. **Given** Firestore rejects writes for exhausted quota **When** he edits a card **Then**
    the edit is saved locally and the status reads "Sync paused. Your changes are saved on this device."
20. **Sign out clears this device** (SYNC-090, SYNC-091, SYNC-009) *(H-081)*
    **Given** signed in as `uA` with 1 pending change **When** RJ chooses Sign out **Then** the dialog says "1
    change hasn't synced yet. It'll be lost if you sign out now." with Sync now, Sign out anyway and Cancel, and
    no Keep a copy or Remove choice. **When** he chooses Sync now and the push succeeds **Then** the dialog shows
    "Sign out? Your collection and decks stay in your account and are removed from this device. Sign in again to
    get them back." with Sign out and Cancel; **When** he chooses Sign out **Then** every local store and the
    sync log are empty, the cloud documents are unchanged, and Collection shows the sign-in panel. **Given**
    instead the push is rejected by the rules while online **When** Sync now finishes **Then** the warning stays
    with "1 change hasn't synced yet…"; **When** he chooses Sign out anyway **Then** the device is cleared and the
    change is lost. **Given** instead the connection drops during Sync now **When** Sync now finishes **Then** the
    dialog shows "You're offline.", the warning keeps "1 change hasn't synced yet…", Sync now, Sign out and Sign
    out anyway are disabled, only Cancel works, and nothing is cleared; **When** the connection returns **Then**
    the buttons are enabled again (SYNC-081). **Given** the device is offline **When** he opens the account menu
    **Then** Sign out is disabled with "You're offline.". **When** RJ later signs in again as `uA` after a
    sign-out **Then** the first sign-in downloads his data (0 writes, AC 4).
21. **Delete account** (SYNC-095, SYNC-096, SYNC-097, SYNC-098)
    **Given** `uA` with 10 live decks and 2 deck tombstones **When** RJ opens Account Information from the account menu, chooses Delete account and data (v0.14), types `delete` and confirms **Then**
    `users/uA` is deleted first, then 12 deck documents and 3 state documents, then the Auth user; local data is
    cleared; the notice "Your account and its data were deleted." shows. **When** the phone opens afterwards and
    `checkAccount()` returns `deleted` **Then** it clears every local store and the sync log, signs out, and
    shows "This account was deleted. Its data has been removed from this device."
    **Given** the deck deletion fails after 5 documents **When** RJ retries **Then** it continues with the rest
    and the Auth user is deleted only at the end.
22. **Security rules** (SYNC-110…114)
    **Given** the emulator with documents for `uA` **When** a client signed in as `uB` gets, lists, creates,
    updates or deletes `users/uA`, `users/uA/state/collection`, `…/state/tags`, `…/state/locks` and
    `users/uA/decks/0b7c…` **Then** every request is denied; **When** `uA` writes `state/collection` with
    `syncedAt` set to a client time, or a deck with 151 `main` entries, or a deck whose `duplicatedFrom` has 37
    characters, or a field `email` on `users/uA`, or an update of `users/uA` with a different `createdAt`, or (v0.14) a
    `username` on the create of `users/uA` (even a valid one), an empty `username` or a numeric one
    **Then** it is denied; **When** `uA` updates `users/uA` with `username: 'RJ Smith'` (keeping `createdAt`) **Then**
    it is allowed. **Username cases (v0.16, H-212, SYNC-160; each is one update of `users/uA` that changes
    `username`, keeping `createdAt`):** **allowed:** 20 × `𝐀` (U+1D400; 20 code points, 40 UTF-16 units, 80 UTF-8
    bytes), 20 × `a`, `Zoë O'Neil-Smith_2.0`, `Zoe` + U+0301 (`Zoé` in NFD; the rules cannot see NFC, SYNC-160 (f) (1)), `नमस्ते`, `O’Neil` (U+2019), `Ａ１` (full-width
    letter and digit), `7 Up`; **denied:** 21 × `𝐀`, 21 × `a`, 81 × `a`, `Squad 😀`, `😀`, `❤️` (U+2764 U+FE0F), `❤`,
    `1️⃣` (digit + U+FE0F + U+20E3), `a` + U+FE0F (a lone variation selector), `-Smith`, `.Smith`, ` Smith` (leading
    space), `Smith ` (trailing space), `RJ  Smith` (two spaces), `RJ@Smith`, `a` + U+200B, `a` + U+202E, `a` + a line
    feed, `a` + a tab, `a` + U+00A0 (no-break space: only U+0020 is a space in the rules). **The invariant**
    (SYNC-160 (f)): each *allowed* and *denied* name above that the client's normalization leaves unchanged gets the
    **same verdict from the client function** (`username.ts`, AC 74) and from the rules; the test file asserts it by
    running one shared list of names through both. (The names the client changes first, e.g. ` Smith `, are tested in
    AC 74; the rules see only the normalized result.) **Given** `users/uA` already holds a `username` of 24 ×
    `👨🏽‍👩🏽‍👧🏽‍👦🏽` (saved under v0.14) **When** `uA` updates only `lastClientVersion` and `updatedAt`/`syncedAt` **Then** it
    is allowed (unchanged name, not re-checked, SYNC-160 (a)), and **When** `uA` instead sets a different `username` of
    `😀` or 81 × `a` **Then** it is denied, and **When** it sets `username` to `Zoé` (NFC) **Then** it is allowed. **The proofs
    SYNC-160 (g) asks for:** 20 × `𝐀` allowed with 21 × `𝐀` denied (code points, not UTF-16 units), `नमस्ते` allowed
    (`\p{Mn}`, `\p{Mc}`), `O’Neil` allowed, `a` + U+FE0F denied. If any of them fails, the build stops and reports
    (SYNC-160 (h)); the test file never loosens a case to make it pass;
    **When** `uA` writes each valid shape **Then** it is allowed. The run is `npm run test:rules`
    with Java 21 (SYNC-114).
23. **Indexes** (SYNC-115)
    **Given** the deployed `firestore.indexes.json` **When** inspected **Then** every field of `state` and
    `decks` except `syncedAt` has `indexes: []`, and the SYNC-040 queries run without a missing-index error.
24. **Deck edit and delete on a lagging clock** (SYNC-031, SYNC-062)
    **Given** the phone saved `Kennen Tempo` with `updatedAt` 12:00:00.000 and the laptop, whose clock is 10 minutes
    behind, has pulled it **When** the laptop renames it at its local 11:52 **Then** its `updatedAt` is
    12:00:00.001 and the rename wins on both devices; **When** the laptop then deletes it at its local 11:53
    **Then** the tombstone's `deletedAt` is 12:00:00.002 and, after both sync, the deck is deleted on both devices
    and does not come back.
25. **Interrupted first sign-in starts over** (SYNC-004, SYNC-048, SYNC-009, SYNC-044) *(H-081)*
    **Given** the phone signs in to `uA` (which has 350 cards and 10 decks) and the full read fails after
    sign-in (offline) **When** the phone shows a gated page **Then** it shows "Couldn't get your collection and
    decks. Check your connection and try again." with Try again, the sync log has `uid: null`,
    `lastFullSyncAt: null`, `sessionExpected: true`, and no write was made. **When** he closes the tab and reopens
    online **Then** the session is restored, the flow starts again at step 1 (clear), downloads everything, makes
    0 writes, links `uA`, and the pages fill in without a reload.
26. **Sign out, then restart** (SYNC-002, SYNC-004, SYNC-086, SYNC-091, SYNC-009) *(H-081)*
    **Given** signed in as `uA` **When** RJ signs out and reloads the page **Then** no `firebase` chunk loads, no
    Firebase request is made, the message "You've been signed out. Sign in again to sync." is **not** shown,
    Decks shows its sign-in panel with "Sign in or create an account to start keeping track of your collections
    and decks" (SYNC-009 v0.10), and the local stores are empty.
27. **Session lost** (SYNC-086, SYNC-009)
    **Given** signed in as `uA` with 2 pending changes **When** the session's token is revoked and
    `checkAccount()` returns `signed-out` **Then** syncing stops, local data and the 2 pending changes are kept,
    "You've been signed out. Sign in again to sync." shows, Collection shows its sign-in panel with "You've been
    signed out. Sign in again to continue." (gate closed; text v0.10, *H-144*), and Tournaments shows no Add to your decks
    control; the local stores and sync log are not cleared, and the sync log has `sessionLostUid: 'uA'`.
    **When** he reloads (online or offline) **Then** Collection shows the sign-in panel from the first frame,
    before any session check finishes, and his cards are never shown. **When** RJ signs in as `uA` **Then**
    `sessionLostUid` is cleared, the gate opens, Collection shows his cards, the 2 changes are pushed with no
    dialog, and nothing is cleared. **Given** instead user `uB` signs in on that browser **When** the sign-in
    completes **Then** `uB`'s first sign-in clears the device (the 2 changes of `uA` are lost, SYNC-098) and
    downloads `uB`.
28. **A device with a live session after deletion** (SYNC-053, SYNC-097, SYNC-098, SYNC-113)
    **Given** the tablet is linked to `uA` with a still-valid session and 1 pending deck edit, and `uA` was deleted
    from the laptop **When** the tablet opens **Then** its account check finds `users/uA` missing, it writes
    nothing, calls `checkAccount()`, and on `deleted` removes its synced data; no document reappears under
    `users/uA`. **Given** instead the tablet was already running (account check passed earlier) and `uA` is
    deleted meanwhile **When** it pushes a collection `update()` that fails with not-found **Then** it stops
    writing, keeps the change pending, and runs the same check. **Given** instead the laptop's deletion stopped
    half-way (`users/uA` gone, the Auth user still there) **When** the tablet opens and `checkAccount()` returns
    `ok` **Then** the tablet writes nothing, signs out, clears every local store and the sync log
    (`sessionExpected: false`, no linked uid), shows "This account is being deleted, so you've been signed out and
    its data was removed from this device.", and its gated pages show the sign-in panel; no Upload option is
    offered and the leftover cloud documents are unchanged *(clearing and message: H-081)*. **Given** `users/uA` is absent **When** a
    client signed in as `uA` tries to create `users/uA/decks/<id>` **Then** the rules deny it, and the client
    runs the SYNC-053 account check rather than the SYNC-118 rejected-write path.
29. **Rejected write and large deck** (SYNC-112, SYNC-118, SYNC-124)
    **Given** a deck `Big Paste` whose `importRemovedLines` has 2,000 entries (≈ 60 KB) **When** it syncs **Then**
    the rules accept it (no list cap). **Given** an **existing** deck (`deck:<id>` in `cloudDocs`, so the write is
    an update) whose `format` is a value the deployed rules don't know **When** it is pushed **Then** the write is denied, the
    deck stays local and pending, the status shows "Some data couldn't be synced: decks (`<deck name>`).", other
    documents keep syncing, and it is not retried until the deck changes. **Given** instead a **new** deck (not in
    `cloudDocs`: never pulled and never written by this device) with that `format` and `users/uA` present **When** it is
    pushed **Then** the create is denied, the client repeats the account check once, finds `users/uA`, and handles
    the deck as SYNC-118 (rejected, not retried; no further account checks for it).
30. **Invalid pulled item** (SYNC-047)
    **Given** a pulled `state/collection` whose `cards['hextech ray']` is `{ q: 2, t: 5000, p: { 'OGN-001a': 3 } }`
    (Σ p > q) and whose `cards['lightning rush']` is valid **When** merged **Then** `lightning rush` is merged,
    `hextech ray` stays as it was locally and is not pushed over the cloud copy, and the status is `Error` with
    "Some account data couldn't be read."
31. **No delete-all-local action** (SYNC-052 and SPEC-007 COLL-074 withdrawn; rewritten v0.12) *(H-081, H-172)*
    **Given** signed in as `uA` **When** RJ opens Collection (desktop and phone widths, every menu) **Then** no
    "Delete all local collection data" or similar action is offered; Sign out (AC 20) clears this device's cache
    and **Delete account and data** (AC 21) removes the account's data; no code path or setting offers a
    browser-only delete or a browser-only mode (grep of `web/src` finds no `signInEnabled` and no
    `clearCollectionData`).
32. **Lock and unlock on two devices** (SYNC-073)
    **Given** `Kennen Tempo` locked and synced on both devices **When** the phone, offline, unlocks it at 10:00 and
    locks it again at 10:02 (`lockedAt` 10:02), and the laptop unlocks it at 10:05 **Then** after both sync it is
    unlocked on both (10:05 is the later change). **Given** instead the deck is unlocked on both **When** the laptop
    locks it at 10:00 and the phone, offline, locks it at 10:05 **Then** after both sync it is locked on both with
    `lockedAt` 10:05.
33. **Map cap** (SYNC-119)
    **Given** `state/tags` holds 199 live tags and 201 tag tombstones (400 entries, all tombstones under 30 days
    old) **When** RJ creates a tag `Trade Binder` **Then** the write adds it and removes the oldest tombstone with
    `deleteField()` in the same `update()`, the map stays at 400 entries (200 live, 200 tombstones), and the write
    is accepted.
34. **Merge writes are not user changes** (SYNC-041, SYNC-031, SYNC-032)
    **Given** a synced laptop with nothing pending **When** a pull brings `hextech ray` q 4 (`t` 12:05), a renamed
    `Kennen Tempo` (`updatedAt` 12:06) and a new tag, and the merge writes them locally **Then** the local items
    keep `t` 12:05, `updatedAt` 12:06 and the pulled tag `updatedAt`, the pending set is empty, and the sync log's
    `recordUpdatedAt`, hashes and `knownDecks` match the new records; **When** RJ reloads the page **Then**
    reconcile stamps nothing and no write is made.
35. **No sign-in flag; preview deploy path** (SYNC-007, SYNC-002; rewritten v0.12)
    **Given** any build configuration (production, `preview`, development) **When** any page opens **Then** the
    Sign in action is shown to a signed-out visitor, and no `firebase` chunk loads until one of the SYNC-002
    triggers happens; no environment file, build define or setting named `signInEnabled` exists, and no value turns
    the Sign in action, the gate or the account requirement off. *(H-078)* **Given** a clean checkout at commit
    `5c2292c` **When** RJ runs the documented preview deploy command for channel `sync-test` **Then** the channel
    URL shows the Sign in action, its `appVersion` is `web-preview-5c2292c`, the `live` site is unchanged, and the
    channel has an expiry. **When** instead `firebase deploy --only hosting` runs, or the GitHub Actions workflow
    deploys `main` **Then** the built site has an `appVersion` that starts with `web-prod-` (and it is not run until
    the SYNC-007 release rule is met: that part is a process check by RJ, not a test).
36. **First sign-in edge cases** (SYNC-048 e, f, SYNC-050) *(H-081)*
    **Given** `users/uA` exists with `createdAt` Nov 1 (`lastClientVersion` = this build) and no `state` or
    `decks` documents, and the phone has 40 stale cards **When** RJ signs in **Then** the 40 cards are cleared and
    not uploaded, 0 writes are made, `users/uA` keeps `createdAt` Nov 1, no dialog appears, and Collection opens
    empty. **Given** instead `users/uA` is absent but `users/uA/state/collection` exists **When** RJ signs in on an
    unlinked phone that holds 40 stale cards **Then** nothing from the cloud is imported, no write is made, the
    phone is signed out with the SYNC-097 half-deleted message, and its local stores are empty.
37. **Same deck status on every device** (SYNC-077)
    **Given** the laptop and phone signed in as `uA`, both synced, nothing pending, same `catalogVersion`; `Kennen
    Tempo` locked (holds 3 Hextech Ray), `Kennen Control` unlocked needing 3, 4 owned, 1 of them a foil tagged
    `Collector` (exclude from decks) **When** both open Decks **Then** both show `Kennen Tempo` "Locked" and
    `Kennen Control` "0 of 3 available" in the `none` group, with identical breakdowns. **When** on the laptop
    only, RJ changes the Collection view to group by card, sorts by name, saves a view, and its printing-code
    memory is cleared **Then** no deck status changes on either device. **When** on the phone he removes the
    `Collector` tag from the foil and both devices sync **Then** both show `Kennen Control` "1 of 3 available"
    (`partial`). **When** on the laptop he lowers Hextech Ray to 2 and both sync **Then** both show `Kennen Tempo`
    "Locked · 1 card short", with no stored "short" flag in any document or store.
38. **Delete account removes this device's copy** (SYNC-095, SYNC-096)
    **Given** signed in as `uA` by email link 1 minute ago **When** RJ opens Delete account and data (from Account Information, SYNC-152) **Then** the
    dialog opens in its type-to-confirm state and has no keep-a-copy
    option and Delete account stays disabled until he types `delete`; **When** he confirms **Then** after the cloud
    deletion every local store and the sync log on this device are empty and the app is signed out. **Given**
    instead RJ signed in with an email link more than 5 minutes ago (default config, email link only) **When** he
    opens Delete account and data **Then** the dialog opens in its sign-in-first state (AC 55): it shows "To
    delete your account, sign out, sign in again, then choose Delete account and data within 5 minutes.", has no
    type-to-confirm field, nothing is deleted, and no Google popup is offered (v0.10, *H-143*). **Given** instead
    he signed in 4 minutes ago **When** he opens the dialog, waits 2 minutes, types `delete` and confirms **Then**
    nothing is deleted and the same text shows (SYNC-096 step 1).
39. **Email-link return** (SYNC-002, SYNC-005, SYNC-006)
    **Given** a laptop with `sessionExpected: false`, where RJ pressed Send link for
    `rj@example.com` **When** he opens the link on the laptop (URL with `mode=signIn` and `oobCode`) **Then**
    `firebase` loads at start-up, the sign-in completes with no question, the first-sign-in flow runs, and the
    URL no longer holds `oobCode`. **Given** instead he opens the same link on the phone, which never sent it
    **When** the page loads **Then** a dialog opens with the title "Finish signing in", the text "Confirm your
    email address to finish signing in.", a field labelled "Email address" with focus in it, and the buttons
    **Cancel** and **Finish sign-in**; Finish sign-in is disabled while the field is empty and while it holds
    `rj.example.com`, and Enter then does nothing; **When** he types ` rj@example.com ` and presses Enter **Then**
    the sign-in completes with `rj@example.com` (v0.11). **Given** instead the dialog is open **When** he presses
    Cancel (or Escape) **Then** he is not signed in, no message shows, and the phone's data is unchanged. **Given**
    an ordinary URL and `sessionExpected: false` **When** the page loads **Then** no `firebase` chunk loads.
40. **No upload resume; old `uploadingUid` ignored** (SYNC-048, SYNC-050, SYNC-030) *(H-081)*
    **Given** the laptop's sync log, written by the v0.7 build, has `uploadingUid: 'uA'` and `lastFullSyncAt: null`,
    its local stores hold 350 cards and 25 decks, and the cloud holds `users/uA` and 9 decks from that partial
    upload **When** RJ opens the app (session restored) **Then** the first-sign-in flow clears the device, downloads
    the 9 decks, uploads nothing (no `state` or `decks` write; 1 account `update()` only if `lastClientVersion` differs from this build), shows no "now saved to your account"
    notice, and the sync log has `uploadingUid` unset or null.
41. **Unconfirmed write** (SYNC-080, SYNC-061, SYNC-042)
    **Given** signed in, nothing pending, and RJ sets `hextech ray` to 4 (`t` 12:00) **When** the collection write
    is not acknowledged within 20 s **Then** `hextech ray` stays pending, the status is not `Error`, and it reads
    "Synced · `<time>` · 1 change not synced yet" (SYNC-084); **When** about 60 s later the device pulls and the
    write had landed **Then** the pull returns `hextech ray` with `t` 12:00, it leaves the pending set, and no
    second collection write is made. **When** instead the write had not landed **Then** the push after that pull
    writes it again.
42. **Build change is device-local** (SYNC-012, SYNC-118)
    **Given** the phone on build `web-0.1.0` (`lastBuild` `web-0.1.0`) has deck `Big Paste` in `rejected`, and the
    account's `lastClientVersion` is `web-0.1.0` **When** the laptop opens build `web-0.2.0` first **Then** the
    laptop updates `users/uA` once (`lastClientVersion` `web-0.2.0`); **When** the phone then opens `web-0.2.0`
    **Then** its first pull clears `rejected` and pushes `Big Paste` again, sets `lastBuild` to `web-0.2.0`, and makes
    no account write (the account already shows `web-0.2.0`); **When** either device reopens on `web-0.2.0`
    **Then** neither writes the account again. *(H-078)* **Given** two production builds made from commits
    `5c2292c` and `27b796d` **When** their `appVersion` values are read **Then** they are `web-prod-5c2292c` and
    `web-prod-27b796d` (different, ≤ 40 characters, neither `web-0.0.0`); **Given** a build where no commit id is
    available **When** it is built **Then** `appVersion` is `web-prod-` followed by the UTC build time, e.g.
    `web-prod-20261124T153000Z`.
43. **Unfinished deletion stops sync; Cancel deletion** (SYNC-096; the Cancel parts built H-127)
    **Given** signed in as `uA` with a recent sign-in **When** RJ confirms Delete account and the first delete
    (`users/uA`) fails **Then** nothing was deleted, `deletingUid` is `uA`, the notice "Some data couldn't be
    deleted. Try again." shows with Try again, the status is `Error` with that text, and no pull or push runs,
    also after a reload. *(H-127)* **When** he reloads and opens the account menu **Then** it shows that Error
    status and offers **Try deleting again** (v0.10; "Try again" before H-142) and **Cancel deletion**, and
    `deletingRemovedAny` is false; **When** he chooses Try deleting again and the first delete fails again
    **Then** both are still offered; **When** he chooses
    Cancel deletion **Then** `deletingUid` and `deletingRemovedAny` are cleared, "Your account wasn't deleted."
    shows, the account check finds `users/uA`, and a pending card edit is pushed. *(H-127)* **Given** instead
    `users/uA` was deleted and the deck deletes then failed **When** he opens the account menu, also after a
    reload **Then** `deletingRemovedAny` is true and only Try deleting again is offered (Sign out stays available
    and clears this device), not Cancel deletion; **When** he chooses Try deleting again **Then** the deletion continues and
    completes as in AC 21. **Given** instead the first delete of `users/uA` timed out (`'unconfirmed'`) **When**
    he opens the account menu **Then** Cancel deletion is not offered.
44. **Auth codes for a deleted account** (SYNC-097)
    **Given** the Auth emulator and a signed-in client for `uA` **When** `uA` is deleted on the emulator and the
    client calls `checkAccount()` **Then** the forced refresh fails with `auth/invalid-refresh-token` and the
    result is `deleted`. **When** instead `uA`'s tokens are revoked **Then** `reload()` fails with
    `auth/user-token-expired` and the result is `signed-out`. **When** instead `uA` is disabled **Then** the result
    is `signed-out` (`auth/user-disabled`). **When** the network is down **Then** the result is `offline`.
45. **No import without an account** (SYNC-001, SYNC-009, SYNC-007; replaces v0.11 "Local-only mode is unchanged", withdrawn v0.12) *(H-172)*
    **Given** a fresh browser and no session, in any build **When** the user tries to import 40 cards, import a
    deck, or add a Tournaments deck with Add to your decks **Then** none is possible: Collection, Decks and the
    import entry show the sign-in panel (AC 46), Tournaments shows no Add control, nothing is written to a local
    store, and no sync log is created. **When** they sign in and import 40 cards **Then** the cards are saved in
    the account (one `state/collection` write) and the cache.
46. **Gates while signed out** (SYNC-009, SYNC-003) *(H-081)*
    **Given** no session **When** the visitor opens `/collection`, `/decks` and
    `/decks/0b7c…` directly **Then** each keeps its URL, shows its page header (title and
    description) at the top and, below it in place of the page content, its sign-in panel with **no panel
    heading** and exactly the line "Sign in or create an account to start keeping track of your collections and
    decks" (no closing full stop, no other sentence; RJ decision 15, *H-144*) and a Sign in button; none of
    "Sign in to see your collection", "Sign in to see your decks", "Sign in to import cards and decks" or "You
    need a free account to import cards or decks." appears; the header tabs and the **Sign in** button are visible (no Import button, v0.14), and
    no `firebase` chunk loads. **When** he opens Tournaments
    and expands an event's Top 8 **Then** the decklists show, with no Add to your decks, In your decks or Add
    another copy control on any of them. **Given** the browser also holds a stale deck (left by the old no-account
    build) whose `source.decklistId` is that event's winning decklist **When** he opens Tournaments **Then** that row shows no
    In your decks control either (the CAT-074 check reads nothing from the browser cache); **When** he opens
    `/collection` **Then** none of the stale data is shown. **When** he signs in to `uA` (which has no deck from
    that decklist) and the first sync completes **Then** the row shows Add to your decks, without a reload.
47. **Gate at start-up, offline, and during the first sync** (SYNC-009, SYNC-080, SYNC-048) *(H-081)*
    **Given** signed in as `uA` and synced (`sessionExpected` true, linked uid `uA`, `lastFullSyncAt` set) **When**
    RJ reloads with the network off **Then** Collection and Decks show his data at once (no sign-in panel, no
    flash of one), he can import 3 cards with Add to your collection, and they are pending; **When** the network returns **Then**
    they are pushed. **Given** instead `sessionLostUid` is unset, the token was revoked while the tab was closed,
    and RJ reloads online **When** the page loads **Then** Collection shows his cards until the restore finishes
    (the undetected window, SYNC-009), and a card he edits in that window is stamped and pending; **When** the
    restore reports the session lost (SYNC-086) **Then** `sessionLostUid` becomes `uA`, Collection switches to the
    sign-in panel with "You've been signed out. Sign in again to continue.", the local data and the edit stay on
    the device, and every later reload shows the panel from the first frame (AC 27). **Given** instead
    RJ has just signed in on an empty phone and the download is running **When** he opens Collection **Then** it
    shows "Getting your collection and decks from your account…" and no edit is possible; Tournaments shows no
    Add to your decks, In your decks or Add another copy control; and when the flow completes Collection shows
    the cards and Tournaments shows the controls, without a reload.
48. **First account-only build on a browser that held old no-account data** (SYNC-048, SYNC-003, SYNC-007, SYNC-143; rewritten v0.12) *(H-081)*
    **Given** a browser that used the earlier no-account production build and still holds 120 cards and 2 decks
    **When** the account-only build is opened there (a preview channel today; production only after the SYNC-007
    release rule is met) and the user opens Collection **Then** the sign-in panel shows and the 120 cards are not
    shown; **When** he opens Sign in **Then** no stale-data warning shows (RJ decision 13 g); **When** he signs in
    to a new account **Then** the 120 cards and 2 decks are cleared, not uploaded, and exactly 1 write (the account
    creation) is made (AC 3).
49. **Email link as the only provider** (SYNC-006 a, b; SYNC-002) *(H-104)*
    **Given** signed out, default config `authProviders: ['email-link']` **When** RJ
    clicks Sign in in the header **Then** the dialog shows the SYNC-003 intro and, under it, the "Email address"
    field and one filled **Send link** button; there is no "Sign in with an email link" button; focus is in the
    field; and no `firebase` chunk has loaded. **Given** instead `authProviders: ['email-link', 'google']`
    **When** he opens the dialog **Then** it shows "Sign in with an email link" and "Continue with Google" and no
    field; **When** he chooses "Sign in with an email link" **Then** the field appears below the buttons, focus
    moves into it, and Send link is the only filled button in the dialog.
50. **Send-link failure** (SYNC-005, SYNC-006) *(H-106)*
    **Given** the default config and a send request that the Auth emulator answers with a network error **When**
    RJ enters `rj@example.com` and presses Send link **Then** while the request runs the button reads "Sending…"
    and is disabled in the SYNC-006 sense: it has `aria-disabled="true"`, focus stays on it, and pressing it
    again (click, Enter or Space) sends no second request; **When** it fails **Then** the dialog shows exactly "Couldn't send the link. Check the
    address and your connection, then try again." under the field, does not show "Sign-in didn't complete. Your
    data on this device is unchanged.", the field still holds `rj@example.com` and has `aria-invalid="true"`
    with the failure text as its description, no address is stored on the device, and the local stores are
    unchanged. **When** he presses Send link again and it succeeds **Then** the sent state of AC 51 shows and the
    failure text is gone.
51. **Sent state** (SYNC-006) *(H-140)*
    **Given** RJ typed ` rj@example.com ` (with spaces) **When** he presses Send link and it succeeds **Then** the
    email form is gone and the dialog shows "We sent a sign-in link to rj@example.com. Open it on this device to
    finish signing in.", "Didn't get it? Check your spam folder." and the text buttons **Send again** and **Use
    a different email**, and the stored address is `rj@example.com`. **When** he presses Send again and the
    request has not finished **Then** it reads "Sending…", both Send again and Use a different email have
    `aria-disabled="true"`, focus stays on Send again, and pressing either does nothing. **When** it
    succeeds **Then** a second link is sent to `rj@example.com` (no wait imposed by the app) and the first line
    reads "We sent a new sign-in link to rj@example.com. Open it on this device to finish signing in."; **When**
    he presses Send again and it fails **Then** the sent state stays and "Couldn't send the link. Check the
    address and your connection, then try again." shows under it. **When** he presses Use a different email
    **Then** the email form shows with `rj@example.com` in the field and focus in it, and the stored address is
    still `rj@example.com`; **When** he changes it to `rj2@example.com` and presses Send link **Then** the first
    line names `rj2@example.com` and the stored address is `rj2@example.com`. **Given** instead he closes the
    dialog after the first send **When** he reopens it **Then** the email form shows, and **When** he opens the
    link on this device **Then** the sign-in completes with no question.
52. **Email link returns to the start page, "You're signed in." once** (SYNC-006, SYNC-002, SYNC-009) *(H-145)*
    **Given** the laptop signed out on `/decks?import=1` **When** RJ presses Sign in on the panel, sends a link
    to `rj@example.com` and opens it on the laptop **Then** when the sign-in completes (the moment "You're signed
    in." shows) the page URL is exactly `/decks?import=1`, with none of `mode`, `oobCode`, `apiKey`, `lang` or
    `continueUrl` in it; the notice "You're signed in." shows once, as a `success` notice (SYNC-087); the page
    shows "Getting your collection and decks from your account…" and then opens the **Import deck** dialog,
    without a reload. After that the Decks page removes `?import=1` from the URL (SYNC-159 c; v0.14, replaces the
    old `/import?type=deck` wording); the AC does not require the parameter to stay once the dialog has opened. **When** he reloads, or closes and reopens the tab **Then** "You're
    signed in." does not show again. **Given** instead he sent the link from the header on Home `/` **When** he
    opens it on the phone and confirms his address **Then** the phone lands on `/` and shows "You're signed in."
    once. **Given** a link whose return path points outside the app (a tampered link to another origin) **When**
    it is opened **Then** the app completes the sign-in on `/`. **Given** `authProviders: ['email-link',
    'google']` **When** he completes Continue with Google **Then** "You're signed in." shows once.
53. **Identity line in the account menu** (SYNC-003, SYNC-100) *(H-141)*
    **Given** signed in as `uA`, whose Auth address is `rj@example.com` **When** RJ opens the account menu **Then**
    its first line is the username (v0.14; when `uA` has none, "Signed in as rj@example.com" is first), and the next line reads "Signed in as rj@example.com", above the sync status, and it is text, not a menu item.
    **When** the cloud documents of `uA`, every local store, the sync log and the console output of the session
    are searched for `rj@example.com` **Then** it is found in none of them (Firebase Auth's own persisted session
    excepted). **Given** instead Auth reports no address for the user **When** he opens the menu **Then** no
    "Signed in as" line shows and the menu starts with the sync status.
54. **Account menu during an unfinished deletion** (SYNC-096, SYNC-084, SYNC-003) *(H-142)*
    **Given** signed in as `uA` with 3 pending changes, online, and the first delete of `users/uA` failed
    (`deletingUid: 'uA'`, `deletingRemovedAny: false`) **When** RJ opens the account menu **Then** the status
    reads exactly "Some data couldn't be deleted. Try again." (no "· 3 changes not synced yet"), the actions are
    **Try deleting again**, **Cancel deletion**, **Account Information** (which holds **Delete account and data**,
    v0.14), **Theme**, **Privacy notice** and **Sign out**, there is no Sync
    now item, and the failure notice's action still reads "Try again". **When** he reloads and opens the menu
    **Then** it is the same. **When** he chooses Cancel deletion **Then** "Your account wasn't deleted." shows,
    the menu offers Sync now again, and the 3 changes are pushed.
55. **Delete dialog when a fresh sign-in is needed** (SYNC-095, SYNC-096) *(H-143)*
    **Given** the default config, online, signed in as `uA` by email link 20 minutes ago, with 1 pending change
    **When** RJ chooses Delete account and data in Account Information **Then** the dialog shows the title "Delete your Rift Builder
    account?", the SYNC-095 paragraph, then "To delete your account, sign out, sign in again, then choose Delete
    account and data within 5 minutes.", and the buttons **Cancel** and **Sign out**; there is no "Type delete to
    confirm" field and no Delete account button, and no delete request is made. **When** he chooses Sign out
    **Then** the delete dialog and Account Information close and the SYNC-090 dialog opens with "1 change hasn't synced yet. It'll be
    lost if you sign out now."; **When** he chooses Cancel there **Then** nothing is deleted or cleared. **Given**
    instead he signed in 2 minutes ago **When** he opens Delete account and data **Then** the type-to-confirm
    state shows. **Given** instead `authProviders: ['email-link', 'google']` and he signed in with Google 20
    minutes ago **When** he opens it **Then** the type-to-confirm state shows, and confirming opens the Google
    re-authentication popup (SYNC-096 step 1).
56. **Sign-out dialog: explanation under the warning, "Syncing…"** (SYNC-090, SYNC-084) *(H-122)*
    **Given** signed in, online, with 2 pending changes **When** RJ chooses Sign out **Then** the dialog's title
    is "Sign out?", it shows "2 changes haven't synced yet. They'll be lost if you sign out now." and directly
    under it, in the muted style, "Your collection and decks stay in your account and are removed from this
    device. Sign in again to get them back.", with Sync now, Sign out anyway and Cancel. **When** he chooses Sync
    now and the push has not finished **Then** that button reads "Syncing…", it and Sign out anyway are
    disabled, and Cancel is enabled; **When** the push succeeds **Then** the dialog shows the plain question with
    Sign out and Cancel. **Given** instead the push is rejected **When** Sync now finishes **Then** the warning
    still reads "2 changes haven't synced yet…", the explanation line is still under it, and the button reads
    "Sync now" again.
57. **One panel line on every gated page** (SYNC-009, SYNC-086) *(H-144)*
    **Given** signed in as `uA` and the session lost (`sessionLostUid: 'uA'`) **When** RJ opens
    `/collection`, `/decks` and `/decks/0b7c…` **Then** each shows its page header and below it a panel with
    exactly "You've been signed out. Sign in again to continue." and a Sign in button, no panel heading, and the
    text "Sign in again to see them." appears on none of them. **Given** instead RJ has just signed in on an
    empty phone and the first sync is running **When** he opens `/collection` **Then** it shows its page header and
    "Getting your collection and decks from your account…" with no panel heading.
58. **Notice kinds** (SYNC-087) *(v0.11, documents H-116)*
    **Given** signed in, online **When** RJ completes Cancel deletion **Then** "Your account wasn't deleted."
    shows with OK, is announced politely, and closes on its own after about 6 s. **Given** instead the session is
    lost **When** "You've been signed out. Sign in again to sync." shows **Then** it is announced politely and is
    still on screen after 30 s, until he presses OK. **Given** instead a deletion fails after `users/uA` was
    deleted **When** "Some data couldn't be deleted. Try again." shows **Then** it has a **Try again** action, is
    announced assertively, and is still on screen after 30 s. **Given** a notice sent with no kind **When** it
    shows **Then** it behaves as `info` (polite, stays until OK). This AC checks no Collection page notice: the
    COLL-054 Remove-card Undo notice keeps its own rule (at least 8 s) and is never held to the 6 s rule.

**ACs 59–64 (v0.12, H-171: account-only and the browser cache; built H-172)**

59. **What the cache holds** (SYNC-141, SYNC-140) *(H-172)*
    **Given** `uA` with 350 cards, 20 tags, 3 locks and 10 decks, signed in on the laptop and synced **When** RJ
    inspects the browser's storage **Then** it holds the Firebase Auth session, the sync log (`sessionExpected`
    true, linked uid `uA`), the whole collection, tags and locks records, all 10 decks, view state and
    printing-code memory, and no email address of its own beyond Firebase Auth's session. **When** RJ then reloads
    with the network off **Then** Collection, Decks and a deck's card list open at once from the cache with no
    loading state for the cached data (SYNC-144).
60. **Sign-out, deletion and a different account clear the cache** (SYNC-142) *(H-172)*
    **Given** the laptop synced as `uA` with data as in AC 59 **When** RJ signs out (AC 20) **Then** every store,
    the sync log, view state, printing-code memory and the import Undo snapshot are empty, no Firestore document
    is written or deleted, and the public card catalog is still cached by the browser. **Given** instead the
    same laptop and RJ deletes the account (AC 21) **Then** the same stores are empty. **Given** instead a
    lost session for `uA` (AC 27) and `uB` signs in **Then** `uA`'s data, including its pending items, is
    cleared by `uB`'s first sign-in (SYNC-048) and none of it is uploaded to `uB`. **Given** instead RJ closes and
    reopens the browser, reloads, or goes offline **Then** the cache is not cleared.
61. **The cache is never uploaded** (SYNC-143, SYNC-049, SYNC-050) *(H-172)*
    **Given** a phone whose browser still holds stale data from the old no-account build (AC 48) **When** RJ
    signs in as `uA` **Then** the first sign-in makes at most 1 write (the account document, or none), no
    `state` or `decks` document is written by it, and after the flow the phone shows exactly the account's data.
    **Given** instead `uA`'s own pending edit (a `hextech ray` quantity change made offline while signed in)
    **When** the phone is online again **Then** only that item is pushed, as one `update()` (SYNC-043).
62. **Scrolling reads nothing from Firestore** (SYNC-145, SYNC-144, SPEC-007 COLL-093) *(H-172)*
    **Given** signed in as `uA` with a generated 3,000-entry collection and 200 decks, synced **When** RJ scrolls
    Collection from top to bottom, filters it, opens ten cards, then scrolls the Decks list **Then** the
    counting `RemoteStore` fake (or the emulator's request log) shows **0** reads and 0 writes during all of it,
    and no element reads "Page" or "Next".
63. **No local-only mode left** (SYNC-001, SYNC-007, SYNC-008 withdrawn) *(H-172)*
    **Given** the repository after H-172 **When** `web/src`, `web/angular.json` and the environment files are
    searched for `signInEnabled`, "local-only" and `clearCollectionData` **Then** there are no hits; the build
    configurations `production`, `preview` and development differ only in `appVersion` (and Firebase project
    settings), and the Home hero note reads "Free account" in all of them (Impacts, Home page copy, H-126).
64. **Production release rule** (SYNC-007) *(process check, H-172)*
    **Given** H-172 is built and validated **When** the item is closed **Then** the board row and
    [[Current State]] say that the account-only build is **not** deployed to production, the validator did not
    run `firebase deploy --only hosting` or merge to `main`, and a preview channel (never `live`) is the only
    place it runs, until board items H-063, H-152 and the rules deploy (SYNC-117) are all `done` and RJ decides.

**ACs 65–70 (v0.13, H-152: the privacy notice page and its links; build item listed on the board)**

65. **The page is public** (SYNC-104 a, SYNC-009) *(H-152 build)*
    **Given** a signed-out visitor with an empty browser **When** they open `/privacy` directly **Then** the page
    shows the heading "Privacy notice" and the effective date, no sign-in panel appears, and no request goes to
    Firebase (SYNC-002). **Given** instead RJ is signed in as `uA` or the browser is offline after loading the app
    **When** he opens `/privacy` **Then** it shows the same text. **Given** `/privacies` **Then** the app goes to Home.
66. **The page lists every checklist item** (SYNC-103) *(H-152 build)*
    **Given** the approved notice text **When** the page is read against SYNC-103 items 1–22 **Then** each has its
    own heading or paragraph, and these strings are present: the contact email RJ approved, the effective date, "IP
    address and user agent", "us-south1", "180 days", "Do Not Track", "Global Privacy Control", "no cookies",
    "Riot Games does not endorse or sponsor this project.", the age (13 or 16) RJ chose, and the sentence that no Riot
    account data is collected. No `[RJ:` placeholder remains anywhere on the page (the build fails the check if one
    does). Google sign-in is not mentioned (item 24).
67. **Sign-in dialog link** (SYNC-104 c, f) *(H-152 build)*
    **Given** the Sign in dialog is open, signed out, in the form state and again in the sent state **When** RJ
    looks at it **Then** a "Privacy notice" link is there; **When** he follows it **Then** `/privacy` opens in a new
    tab and the dialog and the typed address in the first tab are unchanged. The age line is shown near the form.
68. **Account menu link** (SYNC-104 d) *(H-152 build)*
    **Given** signed in as `uA` **When** RJ opens the account menu **Then** the items run: username, "Signed in as
    {email}", sync status, Sync now, Account Information, Theme, **Privacy notice**, Sign out (SYNC-151); **When** he chooses Privacy
    notice **Then** `/privacy` opens in the same tab and the menu closes. During an unfinished deletion the item is
    still there (SYNC-096).
69. **Footer link** (SYNC-104 e) *(H-152 build)*
    **Given** any page, signed in or out, desktop and phone **When** RJ scrolls to the footer **Then** a "Privacy
    notice" link sits next to the Riot legal line (unchanged text), is keyboard reachable, and goes to `/privacy`.
70. **Nothing new is collected** (SYNC-104 h, SYNC-100) and **launch check** *(H-152 build, then process)*
    **Given** the build with the page **When** DevTools lists storage, cookies and network requests across a signed-out
    visit to Home, Tournaments and `/privacy`, and then a sign-in and sign-out **Then** no cookie is set by the
    app, no key beyond SYNC-141's list (plus `rift.emailForSignIn` during an email-link sign-in, and `device-theme` once the visitor picks a theme, SYNC-157) is written, and the
    only third-party hosts contacted are Firebase and, if card images are not same-origin, the image host the notice
    names (SYNC-103 item 9). **Given** RJ has not marked [[Privacy Notice Draft]] `approved` **Then** the production
    release rule (AC 64) is not satisfied.

**ACs 71–80 (v0.14, H-174: header, username, theme, no `/import`; build item H-176)**

71. **Header control** (SYNC-150) *(H-176)*
    **Given** no session, at 1440 and at 390 **When** the app opens on Home **Then** the right end of the header holds
    only the outlined **Sign in** button, there is no Import button, and at 390 the bottom bar has exactly 3 tabs
    (Decks, Collection, Tournaments). **Given** signed in as `uA` with username `RJ Smith` **Then** the right end
    holds one ghost button, 44 px tall, showing the initial `R`, `RJ Smith` and a chevron, whose accessible name is
    "Account: RJ Smith" and which opens the account menu; **Given** the username `WWWWWWWWWWWWWWWWWWWW` (20
    wide letters, the longest and widest name) at 390 and at 641 **Then** the visible name is cut with an ellipsis,
    there is no wrap, overflow or horizontal scroll, and the accessible name still contains all 20 characters. **Given** `uA` has no username
    **Then** the label is "Account" with a person icon and the accessible name is "Account". **Given** a lost session
    (AC 27) **Then** the control is **Sign in**. **Given** a reload while signed in, also offline **Then** the name shows
    at once (from `StoredSyncLog.username`).
72. **Account menu** (SYNC-151, SYNC-104 d) *(H-176)*
    **Given** signed in as `uA` (username `RJ Smith`), online **When** RJ opens the account menu **Then** it shows, in
    order: "RJ Smith", "Signed in as rj@example.com", the sync status, a divider, **Sync now**, a divider,
    **Account Information**, the Theme group (System, Light, Dark, one checked), **Privacy notice**, a divider,
    **Sign out**; exactly 3 dividers; no "Settings", no "Delete account and data" item, and no link to `/account`.
    **Given** offline **Then** Sync now and Sign out are `aria-disabled` and "You're offline." shows, while Account
    Information, Theme and Privacy notice work. **When** RJ chooses Dark in the menu **Then** the app turns dark at once
    (AC 76) and the menu closes.
73. **Account Information** (SYNC-152, SYNC-095) *(H-176)*
    **Given** signed in **When** RJ chooses Account Information **Then** a dialog titled "Account Information" shows
    the username row with **Change** (accessible name "Change username"), the line "Shown at the top right. Only you
    can see it.", a separated **Delete account and data** button with "Deletes your account and everything saved in
    it, on every device. This can't be undone." and **Close**; no route changed. **When** he chooses Change **Then**
    the Change username dialog opens above it, and after Cancel focus is on Change. **When** he chooses Delete account
    and data **Then** the SYNC-095 dialog opens above it (type-to-confirm or sign-in-first as AC 38 and 55 say);
    **When** he cancels **Then** focus returns to Delete account and data. **Given** no username **Then** the row reads
    "No username yet." with **Add username**. **Given** offline **Then** Delete account and data is `aria-disabled`
    with "You're offline." under it.
74. **Username rules** (SYNC-153) *(H-176)*
    **Given** the Change username dialog **When** RJ saves `  RJ   Smith  ` **Then** `RJ Smith` is stored and shown.
    **When** he saves an empty field or three spaces **Then** "Enter a username." shows under the field with an icon,
    `aria-invalid="true"` and focus in the field, and nothing is written. **When** he saves 20 letters **Then** it is
    accepted and the counter reads `20 / 20`; **When** he saves 21 **Then** "Use 20 characters or fewer." shows, the
    counter reads `21 / 20` in the error colour and the pasted text is not cut. **When** he saves `Zoë O'Neil-Smith_2.0`
    (20 characters, `’` also accepted for `'`) **Then** it is accepted. **When** he saves `Squad 😀`, `👨‍👩‍👧 Squad`,
    `Squad ❤` (U+2764), `Squad™`, `1️⃣` (digit + U+FE0F + U+20E3), or `RJ@Smith` **Then** "Use letters, numbers, spaces
    and . _ - ' only. No emoji." shows and nothing is written. **When** he saves `Zoë` typed as `e` + U+0301 **Then**
    it is stored as the NFC form `Zoë` and counts 3. **When** he saves 20 × `𝐀` (U+1D400; 20 code points, 40 UTF-16
    units) **Then** it is accepted and the write is allowed by the rules (AC 22). **When** he saves 7 Devanagari
    letters each followed by two combining marks (21 code points) **Then** "Use 20 characters or fewer." shows (marks
    count). **When** he saves `-Smith` or `.Smith` **Then** the not-allowed message shows (the first character must be
    a letter or digit). **When** he pastes `Line one` + a line feed + `Line two`, or text with U+202E, U+200B or a
    zero-width joiner **Then** "Use letters, numbers, spaces and . _ - ' only. No emoji." shows. **When** he pastes 21
    characters that include an emoji **Then** the length error shows first. **When** the client's name check is run on
    every name in AC 22's allowed and denied lists (v0.16, H-212) **Then** it accepts exactly the allowed ones and
    refuses exactly the denied ones the client's normalization leaves unchanged, the same verdicts as the rules
    (SYNC-160 (f)); the same list is the shared test data. **Given** `uB` also saves `RJ Smith` **Then** it is accepted (not unique)
    and neither account can see the other's name.
75. **The one-time prompt** (SYNC-154) *(H-176)*
    **Given** a brand-new email with no account **When** the link is opened and the first sign-in creates the
    account **Then** "You're signed in." shows and the dialog "Choose a username" opens with its line, an empty
    focused field, **Not now** and **Save**; **While** the first sync is still running **Then** Save is
    `aria-disabled` with "Getting your account ready…", and works when the flow completes. **When** he presses
    Escape or **Not now** **Then** no username is written, the header reads "Account", and the dialog never shows
    again on its own, also after a reload and a later sign-in. **When** he clicks the backdrop **Then** nothing
    happens. **Given** instead an existing account signing in on a new device, or an account without a username made
    before v0.14 **Then** no prompt shows.
76. **Saving a username** (SYNC-155, SYNC-156, SYNC-100) *(H-176)*
    **Given** signed in as `uA` online **When** RJ saves `RJ Smith` **Then** exactly one write is made, an `update()` of
    `users/uA` with `username`, `updatedAt` and `syncedAt`; no read is made for it; the dialog closes, the header and
    menu show `RJ Smith` without a reload, focus returns to the opener, and "Username saved." shows (6 s, polite).
    **When** the phone is next started or signed in **Then** it shows `RJ Smith`. **When** RJ saves 20 × `𝐀` (the widest accepted name, 40 UTF-16 units) **Then** the same single write is allowed by
    the rules (no `permission-denied`), and the Auth profile `displayName` is still unset after every save (SYNC-156
    (c)). **Given** the write fails **Then**
    the dialog stays open with "Couldn't save your username. Check your connection and try again." **Given** offline
    **Then** Save is `aria-disabled` with "You're offline." above the buttons. **When** every local store, the sync log,
    the cloud documents other than `users/uA`, the Firebase Auth profile (`displayName`) and the console output are
    searched for `RJ Smith` **Then** it is found only in `users/uA.username` and `StoredSyncLog.username`. **When** RJ
    signs out **Then** the sync log is empty and the header shows **Sign in**; **When** the account is deleted **Then**
    `users/uA` and its username are gone.
77. **Theme per device** (SYNC-157) *(H-176)*
    **Given** an empty browser on a dark system **When** the app opens **Then** it is dark and no `device-theme` key
    exists; **When** the system setting changes to light while the page is open **Then** the app turns light at once.
    **When** RJ chooses Dark on a light system **Then** the whole app is dark at once (header, footer, dialogs, menus,
    form fields and the `theme-color` meta); **When** he reloads **Then** the dark theme is on the document before the
    first paint (checked with an init script that records `document.documentElement` at the first frame) and
    `device-theme` is `dark`. **When** he chooses System **Then** the key is gone. **Given** the stored value
    `purple` **Then** the app follows the system. **Given** storage that refuses writes **Then** the choice still
    applies for the page load and no error shows.
78. **The theme survives the cache clears** (SYNC-157, SYNC-142, SYNC-091) *(H-176; closes the H-172 note)*
    **Given** `device-theme` is `dark` and signed in as `uA` **When** RJ signs out (AC 20) **Then** every `rift.` key and
    the sync log are gone and `device-theme` is still `dark` and the app is still dark; **When** he deletes the
    account (AC 21), or `uB` signs in on a device that held `uA`'s cache (AC 60), or a SYNC-097 sign-out runs **Then**
    the same holds. **Given** a code search of `web/src` **Then** the key does not start with `rift.` and the cache
    clear removes keys by an explicit list, not by a prefix that matches it. **Given** the cloud documents and the
    sync log of `uA` **Then** none has a theme field.
79. **Theme controls** (SYNC-158) *(H-176)*
    **Given** a signed-out visitor **When** they scroll to the footer on Home, Tournaments and `/privacy` **Then** a
    **Theme** control with System, Light and Dark is there (radio semantics, a check on the selected one, each
    option at least 44 px tall, keyboard operable), next to the Privacy notice link and the Riot legal line; **When**
    they choose Light **Then** the app turns light, no `firebase` chunk loads and no network request is made.
    **Given** signed in **When** the user changes it in the menu **Then** the footer switch shows the same value at
    once, and the other way round.
80. **`/import` is gone; the dialog parameters** (SYNC-159) *(H-176)*
    **Given** any session state **When** the visitor opens `/import` or `/import?type=deck` **Then** the app shows
    Home (the same as `/nope`), there is no not-found page, no Import page content, no Import tab or button, and
    `routerLink` or `href` to `/import` appears nowhere in `web/src`. **Given** signed in with the gate open **When**
    RJ opens `/collection?add=1` **Then** the "Add to your collection" dialog opens once, the address becomes
    `/collection`, and Back does not reopen it; **When** he opens `/decks?import=1` **Then** the "Import deck" dialog
    opens once and the address becomes `/decks`. **Given** signed out **When** he opens `/collection?add=1` **Then**
    the page header and the sign-in panel show, no dialog opens, and after he signs in (email link returning to the
    same address) the first sync completes and the dialog opens once. **Given** `/collection?add=2` **Then** nothing
    opens and the address is left alone. **Given** the Collection page cannot import (card data unavailable) with
    `?add=1` **Then** no dialog opens and the parameter is removed.

## Out of scope
- Sharing decks or collections with other users, public profiles, friends.
- Real-time live updates between two open devices beyond the SYNC-040 triggers.
- Syncing printing-code memory, view state and saved views (SYNC-019; may join `users/{uid}` later).
- Enabling the providers in the Firebase console and the database delete-protection setting (H-063, RJ).
- Moving off the Spark plan, usage alerts and budget caps ([[Firestore Data Shape]] decision 1).
- The 8-bucket collection split (future `schemaVersion: 2`, SYNC-123).

## Impacts on other specs and checks (for the orchestrator to file)
**v0.14 (H-174, RJ 2026-11-24 header decision, H-178): applied in the same change.** SPEC-003 0.12 (IMP-060, IMP-072,
IMP-076), SPEC-005 0.7 (OWN-008, new OWN-094), SPEC-006 0.9 (DECK-001, DECK-097) and SPEC-007 0.12 (new COLL-094, COLL-091)
now say "Add to your collection" / "Import deck" from their own pages with no `/import`; [[Privacy Notice Draft]] gets the
username and theme-key lines. SPEC-004 and SPEC-008 name no import page (pins only).

**Code changes H-176 must make** (spec text above; the builder works from the requirement IDs; look at [[Brief H-175]]
for layout):
1. **Header** (SYNC-150): remove the Import button and the phone Import tab (tab bar = 3 tabs); signed out show **Sign
   in**, signed in the ghost account button (initial, username, chevron; **Account** with a person icon when none);
   accessible name `Account: {username}`; name from `StoredSyncLog.username` (add the optional field, SYNC-156).
2. **Account menu** (SYNC-151): username line first; Sync now; **Account Information**; **Theme** radio group; Privacy
   notice; Sign out; exactly 3 dividers; remove the **Delete account and data** item and any Settings link.
3. **Account Information dialog** (SYNC-152): username row with Change / Add username, **Delete account and data**
   (opens the unchanged SYNC-095 dialog on top), Close; its Sign out choice closes both dialogs. No `/account` route.
4. **Username** (SYNC-153…156): shared "Choose a username" / "Change username" dialog; normalization and grapheme
   count (`Intl.Segmenter`); errors; the one-time prompt after SYNC-048 case (a) only, with **Not now**; **Save** held
   while the first sync runs; `RemoteStore.setUsername` (one `update()` of `users/{uid}`: `username`, `updatedAt`,
   `syncedAt`); read `username` from the account document in the account check and full read into the sync log.
   **`firestore.rules`:** account `username` optional string, `size()` 1 to 2000, **denied on create**, allowed on update
   (SYNC-112; H-183); client: also reject a normalized name over 500 UTF-16 units (SYNC-153 (3)); add the cases of AC 22
   (incl. the 24-family-emoji name accepted, 2001 characters denied), AC 74 and AC 76 to `web/rules-tests`, then `firebase deploy --only firestore` waits
   for RJ's rules deploy (SYNC-117). **v0.15 (H-206, build H-207) supersedes the grapheme count, the 500-unit cap and
   the 2000 cap in this item:** the client counts NFC code points (at most 20) and accepts only the SYNC-153 (4)
   character set (no `Intl.Segmenter` for counting; the header initial may still use it); counter `n / 20`; error
   strings "Use 20 characters or fewer." and "Use letters, numbers, spaces and . _ - ' only. No emoji."; the rules cap
   becomes `size()` 1 to **80** (create still denied); `web/rules-tests` cases per AC 22 (20 × `𝐀` and 80 × `a`
   allowed, 81 × `a` denied) and the unit tests per AC 74 (including the no-emoji, NFC and mark-counting examples);
   existing accounts whose saved name breaks the new rules (an emoji, over 20) keep showing it until they change it,
   and the next Save of it runs the new check (the app never rewrites a stored name on its own; a Save of the
   unchanged value still just closes, SYNC-155); `firebase deploy --only firestore` after PASS (RJ OK'd rules
   deploys on 2026-11-25). **v0.16 (H-212, build H-213) supersedes "the rules cap becomes `size()` 1 to 80" and "the
   rules do not check the character set":** `firestore.rules` gets `validUsername` exactly as SYNC-160 (c) (string,
   `size()` 1 to 80, the allowed pattern with `{0,19}`, no variation selector, no trailing or doubled space), used only
   when the request changes `username`; `web/rules-tests` gets the AC 22 allowed and denied lists, the legacy-name
   case and the four SYNC-160 (g) proofs, plus a shared names list run through both `username.ts` and the rules; a
   failed proof stops the build and is reported (SYNC-160 (h)); one production check after the deploy (SYNC-160 (g));
   [[API Contracts]] (the SYNC-112 username paragraph and the rules-test notes) is updated by the builder in H-213.
   The client function and its strings do not change.
5. **Theme** (SYNC-157, 158): key **`device-theme`** (not `rift.*`); `clearLocalData` and every cache clear must
   remove keys by an explicit list or a prefix the theme key does not match (**the H-172 builder's finding: today it
   removes every `rift.*` key; the theme key must be outside it and AC 78 tests it**); inline script in `index.html`
   so `light` / `dark` is on `<html>` before first paint; `system` follows `prefers-color-scheme` live; token and
   `color-scheme` handling and the two `theme-color` meta tags per [[Brief H-175]] T2; footer switch on every page;
   menu radio group; both bound to one signal.
6. **Imports** (SYNC-159, COLL-094, OWN-094): delete the `/import` route, page, option cards, drag-and-drop page and
   every `routerLink="/import"`; the catch-all already sends unknown paths to Home (keep it, no not-found page); the
   "Add to your collection" FAB on Collection and the "Import deck" FAB on Decks (SPEC-007 COLL-094, SPEC-005 OWN-094);
   both dialogs open from their page and a commit / save stays there (IMP-072, DECK-001); `?add=1` / `?import=1` one-shot
   parameters, removed with `replaceUrl`, kept across sign-in (SYNC-006); Home's buttons relabelled and relinked.
7. **Sign-in dialog**: add "New here? Signing in with your email creates your account." (SYNC-003); email-link
   `returnTo` examples and tests use `/decks?import=1`, not `/import?type=deck`.
8. **Tests and search:** `/import` and `Import` button appear nowhere in `web/src` or tests; ACs 21, 22, 38, 46, 52,
   53, 54, 55, 57, 68, 70 and the new 71–80.
9. **Do not deploy to production** (SYNC-007, AC 64; RJ's H-179 answer: no merge of `dev` into `main` until sign-in is
   ready, no deploy guard); preview channels only.

**v0.12 (H-171, RJ decision 17, account-only): applied in the same change.** SPEC-003 0.11 (IMP-053, IMP-076,
IMP-075 (d)), SPEC-004 0.6 (CAT-077, CAT-078, new CAT-079), SPEC-005 0.6 (OWN-066, OWN-093, new OWN-084), SPEC-006
0.8 (DECK-090, DECK-097, DECK-087), SPEC-007 0.11 (COLL-070, **COLL-074 withdrawn**, COLL-092, new COLL-093) and
SPEC-008 0.4.4 (SHARE-060) now say account-only.

**Code changes H-172 must make** (the spec text is above; the builder works from the requirement IDs):
1. **Remove `signInEnabled` and every branch on it** (SYNC-007, SYNC-008 withdrawn): `core/sync/sign-in-flag.ts`,
   `core/sync/sign-in-gate.ts`, `shared/sync/gate.ts` (gate always on, SYNC-009), `shared/sync/sync-engine.ts`
   (no "stamp but never push" path, SYNC-031; no mode check before `firebase` loads, SYNC-002), `account-menu.ts`,
   `app.ts` / `app.html` (Sign in action always shown to a signed-out visitor), the Home hero note ("Free account"
   always), `web/src/environments/*.ts` and `web/angular.json` configurations. `production`, `preview` and
   development then differ only in `appVersion` (and Firebase project settings). Keep `authProviders` (SYNC-006).
2. **Remove the COLL-074 action** (withdrawn): the Collection header More (⋮) menu item "Delete all local
   collection data", `delete-collection-data-dialog.ts` and its tests, and `clearCollectionData` if nothing else
   uses it (SYNC-052 withdrawn). If the More menu then has no items, remove the menu; keep Export CSV where it is.
   Remove references to COLL-074 in code comments and `brain/04-UI/Collection.md` notes (H-173 / ui-engineer may
   restate the menu).
3. **Gate wording in code and tests:** every `signInEnabled: true` test fixture and "account-required mode" test
   name becomes plain (SYNC-009); delete the tests that assert local-only behaviour (AC 45 old text, AC 31 old
   text, AC 35 old text); add the new ACs 31, 35, 45, 48 (rewritten) and 59–64.
4. **Browser cache rules (section M):** (a) clear exactly on SYNC-142's four events and no others (check the
   SYNC-097 paths, lost session keeps the cache); (b) the cache holds the whole account, so no code limits it to
   "recent" items (SYNC-141); (c) nothing uploads the cache (SYNC-143; check there is no leftover upload or Combine
   path); (d) draw gated pages from the cache first and update in place after the pull (SYNC-144); (e) scrolling,
   filtering and opening items makes no Firestore request (SYNC-145; add a test with the counting `RemoteStore`
   fake); (f) the public catalog and images are not cleared by sign-out (SYNC-141 e).
5. **Smooth scrolling, no pagination (COLL-093):** the Collection page keeps its virtual scroll; check it has no
   page numbers or "Load more", and meets COLL-093 (b)–(g) (summary total visible, scroll position and query kept on
   Back as SHOULD, filter change returns to top). Decks list and Tournaments are not built yet, so OWN-084 and
   CAT-079 are build requirements for H-060 and the Tournaments build; the guidance is board H-173. No change to the
   gate's page structure; **do not touch `/import` or the header account entry**: H-174 (now specced, v0.14) and H-176 own those.
6. **Deploy:** do **not** deploy to production (SYNC-007, AC 64): no `firebase deploy --only hosting`, no merge to
   `main`; preview channels only, with the documented preview command. The GitHub Actions deploy of `main` is what
   would publish the build, so keep it out of `main` until H-063, H-152 and the rules deploy are done (open
   question 10).
7. **Production today stays on the old build:** nothing in H-172 needs a data migration; browser data left by the old
   no-account build is cleared by the first sign-in (SYNC-048, AC 48).

**Earlier impact lists (v0.7, v0.8, H-071, H-160) are history, all applied, and moved to the archived note
[[Accounts and Sync changelog]] ("Impacts history").** v0.12 supersedes their per-mode wording. Still-live items:
- **Home page copy (done, H-126; v0.12):** the hero note is "Free account" always (H-172). The retired note
  "Free · No account · Stored in your browser" is gone.
- [[Current State]] constraints line "storage by mode" is replaced by account-only wording (RJ decision 17).
- [[Firestore Data Shape]]: the first-sign-in upload and merge rows are superseded; a first sign-in now costs
  the download reads plus at most 1 write (SYNC-050, SYNC-120).
- [[Firestore Data Shape]] read estimates are now low: a reopen is 3 reads (account check + 2 queries, SYNC-040),
  not 2; a first sign-in adds up to 3 + N rule-lookup reads and each new deck up to 1 (SYNC-113, SYNC-120). The
  per-day table (typical ≈ 15 reads) and the DAU figures should be recomputed; the effect is small (≈ +3 reads
  per typical user per day) but the note should match. The `existsAfter()` billing points are `unverified`.
- [[Validation Checks]] V-011: the grep excludes only `services/src/adapters/`, so the `web/` Firebase adapter of
  SYNC-130 would fail it. V-011 needs an allowed `web/` adapter path (e.g. `web/src/app/**/adapters/`).
- **Applied (H-071):** [[ADR-0007 Firebase Accounts and Firestore]] "Planned layout" now points to this spec.

## Decisions (RJ, 2026-11-23 and 2026-11-24)
RJ's answers to the 11 open questions of v0.1–v0.4, quoted, and where they apply, plus decisions 12 to 16.
Superseded decisions stay listed and are marked.
1. **Sign-in providers:** "Email Link and Google", then (2026-11-23) "i did email. update the specs to work in
   google later but stick with email for now". Email link only at launch, the only provider RJ enabled (H-063).
   Google stays specified but off until RJ adds `'google'` to `authProviders` and enables it in the console
   (SYNC-006). With email link, re-authentication before account deletion means signing in again with a fresh
   link (SYNC-096).
2. **Merge that leaves a locked deck short:** "locked and flagged". The deck stays locked and is flagged, with a notice (SYNC-074).
3. **Deck edited on another device while locked:** "keep the lock with new cards. however, all deck statuses
   should be synced on the user so they're the same through every device they log in from". Keep the lock with
   the new cards (SYNC-072). Deck statuses are the same on every signed-in device once synced (new SYNC-077, AC 37):
   they are computed only from synced data and the catalog, nothing device-local feeds them, and none is stored.
4. **Lock vs. deletion:** "deletion wins" (SYNC-071).
5. ~~**First sign-in with data on both sides:** "Cancel". Only Combine or Cancel are offered, nothing else
   (SYNC-049).~~ **Superseded by decision 13** (2026-11-24): there is no Combine; device data is cleared on first
   sign-in (SYNC-048, SYNC-049).
6. ~~**Sign-out default:** "keep a copy on this device". It is the primary button (SYNC-090).~~ **Superseded by
   decision 13** (2026-11-24): sign-out always clears the device; there is no Keep a copy (SYNC-090, SYNC-091).
7. **Delete-account friction:** "No need to 'keep a copy' it'll be deleted with the account". There is no
   keep-a-copy option, deleting the account also clears this device (SYNC-095, SYNC-096), and the user still types `delete`.
8. **Other devices after deletion:** "remove synced data" (SYNC-097, `deleted` branch).
9. **Free tier, tombstones, what isn't synced** ([[Firestore Data Shape]] decisions 1–3): "yes for now until we
   get further into the project". This means Spark with "Sync paused" (SYNC-083), 30-day tombstones (SYNC-034), and printing codes
   and view state not synced (SYNC-019). These choices may be revisited later in the project.
10. **Privacy notice:** "yes". ~~Sign-in stays hidden in production through the build flag until RJ approves the
    notice (SYNC-007).~~ **Since v0.12 (decision 17) the flag is gone:** the account-only build is simply not
    deployed to production until RJ approves the notice, H-063 and the Firestore rules are done (SYNC-007).
    **Closed in v0.13 (H-152):** the research is done (H-069, [[Privacy Notice Requirements]]), SYNC-101 and
    SYNC-103/104 carry the wording, and the draft text for RJ to approve is [[Privacy Notice Draft]]. RJ's approval of
    that text is still the gate (SYNC-007 condition 2); it is recorded there, not here.
11. **Account found half-deleted on another device:** "sign out". The device signs out and writes nothing.
    There is no Upload option (SYNC-097, SYNC-048 f). **"Sign out" stands; "keeps its data as signed-out data"
    is superseded by decision 13** (2026-11-24): a sign-out clears the device, so the half-deleted sign-out clears
    it too (SYNC-097). ~~Reasoning for keeping the data: decision 8 (remove synced data) applies when the deletion
    is confirmed (`checkAccount()` = `deleted`). In the half-deleted state the account still exists and the
    deletion may have failed for good. Wiping could then destroy the only copy, while keeping matches decision 6.~~
    Why the old reasoning no longer holds: decision 12 lets a deletion be cancelled only while nothing was
    removed, so once `users/{uid}` is gone the deletion only goes forward; and decision 13 leaves no way to show
    or upload a kept copy.
12. **Cancelling an unfinished deletion** (RJ, 2026-11-23, board H-074; RJ chose "Cancel if nothing removed"; the rest is a paraphrase of that option): if the deletion removed nothing (the
    first delete, `users/{uid}`, failed), the error state offers Cancel deletion, which clears `deletingUid` and
    resumes normal syncing. Once `users/{uid}` (or anything) has been deleted, only Try again (or Remove from this
    device; since v0.8, Sign out, which clears the device) is offered (SYNC-096, AC 43). Built: H-127.
13. **Account required to import** (RJ, 2026-11-24, in chat, board H-080): "You NEED an account to import your
    cards and import decks. You do NOT need an account to view the tournaments rankings". His answers:
    (a) sign-out clears this device's collection, tags, decks, locks and the rest; they return from the account
    on sign-in; no "Keep a copy", so there is never signed-out data and no Combine dialog (SYNC-090, SYNC-091,
    SYNC-049); (b) signed out, a visitor sees Home and Tournaments only; Decks, Collection, Import and
    Tournaments' "Add to your decks" show a sign-in prompt instead (SYNC-009) (**the "Add to your decks shows a
    sign-in prompt" part is replaced by (h)**: signed out, Tournaments shows no Add to your decks control); (c) ~~production keeps today's
    no-account imports (browser storage) until sign-in is turned on in production, after RJ approves the privacy
    notice (H-069, SYNC-007); the switch happens with `signInEnabled: true` (SYNC-008)~~ **superseded by decision
    17** (no flag, no second mode; production keeps its current build until H-063, H-152 and the rules are done,
    SYNC-007); (d) cards and decks saved
    in a browser without an account are ignored and cleared on first sign-in, not imported (SYNC-048). Recorded
    as the ADR-0007 amendment of 2026-11-24. Supersedes decisions 5 and 6, and the "keeps its data" part of
    decision 11. **Follow-ups (RJ, 2026-11-24, in chat):**
    (e) **ADR-0007 amendment accepted** by RJ.
    (f) **Lost session closes the pages:** while the session is lost, gated pages show the sign-in panel; the
    local data stays on the device (not cleared) until the user signs in again; the same uid resumes, a
    different uid clears (SYNC-009, SYNC-086, ACs 27, 47). This replaces the v0.8 draft default "keep the pages
    open".
    (g) **No legacy-data warning:** "this wont be an issue as no one has done that and no releases has been
    made". The SYNC-003 warning is dropped; the first sign-in still clears legacy data, silently (SYNC-048).
    (h) **No Tournaments deck controls when signed out:** "a signed out visitor shouldn't see 'Add to your decks'
    in the tournaments". While the gate is not open (signed out, session lost, first sync running), Tournaments
    shows no Add to your decks, In your decks or Add another copy control, and the CAT-074 check reads nothing
    from the local stores (SYNC-009, AC 46). This replaces the draft "opens the sign-in dialog" behaviour.
14. **Sign-in panel layout and text** (RJ, 2026-11-24, board H-134; paraphrased from the board item, after
    reviewing the H-081 build): (a) gated pages (Decks, deck detail, Collection, Import) keep their page header
    (title and description) above the sign-in panel; only the content below the header is replaced; (b) ~~the
    signed-out panel text is exactly "You need a free account to import cards or decks." ("or", not "and"; the
    sentence "Tournaments are open to everyone." is dropped)~~ **(b) superseded by decision 15** (2026-11-24).
    Applies to SYNC-009 and AC 46; the lost-session text and the panel headings were unchanged by it. Build:
    H-135. Part (a) stands.
15. **Sign-in panel text** (RJ, 2026-11-24, board H-118, after the [[UI Review 2026-11-24]] #16; decided, quoted
    from the board row): the signed-out sign-in panel shows just "Sign in or create an account to start keeping
    track of your collections and decks". The string is used verbatim, including RJ's lack of a closing full
    stop. It replaces decision 14 (b). Decision 14 (a) stands: the page header stays above the panel. Applies to
    SYNC-009 and AC 46. Spec-writer readings of "just" (confirmed by RJ 2026-11-24, Open questions 7 and 8): the
    per-page panel headings go in every panel state, and the lost-session line becomes the one neutral line
    "You've been signed out. Sign in again to continue." (H-117). Build: H-144. Both readings confirmed by
    decision 16.
16. **Defaults confirmed** (RJ, 2026-11-24, in chat, recorded in H-146): "all those look good to me", said of
    Open questions 1–9 below and of the other-device confirm dialog's title "Finish signing in" (SYNC-006, a new
    string from the H-108 build). Every default stands as specified and built: sign-out allowed during an
    unfinished deletion (1), no sign-out offline (2), the sent state (3), "Signed in as {email}" (4), the
    deletion-state menu (5), the delete dialog's sign-in-first state (6), the lost-session line (7), no panel
    heading (8), the return and "You're signed in." rules (9). No requirement changes.
17. **Account-only, local-only mode dropped** (RJ, 2026-11-24, in chat, board H-171;
    [[ADR-0007 Firebase Accounts and Firestore]] amendment 2026-11-24 (2), accepted): "let's drop the local-only mode... all data will live and
    be from the account that's signed in. if someone deletes their account, their information will be deleted as
    well. However, we can keep cached data in the browser to speed up load times like we can cache their
    authentication and a few cards/decks. As users scroll through their decks /cards it should feel smooth. No
    physical pagination, more like an infinite scroll." Applied in v0.12: the `signInEnabled` flag and SYNC-008
    go; SYNC-007 is the production release rule; the browser cache is section M (SYNC-140…146); SYNC-052 and
    SPEC-007 COLL-074 are withdrawn; SYNC-095 (delete account and data) is unchanged; scrolling rules are COLL-093,
    OWN-084, CAT-079. Supersedes decision 13 (c) and decision 10's "sign-in stays hidden". **Spec-writer choices
    inside it** (flagged in Open questions 10 and 11): the cache holds the whole account, not only recent items
    (SYNC-141); view state and printing-code memory stay per-device and are cleared with the cache.

18. **Production held, cache whole-account** (RJ, 2026-11-24, board H-179): Open question 10 answered: "don't merge
    `dev` → `main` until sign-in is ready in production"; **no deploy guard** (no workflow change, no repository
    variable). Open question 11 **confirmed as specced**: the browser caches the whole account (SYNC-141), and view
    state and printing codes stay per device and are cleared with the cache (SYNC-141 d, SYNC-142). Both closed; no
    requirement changed (SYNC-007 and AC 64 already say it).
19. **Header, username, theme, no `/import`** (RJ, 2026-11-24, [[ADR-0006 Two Imports - Collection and Decks]] "Header
    and import entry points", [[Brief H-175]] "RJ decisions" = gate H-178; board H-174). Applied in v0.14: the account
    control replaces the Import button (SYNC-150); settings in the header menu with an **Account Information** dialog,
    no `/account` page (SYNC-151, 152); username ~~1–24 characters, any script and emoji~~ (limits superseded by
    decision 20), not unique, the prompt skippable (SYNC-153, 154); theme per device with System default, in the menu and a footer switch for everyone
    (SYNC-157, 158); Add to your collection / Import deck FABs that collapse on phones and hide on empty pages
    (SPEC-007 COLL-094, SPEC-005 OWN-094); `/import` goes to Home like any unknown path, no not-found page (SYNC-159).
    **Conflicts resolved:** (a) the board row says "no redirect, not-found page" and the ADR's first text says "old
    links show the not-found page"; RJ's later answer (H-178 decision 6; ADR follow-up) wins: Home. (b) The theme sits
    in **both** the menu and the footer (H-178 decision 5), so SYNC-104 (d) and AC 68 (Account Information, Theme,
    Privacy notice, Sign out) stay as v0.13 wrote them. (c) The username is in the account document (the board row),
    not the Auth profile (the brief's U6): Open question 13.
20. **Username limited to 20 characters, no emoji** (RJ, 2026-11-25, in chat, board H-206): "let's limit usernames to 20
    characters and not include emojis". Applied in v0.15 (SYNC-153, 112, 156, ACs 22, 71, 74, 76). Supersedes the
    length and emoji part of decision 19. **The allowed set was confirmed by RJ on 2026-11-25 in decision 21 below.**
    Still not RJ's words: the counting unit (Unicode code points after NFC) and the NFC step; the rules cap of 80 is
    now only a bound (decision 21). RJ also asked that the name stay out
    of the Firebase Auth `displayName`; kept in `users/{uid}.username` because the rules can enforce only the
    Firestore field on the Spark plan (SYNC-156).
21. **Allowed characters confirmed; the rules enforce them and the 20** (RJ, 2026-11-25, in chat, board H-212): "stick
    with my allowed characters. set up our own validation". Asked what the rules should add, RJ chose **"Rules check 20
    too"**: the server enforces both the allowed set and the 20-character limit, stricter than the v0.15 `size()` 80
    backstop. Applied in v0.16 (SYNC-160, SYNC-112, SYNC-153, SYNC-156, ACs 22 and 74). **What RJ explicitly
    confirmed:** the allowed set (letters and numbers of any script, the combining marks they need, spaces, `.` `_`
    `-` `'` `’`; the first character a letter or digit; no emoji, so no variation selectors) and server-side
    enforcement of it and of 20. He did **not** say anything about the counting unit: **code points stay as
    specified** because that is what the rules' regular expression counts (SYNC-160 (d)); the spec-writer's flag for RJ
    is that a name written with separate combining marks (Devanagari, Thai) therefore holds fewer visible letters than
    20, which RJ may still change to a higher cap. **Spec-writer additions inside it, flagged:** the rules also refuse
    a trailing space and two spaces in a row, and variation selectors by an explicit exclusion; rules cannot check NFC;
    the check runs only when `username` changes, so v0.14 legacy names stay usable.

## Open questions
*Note for board H-152 (privacy notice): the question it meant is **RJ decision 10, "Privacy notice"** (RJ's approval of the notice), not Open question 10 below, which is "Holding production back". **Closed in v0.13:** the legal content is specified (SYNC-101, 103, 104) and no longer blocked; what remains is RJ's approval and the blanks in [[Privacy Notice Draft]] (open question 12). Open questions are not renumbered.*

**v0.12 (H-171): both ANSWERED by RJ 2026-11-24 (board H-179), closed in v0.14 (decision 18).** 10 → default
kept: RJ does not merge `dev` into `main` until sign-in is ready in production; **no deploy guard**. 11 → confirmed
as specced: whole-account cache; view state and printing-code memory per device. The original questions follow for
the reasoning.
10. **Holding production back** (SYNC-007, AC 64): the account-only build must not reach production until H-063,
    H-152 and the rules are done, but the GitHub Actions deploy of `main` publishes whatever is merged. Default
    (no new mechanism): RJ does not merge `dev` into `main`, and H-172 deploys to preview channels only.
    Alternative: a small guard in the deploy workflow that refuses to deploy unless a repository variable says
    production is ready (a builder item; it would be a deploy-time switch, not a code mode). Which?
11. **How much the browser caches** (SYNC-141): default is the **whole account** (all cards, tags, locks and every
    deck), because the first sign-in already downloads all of it, the collection is one document, reopening costs
    2–3 reads, and a partial cache would need extra reads and break offline use; size is about 95 KB typical,
    640 KB heavy. Alternative: cache only recently viewed decks (needs per-deck reads on every open). Also
    confirm that Collection view state and printing-code memory stay per-device (not account data) and are
    cleared on sign-out (SYNC-141 d).


**Answered by RJ 2026-11-24 (earlier):** amendment accepted, lost session, legacy-data warning, Tournaments controls
(decision 13 e–h). The draft question on auto-adding a deck after sign-in is moot: signed out, there is no Add
to your decks control (13 h). **Questions 1–9 below: answered by RJ 2026-11-24, defaults confirmed** (decision
16, "all those look good to me"); kept for the reasoning. The confirm dialog title "Finish signing in" was
confirmed in the same answer.

**Answered 2026-11-24 (were specced with defaults):**
1. **Sign out during an unfinished deletion** (SYNC-096, SYNC-098 risk 2): signing out clears `deletingUid`, so
   no device can finish a half-done deletion afterwards. Default: allow it, as v0.7 allowed Remove. The
   alternative is a warning line in the Sign out dialog. **Confirmed (RJ 2026-11-24): default kept.**
2. **No sign-out while offline** (SYNC-081, SYNC-090, AC 20): spec-writer call, kept from the build. Sign out
   and Sign out anyway are disabled offline, so a device is never cleared offline and the user can only Cancel
   until the connection returns. The alternative is to allow an offline sign-out, which would clear the device
   and lose the pending changes. **Confirmed (RJ 2026-11-24): default kept.**

**v0.10 defaults from the [[UI Review 2026-11-24]] (spec-writer calls; all confirmed by RJ 2026-11-24, built as written):**
3. **Sent state** (SYNC-006, H-107): the wording "We sent a sign-in link to `{address}`. Open it on this device to
   finish signing in." / "Didn't get it? Check your spam folder." with **Send again** and **Use a different
   email**; Send again has **no cooldown** (simplest; Firebase rate-limits repeated sends itself and that shows
   as the send-failure text); Use a different email keeps the last address in the field so a typo is a quick
   fix. Alternative: a 30–60 s cooldown on Send again.
4. **"Signed in as `{email}`"** (SYNC-003, SYNC-100, H-109): accepted as the first line of the account menu.
   Reason: it is shown only on the user's own device, read from Firebase Auth, and not written to any store,
   Firestore, logs or analytics, so SYNC-100 holds; it tells the user which account is on a shared device.
   Alternative: no identity line.
5. **Menu during an unfinished deletion** (SYNC-096, SYNC-084, H-111): Sync now is **hidden** (not disabled), since
   pull and push are blocked and a disabled item would need its own explanation; the status drops the pending
   count; the menu action reads **Try deleting again** (the notice keeps "Try again"), so the two retry
   actions no longer read alike. Alternatives: Sync now disabled; keep "Try again" in the menu.
6. **Delete dialog sign-in-first state** (SYNC-095, H-112): it keeps the SYNC-095 paragraph (the user still sees
   what deleting means), reuses the SYNC-096 step 1 text instead of a new string, and its **Sign out** opens the
   normal Sign out dialog (so unsynced changes are still warned about). Alternative wording from the review:
   "For your security, sign out and sign in again first, then delete within 5 minutes."
7. **Lost-session panel line** (SYNC-009, SYNC-086, H-117): one neutral line on every gated page, "You've been
   signed out. Sign in again to continue." Reason: decision 15 makes the signed-out panel a single line with no
   heading, so per-page text has nothing to attach to, and "continue" fits Import as well as Collection and
   Decks. Alternative: a per-page line.
8. **No panel heading** (SYNC-009, decision 15, H-118): RJ's "just" is read as: the panel shows only its line and
   the Sign in button, in every state (signed out, lost session, first sync running or failed); the page
   header's title names the page. Alternative: keep the v0.9 per-page headings.
9. **Return and "You're signed in."** (SYNC-006, H-119): the return target is the page showing when Send link
   (or Send again) was pressed, app paths only, else `/`; the notice shows once after any sign-in the user
   started (email link or Google), never on a restore or reload. Reason: the user lands where they were
   (a `/decks?import=1` deep link keeps working, v0.14), app paths only so a tampered link cannot send them to
   another site, and one confirmation for every provider is simpler than a per-provider rule; a restore is not
   a new sign-in, so repeating the notice would be noise. Alternative: email link only.

**v0.13 (H-152), for RJ (the notice is a gate, SYNC-007 condition 2):**
12. **Privacy notice approval and blanks** ([[Privacy Notice Draft]]): approve the text (or send changes) and supply
    the blanks: the name to use (name or handle), the contact email (the dedicated support inbox), the effective
    date, the age line (13, or 16), how a material change is announced (default proposed: new date on the page, plus
    an in-app notice on next sign-in), and whether to keep the wording about the operator's console access and the
    legal basis. Also confirm the route `/privacy` and the "Privacy notice" link placement (SYNC-104; defaults
    specced, nothing blocks the builder item except that production waits for the approval).

**v0.14 (H-174), for RJ (defaults specced, nothing blocks H-176):**
13. **Username, theme and header proposals to confirm** (RJ already decided the length, characters, "not unique", the
    skippable prompt, the footer theme switch and `/import` → Home in H-178; what is left is spec-writer's):
    (a) **Where the username lives:** the account document `users/{uid}.username` (the board row; SYNC-156), not the
    Firebase Auth `displayName` the brief recommended; it needs a rules change (SYNC-112) and one more line in the
    privacy notice (SYNC-103 item 4, [[Privacy Notice Draft]], which RJ re-approves). Alternative: Auth `displayName`
    (no rules or notice change, but a name change shows on another device only after a token refresh or reload).
    (b) **Rules beyond RJ's words** (SYNC-153): spaces are collapsed and the ends trimmed; control characters,
    line/paragraph separators, bidi override characters and zero-width spaces are refused; a name cannot be
    cleared once set; the rules check the character set and 20 code points themselves (v0.16, SYNC-160; v0.15 had only `size()` 80, v0.14.1 2000 and 500 UTF-16 units, H-183). (c) **Save while the first sync runs** waits with
    "Getting your account ready…" instead of writing (SYNC-154). (d) **Menu grouping:** 3 dividers and Theme as three
    radio items inside the menu (SYNC-151); the look is the ui-engineer's call. (e) **New strings** (written in the
    brief's style): "Account Information" (menu item and dialog title), "Shown at the top right. Only you can see it.",
    "Deletes your account and everything saved in it, on every device. This can't be undone.", "Getting your account
    ready…", the footer "Theme" label, and the username dialogs' texts (SYNC-154, 155); and "Account Information"
    replaces the brief's "Account settings" in the username prompt line. (f) The theme key is `device-theme`.

**v0.15 (H-206), for RJ (defaults specced, nothing blocks H-207):**
14. **CLOSED in v0.16 for the allowed set (RJ, 2026-11-25, H-212, decision 21: "stick with my allowed characters. set up
    our own validation").** (a) confirmed as written below (the alternative of more punctuation is not taken). (b)
    counting: code points stays, not explicitly confirmed; RJ may still ask for a higher cap. (c) The rules cap is now
    an exact check, not 80 alone (SYNC-160, "Rules check 20 too"). (d) Existing names kept, as specified. The original
    question follows for the reasoning. **Username allowed set, spec-writer defaults to confirm** (RJ decided only "20 characters, no emojis"): (a) **Allowed:**
    letters and decimal digits of any script, their combining marks, spaces, and `.` `_` `-` `'` plus the phone
    apostrophe `’`; the first character a letter or digit; no other punctuation or symbols (so no `@`, `#`, `&`, `™`,
    `❤`, no currency or math signs). Alternative: also allow common punctuation (`! ? , & ( ) :`). (b) **Counting:**
    code points, so a combining mark counts, and a name in Devanagari or Thai (or a decomposed accent with no
    precomposed form) may use up to 2 or 3 of the 20 per visible letter. Alternative: count user-perceived characters
    (`Intl.Segmenter`) and cap the rules at a larger bound; rejected as default because browsers differ and the rules
    bound is no longer exact. (c) **Rules cap 80,** not the exact 40: production's unit for `size()` is unverified.
    (d) **Existing names** from v0.14 test accounts (emoji, up to 24 graphemes) are kept until their owner changes them.

**Other:** research: none open for SYNC-101 since v0.13 (H-069 done; unverified legal rows stay listed in [[Privacy Notice Requirements]]). Unverified technical points for the researcher:
the `existsAfter()` billing and limits (SYNC-113, H-070; less important since v0.8), and the **production** Auth
error that means `deleted` (SYNC-097; the emulator codes are verified). **v0.12 is not built yet: board H-172.**
Built (board `done`): the sign-in gate, built as "account-required mode" (H-081),
Cancel deletion and the account-menu Try again (H-127), first-sign-in writes (H-077), per-build `appVersion`
and the preview deploy path (H-078), the v0.10 UI items (H-140…H-145; H-104, H-106, H-110, H-115, H-122) and the
notice kinds (H-116). Nothing from v0.10 or v0.11 is left to build. Open for RJ, outside this spec's text: H-150
(the Import dialog covered "You're signed in." on the removed `/import?type=deck`; from v0.14 the same question applies
to the deck dialog opened by `/decks?import=1` after sign-in; built default: accept).

## Changelog
**0.16.0 (2026-11-25, H-212, RJ 2026-11-25 in chat "stick with my allowed characters. set up our own validation" and "Rules check 20 too"):** new SYNC-160 (the rules check the username: string, `size()` 1 to 80, RE2 pattern `^[\p{L}\p{Nd}][\p{L}\p{Mn}\p{Mc}\p{Nd} ._'’-]{0,19}$`, no variation selector, no trailing or doubled space, only when `username` changes, create still denies it; invariant with the client and its two stated differences, NFC and Unicode version skew; verification plan and a no-silent-loosening fallback); SYNC-112 (username part restated), SYNC-153 (allowed set RJ-confirmed; "Backstop, not a duplicate" paragraph replaced), SYNC-156 (a), data contract comment, AC 22 (full allowed and denied lists, legacy case, four proofs), AC 74 (shared verdict list), Impacts item 4, decisions 20 and 21, Open questions 13 (b) and 14 (closed). Behaviour change on the server, so a minor bump; builds H-213. **Status of the facts:** the allowed set and server enforcement are RJ's decision (confirmed); that the rules engine supports `\p{..}` and counts repetitions in code points is **`unverified`** until the SYNC-160 (g) tests and the production check are recorded. The client function, strings and counter do not change. Previous line: 0.15.0 below.
**0.15.0 (2026-11-25, H-206, RJ 2026-11-25 "limit usernames to 20 characters and not include emojis"):** SYNC-153 (NFC, 20 code points, allowed set `^[\p{L}\p{Nd}][\p{L}\p{Mn}\p{Mc}\p{Nd} ._'’-]*$` plus no variation selectors, no emoji, new error strings and counter `n / 20`), SYNC-154 counter, SYNC-156 (a), SYNC-112 (username `size()` 1 to 80, worked worst case 20 × U+1D400 = 40 UTF-16 units = 80 UTF-8 bytes, unchanged names not re-checked, character set not checked in rules), data contract comment, ACs 22, 71, 74, 76, Impacts item 4, decision 20, Open questions 13 (b) and 14. Behaviour change, so a minor bump; builds H-207. The `size()` unit keeps its status: UTF-16 units on the emulator (verified 2026-11-25, H-183), production `unverified`. Applied independently of the 0.14.2 privacy change (H-200); the next line is the 0.14.1 entry as it stood.
Current: 0.14.1 (2026-11-25, H-183: username length backstop fixed. SYNC-112 and SYNC-156: rules `size()` cap 200 -> 2000 (unit `unverified`; safe under UTF-16 units, code points and UTF-8 bytes); SYNC-153 (3): added a client cap of 500 UTF-16 units next to the 24 graphemes (a grapheme has no length bound); data contract comment, AC 22 and AC 74 worst-case emoji name (24 family emoji with skin tones: 264 code points, 456 UTF-16 units, 984 UTF-8 bytes), Impacts H-176 list, Open question 13 (b); user-facing limit unchanged at 24 graphemes; builds H-176). Previous: 0.14 (2026-11-25, H-174, RJ 2026-11-24 header decision and gate H-178, H-179 answers: new section N, SYNC-150…159 (header account control, account menu, Account Information dialog, username rules, one-time prompt, Change username and Save, username stored in `users/{uid}.username`, theme per device under `device-theme` outside the cache, theme controls in the menu and a footer switch, `/import` removed and goes to Home, `?add=1` / `?import=1`); SYNC-003 (new sign-in sentence, placement without Settings), SYNC-006 and SYNC-009 (no Import), SYNC-012, SYNC-091, SYNC-095, SYNC-100, SYNC-103 items 4 and 12, SYNC-104 d, SYNC-112 (optional `username`), SYNC-120, SYNC-141 d, SYNC-142; data contract (`AccountDoc.username`, `StoredSyncLog.username`, `RemoteStore.setUsername`, field mapping); ACs 21, 22, 38, 46, 52, 53, 54, 55, 57, 68, 70 reworded, ACs 71–80 new; decisions 18 (Open questions 10 and 11 closed) and 19; Open question 13; Impacts lists SPEC-003 0.12, SPEC-005 0.7, SPEC-006 0.9, SPEC-007 0.12 and the H-176 code changes; builds H-176). Previous: 0.13 (2026-11-25, H-152, [[Privacy Notice Requirements]]: SYNC-101 rewritten without `BLOCKED` (public `/privacy`, RJ approval gate recorded in [[Privacy Notice Draft]]), new SYNC-103 contents checklist and SYNC-104 route and links (sign-in dialog, account menu, footer; age line), ACs 65–70, decision 10 closed, open question 12 (blanks for RJ), research dependency added; no other requirement changed; builder item listed). Previous: 0.12 (2026-11-24, H-171, RJ decision 17, [[ADR-0007 Firebase Accounts and Firestore]] amendment 2: **account-only**. The `signInEnabled` flag and local-only mode are removed: SYNC-008 and SYNC-052 withdrawn, SYNC-007 is now the production release rule (no deploy of the account-only build to production until H-063, H-152 and the Firestore rules are done), SYNC-001, 002, 009, 031, 032, 048, 080, 086, 097, 101, 125 lose their mode branches. New section M, SYNC-140…146: browser cache (what: session, whole collection / tags / locks, every deck, sync log, device preferences, public catalog; when cleared: sign-out, account deletion, deleted-account sign-outs, a different account's first sign-in; never uploaded; cache first then fresh; scrolling makes no Firestore reads; the browser may drop it). ACs 31, 35, 45, 48 rewritten, 1, 3, 5, 36, 39, 46, 49 de-moded, ACs 59–64 new; decision 17, Open questions 10–11; Impacts lists SPEC-003…008 applied and the H-172 code changes; pins SPEC-003 0.11, SPEC-004 0.6, SPEC-005 0.6, SPEC-006 0.8, SPEC-007 0.11, SPEC-008 0.4.4; builds H-172). Previous: 0.11.2 (2026-11-25, H-160: Impacts for SPEC-003…SPEC-008 marked applied; no requirement changed). Previous: 0.11.1 (2026-11-25, dev-line merge: dependency pins from the nightly run (SPEC-003 0.10, SPEC-004 0.5, SPEC-005 0.5.1, SPEC-006 0.7, SPEC-007 0.10, SPEC-008 0.4.2); Impacts record what H-071 applied and what is left (H-160); no requirement changed). Previous: 0.11 (2026-11-24, H-146, documents the build; RJ 2026-11-24 "all those look good to me": Open questions 1–9 and the confirm title "Finish signing in" confirmed, decision 16; SYNC-006 "disabled" = `aria-disabled="true"` with focus kept for Send link / Send again / Use a different email, and the other-device confirm dialog strings; new SYNC-087 notice kinds (success 6 s polite, info and error stay until OK, only error assertive, missing kind = info, COLL-054 Undo outside it; sync status messages are status text, not notices); SYNC-063 clock warning is an `info` notice, as built; ACs 39, 50, 51, 52 reworded, AC 58 new; Impacts home-copy bullet per H-126; "pending build" markers now "built"; no builder item). Previous: 0.10 (2026-11-24, [[UI Review 2026-11-24]] rows H-103, H-105, H-107, H-109, H-111, H-112, H-117, H-118, H-119, H-121; RJ decision 15: signed-out panel text "Sign in or create an account to start keeping track of your collections and decks", no panel heading; single-provider sign-in form, send-failure string, sent state, return to the start page and "You're signed in." once, "Signed in as {email}", no Sync now during an unfinished deletion, delete dialog sign-in-first state, sign-out dialog "Syncing…" and explanation line; SYNC-003, 005, 006, 009, 084, 086, 090, 095, 096, 100; ACs 1, 26, 27, 38, 43, 46, 47 changed, ACs 49–57 new; build H-104, H-106, H-110, H-115, H-122, H-140…H-145). Earlier: 0.9 (2026-11-24, H-134, RJ decision 14: gated pages keep their page header above the sign-in panel; signed-out panel text "You need a free account to import cards or decks."; SYNC-009, AC 46; build H-135). Full history: [[Accounts and Sync changelog]] (archived). New entries go in the archive note.
