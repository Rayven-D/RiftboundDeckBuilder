/**
 * H-699 (RJ 2026-11-28): a card dialog is part of the history stack. A link followed from it keeps the dialog's entry;
 * Back from the linked page lands on the page with the same dialog open again (same card, the deck dialog's current
 * step, the page scroll underneath). Back once more closes it and stays; Forward from it returns to the linked page.
 * SPEC-005 OWN-113 / OWN-084, Brief H-698 S7.
 */
import { expect, test, type Page } from '@playwright/test';
import { OPEN_DECK_ID, blockFirebase, buildSeed, seedStorage, type Seed } from './fixtures';

let seed: Seed;
test.beforeAll(async () => {
  seed = await buildSeed({ extraDecks: 2 });
});
test.beforeEach(async ({ context }) => {
  await blockFirebase(context);
});

const DECK = new RegExp(`/decks/${OPEN_DECK_ID}$`);
const dialog = (page: Page) => page.locator('mat-dialog-container');
const title = (page: Page) => page.locator('app-deck-card-dialog h2');
/** The page's scroll position, also while a dialog blocks scrolling (the CDK pins <html> at top: -y). */
const pageY = (page: Page) =>
  page.evaluate(() => {
    const html = document.documentElement;
    return html.classList.contains('cdk-global-scrollblock') ? -(parseFloat(html.style.top) || 0) : scrollY;
  });

/** /decks → the Open deck → scrolled → the card dialog on the 3rd card, stepped once with Next. */
async function openSteppedDialog(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  await page.locator(`a.deck-tile[href="/decks/${OPEN_DECK_ID}"]`).click();
  await page.waitForURL(DECK);
  await expect(page.locator('[data-card]').first()).toBeVisible();
  await page.waitForTimeout(500); // the art settles
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  await page.waitForTimeout(200);
  const y = await pageY(page);
  expect(y).toBe(900);
  // A card fully in view, clicked where it is, so the click scrolls nothing.
  const at = await page.evaluate(() => {
    for (let y = 200; y < innerHeight - 120; y += 20)
      for (let x = 40; x < innerWidth - 40; x += 40) {
        if (document.elementFromPoint(x, y)?.closest('[data-card]')) return { x, y };
      }
    return null;
  });
  expect(at).not.toBeNull();
  await page.mouse.click(at!.x, at!.y);
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(350);
  const next = size.width <= 640 ? page.locator('.step-bar').getByRole('button', { name: 'Next card' }) : page.locator('.head').getByRole('button', { name: 'Next card' });
  const first = await title(page).innerText();
  await next.click();
  await expect(title(page)).not.toHaveText(first);
  return { y, name: await title(page).innerText() };
}

for (const vp of [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 900 },
]) {
  test(`OWN-113 (${vp.name}): link → Back reopens the same dialog on the stepped card with the page scroll; Back again closes it; Back leaves`, async ({ page }) => {
    const { y, name } = await openSteppedDialog(page, vp);
    await page.locator('app-deck-card-dialog a[href^="/collection"]').first().click();
    await page.waitForURL(/\/collection\?q=/);
    await expect(dialog(page)).toHaveCount(0);

    await page.goBack();
    await page.waitForURL(DECK);
    await expect(dialog(page)).toBeVisible();
    await expect(title(page)).toHaveText(name);
    // The page underneath is where it was.
    expect(await pageY(page)).toBe(y);

    await page.goBack();
    await expect(dialog(page)).toHaveCount(0);
    await page.waitForTimeout(150);
    expect(page.url()).toMatch(DECK);
    // Focus returns to the card the dialog showed (Brief H-698 check 15); the page scrolls only as far as that needs.
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-card'))).toMatch(new RegExp(`:${name.toLowerCase()}$`));
    expect(Math.abs((await pageY(page)) - y)).toBeLessThan(400);

    await page.goBack();
    await page.waitForURL(/\/decks$/);
  });
}

test('OWN-113: Forward from the reopened dialog returns to the linked page; Back from there reopens it again', async ({ page }) => {
  const { name } = await openSteppedDialog(page, { width: 375, height: 812 });
  await page.locator('app-deck-card-dialog a[href^="/decks/"]').first().click();
  await page.waitForURL((u) => u.pathname.startsWith('/decks/') && !DECK.test(u.href));
  const linked = page.url();
  await page.goBack();
  await page.waitForURL(DECK);
  await expect(title(page)).toHaveText(name);
  await page.goForward();
  await page.waitForURL(linked);
  await expect(dialog(page)).toHaveCount(0);
  await page.goBack();
  await page.waitForURL(DECK);
  await expect(title(page)).toHaveText(name);
});

test('OWN-113: a stale record (the card left the deck meanwhile) opens nothing and raises no error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const { name } = await openSteppedDialog(page, { width: 375, height: 812 });
  await page.locator('app-deck-card-dialog a[href^="/collection"]').first().click();
  await page.waitForURL(/\/collection\?q=/);
  await page.evaluate(
    ({ id, name }) => {
      const key = `rift.deck.${id}`;
      const d = JSON.parse(localStorage.getItem(key)!);
      for (const zone of ['main', 'sideboard'] as const) d[zone] = d[zone].filter((c: { name: string }) => c.name !== name);
      for (const zone of ['legend', 'champion'] as const) if (d[zone]?.name === name) d[zone] = null;
      d.updatedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(d));
    },
    { id: OPEN_DECK_ID, name },
  );
  await page.goBack();
  await page.waitForURL(DECK);
  await expect(page.locator('[data-card]').first()).toBeVisible();
  await page.waitForTimeout(800);
  await expect(dialog(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('OWN-113: a reload on the dialog entry reopens nothing; Back still works', async ({ page }) => {
  await openSteppedDialog(page, { width: 375, height: 812 });
  await page.locator('app-deck-card-dialog a[href^="/collection"]').first().click();
  await page.waitForURL(/\/collection\?q=/);
  await page.goBack();
  await page.waitForURL(DECK);
  await expect(dialog(page)).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-card]').first()).toBeVisible();
  await page.waitForTimeout(800);
  await expect(dialog(page)).toHaveCount(0);
  await page.goForward();
  await page.waitForURL(/\/collection\?q=/);
});
