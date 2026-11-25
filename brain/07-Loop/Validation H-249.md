---
tags: [validation]
item: H-249
---
# Validation H-249

2026-11-25 · H-249 · PASS · V-009 (docs hygiene), checklist coverage against [[Privacy Notice Requirements]] items 1-24, source-support review of every changed sentence, AC 66 testability review, version-pin grep (SPEC-010 0.17.2), cross-spec conflict grep · failures: none

- **Checklist coverage (draft 0.4):** controller and contact (Who we are), purposes and legal basis, recipients ("Google (Firebase), our hosting and database provider", a category, which GDPR 13(1)(e) allows), transfer outside the EU with safeguard (13(1)(f): "stored by Google Firebase in the United States", DPF or SCCs sentence kept), retention (until deletion, 180 days, IP logs a few weeks), rights and complaint, browser storage (ePrivacy, no cookies, still **Confirm** until AC 70), DNT and GPC, security, age line (16), changes, no automated decisions, required-or-not, Riot line. All present.
- **Facts unchanged, only detail:** IP and user agent kept for a few weeks, request logs, 180 days, nobody else receives it, not sold, theme kept after sign-out. "No one buys it" is covered by the existing "do not sell or share" (item 9 "not sold"). Nothing claims more than research rows 16, 17, 28 support; the country is true for both Firestore (Dallas) and Auth (US data centers). The research note carries the H-249 impact note.
- **AC 66 testable:** required strings listed ("United States", "request logs", "Google (Firebase)", "light or dark", and the rest) plus a case-sensitive absence list ("Dallas", "Texas", "us-south1", "Firestore", "Firebase Authentication", "Firebase Hosting", "or system"). I grepped the draft's proposed page text: none of the absent strings occur in it, and every required string does. "Firebase" alone is still allowed ("Google Firebase", the firebaseapp.com sender), so the list does not false-fail.
- **Pins:** SPEC-010 0.17.2 in frontmatter, Spec Index (SPEC-010, SPEC-012 rows), Test Data "Depends on", My Collection "Current:", ADR-0006, Privacy Notice Draft `spec:` line, Current State. Remaining 0.17.1 mentions are history only.
- **Cross-spec:** no live spec outside SPEC-010 and the draft names Dallas, `us-south1`, or the product names in notice wording. SYNC-103 items 4, 5, 6, 9, 10, 12 match the draft. Open question 15 (f) is marked closed.
- **Non-blocking nits (no board item):** (1) the "What Google collects for us" paragraph in the draft has one over-long line (cosmetic). (2) SPEC-010 line 1455 still quotes the old "light, dark or system" wording as history; line 1828 records the closure. (3) The built page `web/src/app/core/privacy/privacy-notice.md` is H-250's job and was not checked here.
