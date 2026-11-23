import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeContents, type NormalizeOptions } from '../src/domain/normalize.ts';
import { EMPTY_VARIANT_RULES } from '../src/domain/variant-rules.ts';

export const FIXTURE_PATH = fileURLToPath(new URL('./fixtures/riftbound-content-sample.json', import.meta.url));
export const FIXTURE_TEXT = readFileSync(FIXTURE_PATH, 'utf8');
export const fixture = (): Record<string, unknown> => JSON.parse(FIXTURE_TEXT) as Record<string, unknown>;

export const FIXED_NOW = '2026-11-23T12:00:00.000Z';

export function opts(over: Partial<NormalizeOptions> = {}): NormalizeOptions {
  return { region: 'AMERICAS', fetchedAt: FIXED_NOW, variantRules: EMPTY_VARIANT_RULES, previous: null, ...over };
}

let n = 0;
/** A raw card shaped like research fact #9. */
export function rawCard(over: Record<string, unknown> = {}): Record<string, unknown> {
  n += 1;
  return {
    id: `t-${n}`,
    collectorNumber: String(n).padStart(3, '0'),
    set: 'OGN',
    name: `Test Card ${n}`,
    description: 'text',
    type: 'Unit',
    rarity: 'Common',
    stats: { energy: 1, might: 1, cost: null, power: null },
    keywords: [],
    art: { thumbnailURL: 'https://example.invalid/t.png', fullURL: 'https://example.invalid/f.png', artist: 'A' },
    flavorText: null,
    tags: [],
    ...over,
  };
}

export function rawResponse(
  sets: { id: string; name?: string; cards: Record<string, unknown>[] }[],
  lastUpdated: unknown = '2026-11-20T18:04:00Z',
): Record<string, unknown> {
  return {
    game: 'riftbound',
    version: 't-1',
    lastUpdated,
    sets: sets.map((s) => ({ id: s.id, name: s.name ?? s.id, cards: s.cards.map((c) => ({ ...c, set: c['set'] ?? s.id })) })),
  };
}

export function normalize(raw: unknown, over: Partial<NormalizeOptions> = {}) {
  return normalizeContents(raw, opts(over));
}
