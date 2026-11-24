/**
 * SPEC-010 engine tests for the H-062 round-1 fixes: per-device build (SYNC-118 / SYNC-012), account
 * deletion that stops part-way (SYNC-096 / SYNC-098), interrupted first sign-in (SYNC-048), unconfirmed
 * writes (SYNC-042), and denied reads with a valid session (SYNC-118).
 */
import { FakeFirestore } from './testing/fakes';
import { Device, T0 } from './testing/device';
import { MESSAGES } from './sync-engine';

async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

async function reopen(d: Device, appVersion?: string): Promise<Device> {
  const r = d.reload({ appVersion });
  r.auth.uid = 'uA';
  await r.engine.start();
  await r.settle();
  return r;
}

const accountWrites = (db: FakeFirestore) => db.writeLog.filter(([p]) => p === 'users/uA').length;

describe('SyncEngine round 2 (SPEC-010)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  describe('SYNC-118 / SYNC-012: this device’s build', () => {
    it('SYNC-118 a rejected item is retried when this device’s build changes, even if another device wrote that build first', async () => {
      const laptop = new Device(db);
      await laptop.setCard('hextech ray', 3);
      await signIn(laptop);
      const phone = new Device(db);
      await signIn(phone);
      const deck = await phone.createDeck('Kennen Tempo');
      await phone.engine.flush();
      phone.remote.failRules.push({ ref: `deck:${deck.id}`, code: 'permission-denied' });
      await phone.editDeck(deck.id, { notes: 'x' });
      await phone.advance(2500);
      expect((await phone.log()).rejected).toEqual([`decks:${deck.id}`]);

      await reopen(laptop, 'test-2');
      expect(db.get('users/uA').lastClientVersion).toBe('test-2');

      db.resetCounts();
      const phone2 = await reopen(phone, 'test-2');
      const log = await phone2.log();
      expect(log.rejected).toEqual([]);
      expect(log.pending.decks).toEqual([]);
      expect(db.get(`users/uA/decks/${deck.id}`).notes).toBe('x');
      expect(accountWrites(db)).toBe(0); // the laptop already recorded test-2
    });

    it('SYNC-012 two devices on different builds update the account once each, not on every open', async () => {
      const laptop = new Device(db);
      await signIn(laptop);
      const phone = new Device(db);
      await signIn(phone);
      db.resetCounts();
      let l = await reopen(laptop, 'test-1');
      let p = await reopen(phone, 'test-2');
      expect(accountWrites(db)).toBe(1);
      for (let i = 0; i < 3; i++) {
        l = await reopen(l, 'test-1');
        p = await reopen(p, 'test-2');
      }
      expect(accountWrites(db)).toBe(1);
      expect((await p.log()).lastBuild).toBe('test-2');
    });
  });

  describe('SYNC-096 step 1 and an interrupted deletion (SYNC-098)', () => {
    it('SYNC-096 an email-link user whose sign-in is old is told to sign in again; nothing is deleted', async () => {
      const d = new Device(db);
      await d.setCard('hextech ray', 1);
      await signIn(d);
      d.auth.recentSignIn = false;
      d.auth.reauthResult = 'needs-sign-in';
      expect(await d.engine.deleteAccount()).toBe('needs-sign-in');
      expect(d.notices).toContain(MESSAGES.reauthNeeded);
      expect(db.get('users/uA')).toBeDefined();
      expect((await d.log()).deletingUid ?? null).toBeNull();
      d.auth.reauthResult = 'cancelled';
      expect(await d.engine.deleteAccount()).toBe('cancelled');
      expect(d.notices).toContain(MESSAGES.deleteNotDone);
    });

    it('SYNC-098 a deletion stopped after the documents keeps this device out of the half-deleted path and can be retried', async () => {
      const d = new Device(db);
      await d.setCard('hextech ray', 1);
      await signIn(d);
      d.auth.deleteResults = ['needs-recent-sign-in'];
      d.auth.reauthResult = 'needs-sign-in';
      expect(await d.engine.deleteAccount()).toBe('needs-sign-in');
      expect([...db.docs.keys()]).toEqual([]);
      expect(d.auth.deletedUser).toBe(false);
      expect((await d.log()).deletingUid).toBe('uA');

      // a later edit pushes nothing and never runs the SYNC-097 check
      db.resetCounts();
      await d.setCard('hextech ray', 2);
      await d.advance(70_000);
      await d.engine.syncNow();
      expect(db.reads + db.writes).toBe(0);
      expect(d.auth.calls).not.toContain('checkAccount');
      expect(d.notices).not.toContain(MESSAGES.halfDeleted);
      expect(d.status).toMatchObject({ kind: 'error', message: MESSAGES.deleteIncomplete });

      // the user signs in again (a new page load) and retries
      const again = d.reload();
      again.auth.uid = 'uA';
      await again.engine.start();
      await again.settle();
      expect(again.notices).not.toContain(MESSAGES.halfDeleted);
      expect(again.engine.signedInUid).toBe('uA');
      expect(await again.engine.deleteAccount()).toBe('ok');
      expect(again.auth.deletedUser).toBe(true);
      expect(again.backend.keys().filter((k) => k.startsWith('rift.'))).toEqual([]);
      expect(again.engine.pendingCount()).toBe(0);
    });
  });

  describe('SYNC-048 interrupted first sign-in', () => {
    it('SYNC-048 a retry of this device’s own partly written upload resumes without the Combine dialog', async () => {
      const d = new Device(db);
      for (let i = 0; i < 3; i++) await d.setCard(`card ${i}`, 1);
      for (let i = 0; i < 20; i++) await d.createDeck(`Deck ${i}`);
      d.remote.failBatchAfter = 10; // account + 9 decks land, the rest is unconfirmed
      await signIn(d);
      expect(db.get('users/uA')).toBeDefined();
      expect((await d.log()).uid).toBeNull();
      expect((await d.log()).uploadingUid).toBe('uA');

      const again = await reopen(d);
      expect(again.questions).toEqual([]);
      expect([...db.docs.keys()].filter((k) => k.includes('/decks/'))).toHaveLength(20);
      expect(Object.keys(db.get('users/uA/state/collection').cards)).toHaveLength(3);
      const log = await again.log();
      expect(log.uid).toBe('uA');
      expect(log.uploadingUid).toBeNull();
      expect(again.notices).toContain(MESSAGES.uploaded);
    });

    it('SYNC-048 the same retry also happens in the running session (scheduled after an unconfirmed batch)', async () => {
      const d = new Device(db);
      await d.setCard('hextech ray', 2);
      for (let i = 0; i < 12; i++) await d.createDeck(`Deck ${i}`);
      d.remote.failBatchAfter = 5;
      await signIn(d);
      await d.advance(61_000);
      expect(d.questions).toEqual([]);
      expect((await d.log()).uid).toBe('uA');
      expect([...db.docs.keys()].filter((k) => k.includes('/decks/'))).toHaveLength(12);
    });

    it('SYNC-049 a different device with data still gets the Combine dialog', async () => {
      const laptop = new Device(db);
      await laptop.setCard('hextech ray', 3);
      laptop.remote.failBatchAfter = 1;
      await signIn(laptop);
      laptop.remote.failBatchAfter = null;
      await laptop.advance(61_000);
      const phone = new Device(db);
      await phone.setCard('lightning rush', 1);
      phone.combineAnswer = 'cancel';
      await signIn(phone);
      expect(phone.questions).toHaveLength(1);
    });
  });

  describe('SYNC-042 unconfirmed writes', () => {
    it('SYNC-042 a write not confirmed in time stays pending without an error and is confirmed by the next sync', async () => {
      const d = new Device(db);
      await signIn(d);
      d.remote.failRules.push({ ref: 'collection', code: 'unconfirmed', once: true });
      await d.setCard('hextech ray', 4);
      await d.advance(2500);
      expect(d.engine.pendingCount()).toBe(1);
      expect(d.status.kind).not.toBe('error');
      expect(d.status.kind).not.toBe('offline');
      await d.advance(61_000);
      expect(d.engine.pendingCount()).toBe(0);
      expect(db.get('users/uA/state/collection').cards['hextech ray'].q).toBe(4);
    });
  });

  describe('SYNC-118 denied read with a valid session', () => {
    it('SYNC-118 a permission-denied pull with checkAccount ok is an Error status, not "signed out"', async () => {
      const d = new Device(db);
      await signIn(d);
      d.remote.pullError = 'permission-denied';
      d.now += 60_000;
      await d.engine.syncNow();
      expect(d.notices).not.toContain(MESSAGES.sessionLost);
      expect(d.engine.signedInUid).toBe('uA');
      expect(d.status).toMatchObject({ kind: 'error', message: MESSAGES.writeFailed });
      d.remote.pullError = null;
      d.now += 60_000;
      await d.engine.syncNow();
      expect(d.status.kind).toBe('synced');
    });
  });
});
