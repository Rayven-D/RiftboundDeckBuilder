import { DeckListFocus, deckListFocusElement } from './deck-list-focus';

function page(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

const TILES = `
  <ul class="deck-grid">
    <li><a class="deck-tile" href="/decks/a">A</a></li>
    <li><a class="deck-tile" href="/decks/b">B</a></li>
  </ul>`;
const EMPTY = `<app-empty-state><button type="button">Import deck</button><a href="/tournaments">Tournaments</a></app-empty-state>`;

describe('DeckListFocus (H-462)', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('H-462 (2): "first" points at the first deck tile link', () => {
    const root = page(TILES);
    expect(deckListFocusElement(root, { kind: 'first' })!.getAttribute('href')).toBe('/decks/a');
  });

  it('H-462 (3): "deck" points at that deck\'s tile, or the first tile when it is not listed (a filter hides it)', () => {
    const root = page(TILES);
    expect(deckListFocusElement(root, { kind: 'deck', deckId: 'b' })!.getAttribute('href')).toBe('/decks/b');
    expect(deckListFocusElement(root, { kind: 'deck', deckId: 'zz' })!.getAttribute('href')).toBe('/decks/a');
  });

  it('H-462 (2): with no deck left it points at the empty state\'s Import deck', () => {
    const root = page(EMPTY);
    expect(deckListFocusElement(root, { kind: 'first' })!.textContent).toBe('Import deck');
    expect(deckListFocusElement(page('<p>loading</p>'), { kind: 'first' })).toBeNull();
  });

  it('H-462: apply() focuses the target once; a request is used up by the next rendered list even when nothing matched', () => {
    const focus = new DeckListFocus();
    const root = page(TILES);
    expect(focus.apply(root)).toBe(false); // nothing requested: focus is never moved
    focus.request({ kind: 'deck', deckId: 'b' });
    expect(focus.apply(root)).toBe(true);
    expect(document.activeElement!.getAttribute('href')).toBe('/decks/b');
    (document.activeElement as HTMLElement).blur();
    expect(focus.apply(root)).toBe(false);

    focus.request({ kind: 'first' });
    expect(focus.apply(page('<p>No decks match these filters</p>'))).toBe(false);
    expect(focus.apply(root)).toBe(false); // the stale request does not steal focus later
  });
});
