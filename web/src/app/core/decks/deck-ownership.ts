import type {
  CardKey,
  DeckOwnership,
  DeckOwnershipEntry,
  DeckOwnershipInput,
  PrintingId,
  TagId,
  TagTarget,
} from './types';

/**
 * SPEC-007 COLL-081 `deckOwnership(input, cardKey)`, the minimal pure piece the Decks engine needs
 * (the Collection screen isn't built yet). `owned` = quantity, `ownedExcluded` = copies of entries
 * carrying at least one tag with `excludeFromDecks`, `ownedForDecks = owned − ownedExcluded`, and the
 * per-entry breakdown in printingSortKey order: resolved printings by the card's `printingIds`
 * (CARD-070), the unassigned entry right after the default printing (COLL-012), then missing-printing
 * entries (COLL-014). Tag ids with no matching `Tag` don't exclude.
 */
export function deckOwnership(input: DeckOwnershipInput, cardKey: CardKey): DeckOwnership {
  const record = input.collection.cards[cardKey];
  if (!record) return { cardKey, owned: 0, ownedForDecks: 0, ownedExcluded: 0, entries: [] };

  const excludingTags = new Set<TagId>(
    input.tags.tags.filter((t) => t.excludeFromDecks).map((t) => t.id),
  );
  const card = input.catalog.cards[cardKey];
  const order = new Map<PrintingId, number>((card?.printingIds ?? []).map((id, i) => [id, i]));
  const defaultPos = card ? (order.get(card.defaultPrintingId) ?? order.size) : 0;

  const ranked: { pos: number; tie: number; entry: DeckOwnershipEntry }[] = [];
  const make = (
    entryId: TagTarget,
    kind: DeckOwnershipEntry['kind'],
    printingId: PrintingId | null,
    printingCode: string | null,
    count: number,
  ): DeckOwnershipEntry => {
    const excludedByTagIds = (input.tags.assignments[entryId] ?? []).filter((id) =>
      excludingTags.has(id),
    );
    return {
      entryId,
      kind,
      printingId,
      printingCode,
      count,
      excluded: excludedByTagIds.length > 0,
      excludedByTagIds,
    };
  };

  let assigned = 0;
  for (const [printingId, rawCount] of Object.entries(record.byPrinting)) {
    const count = Math.max(0, Math.trunc(rawCount));
    if (count === 0) continue;
    assigned += count;
    const printing = input.catalog.printings[printingId];
    if (printing) {
      const code = printing.publicCode ?? `${printing.setCode}-${printing.collectorNumber}`;
      const pos = order.get(printingId) ?? Number.MAX_SAFE_INTEGER;
      ranked.push({
        pos,
        tie: 0,
        entry: make(`p:${printingId}`, 'printing', printingId, code, count),
      });
    } else {
      const code = input.printingCodes.codes[printingId]?.code ?? null;
      ranked.push({
        pos: defaultPos,
        tie: 2,
        entry: make(`p:${printingId}`, 'missing-printing', printingId, code, count),
      });
    }
  }
  // COLL-002: Σ byPrinting ≤ quantity; a broken record is read as quantity = Σ byPrinting.
  const owned = Math.max(Math.max(0, Math.trunc(record.quantity)), assigned);
  const unassigned = owned - assigned;
  if (unassigned > 0) {
    ranked.push({
      pos: defaultPos,
      tie: 1,
      entry: make(`u:${cardKey}`, 'unassigned', null, null, unassigned),
    });
  }

  ranked.sort(
    (a, b) =>
      a.pos - b.pos ||
      a.tie - b.tie ||
      (a.entry.printingId ?? '').localeCompare(b.entry.printingId ?? '', 'en'),
  );
  const entries = ranked.map((r) => r.entry);
  const ownedExcluded = entries.filter((e) => e.excluded).reduce((n, e) => n + e.count, 0);
  return { cardKey, owned, ownedForDecks: owned - ownedExcluded, ownedExcluded, entries };
}

const memo = new WeakMap<DeckOwnershipInput, Map<CardKey, DeckOwnership>>();

/**
 * SPEC-005 OWN-083: one `deckOwnership(input, cardKey)` per cardKey per `DeckOwnershipInput`.
 * Inputs are immutable snapshots (a change makes a new input object), so the result is reused for
 * the same input object and dropped with it (WeakMap; never persisted, OWN-026).
 */
export function cachedDeckOwnership(input: DeckOwnershipInput, cardKey: CardKey): DeckOwnership {
  let byCard = memo.get(input);
  if (!byCard) {
    byCard = new Map();
    memo.set(input, byCard);
  }
  let result = byCard.get(cardKey);
  if (!result) {
    result = deckOwnership(input, cardKey);
    byCard.set(cardKey, result);
  }
  return result;
}
