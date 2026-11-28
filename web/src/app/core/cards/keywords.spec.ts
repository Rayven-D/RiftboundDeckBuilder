/**
 * SPEC-011 Keyword Explanations (0.2.2) engine, named by requirement ID and acceptance criterion. Terms are the
 * spec's placeholders (Alpha, Beta takes a value, Gamma has no entry, Delta Step), not Riftbound keywords.
 * ACs 3, 5, 8, 18 and 23 assume the `keywords[]` string format and are provisional until H-020 (KW-030a).
 */
import {
  KeywordEntry,
  KeywordGlossary,
  cardKeywords,
  indexGlossary,
  keywordKey,
  keywordReport,
  keywordSourceLine,
  parseKeyword,
} from './keywords';

const entry = (displayName: string, over: Partial<KeywordEntry> = {}): KeywordEntry => ({
  keywordId: keywordKey(displayName),
  displayName,
  definition: `Definition ${displayName[0]}.`,
  takesValue: null,
  source: { title: 'Core Rules', locator: '900.1.b', url: null, documentDate: '2026-10-09' },
  asOf: '2026-11-24',
  status: 'verified',
  introducedIn: null,
  ...over,
});

const glossary = (...entries: KeywordEntry[]): KeywordGlossary => ({ schemaVersion: 1, asOf: '2026-11-24', entries });
const standard = () =>
  glossary(entry('Alpha'), entry('Beta', { takesValue: true }), entry('Delta Step', { definition: 'Definition D.' }));
const rows = (keywords: string[] | null | undefined, g: KeywordGlossary = standard()) =>
  cardKeywords(keywords, indexGlossary(g)).map((r) => r.label);

describe('SPEC-011 keywordKey and value parsing (KW-032, KW-033)', () => {
  it('KW-033: NFKC, lower-case, trim, collapsed spaces, one enclosing bracket pair, trailing punctuation', () => {
    expect(keywordKey('  ALPHA  ')).toBe('alpha');
    expect(keywordKey('[Alpha]')).toBe('alpha');
    expect(keywordKey('alpha.')).toBe('alpha');
    expect(keywordKey('Ａｌｐｈａ')).toBe('alpha'); // NFKC full-width
    expect(keywordKey('delta  step')).toBe('delta step');
    expect(keywordKey('Multi-Word Term')).toBe('multi-word term'); // hyphen kept
    expect(keywordKey('[[Alpha]]')).toBe('[alpha]'); // one pair only
    expect(keywordKey('[a] [b]')).toBe('[a] [b]'); // not one enclosing pair
  });

  it('KW-032: a trailing integer after spaces is the value; no default value, no sums', () => {
    expect(parseKeyword('Beta 2')).toEqual({ keywordId: 'beta', value: 2 });
    expect(parseKeyword('Beta')).toEqual({ keywordId: 'beta', value: null });
    expect(parseKeyword('Beta2')).toEqual({ keywordId: 'beta2', value: null });
    expect(parseKeyword('Beta 2.')).toEqual({ keywordId: 'beta', value: 2 });
    expect(parseKeyword('[Beta 3]')).toEqual({ keywordId: 'beta', value: 3 });
    expect(parseKeyword('7')).toEqual({ keywordId: '7', value: null });
  });

  it('KW-030: blank strings are no keyword', () => {
    expect(parseKeyword('')).toBeNull();
    expect(parseKeyword('   ')).toBeNull();
    expect(parseKeyword('[ ]')).toBeNull();
  });
});

describe('SPEC-011 glossary load checks (KW-010…016)', () => {
  it('KW-010 / KW-012: a complete verified entry is shown', () => {
    const index = indexGlossary(standard());
    expect([...index.shown.keys()]).toEqual(['alpha', 'beta', 'delta step']);
  });

  it('KW-013 / AC 11: an unverified entry is hidden with reason unverified', () => {
    const g = glossary(entry('Alpha', { status: 'unverified' }));
    expect(rows(['Alpha'], g)).toEqual([]);
    expect(keywordReport([{ cardKey: 'card-x', keywords: ['Alpha'] }], indexGlossary(g))).toEqual([
      { code: 'keyword-no-definition', keywordId: 'alpha', reason: 'unverified', rawStrings: ['Alpha'], cardCount: 1, cardKeys: ['card-x'] },
    ]);
  });

  it('KW-035 / AC 12: an empty definition is incomplete and hidden', () => {
    const g = glossary(entry('Alpha', { definition: '' }));
    expect(rows(['Alpha'], g)).toEqual([]);
    expect(keywordReport([{ cardKey: 'card-x', keywords: ['Alpha'] }], indexGlossary(g))[0].reason).toBe('incomplete');
  });

  it('KW-010 / KW-012 / KW-016: missing source title, bad asOf, bad takesValue or a wrong keywordId are incomplete', () => {
    const bad = [
      entry('Alpha', { source: { title: '', locator: null, url: null, documentDate: null } }),
      entry('Beta', { asOf: 'Nov 24' }),
      entry('Delta Step', { takesValue: 'yes' as unknown as boolean }),
      entry('Epsilon', { keywordId: 'other' }),
    ];
    const index = indexGlossary(glossary(...bad));
    expect(index.shown.size).toBe(0);
    expect([...index.hidden.values()].map((h) => h.reason)).toEqual(['incomplete', 'incomplete', 'incomplete', 'incomplete']);
  });

  it('KW-014 / AC 17: two entries with one keywordId are reported with both names and neither is shown', () => {
    const index = indexGlossary(glossary(entry('Alpha'), entry('ALPHA')));
    expect(cardKeywords(['Alpha'], index)).toEqual([]);
    expect(keywordReport([], index)).toEqual([
      { code: 'duplicate-keyword', keywordId: 'alpha', rawStrings: ['Alpha', 'ALPHA'], cardCount: 0, cardKeys: [] },
    ]);
    expect(keywordReport([{ cardKey: 'card-x', keywords: ['Alpha'] }], index)).toEqual([
      { code: 'duplicate-keyword', keywordId: 'alpha', rawStrings: ['Alpha', 'ALPHA'], cardCount: 1, cardKeys: ['card-x'] },
    ]);
  });

  it('KW-056: an absent, null or malformed glossary is empty', () => {
    for (const g of [undefined, null, 'oops', {}, { entries: 'x' }, { entries: [null, 3, {}] }]) {
      expect(indexGlossary(g).shown.size).toBe(0);
    }
  });
});

describe('SPEC-011 card keyword engine (KW-030…037, ACs)', () => {
  it('AC 1 / AC 2 / KW-050 / KW-051: source line with and without a locator, American date', () => {
    const [row] = cardKeywords(['Alpha'], indexGlossary(standard()));
    expect(row.label).toBe('Alpha');
    expect(row.entry.definition).toBe('Definition A.');
    expect(keywordSourceLine(row.entry)).toBe('Source: Core Rules 900.1.b, as of Nov 24, 2026');
    const noLoc = entry('Alpha', { source: { title: 'Core Rules', locator: null, url: null, documentDate: null } });
    expect(keywordSourceLine(noLoc)).toBe('Source: Core Rules, as of Nov 24, 2026');
  });

  it('AC 3 [H-020] / KW-032: "Beta 2" shows chip "Beta 2" with Beta\'s definition', () => {
    const [row] = cardKeywords(['Beta 2'], indexGlossary(standard()));
    expect(row).toEqual(expect.objectContaining({ keywordId: 'beta', label: 'Beta 2', values: [2] }));
    expect(row.entry.displayName).toBe('Beta');
  });

  it('AC 4 / KW-032 / KW-037: "Beta" with takesValue true reads "Beta" and reports no mismatch', () => {
    expect(rows(['Beta'])).toEqual(['Beta']);
    expect(keywordReport([{ cardKey: 'card-x', keywords: ['Beta'] }], indexGlossary(standard()))).toEqual([]);
  });

  it('AC 5 [H-020] / KW-033 / KW-034: case, brackets and punctuation collapse to one row with the entry name', () => {
    expect(rows(['ALPHA', '[Alpha]', 'alpha.'])).toEqual(['Alpha']);
  });

  it('AC 6 / KW-033: "delta  step" matches "delta step" and reads "Delta Step"', () => {
    const [row] = cardKeywords(['delta  step'], indexGlossary(standard()));
    expect(row.keywordId).toBe('delta step');
    expect(row.label).toBe('Delta Step');
  });

  it('AC 7 / KW-034: an exact repeat collapses', () => {
    expect(rows(['Beta 2', 'Beta 2'])).toEqual(['Beta 2']);
  });

  it('AC 8 [H-020] / KW-034 / KW-036: different values join in order, rows by first appearance, no sums', () => {
    const r = cardKeywords(['Beta 3', 'Alpha', 'Beta 6'], indexGlossary(standard()));
    expect(r.map((x) => x.label)).toEqual(['Beta 3, 6', 'Alpha']);
    expect(r[0].values).toEqual([3, 6]);
  });

  it('AC 9 / KW-034: valued and value-less instances show the values and report keyword-mixed-value', () => {
    expect(rows(['Beta', 'Beta 2'])).toEqual(['Beta 2']);
    expect(keywordReport([{ cardKey: 'card-x', keywords: ['Beta', 'Beta 2'] }], indexGlossary(standard()))).toEqual([
      { code: 'keyword-mixed-value', keywordId: 'beta', rawStrings: ['Beta', 'Beta 2'], cardCount: 1, cardKeys: ['card-x'] },
    ]);
  });

  it('AC 10 / KW-035 / KW-052: an unknown keyword is hidden and reported once with its cards', () => {
    const cards = [
      { cardKey: 'card-x', keywords: ['Alpha', 'Gamma'] },
      { cardKey: 'card-y', keywords: ['Alpha', 'Gamma'] },
    ];
    expect(rows(cards[0].keywords)).toEqual(['Alpha']);
    expect(keywordReport(cards, indexGlossary(standard()))).toEqual([
      {
        code: 'keyword-no-definition',
        keywordId: 'gamma',
        reason: 'no-entry',
        rawStrings: ['Gamma'],
        cardCount: 2,
        cardKeys: ['card-x', 'card-y'],
      },
    ]);
  });

  it('KW-035: the report keeps every raw string, counts all cards and lists at most 20 cardKeys', () => {
    const cards = Array.from({ length: 25 }, (_, i) => ({ cardKey: `c${i}`, keywords: [i % 2 ? 'Gamma' : '[GAMMA]'] }));
    const [row] = keywordReport(cards, indexGlossary(standard()));
    expect(row.rawStrings).toEqual(['[GAMMA]', 'Gamma']);
    expect(row.cardCount).toBe(25);
    expect(row.cardKeys.length).toBe(20);
  });

  it('AC 13 / KW-030 / KW-053: empty, missing or null keywords, or only unknown ones, give no rows', () => {
    expect(rows([])).toEqual([]);
    expect(rows(['Gamma'])).toEqual([]);
    expect(rows(undefined)).toEqual([]);
    expect(rows(null)).toEqual([]);
  });

  it('AC 14 / KW-056 / KW-003 / KW-035: an empty glossary shows nothing and reports every keyword as no-entry', () => {
    const empty = indexGlossary(glossary());
    const cards = [
      { cardKey: 'card-x', keywords: ['Alpha', 'Beta 2'] },
      { cardKey: 'card-y', keywords: null },
    ];
    expect(cardKeywords(cards[0].keywords, empty)).toEqual([]);
    expect(keywordReport(cards, empty).map((r) => [r.keywordId, r.reason])).toEqual([
      ['alpha', 'no-entry'],
      ['beta', 'no-entry'],
    ]);
  });

  it('AC 15 / KW-031: keywords are never read from card text', () => {
    const card = { cardKey: 'card-x', keywords: [] as string[], text: '[Alpha] (Reminder for alpha.) Deal 2.' };
    expect(cardKeywords(card.keywords, indexGlossary(standard()))).toEqual([]);
    expect(keywordReport([card], indexGlossary(standard()))).toEqual([]);
  });

  it('AC 16 / KW-004: reminder text is never used as a definition', () => {
    const card = { cardKey: 'card-x', keywords: ['Gamma'], text: '[Gamma] (Gamma reminder text.)' };
    expect(cardKeywords(card.keywords, indexGlossary(standard()))).toEqual([]);
    expect(JSON.stringify(keywordReport([card], indexGlossary(standard())))).not.toContain('reminder');
  });

  it('AC 18 [H-020] / KW-033a: unstripped markup fails lookup and is reported as no-entry', () => {
    expect(rows(['Alpha [>]'])).toEqual([]);
    const [row] = keywordReport([{ cardKey: 'card-x', keywords: ['Alpha [>]'] }], indexGlossary(standard()));
    expect(row).toEqual(expect.objectContaining({ keywordId: 'alpha [>]', reason: 'no-entry' }));
  });

  it('AC 19 / KW-037 / KW-016: a value on a takesValue false keyword is reported and still shown as given', () => {
    const g = glossary(entry('Alpha', { takesValue: false }));
    expect(rows(['Alpha 2'], g)).toEqual(['Alpha 2']);
    expect(keywordReport([{ cardKey: 'card-x', keywords: ['Alpha 2'] }], indexGlossary(g))).toEqual([
      { code: 'keyword-value-mismatch', keywordId: 'alpha', rawStrings: ['Alpha 2'], cardCount: 1, cardKeys: ['card-x'] },
    ]);
  });

  it('AC 22 / KW-030: blank entries are ignored and not reported', () => {
    const cards = [{ cardKey: 'card-x', keywords: ['Alpha', '', '  '] }];
    expect(rows(cards[0].keywords)).toEqual(['Alpha']);
    expect(keywordReport(cards, indexGlossary(standard()))).toEqual([]);
  });

  it('AC 23 [H-020] / KW-033: trailing punctuation is removed before matching', () => {
    const cards = [{ cardKey: 'card-x', keywords: ['Alpha,', 'Alpha:', 'Alpha;', 'Beta 2.'] }];
    expect(rows(cards[0].keywords)).toEqual(['Alpha', 'Beta 2']);
    expect(keywordReport(cards, indexGlossary(standard()))).toEqual([]);
  });
});
