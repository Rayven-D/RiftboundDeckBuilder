/**
 * Test fixture for Deck detail (used by *.spec.ts only): a full-shape deck in the spirit of SPEC-005's `KENNEN_1`
 * (all six zones, a card split between Main and Sideboard, rune entries over 3 copies). Names are invented or taken
 * from the spec's acceptance criteria.
 */
import { makeCatalog, makeDeck, makeInput, type OwnedSpec } from '../../core/decks/engine-fixtures';
import { computeDeckOwnership, computeSharedPool } from '../../core/decks';
import type { BanListFile, NameLock, DeckOwnershipView, UserDeck } from '../../core/decks';

export const DETAIL_CATALOG = makeCatalog([
  { name: 'Kennen, Heart of the Tempest', category: 'legend' },
  { name: 'Kennen, Storm of Shuriken', category: 'champion' },
  'Lightning Rush',
  'Fizz, Trickster',
  'The Empyrean',
  { name: 'Zaun Warrens', category: 'battlefield' },
  { name: 'Chaos Rune', category: 'rune' },
  { name: 'Order Rune', category: 'rune' },
]);

export const DETAIL_DECK_ID = '0b7c0000-0000-4000-8000-0000000000a1';

/**
 * R = 23 copies in 8 cards. With `DETAIL_OWNED`: A = 12 → "12 of 23 copies available · 52%" (floor(1200/23) = 52),
 * "2 of 8 cards fully available".
 */
export function detailDeck(id = DETAIL_DECK_ID, name = 'Kennen Tempo'): UserDeck {
  return makeDeck(id, name, {
    legend: [['Kennen, Heart of the Tempest', 1]],
    champion: [['Kennen, Storm of Shuriken', 1]],
    main: [
      ['Lightning Rush', 3],
      ['Fizz, Trickster', 1],
      ['The Empyrean', 2],
    ],
    battlefields: [['Zaun Warrens', 1]],
    runes: [
      ['Chaos Rune', 9],
      ['Order Rune', 3],
    ],
    sideboard: [
      ['Fizz, Trickster', 1],
      ['The Empyrean', 1],
    ],
  });
}

export const DETAIL_OWNED: Record<string, number> = {
  'Kennen, Heart of the Tempest': 1,
  'Lightning Rush': 1,
  'The Empyrean': 2,
  'Chaos Rune': 6,
  'Fizz, Trickster': 2,
};

/** Every card of `detailDeck` in full. */
export const DETAIL_ALL_OWNED: Record<string, number> = {
  'Kennen, Heart of the Tempest': 1,
  'Kennen, Storm of Shuriken': 1,
  'Lightning Rush': 3,
  'Fizz, Trickster': 2,
  'The Empyrean': 3,
  'Zaun Warrens': 1,
  'Chaos Rune': 9,
  'Order Rune': 3,
};

export function detailView(
  deck: UserDeck,
  owned: OwnedSpec = { owned: DETAIL_OWNED },
  opts: { decks?: UserDeck[]; locks?: NameLock[]; bans?: BanListFile | null } = {},
): DeckOwnershipView {
  const input = makeInput(DETAIL_CATALOG, owned);
  const shared = computeSharedPool({ decks: opts.decks ?? [deck], locks: opts.locks ?? [], ownership: input });
  return computeDeckOwnership(deck, { status: 'ok', input, shared }, DETAIL_CATALOG, opts.bans ?? null, '2026-11-25');
}
