/**
 * Deck ownership engine (SPEC-005 v0.5, SPEC-008 v0.4; runes are cards, OWN-028; stored records per
 * SPEC-003 v0.9 and SPEC-007 v0.8 from shared/storage/records). Pure, framework-free and
 * browser-only (OWN-093): no Angular, no storage, no network, no clock.
 */
export * from './types';
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
