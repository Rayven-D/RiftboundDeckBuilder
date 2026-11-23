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
