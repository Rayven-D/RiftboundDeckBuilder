/**
 * Deck ownership engine (SPEC-005 v0.4.1, SPEC-008 v0.3, SPEC-009 v0.2; stored records per
 * SPEC-003 v0.8 and SPEC-007 v0.7 from shared/storage/records). Pure, framework-free and
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
