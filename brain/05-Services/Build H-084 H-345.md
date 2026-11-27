---
tags: [services, build]
board: H-084, H-345
specs: ["[[Accounts and Sync]] SYNC-084, SYNC-063, SYNC-096, SYNC-046", "[[Collection Import]]"]
branch: loop/H-084-H-345-decks-wrap
as_of: 2026-11-26
---
# Build H-084 H-345

No contract change. Tests: `web/src/app/shared/sync/sync-engine-h084.spec.ts`, plus one in `import-dialog.spec.ts`.

## H-084
1. `SyncService.start()` now has `.catch(() => engine.startFailed())`. `startFailed()` sets the Error status and sends one
   `error` notice, both with the existing SYNC-084 text "Couldn't sync. Your changes are saved on this device. Try again."
   (`MESSAGES.writeFailed`; no start-up-specific text exists, so this is the closest). The status shows it only when the
   sync log expects a session; a device with none stays signed out (notice only).
2. `scheduleChange()` swallows a failed `log.load()` (the save is already local; no push is armed).
3. `clockCheck`: the `return` was a bug. Only the first written document was forgotten, so the rest were checked on a
   later pull. Now every written document is checked and forgotten per pull, with at most one warning.
4. A failed deletion: the engine no longer sends its OK-only `deleteIncomplete` notice. The account menu's notice (with
   Try again) is the only one. The status line still shows the text. **Choice for the spec:** the engine tests that
   asserted that engine notice were changed to assert none (sync-engine.spec, sync-engine-cancel-deletion.spec,
   sync-engine-notice-kinds.spec).
5. `TrackedDeckStore.create` throws `ReadOnlyAreaError` for a read-only deck, like update and delete.

## H-345
The Owned Cards Import review button now uses `[disabled]="busy()" disabledInteractive` (as the H-451 deck Save does)
instead of `[attr.aria-disabled]`, so Material sets `aria-disabled` itself and the button stays focusable.
The row said `[aria-disabled]`; Material's own host binding would still override that, so this form was used.
The Import dialog's add/submit button (`copy.action`, line ~326) has the same pattern and was left alone (not in the row).
