/**
 * Test data for the SPEC-002 engine (used by *.spec.ts only). Deck lists are `KENNEN_1` and `RIVEN_2` from research
 * ([[2026-11 RC Europe - 1 - ASC Evansrhim - Kennen]], [[2026-11 RC Europe - 2 - Sonecon - Riven]]). The card
 * ATTRIBUTES (category, domains, champion tags, Signature flags) are INVENTED so the attribute rules can be exercised:
 * SPEC-001 does not provide them yet (CARD-024…027 BLOCKED). Every card has one OGN printing unless stated.
 */
import { nameKey } from '../cards/name-key';
import type { CardCategory } from '../decks/types';
import type { DeckEntry, DeckInput, LegalityCardView, LegalityCatalog, LegalityPrinting } from './types';

export interface CardOpts {
  category?: CardCategory;
  type?: string;
  domains?: string[] | null;
  isChampionUnit?: boolean | null;
  isSignature?: boolean | null;
  championTag?: string | null;
  printings?: LegalityPrinting[];
}

export function printing(setCode: string, collectorNumber = '001', kind: LegalityPrinting['variant']['kind'] = 'base'): LegalityPrinting {
  return { setCode, collectorNumber, variant: { kind } };
}

const TYPE: Partial<Record<CardCategory, string>> = {
  legend: 'Legend',
  champion: 'Unit',
  unit: 'Unit',
  spell: 'Spell',
  gear: 'Gear',
  rune: 'Rune',
  battlefield: 'Battlefield',
};

export function card(name: string, o: CardOpts = {}): LegalityCardView {
  const category = o.category ?? 'spell';
  return {
    cardKey: nameKey(name),
    name,
    type: o.type ?? TYPE[category] ?? 'Unknown',
    category,
    domains: o.domains === undefined ? [] : o.domains,
    isChampionUnit: o.isChampionUnit === undefined ? category === 'champion' : o.isChampionUnit,
    isSignature: o.isSignature === undefined ? false : o.isSignature,
    championTag: o.championTag === undefined ? null : o.championTag,
    printings: o.printings ?? [printing('OGN')],
  };
}

const e = (qty: number, name: string): DeckEntry => ({ name, qty });

export const KENNEN_1: DeckInput = {
  legend: 'Kennen, Heart of the Tempest',
  chosenChampion: 'Kennen, Storm of Shuriken',
  main: [
    e(1, "An Offer You Can't Refuse"),
    e(2, 'Bedeviling Stranger'),
    e(2, 'Edge of Night'),
    e(1, 'Fizz, Trickster'),
    e(2, 'Gust'),
    e(1, 'Hard Bargain'),
    e(1, 'Hidden Blade'),
    e(2, 'Last Rites'),
    e(3, 'Lightning Rush'),
    e(3, 'Nocturne, Horrifying'),
    e(1, 'Rebuke'),
    e(2, 'Reckless Innovator'),
    e(3, 'Rhasa the Sunderer'),
    e(1, 'Ride the Wind'),
    e(3, 'Seal of Discord'),
    e(2, 'Star-Crossed'),
    e(2, 'Switcheroo'),
    e(1, 'Tideturner'),
    e(3, 'Traveling Merchant'),
    e(3, 'Trifarian Captain'),
  ],
  runes: [e(9, 'Chaos Rune'), e(3, 'Order Rune')],
  battlefields: [e(1, 'Minefield'), e(1, 'Veiled Temple'), e(1, 'Zaun Warrens')],
  sideboard: [
    e(1, 'Abandon'),
    e(1, "An Offer You Can't Refuse"),
    e(2, 'Decree of Unity'),
    e(1, 'Fizz, Trickster'),
    e(1, 'Lacerate'),
    e(2, 'Ravenbloom Prefect'),
    e(1, 'Ride the Wind'),
    e(1, 'The Good Stuff'),
  ],
};

export const RIVEN_2: DeckInput = {
  legend: 'Riven, The Exile',
  chosenChampion: 'Riven, Broken Blade',
  main: [
    e(3, 'Astral Heron'),
    e(1, 'Baron Nashor'),
    e(1, 'Battle Preparations'),
    e(2, 'Bedeviling Stranger'),
    e(3, 'Blade of the Exile'),
    e(2, 'Blitzcrank, Impassive'),
    e(2, 'Defy'),
    e(3, 'Discipline'),
    e(1, 'En Garde'),
    e(2, 'Gust'),
    e(1, 'Not So Fast'),
    e(1, 'Rebuke'),
    e(2, 'Reckless Innovator'),
    e(2, 'Scuttle Crab'),
    e(1, 'Star-Crossed'),
    e(3, 'Stellacorn Herder'),
    e(2, 'Switcheroo'),
    e(2, 'Tideturner'),
    e(2, 'Traveling Merchant'),
    e(3, "Zhonya's Hourglass"),
  ],
  runes: [e(6, 'Calm Rune'), e(6, 'Chaos Rune')],
  battlefields: [e(1, "Emperor's Dais"), e(1, "Hunter's Circle"), e(1, 'Star Spring')],
  sideboard: [
    e(1, 'Abandon'),
    e(2, "An Offer You Can't Refuse"),
    e(2, 'Decree of Focus'),
    e(1, 'Hush'),
    e(1, 'Ravenbloom Prefect'),
    e(1, 'Rebuke'),
    e(1, 'Reckless Innovator'),
    e(1, 'Vex, Apathetic'),
  ],
};

/** Every card both decks name, with complete (invented) attributes. Domains: Kennen = Chaos + Order, Riven = Calm + Chaos. */
export function fixtureCards(): LegalityCardView[] {
  const spells = new Set<string>();
  for (const d of [KENNEN_1, RIVEN_2]) for (const x of [...d.main, ...d.sideboard]) spells.add(x.name);
  const out: LegalityCardView[] = [
    card('Kennen, Heart of the Tempest', { category: 'legend', domains: ['Chaos', 'Order'], championTag: 'Kennen' }),
    card('Kennen, Storm of Shuriken', { category: 'champion', domains: ['Chaos'], championTag: 'Kennen' }),
    card('Riven, The Exile', { category: 'legend', domains: ['Calm', 'Chaos'], championTag: 'Riven' }),
    card('Riven, Broken Blade', { category: 'champion', domains: ['Calm'], championTag: 'Riven' }),
    card('Chaos Rune', { category: 'rune', domains: ['Chaos'] }),
    card('Order Rune', { category: 'rune', domains: ['Order'] }),
    card('Calm Rune', { category: 'rune', domains: ['Calm'] }),
    card('Fury Rune', { category: 'rune', domains: ['Fury'] }),
    ...['Minefield', 'Veiled Temple', 'Zaun Warrens', "Emperor's Dais", "Hunter's Circle", 'Star Spring'].map((n) =>
      card(n, { category: 'battlefield' }),
    ),
  ];
  for (const n of spells) out.push(card(n));
  return out;
}

export function catalogOf(cards: LegalityCardView[], extra: Partial<LegalityCatalog> = {}): LegalityCatalog {
  const byKey: Record<string, LegalityCardView> = {};
  for (const c of cards) byKey[c.cardKey] = c;
  return {
    catalogVersion: '0.2+2026-11-20T18:04:00Z',
    cards: byKey,
    sets: [
      { code: 'OGN', releaseStatus: 'released' },
      { code: 'RAD', releaseStatus: 'released' },
      { code: 'LGC', releaseStatus: 'preview' },
    ],
    ...extra,
  };
}

/** The fixture catalog with some cards replaced (same `cardKey`) or added. */
export function catalogWith(...cards: LegalityCardView[]): LegalityCatalog {
  const base = new Map(fixtureCards().map((c) => [c.cardKey, c]));
  for (const c of cards) base.set(c.cardKey, c);
  return catalogOf([...base.values()]);
}

export function withZone(deck: DeckInput, zone: 'main' | 'sideboard' | 'runes' | 'battlefields', entries: DeckEntry[]): DeckInput {
  return { ...deck, [zone]: entries };
}
