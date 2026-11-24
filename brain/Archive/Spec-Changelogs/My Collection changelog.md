---
tags: [archive, changelog]
archived: true
archived_on: 2026-11-23
reason: spec changelog
superseded_by: "[[My Collection]]"
---
# My Collection changelog

Moved out of [[My Collection]] on 2026-11-23 (H-039). Newest first. New changelog entries for the spec go here.

- 0.6 (2026-11-23, H-049 item 19): Undo of an import warns **before** it runs, like every other change:
  COLL-088 puts SPEC-008's "'`<deck name>`' (locked) will be `<n>` cards short." inside the COLL-058 undo
  confirmation when manual edits followed the import, and otherwise asks for a confirmation only when a
  locked deck would go short (computed on the snapshot the undo would restore). The v0.5 notice "… is now
  `<n>` cards short." after Undo is removed. COLL-058 points to COLL-088 for the warning (its own MUST text is
  unchanged). Agrees with SPEC-008 0.3 SHARE-034 and SPEC-003 0.7 IMP-050/IMP-050a. Summary updated. Pins:
  SPEC-003 0.7, SPEC-008 0.3 (Depends line, data contract). Still 81 requirements.

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
