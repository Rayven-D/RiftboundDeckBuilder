---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[My Collection]]"
---
# My Collection changelog

Moved out of [[My Collection]] on 2026-11-23 (H-039). Newest first. New changelog entries for the spec go here.

- 0.10.1 (2026-11-25, H-160, finishing H-071 against SPEC-010 v0.11 "Impacts"): COLL-070 reads by mode
  (local-only mode: browser only; account-required mode: a browser cache of the signed-in account, cleared on
  sign-out; quantities and tags synced in account-required mode, printing codes and view state never). COLL-074
  split by mode: local-only mode as before (confirmation has no SPEC-010 text, nothing sent); account-required mode
  not offered, because Sign out clears this device (SYNC-052, SYNC-091); the v0.9 "while signed in clears this
  device and signs out" and its confirmation line "Your account keeps its copy…" are withdrawn (build H-154 follows).
  New COLL-092 (SYNC-009 gate note: the Collection page shows the sign-in panel while the gate is not open). Pins:
  SPEC-003 0.10.1, SPEC-008 0.4.3.
- 0.10 (2026-11-24, H-087): new COLL-090 (card data missing: banner "Card data couldn't load. Your cards
  are safe. Names and images will show once it loads." with Try again, no list, count line, search, sort,
  export or Unresolved section, nothing written, COLL-015 does not apply) and COLL-091 (arriving from an
  import commit: the SPEC-003 notice is app-level and Collection needs nothing extra); COLL-058 names the
  IMP-073 snack bar as the Undo entry point; ACs 26–27. Matches the H-086 build (S10 as built).
- 0.9 (2026-11-24, H-071, SPEC-010 Impacts): `TagId` becomes `t_` + 6 base-62 characters (8 chars, SYNC-016);
  `StoredTags` `schemaVersion` 3 with a 2 → 3 migration in COLL-071 (rewrites ids, assignments and the view
  state's tag filter and saved views; worked example added); COLL-070 reads "browser by default, quantities and
  tags synced when signed in"; COLL-074 while signed in clears this device and signs out, never deletes cloud
  data (SYNC-052). Example tag ids in the URL acceptance criterion updated to the short form.
- 0.8 (2026-11-24, H-097): **runes are cards** (RJ, 2026-11-24: "Allow users to import runes as well and
  treat them like any other card."). COLL-087 ("Runes are never needed") withdrawn; new COLL-089 (runes are
  listed, tagged, edited, exported and counted toward decks like any card; no rune-specific text such as
  "Runes are assumed owned"). New AC 25. Open questions 9 (H-099, rune printings in the API) and 10
  (resolved: RJ's decision) added. Summary bullet added; SPEC-009 dependency removed; pins SPEC-003 0.9, SPEC-008 0.4.
  Note: H-091 (Collection simplification) will bump this spec again.

- 0.7 (2026-11-23, H-049 item 19; numbered 0.6 on its branch, renumbered at merge because H-045 is 0.6): Undo of an import warns **before** it runs, like every other change:
  COLL-088 puts SPEC-008's "'`<deck name>`' (locked) will be `<n>` cards short." inside the COLL-058 undo
  confirmation when manual edits followed the import, and otherwise asks for a confirmation only when a
  locked deck would go short (computed on the snapshot the undo would restore). The v0.5 notice "… is now
  `<n>` cards short." after Undo is removed. COLL-058 points to COLL-088 for the warning (its own MUST text is
  unchanged). Agrees with SPEC-008 0.3 SHARE-034 and SPEC-003 0.8 IMP-050/IMP-050a. Summary updated. Pins:
  SPEC-003 0.8, SPEC-008 0.3 (Depends line, data contract). 80 requirements (COLL-059 withdrawn in 0.6).
  RJ decision 2026-11-23 (H-049 follow-up): Undo warns before **and** notifies after. COLL-088's warning
  string gains "It stays locked." (SPEC-008 SHARE-033/034); a confirmed Undo of an import is followed by the
  notice "'`<deck name>`' (locked) is now `<n>` cards short." (restored, now in addition to the warning; the
  "is removed" line above no longer applies). Cancel shows no notice. Summary updated; COLL-058 unchanged.

- 0.6 (2026-11-23, H-045): RJ decision 2026-11-23 (H-045). COLL-059 (Tags column in the collection CSV
  export) **withdrawn**: under SPEC-003's positional row rule the extra column broke the round trip; the
  export is `Quantity,Card Name` only, tags and exclude flags are not in the CSV backup (expected to survive
  through sign-in sync, ADR-0007), and per-printing counts round-trip per SPEC-003 0.7 IMP-055 (missing-printing
  copies come back unassigned). New AC 24 (rows and entries in COLL-012/031/033 order). Out of scope notes tags in the export. Summary "Depends on" and the
  data contract pin SPEC-003 v0.7. 80 requirements (62 MUST, 14 SHOULD, 4 MAY).

- 0.5 (2026-11-23, H-067): COLL-088 agrees with SPEC-008 0.2 SHARE-034 and SPEC-003 0.6 IMP-050: the
  locked-deck warning is shown before the edit inside its confirmation (an edit without one, e.g. − or a
  typed quantity, asks for one only when a locked deck would go short; Cancel changes nothing); a Replace
  import warns inside the IMP-050 confirmation (was: a notice after commit); Undo of an import gives the
  notice "… is now `<n>` cards short.". Typed lower quantity (COLL-053) added to the list. `depends_on` and
  Summary "Depends on" add SPEC-008 0.2 and SPEC-009 0.2, with versions; data contract pin SPEC-003 v0.2 →
  v0.6. Still 81 requirements.

- 0.4 (2026-11-23): H-058. Shared cards, lock in and runes (ADR-0006 "Shared cards, lock in and runes"). New COLL-086 (per-printing Collection, one per-name `ownedForDecks` pool that SPEC-008 builds on; excluded copies never available; locks never change Collection data), COLL-087 (runes never needed, SPEC-009 RUNE-008), COLL-088 SHOULD (warn when an edit makes a locked deck short, SHARE-034). Summary, research list and consumers (SPEC-008) updated. This version also carries the H-044 lower-case strings already in the text ("Not counted in your decks" in COLL-083, "… will no longer count in your decks" in COLL-084, AC 22), which H-050 asked to version. 81 requirements (62 MUST, 15 SHOULD, 4 MAY).
- 0.3 (2026-11-23): H-039. Data contract: new `CollectionCatalogView`; `DeckOwnershipInput` carries the catalog view (COLL-081) and `CollectionQueryInput` carries the catalog view, ban data (`BanListFile | null`) and `today` (COLL-068), instead of only `catalogVersion`; COLL-068/081 name their input types. Removed stale open questions 2 (IMP-058, fixed in SPEC-003 v0.2) and 5 (date format, fixed in SPEC-004/006); renumbered. Summary block added; changelog moved to this archive note.
- 0.2 (2026-11-23): H-034. Applies RJ's gate H-036 answers (ADR-0006 #3, #4, #6, #7) and the H-031
  validator follow-ups. **Entries:** one entry per printing (every printing type separate) with a count
  badge (new COLL-016); the default "Printings/Cards" toggle is gone, "Group by card" is an optional
  SHOULD view (COLL-013 MUST → SHOULD); COLL-001/004/010/011/012 reworded; missing printings are their
  own entry labelled with a remembered code (COLL-014, new COLL-075 printing-code memory, fourth store).
  **Tags on printings:** tag targets `p:<printingId>` / `u:<cardKey>` (COLL-020/022/024–027/029/030;
  new COLL-019 unassigned copies tagged separately, with copy offer); tags survive Add/Replace by
  `printingId` (COLL-057, COLL-059). **Exclude from decks:** new section J, COLL-080–085 (tag flag,
  `deckOwnership()` contract with `ownedForDecks`/`ownedExcluded` and per-entry breakdown for SPEC-005,
  toggle UI, "Not counted in Your decks" label, summary); new COLL-049 Decks filter; COLL-003 now
  points Your decks at COLL-081. **Validator fixes:** data contract uses SPEC-003 v0.2 `CardKey`,
  `PrintingId`, `PrintingCode` (`byPrinting` keyed by `printingId`), SPEC-001 `CardCategory`/
  `VariantKind`, SPEC-002 `BanStatus`; local `BanStatus` removed (`EntryBan` = `BanStatus` or
  `unknown`); COLL-008/009 call `banStatus()` (LEGAL-B10); `category: 'unknown'` → Unknown bucket
  (COLL-034/035/041); COLL-065 source is the Riot API catalog, ~1,451 community count, Riftcodex
  removed; COLL-031/033/043/044/050–052/054/061/066/068/070/071/074 aligned to entries.
  **Display rules:** dates `Nov 23, 2026` (new COLL-017), "Not fully checked" (new COLL-018).
  StoredTags and StoredViewState schema 2 with migrations. ACs 2, 4, 5, 6, 7, 8, 14, 16, 17, 19 revised
  (AC17 now has an explicit **When**); new ACs 20–23 (foil `×3` badge, foil-only tag, excluded
  `Collector` tag, unassigned tags). Open questions refreshed: removed the answered ones (tags on
  `cardKey` vs printing, per-printing rows) and the stale SPEC-001 v0.2 / SPEC-003 key items; added
  foil-as-printing research, IMP-058/SPEC-005 alignment, date-format alignment. 78 requirements
  (60 MUST, 14 SHOULD, 4 MAY); added COLL-016, 017, 018, 019, 049, 075, 080–085; none removed.
- 0.1 (2026-11-23): first draft (H-031). Printings view by default with Cards view toggle; unassigned
  copies placed at the default printing; tags on `cardKey` in a separate `TagStore`; sort by any
  attribute with `printingSortKey` default and tie-breaker; Unknown bucket; ban status as of today;
  manual quantity edits; URL and per-browser view state. 66 requirements (COLL-001…COLL-074: 51 MUST, 11 SHOULD, 4 MAY).
