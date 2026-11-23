import {
  entriesToText,
  parseCardCsv,
  parseCardRows,
  parseCardText,
  rowsToText,
  splitCsv,
} from './parse-card-list';

describe('parseCardText', () => {
  it('accepts "1 name", "1x name", "1 x name" and "1X name"', () => {
    const r = parseCardText('3 Lightning Rush\n2x Hextech Ray\n1 x Void Gate\n4X Rally Banner');
    expect(r.issues).toEqual([]);
    expect(r.entries.map((e) => [e.quantity, e.name])).toEqual([
      [3, 'Lightning Rush'],
      [2, 'Hextech Ray'],
      [1, 'Void Gate'],
      [4, 'Rally Banner'],
    ]);
    expect(r.totalCopies).toBe(10);
  });

  it('keeps commas inside card names', () => {
    const r = parseCardText('1 Kennen, Heart of the Tempest');
    expect(r.entries[0]).toMatchObject({ quantity: 1, name: 'Kennen, Heart of the Tempest' });
  });

  it('does not eat a leading X that belongs to the name', () => {
    expect(parseCardText('2 Xenon Ray').entries[0].name).toBe('Xenon Ray');
  });

  it('flags a line without a number instead of assuming 1', () => {
    const r = parseCardText('Lightning Rush\n2 Hextech Ray');
    expect(r.entries).toHaveLength(1);
    expect(r.issues).toEqual([
      expect.objectContaining({ line: 1, code: 'MISSING_QUANTITY', severity: 'error' }),
    ]);
  });

  it('reports bad, zero and nameless quantities without stopping the rest', () => {
    const r = parseCardText('0 Void Gate\n1000 Rally Banner\n3x\n1 Hextech Ray');
    expect(r.issues.map((i) => [i.line, i.code])).toEqual([
      [1, 'ZERO_QUANTITY'],
      [2, 'BAD_QUANTITY'],
      [3, 'MISSING_NAME'],
    ]);
    expect(r.entries).toHaveLength(1);
  });

  it('skips blank and comment lines and records section labels', () => {
    const text = [
      '// my list',
      'Legend:',
      '1 Kennen, Heart of the Tempest',
      '',
      '## Main Deck',
      '3 Lightning Rush',
      'Sideboard',
      '1 Void Gate',
      'Champion: 1 Kennen, Storm of Shuriken',
    ].join('\r\n');
    const r = parseCardText(text);
    expect(r.issues).toEqual([]);
    expect(r.entries.map((e) => [e.section, e.name])).toEqual([
      ['legend', 'Kennen, Heart of the Tempest'],
      ['main', 'Lightning Rush'],
      ['sideboard', 'Void Gate'],
      ['champion', 'Kennen, Storm of Shuriken'],
    ]);
  });

  it.each([
    ['Main Deck', 'main'],
    ['MainDeck', 'main'],
    ['maindeck:', 'main'],
    ['Rune Pool', 'runes'],
    ['RunePool:', 'runes'],
    ['## RUNEPOOL', 'runes'],
  ] as const)('reads the label "%s" as a section', (label, section) => {
    const r = parseCardText(`${label}\n3 Lightning Rush`);
    expect(r.issues).toEqual([]);
    expect(r.entries[0].section).toBe(section);
  });

  it('reads one-word labels in CSV rows too', () => {
    const r = parseCardCsv('MainDeck\n3,Lightning Rush\nRunePool\n6,Calm Rune');
    expect(r.entries.map((e) => e.section)).toEqual(['main', 'runes']);
  });

  it('rejects input over the line limit', () => {
    const r = parseCardText('1 A\n'.repeat(10_001));
    expect(r.issues[0].code).toBe('INPUT_TOO_LARGE');
    expect(r.entries).toEqual([]);
  });
});

describe('parseCardCsv', () => {
  it('reads quantity and name columns and skips a header row', () => {
    const r = parseCardCsv('Quantity,Name\n3,Lightning Rush\n2x,"Kennen, Heart of the Tempest"\n');
    expect(r.issues).toEqual([]);
    expect(r.entries.map((e) => [e.line, e.quantity, e.name])).toEqual([
      [2, 3, 'Lightning Rush'],
      [3, 2, 'Kennen, Heart of the Tempest'],
    ]);
  });

  it('reads one-cell rows with the same rule as pasted text', () => {
    const r = parseCardCsv('3x Lightning Rush\n1 Void Gate');
    expect(r.entries.map((e) => e.name)).toEqual(['Lightning Rush', 'Void Gate']);
  });

  it('joins an unquoted name that was split on its comma', () => {
    const r = parseCardCsv('1,Kennen, Heart of the Tempest');
    expect(r.entries[0].name).toBe('Kennen, Heart of the Tempest');
  });

  it('supports semicolons, tabs and escaped quotes', () => {
    expect(parseCardCsv('2;Void Gate').entries[0]).toMatchObject({
      quantity: 2,
      name: 'Void Gate',
    });
    expect(parseCardCsv('2\tVoid Gate').entries[0]).toMatchObject({
      quantity: 2,
      name: 'Void Gate',
    });
    expect(parseCardCsv('1,"An ""Odd"" Card"').entries[0].name).toBe('An "Odd" Card');
  });

  it('flags a row that does not start with a number', () => {
    const r = parseCardCsv('3,Lightning Rush\nVoid Gate,2');
    expect(r.issues).toEqual([expect.objectContaining({ line: 2, code: 'MISSING_QUANTITY' })]);
  });
});

describe('parseCardRows (Excel)', () => {
  it('reads numeric quantity cells and ignores empty trailing cells', () => {
    const r = parseCardRows([
      ['Qty', 'Card name', null],
      [3, 'Lightning Rush', null],
      ['1x Void Gate'],
      [],
    ]);
    expect(r.issues).toEqual([]);
    expect(r.entries.map((e) => [e.quantity, e.name])).toEqual([
      [3, 'Lightning Rush'],
      [1, 'Void Gate'],
    ]);
  });
});

describe('entriesToText', () => {
  it('writes one line per entry with section labels', () => {
    const r = parseCardText('Main Deck:\n3x Lightning Rush\nSideboard:\n1 Void Gate');
    expect(entriesToText(r)).toBe('Main Deck:\n3 Lightning Rush\nSideboard:\n1 Void Gate');
  });
});

describe('rowsToText', () => {
  it('turns rows into editable lines that parse the same way', () => {
    const rows = splitCsv(
      'Qty,Name\n3,Lightning Rush\n2x,"Kennen, Heart of the Tempest"\nVoid Gate,2\n',
    );
    const text = rowsToText(rows);
    expect(text).toBe('3 Lightning Rush\n2x Kennen, Heart of the Tempest\nVoid Gate, 2');
    const r = parseCardText(text);
    expect(r.entries.map((e) => e.name)).toEqual([
      'Lightning Rush',
      'Kennen, Heart of the Tempest',
    ]);
    expect(r.issues).toEqual([expect.objectContaining({ line: 3, code: 'MISSING_QUANTITY' })]);
  });
});

describe('quantity forms (IMP-019, IMP-020)', () => {
  it.each([
    ['3 Lightning Rush', 3],
    ['3x Lightning Rush', 3],
    ['3X Lightning Rush', 3],
    ['3 x Lightning Rush', 3],
    ['3 X Lightning Rush', 3],
    ['x3 Lightning Rush', 3],
    ['X3 Lightning Rush', 3],
    ['Lightning Rush x3', 3],
    ['Lightning Rush X3', 3],
  ] as const)('reads "%s"', (line, quantity) => {
    const r = parseCardText(line);
    expect(r.issues).toEqual([]);
    expect(r.entries).toEqual([
      { line: 1, quantity, name: 'Lightning Rush', printing: null, section: null },
    ]);
  });

  it('follows SPEC-003 AC 27', () => {
    const r = parseCardText(
      [
        'x3 Lightning Rush',
        'Lightning Rush x3',
        'X2 Hextech Ray',
        'Hextech Ray X2',
        '3 Lightning Rush x3',
        'Lightning Rush 3',
        'x3',
        'Gust x0',
      ].join('\n'),
    );
    expect(r.entries.map((e) => [e.line, e.quantity, e.name])).toEqual([
      [1, 3, 'Lightning Rush'],
      [2, 3, 'Lightning Rush'],
      [3, 2, 'Hextech Ray'],
      [4, 2, 'Hextech Ray'],
    ]);
    expect(r.issues.map((i) => [i.line, i.code, i.severity])).toEqual([
      [5, 'BAD_QUANTITY', 'error'],
      [6, 'MISSING_QUANTITY', 'error'],
      [7, 'MISSING_NAME', 'error'],
      [8, 'ZERO_QUANTITY', 'warning'],
    ]);
    expect(r.issues[0].message).toBe('Give the number of copies once per line.');
    expect(r.totalCopies).toBe(10);
  });

  it.each([
    '3 Lightning Rush x3',
    'x3 Lightning Rush x3',
    '3 Lightning Rush x3 RAD 001',
    '3x RAD 001 x2',
  ])('rejects two quantities in "%s"', (line) => {
    const r = parseCardText(line);
    expect(r.entries).toEqual([]);
    expect(r.issues).toEqual([
      expect.objectContaining({
        code: 'BAD_QUANTITY',
        message: 'Give the number of copies once per line.',
      }),
    ]);
  });

  it.each(['Lightning Rush 3', 'Lightning Rush 3x', 'RAD 001/167'])(
    'needs a quantity in "%s"',
    (line) => {
      expect(parseCardText(line).issues[0].code).toBe('MISSING_QUANTITY');
    },
  );

  it.each(['3', '3x', '3 x', 'x3', 'X3'])('flags "%s" as a number without a name', (line) => {
    expect(parseCardText(line).issues[0].code).toBe('MISSING_NAME');
  });

  it('applies the value rules to trailing quantities', () => {
    const r = parseCardText('Gust x0\nGust x1000\n-1 Gust');
    expect(r.issues.map((i) => i.code)).toEqual(['ZERO_QUANTITY', 'BAD_QUANTITY', 'BAD_QUANTITY']);
  });
});

describe('printing codes (IMP-064, IMP-065, IMP-066)', () => {
  it.each([
    ['3 Lightning Rush RAD 001/167', 3, 'Lightning Rush', 'RAD', '001/167', 'RAD 001/167'],
    ['3x RAD-001/167 Lightning Rush', 3, 'Lightning Rush', 'RAD', '001/167', 'RAD-001/167'],
    [
      '1 Kennen, Heart of the Tempest (OGN 299/298)',
      1,
      'Kennen, Heart of the Tempest',
      'OGN',
      '299/298',
      'OGN 299/298',
    ],
    ['Lightning Rush x3 RAD 001 /167', 3, 'Lightning Rush', 'RAD', '001 /167', 'RAD 001 /167'],
    ['Lightning Rush RAD 001/167 x3', 3, 'Lightning Rush', 'RAD', '001/167', 'RAD 001/167'],
    ['2 OGN-007a Lightning Rush', 2, 'Lightning Rush', 'OGN', '007a', 'OGN-007a'],
    ['2 [ogn-007a] Lightning Rush', 2, 'Lightning Rush', 'OGN', '007a', 'ogn-007a'],
    ['1 Lightning Rush - rad 1 / 167', 1, 'Lightning Rush', 'RAD', '1 / 167', 'rad 1 / 167'],
    ['1 Lightning Rush - RAD 001', 1, 'Lightning Rush', 'RAD', '001', 'RAD 001'],
    ['1 Lightning Rush RAD-SP1/005', 1, 'Lightning Rush', 'RAD', 'SP1/005', 'RAD-SP1/005'],
    ['3 Lightning Rush RAD001', 3, 'Lightning Rush', 'RAD', '001', 'RAD001'],
    ['1 Lightning Rush(RAD 001)', 1, 'Lightning Rush', 'RAD', '001', 'RAD 001'],
    ['1 Lightning Rush -(RAD 001)', 1, 'Lightning Rush', 'RAD', '001', 'RAD 001'],
    ['1 Ion Arc 2', 1, 'Ion', 'ARC', '2', 'Arc 2'],
  ] as const)('reads "%s"', (line, quantity, name, setCode, collectorNumber, text) => {
    const r = parseCardText(line);
    expect(r.issues).toEqual([]);
    expect(r.entries).toEqual([
      { line: 1, quantity, name, printing: { setCode, collectorNumber, text }, section: null },
    ]);
  });

  it.each([
    ['3 RAD 001/167', 3, 'RAD', '001/167'],
    ['x2 OGN-007a', 2, 'OGN', '007a'],
    ['RAD 001 x3', 3, 'RAD', '001'],
    ['2 (OGN 299/298)', 2, 'OGN', '299/298'],
  ] as const)('accepts the code-only line "%s"', (line, quantity, setCode, collectorNumber) => {
    const r = parseCardText(line);
    expect(r.issues).toEqual([]);
    expect(r.entries[0]).toMatchObject({
      quantity,
      name: '',
      printing: { setCode, collectorNumber },
    });
    expect(r.totalCopies).toBe(quantity);
  });

  it.each([
    ['3 Lightning Rush 001/167', 'Lightning Rush 001/167'],
    ['2 Seal of Discord RAD', 'Seal of Discord RAD'],
    ['3 Lightning Rush 001', 'Lightning Rush 001'],
    ['1 Lightning RushRAD 001', 'Lightning RushRAD 001'],
    ['1 Lightning Rush -RAD 001', 'Lightning Rush -RAD 001'],
  ])('keeps code-like text in the name of "%s"', (line, name) => {
    const r = parseCardText(line);
    expect(r.issues).toEqual([]);
    expect(r.entries[0]).toMatchObject({ name, printing: null });
  });

  it('takes at most one code per line', () => {
    const r = parseCardText('1 RAD 001 Lightning Rush OGN 002');
    expect(r.entries[0]).toMatchObject({
      name: 'RAD 001 Lightning Rush',
      printing: { setCode: 'OGN', collectorNumber: '002' },
    });
  });

  it('reads codes in the entry after a label', () => {
    const r = parseCardText(
      [
        'Champion: 1 Kennen, Storm of Shuriken (OGN 299/298)',
        'Legend: 1 OGN-007a',
        'Main Deck:',
        '3 RAD 001/167',
      ].join('\n'),
    );
    expect(r.issues).toEqual([]);
    expect(r.entries.map((e) => [e.section, e.quantity, e.name, e.printing?.text])).toEqual([
      ['champion', 1, 'Kennen, Storm of Shuriken', 'OGN 299/298'],
      ['legend', 1, '', 'OGN-007a'],
      ['main', 3, '', 'RAD 001/167'],
    ]);
  });

  it('writes codes back out in entriesToText', () => {
    const r = parseCardText('Main Deck:\n3 Lightning Rush (RAD 001/167)\n2 OGN-007a');
    const text = entriesToText(r);
    expect(text).toBe('Main Deck:\n3 Lightning Rush RAD 001/167\n2 OGN-007a');
    expect(parseCardText(text).entries.map((e) => [e.name, e.printing])).toEqual(
      r.entries.map((e) => [e.name, e.printing]),
    );
  });
});

describe('printing codes in CSV and Excel rows (IMP-040)', () => {
  it('follows SPEC-003 AC 34', () => {
    const csv =
      'Qty,Name\n3,Lightning Rush,RAD 001/167\nLightning Rush x2\n1,Lightning Rush,RAD,001a\n';
    expect(rowsToText(splitCsv(csv))).toBe(
      '3 Lightning Rush, RAD 001/167\nLightning Rush x2\n1 Lightning Rush, RAD, 001a',
    );
    for (const r of [parseCardCsv(csv), parseCardText(rowsToText(splitCsv(csv)))]) {
      expect(r.issues).toEqual([]);
      expect(r.entries.map((e) => [e.quantity, e.name, e.printing?.text ?? null])).toEqual([
        [3, 'Lightning Rush', 'RAD 001/167'],
        [2, 'Lightning Rush', null],
        [1, 'Lightning Rush, RAD, 001a', null],
      ]);
    }
  });

  it('reads codes and trailing quantities in one-cell and Excel rows', () => {
    const r = parseCardRows([['3 RAD 001/167 Lightning Rush'], [2, 'OGN-007a'], ['Gust x2']]);
    expect(r.issues).toEqual([]);
    expect(r.entries.map((e) => [e.quantity, e.name, e.printing?.setCode ?? null])).toEqual([
      [3, 'Lightning Rush', 'RAD'],
      [2, '', 'OGN'],
      [2, 'Gust', null],
    ]);
  });
});
