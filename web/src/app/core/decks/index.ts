/**
 * Deck ownership engine (SPEC-005 v0.16, SPEC-008 v0.6 card-name locks; runes are cards, OWN-028; stored records
 * per SPEC-003 and SPEC-007 from shared/storage/records). Pure, framework-free and browser-only (OWN-093): no
 * Angular, no storage, no network, no clock.
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
  canLockName,
  cardsShortText,
  compareLockOrder,
  computeSharedPool,
  countedEntries,
  deckNeeds,
  lockCheckMessage,
  lockLosses,
  nameLockCheckMessage,
  settleLocks,
  sharedIndicator,
  storedLockState,
  storedLockedNames,
  zoneEntries,
} from './shared-pool';
export { migrateLocksV1, ownedForDecksOf } from './name-locks';
export type { OwnershipRecords } from './name-locks';
export {
  completionPercent,
  computeDeckOwnership,
  formatIsoDate,
  sourceLine,
  summarizeDeck,
  verdictLabel,
} from './deck-ownership-view';
