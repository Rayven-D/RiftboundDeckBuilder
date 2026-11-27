import { FakeFirestore } from './testing/fakes';
import { Device, T0, card } from './testing/device';
import { statusText } from './status-text';

/**
 * SPEC-010 SYNC-126 (v0.18, H-667): a major action starts one immediate full sync, pull then push, with no 2 s
 * debounce (SYNC-121) and no 60 s pull skip (SYNC-043); a sync already running queues one follow-up; offline or
 * signed out nothing is attempted. ACs 83 to 87. The feature code calls `AppStores.majorAction()` (wired to
 * `SyncEngine.majorAction()` by SyncService); here the engine is called directly after the local save, as there.
 */
async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

/** Records the order of remote calls on a device. */
function spyRemote(d: Device): string[] {
  const calls: string[] = [];
  const pull = d.remote.pull.bind(d.remote);
  const push = d.remote.push.bind(d.remote);
  d.remote.pull = async (...a) => {
    calls.push('pull');
    return pull(...a);
  };
  d.remote.push = async (...a) => {
    calls.push('push');
    return push(...a);
  };
  return calls;
}

describe('SPEC-010 SYNC-126 sync on a major action (H-667)', () => {
  let db: FakeFirestore;
  let d: Device;
  beforeEach(async () => {
    db = new FakeFirestore();
    d = new Device(db, { now: T0 });
    await signIn(d);
    await d.setCard('hextech ray', 3);
    await d.setCard('gust', 2);
    await d.advance(3000); // the debounced push: synced, nothing pending
    d.now += 10_000; // synced 10 s ago
    db.resetCounts();
  });

  it('SYNC-126 / SYNC-043 / SYNC-121 AC 83 a deck import save: local first, then with no timer an immediate pull (2 reads) before one deck set()', async () => {
    const calls = spyRemote(d);
    const deck = await d.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
    expect(await d.stores.decks.get(deck.id)).not.toBeNull(); // saved locally first
    d.engine.majorAction();
    await d.settle(); // no clock advance: no debounce timer involved
    expect(calls).toEqual(['pull', 'push']);
    expect(db.reads).toBe(2);
    expect(db.writeLog).toEqual([[`users/uA/decks/${deck.id}`, 'set']]);
    expect(statusText(d.status)).toMatch(/^Synced · /);
    expect(d.engine.pendingCount()).toBe(0);
  });

  it('SYNC-121 AC 83 small edits keep the debounce: three + presses give one write about 2 s after the last and no immediate pull', async () => {
    const calls = spyRemote(d);
    await d.setCard('gust', 3);
    await d.setCard('gust', 4);
    await d.setCard('gust', 5);
    await d.settle();
    expect(calls).toEqual([]);
    await d.advance(2500);
    expect(calls).toEqual(['push']); // the last pull was under 60 s ago (SYNC-043)
    expect(db.writes).toBe(1);
  });

  it('SYNC-126 AC 84 a collection import commit, a name lock and a deck toggle each sync at once: one write each, the deck toggle one update() for every name', async () => {
    const deck = await d.createDeck('Kennen Tempo', [card('hextech ray', 3), card('gust', 2)]);
    d.engine.majorAction();
    await d.settle();
    db.resetCounts();
    const calls = spyRemote(d);
    await d.replaceCollection({ 'hextech ray': { quantity: 3, byPrinting: {} }, gust: { quantity: 2, byPrinting: {} }, ash: { quantity: 1, byPrinting: {} } });
    d.engine.majorAction();
    await d.settle();
    expect(calls).toEqual(['pull', 'push']);
    expect(db.writeLog).toEqual([['users/uA/state/collection', 'set']]);

    db.resetCounts();
    calls.length = 0;
    await d.lockName(deck.id, 'hextech ray');
    d.engine.majorAction();
    await d.settle();
    expect(calls).toEqual(['pull', 'push']);
    expect(db.writeLog).toHaveLength(1);
    expect(Object.keys(db.pushLog[0].locks!.locks)).toEqual([`${deck.id}|hextech ray`]);

    db.resetCounts();
    calls.length = 0;
    await d.unlock(deck.id);
    await d.lock(deck.id);
    d.engine.majorAction();
    await d.settle();
    expect(calls).toEqual(['pull', 'push']);
    expect(db.writeLog).toEqual([['users/uA/state/locks', 'update']]);
    expect(Object.keys(db.pushLog[0].locks!.locks).sort()).toEqual([`${deck.id}|gust`, `${deck.id}|hextech ray`]);
  });

  it('SYNC-126 (e) AC 85 three locks while a sync runs: no parallel sync; exactly one follow-up pass pushes all three in one update()', async () => {
    const a = await d.createDeck('A', [card('hextech ray', 1)]);
    const b = await d.createDeck('B', [card('gust', 1)]);
    const c = await d.createDeck('C', [card('hextech ray', 1)]);
    d.engine.majorAction();
    await d.settle();
    db.resetCounts();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const pull = d.remote.pull.bind(d.remote);
    let pulls = 0;
    let running = 0;
    let maxRunning = 0;
    d.remote.pull = async (...args) => {
      pulls++;
      running++;
      maxRunning = Math.max(maxRunning, running);
      if (pulls === 1) await gate;
      try {
        return await pull(...args);
      } finally {
        running--;
      }
    };
    void d.engine.syncNow(); // a sync is running: its pull has not returned
    await Promise.resolve();
    for (const x of [a, b, c]) {
      await d.lockName(x.id, x.main[0].cardKey);
      d.engine.majorAction();
    }
    expect(pulls).toBe(1);
    release();
    await d.settle();
    expect(pulls).toBe(2); // 2 passes, not 4
    expect(maxRunning).toBe(1);
    const lockWrites = db.pushLog.filter((p) => p.locks);
    expect(lockWrites).toHaveLength(1);
    expect(Object.keys(lockWrites[0].locks!.locks)).toHaveLength(3);
  });

  it('SYNC-126 (d) AC 85 offline: no pull or push; the change stays pending; back online the regular triggers push it', async () => {
    d.online = false;
    d.remote.offline = true;
    const calls = spyRemote(d);
    await d.replaceCollection({ 'hextech ray': { quantity: 3, byPrinting: {} }, gust: { quantity: 9, byPrinting: {} } });
    d.engine.majorAction();
    await d.settle();
    expect(calls).toEqual([]);
    expect(d.engine.pendingCount()).toBe(1);
    d.online = true;
    d.remote.offline = false;
    await d.engine.syncNow();
    await d.settle();
    expect(calls).toEqual(['pull', 'push']);
    expect(d.engine.pendingCount()).toBe(0);
  });

  it('SYNC-126 (d) / SYNC-125 signed out: nothing is read or written', async () => {
    const out = new Device(db, { now: T0 });
    db.resetCounts();
    out.engine.majorAction();
    await out.settle();
    expect(db.reads + db.writes).toBe(0);
  });

  it('SYNC-126 (f) / SYNC-085 AC 86 a rejected write after a deck import save: saved locally, still pending, the existing error text, no new notice', async () => {
    d.remote.failRules.push({ ref: '*', code: 'unknown', once: true });
    const notices = d.notices.length;
    const deck = await d.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
    d.engine.majorAction();
    await d.settle();
    expect(await d.stores.decks.get(deck.id)).not.toBeNull();
    expect(d.engine.pendingCount()).toBe(1);
    expect(statusText(d.status)).toBe("Couldn't sync. Your changes are saved on this device. Try again. · 1 change not synced yet");
    expect(d.notices.length).toBe(notices);
    d.engine.majorAction(); // the next trigger pushes it
    await d.settle();
    expect(d.engine.pendingCount()).toBe(0);
  });

  it('SYNC-126 (a) 4 / SYNC-035 AC 87 a delete: nothing for 10 s; when the window ends an immediate pull and one tombstone set(); Undo inside the window: nothing at all', async () => {
    const deck = await d.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
    d.engine.majorAction();
    await d.settle();
    db.resetCounts();
    const calls = spyRemote(d);
    await d.stores.decks.delete(deck.id);
    await d.advance(9_000);
    expect(calls).toEqual([]);
    await d.advance(2_000);
    expect(calls).toEqual(['pull', 'push']);
    expect(db.writeLog).toEqual([[`users/uA/decks/${deck.id}`, 'set']]);
    expect(db.get(`users/uA/decks/${deck.id}`).deletedAt).not.toBeNull();

    const other = await d.createDeck('Other', [card('gust', 1)]);
    d.engine.majorAction();
    await d.settle();
    calls.length = 0;
    const removed = (await d.stores.decks.delete(other.id))!;
    await d.advance(3_000);
    await d.stores.decks.create(removed); // Undo inside the window
    await d.advance(20_000);
    expect(calls).toEqual([]);
  });

  it('SYNC-126 (a) 4 / SYNC-035 / SHARE-024 AC 87 a locked deck deleted: nothing pushed within 10 s; Undo keeps its name locks with identical timestamps and pushes nothing; without Undo the deck tombstone and the lock removals go in one push after the window', async () => {
    const deck = await d.createDeck('Kennen Tempo', [card('hextech ray', 3), card('gust', 2)]);
    await d.lock(deck.id);
    d.engine.majorAction();
    await d.settle();
    const lockedBefore = (await d.stores.locks.load())!.locks;
    const cloudBefore = structuredClone(db.get('users/uA/state/locks').locks);
    expect(lockedBefore).toHaveLength(2);
    db.resetCounts();
    const calls = spyRemote(d);

    // Undo inside the window: the locks are kept exactly, nothing is pulled or pushed.
    const removed = (await d.stores.decks.delete(deck.id))!;
    await d.advance(4_000);
    expect(calls).toEqual([]);
    expect((await d.stores.locks.load())!.locks).toEqual(lockedBefore); // stored, ignored while the deck is gone
    await d.stores.decks.create(removed);
    await d.advance(20_000);
    expect(calls).toEqual([]);
    expect(db.writes).toBe(0);
    expect((await d.stores.locks.load())!.locks).toEqual(lockedBefore);
    expect((await d.log()).pending.locks).toEqual([]);
    expect(db.get('users/uA/state/locks').locks).toEqual(cloudBefore);

    // No Undo: nothing for 10 s, then one pull and ONE push carrying the deck tombstone and both lock removals.
    await d.stores.decks.delete(deck.id);
    await d.advance(9_000);
    expect(calls).toEqual([]);
    expect(db.writes).toBe(0);
    await d.advance(2_000);
    expect(calls).toEqual(['pull', 'push']);
    expect(db.pushLog).toHaveLength(1);
    expect(db.pushLog[0].decks![deck.id]).toMatchObject({ deletedAt: expect.any(Number) });
    expect(Object.entries(db.pushLog[0].locks!.locks).map(([k, v]) => [k, v.lockedAt]).sort()).toEqual([
      [`${deck.id}|gust`, null],
      [`${deck.id}|hextech ray`, null],
    ]);
    expect(await d.lockKeys()).toEqual([]);
    expect(d.engine.pendingCount()).toBe(0);
  });

  it('SYNC-126 (a) 5 / SYNC-121 AC 87 Duplicate syncs at once; a rename keeps the 2 s debounce with no immediate pull', async () => {
    const deck = await d.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
    d.engine.majorAction();
    await d.settle();
    const calls = spyRemote(d);
    await d.createDeck('Kennen Tempo (copy)', [card('hextech ray', 3)]); // Duplicate saves a new deck…
    d.engine.majorAction(); // …and the page calls the major action
    await d.settle();
    expect(calls).toEqual(['pull', 'push']);
    calls.length = 0;
    await d.editDeck(deck.id, { name: 'Kennen budget' });
    await d.settle();
    expect(calls).toEqual([]);
    await d.advance(2500);
    expect(calls).toEqual(['push']);
  });
});
