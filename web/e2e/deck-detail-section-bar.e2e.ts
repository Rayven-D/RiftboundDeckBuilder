/**
 * H-440: SPEC-005 OWN-110 in a real browser (jsdom has no layout or smooth scrolling, so the unit tests in
 * deck-detail.spec.ts can't see this; H-390 was first checked by hand, Validation H-254 attempt 2).
 */
import { expect, test, type Page } from '@playwright/test';
import { OPEN_DECK_ID, blockFirebase, buildSeed, scrollSettled, seedStorage, type Seed } from './fixtures';

const ZONES = ['legend', 'champion', 'main', 'battlefields', 'runes', 'sideboard'] as const;
/** `LAND_GAP` in deck-detail.ts: a jump lands the heading this far below the sticky bars. */
const LAND_GAP = 12;
const WIDTHS = [
  { name: 'desktop 1440', width: 1440, height: 900 },
  { name: 'phone 375', width: 375, height: 812 },
];

let seed: Seed;
test.beforeAll(async () => {
  seed = await buildSeed();
});

interface Geometry {
  headingTop: number;
  barBottom: number;
  scrollY: number;
  maxScroll: number;
  current: string[];
}

function geometry(page: Page, zone: string): Promise<Geometry> {
  return page.evaluate((zone) => {
    const heading = document.getElementById(`zone-${zone}`)!;
    const bar = document.querySelector('.deck-bar')!;
    return {
      headingTop: heading.getBoundingClientRect().top,
      barBottom: bar.getBoundingClientRect().bottom,
      scrollY,
      maxScroll: document.documentElement.scrollHeight - innerHeight,
      current: [...document.querySelectorAll('.section-nav a[aria-current="location"]')].map(
        (a) => (a as HTMLElement).dataset['zone']!,
      ),
    };
  }, zone);
}

async function openDeck(page: Page, width: number, height: number): Promise<void> {
  await blockFirebase(page.context());
  await page.setViewportSize({ width, height });
  await seedStorage(page, seed);
  await page.goto(`/decks/${OPEN_DECK_ID}`);
  await expect(page.locator('.section-nav a[data-zone]')).toHaveCount(6);
  for (const z of ZONES) await expect(page.locator(`#zone-${z}`)).toBeAttached();
  // The page is long enough that a jump is a real scroll.
  expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeGreaterThan(500);
}

for (const { name, width, height } of WIDTHS) {
  test.describe(`OWN-110 section bar (${name})`, () => {
    test(`OWN-110: each of the six jump links lands its heading under the sticky bar and marks it current (${name})`, async ({
      page,
    }) => {
      await openDeck(page, width, height);
      // Every link once, then back to the first (a jump upwards too).
      for (const zone of [...ZONES, 'legend' as const]) {
        const link = page.locator(`.section-nav a[data-zone="${zone}"]`);
        await link.click();
        await scrollSettled(page);
        const g = await geometry(page, zone);
        const where = `${zone} at ${name}: heading ${g.headingTop.toFixed(1)}, bar ${g.barBottom.toFixed(1)}, y ${g.scrollY}/${g.maxScroll}`;
        // Under the sticky bar, never hidden behind it, and on screen.
        expect(g.headingTop, where).toBeGreaterThanOrEqual(g.barBottom - 1);
        expect(g.headingTop, where).toBeLessThan(height);
        // At the landing line, unless the page can't scroll that far (a section near the end, or the first one).
        const clamped = g.scrollY >= g.maxScroll - 1 || g.scrollY <= 0;
        if (!clamped) expect(Math.abs(g.headingTop - (g.barBottom + LAND_GAP)), where).toBeLessThanOrEqual(2);
        // Exactly this link is current, and it stays current once the scroll has ended.
        expect(g.current, where).toEqual([zone]);
        await expect(link).toHaveAttribute('aria-current', 'location');
        await expect(page.locator('#zone-' + zone)).toBeFocused();
      }
    });

    test(`OWN-110: aria-current follows a plain page scroll (${name})`, async ({ page }) => {
      await openDeck(page, width, height);
      for (const zone of ZONES) {
        // Scroll (no link) so this heading sits just past the landing line, as far as the page allows. The line is
        // measured from the bars' stuck position (header + bar height): before the scroll the bar may still be in flow.
        await page.evaluate(
          ({ zone, gap }) => {
            const heading = document.getElementById(`zone-${zone}`)!;
            const sticky =
              document.querySelector('.site-header')!.getBoundingClientRect().height +
              document.querySelector('.deck-bar')!.getBoundingClientRect().height;
            const top = scrollY + heading.getBoundingClientRect().top - sticky - gap + 4;
            scrollTo({ top: Math.max(0, top), behavior: 'instant' });
          },
          { zone, gap: LAND_GAP },
        );
        await scrollSettled(page, 250);
        // The expected section by OWN-110's rule: the last one whose heading has reached the line.
        const expected = await page.evaluate(
          ({ zones, gap }) => {
            const line = document.querySelector('.deck-bar')!.getBoundingClientRect().bottom + gap + 2;
            let current = zones[0];
            for (const z of zones) if (document.getElementById(`zone-${z}`)!.getBoundingClientRect().top <= line) current = z;
            return current;
          },
          { zones: [...ZONES], gap: LAND_GAP },
        );
        const g = await geometry(page, zone);
        // A section that can reach the line is the one marked; only the last ones may fall short at max scroll.
        if (g.scrollY < g.maxScroll - 1) expect(expected, `${zone} at ${name}`).toBe(zone);
        await expect
          .poll(async () => (await geometry(page, zone)).current, { message: `${zone} at ${name}` })
          .toEqual([expected]);
      }
      // And back to the top: the first section is current again.
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await scrollSettled(page, 250);
      await expect.poll(async () => (await geometry(page, 'legend')).current).toEqual(['legend']);
    });
  });
}
