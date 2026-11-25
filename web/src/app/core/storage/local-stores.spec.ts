import { EMPTY_SNAPSHOT_AT, type StoredViewState, type UserDeck } from '../../shared/storage/records';
import { SHORT_TAG_ID, newTagId } from '../../shared/storage/tag-id';
import { MemoryBackend } from './kv-backend';
import {
  DeckStoreError,
  LocalCollectionStore,
  LocalDeckLockStore,
  LocalDeckStore,
  LocalTagStore,
  LocalViewStateStore,
  STORAGE_KEYS,
  UnreadableRecordError,
  clearLocalData,
} from './local-stores';

const deck = (id: string, over: Partial<UserDeck> = {}): UserDeck => ({
  schemaVersion: 1,
  id,
  name: 'Kennen Tempo',
  format: 'standard',
  source: { kind: 'user', text: null, url: null },
  sourceFormat: 'manual',
  notes: '',
  createdAt: '2026-11-23T09:00:00.000Z',
  updatedAt: '2026-11-23T09:00:00.000Z',
  catalogVersion: 'cv',
  legend: null,
  champion: null,
  main: [],
  sideboard: [],
  runes: [],
  battlefields: [],
  ...over,
});

describe('browser stores (SPEC-003/006/007/008 as mapped by SPEC-010)', () => {
  let backend: MemoryBackend;
  beforeEach(() => (backend = new MemoryBackend()));

  it('IMP-053 / IMP-052 the collection store saves, loads and keeps the Undo snapshot only when asked', async () => {
    const s = new LocalCollectionStore(backend);
    expect(await s.load()).toBeNull();
    const a = { schemaVersion: 1 as const, updatedAt: 'a', catalogVersion: 'cv', cards: { x: { quantity: 1, byPrinting: {} } } };
    await s.save(a);
    await s.save({ ...a, updatedAt: 'b' });
    expect(await s.loadPrevious()).toBeNull();
    await s.save({ ...a, updatedAt: 'c' }, { snapshotPrevious: true });
    expect((await s.loadPrevious())!.updatedAt).toBe('b');
    expect((await s.load())!.updatedAt).toBe('c');
  });

  it('IMP-052 / IMP-075 (H-158): the first import keeps an empty snapshot; clearPrevious spends it', async () => {
    const s = new LocalCollectionStore(backend);
    const a = { schemaVersion: 1 as const, updatedAt: 'a', catalogVersion: 'cv', cards: { x: { quantity: 1, byPrinting: {} } } };
    await s.save(a, { snapshotPrevious: true });
    expect(await s.loadPrevious()).toEqual({ schemaVersion: 1, updatedAt: EMPTY_SNAPSHOT_AT, catalogVersion: 'cv', cards: {} });
    await s.clearPrevious();
    expect(await s.loadPrevious()).toBeNull();
    expect((await s.load())!.updatedAt).toBe('a');
  });

  it('SYNC-033 / COLL-071 a newer or corrupt record is unreadable and never overwritten', async () => {
    backend.set(STORAGE_KEYS.tags, JSON.stringify({ schemaVersion: 9, updatedAt: 'x', tags: [], assignments: {} }));
    const tags = new LocalTagStore(backend, new LocalViewStateStore(backend));
    await expect(tags.load()).rejects.toBeInstanceOf(UnreadableRecordError);
    await expect(tags.save({ schemaVersion: 3, updatedAt: 'y', tags: [], assignments: {} })).rejects.toBeInstanceOf(
      UnreadableRecordError,
    );
    expect(JSON.parse(backend.get(STORAGE_KEYS.tags)!).schemaVersion).toBe(9);
    backend.set(STORAGE_KEYS.collection, '{not json');
    await expect(new LocalCollectionStore(backend).load()).rejects.toMatchObject({ reason: 'corrupt' });
  });

  it('SYNC-016 short tag ids: a v2 record with long ids is migrated to t_ + 6 base-62 everywhere (AC 15)', async () => {
    const longId = 't_01HX3K9ABCDEFGHJKMNPQRSTVW';
    backend.set(
      STORAGE_KEYS.tags,
      JSON.stringify({
        schemaVersion: 2,
        updatedAt: '2026-11-01T00:00:00.000Z',
        tags: [{ id: longId, label: 'Trade Binder', key: 'trade binder', colour: null, excludeFromDecks: false, createdAt: '2026-11-01T00:00:00.000Z' }],
        assignments: { 'p:a': [longId], 'p:b': [longId], 'u:c': [longId] },
      }),
    );
    const view: StoredViewState = {
      schemaVersion: 2,
      updatedAt: 'x',
      query: { view: 'entries', tags: { ids: [longId], mode: 'any' } },
      savedViews: [{ id: 'v', name: 'Binder', query: { view: 'entries', tags: { ids: [longId, '_untagged'], mode: 'any' } } }],
    };
    const viewStore = new LocalViewStateStore(backend);
    await viewStore.save(view);
    const store = new LocalTagStore(backend, viewStore, () => Date.parse('2026-11-23T00:00:00.000Z'));
    const t = (await store.load())!;
    const id = t.tags[0].id;
    expect(id).toMatch(SHORT_TAG_ID);
    expect(t.schemaVersion).toBe(3);
    expect(Object.values(t.assignments)).toEqual([[id], [id], [id]]);
    const v = (await viewStore.load())!;
    expect(v.query.tags.ids).toEqual([id]);
    expect(v.savedViews![0].query.tags.ids).toEqual([id, '_untagged']);
    expect(JSON.parse(backend.get(STORAGE_KEYS.tags)!).schemaVersion).toBe(3);
  });

  it('SYNC-016 a colliding new tag id is drawn again', () => {
    const seq = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
    const id = newTagId(new Set(['t_000000']), () => seq.shift()!);
    expect(id).toBe('t_111111');
  });

  it('DECK-092 / DECK-094 the deck store enforces limits and detects conflicts', async () => {
    const s = new LocalDeckStore(backend);
    const id = '0b7c0000-0000-4000-8000-000000000001';
    await s.create(deck(id));
    await expect(s.create(deck(id))).rejects.toMatchObject({ code: 'EXISTS' });
    expect(await s.update(deck(id, { name: 'x' }), 'stale')).toBe('conflict');
    expect(await s.update(deck(id, { name: 'x', updatedAt: 'n' }), '2026-11-23T09:00:00.000Z')).toBe('ok');
    const huge = deck('0b7c0000-0000-4000-8000-000000000002', {
      main: Array.from({ length: 151 }, (_, i) => ({ cardKey: `c${i}`, name: `c${i}`, qty: 1 })),
    });
    await expect(s.create(huge)).rejects.toBeInstanceOf(DeckStoreError);
    expect((await s.delete(id))!.name).toBe('x');
    expect(await s.list()).toEqual([]);
  });

  it('DECK-091 a newer deck record is listed as unreadable, not returned, and not overwritten', async () => {
    const s = new LocalDeckStore(backend);
    backend.set(`${STORAGE_KEYS.deckPrefix}abc`, JSON.stringify({ ...deck('abc'), schemaVersion: 2 }));
    expect(await s.list()).toEqual([]);
    expect(await s.unreadableIds()).toEqual(['abc']);
    await expect(s.update(deck('abc'), 'x')).rejects.toBeInstanceOf(UnreadableRecordError);
  });

  it('SHARE-062 the lock store drops locks whose deck does not exist on save', async () => {
    const s = new LocalDeckLockStore(backend, async () => new Set(['d1']));
    await s.save({
      schemaVersion: 1,
      updatedAt: 'x',
      locks: [
        { deckId: 'd1', lockedAt: 'a' },
        { deckId: 'gone', lockedAt: 'b' },
      ],
    });
    expect((await s.load())!.locks).toEqual([{ deckId: 'd1', lockedAt: 'a' }]);
  });

  it('SYNC-091 clearLocalData removes every Rift Builder record and nothing else', () => {
    backend.set(STORAGE_KEYS.collection, '{}');
    backend.set(STORAGE_KEYS.syncLog, '{}');
    backend.set(`${STORAGE_KEYS.deckPrefix}x`, '{}');
    backend.set('other-app', '1');
    clearLocalData(backend);
    expect(backend.keys()).toEqual(['other-app']);
  });
});
