import { banStatus } from './ban-status';
import { cachedDeckOwnership, deckOwnership } from './deck-ownership';
import { makeCatalog, makeInput, makeTag, printingIdOf } from './engine-fixtures';
import { tileOwnership } from './tile-ownership';
import type { BanListFile } from './types';

describe('SPEC-007 COLL-081 deckOwnership (minimal)', () => {
  const foil = 'p-lr-foil';
  const cat = makeCatalog([{ name: 'Lightning Rush', extraPrintings: [foil] }]);
  const base = printingIdOf('Lightning Rush');

  it('COLL-081 an unowned card is all zeros', () => {
    expect(deckOwnership(makeInput(cat), 'lightning rush')).toEqual({
      cardKey: 'lightning rush',
      owned: 0,
      ownedForDecks: 0,
      ownedExcluded: 0,
      entries: [],
    });
  });

  it('COLL-081 / COLL-012 / COLL-014 entry order: default printing, unassigned, missing printing, then others', () => {
    const input = makeInput(cat, {
      byPrinting: { 'Lightning Rush': { [foil]: 1, 'p-gone': 1, [base]: 1 } },
      tags: [makeTag('t_col', 'Collector', true), makeTag('t_fav', 'Favourite', false)],
      assignments: { [`p:${foil}`]: ['t_col', 't_fav'], 'u:lightning rush': ['t_fav'] },
    });
    input.collection.cards['lightning rush'].quantity = 5; // 2 unassigned
    input.printingCodes.codes['p-gone'] = {
      code: 'OGN-007a',
      cardKey: 'lightning rush',
      lastSeenCatalogVersion: 'old',
    };
    const o = deckOwnership(input, 'lightning rush');
    expect(o).toMatchObject({ owned: 5, ownedForDecks: 4, ownedExcluded: 1 });
    expect(
      o.entries.map((e) => [e.kind, e.printingCode, e.count, e.excluded, e.excludedByTagIds]),
    ).toEqual([
      ['printing', 'OGN-001', 1, false, []],
      ['unassigned', null, 2, false, []],
      ['missing-printing', 'OGN-007a', 1, false, []],
      ['printing', 'OGN-002', 1, true, ['t_col']],
    ]);
  });
});

describe('SPEC-002 LEGAL-B10 banStatus (minimal)', () => {
  const data: BanListFile = {
    schemaVersion: 1,
    dataVersion: 't',
    lastVerified: '2026-11-23',
    lists: [
      {
        format: 'standard',
        region: 'global',
        status: 'verified',
        waves: [
          {
            id: 'std-2026-11-23',
            name: 'Radiance',
            announced: '2026-11-13',
            effective: '2026-11-23',
            sourceUrl: '',
            add: [{ name: 'Zhonya’s Hourglass', kind: 'card' }],
            remove: [],
          },
          {
            id: 'std-2026-07-24',
            name: 'July',
            announced: '2026-07-20',
            effective: '2026-07-24',
            sourceUrl: '',
            add: [{ name: 'Stealthy Pursuer', kind: 'card' }],
            remove: [],
          },
        ],
      },
    ],
  };
  const status = (key: string, asOf: string, region = 'global') =>
    banStatus(data, key, 'standard', region, asOf);

  it('LEGAL-B10 (SPEC-002 AC 20) banned on the effective date, upcoming after the announcement, else not banned', () => {
    expect(status('zhonyas hourglass', '2026-11-23')).toEqual({
      status: 'banned',
      waveId: 'std-2026-11-23',
      waveName: 'Radiance',
      bannedSince: '2026-11-23',
    });
    expect(status('zhonyas hourglass', '2026-11-15')).toEqual({
      status: 'upcoming',
      waveId: 'std-2026-11-23',
      waveName: 'Radiance',
      announced: '2026-11-13',
      effective: '2026-11-23',
    });
    expect(status('zhonyas hourglass', '2026-11-10')).toEqual({ status: 'not-banned' });
  });

  it('LEGAL-B02 a later wave removes a ban; repeated calls return equal, independent results', () => {
    const d: BanListFile = {
      ...data,
      lists: [
        {
          ...data.lists[0],
          waves: [
            ...data.lists[0].waves,
            {
              id: 'std-2026-12-01',
              name: 'Unban',
              announced: '2026-11-25',
              effective: '2026-12-01',
              sourceUrl: '',
              add: [],
              remove: [{ name: 'Zhonya’s Hourglass', kind: 'card' }],
            },
          ],
        },
      ],
    };
    expect(banStatus(d, 'zhonyas hourglass', 'standard', 'global', '2026-12-01')).toEqual({
      status: 'not-banned',
    });
    const a = banStatus(d, 'zhonyas hourglass', 'standard', 'global', '2026-11-30');
    const b = banStatus(d, 'zhonyas hourglass', 'standard', 'global', '2026-11-30');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.status).toBe('banned');
  });

  it('LEGAL-B03 an unknown region falls back to global', () => {
    expect(status('stealthy pursuer', '2026-11-23', 'EU')).toMatchObject({
      status: 'banned',
      bannedSince: '2026-07-24',
    });
  });
});

describe('tileOwnership locked label', () => {
  it('SHARE-040 a locked deck reads "… locked in"', () => {
    expect(tileOwnership(3, 3, true).label).toBe('3 of 3 locked in');
    expect(tileOwnership(0, 2, true)).toMatchObject({ label: '0 of 2 locked in', state: 'none' });
  });
});

describe('OWN-083 cachedDeckOwnership (immutable-input contract)', () => {
  const cat = makeCatalog(['Lightning Rush']);

  it('OWN-083 the same input object reuses its result; a new input object yields fresh results', () => {
    const before = makeInput(cat, { owned: { 'Lightning Rush': 1 } });
    const first = cachedDeckOwnership(before, 'lightning rush');
    expect(cachedDeckOwnership(before, 'lightning rush')).toBe(first);
    expect(first.owned).toBe(1);

    // Contract: callers (H-060) build a new DeckOwnershipInput on every change. Mutating the
    // old object in place is not supported and would return the stale cached result.
    const after = makeInput(cat, { owned: { 'Lightning Rush': 3 } });
    const fresh = cachedDeckOwnership(after, 'lightning rush');
    expect(fresh).not.toBe(first);
    expect(fresh.owned).toBe(3);
    expect(cachedDeckOwnership(before, 'lightning rush').owned).toBe(1);
  });
});
