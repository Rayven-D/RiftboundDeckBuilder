/**
 * SPEC-010 v0.21.0 engine tests: a sign-in that finds `sessionExpected` false runs the first-sign-in flow
 * (SYNC-048 / SYNC-004, AC 90, H-682 part 1), and signing out while an account deletion runs is not a failure
 * (SYNC-096, H-133).
 */
import { FakeFirestore } from './testing/fakes';
import { Device, T0 } from './testing/device';
import { MESSAGES } from './sync-engine';

async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

const stateOrDeckWrites = (db: FakeFirestore) => db.writeLog.filter(([p]) => /\/(state|decks)\//.test(p));

describe('SyncEngine sign-in with sessionExpected false (SPEC-010 SYNC-048, SYNC-004, AC 90)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  /** A log as v0.7 "Keep a copy" left it: linked uid uA, lastFullSyncAt set, sessionExpected false, 5 cards. */
  async function keepACopyLog(): Promise<Device> {
    const laptop = new Device(db);
    await signIn(laptop);
    for (const k of ['a', 'b', 'c', 'd', 'e']) await laptop.setCard(`card ${k}`, 2);
    await laptop.engine.flush();
    const log = await laptop.log();
    await laptop.stores.log.save({ ...log, sessionExpected: false });
    const r = laptop.reload();
    await r.engine.start(); // no session expected: Firebase is not loaded, nothing syncs
    await r.setCard('card a', 9); // changed while signed out, stamped pending
    return r;
  }

  it('AC 90 / SYNC-048: an old Keep a copy log signing in as the same uid clears first, pushes nothing, downloads', async () => {
    const r = await keepACopyLog();
    const before = await r.log();
    expect(before.uid).toBe('uA');
    expect(before.lastFullSyncAt).not.toBeNull();
    expect(before.sessionExpected).toBe(false);
    expect(before.pending.cards).toContain('card a');

    db.resetCounts();
    await signIn(r, 'uA');

    expect(stateOrDeckWrites(db)).toEqual([]); // nothing pushed
    expect(db.writes).toBe(0); // same build: SYNC-012 asks for no account update()
    expect(db.get('users/uA/state/collection').cards['card a'].q).toBe(2);
    expect(await r.quantity('card a')).toBe(2); // the signed-out change was cleared, the cloud downloaded
    expect(await r.quantity('card e')).toBe(2);
    const log = await r.log();
    expect(log.uid).toBe('uA');
    expect(log.lastFullSyncAt).not.toBeNull();
    expect(log.sessionExpected).toBe(true);
    expect(log.pending.cards).toEqual([]);
    expect(r.engine.gate()).toBe('open');
  });

  it('AC 90 / SYNC-004: a reload after that sign-in but before the first sync completed runs the flow again from step 1', async () => {
    const r = await keepACopyLog();
    r.remote.offline = true; // the full read fails: the first sync stays incomplete
    await signIn(r, 'uA');
    expect((await r.log()).lastFullSyncAt).toBeNull();

    const back = r.reload();
    back.auth.uid = 'uA';
    back.remote.offline = false;
    db.resetCounts();
    await back.engine.start();
    await back.settle();
    expect(stateOrDeckWrites(db)).toEqual([]);
    expect(db.get('users/uA/state/collection').cards['card a'].q).toBe(2);
    expect(await back.quantity('card a')).toBe(2);
    expect(back.engine.gate()).toBe('open');
  });

  it('AC 90 / SYNC-086: a lost session (sessionExpected true, sessionLostUid uA) signing in as uA still resumes and pushes', async () => {
    const laptop = new Device(db);
    await signIn(laptop);
    await laptop.setCard('card a', 2);
    await laptop.engine.flush();
    laptop.remote.offline = true;
    await laptop.setCard('card a', 7);
    laptop.remote.offline = false;
    const r = laptop.reload();
    r.auth.uid = null; // token revoked
    r.auth.account = 'signed-out';
    await r.engine.start();
    await r.settle();
    expect((await r.log()).sessionLostUid).toBe('uA');
    expect((await r.log()).sessionExpected).toBe(true);

    r.auth.account = 'ok';
    await signIn(r, 'uA');
    expect(await r.quantity('card a')).toBe(7); // not cleared
    expect(db.get('users/uA/state/collection').cards['card a'].q).toBe(7); // pushed
    expect(r.engine.gate()).toBe('open');
  });
});

describe('SyncEngine sign-out during an account deletion (SPEC-010 SYNC-096, H-133)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  it("SYNC-096 / H-133: signing out while deleteAll runs returns 'signed-out', not 'failed'; no Error status remains", async () => {
    const d = new Device(db);
    await signIn(d);
    await d.setCard('card a', 1);
    await d.engine.flush();
    const deleteAll = d.remote.deleteAll.bind(d.remote);
    vi.spyOn(d.remote, 'deleteAll').mockImplementation(async (uid) => {
      await d.engine.signOut();
      d.remote.failDeleteAfter = d.db.deletes; // the in-flight delete then fails
      return deleteAll(uid);
    });

    expect(await d.engine.deleteAccount()).toBe('signed-out');
    expect(d.notices).not.toContain(MESSAGES.deleteIncomplete);
    expect(d.status.kind).not.toBe('error');
    expect(d.engine.unfinishedDeletion()).toBeNull();
    expect((await d.log()).deletingUid ?? null).toBeNull();
    expect(d.engine.gate()).toBe('signed-out');
  });

  it("SYNC-096 / H-133: Try again on a signed-out device returns 'signed-out' and makes no request", async () => {
    const d = new Device(db);
    await signIn(d);
    await d.engine.signOut();
    db.resetCounts();
    expect(await d.engine.deleteAccount()).toBe('signed-out');
    expect(db.reads + db.writes + db.deletes).toBe(0);
  });
});

describe('SyncEngine account deletion step 3 messages (SPEC-010 SYNC-096 step 3 (b), AC 92, H-682 part 2)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  const kindOf = (d: Device, message: string) => d.noticeKinds.find((n) => n.message === message)?.kind;

  it("AC 92 the exact RJ-approved step 3 email-link text (H-684)", () => {
    expect(MESSAGES.reauthNeededAfterData).toBe(
      'Your data was deleted. To finish deleting your account, sign out, sign in again, then choose Delete account and data within 5 minutes.',
    );
  });

  it("AC 92 / SYNC-096 (b): every document deleted and 'needs-sign-in' at step 3 shows the info notice, not the step 1 or not-deleted text; deletingUid stays", async () => {
    const d = new Device(db);
    await signIn(d);
    await d.setCard('card a', 1);
    await d.createDeck('Kennen Tempo');
    await d.engine.flush();
    d.auth.deleteResults = ['needs-recent-sign-in'];
    d.auth.reauthResult = 'needs-sign-in';

    expect(await d.engine.deleteAccount()).toBe('needs-sign-in');
    expect([...db.docs.keys()]).toEqual([]);
    expect(d.auth.deletedUser).toBe(false);
    expect(kindOf(d, MESSAGES.reauthNeededAfterData)).toBe('info');
    expect(d.notices).not.toContain(MESSAGES.reauthNeeded);
    expect(d.notices).not.toContain(MESSAGES.deleteNotDone);
    const log = await d.log();
    expect(log.deletingUid).toBe('uA');
    expect(log.deletingRemovedAny).toBe(true);
    expect(d.engine.unfinishedDeletion()).toEqual({ canCancel: false });
  });

  it('AC 92 / SYNC-096 step 1 keeps its own text when nothing is deleted yet', async () => {
    const d = new Device(db);
    await signIn(d);
    d.auth.recentSignIn = false;
    d.auth.reauthResult = 'needs-sign-in';
    expect(await d.engine.deleteAccount()).toBe('needs-sign-in');
    expect(kindOf(d, MESSAGES.reauthNeeded)).toBe('info');
    expect(d.notices).not.toContain(MESSAGES.reauthNeededAfterData);
    expect(db.get('users/uA')).toBeDefined();
  });

  it('AC 92 / SYNC-048 (a): signing out and in again as uA creates an empty account (1 write); the second delete removes it and the Auth user', async () => {
    const d = new Device(db);
    await signIn(d);
    await d.setCard('card a', 1);
    await d.engine.flush();
    d.auth.deleteResults = ['needs-recent-sign-in'];
    d.auth.reauthResult = 'needs-sign-in';
    expect(await d.engine.deleteAccount()).toBe('needs-sign-in');

    expect(await d.engine.signOut()).toBe('ok');
    expect((await d.log()).deletingUid ?? null).toBeNull();
    db.resetCounts();
    d.auth.recentSignIn = true;
    await signIn(d);
    expect(db.writes).toBe(1);
    expect([...db.docs.keys()]).toEqual(['users/uA']);

    expect(await d.engine.deleteAccount()).toBe('ok');
    expect([...db.docs.keys()]).toEqual([]);
    expect(d.auth.deletedUser).toBe(true);
    expect(d.notices).toContain(MESSAGES.deletedOwn);
  });
});
