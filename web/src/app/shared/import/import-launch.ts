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

/**
 * H-189 finding 2 (WCAG 2.4.3, SYNC-159, COLL-094 g, OWN-094): where focus goes when an import dialog closes, chosen
 * at close time (a `?add=1` / `?import=1` launch opens the dialog before the floating button exists, so a target read
 * at open time would be `<body>`). The floating button first; else the control that opened the dialog, if it is
 * still on the page; else the empty state's button. `undefined` lets the caller fall back to `#main`.
 */
export function importFocusTarget(c: {
  fab?: HTMLElement | null;
  opener?: HTMLElement | null;
  emptyButton?: HTMLElement | null;
}): HTMLElement | undefined {
  const live = (el: HTMLElement | null | undefined) => (el?.isConnected ? el : undefined);
  return live(c.fab) ?? live(c.opener) ?? live(c.emptyButton);
}

/** The element that has focus when a dialog opens, unless that is `<body>` (a launch from the address). */
export function dialogOpener(doc: Document): HTMLElement | null {
  const el = doc.activeElement;
  return el instanceof HTMLElement && el !== doc.body ? el : null;
}
