2026-11-27 · H-186 batch (H-186, H-271, H-257, H-096, H-161, H-184, H-199, H-241) · PASS after one fix · checks: Accept vs `git diff` (brain only, no test suite), V-009 spot check of changed links

- H-186 PASS: AC 33 (SPEC-007 0.18.1) recomputed: Jinx 2 + Draven 2 = 4 locked, 6 owned, 2 free, Kennen needs 5, "2 of 5 available"; COLL-104 re-attributed; AC 44 added; Keyword Explanations pointer; deferred notes.
- H-271 PASS after fix: IMP-079 attributed all strings to "RJ 2026-11-25". Fixed: the lock-only Undo title and button ("Unlock cards in your decks?" / "Unlock and continue") are RJ-approved 2026-11-26 for the SPEC-008 removal dialog (SHARE-088, "Approve as built"), but their reuse in the Undo confirmation is marked proposed. "Check the cards" stays open (IMP-078 (f), Open questions).
- H-257, H-096, H-161, H-199, H-184, H-241 PASS (ADR-0006 edit is a one-line italic pointer after the original sentence; decision text unchanged).
- Gate: none new. "Check the cards" is already an Open question in [[Collection Import]] (H-501) and [[Deck Import]]; no board row exists, none added. The lock-only Undo reuse is a low-risk confirm for RJ, no gate.
