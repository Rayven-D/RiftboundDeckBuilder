import { describe, expect, it } from 'vitest';
import { CardIndex, parsePublicCode } from '../src/domain/lookup.ts';
import { fixture, normalize, rawCard, rawResponse } from './helpers.ts';

describe('CARD-036 lookupPrinting', () => {
  const index = new CardIndex(
    normalize(
      rawResponse([
        { id: 'OGN', cards: [rawCard({ id: 'base', name: 'Seven', collectorNumber: '007' }), rawCard({ id: 'alt', name: 'Seven', collectorNumber: '007a' }), rawCard({ id: 'tts', name: 'Twosixfive', collectorNumber: '265' })] },
        { id: 'RAD', cards: [rawCard({ id: 'sp', name: 'Showcase', collectorNumber: 'SP1/005' })] },
      ]),
    ).snapshot,
  );

  it.each([
    ['ogn', ' 7'],
    ['OGN', '007'],
  ])('AC19: (%j, %j) → found, base first', (set, num) => {
    expect(index.lookupPrinting(set, num)).toEqual({ status: 'found', cardKey: 'seven', printingIds: ['base', 'alt'] });
  });

  it('AC19: public code without suffix', () => {
    expect(index.lookupPublicCode('OGN-007')).toEqual({ status: 'found', cardKey: 'seven', printingIds: ['base', 'alt'] });
  });

  it('AC19: suffix narrows, cardKey unchanged', () => {
    expect(index.lookupPublicCode('OGN-007a')).toEqual({ status: 'found', cardKey: 'seven', printingIds: ['alt', 'base'] });
  });

  it('unknown suffix → found with variant-not-found note', () => {
    expect(index.lookupPublicCode('OGN-007s')).toEqual({ status: 'found', cardKey: 'seven', printingIds: ['base', 'alt'], note: 'variant-not-found' });
  });

  it('AC19: TTS token drops the copy index', () => {
    expect(parsePublicCode('OGN-265-1')).toEqual({ setCode: 'OGN', collectorNumber: '265' });
    expect(index.lookupPublicCode('OGN-265-1')).toMatchObject({ status: 'found', cardKey: 'twosixfive' });
  });

  it('AC19: block form matches regardless of zeros and case', () => {
    expect(index.lookupPublicCode('RAD-sp1/5')).toEqual({ status: 'found', cardKey: 'showcase', printingIds: ['sp'] });
  });

  it('AC19: missing number → not-found', () => {
    expect(index.lookupPublicCode('OGN-999')).toEqual({ status: 'not-found' });
    expect(index.lookupPublicCode('nonsense')).toEqual({ status: 'not-found' });
  });

  it('ambiguous when numbers collide across cards', () => {
    const i = new CardIndex(normalize(rawResponse([{ id: 'OGN', cards: [rawCard({ name: 'A', collectorNumber: '1' }), rawCard({ name: 'B', collectorNumber: '001' })] }])).snapshot);
    expect(i.lookupPrinting('OGN', '1')).toEqual({ status: 'ambiguous', cardKeys: ['a', 'b'] });
  });
});

describe('CARD-034 article step (AC6, AC21)', () => {
  const idx = (...names: string[]) =>
    new CardIndex(normalize(rawResponse([{ id: 'OGN', cards: names.map((n, i) => rawCard({ id: 'c' + i, name: n, collectorNumber: String(i + 1) })) }])).snapshot);
  it('AC6: Dreaming Tree finds The Dreaming Tree; the reverse too', () => {
    expect(idx('The Dreaming Tree').findCard('Dreaming Tree')?.cardKey).toBe('the dreaming tree');
    expect(idx('Dreaming Tree').findCard('The Dreaming Tree')?.cardKey).toBe('dreaming tree');
  });
  it('AC6: exact wins, partial name is no article match, absent is not-found', () => {
    expect(idx('The Mirror', 'Mirror').findCard('The Mirror')?.cardKey).toBe('the mirror');
    expect(idx('Echo, Twice').lookupName('Echo')).toEqual({ status: 'not-found' });
    expect(idx('The Echo', 'Echo, Twice').findCard('Echo')?.cardKey).toBe('the echo');
  });
  it('AC21: A Pit and The Pit → ambiguous for Pit, exact for each', () => {
    const i = idx('A Pit', 'The Pit');
    expect(i.lookupName('Pit')).toEqual({ status: 'ambiguous', cardKeys: ['a pit', 'the pit'] });
    expect(i.findCard('Pit')).toBeUndefined();
    expect(i.findCard('The Pit')?.cardKey).toBe('the pit');
    expect(i.findCard('A Pit')?.cardKey).toBe('a pit');
  });
  it('AC21: A Pit and Pit, asked for The Pit → ambiguous', () => {
    expect(idx('A Pit', 'Pit').lookupName('The Pit')).toEqual({ status: 'ambiguous', cardKeys: ['a pit', 'pit'] });
  });
});

describe('CARD-033 findCard', () => {
  const index = new CardIndex(normalize(fixture()).snapshot);
  it('AC4: lookup by key, display by canonical name', () => {
    expect(index.findCard('zhonyas hourglass')?.name).toBe('Zhonya’s Hourglass');
  });
  it('AC6: no aliases, no fuzzy matching', () => {
    expect(index.findCard('Kai Sa Survivor')).toBeUndefined();
    expect(index.findCard('Survivor')).toBeUndefined();
  });
});
