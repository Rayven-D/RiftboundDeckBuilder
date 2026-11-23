// CARD-003: the API reads cards only through this repository, backed by a SnapshotStore.
import { CardIndex } from './lookup.ts';
import type { SnapshotStore } from './ports.ts';
import type { CardSnapshot, PlayableCard, Printing } from './types.ts';

export interface CardWithPrintings extends PlayableCard {
  printings: Printing[]; // in printingSortKey order (CARD-070)
}

export class CardRepository {
  private readonly store: SnapshotStore;
  private cached: { snapshot: CardSnapshot; index: CardIndex } | null = null;

  constructor(store: SnapshotStore) {
    this.store = store;
  }

  /** The current index, or null when no snapshot exists. */
  async current(): Promise<CardIndex | null> {
    const snapshot = await this.store.readSnapshot();
    if (!snapshot) {
      this.cached = null;
      return null;
    }
    if (this.cached?.snapshot !== snapshot) this.cached = { snapshot, index: new CardIndex(snapshot) };
    return this.cached.index;
  }
}

export function withPrintings(index: CardIndex, card: PlayableCard): CardWithPrintings {
  return { ...card, printings: index.printingsOf(card) };
}
