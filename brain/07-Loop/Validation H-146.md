---
tags: [loop, validation]
item: H-146
date: 2026-11-24
round: 2
result: PASS
---
# Validation H-146: SPEC-010 Accounts and Sync v0.10 → v0.11 (wording catch-up after the build)

Item: [[Handoff Board]] H-146 (spec-writer). Spec: [[Accounts and Sync]] v0.11. Sources: [[Validation H-140 H-125 H-108]],
[[Validation H-113 H-116 H-123 H-126]], [[Validation H-145]].
Scope: uncommitted brain-only tree on `loop/H-146-spec010-wording` (base `5362d6d`): `brain/02-Specs/Accounts and Sync.md`,
`brain/02-Specs/Spec Index.md`, `brain/05-Handoffs/Handoff Board.md`, `brain/06-Sessions/Session Log.md`,
`brain/Archive/Spec-Changelogs/Accounts and Sync changelog.md`, `brain/Current State.md`. No file under `web/` changed.

## Result
2026-11-24 · H-146 · FAIL · 5 Accept parts, text vs build (`sync-dialogs.ts`, `sync.service.ts`, `notice.ts`, `sync-engine.ts`, `account-menu.ts`, `home-page.ts`, `import-page.ts`), marker search, V-009 (6 changed notes), H-083 closure, `npm test` · failures:
- F1 (Accept 3, text vs build): SYNC-087 classes six messages as notices (`info`: "Sync paused…"; `error`: failed / rejected / too-large write, unreadable and invalid data), but the build shows them only as account-menu status text (SYNC-083, SYNC-084, SYNC-033, SYNC-047, SYNC-118). No `notify` call sends them.

## Per-part verdicts
| Part | Accept | Verdict | Evidence |
|---|---|---|---|
| (1) | SYNC-006 and AC 50/51 say what "disabled" means | PASS | SYNC-006 "What 'disabled' means here": `aria-disabled="true"`, focus kept, press does nothing, not `button.disabled`. Build: `sync-dialogs.ts` Send link `[disabled]="!canSend()" disabledInteractive`, Send again and Use a different email `[disabled]="sending()" disabledInteractive`; `canSend = online && email includes '@' && !sending` matches "no '@' and offline". `send()` / `sendAgain()` guard (lines 263, 290). AC 50 and AC 51 reworded to match. |
| (2) | Confirm dialog title, field label, buttons exactly | PASS | SYNC-006 and AC 39: "Finish signing in", "Confirm your email address to finish signing in.", "Email address", Cancel then Finish sign-in (filled), Finish disabled until the trimmed value has '@', Enter submits, Cancel / Escape / backdrop = no address. Build: `ConfirmEmailDialog` template (lines 348–362), `canFinish`, trimmed `onEmail`, `finish()` guard, `autoFocus: 'first-tabbable'` in `sync.service.ts` (focus in the field). Finish sign-in uses the native `disabled` and the spec does not claim `aria-disabled` for it, so this is consistent. |
| (3) | SPEC-010 records the three notice kinds | **FAIL** (F1) | Durations, politeness, missing kind = `info`, the assertive Try again (`account-menu.ts` line 188, `politeness: 'assertive'`, no duration) and COLL-054 scope match `notice.ts` and the engine. Message lists: `success` (deletedOwn, deleteNotDone, signedIn), `info` (sessionLost, reauthNeeded, accountDeleted, halfDeleted, lock notices, clock warning) and the `error` items signInFailed and offline all match the engine. The six items in F1 do not. AC 58 is correct (it uses only real notices). |
| (4) | Impacts home-copy bullet matches H-126 | PASS | Bullet now reads "Free" / "Free account" by `signInEnabled`, RJ 2026-11-24, H-126 (closes H-082). Build: `home-page.ts` line 48, `inject(SIGN_IN_ENABLED) ? 'Free account' : 'Free'`. |
| (5) | AC 52 says when the URL is `/import?type=deck` and that `?type=` may go afterwards | PASS | AC 52: "when the sign-in completes (the moment "You're signed in." shows) the page URL is exactly `/import?type=deck`" … "After that the Import page may drop `?type=deck`". Build: `import-page.ts` constructor effect navigates with `queryParams: { type: null }`, `replaceUrl: true` once the gate opens and the dialog opens. |
| Version bump | | PASS | 0.11 in the spec front matter, "Current:" line, Spec Index, Current State, and the changelog. |

## Failures
**F1, SYNC-087 lists status-line messages as notices.** Check: H-146 Accept (3) and "the new text matches the code as
built". Input: SYNC-087 (spec line 274): "**`info`** … "Sync paused…" (SYNC-083) …" and "**`error`** … a failed, rejected
or too-large write (SYNC-084, SYNC-118), unreadable or invalid account data (SYNC-033, SYNC-047)". Expected: these items
are notices with the stated kind, as SYNC-087 says ("Every notice this spec shows … has exactly one of three kinds"). Actual:
in the build they are never notices. `sync-engine.ts` passes `MESSAGES.writeFailed`, `tooLarge`, `unreadable` and
`invalid` only to `setProblem()` (lines 595, 677, 680, 740, 825, 851, 868), which sets the status and calls no `notify`.
"Sync paused" is a status kind (`status-text.ts` line 18). SYNC-083, SYNC-084, SYNC-033, SYNC-047 and SYNC-118 themselves
say "the status shows / reads". The list was copied from [[Brief H-113 H-116 H-123 H-126]]'s table (lines 91–92), which
names these `MESSAGES` keys, rather than from the engine. A tester following SYNC-087 would expect an assertive snack bar
on a failed write, and the build does not show one.
Fix (spec text only, no behaviour change): remove "Sync paused…" (SYNC-083) from the `info` list and the
write / rejected / too-large / unreadable / invalid items from the `error` list. Add one sentence, for example: "Sync
status messages (SYNC-033, SYNC-047, SYNC-083, SYNC-084, SYNC-118) are account-menu status text, not notices, and have no
kind." Mirror the change in the changelog 0.11 entry if it lists them (it does not today). If RJ wants those to become
notices, that is a behaviour change and needs a builder item.

Same row, optional while editing: SYNC-063 says "the account menu shows" the clock warning, but the build sends it as an
`info` notice (`sync-engine.ts` line 898). SYNC-087 hedges with "when it shows as a notice". Either say in SYNC-063 that it
is an `info` notice, as built, or leave it alone. This is not part of the H-146 Accept and is not counted as a failure.

## Other checks
- **"RJ to confirm" / "pending build" / "Not built yet" / "Still to build" / "Unconfirmed":** none left in the spec. The
  remaining "unconfirmed" hits are the `'unconfirmed'` write state (SYNC-080, SYNC-096, data contract, ACs 41 and 43). No
  "RJ to confirm" on the board apart from quoted text in the H-146 row itself.
- **Decision 16 / Open questions:** decision 16 records RJ's 2026-11-24 "all those look good to me" for Open questions 1–9
  and the "Finish signing in" title. Each Open question is marked confirmed. Inline references read "Confirmed by RJ
  2026-11-24" (SYNC-003 OQ4, SYNC-006 OQ3 and OQ9, SYNC-009 OQ7 and OQ8, SYNC-081 OQ2, SYNC-095 OQ6, SYNC-096 OQ1 and OQ5).
- **H-083 → done:** fits. Its Accept is "Answers recorded in SPEC-010". OQ1 is recorded in SYNC-096 and Open questions, OQ2
  in SYNC-081 and Open questions, both in decision 16. H-133 (depends H-081, H-083) is now unblocked, which is correct.
  H-083 stays in the Open table with status `done`, like H-100, H-097 and others, so this follows board practice.
  Minor and not a failure: the Current State "Next (2026-11-24)" paragraph (line 64) still names H-083 among RJ items.
  The "Waiting on RJ" lines were removed.
- **V-009** (wikilinks resolve, tables have consistent column counts; script over the 6 changed notes): every new link
  resolves ([[API Contracts]], [[Brief H-104 H-106 H-124]], [[Brief H-140 H-125 H-108]], [[Brief H-113 H-116 H-123 H-126]],
  [[Validation H-113 H-116 H-123 H-126]], [[UI Review 2026-11-24]], [[My Collection]], [[Validation H-145]]). There are 3
  flags, all in unchanged lines that predate H-146: `[[Agents/README]]` in the Session Log (a path link, and
  `brain/Agents/README.md` exists); a quoted broken-link example in backticks on the board; and the H-079 Done row (column
  count). The new SYNC-087 row and the changed SYNC rows keep the table's column count. Specs keep numbered requirements and
  Given/When/Then (AC 58 is new).
- **`npm test` (web/):** 51 files, 705 tests passed. `git status -- web` is clean, so there is no code change.

## Next
- spec-writer: fix F1 in SYNC-087 (text only). The board was left as is. H-146 stays `verify` until the orchestrator sends
  it back. Then re-run Accept (3) and V-009.

## Round 2 (2026-11-24)
2026-11-24 · H-146 · PASS · Accept (3) re-run against `sync-engine.ts`, `account-menu.ts`, `notice.ts`; V-009 (7 notes) · failures: none

- **F1 fixed.** SYNC-087 (spec line 274) now lists only real notices, and each one matches a `deps.notify` call in
  `web/src/app/shared/sync/sync-engine.ts` (19 calls, unchanged):
  - `success`: deletedOwn (374), deleteNotDone (329 cancelled re-authentication, 413 Cancel deletion), signedIn (231).
  - `info`: sessionLost (758), reauthNeeded (328), accountDeleted (698, 732), halfDeleted (717), SYNC-072 merge notices
    (869), SYNC-074 shortfalls (874), clock warning (898).
  - `error`: offline (214, 300, 319), signInFailed (224), deleteIncomplete (355, 365, 377). The Try again notice is
    assertive with no duration (`account-menu.ts` line 188).

  The new **Not notices** sentence covers SYNC-033, SYNC-047, SYNC-083, SYNC-084 and SYNC-118. This matches the build:
  those messages go only through `setProblem()` or the `paused` status kind. AC 58 is unchanged and still uses only real
  notices.
- **SYNC-063** now says the clock warning is an `info` notice, as built (`sync-engine.ts` line 898). The 0.11 changelog
  entry records both edits.
- **Current State:** H-083 is no longer in the line 64 RJ items (now H-138, `sync-test`, H-085).
- **V-009:** the new link `[[Validation H-146]]` (SYNC-063, changelog) resolves. Column count is consistent in the
  SYNC-063 and SYNC-087 rows. Only the 3 old flags from round 1 remain, plus this note's own mention of
  `Agents/README` inside backticks.
- `git status -- web` is clean: still no code change, so the round 1 `npm test` result (705 passed) stands.

Result: **PASS**. H-146 moved to Done.
