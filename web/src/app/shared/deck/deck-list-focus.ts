import { Injectable } from '@angular/core';

/** Where focus should land on `/decks` the next time its list renders (H-462). */
export type DeckListFocusTarget = { readonly kind: 'first' } | { readonly kind: 'deck'; readonly deckId: string };

/**
 * H-462 (WCAG 2.4.3, Decks §9): Deck detail's Delete navigates to `/decks` and its "Deck deleted." Undo restores the
 * deck there; both would leave focus on `<body>`. Deck detail files a request here, and the Decks page applies it once
 * its list (or its empty state) has rendered: after Delete to the first deck tile link, or the empty state's
 * "Import deck" when no deck is left; after Undo to the restored deck's tile (the first tile when a filter hides it).
 */
@Injectable({ providedIn: 'root' })
export class DeckListFocus {
  private pending: DeckListFocusTarget | null = null;

  request(target: DeckListFocusTarget): void {
    this.pending = target;
  }

  /** Called by the Decks page after a render with its list or empty state; true when focus was moved. */
  apply(root: ParentNode): boolean {
    const target = this.pending;
    if (!target) return false;
    const el = deckListFocusElement(root, target);
    this.pending = null; // one try per rendered list: a stale request never steals focus later
    if (!el) return false;
    el.focus();
    return true;
  }
}

/** The element a request points at inside the Decks page, or null when the page has neither tiles nor empty state. */
export function deckListFocusElement(root: ParentNode, target: DeckListFocusTarget): HTMLElement | null {
  const tiles = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.deck-tile'));
  if (target.kind === 'deck') {
    const own = tiles.find((a) => a.getAttribute('href') === `/decks/${encodeURIComponent(target.deckId)}`);
    if (own) return own;
  }
  if (tiles[0]) return tiles[0];
  return (
    Array.from(root.querySelectorAll<HTMLButtonElement>('app-empty-state button')).find((b) => b.textContent?.trim() === 'Import deck') ??
    null
  );
}
