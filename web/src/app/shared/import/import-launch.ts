/**
 * SPEC-010 SYNC-159 (c): the one-shot query parameters that open an import dialog from elsewhere (Home's buttons, a
 * return after sign-in). Pure, so the rule is testable without a router.
 *
 * - `/collection?add=1` opens "Add to your collection"; `/decks?import=1` opens "Import deck".
 * - Exactly the value `1`; any other value or parameter is ignored and left alone.
 * - Once the page is ready: `open` and drop the parameter; a page that cannot import drops it without opening.
 */
export const IMPORT_PARAMS = { collection: 'add', deck: 'import' } as const;

export type LaunchDecision = 'wait' | 'open' | 'drop' | 'none';

/**
 * @param value the parameter's value in the address (`null` when absent)
 * @param page `waiting` while the gate is closed or the page is loading; `ready` when it can import; `cannot` when it
 *             cannot (card data unavailable, an unreadable store)
 */
export function launchDecision(value: string | null, page: 'waiting' | 'ready' | 'cannot'): LaunchDecision {
  if (value !== '1') return 'none';
  if (page === 'waiting') return 'wait';
  return page === 'ready' ? 'open' : 'drop';
}
