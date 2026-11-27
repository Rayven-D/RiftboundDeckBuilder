import banlistJson from '../../../../../data/banlist.json';
import formatsJson from '../../../../../data/formats.json';
import { banStatus } from '../decks/ban-status';
import type { CollectionCatalogView } from '../decks/types';
import {
  NO_SAMPLE_MARKER,
  RULES,
  bannedSet,
  checkBanList,
  checkFormats,
  evaluateLegality,
  legalityCatalog,
  supportedFormat,
  toDeckInput,
} from './index';
import { KENNEN_1, RIVEN_2, card, catalogOf, catalogWith, fixtureCards, printing, withZone } from './legality-fixtures';
import type { BanListFile, DeckInput, FormatsFile, LegalityCatalog, LegalityRequest, LegalityResult, RuleResult } from './types';

const BANS = banlistJson as BanListFile;
const FORMATS = formatsJson as FormatsFile;
const CATALOG = catalogOf(fixtureCards());

function run(deck: DeckInput, asOf: string, catalog: LegalityCatalog = CATALOG, formats: FormatsFile = FORMATS, bans: BanListFile = BANS): LegalityResult {
  return evaluateLegality({ deck, format: 'standard', asOf }, catalog, bans, formats);
}
function rule(r: LegalityResult, id: string): RuleResult {
  const found = r.rules.find((x) => x.ruleId === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
}
function counts(set: ReturnType<typeof bannedSet>): Record<string, number> {
  const out: Record<string, number> = { card: 0, battlefield: 0, legend: 0 };
  for (const { entry } of set.values()) out[entry.kind]++;
  return out;
}
/** A one-card main deck around KENNEN_1, so LEGAL-017/018 see exactly that card's printings. */
function soloDeck(name: string): DeckInput {
  return withZone(KENNEN_1, 'main', [{ name, qty: 1 }]);
}

describe('SPEC-002 Deck Legality engine (H-194)', () => {
  describe('AC 1–4: KENNEN_1 and RIVEN_2 across the Radiance wave (LEGAL-016, LEGAL-B02, LEGAL-B08)', () => {
    it('AC 1 KENNEN_1 as of 2026-11-08: counts pass, no upcoming bans, legal with complete card data (LEGAL-003, -005, -008, -010, -011, -013, -016)', () => {
      const r = run(KENNEN_1, '2026-11-08');
      for (const id of ['LEGAL-016', 'LEGAL-003', 'LEGAL-008', 'LEGAL-010', 'LEGAL-011', 'LEGAL-013', 'LEGAL-005']) {
        expect(rule(r, id).status, id).toBe('pass');
      }
      expect(r.counts).toEqual({ main: 40, sideboard: 10, runes: 12, battlefields: 3 });
      expect(r.upcomingBans).toEqual([]);
      expect(r.verdict).toBe('legal');
    });

    it('AC 2 KENNEN_1 as of 2026-11-23: illegal, LEGAL-016 names Nocturne and Rhasa with the Radiance wave (LEGAL-R08 dates)', () => {
      const r = run(KENNEN_1, '2026-11-23');
      expect(r.verdict).toBe('illegal');
      const v = rule(r, 'LEGAL-016').violations;
      expect(v.map((x) => x.message)).toEqual([
        'Nocturne, Horrifying is banned in Standard as of Nov 23, 2026 (Radiance ban list update, effective Nov 23, 2026).',
        'Rhasa the Sunderer is banned in Standard as of Nov 23, 2026 (Radiance ban list update, effective Nov 23, 2026).',
      ]);
      expect(v.every((x) => x.banWaveId === 'std-2026-11-23' && x.zone === 'main' && x.effectiveDate === '2026-11-23')).toBe(true);
      for (const id of ['LEGAL-003', 'LEGAL-005', 'LEGAL-008', 'LEGAL-010', 'LEGAL-011', 'LEGAL-013']) expect(rule(r, id).status).toBe('pass');
    });

    it('AC 3 KENNEN_1 from 2026-11-13 to 2026-11-22: LEGAL-016 passes and upcomingBans lists both cards (LEGAL-B08); 2026-11-12 none', () => {
      for (const asOf of ['2026-11-13', '2026-11-18', '2026-11-22']) {
        const r = run(KENNEN_1, asOf);
        expect(rule(r, 'LEGAL-016').status).toBe('pass');
        expect(r.upcomingBans.map(({ name, change, announced, effective }) => ({ name, change, announced, effective }))).toEqual([
          { name: 'Nocturne, Horrifying', change: 'ban', announced: '2026-11-13', effective: '2026-11-23' },
          { name: 'Rhasa the Sunderer', change: 'ban', announced: '2026-11-13', effective: '2026-11-23' },
        ]);
      }
      expect(run(KENNEN_1, '2026-11-12').upcomingBans).toEqual([]);
    });

    it('AC 4 RIVEN_2 as of 2026-11-23: five bans with their zones; as of 2026-11-08 LEGAL-016 passes', () => {
      const v = rule(run(RIVEN_2, '2026-11-23'), 'LEGAL-016').violations;
      expect(v.map((x) => [x.cardName, x.zone])).toEqual([
        ['Riven, Broken Blade', 'champion'],
        ['Stellacorn Herder', 'main'],
        ["Zhonya's Hourglass", 'main'],
        ["Emperor's Dais", 'battlefields'],
        ['Star Spring', 'battlefields'],
      ]);
      expect(rule(run(RIVEN_2, '2026-11-08'), 'LEGAL-016').status).toBe('pass');
    });
  });

  describe('AC 5, AC 21: the banned set (LEGAL-B02, LEGAL-B09)', () => {
    it('AC 5 LEGAL-B09 Standard: 15 cards + 7 battlefields as of 2026-11-23, 7 + 5 on 2026-11-22, 4 + 3 on 2026-07-23, empty on 2026-03-30', () => {
      expect(counts(bannedSet(BANS, 'standard', 'global', '2026-11-23'))).toEqual({ card: 15, battlefield: 7, legend: 0 });
      expect(counts(bannedSet(BANS, 'standard', 'global', '2026-11-22'))).toEqual({ card: 7, battlefield: 5, legend: 0 });
      expect(counts(bannedSet(BANS, 'standard', 'global', '2026-07-23'))).toEqual({ card: 4, battlefield: 3, legend: 0 });
      expect(bannedSet(BANS, 'standard', 'global', '2026-07-24').has('stealthy pursuer')).toBe(true);
      expect(bannedSet(BANS, 'standard', 'global', '2026-03-30').size).toBe(0);
      const std = BANS.lists.find((l) => l.format === 'standard' && l.region === 'global');
      expect(std?.waves.map((w) => w.id)).toEqual(['std-2026-03-31', 'std-2026-07-24', 'std-2026-09-18', 'std-2026-11-23']);
    });

    it('AC 21 LEGAL-B02 inside one wave remove runs before add', () => {
      const wave = (id: string, effective: string, add: string[], remove: string[]) => ({
        id,
        name: id,
        announced: effective,
        effective,
        sourceUrl: 'https://playriftbound.com/',
        add: add.map((name) => ({ name, kind: 'card' as const })),
        remove: remove.map((name) => ({ name, kind: 'card' as const })),
      });
      const file = (later: ReturnType<typeof wave>): BanListFile => ({
        schemaVersion: 1,
        dataVersion: 't',
        lastVerified: '2026-11-01',
        lists: [{ format: 'standard', region: 'global', status: 'verified', waves: [wave('w1', '2026-11-01', ['Card A'], []), later] }],
      });
      expect(bannedSet(file(wave('w2', '2026-12-01', ['Card A'], ['Card A'])), 'standard', 'global', '2026-12-01').has('card a')).toBe(true);
      const unban = file(wave('w2', '2026-12-01', [], ['Card A']));
      expect(bannedSet(unban, 'standard', 'global', '2026-12-01').has('card a')).toBe(false);
      expect(bannedSet(unban, 'standard', 'global', '2026-11-30').has('card a')).toBe(true);
    });
  });

  describe('AC 6–10, 13: construction rules on KENNEN_1 (LEGAL-003, -004, -005, -008, -010, -011, -013, -019)', () => {
    it('AC 6 LEGAL-005: 4 copies across main and sideboard fail with the zone breakdown; LEGAL-013 fails (12)', () => {
      const side = KENNEN_1.sideboard.map((x) => (x.name === "An Offer You Can't Refuse" ? { ...x, qty: 3 } : x));
      const r = run(withZone(KENNEN_1, 'sideboard', side), '2026-11-08');
      expect(rule(r, 'LEGAL-005').violations.map((v) => v.message)).toEqual([
        "An Offer You Can't Refuse: 4 copies (main 1, champion 0, sideboard 3); the limit is 3 per name.",
      ]);
      expect(rule(r, 'LEGAL-013').status).toBe('fail');
      expect(r.counts.sideboard).toBe(12);
    });

    it('AC 7 LEGAL-013: 11 sideboard cards fail', () => {
      const r = run(withZone(KENNEN_1, 'sideboard', [...KENNEN_1.sideboard, { name: 'Gust', qty: 1 }]), '2026-11-08');
      expect(rule(r, 'LEGAL-013').violations[0].message).toBe('The sideboard can have at most 10 cards; it has 11.');
    });

    it('AC 8 LEGAL-003: 39 cards (-1); no Chosen Champion fails LEGAL-004 and LEGAL-003 counts only main', () => {
      const main = KENNEN_1.main.map((x) => (x.name === 'Trifarian Captain' ? { ...x, qty: 2 } : x));
      const r = run(withZone(KENNEN_1, 'main', main), '2026-11-08');
      expect(rule(r, 'LEGAL-003').violations[0].message).toBe(
        'The main deck must have exactly 40 cards including the Chosen Champion; it has 39 (-1).',
      );
      const none = run({ ...KENNEN_1, chosenChampion: null }, '2026-11-08');
      expect(rule(none, 'LEGAL-004').status).toBe('fail');
      expect(none.counts.main).toBe(39);
      expect(rule(none, 'LEGAL-003').violations[0].actual).toBe(39);
    });

    it('AC 9 LEGAL-011: Minefield twice fails, LEGAL-010 still passes (3)', () => {
      const r = run(withZone(KENNEN_1, 'battlefields', [{ name: 'Minefield', qty: 2 }, { name: 'Zaun Warrens', qty: 1 }]), '2026-11-08');
      expect(rule(r, 'LEGAL-011').violations.map((v) => v.message)).toEqual([
        'Battlefield Minefield appears 2 times; battlefield names must be unique.',
      ]);
      expect(rule(r, 'LEGAL-010').status).toBe('pass');
    });

    it('AC 10 LEGAL-008: 11 runes fail', () => {
      const r = run(withZone(KENNEN_1, 'runes', [{ name: 'Chaos Rune', qty: 8 }, { name: 'Order Rune', qty: 3 }]), '2026-11-08');
      expect(rule(r, 'LEGAL-008').violations[0].message).toBe('The rune deck must have exactly 12 runes; it has 11.');
    });

    it('AC 13 LEGAL-019: an unknown name fails, is not counted as any card, and the verdict is illegal', () => {
      const main = KENNEN_1.main.map((x) => (x.name === 'Lightning Rush' ? { ...x, name: 'Lightning Rsh' } : x));
      const r = run(withZone(KENNEN_1, 'main', main), '2026-11-08');
      expect(rule(r, 'LEGAL-019').violations.map((v) => v.message)).toEqual(['Unknown card: "Lightning Rsh". Check the spelling.']);
      expect(rule(r, 'LEGAL-016').violations).toEqual([]);
      expect(rule(r, 'LEGAL-017').violations).toEqual([]);
      expect(rule(r, 'LEGAL-002').notEvaluatedReason).toContain('Lightning Rsh');
      expect(r.verdict).toBe('illegal');
    });
  });

  describe('AC 11, 14, 15, 19: attributes and the result contract (LEGAL-002, -004, LEGAL-R03, -R04)', () => {
    it("AC 11 LEGAL-004: a Chosen Champion whose tag differs from the Legend's fails with the 'doesn't match' reason", () => {
      const r = run({ ...RIVEN_2, chosenChampion: 'Kennen, Storm of Shuriken' }, '2026-11-08');
      expect(rule(r, 'LEGAL-004').violations.map((v) => v.message)).toEqual([
        "Kennen, Storm of Shuriken can't be the Chosen Champion: its champion (Kennen) doesn't match the Legend (Riven).",
      ]);
    });

    it('AC 28 LEGAL-R09 / H-676: not-checked reasons are structured; notEvaluatedReason is unchanged', () => {
      const names = ['Gust', 'Fizz, Trickster', 'Lightning Rush'];
      const r = run(KENNEN_1, '2026-11-08', catalogWith(...names.map((n) => card(n, { domains: null }))));
      const r2 = rule(r, 'LEGAL-002');
      expect(r2.notEvaluatedReason).toBe('Missing domain data for: Fizz, Trickster, Gust, Lightning Rush'); // engine order, unchanged
      expect(r2.notEvaluatedItems).toHaveLength(1);
      expect(r2.notEvaluatedItems![0].label).toBe('Missing domain data for');
      expect(r2.notEvaluatedItems![0].text).toBe(r2.notEvaluatedReason);
      expect(r2.notEvaluatedItems![0].cardNames).toEqual(['Fizz, Trickster', 'Gust', 'Lightning Rush']); // the comma name is one name, copies are not counted
      expect(r2.notEvaluatedItems![0].cardNames).toHaveLength(3);
    });

    it('AC 28 LEGAL-R09: a reason with no card list has no cardNames, and a passing rule has no items', () => {
      const r = run(KENNEN_1, '2026-11-08', catalogWith(card('Gust', { domains: null })));
      for (const x of r.rules) {
        if (x.status === 'not_evaluated') expect(x.notEvaluatedItems!.map((i) => i.text).join(' ')).toBe(x.notEvaluatedReason);
        else expect(x.notEvaluatedItems).toBeUndefined();
      }
      const noLegend = { ...KENNEN_1, legend: 'Not A Legend' };
      const items = run(noLegend, '2026-11-08').rules.flatMap((x) => x.notEvaluatedItems ?? []);
      expect(items.filter((i) => i.cardNames === undefined && i.label === undefined).length).toBeGreaterThan(0);
    });

    it('AC 14 LEGAL-002 / LEGAL-R04: a card with domains null is not evaluated, named, and the verdict is incomplete', () => {
      const r = run(KENNEN_1, '2026-11-08', catalogWith(card('Gust', { domains: null })));
      expect(rule(r, 'LEGAL-002').status).toBe('not_evaluated');
      expect(rule(r, 'LEGAL-002').notEvaluatedReason).toBe('Missing domain data for: Gust');
      expect(r.verdict).toBe('incomplete');
    });

    it('AC 15 LEGAL-R03: one result per section A rule in ID order, with the data and catalog versions used', () => {
      const r = run(KENNEN_1, '2026-11-23');
      expect(r.rules.map((x) => x.ruleId)).toEqual([
        'LEGAL-001', 'LEGAL-002', 'LEGAL-003', 'LEGAL-004', 'LEGAL-005', 'LEGAL-006', 'LEGAL-006a', 'LEGAL-007', 'LEGAL-008',
        'LEGAL-009', 'LEGAL-010', 'LEGAL-011', 'LEGAL-012', 'LEGAL-013', 'LEGAL-014', 'LEGAL-015', 'LEGAL-016', 'LEGAL-017',
        'LEGAL-018', 'LEGAL-019',
      ]);
      expect(RULES).toHaveLength(20);
      expect(r.banListDataVersion).toBe(BANS.dataVersion);
      expect(r.formatsDataVersion).toBe(FORMATS.dataVersion);
      expect(r.catalogVersion).toBe('0.2+2026-11-20T18:04:00Z');
    });

    it('AC 19 LEGAL-004: null champion data on RIVEN_2 is not evaluated (not pass, not fail), verdict incomplete', () => {
      const unknownChampion = card('Riven, Broken Blade', { category: 'unit', domains: ['Calm'], isChampionUnit: null, isSignature: null, championTag: null });
      const r = run(RIVEN_2, '2026-11-08', catalogWith(unknownChampion));
      expect(rule(r, 'LEGAL-004').status).toBe('not_evaluated');
      expect(r.verdict).toBe('incomplete');
    });
  });

  describe('AC 12, 16, 17, 18, 23, 24: set legality (LEGAL-017, -018, LEGAL-C02…C10)', () => {
    it('AC 12 LEGAL-C04: a card printed only in LGC fails until Jan 29, 2027 even as a preview set; passes on 2027-01-29', () => {
      const cat = catalogWith(card('Future Card', { printings: [printing('LGC')] }));
      const v = rule(run(soloDeck('Future Card'), '2026-11-23', cat), 'LEGAL-017').violations;
      expect(v).toHaveLength(1);
      expect(v[0].message).toBe("Future Card isn't legal in Standard on Nov 23, 2026: its sets (LGC) are not legal until Jan 29, 2027.");
      expect(v[0].effectiveDate).toBe('2027-01-29');
      expect(rule(run(soloDeck('Future Card'), '2027-01-29', cat), 'LEGAL-017').violations).toEqual([]);
    });

    it('AC 16 LEGAL-C02/C03/C08: VEN without a Riot date passes (released or null); a new set follows the catalog; an unofficial date source fails the data check', () => {
      const ven = card('Venture Card', { printings: [printing('VEN')] });
      for (const releaseStatus of ['released', null] as const) {
        const cat = { ...catalogWith(ven), sets: [{ code: 'VEN', releaseStatus }] };
        expect(rule(run(soloDeck('Venture Card'), '2026-11-23', cat), 'LEGAL-017').violations).toEqual([]);
      }
      const xyz = card('Xyz Card', { printings: [printing('XYZ')] });
      const withXyz = (releaseStatus: 'released' | 'preview' | null) => ({ ...catalogWith(xyz), sets: [{ code: 'XYZ', releaseStatus }] });
      expect(rule(run(soloDeck('Xyz Card'), '2026-11-23', withXyz('released')), 'LEGAL-017').status).not.toBe('fail');
      expect(rule(run(soloDeck('Xyz Card'), '2026-11-23', withXyz('released')), 'LEGAL-017').violations).toEqual([]);
      expect(rule(run(soloDeck('Xyz Card'), '2026-11-23', withXyz('preview')), 'LEGAL-017').violations[0].message).toBe(
        "Xyz Card isn't legal in Standard on Nov 23, 2026: its sets (XYZ) are not released yet.",
      );
      const unknown = run(soloDeck('Xyz Card'), '2026-11-23', withXyz(null));
      expect(rule(unknown, 'LEGAL-017').status).toBe('not_evaluated');
      expect(unknown.verdict).not.toBe('legal');
      const community = structuredClone(FORMATS);
      community.formats[0].sets['global'][0] = { ...community.formats[0].sets['global'][0], legalFrom: '2025-10-31', sourceUrl: 'https://mobalytics.gg/riftbound' };
      expect(checkFormats(community).map((i) => i.code)).toContain('unofficial-source');
    });

    it('AC 17 LEGAL-C07: an OPP-only card fails even if OPP is released; OPP + OGN printings (same name) pass', () => {
      const oppOnly = card('Promo Only', { printings: [printing('OPP')] });
      const cat = { ...catalogWith(oppOnly), sets: [...CATALOG.sets, { code: 'OPP', releaseStatus: 'released' as const }] };
      expect(rule(run(soloDeck('Promo Only'), '2026-11-23', cat), 'LEGAL-017').status).toBe('fail');
      const both = card('Promo Too', { printings: [printing('OPP'), printing('OGN')] });
      expect(rule(run(soloDeck('Promo Too'), '2026-11-23', catalogWith(both)), 'LEGAL-017').violations).toEqual([]);
    });

    it('AC 18 LEGAL-018: overnumbered RAD 300 is the only legal-set printing → fails, LEGAL-017 passes; unknown kind → not evaluated; all legal → passes', () => {
      const over = card('Over Card', { printings: [printing('LGC', '010'), printing('RAD', '300', 'overnumbered')] });
      const r = run(soloDeck('Over Card'), '2026-11-23', catalogWith(over));
      expect(rule(r, 'LEGAL-018').status).toBe('fail');
      expect(rule(r, 'LEGAL-017').violations).toEqual([]);
      const unknownKind = card('Over Card', { printings: [printing('LGC', '010'), printing('RAD', '300', 'unknown')] });
      expect(rule(run(soloDeck('Over Card'), '2026-11-23', catalogWith(unknownKind)), 'LEGAL-018').status).toBe('not_evaluated');
      const allLegal = card('Over Card', { printings: [printing('OGN', '001', 'unknown'), printing('RAD', '002', 'unknown')] });
      expect(rule(run(soloDeck('Over Card'), '2026-11-23', catalogWith(allLegal)), 'LEGAL-018').status).toBe('pass');
    });

    it('AC 23 LEGAL-C05: shipped data keeps OGN legal on 2028-01-01; test data with legalUntil 2028-01-01 passes the day before and fails on it', () => {
      expect(FORMATS.formats.every((f) => Object.values(f.sets).every((list) => list.every((s) => s.legalUntil === null)))).toBe(true);
      const ogn = card('Origins Card', { printings: [printing('OGN')] });
      expect(rule(run(soloDeck('Origins Card'), '2028-01-01', catalogWith(ogn)), 'LEGAL-017').violations).toEqual([]);
      const rotating = structuredClone(FORMATS);
      const sets = rotating.formats[0].sets['global'];
      sets[sets.findIndex((s) => s.code === 'OGN')] = { ...sets.find((s) => s.code === 'OGN')!, legalUntil: '2028-01-01' };
      expect(rule(run(soloDeck('Origins Card'), '2027-12-31', catalogWith(ogn), rotating), 'LEGAL-017').violations).toEqual([]);
      const rotated = rule(run(soloDeck('Origins Card'), '2028-01-01', catalogWith(ogn), rotating), 'LEGAL-017').violations;
      expect(rotated.find((v) => v.cardName === 'Origins Card')?.message).toBe(
        "Origins Card isn't legal in Standard on Jan 1, 2028: its sets (OGN) are no longer legal.",
      );
    });

    it('AC 24 LEGAL-C10 (stubbed, CARD-044 BLOCKED): a SAMPLE-flagged only legal-set printing fails; an unflagged one passes; no marker → nothing ignored', () => {
      const sampleNo = '999';
      const isSample = (_c: unknown, p: { collectorNumber: string }) => p.collectorNumber === sampleNo; // test-only marker
      const flagged = card('Sample Card', { printings: [printing('OGN', sampleNo), printing('OPP')] });
      const withMarker = { ...catalogWith(flagged), isSample };
      expect(rule(run(soloDeck('Sample Card'), '2026-11-23', withMarker), 'LEGAL-017').status).toBe('fail');
      const alsoUnflagged = card('Sample Card', { printings: [printing('OGN', sampleNo), printing('OGN', '010')] });
      expect(rule(run(soloDeck('Sample Card'), '2026-11-23', { ...catalogWith(alsoUnflagged), isSample }), 'LEGAL-017').violations).toEqual([]);
      // No marker in the catalog: the same printing counts.
      expect(rule(run(soloDeck('Sample Card'), '2026-11-23', catalogWith(flagged)), 'LEGAL-017').violations).toEqual([]);
      // The browser catalog has no way to mark SAMPLE yet, so its predicate is the no-marker stub.
      const view: CollectionCatalogView = { catalogVersion: 'v', sets: [], cards: {}, printings: {} };
      expect(legalityCatalog(view).isSample).toBe(NO_SAMPLE_MARKER);
    });
  });

  describe('AC 20, 22, 27: ban data queries (LEGAL-B10, LEGAL-B11, LEGAL-B12)', () => {
    it('AC 20 LEGAL-B10 banStatus: banned / upcoming / not-banned for Zhonya\'s Hourglass; Stealthy Pursuer banned since 2026-07-24', () => {
      expect(banStatus(BANS, 'zhonyas hourglass', 'standard', 'global', '2026-11-23')).toEqual({
        status: 'banned',
        waveId: 'std-2026-11-23',
        waveName: 'Radiance ban list update',
        bannedSince: '2026-11-23',
      });
      expect(banStatus(BANS, 'zhonyas hourglass', 'standard', 'global', '2026-11-15')).toMatchObject({
        status: 'upcoming',
        announced: '2026-11-13',
        effective: '2026-11-23',
      });
      expect(banStatus(BANS, 'zhonyas hourglass', 'standard', 'global', '2026-11-10')).toEqual({ status: 'not-banned' });
      expect(banStatus(BANS, 'stealthy pursuer', 'standard', 'global', '2026-11-23')).toMatchObject({ status: 'banned', bannedSince: '2026-07-24' });
    });

    it('AC 22 LEGAL-B11: 2v2 data is unverified; 1 Legend (Master Yi), 14 cards, 7 battlefields as of 2026-11-23; 1, 6, 5 on 2026-11-22; not offered', () => {
      const list = BANS.lists.find((l) => l.format === '2v2');
      expect(list?.status).toBe('unverified');
      expect(list?.region).toBe('global');
      const now = bannedSet(BANS, '2v2', 'global', '2026-11-23');
      expect(counts(now)).toEqual({ card: 14, battlefield: 7, legend: 1 });
      expect([...now.values()].find((b) => b.entry.kind === 'legend')?.entry.name).toBe('Master Yi, Wuju Bladesman');
      expect(counts(bannedSet(BANS, '2v2', 'global', '2026-11-22'))).toEqual({ card: 6, battlefield: 5, legend: 1 });
      // Data only: 2v2 is not an offered format, and the evaluator refuses it (LEGAL-R05).
      expect(supportedFormat(FORMATS, '2v2')).toBeNull();
      const req = { deck: KENNEN_1, format: '2v2', asOf: '2026-11-23' } as unknown as LegalityRequest;
      expect(() => evaluateLegality(req, CATALOG, BANS, FORMATS)).toThrow();
    });

    it('AC 27 LEGAL-B12: Zhonya\'s Hourglass is banned on 2026-11-23 with a date-only asOf, and no message states a time of day', () => {
      const r = run(RIVEN_2, '2026-11-23');
      const zhonya = rule(r, 'LEGAL-016').violations.find((v) => v.cardName === "Zhonya's Hourglass");
      expect(zhonya?.effectiveDate).toBe('2026-11-23');
      const text = r.rules.flatMap((x) => [x.summary, ...x.violations.map((v) => v.message)]).join('\n');
      expect(text).not.toMatch(/\d{1,2}:\d{2}|\bUTC\b|\bGMT\b|time zone|local time/i);
      expect(banStatus(BANS, 'zhonyas hourglass', 'standard', 'global', '2026-11-23').status).toBe('banned');
      expect(banStatus(BANS, 'zhonyas hourglass', 'standard', 'global', '2026-11-22').status).toBe('upcoming');
    });
  });

  describe('AC 25, 26: Signature cap and battlefield domains (LEGAL-006, -006a, -012)', () => {
    const sig = (name: string) => card(name, { isSignature: true, championTag: 'Kennen', domains: ['Chaos'] });
    it('AC 25 LEGAL-006a stays a warning: 3 in main + 1 in sideboard → LEGAL-006 passes, a warning, verdict unchanged; 4 in main fail LEGAL-006', () => {
      const cat = catalogWith(sig('Trifarian Captain'), sig('Abandon'));
      const r = run(KENNEN_1, '2026-11-08', cat);
      expect(rule(r, 'LEGAL-006').status).toBe('pass');
      const w = rule(r, 'LEGAL-006a');
      expect(w.status).toBe('warning');
      expect(w.violations.map((v) => v.severity)).toEqual(['warning']);
      expect(r.verdict).toBe(run(KENNEN_1, '2026-11-08').verdict);
      expect(r.verdict).toBe('legal');

      const main = KENNEN_1.main.map((x) => (x.name === 'Rebuke' ? { ...x, name: 'Abandon' } : x));
      const four = run(withZone(KENNEN_1, 'main', main), '2026-11-08', cat);
      expect(rule(four, 'LEGAL-006').violations[0].message).toBe('4 Signature cards in the main deck; the limit is 3.');
    });

    it("AC 26 LEGAL-012: no-domain battlefields fit any Legend; ['Fury'] outside the identity fails; null is not evaluated", () => {
      expect(rule(run(KENNEN_1, '2026-11-08'), 'LEGAL-012').status).toBe('pass');
      expect(rule(run(RIVEN_2, '2026-11-08'), 'LEGAL-012').status).toBe('pass');
      const fury = run(KENNEN_1, '2026-11-08', catalogWith(card('Minefield', { category: 'battlefield', domains: ['Fury'] })));
      expect(rule(fury, 'LEGAL-012').violations[0].message).toBe("Minefield doesn't match this deck's domains (Chaos, Order).");
      const unknown = run(KENNEN_1, '2026-11-08', catalogWith(card('Minefield', { category: 'battlefield', domains: null })));
      expect(rule(unknown, 'LEGAL-012').status).toBe('not_evaluated');
    });
  });

  describe('data files (LEGAL-B01, B05, B06, C01, C03, C08)', () => {
    it('LEGAL-C01/C03/C07: Standard sets OGN, OGS, SFD, UNL, VEN by riot-listing, RAD by its Riot date; promo groupings excluded', () => {
      const std = FORMATS.formats.find((f) => f.id === 'standard')!;
      expect(std.name).toBe('Standard');
      expect(std.supported).toBe(true);
      expect(std.excludedSets).toEqual(['OPP', 'JDG', 'PR']);
      const sets = std.sets['global'];
      expect(sets.filter((s) => s.basis === 'riot-listing').map((s) => s.code)).toEqual(['OGN', 'OGS', 'SFD', 'UNL', 'VEN']);
      expect(sets.find((s) => s.code === 'RAD')).toMatchObject({ legalFrom: '2026-10-23', basis: 'riot-date' });
      expect(sets.map((s) => s.code)).not.toContain('ARC');
    });

    it('LEGAL-B06 / LEGAL-C08: the shipped files pass the data check', () => {
      expect(checkFormats(FORMATS)).toEqual([]);
      expect(checkBanList(BANS)).toEqual([]);
    });

    it('LEGAL-B05: a ban name that does not resolve, or resolves to the wrong kind, is a data error', () => {
      const cat = catalogOf([card('Zhonya\'s Hourglass'), card('Star Spring', { category: 'spell' })]);
      const issues = checkBanList(BANS, cat).map((i) => i.code);
      expect(issues).toContain('ban-name-unresolved');
      expect(issues).toContain('ban-kind-mismatch');
    });

    it('SPEC-006 toDeckInput maps a stored deck by canonical names', () => {
      const d = toDeckInput({
        legend: { cardKey: 'k', name: 'Kennen, Heart of the Tempest', qty: 1 },
        champion: null,
        main: [{ cardKey: 'g', name: 'Gust', qty: 2 }],
        sideboard: [],
        runes: [],
        battlefields: [],
      });
      expect(d).toEqual({ legend: 'Kennen, Heart of the Tempest', chosenChampion: null, main: [{ name: 'Gust', qty: 2 }], sideboard: [], runes: [], battlefields: [] });
    });
  });
});
