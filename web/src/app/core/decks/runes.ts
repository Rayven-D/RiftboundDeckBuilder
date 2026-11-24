import type { DeckZone, PlayableCard } from './types';

/**
 * SPEC-009 RUNE-001: a rune entry is a deck entry in the `runes` zone, or an entry in any zone
 * whose catalog card has `category === 'rune'`. With no catalog card (catalog not loaded, unknown
 * card) or `category: 'unknown'`, only the zone decides. The one shared test (pure).
 */
export function isRuneEntry(zone: DeckZone, card: PlayableCard | null | undefined): boolean {
  return zone === 'runes' || card?.category === 'rune';
}
