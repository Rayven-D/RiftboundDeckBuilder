/**
 * SPEC-010 v0.10 SYNC-006 (H-145, brain/04-UI/Brief H-145.md decisions 2, 7, 9, 10), engine side: the return path
 * travels to the adapter, a used-up email link is left before the first-sign-in flow, and "You're signed in."
 * shows once after a sign-in the user started (email link or Google), never on a restore or a reload.
 */
import { FakeFirestore } from './testing/fakes';
import { Device, T0 } from './testing/device';
import { MESSAGES } from './sync-engine';

const signedInNotices = (d: Device) => d.noticeKinds.filter((n) => n.message === MESSAGES.signedIn);

describe('H-145 "You\'re signed in." and leaving the link (SPEC-010 SYNC-006, AC 52, AC 39)', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = T0;
  });

  it('H-145 the notice text is exact, with a straight apostrophe', () => {
    expect(MESSAGES.signedIn).toBe("You're signed in.");
  });

  it('AC 52 / H-145 email link: the link is left before any Firestore read, then "You\'re signed in." shows once as a success', async () => {
    const laptop = new Device(db);
    laptop.auth.nextSignIn = 'uA';
    expect(await laptop.engine.signIn('email-link', 'rj@example.com')).toBe('ok');
    await laptop.settle();
    expect(laptop.linkLeaves).toEqual([{ reads: 0, notices: 0 }]); // before the first-sign-in flow and the notice
    expect(signedInNotices(laptop)).toEqual([{ message: MESSAGES.signedIn, kind: 'success' }]);
    expect(laptop.notices[0]).toBe(MESSAGES.signedIn); // before anything the first-sign-in flow says
    expect(laptop.engine.gate()).toBe('open');
  });

  it('AC 52 / H-145 Google: "You\'re signed in." shows once; there is no link to leave', async () => {
    const d = new Device(db);
    d.auth.enabled = ['email-link', 'google'];
    d.auth.nextSignIn = 'uA';
    expect(await d.engine.signIn('google')).toBe('ok');
    await d.settle();
    expect(signedInNotices(d)).toHaveLength(1);
    expect(d.linkLeaves).toEqual([]);
  });

  it('AC 52 / H-145 a reload (session restore) and a second start never show the notice', async () => {
    const laptop = new Device(db);
    laptop.auth.nextSignIn = 'uA';
    await laptop.engine.signIn('email-link', 'rj@example.com');
    await laptop.settle();

    const reopened = laptop.reload();
    reopened.auth.uid = 'uA';
    await reopened.engine.start();
    await reopened.settle();
    expect(reopened.status.kind).not.toBe('signed-out');
    expect(reopened.notices).toEqual([]);
    expect(reopened.linkLeaves).toEqual([]);

    const again = reopened.reload();
    again.auth.uid = 'uA';
    await again.engine.start();
    await again.settle();
    expect(again.notices).toEqual([]);
  });

  it('AC 39 / H-145 an expired code (auth/expired-action-code) strips the link, shows the SYNC-005 error and no signed-in notice', async () => {
    const d = new Device(db);
    d.auth.nextSignIn = 'error';
    d.auth.signInError = { code: 'auth/expired-action-code' };
    expect(await d.engine.signIn('email-link', 'rj@example.com')).toBe('failed');
    expect(d.linkLeaves).toHaveLength(1);
    expect(d.noticeKinds).toEqual([{ message: MESSAGES.signInFailed, kind: 'error' }]);
  });

  it('AC 39 / H-145 a used or malformed code (auth/invalid-action-code) strips the link too', async () => {
    const d = new Device(db);
    d.auth.nextSignIn = 'error';
    d.auth.signInError = { code: 'auth/invalid-action-code' };
    expect(await d.engine.signIn('email-link', 'rj@example.com')).toBe('failed');
    expect(d.linkLeaves).toHaveLength(1);
  });

  it('H-145 a chunk-load failure keeps the code (a reload can retry) and still shows the SYNC-005 error', async () => {
    const d = new Device(db);
    d.adapterError = new Error('Failed to fetch dynamically imported module');
    expect(await d.engine.signIn('email-link', 'rj@example.com')).toBe('failed');
    expect(d.linkLeaves).toEqual([]);
    expect(d.noticeKinds).toEqual([{ message: MESSAGES.signInFailed, kind: 'error' }]);
  });

  it('H-145 a network failure (auth/network-request-failed) keeps the code and still shows the SYNC-005 error', async () => {
    const d = new Device(db);
    d.auth.nextSignIn = 'error';
    d.auth.signInError = { code: 'auth/network-request-failed' };
    expect(await d.engine.signIn('email-link', 'rj@example.com')).toBe('failed');
    expect(d.linkLeaves).toEqual([]);
    expect(d.noticeKinds).toEqual([{ message: MESSAGES.signInFailed, kind: 'error' }]);
  });

  it('H-145 a mistyped address on another device (auth/invalid-email) keeps the code and still shows the SYNC-005 error', async () => {
    const d = new Device(db);
    d.auth.nextSignIn = 'error';
    d.auth.signInError = { code: 'auth/invalid-email' };
    expect(await d.engine.signIn('email-link', 'rj@exmaple')).toBe('failed');
    expect(d.linkLeaves).toEqual([]);
    expect(d.noticeKinds).toEqual([{ message: MESSAGES.signInFailed, kind: 'error' }]);
  });

  it('H-145 an error without a Firebase code keeps the code', async () => {
    const d = new Device(db);
    d.auth.nextSignIn = 'error'; // plain Error, no code
    expect(await d.engine.signIn('email-link', 'rj@example.com')).toBe('failed');
    expect(d.linkLeaves).toEqual([]);
  });

  it('AC 39 / H-145 a cancelled link (no address) keeps the link and shows nothing', async () => {
    const d = new Device(db);
    d.auth.nextSignIn = 'cancelled';
    expect(await d.engine.signIn('email-link')).toBe('cancelled');
    expect(d.linkLeaves).toEqual([]);
    expect(d.notices).toEqual([]);
  });

  it('H-145 offline: the link is kept for a later try (nothing was sent to Firebase)', async () => {
    const d = new Device(db);
    d.online = false;
    expect(await d.engine.signIn('email-link', 'rj@example.com')).toBe('offline');
    expect(d.linkLeaves).toEqual([]);
    expect(signedInNotices(d)).toEqual([]);
  });

  it('H-145 a navigation that fails does not turn a completed sign-in into a failed one', async () => {
    const d = new Device(db);
    d.auth.nextSignIn = 'uA';
    d.onLeaveLink = async () => {
      throw new Error('navigation refused');
    };
    expect(await d.engine.signIn('email-link', 'rj@example.com')).toBe('ok');
    await d.settle();
    expect(d.notices).not.toContain(MESSAGES.signInFailed);
    expect(signedInNotices(d)).toHaveLength(1);
  });

  it('AC 52 / H-145 Send link passes the return path to the adapter (default: none, so the adapter uses /)', async () => {
    const d = new Device(db);
    await d.engine.sendEmailLink('rj@example.com', '/import?type=deck');
    await d.engine.sendEmailLink('rj@example.com');
    expect(d.auth.emailLinkReturns).toEqual(['/import?type=deck', undefined]);
  });
});
