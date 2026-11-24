import { readSheet } from 'read-excel-file/browser';
import {
  ImportFileError,
  ParseResult,
  parseCardText,
  readImportFile,
  rowsToText,
} from './parse-card-list';

/** The dialog's upload path: file → text box (IMP-062) → the same parse as pasted text. */
async function uploadFile(
  name: string,
  content: BlobPart,
): Promise<{ text: string; result: ParseResult }> {
  const { text, upload } = await readImportFile(new File([content], name));
  return { text, result: parseCardText(text, { upload }) };
}

/** The Excel path after `readSheet` returns the first sheet's rows: rows → text box → parse. */
function excelUpload(rows: readonly (readonly unknown[])[]): { text: string; result: ParseResult } {
  const text = rowsToText(rows);
  return {
    text,
    result: parseCardText(text, { upload: { fileName: 'owned.xlsx', fileType: 'xlsx' } }),
  };
}

async function rejection(name: string, content: BlobPart): Promise<ImportFileError> {
  try {
    await readImportFile(new File([content], name));
  } catch (err) {
    if (err instanceof ImportFileError) return err;
    throw err;
  }
  throw new Error(`${name} was not rejected`);
}

const MiB = 1024 * 1024;

vi.mock('read-excel-file/browser', () => ({ readSheet: vi.fn() }));

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
    expect(r.summary.totalCopies).toBe(10);
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

  it('rejects input over the line limit', () => {
    const r = parseCardText('1 A\n'.repeat(10_001));
    expect(r.issues[0].code).toBe('INPUT_TOO_LARGE');
    expect(r.entries).toEqual([]);
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
    expect(r.summary.totalCopies).toBe(10);
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
    expect(r.summary.totalCopies).toBe(quantity);
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
});

describe('CSV uploads (readImportFile, IMP-040…045, IMP-062)', () => {
  it('follows SPEC-003 AC 13', async () => {
    const { text, result } = await uploadFile(
      'my.csv',
      'Quantity,Card Name\n2,"Kennen, Storm of Shuriken"\n1,Kennen,Heart of the Tempest\n3x Gust\nTraveling Merchant,\n',
    );
    expect(text).toBe(
      '2 Kennen, Storm of Shuriken\n1 Kennen, Heart of the Tempest\n3x Gust\nTraveling Merchant',
    );
    expect(result.entries.map((e) => [e.line, e.quantity, e.name])).toEqual([
      [1, 2, 'Kennen, Storm of Shuriken'],
      [2, 1, 'Kennen, Heart of the Tempest'],
      [3, 3, 'Gust'],
    ]);
    expect(result.issues).toEqual([expect.objectContaining({ line: 4, code: 'MISSING_QUANTITY' })]);
    expect(result.upload).toEqual({ fileName: 'my.csv', fileType: 'csv' });
  });

  it('follows SPEC-003 AC 14 (name-first columns, semicolons)', async () => {
    const nameFirst = await uploadFile('owned.csv', 'Card Name,Quantity\nSeal of Discord,2\n');
    expect(nameFirst.text).toBe('Seal of Discord, 2');
    expect(nameFirst.result.issues).toEqual([
      expect.objectContaining({ line: 1, code: 'MISSING_QUANTITY' }),
    ]);
    const semi = await uploadFile('owned.csv', '2;Seal of Discord\n');
    expect(semi.result.entries[0]).toMatchObject({ quantity: 2, name: 'Seal of Discord' });
  });

  it('follows SPEC-003 AC 15 (title row only when it looks like one)', async () => {
    const foo = await uploadFile('owned.csv', 'foo,bar\n3,Gust\n');
    expect(foo.text).toBe('foo, bar\n3 Gust');
    expect(foo.result.issues).toEqual([
      expect.objectContaining({ line: 1, code: 'MISSING_QUANTITY' }),
    ]);
    const data = await uploadFile('owned.csv', '3,Gust\n');
    expect(data.result.entries[0]).toMatchObject({ line: 1, quantity: 3, name: 'Gust' });
  });

  it('reads quantity and name columns and skips a header row', async () => {
    const { result } = await uploadFile(
      'owned.csv',
      'Quantity,Name\n3,Lightning Rush\n2x,"Kennen, Heart of the Tempest"\n',
    );
    expect(result.issues).toEqual([]);
    expect(result.entries.map((e) => [e.line, e.quantity, e.name])).toEqual([
      [1, 3, 'Lightning Rush'],
      [2, 2, 'Kennen, Heart of the Tempest'],
    ]);
  });

  it('reads one-cell rows with the same rule as pasted text', async () => {
    const { result } = await uploadFile('owned.csv', '3x Lightning Rush\n1 Void Gate');
    expect(result.entries.map((e) => e.name)).toEqual(['Lightning Rush', 'Void Gate']);
  });

  it('reads one-word labels in rows', async () => {
    const { result } = await uploadFile(
      'deck.csv',
      'MainDeck\n3,Lightning Rush\nRunePool\n6,Calm Rune',
    );
    expect(result.issues).toEqual([]);
    expect(result.entries.map((e) => e.section)).toEqual(['main', 'runes']);
  });

  it('supports semicolons, tabs and escaped quotes', async () => {
    for (const csv of ['2;Void Gate', '2\tVoid Gate']) {
      const { result } = await uploadFile('owned.csv', csv);
      expect(result.entries[0]).toMatchObject({ quantity: 2, name: 'Void Gate' });
    }
    const { result } = await uploadFile('owned.csv', '1,"An ""Odd"" Card"');
    expect(result.entries[0].name).toBe('An "Odd" Card');
  });

  it('strips a UTF-8 BOM', async () => {
    const { text, result } = await uploadFile('owned.csv', '﻿Qty,Name\n3,Gust\n');
    expect(text).toBe('3 Gust');
    expect(result.entries[0]).toMatchObject({ quantity: 3, name: 'Gust' });
  });

  it('follows SPEC-003 AC 34 (codes in rows)', async () => {
    const { text, result } = await uploadFile(
      'owned.csv',
      'Qty,Name\n3,Lightning Rush,RAD 001/167\nLightning Rush x2\n1,Lightning Rush,RAD,001a\n',
    );
    expect(text).toBe(
      '3 Lightning Rush, RAD 001/167\nLightning Rush x2\n1 Lightning Rush, RAD, 001a',
    );
    expect(result.issues).toEqual([]);
    expect(result.entries.map((e) => [e.quantity, e.name, e.printing?.text ?? null])).toEqual([
      [3, 'Lightning Rush', 'RAD 001/167'],
      [2, 'Lightning Rush', null],
      [1, 'Lightning Rush, RAD, 001a', null],
    ]);
  });
});

describe('Excel rows (rowsToText → parseCardText)', () => {
  it('reads numeric quantity cells and ignores empty trailing cells', () => {
    const { result } = excelUpload([
      ['Qty', 'Card name', null],
      [3, 'Lightning Rush', null],
      ['1x Void Gate'],
      [],
    ]);
    expect(result.issues).toEqual([]);
    expect(result.entries.map((e) => [e.quantity, e.name])).toEqual([
      [3, 'Lightning Rush'],
      [1, 'Void Gate'],
    ]);
    expect(result.format).toBe('csv');
  });

  it('reads codes and trailing quantities in one-cell and Excel rows', () => {
    const { result } = excelUpload([
      ['3 RAD 001/167 Lightning Rush'],
      [2, 'OGN-007a'],
      ['Gust x2'],
    ]);
    expect(result.issues).toEqual([]);
    expect(result.entries.map((e) => [e.quantity, e.name, e.printing?.setCode ?? null])).toEqual([
      [3, 'Lightning Rush', 'RAD'],
      [2, '', 'OGN'],
      [2, 'Gust', null],
    ]);
  });

  it('writes Excel dates as YYYY-MM-DD', () => {
    expect(excelUpload([[new Date(Date.UTC(2026, 10, 23)), 'Gust']]).text).toBe('2026-11-23, Gust');
  });
});

describe('H-053 upload fixes', () => {
  it('(1) prefers ; over the commas in a card name', async () => {
    const { text, result } = await uploadFile(
      'owned.csv',
      '2;Kennen, Heart of the Tempest\n3;Gust\n',
    );
    expect(text).toBe('2 Kennen, Heart of the Tempest\n3 Gust');
    expect(result.issues).toEqual([]);
    expect(result.entries.map((e) => [e.quantity, e.name])).toEqual([
      [2, 'Kennen, Heart of the Tempest'],
      [3, 'Gust'],
    ]);
  });

  it('(1) prefers tab over the commas in a card name', async () => {
    const { result } = await uploadFile('owned.tsv.csv', '2\tKennen, Heart of the Tempest\n');
    expect(result.entries[0]).toMatchObject({ quantity: 2, name: 'Kennen, Heart of the Tempest' });
  });

  it('(1) ignores ; inside quotes and blank first lines when picking the delimiter', async () => {
    const { text } = await uploadFile('owned.csv', '\n1,"Odd; Card"\n2,Gust\n');
    expect(text).toBe('1 Odd; Card\n2 Gust');
  });

  it('(1) keeps comma as the delimiter for comma files', async () => {
    const { text } = await uploadFile('owned.csv', '1,Kennen,Heart of the Tempest\n');
    expect(text).toBe('1 Kennen, Heart of the Tempest');
  });

  it('(3) flattens a quoted multi-line cell into one text-box line', async () => {
    const { text, result } = await uploadFile(
      'owned.csv',
      '1,"Kennen,\nHeart of the Tempest"\r\n2,Gust\n',
    );
    expect(text).toBe('1 Kennen, Heart of the Tempest\n2 Gust');
    expect(result.entries.map((e) => [e.line, e.name])).toEqual([
      [1, 'Kennen, Heart of the Tempest'],
      [2, 'Gust'],
    ]);
    expect(excelUpload([[1, 'Kennen,\r\nHeart of the Tempest']]).text).toBe(
      '1 Kennen, Heart of the Tempest',
    );
  });

  it('(4) gives a .txt upload the 1 MB text limit before reading', async () => {
    // Just over 1 MiB (+ BOM allowance): rejected by size alone, the file is never read.
    const file = new File(['a'.repeat(MiB + 4)], 'big.txt');
    const arrayBuffer = vi.spyOn(file, 'arrayBuffer');
    const text = vi.spyOn(file, 'text');
    await expect(readImportFile(file)).rejects.toMatchObject({
      code: 'INPUT_TOO_LARGE',
      message: 'big.txt is too large to import (limit: 1 MB or 10,000 lines).',
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });

  it('(4) rejects a CSV whose text is over the limit with the same message', async () => {
    const err = await rejection('big.csv', '1,Gust\n'.repeat(Math.ceil((2 * MiB) / 7)));
    expect(err.code).toBe('INPUT_TOO_LARGE');
    expect(err.message).toBe('big.csv is too large to import (limit: 1 MB or 10,000 lines).');
    const lines = await rejection('many.csv', '1,Gust\n'.repeat(10_001));
    expect(lines.message).toBe('many.csv is too large to import (limit: 1 MB or 10,000 lines).');
  });

  it('(4) rejects files over 5 MB before reading (IMP-061)', async () => {
    const err = await rejection('huge.csv', 'a'.repeat(5 * MiB + 1));
    expect(err.message).toBe('huge.csv is too large to import (limit: 5 MB).');
  });

  it('(4) rejects .xls files (IMP-061)', async () => {
    const err = await rejection('old.xls', 'x');
    expect(err.message).toBe(
      "Older .xls files aren't supported. Save it as .xlsx or .csv and try again.",
    );
  });

  it('(5) reads a label in its own cell followed by the entry', async () => {
    const { text, result } = await uploadFile(
      'deck.csv',
      'Champion,1 Kennen Storm\nMain Deck:,3,Gust\nLegend,"1 Kennen, Heart of the Tempest"\n',
    );
    expect(text).toBe(
      'Champion: 1 Kennen Storm\nMain Deck: 3 Gust\nLegend: 1 Kennen, Heart of the Tempest',
    );
    expect(result.issues).toEqual([]);
    expect(result.entries.map((e) => [e.section, e.quantity, e.name])).toEqual([
      ['champion', 1, 'Kennen Storm'],
      ['main', 3, 'Gust'],
      ['legend', 1, 'Kennen, Heart of the Tempest'],
    ]);
  });
});

describe('H-046 parser conformance', () => {
  it.each(['2.5 Gust', '2.5x Gust', 'x2.5 Gust', 'Gust x2.5', '.5 Gust'])(
    '(1) reads the non-integer quantity in "%s" as BAD_QUANTITY (IMP-008)',
    (line) => {
      const r = parseCardText(line);
      expect(r.entries).toEqual([]);
      expect(r.issues).toEqual([expect.objectContaining({ line: 1, code: 'BAD_QUANTITY' })]);
    },
  );

  it('(1) reads a CSV 2.5,Gust row as BAD_QUANTITY', async () => {
    const { text, result } = await uploadFile('owned.csv', '2.5,Gust\n');
    expect(text).toBe('2.5, Gust');
    expect(result.issues).toEqual([expect.objectContaining({ line: 1, code: 'BAD_QUANTITY' })]);
  });

  it('(2) gives rows the 2,000-char row limit and text lines the 500-char limit (IMP-007)', async () => {
    const longRow = await uploadFile('owned.csv', `1,${'A'.repeat(2100)}\n3,Gust\n`);
    expect(longRow.result.issues).toEqual([
      expect.objectContaining({
        line: 1,
        code: 'LINE_TOO_LONG',
        message: 'Row is longer than 2,000 characters.',
      }),
    ]);
    expect(longRow.result.entries.map((e) => e.name)).toEqual(['Gust']);

    const okRow = await uploadFile('owned.csv', `1,${'A'.repeat(1500)}\n`);
    expect(okRow.result.issues).toEqual([]);
    expect(excelUpload([[1, 'A'.repeat(1500)]]).result.issues).toEqual([]);

    const pasted = parseCardText(`1 ${'A'.repeat(1500)}`);
    expect(pasted.issues).toEqual([
      expect.objectContaining({
        code: 'LINE_TOO_LONG',
        message: 'Line is longer than 500 characters.',
      }),
    ]);
  });

  it('(3) caps issue raw text at 120 chars with … (IMP-056)', async () => {
    const { result } = await uploadFile('owned.csv', `1,${'A'.repeat(2100)}\n`);
    const raw = result.issues[0].raw;
    expect(raw).toHaveLength(120);
    expect(raw).toBe(`1 ${'A'.repeat(117)}…`);
    const pasted = parseCardText('B'.repeat(300));
    expect(pasted.issues[0].raw).toHaveLength(120);
    expect(parseCardText('Gust').issues[0].raw).toBe('Gust');
  });

  it.each(['bad.txt', 'bad.csv'])(
    '(4) rejects invalid UTF-8 in %s as INPUT_ENCODING (IMP-010)',
    async (name) => {
      const err = await rejection(name, new Uint8Array([0x32, 0x20, 0x47, 0xff, 0xfe, 0x0a]));
      expect(err.code).toBe('INPUT_ENCODING');
      expect(err.message).toBe(
        `${name} isn't UTF-8 text. Save it as UTF-8 or .xlsx and try again.`,
      );
    },
  );

  it('(4) decodes valid UTF-8 text uploads, BOM stripped', async () => {
    const { text, result } = await uploadFile(
      'deck.txt',
      new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('2 Poké Gust\r\n')]),
    );
    expect(text).toBe('2 Poké Gust\r\n');
    expect(result.entries[0]).toMatchObject({ quantity: 2, name: 'Poké Gust' });
    expect(result.upload).toEqual({ fileName: 'deck.txt', fileType: 'txt' });
  });

  it('(5) reports summary counts (IMP-057, catalog-free part)', () => {
    const r = parseCardText(
      [
        '3 Lightning Rush',
        '1 lightning rush',
        '2 Kennen, Heart of the Tempest',
        '1 RAD 001/167',
        '2 rad 001 / 167',
        'Gust',
        '0 Gust',
        '',
        '',
      ].join('\n'),
    );
    expect(r.summary).toEqual({
      linesRead: 8,
      entriesParsed: 5,
      errors: 1,
      distinctNames: 3,
      totalCopies: 9,
    });
  });

  it('(5) reports the format and its reason (IMP-011 partial, IMP-012)', async () => {
    const plain = parseCardText('3 Gust');
    expect(plain).toMatchObject({ format: 'plain-text', formatReason: 'no section labels found' });
    expect(plain.upload).toBeUndefined();

    const riot = parseCardText('// list\n3 Gust\nMainDeck:\n1 Void Gate');
    expect(riot).toMatchObject({
      format: 'riot-text',
      formatReason: 'found section label Main Deck on line 3',
    });

    const { result } = await uploadFile('deck.csv', 'Main Deck\n3,Gust\n');
    expect(result).toMatchObject({
      format: 'csv',
      formatReason: 'uploaded file deck.csv',
      upload: { fileName: 'deck.csv', fileType: 'csv' },
    });
    expect(excelUpload([[3, 'Gust']]).result.upload).toEqual({
      fileName: 'owned.xlsx',
      fileType: 'xlsx',
    });

    const txt = await uploadFile('deck.txt', 'Main Deck:\n3 Gust\n');
    expect(txt.result.format).toBe('riot-text');
    expect(txt.result.upload).toEqual({ fileName: 'deck.txt', fileType: 'txt' });
  });

  it('(5) gives an over-limit paste empty summary counts', () => {
    const r = parseCardText('x'.repeat(MiB + 1));
    expect(r.issues.map((i) => i.code)).toEqual(['INPUT_TOO_LARGE']);
    expect(r.summary).toEqual({
      linesRead: 0,
      entriesParsed: 0,
      errors: 1,
      distinctNames: 0,
      totalCopies: 0,
    });
  });
});

describe('review fixes', () => {
  it.each(['3 Gust x2.5', 'x3 Gust x2.5', '3 Gust x2,5', '3 Gust x2.5 RAD 001'])(
    '(1) rejects the decimal second quantity in "%s"',
    (line) => {
      const r = parseCardText(line);
      expect(r.entries).toEqual([]);
      expect(r.issues).toEqual([
        expect.objectContaining({
          code: 'BAD_QUANTITY',
          message: 'Give the number of copies once per line.',
        }),
      ]);
    },
  );

  it('(4) accepts x3 / X3 quantity cells like the text forms', async () => {
    const { text, result } = await uploadFile('owned.csv', 'x3,Gust\nX2,Void Gate\n');
    expect(text).toBe('x3 Gust\nX2 Void Gate');
    expect(result.issues).toEqual([]);
    expect(result.entries.map((e) => [e.quantity, e.name])).toEqual([
      [3, 'Gust'],
      [2, 'Void Gate'],
    ]);
    expect(excelUpload([['x3', 'Gust']]).result.entries[0]).toMatchObject({ quantity: 3 });
  });

  it('(4) reads a decimal-comma quantity cell (2,5;Gust) as BAD_QUANTITY', async () => {
    const { text, result } = await uploadFile('owned.csv', '2,5;Gust\n');
    expect(text).toBe('2,5, Gust');
    expect(result.issues).toEqual([expect.objectContaining({ line: 1, code: 'BAD_QUANTITY' })]);
    expect(parseCardText('2,5 Gust').issues[0].code).toBe('BAD_QUANTITY');
  });

  it('(5) reads the first sheet of an .xlsx upload', async () => {
    vi.mocked(readSheet).mockResolvedValueOnce([
      ['Qty', 'Card name'],
      [3, 'Lightning Rush'],
      ['Main Deck', 'x2', 'Gust'],
    ] as never);
    const { text, result } = await uploadFile('owned.xlsx', 'not read as text');
    expect(text).toBe('3 Lightning Rush\nMain Deck: x2 Gust');
    expect(result.format).toBe('csv');
    expect(result.upload).toEqual({ fileName: 'owned.xlsx', fileType: 'xlsx' });
    expect(result.entries.map((e) => [e.section, e.quantity, e.name])).toEqual([
      [null, 3, 'Lightning Rush'],
      ['main', 2, 'Gust'],
    ]);
  });

  it('(5) rejects an .xlsx that cannot be read', async () => {
    vi.mocked(readSheet).mockRejectedValueOnce(new Error('corrupt'));
    const err = await rejection('broken.xlsx', 'x');
    expect(err.code).toBe('FILE_REJECTED');
    expect(err.message).toBe("Couldn't read broken.xlsx. Save it as .xlsx or .csv and try again.");
  });

  it('(6) rejects an upload that converts to no lines', async () => {
    const err = await rejection('empty.csv', 'Qty,Name\n,\n');
    expect(err.code).toBe('FILE_REJECTED');
    expect(err.message).toBe('empty.csv has no lines to import.');
  });

  it.each(['deck.xlsm', 'deck.ods', 'deck.json', 'deck'])(
    '(8) rejects the unsupported file %s',
    async (name) => {
      const err = await rejection(name, '3 Gust');
      expect(err.code).toBe('FILE_REJECTED');
      expect(err.message).toBe(`${name} can't be imported. Use a .txt, .csv or .xlsx file.`);
    },
  );
});

describe('SPEC-003 AC 42: runes are imported like any card (IMP-071, IMP-057)', () => {
  const text = 'Rune Pool:\n9 Chaos Rune\nRunes\n3 Order Rune\n2 Chaos Rune';

  it('IMP-071 rune lines parse under either rune label with no rune-specific issue', () => {
    const r = parseCardText(text);
    expect(r.issues).toEqual([]);
    expect(r.entries.map((e) => [e.line, e.quantity, e.name, e.section])).toEqual([
      [2, 9, 'Chaos Rune', 'runes'],
      [4, 3, 'Order Rune', 'runes'],
      [5, 2, 'Chaos Rune', 'runes'],
    ]);
    expect(r.summary).toMatchObject({
      linesRead: 5,
      entriesParsed: 3,
      distinctNames: 2,
      totalCopies: 14,
    });
  });

  it('IMP-071 the same lines without any label parse the same way (section null)', () => {
    const r = parseCardText('9 Chaos Rune\n3 Order Rune');
    expect(r.issues).toEqual([]);
    expect(r.entries.map((e) => [e.quantity, e.name, e.section])).toEqual([
      [9, 'Chaos Rune', null],
      [3, 'Order Rune', null],
    ]);
  });
});
