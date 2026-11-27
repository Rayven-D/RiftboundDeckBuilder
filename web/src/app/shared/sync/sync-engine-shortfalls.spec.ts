import { FakeFirestore } from './testing/fakes';
import { Device, at, card } from './testing/device';
import { lockedShortfallNotice } from './sync-engine';
import type { EngineDeps } from './sync-engine';
import type { LocalSnapshot } from './merge';

/**
 * SYNC-074 / H-148: when a sync leaves several locked decks short, the engine sends ONE `info` notice that
 * lists every short locked deck and its shortfall (Material shows one snack bar at a time).
 *
 * The real `shortfalls` hook is SPEC-008 `lockedShortfalls` (wired by H-075). Here a simple stand-in counts
 * each locked deck's missing copies against the collection (no shared pool), and reports decks that got
 * shorter, sorted by name.
 */
function shortOf(s: LocalSnapshot, deckId: string): number {
  const deck = s.decks.find((d) => d.id === deckId);
  const cards = s.collection && s.collection !== 'unreadable' ? s.collection.cards : {};
  return (deck?.main ?? []).reduce((n, c) => n + Math.max(0, c.qty - (cards[c.cardKey]?.quantity ?? 0)), 0);
}

const stubShortfalls: NonNullable<EngineDeps['shortfalls']> = (before, after) => {
  const locks = after.locks && after.locks !== 'unreadable' ? after.locks.locks : [];
  return locks
    .map((l) => ({ deck: after.decks.find((d) => d.id === l.deckId), now: shortOf(after, l.deckId), was: shortOf(before, l.deckId) }))
    .filter((x) => x.deck && x.now > 0 && x.now > x.was)
    .map((x) => ({ deckName: x.deck!.name, cardsShort: x.now }))
    .sort((a, b) => a.deckName.localeCompare(b.deckName));
};

async function signIn(d: Device, uid = 'uA'): Promise<void> {
  d.auth.nextSignIn = uid;
  await d.engine.signIn('google');
  await d.settle();
}

describe('SYNC-074 / H-148 lockedShortfallNotice', () => {
  it('SYNC-074 no short deck: no notice', () => {
    expect(lockedShortfallNotice([])).toBeNull();
  });

  it('SYNC-074 one short deck keeps the spec sentence (AC 13)', () => {
    expect(lockedShortfallNotice([{ deckName: 'Kennen Tempo', cardsShort: 1 }])).toBe(
      "'Kennen Tempo' (locked) is now 1 card short.",
    );
  });

  it('SYNC-074 several short decks: one text listing each deck and its shortfall', () => {
    expect(
      lockedShortfallNotice([
        { deckName: 'Draven Aggro', cardsShort: 2 },
        { deckName: 'Kennen Tempo', cardsShort: 1 },
      ]),
    ).toBe("'Draven Aggro' (locked) is now 2 cards short. 'Kennen Tempo' (locked) is now 1 card short.");
  });
});

describe('SYNC-074 / H-148 SyncEngine sends one shortfall notice per sync', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    db.serverTime = at('09:00');
  });

  async function twoDevicesWithLockedDecks() {
    const laptop = new Device(db, { now: at('09:00'), shortfalls: stubShortfalls });
    await signIn(laptop);
    await laptop.setCard('hextech ray', 3);
    await laptop.setCard('lightning rush', 2);
    const kennen = await laptop.createDeck('Kennen Tempo', [card('hextech ray', 3)]);
    const draven = await laptop.createDeck('Draven Aggro', [card('lightning rush', 2)]);
    await laptop.lock(kennen.id);
    await laptop.lock(draven.id);
    await laptop.engine.flush();
    const phone = new Device(db, { now: at('09:30') });
    await signIn(phone);
    return { laptop, phone, kennen, draven };
  }

  it('SYNC-074 AC 13 two locked decks going short in one sync get exactly one info notice naming both', async () => {
    const { laptop, phone, kennen, draven } = await twoDevicesWithLockedDecks();
    phone.now = at('10:00');
    await phone.setCard('hextech ray', 2);
    await phone.setCard('lightning rush', 0);
    await phone.engine.flush();

    laptop.now = at('10:10');
    const before = laptop.noticeKinds.length;
    await laptop.engine.syncNow();
    await laptop.settle();

    const shortNotices = laptop.noticeKinds.slice(before).filter((n) => n.message.includes('(locked) is now'));
    expect(shortNotices).toEqual([
      {
        message: "'Draven Aggro' (locked) is now 2 cards short. 'Kennen Tempo' (locked) is now 1 card short.",
        kind: 'info',
      },
    ]);
    // Both stay locked (SYNC-074: never unlocked automatically).
    expect((await laptop.lockedIds()).sort()).toEqual([kennen.id, draven.id].sort());
    expect(await laptop.quantity('hextech ray')).toBe(2);
  });

  it('SYNC-074 AC 13 one locked deck going short gets the single-deck sentence', async () => {
    const { laptop, phone } = await twoDevicesWithLockedDecks();
    phone.now = at('10:00');
    await phone.setCard('hextech ray', 2);
    await phone.engine.flush();

    laptop.now = at('10:10');
    const before = laptop.noticeKinds.length;
    await laptop.engine.syncNow();
    await laptop.settle();

    expect(laptop.noticeKinds.slice(before).filter((n) => n.message.includes('(locked) is now'))).toEqual([
      { message: "'Kennen Tempo' (locked) is now 1 card short.", kind: 'info' },
    ]);
  });

  it('SYNC-074 a sync that leaves no locked deck short sends no shortfall notice', async () => {
    const { laptop, phone } = await twoDevicesWithLockedDecks();
    phone.now = at('10:00');
    await phone.setCard('hextech ray', 4);
    await phone.engine.flush();

    laptop.now = at('10:10');
    const before = laptop.notices.length;
    await laptop.engine.syncNow();
    await laptop.settle();

    expect(laptop.notices.slice(before).filter((m) => m.includes('(locked) is now'))).toEqual([]);
  });
});
