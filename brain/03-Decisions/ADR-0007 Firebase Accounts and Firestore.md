---
tags: [adr, hosting, data]
status: accepted
date: 2026-11-23
amendment: "2026-11-24 account required to import: accepted by RJ 2026-11-24 (H-080); 2026-11-24 account-only, local-only mode dropped: accepted by RJ 2026-11-24 (H-171)"
---
# ADR-0007: Firebase for Accounts and Saved Data (Firestore)

## Context
RJ wants users to be able to sign in so their collection and saved decks persist across devices
(RJ, 2026-11-23). Until now the product has had no accounts: everything lives in browser storage
([[ADR-0006 Two Imports - Collection and Decks]], [[Current State]] constraints). The site is
already on Firebase Hosting (project `riftbound-deckbuilder`). User data is text only (card keys,
counts, tags, deck lists); card images stay as URLs to Riot's CDN, so no file storage is needed.
[[ADR-0004 Hosting (Deferred)]] asked for Firebase vs. AWS.

## Options
1. **Firebase Auth + Cloud Firestore**, called straight from the browser, with security rules for
   per-user access. No server; fits the free Spark plan at our size.
2. **AWS Cognito + DynamoDB** behind AppSync or Lambda: more pieces, a second account and bill,
   same cost at our size.
3. **Keep browser storage only**: no accounts, no sync.

## Decision
Option 1 (RJ, 2026-11-23): stay on Firebase.
- **Database:** Cloud Firestore, **Standard edition**, `(default)` database in **`us-south1`
  (Dallas)**, Native mode. Created 2026-11-23 with `firebase deploy --only firestore`; config in
  `firebase.json` (`firestore` block), `firestore.rules`, `firestore.indexes.json`.
- **Rules today:** deny all. Nothing reads or writes Firestore yet. Owner-only rules with field
  validation are written from the sync spec, not before.
- **Planned layout:** specified in [[Accounts and Sync]] (SPEC-010, SYNC-010…019) and sized in
  [[Firestore Data Shape]]; see "Data shape" below. Each user can read and write only their own documents.
  (The first sketch, `users/{uid}/collection/...`, `decks/...`, `tags/...`, is superseded.)
- **Accounts stay optional:** browser storage remains the default; signing in syncs it to the
  account.

## Data shape (proposed 2026-11-23, input to H-061)
Detail and sizing are in [[Firestore Data Shape]]. In short:
- `users/{uid}` (account doc), `users/{uid}/state/collection` (the whole collection in one document, a per-card map),
  `users/{uid}/state/tags`, `users/{uid}/state/locks`, and `users/{uid}/decks/{deckId}` (one document per deck).
  This replaces the `collection/…` / `tags/…` sketch above.
- Every document has `schemaVersion`, `updatedAt` (client clock, used by "latest change wins") and `syncedAt`
  (server time, so reopening only fetches what changed). Cards, tags and decks carry their own timestamps and
  30-day tombstones.
- Indexing is off for everything except `syncedAt`.
- Size: ≈ 95 KB for a realistic user and ≈ 640 KB for a heavy one. The Spark free tier supports about 1,300 daily active
  signed-in users and about 7,000 stored accounts at a 90/10 mix.

## Consequences
- Supersedes the "no accounts" constraint for signed-in users; anonymous use stays as it is.
- The `firebase` client package is added to `web/` when sync is built (lazy-loaded on sign-in),
  behind the storage interface so code stays host-neutral (ADR-0001, V-011).
- Needs: Firebase Auth sign-in providers enabled in the console (RJ), a privacy policy and a
  "delete my account and data" option, and a mention in the Riot application (H-011).
- The point-in-time recovery and delete protection of the database are off (defaults); turn on
  delete protection before real users arrive.
- Card data hosting (static snapshot built in CI vs. an API function) is still open in ADR-0004.

## Amendment 2026-11-24: account required to import
**Status: accepted** (RJ, 2026-11-24, in chat; board H-080). The text above stays as the record of the
2026-11-23 decision. Where they differ, this amendment wins.

**RJ's decision** (2026-11-24, in chat): "You NEED an account to import your cards and import decks. You do NOT
need an account to view the tournaments rankings". His answers to the follow-up questions:
- (a) Sign-out clears this device's collection, tags, decks and locks. They come back from the account on the
  next sign-in. There is no "Keep a copy", so there is never signed-out data and no Combine dialog.
- (b) Signed out, a visitor sees Home and Tournaments only. Decks, Collection, Import and Tournaments' "Add to
  your decks" show a sign-in prompt instead. **The "Add to your decks shows a sign-in prompt" part is replaced**
  by RJ's follow-up of 2026-11-24: "a signed out visitor shouldn't see 'Add to your decks' in the tournaments".
  Signed out, Tournaments shows no Add to your decks control (SPEC-010 SYNC-009, decision 13 h).
- (c) Production keeps today's no-account imports (browser storage) until sign-in is turned on in production,
  after RJ approves the privacy notice (H-069). The switch happens with the build flag `signInEnabled: true`.
- (d) Cards and decks saved in a browser without an account are ignored and cleared on first sign-in. They are
  not imported into the account.

**What changes.** The decision bullet "Accounts stay optional: browser storage remains the default; signing in
syncs it to the account" is replaced, in two modes chosen by the build flag:
- `signInEnabled: false` (**local-only mode**, production today): no accounts. Everything is stored in the
  browser, exactly as before this ADR.
- `signInEnabled: true` (**account-required mode**): importing cards or decks needs an account. The browser
  stores are a cache of the account: they still work offline, but they hold only the signed-in account's data.
  Home and Tournaments are public and need no account.

**Consequences**
- The Consequences line "anonymous use stays as it is" now holds only in local-only mode. In account-required
  mode an anonymous visitor can read Home and Tournaments and nothing else.
- [[ADR-0005 MVP Product Defaults]] #1 (MVP storage is browser only) holds only in local-only mode.
- Sign-out and account deletion clear the device. The first sign-in on a device clears it too, then downloads
  the account. No browser data is ever uploaded into an account at sign-in, so the first-sign-in flow writes at
  most one document (the account document). Combine, "Keep a copy" and the resume of an interrupted upload go
  away ([[Accounts and Sync]] v0.8).
- Data saved in a browser without an account is cleared at the first sign-in, with no warning. RJ (2026-11-24):
  "this wont be an issue as no one has done that and no releases has been made".
- Signed out (and while a session is lost), Tournaments shows no "Add to your decks" controls (RJ 2026-11-24).
- Turning on `signInEnabled` in production is now a product switch, not only a feature flag: it changes who can
  import. It still waits for RJ's approval of the privacy notice (SPEC-010 SYNC-007, SYNC-101).
- Fewer cloud writes: the first sign-in never uploads, so the Firestore cost of a first sign-in drops to the
  reads of the download plus at most one write.
- Specs to update: [[Accounts and Sync]] (v0.8), and the storage lines of [[Collection Import]],
  [[Deck Import]], [[My Collection]], [[Shared Cards and Lock-in]], [[Tournament Deck Catalog]] ("Add to your
  decks"). The list is in SPEC-010 "Impacts on other specs".

## Amendment 2026-11-24 (2): account-only, local-only mode dropped
**Status: accepted** (RJ, 2026-11-24, in chat; board H-171). Where it differs from the text above, including the
first amendment, this amendment wins.

**RJ's decision** (2026-11-24, in chat): "let's drop the local-only mode... all data will live and be from the account that's signed in. if someone deletes their account, their information will be deleted as well. However, we can keep cached data in the browser to speed up load times like we can cache their authentication and a few cards/decks. As users scroll through their decks /cards it should feel smooth. No physical pagination, more like an infinite scroll."
Earlier in the same conversation RJ agreed that "collections and decks should be saved under the user".

**What changes**
- **One mode.** The `signInEnabled: false` **local-only mode is removed**. Every user's collection, tags, locks
  and decks live in their account in Firestore (`(default)`, the layout in [[Firestore Data Shape]]). There is
  no browser-only storage of user data and no no-account import. Home and Tournaments stay public.
- **The browser is a cache only**, there to make loading fast: the signed-in session, plus account data the app
  has already downloaded (at least recently viewed cards and decks). Sign-out, account deletion and a different
  account signing in clear it. How much is cached is SPEC-010's call (H-171); note that the collection is one
  Firestore document, so caching all of it costs no more reads than caching part of it.
- **Deleting the account deletes all of its data** (already SPEC-010 SYNC-095) and clears the device.
- **Lists scroll smoothly with no pagination:** card and deck lists load as the user scrolls (infinite /
  virtual scroll), with no page numbers or "next page" buttons. The Collection page already uses virtual
  scrolling; Decks and Tournaments lists follow the same rule.

**Consequences**
- The first amendment's two-mode text, its (c) "production keeps today's no-account imports until sign-in is
  turned on", and the "local-only mode" lines in SPEC-003…010 are superseded. [[ADR-0005 MVP Product Defaults]]
  decision 1 (browser-only storage) is superseded.
- COLL-074 "Delete all local collection data" (built in H-154) goes away with local-only mode; deleting data is
  "Delete account and data" (SYNC-095). H-162 and H-170 are withdrawn.
- **Production:** production runs `signInEnabled: false` today. A build without local-only mode makes import
  require sign-in, so it must not be deployed to production until sign-in is ready there: Firebase Auth providers
  (H-063), the privacy notice (H-152, SYNC-101) and Firestore rules deployed. Until then production stays on its
  current build.
- Specs: [[Accounts and Sync]] (SPEC-010) and the storage / gate lines of [[Collection Import]], [[Tournament Deck Catalog]],
  [[Your Decks Ownership View]], [[Deck Import]], [[My Collection]], [[Shared Cards and Lock-in]] (H-171).
  Code: H-172. Scrolling design for the Decks and Tournaments lists: H-173.
