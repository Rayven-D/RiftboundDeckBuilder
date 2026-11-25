import { Injectable, inject, isDevMode } from '@angular/core';
import { API_BASE_URL } from '../api-base-url';
import type { BanListFile, CardSet, CollectionCatalogView, PlayableCard, Printing } from '../decks';
import { AppStores } from '../storage/app-stores';
import { isTestCollection, testEntries } from '../../shared/collection/test-data';

/** API shapes (brain/05-Services/API Contracts.md v1). */
interface CardWithPrintings extends PlayableCard {
  printings: Printing[];
}
interface CardPage {
  catalogVersion: string;
  total: number;
  items: CardWithPrintings[];
}
interface SetsResponse {
  catalogVersion: string;
  items: CardSet[];
}

export type CatalogResult = { status: 'ok'; catalog: CollectionCatalogView } | { status: 'error' };

/** Dev only: set to `large` by the /styleguide sample loader to use a generated 5,000-entry catalog. */
export const DEV_SAMPLE_KEY = 'rift.dev.sample';
export const DEV_LARGE_ENTRIES = 5000;
/** Dev only: JSON array of the deck ids the /styleguide sample loader wrote; Clear deletes only these. */
export const DEV_SAMPLE_DECKS_KEY = 'rift.dev.sampleDecks';

/**
 * The card catalog (SPEC-001 snapshot) as the Collection page reads it, from `GET /api/sets` and
 * the paged `GET /api/cards`. Loaded once per app session; `reload()` retries after an error.
 *
 * Ban data has no source in `web/` yet: SPEC-002's `data/banlist.json` is neither built nor
 * served (hosting is ADR-0004). `loadBans()` is the seam and resolves to null, which the page
 * shows as "Ban status unknown" (COLL-008).
 */
@Injectable({ providedIn: 'root' })
export class CardData {
  private readonly base = inject(API_BASE_URL);
  private readonly app = inject(AppStores);
  private catalog: Promise<CatalogResult> | null = null;
  /** Which catalog `catalog` holds: 'api' or the test set's entry count (SPEC-013 TEST-024). */
  private source: 'api' | number | null = null;

  /**
   * SPEC-013 TEST-024: while the stored collection carries the test marker (`test-data-<n>`, with cards), the
   * generated catalog for that `n` is returned instead of calling `/api`, on every device and after a reload, with
   * no dev flag; the generator is loaded on demand (outside the main bundle). Otherwise the `/api` catalog.
   */
  async loadCatalog(): Promise<CatalogResult> {
    const source = (await this.testSource()) ?? 'api';
    if (this.catalog === null || this.source !== source) {
      this.source = source;
      this.catalog = (source === 'api' ? this.fetchCatalog() : this.generated(source)).catch(
        (): CatalogResult => ({ status: 'error' }),
      );
    }
    return this.catalog;
  }

  reload(): Promise<CatalogResult> {
    this.catalog = null;
    return this.loadCatalog();
  }

  private async testSource(): Promise<number | null> {
    try {
      const c = await this.app.stores.raw.collection.load();
      return isTestCollection(c) ? testEntries(c!.catalogVersion) : null;
    } catch {
      return null; // an unreadable collection is the page's to report (COLL-071)
    }
  }

  private async generated(entries: number): Promise<CatalogResult> {
    const { generateLargeSample } = await import('../../shared/collection/sample-data');
    return { status: 'ok', catalog: generateLargeSample(entries).catalog };
  }

  async loadBans(): Promise<BanListFile | null> {
    return null;
  }

  private async fetchCatalog(): Promise<CatalogResult> {
    if (isDevMode() && globalThis.localStorage?.getItem(DEV_SAMPLE_KEY) === 'large') {
      // Loaded on demand so the dev sample generator stays out of the main bundle (H-086 review 6).
      const { generateLargeSample } = await import('../../shared/collection/sample-data');
      return { status: 'ok', catalog: generateLargeSample(DEV_LARGE_ENTRIES).catalog };
    }
    const get = async <T>(path: string): Promise<T> => {
      const res = await fetch(`${this.base}${path}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`${path}: ${res.status}`);
      return (await res.json()) as T;
    };
    const sets = await get<SetsResponse>('/sets');
    const cards: Record<string, PlayableCard> = {};
    const printings: Record<string, Printing> = {};
    let catalogVersion: string | undefined;
    for (let page = 1, seen = 0; ; page++) {
      const res = await get<CardPage>(`/cards?page=${page}&pageSize=200`);
      catalogVersion = res.catalogVersion;
      for (const { printings: ps, ...card } of res.items) {
        cards[card.cardKey] = card;
        for (const p of ps) printings[p.printingId] = p;
      }
      seen += res.items.length;
      if (res.items.length === 0 || seen >= res.total) break;
    }
    return {
      status: 'ok',
      catalog: {
        catalogVersion: catalogVersion ?? sets.catalogVersion,
        sets: sets.items,
        cards,
        printings,
      },
    };
  }
}
