---
tags: [loop, validation]
board: H-154
---
# Validation H-154 (COLL-074 Delete all local collection data, local-only mode)

Scope: uncommitted working tree on `loop/H-154-coll074-local-delete` (web/ storage + Collection page + new `delete-collection-data-dialog.ts`). Spec: [[My Collection]] COLL-074, [[Accounts and Sync]] SYNC-052, SYNC-009, AC 31. Checks: [[Validation Checks]].

2026-11-24 · H-154 · PASS · checks run: V-008 web (`npm run lint` all files pass; `npm run build` ok; `npm test -- --watch=false` 51 files / 710 tests pass), Accept tests read and traced (below), V-010 (no meta stats in changed code), V-012 (`git grep RGAPI-` matches only spec/validation text, none in code or `web/public/import/riot.txt`; `.env` ignored), V-009 (wikilinks in this note resolve) · failures: none; one spec-gap follow-up H-162.

## Accept trace
- Local-only offers the action: `collection-page.spec.ts` "COLL-074 SPEC-010 AC 31: the More menu offers it..." and `gated-pages.spec.ts` "COLL-074 / SYNC-052 / AC 31 ...": More menu item "Delete all local collection data", confirmation text has no "account" or "sign" and no "Your account keeps its copy".
- Effects: `clearCollectionData` removes exactly `rift.collection`, `rift.collection.previous`, tags, printing codes, view state (`local-stores.spec.ts` "COLL-074 clearCollectionData..." checks decks, locks, sync log and a foreign key survive). Runs on the store queue after any in-flight save; the page awaits its save chain first and does not write view state back.
- No Firebase request: `adapterLoads` is 0 after confirm (gate spec); `offerDelete` is `SignInGate.offerDeleteLocalData = !enabled`, no `SyncService` call.
- Account-required mode (AC 31): `gated-pages.spec.ts` "SYNC-052 / AC 31 / COLL-074 Collection offers no Delete all local data in account-required mode, signed in": no item, no More button on desktop; `confirmDeleteData()` also guards on `offerDelete`. `deleteLocalData()` is not wired (grep finds no caller).
- Cancel deletes nothing and has initial focus.

## Judgement on invented placement and copy
COLL-074 says only "a settings action", so the header More menu (the app has no settings route) and the dialog copy are acceptable and nothing fails. They are unrecorded in the spec, so [[Handoff Board]] H-162 (spec-writer, P2) asks for the placement, copy and scope to be recorded or confirmed. Scope detail to confirm: the build also deletes the import Undo snapshot (sensible, since Undo would otherwise restore the data) and keeps decks and locks. The `web/public/import/` untracked folder is not part of this diff (`riot.txt`, no secret) and should not be committed with H-154.
