// CARD-033 (name lookup) and CARD-036 (set + collector-number lookup) over one snapshot.
import { collectorKey } from './collector.ts';
import { compareCodePoint } from './compare.ts';
import { nameKey } from './name-key.ts';
import { makePrintingComparator } from './printing-sort.ts';
import type { CardLookup, CardSnapshot, PlayableCard, Printing } from './types.ts';

export interface PrintingRef {
  setCode: string;
  collectorNumber: string;
}

/**
 * Parses a public code `SET-NUMBER[suffix]` (e.g. `OGN-007a`, `RAD-SP1/005`) or a TTS token
 * `SET-NUMBER-COPY` (copy index dropped, e.g. `OGN-265-1`). Returns null if there is no `-`.
 */
export function parsePublicCode(code: string): PrintingRef | null {
  const s = code.normalize('NFKC').trim();
  const dash = s.indexOf('-');
  if (dash <= 0 || dash === s.length - 1) return null;
  const setCode = s.slice(0, dash);
  let rest = s.slice(dash + 1);
  const tts = /^(.+)-([0-9]+)$/u.exec(rest);
  if (tts) rest = tts[1] as string;
  return { setCode, collectorNumber: rest };
}

export class CardIndex {
  readonly snapshot: CardSnapshot;
  private readonly cardsByKey = new Map<string, PlayableCard>();
  private readonly printingsById = new Map<string, Printing>();
  private readonly printingsByCollector = new Map<string, Printing[]>();
  private readonly compare: (a: Printing, b: Printing) => number;

  constructor(snapshot: CardSnapshot) {
    this.snapshot = snapshot;
    this.compare = makePrintingComparator(new Map(snapshot.sets.map((s) => [s.code, s.setOrder])));
    for (const c of snapshot.cards) this.cardsByKey.set(c.cardKey, c);
    for (const p of snapshot.printings) {
      this.printingsById.set(p.printingId, p);
      const k = `${p.setCode}\u0000${p.collector.key}`;
      const list = this.printingsByCollector.get(k);
      if (list) list.push(p);
      else this.printingsByCollector.set(k, [p]);
    }
  }

  /** Exact name-key lookup (CARD-033); no fuzzy matching. Accepts a name or a cardKey. */
  findCard(nameOrKey: string): PlayableCard | undefined {
    return this.cardsByKey.get(nameKey(nameOrKey));
  }

  printing(printingId: string): Printing | undefined {
    return this.printingsById.get(printingId);
  }

  printingsOf(card: PlayableCard): Printing[] {
    return card.printingIds.map((id) => this.printingsById.get(id)).filter((p): p is Printing => p !== undefined);
  }

  /** Printings in printingSortKey order (CARD-070). */
  sortedPrintings(): Printing[] {
    return [...this.snapshot.printings].sort(this.compare);
  }

  /** CARD-036 */
  lookupPrinting(setCode: string, collectorNumber: string): CardLookup {
    const set = setCode.normalize('NFKC').trim().toUpperCase();
    const wanted = collectorKey(collectorNumber);
    const matches = this.printingsByCollector.get(`${set}\u0000${wanted.key}`) ?? [];
    if (matches.length === 0) return { status: 'not-found' };
    const cardKeys = [...new Set(matches.map((p) => p.cardKey))].sort(compareCodePoint);
    if (cardKeys.length > 1) return { status: 'ambiguous', cardKeys };

    const rank = (p: Printing): number => {
      if (wanted.suffix !== null) return p.collector.suffix === wanted.suffix ? 0 : 1;
      return p.collector.suffix === null || p.variant.kind === 'base' ? 0 : 1;
    };
    const ordered = [...matches].sort((a, b) => rank(a) - rank(b) || this.compare(a, b));
    const result: CardLookup = {
      status: 'found',
      cardKey: cardKeys[0] as string,
      printingIds: ordered.map((p) => p.printingId),
    };
    if (wanted.suffix !== null && !matches.some((p) => p.collector.suffix === wanted.suffix)) {
      result.note = 'variant-not-found';
    }
    return result;
  }

  /** CARD-036 for a public code or TTS token. */
  lookupPublicCode(code: string): CardLookup {
    const ref = parsePublicCode(code);
    return ref ? this.lookupPrinting(ref.setCode, ref.collectorNumber) : { status: 'not-found' };
  }
}
