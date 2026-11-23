import { describe, expect, it } from 'vitest';
import { collectorKey } from '../src/domain/collector.ts';

describe('CARD-037 collectorKey', () => {
  it('plain form, leading zeros and suffix', () => {
    expect(collectorKey(' 007a')).toEqual({ key: '7', block: null, number: 7, suffix: 'A', form: 'plain' });
    expect(collectorKey('001').key).toBe(collectorKey('1').key);
    expect(collectorKey('01').key).toBe('1');
  });
  it('block form', () => {
    expect(collectorKey('sp1/005')).toEqual({ key: 'SP1/5', block: 'SP1', number: 5, suffix: null, form: 'block' });
    expect(collectorKey('SP1/005').key).toBe(collectorKey('sp1/5').key);
  });
  it('fraction form ignores the total', () => {
    expect(collectorKey('300/250')).toEqual({ key: '300', block: null, number: 300, suffix: null, form: 'fraction' });
    expect(collectorKey('005/298').key).toBe('5');
  });
  it('leading # is removed', () => {
    expect(collectorKey('#12').key).toBe('12');
  });
  it('anything else is a code', () => {
    expect(collectorKey('promo-x')).toEqual({ key: '#PROMO-X', block: null, number: null, suffix: null, form: 'code' });
  });
  it('star suffix', () => {
    expect(collectorKey('12*').suffix).toBe('*');
  });
});
