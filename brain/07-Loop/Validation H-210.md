---
tags: [validation]
item: H-210
---
# Validation H-210

2026-11-26 · H-210 · PASS · SYNC-153/154/160 string and rule comparison, grep for stale 24 / emoji rule in `brain/04-UI/`, Archive and 07-Loop untouched, V-009 on the two notes · no failures (2 notes for RJ)

## Checks
- **Rules (PASS):** [[Brief H-175]] decision 1 and U3 now say 1–20 characters, one code point each, NFC, trimmed, inner spaces collapsed, allowed set letters and numbers of any script plus spaces and `. _ - ' ’`, first character a letter or digit, no emoji, no line breaks; not unique; no `maxlength`; Firestore rules check the same (SYNC-160); old names keep showing. All match [[Accounts and Sync]] SYNC-153 (3)(4)(5) and SYNC-160 (a)(b).
- **Strings (PASS):** "Enter a username.", "Use 20 characters or fewer." and "Use letters, numbers, spaces and . _ - ' only. No emoji." are copied exactly in U3/U4 and the copy table; the counter is `n / 20`; the length error shows first when both apply (SYNC-153). The dialog text "...you can change it any time in Account Information." matches SYNC-154. [[Review H-189]] N1 and the re-check rows use `n / 20` and "Use 20 characters or fewer."
- **Review H-189 history rows (PASS):** rows 3 and 74 still describe the v0.14 build (24 characters, `7 / 24`, "Use 24 characters or fewer.") but each carries an "Updated 2026-11-26" note saying it is the v0.14 build and giving the new rule. Accepted as history, not as current.
- **Stale-rule grep in `brain/04-UI/` (PASS):** no other note states 24 / emoji as current. Remaining hits are the two notes' own annotated history (Brief open question 1, marked Closed; Review rows 3, 65, 169).
- **Archive and 07-Loop (PASS):** `git diff` on `brain/Archive` is empty. In `brain/07-Loop/` only `Validation Checks.md` (modified) and `Validation H-072.md` (untracked) differ, and both belong to other work.
- **V-009 (PASS):** every wikilink in the two notes resolves; both have `status` and `date` front matter; the diff adds no new links.
- **ADR-0006 (confirmed, for RJ):** `brain/03-Decisions/ADR-0006 Two Imports - Collection and Decks.md` line **129** (not 128) still reads "Username: 1–24 characters, any script, not unique, ..." under "Follow-up (RJ, 2026-11-24, gate H-178 on [[Brief H-175]])". ADR edits are RJ's call; not changed here.

## Notes (not failures)
- The notes cite "SPEC-010 0.17.2" as the version they were updated to. The spec is now 0.18.0. The username rules are unchanged since v0.16 (SYNC-153, SYNC-160), so the content is correct; the version label is only a pin.
- Documentation-only item: no code, tests or browser run were needed.
