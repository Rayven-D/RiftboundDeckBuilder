// CARD-040/041: data-driven variant detection from raw API fields.
import type { VariantKind, VariantRule, VariantRulesFile } from './types.ts';

export const EMPTY_VARIANT_RULES: VariantRulesFile = { version: '0', rules: [] };

const KINDS: ReadonlySet<string> = new Set<VariantKind>([
  'base',
  'showcase',
  'alt-art',
  'overnumbered',
  'signature',
  'promo',
  'unknown',
]);

export interface Variant {
  kind: VariantKind;
  label: string | null;
  evidence: string | null;
}

export const UNKNOWN_VARIANT: Variant = { kind: 'unknown', label: null, evidence: null };

/** Reads a dotted path (e.g. "art.artist") from a raw object. */
export function readPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function parseVariantRules(raw: unknown): VariantRulesFile {
  if (raw === null || typeof raw !== 'object') throw new Error('variant rules: not an object');
  const r = raw as Record<string, unknown>;
  if (typeof r['version'] !== 'string') throw new Error('variant rules: "version" must be a string');
  if (!Array.isArray(r['rules'])) throw new Error('variant rules: "rules" must be an array');
  const rules = r['rules'].map((x: unknown, i: number): VariantRule => {
    const rule = (x ?? {}) as Record<string, unknown>;
    const when = (rule['when'] ?? {}) as Record<string, unknown>;
    if (typeof rule['id'] !== 'string') throw new Error(`variant rules[${i}]: "id" must be a string`);
    if (typeof when['field'] !== 'string') throw new Error(`variant rule ${rule['id']}: "when.field" required`);
    if (when['equals'] === undefined && when['pattern'] === undefined) {
      throw new Error(`variant rule ${rule['id']}: needs "when.equals" or "when.pattern"`);
    }
    if (typeof rule['kind'] !== 'string' || !KINDS.has(rule['kind'])) {
      throw new Error(`variant rule ${rule['id']}: unknown kind ${String(rule['kind'])}`);
    }
    return {
      id: rule['id'],
      when: {
        field: when['field'],
        ...(typeof when['equals'] === 'string' ? { equals: when['equals'] } : {}),
        ...(typeof when['pattern'] === 'string' ? { pattern: when['pattern'] } : {}),
      },
      kind: rule['kind'] as VariantKind,
      source: typeof rule['source'] === 'string' ? rule['source'] : '',
    };
  });
  return { version: r['version'], rules };
}

/** First matching rule wins; no match → kind "unknown" (CARD-040). */
export function detectVariant(rawCard: unknown, rules: VariantRulesFile): Variant {
  for (const rule of rules.rules) {
    const value = readPath(rawCard, rule.when.field);
    if (value === undefined || value === null) continue;
    const s = String(value);
    if (rule.when.equals !== undefined && s !== rule.when.equals) continue;
    if (rule.when.pattern !== undefined && !new RegExp(rule.when.pattern, 'u').test(s)) continue;
    return { kind: rule.kind, label: null, evidence: rule.id };
  }
  return UNKNOWN_VARIANT;
}
