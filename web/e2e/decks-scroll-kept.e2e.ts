/**
 * H-431: brain/04-UI/Decks.md §10 L11 "scroll kept" (OWN-070 / OWN-071) in a real browser. The unit test could
 * only assert "no scrollTo call" in jsdom (Validation H-380); here the list is really scrolled and the change
 * comes from a second page of the same browser context, so the browser itself fires the `storage` event.
 */
import { expect, test } from '@playwright/test';
import { COLLECTION_KEY, OPEN_DECK_ID, STATIC_PAGE, blockFirebase, buildSeed, scrollSettled, seedStorage, type Seed } from './fixtures';

let seed: Seed;
test.beforeAll(async () => {
  seed = await buildSeed({ extraDecks: 24 });
});

const openTile = 'app-deck-tile:has(.name-text:text-is("Generated Open"))';

test('OWN-071 L11: a scrolled /decks list keeps its scroll position after a collection change in another tab', async ({
  page,
  context,
}) => {
  await blockFirebase(context);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile')).toHaveCount(seed.decks.length);
  await expect(page.locator(openTile)).toHaveCount(1);

  // Scroll the list well down, but not to the end (a clamp at max scroll would hide a jump to the top).
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  expect(max).toBeGreaterThan(800);
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(max / 2));
  const before = await scrollSettled(page);
  expect(before).toBeGreaterThan(0);

  const tileText = () => page.locator(openTile).innerText();
  const textBefore = await tileText();
  // Mark the tile node: a recompute in place keeps it, a re-render from scratch would replace it.
  await page.locator(openTile).evaluate((el) => ((el as HTMLElement & { e2eMark?: boolean }).e2eMark = true));

  // Second tab, same origin: remove the Open deck's Legend from the collection.
  const legendKey = seed.decks.find((d) => d.id === OPEN_DECK_ID)!.legend!.cardKey;
  const other = await context.newPage();
  await other.goto(STATIC_PAGE);
  await other.evaluate(
    ({ key, legendKey }) => {
      const c = JSON.parse(localStorage.getItem(key)!);
      delete c.cards[legendKey];
      c.updatedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(c));
    },
    { key: COLLECTION_KEY, legendKey },
  );
  await other.close();

  // The list recomputed (the tile now counts one copy fewer) ...
  await expect.poll(tileText).not.toBe(textBefore);
  await page.waitForTimeout(300);
  // ... in place, and the page did not move.
  expect(await page.locator(openTile).evaluate((el) => (el as HTMLElement & { e2eMark?: boolean }).e2eMark)).toBe(true);
  const after = await scrollSettled(page);
  expect(after).toBe(before);
  expect(after).toBeGreaterThan(0);
});
