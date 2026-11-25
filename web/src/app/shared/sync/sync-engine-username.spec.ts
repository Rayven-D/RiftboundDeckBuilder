/**
 * SPEC-010 v0.14 engine side of the username (H-176): where it is stored and read (SYNC-156), the one-time prompt
 * trigger (SYNC-154, SYNC-048 case (a)) and saving (SYNC-155). ACs 71, 75, 76.
 */
import { FakeFirestore } from './testing/fakes';
import { Device, T0 } from './testing/device';
import { THEME_KEY } from '../theme/theme';

async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

async function reopen(d: Device): Promise<Device> {
  const r = d.reload();
  r.auth.uid = 'uA';
  await r.engine.start();
  await r.settle();
  return r;
}

const account = (extra: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  createdAt: T0,
  updatedAt: T0,
  syncedAt: T0,
  lastClientVersion: 'test-1',
  ...extra,
});

describe('SyncEngine username (SPEC-010 SYNC-154…156, H-176)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  it('AC 75 / SYNC-154 a first sign-in that creates the account asks for the prompt once; the account has no username', async () => {
    const laptop = new Device(db);
    await signIn(laptop);
    expect(laptop.accountCreated).toBe(1);
    expect(db.get('users/uA')).toBeDefined();
    expect('username' in db.get('users/uA')).toBe(false); // never set at creation (SYNC-156)
    expect(laptop.engine.username()).toBeNull();
    expect((await laptop.log()).username).toBeNull();
  });

  it('AC 75 / SYNC-154 an existing account signing in on a new device, or a pre-v0.14 account, gets no prompt', async () => {
    db.docs.set('users/uA', account());
    const phone = new Device(db);
    await signIn(phone);
    expect(phone.accountCreated).toBe(0);
    db.docs.set('users/uB', account({ username: 'RJ Smith' }));
    const tablet = new Device(db);
    await signIn(tablet, 'uB');
    expect(tablet.accountCreated).toBe(0);
  });

  it('AC 75 / SYNC-154 never again on its own: not after a reload or a later sign-in', async () => {
    const laptop = new Device(db);
    await signIn(laptop);
    expect(laptop.accountCreated).toBe(1);
    const reloaded = await reopen(laptop);
    expect(reloaded.accountCreated).toBe(0);
    await reloaded.engine.signOut();
    await signIn(reloaded);
    expect(reloaded.accountCreated).toBe(0);
  });

  it('AC 71 / SYNC-156 (b) the first sync reads the username into the sync log; a reload, also offline, has it at once', async () => {
    db.docs.set('users/uA', account({ username: 'RJ Smith' }));
    const phone = new Device(db);
    await signIn(phone);
    expect(phone.engine.username()).toBe('RJ Smith');
    expect((await phone.log()).username).toBe('RJ Smith');
    const offline = phone.reload();
    offline.remote.offline = true;
    offline.auth.uid = 'uA';
    expect(offline.stores.log.peek()?.username).toBe('RJ Smith'); // readable at the first frame
    await offline.engine.start();
    await offline.settle();
    expect(offline.engine.username()).toBe('RJ Smith');
  });

  it('AC 76 / SYNC-155 Save: exactly one write, an update() of users/uA (username, updatedAt, syncedAt), no read; the log has the name', async () => {
    const laptop = new Device(db);
    await signIn(laptop);
    db.resetCounts();
    const pushesBefore = db.pushLog.length;
    expect(await laptop.engine.setUsername('RJ Smith')).toBe('ok');
    expect(db.writes).toBe(1);
    expect(db.reads).toBe(0);
    expect(db.writeLog).toEqual([['users/uA', 'update']]);
    expect(db.pushLog.length).toBe(pushesBefore); // not a push, not a pending item
    const doc = db.get('users/uA');
    expect(doc.username).toBe('RJ Smith');
    expect(doc.createdAt).toBe(T0); // update, not set
    expect(laptop.engine.username()).toBe('RJ Smith');
    expect((await laptop.log()).username).toBe('RJ Smith');
    expect((await laptop.log()).pending.account).toBe(false);
    expect(laptop.engine.pendingCount()).toBe(0);
  });

  it('AC 76 / SYNC-155 the other device shows the new name from its next account check (start-up), not live', async () => {
    const laptop = new Device(db);
    await signIn(laptop);
    const phone = new Device(db);
    await signIn(phone);
    await laptop.engine.setUsername('RJ Smith');
    expect(phone.engine.username()).toBeNull(); // not live
    const phoneAgain = await reopen(phone);
    expect(phoneAgain.engine.username()).toBe('RJ Smith');
  });

  it('AC 76 / SYNC-155 a failed write keeps nothing; offline is refused before any request', async () => {
    const laptop = new Device(db);
    await signIn(laptop);
    laptop.remote.failRules.push({ ref: 'username', code: 'unknown', once: true });
    expect(await laptop.engine.setUsername('RJ Smith')).toBe('failed');
    expect(db.get('users/uA').username).toBeUndefined();
    expect(laptop.engine.username()).toBeNull();
    laptop.online = false;
    db.resetCounts();
    expect(await laptop.engine.setUsername('RJ Smith')).toBe('offline');
    expect(db.writes).toBe(0);
  });

  it('AC 75 / SYNC-154 Save waits for the first sync: setUsername is "not-ready" until the gate opens', async () => {
    const laptop = new Device(db);
    laptop.auth.nextSignIn = 'uA';
    // Hold the full read, so the first-sign-in flow is still running when the user presses Save.
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    const pull = laptop.remote.pull.bind(laptop.remote);
    laptop.remote.pull = async (...args) => {
      await held;
      return pull(...args);
    };
    const signingIn = laptop.engine.signIn('google');
    await new Promise((r) => setTimeout(r, 0));
    expect(await laptop.engine.setUsername('RJ Smith')).toBe('not-ready');
    release();
    await signingIn;
    await laptop.settle();
    expect(laptop.engine.gate()).toBe('open');
    expect(await laptop.engine.setUsername('RJ Smith')).toBe('ok');
  });

  it('AC 76 / SYNC-156 (b) / AC 78 sign-out clears the cached username with the log (the header shows Sign in) and keeps the theme', async () => {
    db.docs.set('users/uA', account({ username: 'RJ Smith' }));
    const laptop = new Device(db);
    laptop.backend.set(THEME_KEY, 'dark');
    await signIn(laptop);
    expect(laptop.engine.username()).toBe('RJ Smith');
    await laptop.engine.signOut();
    expect(laptop.engine.username()).toBeNull();
    expect(laptop.stores.log.peek()).toBeNull();
    expect(laptop.backend.get(THEME_KEY)).toBe('dark');
    expect(laptop.backend.keys().filter((k) => k.startsWith('rift.'))).toEqual([]);
  });

  it('AC 78 / SYNC-142 (4) another account signing in on a device that held uA clears the cache and keeps the theme', async () => {
    db.docs.set('users/uA', account({ username: 'RJ Smith' }));
    const laptop = new Device(db);
    laptop.backend.set(THEME_KEY, 'light');
    await signIn(laptop);
    await laptop.engine.signOut();
    await signIn(laptop, 'uB');
    expect(laptop.engine.username()).toBeNull(); // uB has none
    expect(laptop.backend.get(THEME_KEY)).toBe('light');
  });

  it('AC 78 / SYNC-096 account deletion deletes users/uA with its username and keeps the theme', async () => {
    const laptop = new Device(db);
    laptop.backend.set(THEME_KEY, 'dark');
    await signIn(laptop);
    await laptop.engine.setUsername('RJ Smith');
    expect(await laptop.engine.deleteAccount()).toBe('ok');
    expect(db.get('users/uA')).toBeUndefined();
    expect(laptop.engine.username()).toBeNull();
    expect(laptop.backend.get(THEME_KEY)).toBe('dark');
  });

  it('AC 76 / SYNC-100 the username is stored only in users/uA.username and StoredSyncLog.username; no theme field anywhere', async () => {
    const laptop = new Device(db);
    await signIn(laptop);
    await laptop.setCard('hextech ray', 2);
    await laptop.engine.flush();
    await laptop.engine.setUsername('RJ Smith');
    const where = [...db.docs.entries()].filter(([, d]) => JSON.stringify(d).includes('RJ Smith')).map(([p]) => p);
    expect(where).toEqual(['users/uA']);
    const keys = laptop.backend.keys().filter((k) => (laptop.backend.get(k) ?? '').includes('RJ Smith'));
    expect(keys).toEqual(['rift.syncLog']);
    expect(JSON.stringify([...db.docs.values()])).not.toMatch(/theme/i);
    expect(JSON.stringify(await laptop.log())).not.toMatch(/theme/i);
  });
});
