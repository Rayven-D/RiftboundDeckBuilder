---
tags: [validation, loop]
board: H-084, H-345
as_of: 2026-11-26
---
# Validation H-084 H-345

2026-11-26 · H-084 + H-345 · **PASS** · lint, build, unit (98 files / 1558 tests, Node 22.23.5), spec check of SYNC-084 / 087 / 096 / 063, code read of the five H-084 points · filed H-677 (P3 builder), H-678 (P3 spec-writer)

## H-084
1. `start()` `.catch(() => engine.startFailed())` (sync.service.ts:167): Error status only when the log expects a session, plus one `error` notice with `MESSAGES.writeFailed`. Consistent with SYNC-084 (status text) but SPEC-010 has no start-up requirement or AC, and SYNC-087's `error` list is closed. Accepted as a robustness fix (the unhandled rejection is gone, the wording is the nearest spec text); gap filed as **H-678**.
2. `scheduleChange()` swallows a failed `log.load()`: tested in sync-engine-h084.spec.
3. `clockCheck` checks and forgets every document, at most one warning (SYNC-063 says "a document this device wrote"; no text change needed).
4. Engine no longer sends its own deletion notice. **Agrees with the spec:** SYNC-087 names one notice ("the SYNC-096 'Some data couldn't be deleted. Try again.' notice with **Try again**", an `error` kind) and SYNC-096 says the failure notice has a retry; only the account menu has the action (`account-menu.ts:541`). SYNC-084 keeps the status-line text, still produced by the engine. Three tests changed to assert no engine notice: justified.
5. `TrackedDeckStore.create` throws `ReadOnlyAreaError` for a read-only deck, like update and delete: tested.

## H-345
Review button `[disabled]="busy()" disabledInteractive`: test checks `aria-disabled` not true before, `"true"` while committing, `disabled` false (focusable), second click commits once. Same bug exists on the Import dialog's `copy.action` button (`import-dialog.ts:327`, `[attr.aria-disabled]`): filed **H-677** (P3).

## Stale rows
- **H-098 done:** built e52af12, merged to `main` (cb6111f, 930bf2d), on `dev`; `rg -i "assumed owned|isRune|RUNE-0|SPEC-009" web/src` empty, `runes.ts` gone, SPEC-009 withdrawn, OWN-028 holds the rule.
- **H-086 done (superseded in scope):** same merge; SPEC-007 0.13 (H-091) replaced the page contract, remaining work is H-188.
- **H-186 still needed:** My Collection 0.15 AC 33 still says Kennen Tempo "holds 1 copy"; follow-ups 2-5 of [[Validation H-091]] unfixed; SPEC-008 0.8 name locks did not touch it. Note added to the row.
