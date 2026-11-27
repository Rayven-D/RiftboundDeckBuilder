import { planPush, MAP_CAPS } from './push-plan';
import { emptySyncLog } from './sync-log';
import { stampLocks } from './stamp';
import { documentSize } from './testing/firestore-size';
import type { NameLock, UserDeck } from '../storage/records';

/**
 * SPEC-010 SYNC-017 / SYNC-112 / SYNC-123 (v0.18, H-665): the measured size of `users/{uid}/state/locks` with one
 * entry per (deck, card name), as the push writes it (`<deckId>|<cardKey>` → { lockedAt, updatedAt }, both
 * timestamps), by the storage-size rules in [[Firestore Data Shape]]. Recorded there.
 *
 * Card names: 60 invented names with the length spread of real Riftbound names (11 to 28 characters, e.g. "Hextech
 * Ray", "Kennen, Heart of the Tempest"); the cardKey is the lower-cased name.
 */
const NAMES = [
  'Hextech Ray', 'Gust', 'Lightning Rush', 'Kennen, Heart of the Tempest', 'Kennen, Storm of Shuriken', 'Zaun Warrens',
  "Kai'Sa, Survivor", 'Chaos Rune', 'Order Rune', 'Calm Rune', 'Fury Rune', 'Mind Rune', 'Body Rune', 'Ember Spark',
  'Iron Warden', 'Mist Walker', 'Rally Banner', 'Void Gate', 'Storm Caller', 'Ash Hound', 'Ember Queen',
  'Thundering Ascent', 'Shadow of the Peaks', 'Recall Point', 'Piltover Enforcer', 'Noxian Guillotine', 'Ironclad Vanguard',
  'Shuriken Volley', 'Mark of the Storm', 'Electrical Surge', 'Blade of the Ruined', 'Duskwood Stalker', 'Sun Disc Relic',
  'Arcane Comet', 'Grasp of Shadows', 'Tidecaller Pearl', 'Falling Star', 'Riverbank Scout', 'Undercity Smuggler',
  'Watcher of the Gate', 'Frostfire Lantern', 'Bilgewater Hook', 'Shurima Sandstorm', 'Ionian Blossom', 'Freljord Howl',
  'Targon Pilgrim', 'Demacian Standard', 'Ixtal Canopy', 'Void Seeker', 'Hexgate Courier', 'Chemtech Brute',
  'Shimmer Runner', 'Crimson Duelist', 'Starforged Blade', 'Ruined Kingdom', 'Glacial Prison', 'Spirit Fox',
  'Wandering Merchant', 'Clockwork Sentry', 'Echoing Battlefield',
];
const uuid = (n: number) => `0b7c0000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const UID = 'Q3x9LmP0aZ7tR2vK8sN4bW6yJ1cD'; // a 28-character Firebase uid
const PATH = `users/${UID}/state/locks`;
const T = Date.UTC(2026, 10, 26, 12);

function measure(decks: number, names: number): { entries: number; bytes: number } {
  const locks: NameLock[] = [];
  const deckList: UserDeck[] = [];
  for (let d = 0; d < decks; d++) {
    deckList.push({ id: uuid(d) } as UserDeck);
    for (let k = 0; k < names; k++) locks.push({ deckId: uuid(d), cardKey: NAMES[k].toLowerCase(), lockedAt: new Date(T + d * 1000).toISOString() });
  }
  let log = stampLocks(emptySyncLog(), { schemaVersion: 2, updatedAt: new Date(T).toISOString(), locks }, T);
  log = { ...log, cloudDocs: deckList.map((d) => `deck:${d.id}`) };
  const plan = planPush(
    { collection: null, tags: null, locks: { schemaVersion: 2, updatedAt: '', locks }, decks: deckList, unreadableDecks: [] },
    log,
    { now: T, readOnly: [] },
  );
  const sent = plan.changes.locks!;
  const doc = { schemaVersion: 1, updatedAt: sent.updatedAt, syncedAt: T, locks: sent.locks };
  return { entries: Object.keys(sent.locks).length, bytes: documentSize(PATH, doc) };
}

describe('SYNC-017 / SYNC-112 / SYNC-123 state/locks size with card-name locks (H-665)', () => {
  it('SYNC-017 100 fully locked decks of 40 names (4,000 entries) is under the 700 KB SYNC-123 level; 60 names (6,000, the SYNC-112 cap) under 1 MiB', () => {
    const forty = measure(100, 40);
    const sixty = measure(100, 60);
    // Recorded in brain/05-Services/Firestore Data Shape.md ("state/locks").
    console.log(`H-665 measured: state/locks 100 decks x 40 names = ${forty.entries} entries, ${forty.bytes} bytes`);
    console.log(`H-665 measured: state/locks 100 decks x 60 names = ${sixty.entries} entries, ${sixty.bytes} bytes`);
    expect(forty.entries).toBe(4000);
    expect(sixty.entries).toBe(MAP_CAPS.locks);
    expect(forty.bytes).toBeLessThan(700_000);
    expect(sixty.bytes).toBeLessThan(1_048_576);
  });
});
