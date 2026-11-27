import { TestBed } from '@angular/core/testing';
import { AppStores } from '../storage/app-stores';
import { createBrowserStores } from '../storage/browser-stores';
import { MemoryBackend } from '../storage/kv-backend';
import { DEV_SAMPLE_KEY, CardData } from './card-data';
import { generateLargeSample } from '../../shared/collection/sample-data';
import { planTestLoad } from '../../shared/collection/test-data';

function setup() {
  const stores = createBrowserStores(new MemoryBackend(), {
    now: () => Date.now(),
    changed: () => undefined,
    readOnly: () => false,
  });
  TestBed.configureTestingModule({ providers: [{ provide: AppStores, useValue: { stores, majorAction: () => undefined } }] });
  return { stores, cardData: TestBed.inject(CardData) };
}

describe('CardData and test data (SPEC-013 TEST-024, H-205)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(DEV_SAMPLE_KEY);
  });

  it('TEST-024 / AC 5 a stored test-data-150 collection gets the generated catalog for 150 with no /api call and no dev key', async () => {
    const { stores, cardData } = setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const plan = planTestLoad(generateLargeSample(150), 150, null, '2026-11-25T12:00:00.000Z');
    await stores.raw.collection.save(plan.collection);
    expect(localStorage.getItem(DEV_SAMPLE_KEY)).toBeNull();
    const result = await cardData.loadCatalog();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(Object.keys(result.catalog.cards)).toEqual(Object.keys(generateLargeSample(150).catalog.cards));
    for (const k of Object.keys(plan.collection.cards)) expect(result.catalog.cards[k]).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('TEST-024 a test-data-5000 collection resolves every stored printing in the generated catalog', async () => {
    const { stores, cardData } = setup();
    vi.spyOn(globalThis, 'fetch');
    const plan = planTestLoad(generateLargeSample(5000), 5000, null, '2026-11-25T12:00:00.000Z');
    await stores.raw.collection.save(plan.collection);
    const result = await cardData.loadCatalog();
    if (result.status !== 'ok') throw new Error('no catalog');
    for (const c of Object.values(plan.collection.cards))
      for (const id of Object.keys(c.byPrinting)) expect(result.catalog.printings[id]).toBeDefined();
  });

  it('TEST-030 / TEST-024 an empty collection with a test marker is not test data: the /api catalog is used', async () => {
    const { stores, cardData } = setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await stores.raw.collection.save({ schemaVersion: 1, updatedAt: '', catalogVersion: 'test-data-150', cards: {} });
    expect((await cardData.loadCatalog()).status).toBe('error');
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('TEST-033 / AC 12 loadApiCatalog reads /api even while test data is stored (imports resolve against real card data)', async () => {
    const { stores, cardData } = setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const plan = planTestLoad(generateLargeSample(150), 150, null, '2026-11-25T12:00:00.000Z');
    await stores.raw.collection.save(plan.collection);
    expect((await cardData.loadCatalog()).status).toBe('ok'); // the generated catalog, no /api call
    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await cardData.loadApiCatalog()).status).toBe('error');
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('TEST-024 the catalog follows the marker: after a Remove the next load goes back to /api', async () => {
    const { stores, cardData } = setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const plan = planTestLoad(generateLargeSample(150), 150, null, '2026-11-25T12:00:00.000Z');
    await stores.raw.collection.save(plan.collection);
    expect((await cardData.loadCatalog()).status).toBe('ok');
    await stores.raw.collection.save({ ...plan.collection, catalogVersion: '', cards: {} });
    expect((await cardData.loadCatalog()).status).toBe('error');
    expect(fetchSpy).toHaveBeenCalled();
  });
});
