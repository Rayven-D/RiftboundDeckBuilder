/**
 * Deck ownership engine (SPEC-005 v0.4, SPEC-008 v0.2, SPEC-009 v0.2). Pure, framework-free and
 * browser-only (OWN-093): no Angular, no storage, no network, no clock.
 */
export * from './types';
export { isRuneEntry } from './runes';
export { cachedDeckOwnership, deckOwnership } from './deck-ownership';
export { banStatus } from './ban-status';
export { tileOwnership } from './tile-ownership';
export type { OwnershipState, TileOwnership } from './tile-ownership';
export {
  COUNTED_ZONES,
  ZONE_ORDER,
  availability,
  canLock,
  cardsShortText,
  computeSharedPool,
  countedEntries,
  lockCheckMessage,
  lockedShortfalls,
  sharedIndicator,
  shortfallNotice,
  shortfallWarning,
  zoneEntries,
} from './shared-pool';
export {
  computeDeckOwnership,
  formatIsoDate,
  sourceLine,
  summarizeDeck,
} from './deck-ownership-view';
