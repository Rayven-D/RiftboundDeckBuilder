---
tags: [validation, loop]
board: H-207
as_of: 2026-11-25
---
# Validation H-207 (SPEC-010 v0.15.0 username build)

2026-11-25 · H-207 · **PASS** · run on uncommitted work on `loop/H-207-username-build` (JDK 21 on PATH for the rules run).

**Accept:** new ACs pass; full rules suite green; V-008 green.

## Checks run
| Check | Result |
|---|---|
| V-008 `npx ng test --watch=false`: 58 files, 807 / 807 | PASS |
| V-008 `npx ng lint`: all files pass | PASS |
| V-008 `npm run build`: bundle complete | PASS |
| `npm run test:rules` (JDK 21, emulators started and shut down by the script): 6 files, 50 / 50 | PASS |
| Traceability: `username.spec.ts`, `account-header.spec.ts`, `firestore.rules.test.ts`, `username.test.ts` name AC 22 / 71 / 74 / 76 and SYNC-112 / 153 / 155 / 156 in test titles. Covered: NFC, trim, collapse, 20 / 21 code points, marks count, allowed set, first character, variation selector, emoji / ZWJ / keycap / bidi / controls, length-before-charset order, `n / 20` counter (error colour + icon over 20), both error strings, 20 × U+1D400 allowed, 80 × `a` allowed, 81 × `a` denied, empty and numeric denied, unchanged 24-family-emoji legacy name does not block a `lastClientVersion` update, `😀` allowed by rules, create with `username` denied (existing test kept) | PASS |
| Rules diff safe: `exactKeys` unchanged (no new keys), `createdAt`, `validMeta`, `shortString`, owner checks untouched; username branch only relaxed for an identical stored value (`before.get('username', null) == d.username`, still `is string`); changed names need `size()` 1..80; create path (`validAccount`) unchanged, so `username` on create stays denied; no character-set check. No other field widened | PASS |
| No code writes Auth `displayName` or calls `updateProfile` (grep of `web/src`, non-spec files: no hits) | PASS |
| Builder choice (a): unchanged Save closes before the check. Matches SYNC-155 ("saving the unchanged value just closes") and SYNC-112 (unchanged names not re-checked); legacy names are re-checked only when edited | PASS (accepted) |
| Builder choice (b): `get('username', null) == d.username` with the string-type check kept | PASS (accepted; covered by the legacy test and numeric-denied test) |
| Builder choice (c): counter error colour + icon over 20 is required by SYNC-153 itself, not an extra | PASS |
| AC 74 wording: `e` + U+0301 composes to `é`, not `ë` (node: `'Zoé'.normalize('NFC') === 'Zoé'` true, `=== 'Zoë'` false; `ë` is `e` + U+0308). Builder tests both forms. Spec wording defect, not a build failure | NOTE (H-211) |

## Failures
none.

## Follow-ups
1. **H-211** (spec-writer, P3): AC 74 says `Zoë` typed as `e` + U+0301; U+0301 gives `é`. Use `Zoé` or U+0308. Fix the same pair in SYNC-153 (0) if it pairs `e` + U+0301 with `Zoë` anywhere.
2. Deploy of the Firestore rules is the orchestrator's step after this PASS (not run here).
