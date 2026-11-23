// CARD-024: verbatim API `type` → normalized category. Mapping table version 1.
// Only research-backed strings are mapped; spell/gear/champion/token strings are BLOCKED
// on the live payload and fall through to 'unknown' (reported as unmapped-type).
import type { CardCategory } from './types.ts';

export const CATEGORY_MAPPING_VERSION = '1';

const TYPE_TO_CATEGORY: Readonly<Record<string, CardCategory>> = {
  Legend: 'legend',
  Unit: 'unit',
  Rune: 'rune',
  Battlefield: 'battlefield',
};

export function categoryOf(type: string): CardCategory {
  return Object.hasOwn(TYPE_TO_CATEGORY, type) ? (TYPE_TO_CATEGORY[type] as CardCategory) : 'unknown';
}
