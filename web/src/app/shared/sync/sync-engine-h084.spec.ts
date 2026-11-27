import { FakeFirestore } from './testing/fakes';
import { Device } from './testing/device';
import { MESSAGES } from './sync-engine';
import { ReadOnlyAreaError } from './tracked-stores';
import { statusText } from './status-text';

/** H-084: sync robustness clean-ups (SPEC-010 SYNC-084, SYNC-063, SYNC-096, SYNC-046). */
async function signedIn(db: FakeFirestore): Promise<Device> {
  const d = new Device(db);
  d.auth.nextSignIn = 'uA';
  await d.engine.signIn('google');
  await d.settle();
  await d.setCard('gust', 1);
  await d.engine.flush();
  return d;
}

describe('H-084 sync robustness', () => {
  let db: FakeFirestore;
  beforeEach(() => (db = new FakeFirestore()));

  it('H-084 (1) a failed start-up (firebase chunk did not load) shows the Error status and one error notice, not signed out', async () => {
    const first = await signedIn(db);
    const d = first.reload();
    d.adapterError = new Error('ChunkLoadError');
    await expect(d.engine.start()).rejects.toThrow('ChunkLoadError'); // the service catches this
    d.engine.startFailed();
    expect(d.status.kind).toBe('error');
    expect(statusText(d.status)).toBe(MESSAGES.writeFailed);
    expect(d.noticeKinds).toEqual([{ message: MESSAGES.writeFailed, kind: 'error' }]);
  });

  it('H-084 (1) a device that expects no session stays signed out (only the notice)', async () => {
    const d = new Device(db);
    await d.engine.start();
    d.engine.startFailed();
    expect(d.status.kind).toBe('signed-out');
  });

  it('H-084 (2) scheduleChange with an unreadable sync log does not reject unhandled and arms no push', async () => {
    const d = await signedIn(db);
    d.stores.log.load = () => Promise.reject(new Error('storage broke'));
    d.engine.scheduleChange();
    await d.settle();
    await new Promise((r) => setTimeout(r, 0));
    expect(d.engine.pendingCount()).toBe(0);
  });

  it('H-084 (3) the clock check forgets every document this device wrote and warns once per pull', async () => {
    const d = new Device(db);
    d.auth.nextSignIn = 'uA';
    await d.engine.signIn('google');
    await d.settle();
    d.now = db.serverTime + 3_600_000; // this device's clock is an hour ahead of the server
    await d.setCard('gust', 2);
    await d.createDeck('Kennen Tempo');
    await d.engine.flush();
    const times = (d.engine as unknown as { writeTimes: Map<string, number> }).writeTimes;
    const before = times.size;
    expect(before).toBeGreaterThan(1);
    await d.advance(70_000);
    await d.engine.syncNow();
    await d.settle();
    const clock = d.notices.filter((n) => n.startsWith('Your device clock is off by about'));
    expect(clock).toHaveLength(1);
    expect(times.size).toBeLessThan(before - 1); // the old `return` forgot only the first document
  });

  it('H-084 (4) a failed account deletion sends no engine notice (the account menu shows the one, with Try again); the status says so', async () => {
    const d = await signedIn(db);
    d.remote.failDeleteAfter = 1;
    expect(await d.engine.deleteAccount()).toBe('failed');
    expect(d.notices).not.toContain(MESSAGES.deleteIncomplete);
    expect(statusText(d.status)).toBe(MESSAGES.deleteIncomplete);
  });

  it('H-084 (5) deck create is refused for a read-only (newer schema) deck, like update and delete', async () => {
    const d = await signedIn(db);
    (d.engine as unknown as { readOnlyAreas: Set<string> }).readOnlyAreas.add('deck:d-newer');
    await expect(d.createDeck('Newer', [], 'd-newer')).rejects.toBeInstanceOf(ReadOnlyAreaError);
    expect(await d.stores.decks.get('d-newer')).toBeNull();
  });
});
