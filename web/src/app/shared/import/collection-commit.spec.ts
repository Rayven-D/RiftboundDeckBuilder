import { makeCatalog, makeCollection } from '../../core/decks/engine-fixtures';
import type { CollectionCatalogView } from '../../core/decks/types';
import {
  addToCollection,
  changedSinceCommit,
  commitNotice,
  nextUpdatedAt,
  printingLookup,
  replaceChanges,
  replaceCollection,
  replaceConfirmText,
  resolveCollectionImport,
  snapshotIsOurs,
} from './collection-commit';
import { parseCardText } from './parse-card-list';

const AT = '2026-11-25T12:00:00.000Z';

/** Lightning Rush at RAD 001 (base) and RAD 001a; Gust at RAD 002; Kennen at OGN 299. */
function codedCatalog(): CollectionCatalogView {
  const c = makeCatalog(['Lightning Rush', 'Gust', 'Kennen, Heart of the Tempest', 'Abandon']);
  c.printings = {};
  const add = (printingId: string, cardKey: string, setCode: string, collectorNumber: string) =>
    (c.printings[printingId] = {
      printingId,
      cardKey,
      setCode,
      collectorNumber,
      publicCode: null,
      rarity: null,
      variant: { kind: 'unknown', label: null, evidence: null },
      art: { thumbnailUrl: null, fullUrl: null, artist: null },
    });
  add('rad-001', 'lightning rush', 'RAD', '001');
  add('rad-001a', 'lightning rush', 'RAD', '001a');
  add('rad-002', 'gust', 'RAD', '002');
  add('ogn-299', 'kennen heart of the tempest', 'OGN', '299');
  return c;
}

const resolve = (text: string, catalog = codedCatalog()) => resolveCollectionImport(parseCardText(text), catalog);

describe('Owned Cards Import commit logic (SPEC-003, H-158)', () => {
  it('IMP-025 / IMP-047: exact names resolve and merge by cardKey; other names are left out (IMP-027)', () => {
    const r = resolve('3 Lightning Rush\n2 Gust\n1 lightning rush\n2 Lightnin Rush');
    expect(r.cards).toEqual({
      'lightning rush': { quantity: 4, byPrinting: {} },
      gust: { quantity: 2, byPrinting: {} },
    });
    expect(r.copies).toBe(6);
    expect(r.cardCount).toBe(2);
    expect(r.leftOut).toEqual([{ line: 4, message: 'No card named "Lightnin Rush" in the card data.' }]);
  });

  it('IMP-048 / IMP-067: a printing code resolves to its card and keeps the per-printing count', () => {
    const r = resolve('2 Lightning Rush RAD 001/167\n1 RAD-001a\n1 Gust RAD 002');
    expect(r.cards['lightning rush']).toEqual({ quantity: 3, byPrinting: { 'rad-001': 2, 'rad-001a': 1 } });
    expect(r.cards['gust']).toEqual({ quantity: 1, byPrinting: { 'rad-002': 1 } });
    expect(r.leftOut).toEqual([]);
    expect(printingLookup(codedCatalog())('rad', '1 / 167')).toEqual({
      status: 'found',
      cardKey: 'lightning rush',
      printingId: 'rad-001',
    });
  });

  it('IMP-068 (b) / (c): code and name disagree', () => {
    // (b) the name is another card exactly: needs the user's pick, not counted
    const b = resolve('1 Gust RAD 001');
    expect(b.cardCount).toBe(0);
    expect(b.leftOut[0].message).toBe('RAD 001 is Lightning Rush, but the line says Gust.');
    // (c) the name matches nothing exactly: the code's card, with a note
    const c = resolve('1 Kenen RAD 002');
    expect(c.cards['gust']).toEqual({ quantity: 1, byPrinting: { 'rad-002': 1 } });
    expect(c.notes[0].message).toBe('RAD 002 is Gust, so that card was used.');
  });

  it('IMP-069: a code not in the card data uses the name (a), or leaves a code-only line out (b)', () => {
    const r = resolve('2 Gust RAD 999\n3 RAD 998');
    expect(r.cards['gust']).toEqual({ quantity: 2, byPrinting: {} });
    expect(r.notes[0].message).toBe("RAD 999 isn't in the card data, so the card name was used.");
    expect(r.leftOut[0].message).toBe("RAD 998 isn't in the card data. Add the card name or fix the code.");
  });

  describe('optional leading article (IMP-025, CARD-034, H-343)', () => {
    /** Hypothetical names from SPEC-001 AC 6 and AC 21, next to the real-name case The Dreaming Tree. */
    const articles = () => makeCatalog(['The Dreaming Tree', 'A Pit', 'The Pit', 'The Echo', 'Echo', 'Gust']);

    it('CARD-034 / IMP-025: Dreaming Tree counts as The Dreaming Tree with no note and nothing left out', () => {
      const r = resolve('2 Dreaming Tree\n1 the dreaming tree', articles());
      expect(r.cards).toEqual({ 'the dreaming tree': { quantity: 3, byPrinting: {} } });
      expect(r.leftOut).toEqual([]);
      expect(r.notes).toEqual([]);
    });

    it('CARD-034: The Dreaming Tree finds a card named Dreaming Tree', () => {
      const r = resolve('1 The Dreaming Tree', makeCatalog(['Dreaming Tree']));
      expect(r.cards).toEqual({ 'dreaming tree': { quantity: 1, byPrinting: {} } });
      expect(r.leftOut).toEqual([]);
    });

    it('CARD-034 / IMP-025: Pit with A Pit and The Pit in the catalog is ambiguous and not counted', () => {
      const r = resolve('2 Pit\n1 The Pit', articles());
      expect(r.cards).toEqual({ 'the pit': { quantity: 1, byPrinting: {} } });
      expect(r.leftOut).toEqual([{ line: 1, message: '"Pit" matches more than one card: A Pit, The Pit.' }]);
    });

    it('CARD-034: an exact name wins over the article rule (Echo with The Echo and Echo)', () => {
      const r = resolve('1 Echo\n2 The Echo', articles());
      expect(r.cards).toEqual({
        echo: { quantity: 1, byPrinting: {} },
        'the echo': { quantity: 2, byPrinting: {} },
      });
    });

    it('CARD-034: a bare "The" is not a card name', () => {
      const r = resolve('1 The', articles());
      expect(r.cardCount).toBe(0);
      expect(r.leftOut).toEqual([{ line: 1, message: 'No card named "The" in the card data.' }]);
    });

    it('CARD-034 / IMP-069 (a): an unknown code falls back to the name through the article rule', () => {
      const r = resolve('1 Dreaming Tree RAD 999\n1 Pit RAD 998', articles());
      expect(r.cards).toEqual({ 'the dreaming tree': { quantity: 1, byPrinting: {} } });
      expect(r.notes).toEqual([{ line: 1, message: "RAD 999 isn't in the card data, so the card name was used." }]);
      expect(r.leftOut).toEqual([{ line: 2, message: '"Pit" matches more than one card: A Pit, The Pit.' }]);
    });
  });

  it('AC 19 / IMP-049: Add is owned += imported; Replace makes the collection exactly the import', () => {
    const catalog = codedCatalog();
    const before = makeCollection({ owned: { Gust: 2, Abandon: 1 } });
    const imp = resolveCollectionImport(parseCardText('1 Gust'), catalog);
    expect(addToCollection(before, imp, AT).cards).toEqual({
      gust: { quantity: 3, byPrinting: {} },
      abandon: { quantity: 1, byPrinting: {} },
    });
    const after = replaceCollection(imp, AT);
    expect(after.cards).toEqual({ gust: { quantity: 1, byPrinting: {} } });
    expect(after.updatedAt).toBe(AT);
    const nameOf = (k: string) => catalog.cards[k]?.name ?? k;
    expect(replaceConfirmText(replaceChanges(before, after, nameOf))).toBe(
      '1 name removed (Abandon), 1 changed (Gust 2 → 1).',
    );
  });

  it('IMP-049: Add merges per printing too', () => {
    const before = makeCollection({ byPrinting: { 'Lightning Rush': { 'rad-001': 1 } } });
    const imp = resolve('2 Lightning Rush RAD 001\n1 RAD 001a');
    expect(addToCollection(before, imp, AT).cards['lightning rush']).toEqual({
      quantity: 4,
      byPrinting: { 'rad-001': 3, 'rad-001a': 1 },
    });
  });

  it('IMP-050 / AC 44: the Replace confirmation lists the names removed; long lists end with "+N more"', () => {
    const before = makeCollection({ owned: { 'Lightning Rush': 3, Gust: 2 } });
    const after = replaceCollection(resolve('1 Kennen, Heart of the Tempest'), AT);
    const nameOf = (k: string) => codedCatalog().cards[k]?.name ?? k;
    expect(replaceConfirmText(replaceChanges(before, after, nameOf))).toBe(
      '2 names removed (Gust, Lightning Rush).',
    );
    const many = makeCollection({ owned: Object.fromEntries('abcdefg'.split('').map((l) => [`Card ${l}`, 1])) });
    expect(replaceConfirmText(replaceChanges(many, after, (k) => k))).toBe(
      '7 names removed (card a, card b, card c, card d, card e, +2 more).',
    );
  });

  it('IMP-073 / AC 43 / AC 44: the commit notice uses the count-line forms', () => {
    const add = resolve('3 Lightning Rush\n2 Gust');
    expect(commitNotice('add', add, addToCollection(null, add, AT))).toBe('Added 5 copies of 2 cards.');
    const one = resolve('1 Gust');
    expect(commitNotice('add', one, addToCollection(null, one, AT))).toBe('Added 1 copy of 1 card.');
    const big = { ...add, copies: 1204, cardCount: 412 };
    expect(commitNotice('add', big, addToCollection(null, add, AT))).toBe('Added 1,204 copies of 412 cards.');
    const kennen = resolve('1 Kennen, Heart of the Tempest');
    expect(commitNotice('replace', kennen, replaceCollection(kennen, AT))).toBe('Collection replaced: 1 card.');
    const cards = Object.fromEntries(Array.from({ length: 412 }, (_, i) => [`c${i}`, { quantity: 1, byPrinting: {} }]));
    expect(commitNotice('replace', kennen, { ...replaceCollection(kennen, AT), cards })).toBe(
      'Collection replaced: 412 cards.',
    );
  });

  it('IMP-073: lines left out are not counted', () => {
    const r = resolve('3 Lightning Rush\n4 Nonsense Card');
    expect(commitNotice('add', r, addToCollection(null, r, AT))).toBe('Added 3 copies of 1 card.');
  });

  it('IMP-075 (a) / COLL-058: a stored record that is not the one the commit wrote counts as changed', () => {
    const written = { ...makeCollection({ owned: { Gust: 1 } }), updatedAt: AT };
    expect(changedSinceCommit(written, AT)).toBe(false);
    expect(changedSinceCommit({ ...written, updatedAt: '2026-11-25T12:00:05.000Z' }, AT)).toBe(true);
    expect(changedSinceCommit(null, AT)).toBe(true);
  });

  it('IMP-075 (d): the snapshot must still be the one this commit kept', () => {
    const snap = makeCollection({ owned: { Gust: 2 } });
    expect(snapshotIsOurs(snap, snap.updatedAt)).toBe(true);
    expect(snapshotIsOurs(null, snap.updatedAt)).toBe(false);
    expect(snapshotIsOurs({ ...snap, updatedAt: AT }, snap.updatedAt)).toBe(false);
  });

  it('nextUpdatedAt is never older than the record it replaces', () => {
    expect(nextUpdatedAt(Date.parse(AT), null)).toBe(AT);
    expect(nextUpdatedAt(Date.parse(AT), '2026-11-25T13:00:00.000Z')).toBe('2026-11-25T13:00:00.001Z');
  });
});
