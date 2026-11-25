---
tags: [validation, loop]
board: H-213
as_of: 2026-11-25
---
# Validation H-213 (Firestore rules check the username, SYNC-160)

2026-11-25 · H-213 · **PASS** · run on uncommitted work on `loop/H-213-username-rules-build`.

**Accept:** new ACs pass; full rules suite green; V-008 green.

## Checks run (all executed here)
| Check | Result |
|---|---|
| `npm run test:rules` (JDK 21): 6 files, 85/85 | PASS |
| `npx ng test --watch=false`: 61 files, 878/878 | PASS |
| `npx ng lint`: all files pass | PASS |
| `npm run build`: OK | PASS |
| AC 22 allowed and denied lists: every case is a named test in `firestore.rules.test.ts` fed from `username-cases.ts` (includes NFD `Zoe`+U+0301, checked in bytes) plus create-denies-username, empty, numeric | PASS |
| SYNC-160 (g) four proofs, each a named test, all pass in the emulator: 20 vs 21 × U+1D400; `नमस्ते`; `O’Neil` (literal U+2019); `a`+U+FE0F denied (with control `a` allowed) | PASS (emulator) |
| SYNC-160 (f) / AC 74 shared list: client `checkUsername` vs rules, filtered by `normalizeUsername(n) === n`, at least 20 cases, 0 mismatches | PASS |
| SYNC-160 (a) legacy: 24 × family emoji unchanged passes a `lastClientVersion` update; a different `😀` or 81 × a is denied; `Zoé` allowed | PASS |
| Rules diff: only `validUsername` added and the username line of `validAccountUpdate` changed; `exactKeys`, create path, other fields and other collections untouched; nothing loosened (the 80 bound, string test, VS, trailing and double space all kept, in SYNC-160 (b) order) | PASS |
| Deviation (double-quoted pattern): SYNC-160 (c) says "the builder may use double quotes instead"; `\p` / `'` / `’` / `-` / `{0,19}` / anchors are character-for-character the SYNC-160 (b) pattern, only the quoting differs | ACCEPTED, semantically identical |
| H-183 probe moved to `lastClientVersion` (15 vs 25 × U+1F600, still UTF-16 units): reasonable, since no allowed name can exceed 80; not yet in the spec | ACCEPTED (follow-up H-214) |
| `username-cases.ts`: imported only by `username.spec.ts` and the rules test; `grep` of `web/dist` finds nothing; `tsconfig.app` build does not bundle it | PASS, harmless |
| API Contracts v1.19 (SYNC-112 paragraph, verified list, shared test data) and Session Log entry present | PASS |
| SYNC-160 (g) production check | NOT YET (expected: needs RJ merge and deploy); spec's production statement stays `unverified` (H-214) |

## Follow-ups
- H-214 (spec-writer, P1): SYNC-160 (c) shows the single-quoted form that does not compile; put the double-quoted pattern in, note the H-183 probe now runs on `lastClientVersion`, and record the production check result once done.
