/**
 * SPEC-013 Test Data (H-205): the marker rules and the pure Load / Remove plans. No Angular, no storage and no
 * generator import here (the generator is loaded on demand by the caller, TEST-024), so this file is cheap to
 * bundle with the Collection page.
 */
import type {
  StoredCollection,
  StoredDeckLocks,
  UserDeck,
} from '../storage/records';
import type { SampleData } from './sample-data';

export type TestSetId = 'small' | 'large';

/** TEST-003 / Definitions: entries (owned printings) per set. */
export const TEST_SETS: Readonly<Record<TestSetId, number>> = { small: 150, large: 5000 };

/** TEST-030: the reserved `catalogVersion` prefix. */
export const TEST_MARKER_PREFIX = 'test-data-';

/** Definitions: `sampleDeckId(1…3)`, written out so this file does not import the generator. */
export const TEST_DECK_IDS: readonly string[] = [1, 2, 3].map(
  (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
);

/** SPEC-013 strings, in one place (tests and templates use these). */
export const TEST_TEXT = {
  loadButton: 'Load test data',
  dialogTitle: 'Load test data',
  dialogText:
    'Fill your account with invented cards so you can try Rift Builder before real card data is ready. These are not real cards. You can remove them any time.',
  small: 'Small',
  smallDetail: '150 cards, 3 decks',
  large: 'Large',
  largeDetail: '5,000 cards, 3 decks (a long list, to test scrolling)',
  offline: "You're offline.",
  loading: 'Loading…',
  loaded: 'Test data loaded.',
  loadFailed: "Couldn't load test data. Check your connection and try again.",
  realCards: "You already have real cards, so test data can't be loaded.",
  replaceQuestion: (set: TestSetId) =>
    `Replace your test data with the ${set === 'small' ? 'Small' : 'Large'} set? Your own decks are kept.`,
  banner: "You're looking at test data: invented cards, not yours.",
  changeSet: 'Change set',
  removeButton: 'Remove test data',
  removeTitle: 'Remove test data?',
  removeText:
    'This removes the invented cards and the three test decks from your account. Your own decks are not touched.',
  removed: 'Test data removed.',
  addBlocked: "Remove your test data before adding cards, so test and real cards don't mix.",
  /** SPEC-013 v0.2 TEST-063 (RJ-approved 2026-11-26): signed out, the sets go into memory only. */
  guestBanner: "You're trying Rift Builder with test data. Nothing is saved: it's gone when you reload.",
  /** TEST-060 (proposal wording). */
  guestDialogText:
    "Try Rift Builder with invented cards. These are not real cards. Nothing is saved: it's gone when you reload.",
  /** TEST-064 (a). */
  guestRemoveText: 'This removes the invented cards and decks from this page.',
  /** TEST-064 (b): the TEST-022 question without its second sentence. */
  guestReplaceQuestion: (set: TestSetId) => `Replace your test data with the ${set === 'small' ? 'Small' : 'Large'} set?`,
} as const;

export const testMarker = (entries: number): string => `${TEST_MARKER_PREFIX}${entries}`;

/** The `n` of a `test-data-<n>` marker (a positive integer), else null. */
export function testEntries(catalogVersion: string | null | undefined): number | null {
  if (!catalogVersion?.startsWith(TEST_MARKER_PREFIX)) return null;
  const rest = catalogVersion.slice(TEST_MARKER_PREFIX.length);
  if (!/^[1-9]\d{0,5}$/.test(rest)) return null;
  return Number(rest);
}

/** TEST-030: test data iff at least one card and the marker prefix. An empty or missing collection never is. */
export function isTestCollection(c: Pick<StoredCollection, 'catalogVersion' | 'cards'> | null | undefined): boolean {
  return !!c && Object.keys(c.cards).length > 0 && c.catalogVersion.startsWith(TEST_MARKER_PREFIX);
}

/** TEST-030: a reserved id and the marker prefix (a dev-tool sample deck, `catalogVersion: 'sample'`, is not one). */
export function isTestDeck(d: Pick<UserDeck, 'id' | 'catalogVersion'>): boolean {
  return TEST_DECK_IDS.includes(d.id) && d.catalogVersion.startsWith(TEST_MARKER_PREFIX);
}

/** TEST-012: Load is allowed on an empty collection or on test data, never over real cards. */
export function canLoadTestData(c: Pick<StoredCollection, 'catalogVersion' | 'cards'> | null | undefined): boolean {
  return !c || Object.keys(c.cards).length === 0 || isTestCollection(c);
}

export interface TestLoadPlan {
  collection: StoredCollection;
  decks: UserDeck[];
  locks: StoredDeckLocks;
}

/**
 * TEST-020 / TEST-021: what Load writes, from the generator's output for `entries`. The collection and decks
 * carry `test-data-<n>` (the dev tool keeps its old values); the name locks of the two locked test decks (one per
 * counted name, so each deck is locked, SHARE-083; `schemaVersion: 2`, TEST-021 v0.1.5) are added to the user's own
 * locks (any earlier lock on a test id is replaced). Timestamps are `nowIso`.
 */
export function planTestLoad(
  sample: Pick<SampleData, 'collection' | 'decks' | 'locks'>,
  entries: number,
  currentLocks: StoredDeckLocks | null,
  nowIso: string,
): TestLoadPlan {
  const marker = testMarker(entries);
  const own = (currentLocks?.locks ?? []).filter((l) => !TEST_DECK_IDS.includes(l.deckId));
  return {
    collection: { ...sample.collection, updatedAt: nowIso, catalogVersion: marker },
    decks: sample.decks.map((d) => ({ ...d, catalogVersion: marker, createdAt: nowIso, updatedAt: nowIso })),
    locks: { schemaVersion: 2, updatedAt: nowIso, locks: [...own, ...sample.locks.map((l) => ({ ...l }))] },
  };
}

export interface TestRemovePlan {
  /** The emptied collection (`catalogVersion: ""`, TEST-050), or null when it is not test data (left alone). */
  collection: StoredCollection | null;
  /** Test decks to delete (reserved id and marker, TEST-030 / TEST-034). */
  deckIds: string[];
  /** The locks without the test decks' entries, or null when there is nothing to change. */
  locks: StoredDeckLocks | null;
}

/**
 * TEST-050 / TEST-034 / TEST-033: removes only the test cards (as an empty collection with `catalogVersion ""`),
 * the test decks and their locks. `removeCollection: false` is the Replace import case (TEST-033): the import
 * writes the collection itself, so only the test decks and locks go.
 */
export function planTestRemove(
  collection: StoredCollection | null,
  decks: readonly UserDeck[],
  locks: StoredDeckLocks | null,
  nowIso: string,
  opts: { removeCollection?: boolean } = {},
): TestRemovePlan {
  const deckIds = decks.filter(isTestDeck).map((d) => d.id);
  const gone = new Set(deckIds);
  // A lock on a reserved id goes with its test deck, or when that deck is gone already (an orphan).
  const present = new Set(decks.map((d) => d.id));
  const lockGone = (id: string) => gone.has(id) || (TEST_DECK_IDS.includes(id) && !present.has(id));
  const keptLocks = (locks?.locks ?? []).filter((l) => !lockGone(l.deckId));
  return {
    collection:
      opts.removeCollection !== false && isTestCollection(collection)
        ? { ...collection!, updatedAt: nowIso, catalogVersion: '', cards: {} }
        : null,
    deckIds,
    locks:
      locks && keptLocks.length !== locks.locks.length ? { ...locks, updatedAt: nowIso, locks: keptLocks } : null,
  };
}
