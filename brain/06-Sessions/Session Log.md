---
tags: [sessions]
---
# Session Log

Newest first. One short entry per working session.

Older entries: [[Session Log 2026-11-25]], [[Session Log 2026-11-24 (late)]], [[Session Log 2026-11-24]], [[Session Log 2026-11-24 (day)]] and [[Session Log 2026-11-23 (early)]] (archived).

## 2026-11-25: `/board` decks follow-ups (orchestrator; RJ asked for one parallel session per item)
- First run on the new PC (Node 22.23.5, JDK 21 first on PATH). RJ picked the Decks follow-ups; seven items ran at once, each in its own worktree session with its own ID range. H-344 left out (blocked on H-194). H-255 was marked `blocked` but H-060 / H-254 were merged, so it ran.
- **H-383** (spec-writer) lock badge text to RJ's H-382 (2): SPEC-005 0.10.3, SPEC-008 0.4.7, [[Decks]]. PASS attempt 1. [PR #75](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/75) merged by the loop. Filed H-400.
- **H-342** (spec-writer) [[Deck Import]] 0.12 `review`: ACs 7 / 23, strings adopted, RJ's Legend / Champion rule, `Champion: 2` decided (DECK-027). PASS attempt 1. [PR #76](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/76) merged by the loop. Filed H-410.
- **H-341** (ui-engineer) [[Critique H-341 Deck Import Review]] with RJ's two real deck lists. PASS attempt 1. [PR #77](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/77) merged by the loop. Filed H-450…H-454 (H-450 P1 stale select / lost focus).
- **H-255** (ui-engineer) [[Decks Review]]: close, not done; 2 blocking. PASS attempt 1. [PR #80](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/80) merged by the loop. Filed H-460…H-468 (H-460, H-461 P1 blocking).
- **H-343** (builder) optional leading article in both imports (CARD-034 / DECK-040). PASS attempt 1. [PR #78](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/78) merged by RJ. Filed H-420, H-421.
- **H-380** (builder) tests for `local-date.ts` and Decks states L2 / L11. PASS attempt 1. [PR #79](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/79) merged by RJ. Filed H-430, H-431.
- **H-391** (builder) Decks pieces on `/styleguide`, light and dark. PASS attempt 1. [PR #81](https://github.com/Rayven-D/RiftboundDeckBuilder/pull/81) open for RJ. Filed H-440.
- No failures, no gates parked. `next_id` 469. Next: blocking H-460, H-461 and H-450, then H-451…H-453, H-462…H-468, H-454 (spec), H-410, H-400; flaky timing tests H-420 / H-430.

## 2026-11-25: H-249 privacy notice trimmed (spec-writer, RJ-requested)
- RJ: "does the privacy notice have to be so detailed? ... Dallas" then "Yes, trim it". [[Privacy Notice Draft]] **0.3 to 0.4** (still `review`; his H-182 final read now covers 0.4): "Where it is stored" is one line naming the United States (transfer sentence and safeguard kept); the recipient is "Google (Firebase), our hosting and database provider" with no per-product names (Firebase Authentication, Cloud Firestore, Firebase Hosting gone); theme line "light or dark theme"; a few smaller trims ("a user ID", "your sign-in session", "its systems", "Sign-in IP logs"). Page text about 1,035 to 995 words.
- [[Accounts and Sync]] **0.17.1 to 0.17.2**: SYNC-103 items 4, 5, 6, 9, 10, 12, AC 66 (checks "United States", fails on "Dallas", "Texas", "us-south1", "Firestore", "Firebase Authentication", "Firebase Hosting", "or system"), Open question 15 (f) closed, summary, changelog. Pins moved in Spec Index, Test Data, My Collection, ADR-0006, [[Current State]]. [[Privacy Notice Requirements]] got a note under Impacts only (facts unchanged). No cross-spec conflict: the other specs do not state the Firestore location (ADR-0007 and the Firebase console keep `us-south1`).
- Board: H-249 (this, `verify`), H-250 (builder, P1, after H-249). No code, nothing committed.
