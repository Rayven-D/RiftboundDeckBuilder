---
tags: [validation, loop]
board: H-183
as_of: 2026-11-25
---
# Validation H-183 (SPEC-010 v0.14.1, username length backstop)

2026-11-25 · H-183 · **PASS** · docs only; run on uncommitted work on `loop/H-183-username-limit`.

**Accept:** client and rules limits consistent, with an AC covering the worst-case emoji name; V-009 clean.

## Checks run
| Check | Result |
|---|---|
| Worked example arithmetic (node): 👨🏽‍👩🏽‍👧🏽‍👦🏽 = 4 people + 4 skin-tone modifiers + 3 ZWJ = **11 code points**, **19 UTF-16 units**, **41 UTF-8 bytes**; `Intl.Segmenter` counts it as **1 grapheme**. x 24 = **264 / 456 / 984**. | PASS (matches spec) |
| 500 UTF-16 units under every unit: UTF-16 units 500 ≤ 2000; code points ≤ 500 (a code point is at least 1 unit); UTF-8 bytes ≤ 1500 (BMP: 1 unit up to 3 bytes; astral: 2 units = 4 bytes, so at most 3 bytes per unit). All ≤ 2000. Worst real name (456 units, 984 bytes) also fits. | PASS |
| Grep for stale 200: SYNC-112, SYNC-156, data-contract comment, AC 22, H-176 Impacts list, Open question 13 (b) all say `size()` 1 to 2000 / 2001 denied. Remaining "200" hits are tags/decks limits (COLL-022, DECK-092) and unrelated. | PASS |
| Client side consistent: SYNC-153 (3) 24 graphemes AND 500 UTF-16 units; SYNC-112, SYNC-156, data contract, AC 74 and the Impacts list cite both. | PASS |
| AC 22 Given/When/Then: 2001 characters, empty, numeric, create-with-username denied; 24 x family-emoji name allowed on update; run by `npm run test:rules`. Testable. | PASS |
| AC 74 Given/When/Then: 24 family emoji (456 units) accepted and write allowed; 25 family emoji (25 graphemes) and 24 letters + 30 combining accents each (744 units) refused with "Use 24 characters or fewer." Testable and covers both caps. | PASS |
| Version / pins: Spec header 0.14.1, Spec Index SPEC-010 row 0.14.1, archived changelog entry 0.14.1, `board:` lists H-183. Other specs pin "SPEC-010 0.14", still true (minimum). | PASS |
| V-009: wikilinks in the 3 changed notes (31 / 31 / 14 distinct), 0 unresolved. New requirement text keeps IDs; no new unsourced game facts. | PASS |

## Follow-ups (non-blocking, no board items filed)
1. **Version number (note, not a fail):** the 500-unit client cap is a new validation that rejects input SYNC-153 0.14 accepted (nothing was built yet, H-176 is todo), so a patch bump is defensible. A 0.15 would be the stricter reading since a requirement's meaning changed; the spec-writer may keep 0.14.1 as long as H-176 builds from 0.14.1. RJ call if he cares.
2. **Error text (taste):** a name of 24 graphemes but over 500 units shows "Use 24 characters or fewer.", which is slightly misleading. Practically unreachable by real names (worst real case 456). Fine to leave, or ui-engineer may offer a different string.
3. **Unit still `unverified`:** which unit `string.size()` counts in Firestore rules is unverified. Safe by design; the rules test for the 24-family-emoji name in H-176 will confirm it against the emulator, and the result should be written into the spec then (builder or researcher).
4. The spec header "Current:" line keeps long history inline (already raised in [[Validation H-174]] and the board's H-184); not repeated here.
