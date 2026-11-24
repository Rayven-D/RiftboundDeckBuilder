---
tags: [adr, hosting, data]
status: accepted
date: 2026-11-23
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
- **Planned layout (to be specced):** `users/{uid}/collection/...`, `users/{uid}/decks/...`,
  `users/{uid}/tags/...`; each user can read and write only their own documents.
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
