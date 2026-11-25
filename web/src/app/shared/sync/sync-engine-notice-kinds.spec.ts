import { FakeFirestore } from './testing/fakes';
import { Device, T0 } from './testing/device';
import { MESSAGES } from './sync-engine';
import type { NoticeKind } from './notice';
import { noticeOptions } from './notice';

/**
 * H-116 (Brief H-113 H-116 H-123 H-126): the engine sends every notice with its kind. success = a confirmation
 * of the user's own action (6 s); info = instructions and events (stays); error = refused or failed (stays,
 * assertive).
 */
async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

async function seeded(db: FakeFirestore): Promise<Device> {
  const d = new Device(db);
  await signIn(d);
  await d.setCard('hextech ray', 3);
  await d.engine.flush();
  return d;
}

const kindOf = (d: Device, message: string): NoticeKind | undefined =>
  d.noticeKinds.find((n) => n.message === message)?.kind;

describe('H-116 notice kinds: noticeOptions', () => {
  it('H-116 success closes after 6 s and is polite', () => {
    expect(noticeOptions('success')).toEqual({ duration: 6000, politeness: 'polite' });
  });

  it('H-116 info (instructions and events) stays until OK and is polite', () => {
    expect(noticeOptions('info')).toEqual({ duration: 0, politeness: 'polite' });
  });

  it('H-116 error stays until OK and is the only assertive kind', () => {
    expect(noticeOptions('error')).toEqual({ duration: 0, politeness: 'assertive' });
  });

  it('H-116 a missing or unknown kind stays open and is polite', () => {
    expect(noticeOptions()).toEqual({ duration: 0, politeness: 'polite' });
    expect(noticeOptions('later' as NoticeKind)).toEqual({ duration: 0, politeness: 'polite' });
  });
});

describe('H-116 notice kinds sent by the SyncEngine', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  it('H-116 signInFailed is an error', async () => {
    const d = new Device(db);
    d.auth.nextSignIn = 'error';
    await d.engine.signIn('google');
    expect(d.noticeKinds).toEqual([{ message: MESSAGES.signInFailed, kind: 'error' }]);
  });

  it('H-116 offline (an action refused) is an error, for sign-in, sign-out and delete', async () => {
    const d = await seeded(db);
    d.online = false;
    await d.engine.signOut();
    await d.engine.deleteAccount();
    await d.engine.signIn('google');
    const offline = d.noticeKinds.filter((n) => n.message === MESSAGES.offline);
    expect(offline.map((n) => n.kind)).toEqual(['error', 'error', 'error']);
  });

  it('H-116 deletedOwn is a success', async () => {
    const d = await seeded(db);
    expect(await d.engine.deleteAccount()).toBe('ok');
    expect(kindOf(d, MESSAGES.deletedOwn)).toBe('success');
  });

  it('H-116 deleteIncomplete is an error', async () => {
    const d = await seeded(db);
    d.remote.failDeleteAfter = 1;
    expect(await d.engine.deleteAccount()).toBe('failed');
    expect(kindOf(d, MESSAGES.deleteIncomplete)).toBe('error');
  });

  it('H-116 reauthNeeded is info; deleteNotDone (the user cancelled) is a success', async () => {
    const d = await seeded(db);
    d.auth.recentSignIn = false;
    d.auth.reauthResult = 'needs-sign-in';
    await d.engine.deleteAccount();
    expect(kindOf(d, MESSAGES.reauthNeeded)).toBe('info');
    d.auth.reauthResult = 'cancelled';
    await d.engine.deleteAccount();
    expect(kindOf(d, MESSAGES.deleteNotDone)).toBe('success');
  });

  it('H-116 accountDeleted is info', async () => {
    const laptop = await seeded(db);
    const phone = new Device(db);
    await signIn(phone);
    await laptop.engine.deleteAccount(); // on another device
    const reopened = phone.reload();
    reopened.auth.uid = 'uA';
    reopened.auth.account = 'deleted';
    await reopened.engine.start();
    await reopened.settle();
    expect(kindOf(reopened, MESSAGES.accountDeleted)).toBe('info');
  });

  it('H-116 sessionLost is info', async () => {
    const laptop = await seeded(db);
    const reopened = laptop.reload();
    reopened.auth.uid = null;
    reopened.auth.account = 'signed-out';
    await reopened.engine.start();
    expect(kindOf(reopened, MESSAGES.sessionLost)).toBe('info');
  });

  it('H-116 halfDeleted is info', async () => {
    db.docs.set('users/uA/state/collection', {
      schemaVersion: 1,
      updatedAt: 1,
      syncedAt: 1,
      catalogVersion: 'x',
      cards: { 'hextech ray': { q: 9, t: 1, p: {} } },
    });
    const phone = new Device(db);
    await signIn(phone);
    expect(phone.noticeKinds).toEqual([
      { message: MESSAGES.signedIn, kind: 'success' }, // H-145, replaced on screen by the next one
      { message: MESSAGES.halfDeleted, kind: 'info' },
    ]);
  });
});
