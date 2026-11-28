/**
 * H-699 (RJ 2026-11-28): SPEC-007 COLL-093 (e) / SPEC-005 OWN-084 "scroll position kept on back-navigation" in a real
 * browser. Open a deck from a scrolled `/decks` list (or leave a scrolled `/collection`), press Back: the list is
 * where the user left it. Before H-699 the position was read in the page's onDestroy, after Angular had removed the
 * list's DOM, so it was always 0 (see shared/list-scroll.ts).
 */
import { expect, test, type Page } from '@playwright/test';
import { blockFirebase, buildSeed, scrollSettled, seedStorage, type Seed } from './fixtures';

let seed: Seed;
test.beforeAll(async () => {
  seed = await buildSeed({ extraDecks: 24 });
});

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
];

/** The first list item showing at the top of the viewport and its distance from the top (what the user sees). */
async function topItem(page: Page, selector: string, attr: string): Promise<{ key: string | null; top: number }> {
  return page.evaluate(
    ({ selector, attr }) => {
      for (const el of Array.from(document.querySelectorAll(selector))) {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.height > 0) return { key: el.getAttribute(attr), top: Math.round(r.top) };
      }
      return { key: null, top: 0 };
    },
    { selector, attr },
  );
}

/** Scrolls to the middle of the page and starts recording the scroll position at the moment of a click. */
async function scrollHalfway(page: Page): Promise<number> {
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  expect(max).toBeGreaterThan(600);
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(max / 2));
  // The SPA keeps this window object across the navigations, so the value is still there after Back.
  await page.evaluate(() =>
    addEventListener('click', () => ((window as { atClick?: number }).atClick = scrollY), { capture: true }),
  );
  return scrollSettled(page);
}

const atClick = (page: Page) => page.evaluate(() => (window as { atClick?: number }).atClick ?? -1);

for (const vp of VIEWPORTS) {
  test(`OWN-084 / COLL-093 e (${vp.name}): Back from a deck restores the /decks scroll position`, async ({ page, context }) => {
    await blockFirebase(context);
    await page.setViewportSize(vp);
    await seedStorage(page, seed);
    await page.goto('/decks');
    await expect(page.locator('app-deck-tile')).toHaveCount(seed.decks.length);
    const before = await scrollHalfway(page);
    expect(before).toBeGreaterThan(0);

    // The tile under the middle of the viewport, so the click itself scrolls nothing.
    const seen = await topItem(page, 'a.deck-tile', 'href');
    await page.mouse.click(vp.width / 2, vp.height / 2);
    await page.waitForURL(/\/decks\/[^/?]+$/);
    await expect(page.locator('app-deck-tile')).toHaveCount(0);

    await page.goBack();
    await page.waitForURL(/\/decks(\?.*)?$/);
    await expect(page.locator('app-deck-tile')).toHaveCount(seed.decks.length);
    expect(await atClick(page)).toBe(before);
    // The same tile is at the top, at the same height (scrollY itself may differ by a few px: tiles off screen use
    // content-visibility placeholders, so the document above them is not always measured the same way).
    expect(Math.abs((await scrollSettled(page)) - before)).toBeLessThan(400);
    const back = await topItem(page, 'a.deck-tile', 'href');
    expect(back.key).toBe(seen.key);
    expect(Math.abs(back.top - seen.top)).toBeLessThanOrEqual(1);
  });

  test(`COLL-093 e (${vp.name}): Back to /collection from another page restores its scroll position`, async ({ page, context }) => {
    await blockFirebase(context);
    await page.setViewportSize(vp);
    await seedStorage(page, seed);
    await page.goto('/collection');
    await expect(page.locator('[data-entry]').first()).toBeVisible();
    const before = await scrollHalfway(page);
    expect(before).toBeGreaterThan(0);

    const seen = await topItem(page, '[data-entry]', 'data-entry');
    // A click on the visible Decks nav link (header or tab bar), without Playwright scrolling anything into view.
    await page.locator('a[href="/decks"]:visible').first().dispatchEvent('click');
    await page.waitForURL(/\/decks(\?.*)?$/);
    await expect(page.locator('app-deck-tile').first()).toBeVisible();

    await page.goBack();
    await page.waitForURL(/\/collection(\?.*)?$/);
    await expect(page.locator('[data-entry]').first()).toBeAttached();
    expect(await atClick(page)).toBe(before);
    expect(await scrollSettled(page)).toBe(before);
    expect(await topItem(page, '[data-entry]', 'data-entry')).toEqual(seen);
  });
}
