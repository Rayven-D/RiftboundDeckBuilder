---
tags: [loop, validation]
board: H-070
---
# Validation H-070 (rule-lookup facts and read estimates in Firestore Data Shape)

2026-11-26 · H-070 · PASS · Accept (sourced, dated facts; SPEC-010 SYNC-113 section judged instead of the markers), V-006 freshness (`as_of` 2026-11-26, sources listed with tier), V-009 (new URLs in `sources`, wikilinks resolve), live fetch of the three official pages plus the rules reference, arithmetic recheck, 3-read reopen vs SYNC-040/053/120 · failures: none blocking; 2 advisory notes below

## Spot-check against the official pages (fetched 2026-11-26)
| Claim in the note | Result |
|---|---|
| Lookups billed as reads, even if rules reject | Confirmed. Pricing: reads "necessary to evaluate" rules (`exists()`, `get()`, `getAfter()`); rules-conditions: "billed for reading documents even if your rules reject the request" |
| (b) one read per dependent document even if referenced more than once | Confirmed word for word on the pricing page. Marked `verified (billing only)`, correctly not stretched to the call limit |
| (c) limits 10 (single-document and query) / 20 (multi-document reads, transactions, batched writes), 10 also per operation, over = permission denied, cached calls not counted | Confirmed on rules-conditions and quotas. Both pages list `exists()`, `get()`, `getAfter()` only |
| (a) `existsAfter()` billing in same batch | `existsAfter` appears on neither the pricing, rules-conditions nor quotas page; the rules reference says only "Check if a document exists, assuming the current request succeeds. Equivalent to getAfter(path) != null". `unverified` is the right status |
| Repeats vs the call limit, which calls are cached | Pages silent. `unverified` is right |

## Arithmetic
- Typical: 3 x 3 + 5 + 14/7 = 16 (was 15). 50,000 / 16 = 3,125 (note: 3,100). OK
- Busy heavy: 5 x 3 + 104 + 20 = 139. 50,000 / 139 = 360. OK
- Mix: 0.9 x 16 + 0.1 x 139 = 28.3; 50,000 / 28.3 = 1,767 (note: 1,770). OK
- Writes (15.3/day) still bind: 20,000 / 15.3 = 1,307, so "about 1,300 DAU" stands. Outbound 358 / 0.2335 = 1,533. OK
- Reopen = 3 reads matches SYNC-040 (first pull after start-up 3, later 2), SYNC-053 and SYNC-120. The "3 reopens x 3" in the typical day treats each reopen as a start-up, which fits.

## Advisory (not blocking; owner `researcher`, fold into the next edit of the note)
1. "Rule lookups" text and the "For SPEC-010 SYNC-113" section say to keep batches at 20 operations or fewer "(the `PushChanges.batch` split)". SPEC-010 SYNC-113 (v0.18.0, H-136) says there is no batch split: a push writes one document at a time and `PushChanges` has no `batch` field. The advice should read "pushes are one document per request, so the limits are never near".
2. The sync-flow table still has the pre-v0.8 first-sign-in rows ("4 + N writes in batches", "realistic 14 writes") that SYNC-050 supersedes (at most 1 write). Not part of H-070's read refresh, but it contradicts the new text next to it.

## For the spec-writer (SPEC-010 SYNC-113 markers)
The "For SPEC-010 SYNC-113" section is accurate and usable as written: resolve (b) and the limit numbers in (c) with the cited sentences; keep (a) and the `existsAfter()`/repeat parts of (c) `unverified` with the reason "no Firebase page says". With one-document-per-push (v0.18.0) the batch-limit question no longer affects the design.
