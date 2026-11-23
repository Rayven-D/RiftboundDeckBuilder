import { describe, expect, it } from 'vitest';
import { nameKey } from '../src/domain/name-key.ts';

describe('CARD-030 nameKey', () => {
  it.each([
    ['kai’sa, survivor', 'kaisa survivor'],
    ["KAI'SA SURVIVOR", 'kaisa survivor'],
    ["Kaí'Sa,  Survivor ", 'kaisa survivor'],
    ['Zhonya’s Hourglass', 'zhonyas hourglass'],
    ["Zhonya's Hourglass", 'zhonyas hourglass'],
    ['Star-Crossed', 'starcrossed'],
    ['Star–Crossed', 'starcrossed'],
    ["An Offer You Can't Refuse", 'an offer you cant refuse'],
    ['Riven, The Exile', 'riven the exile'],
    ["Emperor's Dais", 'emperors dais'],
    ['“Quoted” Name!?', 'quoted name'],
    ['Ｆｕｌｌｗｉｄｔｈ', 'fullwidth'],
  ])('AC3: %j → %j', (input, expected) => {
    expect(nameKey(input)).toBe(expected);
  });

  it('AC5 / CARD-032: Star-Crossed and Star Crossed are different keys', () => {
    expect(nameKey('Star-Crossed')).toBe('starcrossed');
    expect(nameKey('Star Crossed')).toBe('star crossed');
  });

  it('CARD-014: subtitles separate cards', () => {
    expect(nameKey('Riven, The Exile')).not.toBe(nameKey('Riven, Broken Blade'));
  });

  it('is idempotent (a cardKey maps to itself)', () => {
    expect(nameKey(nameKey("Kai'Sa, Survivor"))).toBe('kaisa survivor');
  });
});
