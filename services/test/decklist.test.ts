import { describe, expect, it } from 'vitest';
import { parseDecklistNote } from '../src/domain/decklist.ts';

const NOTE = `---
tags: [decklist]
legend: "Kai'Sa, Daughter of the Void"
champion: "Kai'Sa, Survivor"
placing: 5
---
# Title

## Main deck
3 Star-Crossed
1 Zhonya's Hourglass

## Runes
6 Calm Rune

## Battlefields
1 Emperor's Dais

## Notes
- 3 copies is the limit
`;

describe('V-003 decklist note parser', () => {
  it('reads legend, champion and section lines, skipping Notes', () => {
    expect(parseDecklistNote(NOTE)).toEqual([
      { count: 1, name: "Kai'Sa, Daughter of the Void", section: 'legend' },
      { count: 1, name: "Kai'Sa, Survivor", section: 'champion' },
      { count: 3, name: 'Star-Crossed', section: 'Main deck' },
      { count: 1, name: "Zhonya's Hourglass", section: 'Main deck' },
      { count: 6, name: 'Calm Rune', section: 'Runes' },
      { count: 1, name: "Emperor's Dais", section: 'Battlefields' },
    ]);
  });
});
