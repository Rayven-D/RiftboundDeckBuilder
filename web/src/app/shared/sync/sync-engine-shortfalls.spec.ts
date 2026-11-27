import { FakeFirestore } from './testing/fakes';
import { Device, at, card } from './testing/device';
import { lockDropNotice } from './merge';

/**
 * SPEC-010 SYNC-068 / SYNC-074 (v0.18, H-665; supersedes H-148's "is now n cards short"): a pull that leaves a
 * card-name lock short drops that lock (latest first, whole) and the deck's locked status with it, with **no
 * dialog** and **one** combined `info` notice (H-148's single-notice mechanism, new content, SPEC-008 SHARE-091
 * proposed wording). The drop is pushed so the other devices get it.
 */
async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

describe('SHARE-091 lockDropNotice (proposed wording)', () => {
  it('SHARE-091 one text: the heading, then one sentence per deck (locked / partly locked)', () => {
    expect(
      lockDropNotice([
        { deck: { name: 'Kennen Tempo' }, wasLocked: true, names: ['Hextech Ray'] },
        { deck: { name: 'Draven Aggro' }, wasLocked: false, names: ['Lightning Rush', 'Gust'] },
      ]),
    ).toBe(
      "Locks removed after a change on another device. 'Kennen Tempo' is no longer locked: Hextech Ray unlocked. 'Draven Aggro': Lightning Rush, Gust unlocked.",
    );
  });
});

describe('SYNC-074 / SPEC-010 AC 13 / SPEC-008 AC 32: SyncEngine drops a lock a pull left short, with one notice', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = at('09:00');
  });

  async function twoDevicesWithLockedDecks() {
    const laptop = new Device(db, { now: at('09:00') });
    await signIn(laptop);
    await laptop.setCard('hextech ray', 3);
    await laptop.setCard('gust', 2);
    await laptop.setCard('lightning rush', 2);
    const kennen = await laptop.createDeck('Kennen Tempo', [card('hextech ray', 3), card('gust', 2)]);
    const draven = await laptop.createDeck('Draven Aggro', [card('lightning rush', 2)]);
    await laptop.lock(kennen.id);
    await laptop.lock(draven.id);
    await laptop.engine.flush();
    const phone = new Device(db, { now: at('09:30') });
    await signIn(phone);
    return { laptop, phone, kennen, draven };
  }

  it('SYNC-074 AC 13 the phone lowers Hextech Ray to 2: on the laptop the Hextech Ray lock drops, Gust stays, one info notice, the drop is pushed', async () => {
    const { laptop, phone, kennen, draven } = await twoDevicesWithLockedDecks();
    phone.now = at('10:00');
    await phone.setCard('hextech ray', 2);
    await phone.engine.flush();

    laptop.now = at('10:10');
    const before = laptop.noticeKinds.length;
    await laptop.engine.syncNow();
    await laptop.settle();

    expect(laptop.noticeKinds.slice(before)).toEqual([
      { message: "Locks removed after a change on another device. 'Kennen Tempo' is no longer locked: hextech ray unlocked.", kind: 'info' },
    ]);
    expect(await laptop.lockKeys()).toEqual([`${draven.id}|lightning rush`, `${kennen.id}|gust`].sort());
    expect(await laptop.quantity('hextech ray')).toBe(2);
    // (The Device fixture stores each card's name as its cardKey.)
    // The drop is a lock change: pushed, so the cloud holds the unlock tombstone.
    expect(db.get('users/uA/state/locks').locks[`${kennen.id}|hextech ray`]).toMatchObject({ lockedAt: null });
    expect(laptop.notices.join(' ')).not.toContain('cards short');
  });

  it('SYNC-074 two decks going short in one sync: exactly one notice naming both', async () => {
    const { laptop, phone } = await twoDevicesWithLockedDecks();
    phone.now = at('10:00');
    await phone.setCard('hextech ray', 2);
    await phone.setCard('lightning rush', 0);
    await phone.engine.flush();

    laptop.now = at('10:10');
    const before = laptop.noticeKinds.length;
    await laptop.engine.syncNow();
    await laptop.settle();

    const notices = laptop.noticeKinds.slice(before).filter((n) => n.message.startsWith('Locks removed'));
    expect(notices).toHaveLength(1);
    expect(notices[0].message).toContain("'Kennen Tempo' is no longer locked: hextech ray unlocked.");
    expect(notices[0].message).toContain("'Draven Aggro' is no longer locked: lightning rush unlocked.");
  });

  it('SYNC-074 a pull that only takes free copies changes no lock and sends no notice', async () => {
    const { laptop, phone } = await twoDevicesWithLockedDecks();
    phone.now = at('10:00');
    await phone.setCard('hextech ray', 4);
    await phone.engine.flush();
    laptop.now = at('10:10');
    await laptop.engine.syncNow();
    await laptop.settle();
    phone.now = at('10:20');
    await phone.setCard('hextech ray', 3);
    await phone.engine.flush();
    laptop.now = at('10:30');
    const before = laptop.notices.length;
    await laptop.engine.syncNow();
    await laptop.settle();
    expect(laptop.notices.slice(before)).toEqual([]);
    expect(await laptop.lockKeys()).toHaveLength(3);
  });
});
