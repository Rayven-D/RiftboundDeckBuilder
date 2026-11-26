/**
 * SPEC-001 name keys and the name lookup (CARD-030, CARD-033, CARD-034), with the names of acceptance scenarios 6
 * and 21 (hypothetical names where the spec says so).
 */
import { looseKey, nameKey, nameLookup } from './name-key';

const lookupOver = (...names: string[]) => nameLookup(names.map(nameKey));

describe('SPEC-001 name lookup (CARD-033, CARD-034)', () => {
  it('CARD-034: looseKey drops one leading "a" or "the" token and keeps a bare article', () => {
    expect(looseKey('The Dreaming Tree')).toBe('dreaming tree');
    expect(looseKey('  the   dreaming tree ')).toBe('dreaming tree');
    expect(looseKey('A Pit')).toBe('pit');
    expect(looseKey('Dreaming Tree')).toBe('dreaming tree');
    expect(looseKey('The The Pit')).toBe('the pit'); // one token only
    expect(looseKey('Theater')).toBe('theater'); // a whole token, not a prefix
    expect(looseKey('An Offer')).toBe('an offer'); // only "a" and "the"
    expect(looseKey('The')).toBe('the'); // nothing would remain: looseKey = nameKey
    expect(looseKey('a')).toBe('a');
  });

  it('CARD-034 / AC 6: Dreaming Tree, dreaming tree and The Dreaming Tree all find The Dreaming Tree', () => {
    const lookup = lookupOver('The Dreaming Tree', 'Lightning Rush');
    expect(lookup('Dreaming Tree')).toEqual({ status: 'found', cardKey: 'the dreaming tree', method: 'article' });
    expect(lookup('dreaming tree')).toEqual({ status: 'found', cardKey: 'the dreaming tree', method: 'article' });
    expect(lookup('The Dreaming Tree')).toEqual({ status: 'found', cardKey: 'the dreaming tree', method: 'exact' });
    expect(lookupOver('Lightning Rush')('Dreaming Tree')).toEqual({ status: 'not-found' });
  });

  it('CARD-034 / AC 6: The Dreaming Tree finds a card named Dreaming Tree (both ways)', () => {
    expect(lookupOver('Dreaming Tree')('The Dreaming Tree')).toEqual({
      status: 'found',
      cardKey: 'dreaming tree',
      method: 'article',
    });
    expect(lookupOver('Dreaming Tree')('A Dreaming Tree')).toEqual({
      status: 'found',
      cardKey: 'dreaming tree',
      method: 'article',
    });
  });

  it('CARD-034 / AC 6: an exact match wins over the article rule (The Mirror / Mirror, The Echo / Echo)', () => {
    const mirror = lookupOver('The Mirror', 'Mirror');
    expect(mirror('Mirror')).toEqual({ status: 'found', cardKey: 'mirror', method: 'exact' });
    expect(mirror('The Mirror')).toEqual({ status: 'found', cardKey: 'the mirror', method: 'exact' });
    expect(lookupOver('The Echo', 'Echo')('Echo')).toEqual({ status: 'found', cardKey: 'echo', method: 'exact' });
  });

  it('CARD-033 / CARD-034 / AC 6: a partial name is not an article match (Echo, Twice)', () => {
    expect(lookupOver('Echo, Twice', 'The Echo')('Echo')).toEqual({
      status: 'found',
      cardKey: 'the echo',
      method: 'article',
    });
    expect(lookupOver('Echo, Twice')('Echo')).toEqual({ status: 'not-found' });
  });

  it('CARD-034 / AC 21: A Pit and The Pit make Pit ambiguous; each full name is exact', () => {
    const lookup = lookupOver('The Pit', 'A Pit');
    expect(lookup('Pit')).toEqual({ status: 'ambiguous', cardKeys: ['a pit', 'the pit'] });
    expect(lookup('The Pit')).toEqual({ status: 'found', cardKey: 'the pit', method: 'exact' });
    expect(lookup('A Pit')).toEqual({ status: 'found', cardKey: 'a pit', method: 'exact' });
    expect(lookupOver('The Pit', 'Pit, Twice')('Pit')).toEqual({ status: 'found', cardKey: 'the pit', method: 'article' });
  });

  it('CARD-034: a bare "The" is its own key and does not match every card with an article', () => {
    const lookup = lookupOver('The Pit', 'The Dreaming Tree');
    expect(lookup('The')).toEqual({ status: 'not-found' });
    expect(lookupOver('The', 'The Pit')('the')).toEqual({ status: 'found', cardKey: 'the', method: 'exact' });
    expect(lookup('')).toEqual({ status: 'not-found' });
  });
});
