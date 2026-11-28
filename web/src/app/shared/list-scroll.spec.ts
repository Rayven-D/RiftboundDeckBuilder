import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListItems, readListScroll, restoreListScroll } from './list-scroll';

/** H-699: COLL-093 (e) / OWN-084 Back restore. The navigation part (save on NavigationStart) is covered in a real
 * browser by e2e/list-scroll-back.e2e.ts; jsdom has no layout, so these tests stub the rects and the scrolling. */
const ITEMS: ListItems = { selector: '[data-k]', key: (el) => el.getAttribute('data-k') };

function list(tops: number[]): HTMLElement[] {
  document.body.innerHTML = '';
  return tops.map((top, i) => {
    const el = document.createElement('div');
    el.setAttribute('data-k', `k${i}`);
    el.getBoundingClientRect = () => ({ top, bottom: top + 100, height: 100 }) as DOMRect;
    document.body.append(el);
    return el;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('H-699 list scroll (COLL-093 e, OWN-084)', () => {
  it('COLL-093 e: reads scrollY and the first item showing at the top as the anchor', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(2452);
    list([-250, -150, -50, 50]);
    expect(readListScroll(document, ITEMS)).toEqual({ y: 2452, anchor: { key: 'k2', top: -50 } });
    expect(readListScroll(document)).toEqual({ y: 2452, anchor: null });
  });

  it('COLL-093 e: restore scrolls to y, then lines the anchor up again when the layout above it changed', () => {
    let y = 0;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(((o: ScrollToOptions) => (y = o.top ?? y)) as never);
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(((o: ScrollToOptions) => (y += o.top ?? 0)) as never);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    const [, anchor] = list([0, 0]);
    // After scrollTo(2452) the anchor sits 179 px lower than it did (placeholder sizes above it).
    anchor.getBoundingClientRect = () => ({ top: -50 + 179 - (y - 2452), bottom: 0, height: 100 }) as DOMRect;

    restoreListScroll({ y: 2452, anchor: { key: 'k1', top: -50 } }, ITEMS, document);
    expect(scrollTo).toHaveBeenCalledWith({ top: 2452, behavior: 'instant' });
    expect(scrollBy).toHaveBeenCalledWith({ top: 179, behavior: 'instant' });
    while (frames.length) frames.shift()!(0);
    expect(y).toBe(2631);
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it('COLL-093 e: without its anchor in the DOM, restore keeps trying to reach y while the list is too short', () => {
    let y = 0;
    let max = 1000;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y);
    vi.spyOn(window, 'scrollTo').mockImplementation(((o: ScrollToOptions) => (y = Math.min(o.top ?? y, max))) as never);
    vi.spyOn(window, 'scrollBy').mockImplementation(((o: ScrollToOptions) => (y = Math.min(y + (o.top ?? 0), max))) as never);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    list([]);

    restoreListScroll({ y: 5000, anchor: { key: 'gone', top: 0 } }, ITEMS, document);
    expect(y).toBe(1000);
    max = 9000; // the virtual rows got their height
    while (frames.length) frames.shift()!(0);
    expect(y).toBe(5000);
  });

  it('COLL-093 e: user scroll input stops the restore', () => {
    let y = 0;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y);
    vi.spyOn(window, 'scrollTo').mockImplementation(((o: ScrollToOptions) => (y = Math.min(o.top ?? y, 100))) as never);
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation((() => undefined) as never);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    list([]);

    restoreListScroll({ y: 5000, anchor: null }, ITEMS, document);
    scrollBy.mockClear();
    window.dispatchEvent(new Event('wheel'));
    while (frames.length) frames.shift()!(0);
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
