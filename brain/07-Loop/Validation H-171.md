---
tags: [validation, loop]
---
# Validation H-171

2026-11-24 · H-171 · **FAIL** (minor, docs only) · spec-writer changes to SPEC-003…010 (uncommitted on `loop/H-171-account-only-specs`), checked with `git diff --ignore-cr-at-eol` and grep.

## Checks run
- **Accept: no "local-only" / "browser only" storage left (grep SPEC-003…010 for local-only, signInEnabled, browser only/-only, in this browser).** Live requirement text is clean: every hit is a withdrawal note (SYNC-008, SYNC-052, COLL-074), a changelog or "Current:" line, a decision record, an AC that asserts absence (SYNC AC 31, 63), or "in this browser" meaning the session or linked uid (SYNC-092, Definitions). **Failures:** (a) SPEC-010 Impacts (lines ~1111-1160) keeps the v0.8 bullets "local-only mode: browser only; account-required mode ..." as live bullets under one "history" sentence; (b) [[Deck Import]] Out of scope line ~512 "Accounts, sync, cloud backup (ADR-0005 #1)" and [[Collection Import]] line ~685 "accounts and cloud sync (Product Vision Later)" contradict account-only (ADR-0005 decision 1 is superseded). Items filed as H-177.
- **Cache rules have IDs and ACs:** SYNC-140…146 present; ACs 59 (cache holds), 60 (clear events), 61 (never uploaded), 62 (scroll reads nothing), 63 (no local-only left), 64 (production rule) exist as Given/When/Then. PASS.
- **Cache vs SYNC-095 / SYNC-048 / SYNC-097 / ADR:** SYNC-142's four clear events match SYNC-091 (sign-out), SYNC-096 step 4 (deletion), SYNC-097 (deleted and half-deleted both clear), SYNC-048 step 1 (first sign-in clears). SYNC-143 matches SYNC-048/049/050 (nothing uploaded, at most 1 write). SYNC-095 text unchanged and consistent ("including the copy on this device"). PASS.
- **Whole-account cache vs ADR-0007 amendment 2:** the ADR says "at least recently viewed cards and decks", "how much is cached is SPEC-010's call", and that caching the whole one-document collection costs no extra reads. SYNC-141 caching the whole account (collection, tags, locks, every deck up to 200) is within "at least" and uses the ADR's own cost reasoning plus the SYNC-045/048 full read. Consistent. RJ asked in open question 11. PASS.
- **ADR-0006 "Header and import entry points" (H-174, newest):** not contradicted. SYNC-141 (d) keeps theme out of the cache (per device, not cleared at sign-out) as ADR-0006 says; `/import` and the Import button still appear in SYNC-009 / IMP-076 / DECK-097 and are explicitly left to H-174 and H-176 (H-172 item 5 says do not touch). Expected, not a failure.
- **IDs:** SYNC, COLL, OWN, CAT, IMP, DECK, SHARE requirement IDs: no duplicates inside or across specs; new SYNC-140…146, COLL-093, OWN-084, CAT-079 unique; withdrawn COLL-074, SYNC-008, SYNC-052 keep their rows as "Withdrawn" and no live requirement or AC depends on them. PASS.
- **Pins:** Spec Index versions equal file front matter (SPEC-003 0.11, 004 0.6, 005 0.6, 006 0.8, 007 0.11, 008 0.4.4, 010 0.12); every Depends-on line (SPEC-003, 005, 006, 007, 008, 010) and every `// SPEC-0xx v…` import comment in SPEC-005, 007, 008, 010 matches; each spec's "Current:" changelog line matches its version. Old pins left (Deck Import "SPEC-003 v0.3", "SPEC-004 v0.4") are in a "Resolved (H-039)" history bullet. PASS.
- **V-009 wikilinks (script over changed files plus `Build Matching.md`):** 1 unresolved: [[Accounts and Sync]] line 1266 `[[ADR-0007 Firebase Accounts` + line break + `and Firestore]]` (new in this change; the spec had none before). The Handoff Board hit is a code-span false positive. **FAIL (1)**, filed in H-177.
- **V-009 structure:** new rows are numbered; new ACs are Given/When/Then; changelogs added for all seven specs. PASS. H-171 status unchanged (`doing`).
- Not run (no code changed): V-008, V-010 (no metagame stats in the new text), V-012.

## Notes for RJ / spec-writer (not filed)
- SYNC-140 says "nothing the user owns exists only in the browser", while SYNC-141 (d) keeps saved Collection views per device only. Open question 11 asks RJ about it; fine if RJ confirms.
- H-152's request says "close open question 10"; SPEC-010 open question 10 is now "Holding production back" (v0.12). The spec-writer on H-152 should check which question it means.

## Follow-up items
- H-177 (P1, spec-writer): fix the broken wikilink, the two stale Out of scope lines, and the Impacts history bullets.

## Attempt 2 (H-177 fixes, uncommitted on top of WIP 4db70b1) · PASS
2026-11-24 · H-171 / H-177 · **PASS** · checked with `git diff --ignore-cr-at-eol` and grep.
- **Broken wikilink:** decision 17 now has the link on one line. V-009 script over all changed files plus `Build Matching.md`: 0 unresolved links.
- **Stale Out of scope lines:** [[Deck Import]] now says sharing and storage outside the user's own account are out of scope and that accounts, sync and the browser cache are in scope (SPEC-010; ADR-0005 #1 superseded). [[Collection Import]] says accounts and cloud sync are not "later" and are specified by SPEC-010. The other specs' Out of scope sections have no account or sync exclusion.
- **SPEC-010 Impacts:** now v0.12 only (applied list plus "Code changes H-172 must make", items 1-7); the v0.8 per-mode bullets moved to "Impacts history" in the archived changelog note.
- **H-152 / open question 10:** a note under Open questions says H-152 means RJ decision 10 (privacy notice), not open question 10 (holding production back).
- **Leftover-wording grep (SPEC-003…010):** remaining hits are only withdrawal notes, changelog and "Current:" lines, decision 17, ACs that assert absence (31, 45, 63), the H-172 code list ("delete the tests that assert local-only behaviour"), and "in this browser" meaning the session. No live requirement describes local-only or browser-only storage.
- Versions unchanged (SPEC-010 0.12; other pins as in attempt 1); no ID changes, so pins and ID uniqueness from attempt 1 still hold.
