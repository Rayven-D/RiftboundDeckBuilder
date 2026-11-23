import { describe, expect, it } from 'vitest';
import { IngestionError } from '../src/domain/errors.ts';
import { normalizeContents, toStableJson } from '../src/domain/normalize.ts';
import { parseVariantRules } from '../src/domain/variant-rules.ts';
import { fixture, normalize, opts, rawCard, rawResponse } from './helpers.ts';

describe('SPEC-001 normalize (synthetic fixture)', () => {
  const { snapshot, report } = normalize(fixture());

  it('CARD-012/013 AC1: printings that share a name share one card', () => {
    const kaisa = snapshot.cards.find((c) => c.cardKey === 'kaisa survivor');
    expect(kaisa?.name).toBe("Kai'Sa, Survivor");
    expect(kaisa?.printingIds).toHaveLength(3);
    expect(snapshot.cards.filter((c) => c.name === "Kai'Sa, Survivor")).toHaveLength(1);
  });

  it('CARD-020 AC12: set codes are upper-cased (Ven → VEN)', () => {
    expect(snapshot.sets.map((s) => s.code)).toEqual(['OGN', 'RAD', 'SFD', 'VEN']);
    expect(snapshot.printings.find((p) => p.printingId === 'synthetic-ven-0101')?.setCode).toBe('VEN');
  });

  it('CARD-071: setOrder is the API position', () => {
    expect(Object.fromEntries(snapshot.sets.map((s) => [s.code, s.setOrder]))).toEqual({ OGN: 0, SFD: 1, VEN: 2, RAD: 3 });
  });

  it('CARD-024 AC8: type verbatim, category mapped, unmapped reported', () => {
    const by = (k: string) => snapshot.cards.find((c) => c.cardKey === k);
    expect(by('riven the exile')).toMatchObject({ type: 'Legend', category: 'legend' });
    expect(by('calm rune')).toMatchObject({ type: 'Rune', category: 'rune' });
    expect(by('emperors dais')).toMatchObject({ type: 'Battlefield', category: 'battlefield' });
    expect(by('starcrossed')).toMatchObject({ type: 'Spell', category: 'unknown' });
    expect(report.unmappedTypes).toEqual(['Gear', 'Spell']);
  });

  it('CARD-029 AC8/AC17: unverified attributes are null, never false or []', () => {
    for (const c of snapshot.cards) {
      expect(c.domains).toBeNull();
      expect(c.isChampionUnit).toBeNull();
      expect(c.championTag).toBeNull();
      expect(c.isSignature).toBeNull();
      expect(c.isPreview).toBeNull();
    }
    for (const s of snapshot.sets) expect(s.releaseStatus).toBeNull();
    const n = snapshot.cards.length;
    expect(report.nullCounts).toEqual({ domains: n, isChampionUnit: n, championTag: n, isSignature: n, isPreview: n, releaseStatus: 4 });
    expect(toStableJson(snapshot)).not.toContain('"isSignature": false');
  });

  it('CARD-063: unmapped fields (faction) are kept in extra and reported', () => {
    expect(snapshot.printings.find((p) => p.printingId === 'synthetic-ogn-0007')?.extra).toEqual({ faction: 'Calm' });
    expect(report.newProperties).toEqual(['faction']);
  });

  it('CARD-068 AC18: catalogVersion', () => {
    expect(snapshot.catalogVersion).toBe('0.2+2026-11-20T18:04:00Z');
    expect(snapshot.schemaVersion).toBe('0.2');
    expect(snapshot.source).toEqual({ api: 'riftbound-content-v1', region: 'AMERICAS', locale: 'en', apiVersion: 'synthetic-0.0', lastUpdated: '2026-11-20T18:04:00Z' });
  });

  it('CARD-068: a numeric lastUpdated is written as its decimal string', () => {
    const r = normalize(rawResponse([{ id: 'OGN', cards: [rawCard()] }], 1763661840000));
    expect(r.snapshot.catalogVersion).toBe('0.2+1763661840000');
  });

  it('CARD-005 AC16: image URLs are kept as given', () => {
    const p = snapshot.printings.find((x) => x.printingId === 'synthetic-rad-sp1-005');
    expect(p?.art).toEqual({
      thumbnailUrl: 'https://example.invalid/synthetic/synthetic-rad-sp1-005-thumb.png',
      fullUrl: 'https://example.invalid/synthetic/synthetic-rad-sp1-005-full.png',
      artist: 'Synthetic Artist',
    });
    expect(p?.publicCode).toBe('RAD-SP1/005');
    expect(p?.collector.key).toBe('SP1/5');
  });

  it('CARD-040 AC9: with no rules every variant is unknown', () => {
    expect(snapshot.printings.every((p) => p.variant.kind === 'unknown')).toBe(true);
    expect(report.unknownVariantCount).toBe(snapshot.printings.length);
  });

  it('CARD-041 AC9: a rule (rarity Showcase → showcase) is applied', () => {
    const rules = parseVariantRules({ version: '1', rules: [{ id: 'VR-001', when: { field: 'rarity', equals: 'Showcase' }, kind: 'showcase', source: 'test' }] });
    const r = normalize(fixture(), { variantRules: rules });
    const p = r.snapshot.printings.find((x) => x.printingId === 'synthetic-rad-sp1-005');
    expect(p?.variant).toEqual({ kind: 'showcase', label: null, evidence: 'VR-001' });
    expect(r.snapshot.variantRulesVersion).toBe('1');
    expect(r.snapshot.catalogVersion).toBe(snapshot.catalogVersion);
  });

  it('CARD-016/070: printingIds in printingSortKey order; default printing is the first', () => {
    const kaisa = snapshot.cards.find((c) => c.cardKey === 'kaisa survivor');
    expect(kaisa?.printingIds).toEqual(['synthetic-ogn-0300', 'synthetic-ven-0102', 'synthetic-rad-sp1-005']);
    expect(kaisa?.defaultPrintingId).toBe('synthetic-ogn-0300');
  });

  it('CARD-061: sets by code, cards by cardKey, printings by printingId', () => {
    const sorted = (xs: string[]) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(snapshot.cards.map((c) => c.cardKey)).toEqual(sorted(snapshot.cards.map((c) => c.cardKey)));
    expect(snapshot.printings.map((p) => p.printingId)).toEqual(sorted(snapshot.printings.map((p) => p.printingId)));
  });

  it('CARD-061 AC15: same input → byte-identical output', () => {
    expect(toStableJson(normalize(fixture()).snapshot)).toBe(toStableJson(snapshot));
    const reversed = fixture();
    (reversed['sets'] as { cards: unknown[] }[]).forEach((s) => s.cards.reverse());
    expect(toStableJson(normalize(reversed).snapshot)).toBe(toStableJson(snapshot));
  });

  it('CARD-065: first run lists all sets and printings as new', () => {
    expect(report.newSets).toEqual(['OGN', 'RAD', 'SFD', 'VEN']);
    expect(report.addedPrintings).toHaveLength(snapshot.printings.length);
    expect(report.countsBySet).toEqual({ OGN: 5, RAD: 1, SFD: 2, VEN: 2 });
  });
});

describe('SPEC-001 normalize (edge cases)', () => {
  it('CARD-014 AC2: subtitles are separate cards', () => {
    const r = normalize(rawResponse([{ id: 'OGN', cards: [rawCard({ name: 'Riven, The Exile' }), rawCard({ name: 'Riven, Broken Blade' })] }]));
    expect(r.snapshot.cards.map((c) => c.cardKey)).toEqual(['riven broken blade', 'riven the exile']);
  });

  it('CARD-032 AC5: Star-Crossed and Star Crossed do not collide', () => {
    const r = normalize(rawResponse([{ id: 'OGN', cards: [rawCard({ name: 'Star-Crossed' }), rawCard({ name: 'Star Crossed' })] }]));
    expect(r.snapshot.cards).toHaveLength(2);
  });

  it('CARD-032 AC5: a real name-key collision fails and names both cards', () => {
    const raw = rawResponse([{ id: 'OGN', cards: [rawCard({ name: "Zhonya's Hourglass" }), rawCard({ name: 'Zhonyas Hourglass' })] }]);
    expect(() => normalizeContents(raw, opts())).toThrow(IngestionError);
    expect(() => normalizeContents(raw, opts())).toThrow(/"Zhonya's Hourglass" and "Zhonyas Hourglass"/u);
  });

  it('CARD-010: duplicate printingId fails', () => {
    const raw = rawResponse([{ id: 'OGN', cards: [rawCard({ id: 'dup' }), rawCard({ id: 'dup' })] }]);
    expect(() => normalizeContents(raw, opts())).toThrow(/duplicate printingId dup/u);
  });

  it('CARD-064 AC14: a card without name fails, naming its id', () => {
    const raw = rawResponse([{ id: 'OGN', cards: [rawCard({ id: 'no-name', name: undefined })] }]);
    expect(() => normalizeContents(raw, opts())).toThrow(/card id no-name is missing required field\(s\): name/u);
  });

  it.each(['id', 'set', 'collectorNumber'])('CARD-064: missing %s fails', (field) => {
    const raw = rawResponse([{ id: 'OGN', cards: [rawCard()] }]);
    Reflect.deleteProperty((raw['sets'] as { cards: Record<string, unknown>[] }[])[0]?.cards[0] ?? {}, field);
    expect(() => normalizeContents(raw, opts())).toThrow(new RegExp(`missing required field\\(s\\): ${field}`, 'u'));
  });

  it('CARD-015: conflicting gameplay values → latest set wins, conflict reported; non-null beats null', () => {
    const raw = rawResponse([
      { id: 'OGN', cards: [rawCard({ id: 'a', name: 'X', description: 'old', flavorText: 'kept' })] },
      { id: 'SFD', cards: [rawCard({ id: 'b', name: 'X', description: 'new', flavorText: null })] },
    ]);
    const r = normalize(raw);
    expect(r.snapshot.cards[0]?.text).toBe('new');
    expect(r.snapshot.cards[0]?.flavorText).toBe('kept');
    expect(r.report.fieldConflicts).toEqual([{ cardKey: 'x', field: 'text', printingIds: ['a', 'b'] }]);
  });

  it('CARD-036: collector collision across cards is reported', () => {
    const raw = rawResponse([{ id: 'OGN', cards: [rawCard({ name: 'A', collectorNumber: '010' }), rawCard({ name: 'B', collectorNumber: '10' })] }]);
    expect(normalize(raw).report.collectorCollisions).toEqual([{ setCode: 'OGN', collectorKey: '10', cardKeys: ['a', 'b'] }]);
  });

  it('CARD-021 AC10: a new set is reported against the previous snapshot; order changes too', () => {
    const base = [
      { id: 'OGN', cards: [rawCard({ id: 'o1' })] },
      { id: 'SFD', cards: [rawCard({ id: 's1' })] },
    ];
    const prev = normalize(rawResponse(base)).snapshot;
    const next = normalize(rawResponse([...base, { id: 'LGC', name: 'Legacy', cards: [rawCard({ id: 'l1' })] }]), { previous: prev });
    expect(next.report.newSets).toEqual(['LGC']);
    expect(next.snapshot.sets.find((s) => s.code === 'LGC')).toEqual({ code: 'LGC', name: 'Legacy', setOrder: 2, releaseStatus: null, printingCount: 1 });
    expect(next.report.addedPrintings).toEqual(['l1']);
    const swapped = normalize(rawResponse([base[1] as (typeof base)[0], base[0] as (typeof base)[0]]), { previous: prev });
    expect(swapped.report.setOrderChanged).toEqual(['OGN', 'SFD']);
  });

  it('CARD-066: a printing missing now is reported as removed', () => {
    const prev = normalize(rawResponse([{ id: 'OGN', cards: [rawCard({ id: 'keep' }), rawCard({ id: 'gone' })] }])).snapshot;
    const r = normalize(rawResponse([{ id: 'OGN', cards: [rawCard({ id: 'keep' })] }]), { previous: prev });
    expect(r.report.removedPrintings).toEqual(['gone']);
  });

  it('CARD-063: unknown nested fields go to extra with dotted paths', () => {
    const r = normalize(rawResponse([{ id: 'OGN', cards: [rawCard({ id: 'z', foo: 1, art: { fullURL: 'u', bar: 2 } })] }]));
    expect(r.snapshot.printings[0]?.extra).toEqual({ 'art.bar': 2, foo: 1 });
    expect(r.report.newProperties).toEqual(['art.bar', 'foo']);
  });

  it('CARD-028: absent stats are null', () => {
    const r = normalize(rawResponse([{ id: 'OGN', cards: [rawCard({ stats: undefined })] }]));
    expect(r.snapshot.cards[0]?.stats).toEqual({ energy: null, might: null, cost: null, power: null });
  });

  it('CARD-068: missing lastUpdated fails', () => {
    expect(() => normalizeContents(rawResponse([{ id: 'OGN', cards: [rawCard()] }], null), opts())).toThrow(/lastUpdated/u);
  });
});
