/**
 * SPEC-010 v0.8 engine tests for H-127: an unfinished account deletion offers Try again after a reload,
 * and Cancel deletion while nothing was removed (`deletingRemovedAny`, SYNC-096, SYNC-030, AC 43).
 */
import { FakeFirestore } from './testing/fakes';
import { Device, T0 } from './testing/device';
import { MESSAGES } from './sync-engine';
import { statusText } from './status-text';
import type { RemoteErrorCode } from './sync-types';

async function signedInLaptop(db: FakeFirestore): Promise<Device> {
  const d = new Device(db);
  d.auth.nextSignIn = 'uA';
  await d.engine.signIn('google');
  await d.settle();
  await d.setCard('hextech ray', 1);
  await d.createDeck('Kennen Tempo');
  await d.engine.flush();
  return d;
}

/** A fresh page load that restores the session of `uA`. */
async function reload(d: Device): Promise<Device> {
  const r = d.reload();
  r.auth.uid = 'uA';
  await r.engine.start();
  await r.settle();
  return r;
}

/** The next deletion attempt fails at its `n`-th delete (0 = the account document). */
function failDeleteAt(d: Device, n: number, code: RemoteErrorCode = 'unknown'): void {
  d.remote.failDeleteAfter = d.db.deletes + n;
  d.remote.failDeleteCode = code;
}

describe('SyncEngine unfinished deletion and Cancel deletion (SPEC-010 SYNC-096, AC 43)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  it('SYNC-096 / AC 43 the first delete fails: nothing deleted, deletingRemovedAny false, Try again and Cancel offered, no sync', async () => {
    const d = await signedInLaptop(db);
    failDeleteAt(d, 0);
    expect(await d.engine.deleteAccount()).toBe('failed');
    expect(db.get('users/uA')).toBeDefined();
    const log = await d.log();
    expect(log.deletingUid).toBe('uA');
    expect(log.deletingRemovedAny).toBe(false);
    expect(d.notices).not.toContain(MESSAGES.deleteIncomplete); // H-084: the account menu shows the one notice
    expect(d.status).toMatchObject({ kind: 'error', message: MESSAGES.deleteIncomplete });
    expect(d.engine.unfinishedDeletion()).toEqual({ canCancel: true });

    db.resetCounts();
    const r = await reload(d);
    expect(db.reads + db.writes).toBe(0);
    expect(r.status).toMatchObject({ kind: 'error', message: MESSAGES.deleteIncomplete });
    expect(r.engine.unfinishedDeletion()).toEqual({ canCancel: true });
  });

  it('AC 43 after a reload, Try again failing the first delete again keeps both Try again and Cancel deletion', async () => {
    const d = await signedInLaptop(db);
    failDeleteAt(d, 0);
    await d.engine.deleteAccount();
    const r = await reload(d);
    failDeleteAt(r, 0);
    expect(await r.engine.deleteAccount()).toBe('failed');
    expect((await r.log()).deletingRemovedAny).toBe(false);
    expect(r.engine.unfinishedDeletion()).toEqual({ canCancel: true });
    expect(r.status).toMatchObject({ kind: 'error', message: MESSAGES.deleteIncomplete });
  });

  it('AC 43 Cancel deletion clears deletingUid and deletingRemovedAny, says so, checks the account and pushes a pending card edit', async () => {
    const d = await signedInLaptop(db);
    failDeleteAt(d, 0);
    await d.engine.deleteAccount();
    const r = await reload(d);
    await r.setCard('hextech ray', 2); // stays pending while the deletion is unfinished
    await r.advance(5000);
    expect(db.get('users/uA/state/collection').cards['hextech ray'].q).toBe(1);
    expect((await r.log()).pending.cards).toEqual(['hextech ray']);

    db.resetCounts();
    expect(await r.engine.cancelDeletion()).toBe(true);
    await r.settle();
    const log = await r.log();
    expect(log.deletingUid ?? null).toBeNull();
    expect(log.deletingRemovedAny).toBeUndefined();
    expect(r.notices).toContain(MESSAGES.deleteNotDone);
    expect(r.engine.unfinishedDeletion()).toBeNull();
    expect(r.auth.calls).not.toContain('checkAccount'); // the account document was found
    expect(r.notices).not.toContain(MESSAGES.halfDeleted);
    expect(db.reads).toBeGreaterThan(0);
    expect(db.get('users/uA/state/collection').cards['hextech ray'].q).toBe(2);
    expect(log.pending.cards).toEqual([]);
    expect(r.status.kind).toBe('synced');

    // normal syncing resumed: the next edit is pushed too
    await r.setCard('hextech ray', 3);
    await r.advance(2500);
    expect(db.get('users/uA/state/collection').cards['hextech ray'].q).toBe(3);
  });

  it('SYNC-096 a failed deck-list read deletes nothing, so Cancel deletion is offered', async () => {
    const d = await signedInLaptop(db);
    d.remote.failDeckList = true;
    expect(await d.engine.deleteAccount()).toBe('failed');
    expect(db.get('users/uA')).toBeDefined();
    expect((await d.log()).deletingRemovedAny).toBe(false);
    expect(d.engine.unfinishedDeletion()).toEqual({ canCancel: true });
  });

  it('AC 43 users/uA deleted, then the deck deletes fail: deletingRemovedAny true, only Try again, also after a reload; Try again completes', async () => {
    const d = await signedInLaptop(db);
    failDeleteAt(d, 1);
    expect(await d.engine.deleteAccount()).toBe('failed');
    expect(db.get('users/uA')).toBeUndefined();
    expect((await d.log()).deletingRemovedAny).toBe(true);
    expect(d.engine.unfinishedDeletion()).toEqual({ canCancel: false });

    const r = await reload(d);
    expect((await r.log()).deletingRemovedAny).toBe(true);
    expect(r.engine.unfinishedDeletion()).toEqual({ canCancel: false });
    expect(r.notices).not.toContain(MESSAGES.halfDeleted);
    expect(await r.engine.cancelDeletion()).toBe(false);
    expect((await r.log()).deletingUid).toBe('uA');
    expect(r.notices).not.toContain(MESSAGES.deleteNotDone);

    // a retry whose first delete fails again never sets it back to false
    failDeleteAt(r, 0);
    expect(await r.engine.deleteAccount()).toBe('failed');
    expect((await r.log()).deletingRemovedAny).toBe(true);

    expect(await r.engine.deleteAccount()).toBe('ok');
    expect(r.auth.deletedUser).toBe(true);
    expect([...db.docs.keys()].filter((k) => k.startsWith('users/uA'))).toEqual([]);
    expect(r.backend.keys().filter((k) => k.startsWith('rift.'))).toEqual([]);
    expect(r.notices).toContain(MESSAGES.deletedOwn);
    expect(r.engine.unfinishedDeletion()).toBeNull();
  });

  it("AC 43 the first delete of users/uA timed out ('unconfirmed'): it may have landed, so Cancel deletion is not offered", async () => {
    const d = await signedInLaptop(db);
    failDeleteAt(d, 0, 'unconfirmed');
    expect(await d.engine.deleteAccount()).toBe('failed');
    expect((await d.log()).deletingRemovedAny).toBe(true);
    expect(d.engine.unfinishedDeletion()).toEqual({ canCancel: false });
    const r = await reload(d);
    expect(r.engine.unfinishedDeletion()).toEqual({ canCancel: false });
  });

  it('SYNC-096 every document deleted but the Auth user not: deletingRemovedAny true, only Try again', async () => {
    const d = await signedInLaptop(db);
    d.auth.deleteResults = ['needs-recent-sign-in'];
    d.auth.reauthResult = 'needs-sign-in';
    expect(await d.engine.deleteAccount()).toBe('needs-sign-in');
    expect((await d.log()).deletingRemovedAny).toBe(true);
    expect(d.engine.unfinishedDeletion()).toEqual({ canCancel: false });
  });

  it('SYNC-030 / SYNC-091 deletingRemovedAny is cleared with deletingUid by a completed deletion and by a sign-out (H-083 default: allowed)', async () => {
    const d = await signedInLaptop(db);
    failDeleteAt(d, 0);
    await d.engine.deleteAccount();
    expect(await d.engine.signOut()).toBe('ok');
    let log = await d.log();
    expect(log.deletingUid ?? null).toBeNull();
    expect(log.deletingRemovedAny).toBeUndefined();

    const e = await signedInLaptop(new FakeFirestore());
    failDeleteAt(e, 0);
    await e.engine.deleteAccount();
    expect(await e.engine.deleteAccount()).toBe('ok');
    log = await e.log();
    expect(log.deletingUid ?? null).toBeNull();
    expect(log.deletingRemovedAny).toBeUndefined();
  });

  it('SYNC-096 Cancel deletion is not available without an unfinished deletion', async () => {
    const d = await signedInLaptop(db);
    expect(d.engine.unfinishedDeletion()).toBeNull();
    expect(await d.engine.cancelDeletion()).toBe(false);
    expect(d.notices).not.toContain(MESSAGES.deleteNotDone);
  });

  it('SYNC-084 / SYNC-096 / AC 54 offline with 3 pending changes, the unfinished deletion outranks Offline: the exact Error text, no count', async () => {
    const d = await signedInLaptop(db);
    d.remote.offline = true; // the next push fails offline
    await d.setCard('hextech ray', 2);
    await d.setCard('lightning rush', 1);
    await d.setCard('mystic shot', 1);
    await d.advance(2500);
    expect(d.engine.status()).toMatchObject({ kind: 'offline' });
    expect(d.engine.pendingCount()).toBe(3);

    d.remote.offline = false;
    failDeleteAt(d, 0);
    expect(await d.engine.deleteAccount()).toBe('failed');
    d.online = false; // the connection drops afterwards
    for (const s of [d.engine.status(), d.status]) {
      expect(s).toMatchObject({ kind: 'error', message: MESSAGES.deleteIncomplete, pendingCount: 3 });
      expect(statusText(s)).toBe("Some data couldn't be deleted. Try again.");
    }
  });

  it('SYNC-084 / SYNC-096 / AC 54 paused (quota) with pending changes, the unfinished deletion outranks Paused', async () => {
    const d = await signedInLaptop(db);
    d.remote.quota = true;
    await d.setCard('hextech ray', 2);
    await d.advance(2500);
    expect(d.engine.status()).toMatchObject({ kind: 'paused' });

    d.remote.quota = false;
    failDeleteAt(d, 0);
    expect(await d.engine.deleteAccount()).toBe('failed');
    expect(d.status).toMatchObject({ kind: 'error', message: MESSAGES.deleteIncomplete, pendingCount: 1 });
    expect(statusText(d.status)).toBe("Some data couldn't be deleted. Try again.");

    // Cancel deletion: the deletion no longer outranks anything, and the count is back while it syncs
    expect(await d.engine.cancelDeletion()).toBe(true);
    await d.settle();
    expect(d.engine.status().kind).not.toBe('error');
  });
});
