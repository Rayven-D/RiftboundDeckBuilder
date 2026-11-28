/**
 * H-699 (Brief H-698, RJ 2026-11-28): the card dialogs on phones are a bottom sheet; the system Back closes it and
 * stays on the page; a swipe down on its head closes it. Real-browser checks named by the brief's acceptance check
 * numbers (AC n). Test data and the sign-in gate: fixtures.ts.
 */
import { expect, test, type Page } from '@playwright/test';
import { OPEN_DECK_ID, blockFirebase, buildSeed, seedStorage, type Seed } from './fixtures';

let seed: Seed;
test.beforeAll(async () => {
  seed = await buildSeed({ extraDecks: 2 });
});

const PHONE = { width: 375, height: 812 };
const sheet = (page: Page) => page.locator('.cdk-overlay-pane.card-sheet-panel');
const anyDialog = (page: Page) => page.locator('mat-dialog-container');
const historyLength = (page: Page) => page.evaluate(() => history.length);

/** Starts on /decks and goes to `path` by a router navigation, so Back from `path` has an app page to return to. */
async function start(page: Page, path: string, size = PHONE): Promise<void> {
  await page.setViewportSize(size);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  // The app nav link (header or tab bar): a router navigation, without Playwright scrolling anything.
  await page.locator(`a[href="${path}"]:visible`).first().dispatchEvent('click');
  await page.waitForURL((u) => u.pathname === path.split('?')[0]);
}

async function openCollectionCard(page: Page, nth = 4): Promise<string> {
  const tile = page.locator('[data-entry]').nth(nth);
  const id = (await tile.getAttribute('data-entry'))!;
  await tile.click();
  await expect(sheet(page)).toBeVisible();
  await page.waitForTimeout(350); // the slide-in
  return id;
}

/** Drags the sheet head down by `dy` px with the mouse (pointer events), over `ms` milliseconds. */
async function dragHead(page: Page, selector: string, dy: number, steps: number): Promise<void> {
  const box = (await page.locator(selector).boundingBox())!;
  const x = box.x + box.width / 3;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, y + (dy * i) / steps);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

test.beforeEach(async ({ context }) => {
  await blockFirebase(context);
});

test('AC 1 / AC 2 / AC 3 / AC 7 / AC 16: Collection on a phone opens a bottom sheet with a handle, title and Close only', async ({ page }) => {
  await start(page, '/collection');
  await openCollectionCard(page);
  const m = await page.evaluate(() => {
    const pane = document.querySelector('.card-sheet-panel')!.getBoundingClientRect();
    const surface = getComputedStyle(document.querySelector('.card-sheet-panel .mat-mdc-dialog-surface')!);
    const handle = document.querySelector('app-card-dialog .sheet-handle')!;
    const h = handle.getBoundingClientRect();
    const head = document.querySelector('app-card-dialog .head')!;
    const lead = getComputedStyle(document.querySelector('app-card-dialog .printing')!);
    const h3 = document.querySelector('app-card-dialog h3');
    return {
      top: Math.round(pane.top),
      bottom: Math.round(pane.bottom),
      radius: surface.borderRadius,
      handle: [Math.round(h.top - pane.top), h.width, h.height, handle.getAttribute('aria-hidden')],
      headButtons: Array.from(head.querySelectorAll('button')).map((b) => b.getAttribute('aria-label')),
      headHeight: head.getBoundingClientRect().height,
      lead: [lead.fontSize, lead.fontWeight],
      h3: h3 ? [getComputedStyle(h3).fontSize, getComputedStyle(h3).fontWeight] : null,
      art: Math.round(document.querySelector('app-card-dialog .art-frame')!.getBoundingClientRect().width),
      active: document.activeElement?.tagName,
      overscroll: getComputedStyle(document.querySelector('app-card-dialog .sheet-body')!).overscrollBehaviorY,
    };
  });
  expect(m.top).toBe(12); // no top inset in the test browser: the 12 px strip
  expect(m.bottom).toBe(PHONE.height);
  expect(m.radius).toBe('8px 8px 0px 0px');
  expect(m.handle).toEqual([8, 36, 4, 'true']);
  expect(m.headButtons).toEqual(['Close']);
  expect(m.headHeight).toBeGreaterThanOrEqual(60);
  expect(m.lead).toEqual(['16px', '600']);
  expect(m.h3).toEqual(['14px', '600']);
  expect(m.art).toBe(225);
  expect(m.overscroll).toBe('contain'); // AC 18
  // AC 16: focus is on the dialog container (no ring on Close); one Tab reaches Close.
  expect(m.active).toBe('MAT-DIALOG-CONTAINER');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Close');
});

test('AC 4: the head stays put while the body scrolls, and its divider shows only when scrolled', async ({ page }) => {
  await start(page, '/collection');
  await openCollectionCard(page);
  const read = () =>
    page.evaluate(() => {
      const pane = document.querySelector('.card-sheet-panel')!.getBoundingClientRect();
      const head = document.querySelector('app-card-dialog .head')!;
      return { offset: Math.round(head.getBoundingClientRect().top - pane.top), divider: getComputedStyle(head, '::after').opacity };
    });
  expect(await read()).toEqual({ offset: 0, divider: '0' });
  await page.locator('app-card-dialog .sheet-body').evaluate((el) => el.scrollTo({ top: 99999 }));
  await page.waitForTimeout(250);
  expect(await read()).toEqual({ offset: 0, divider: '1' });
  await page.locator('app-card-dialog .sheet-body').evaluate((el) => el.scrollTo({ top: 0 }));
  await page.waitForTimeout(250);
  expect((await read()).divider).toBe('0');
});

test('AC 12 / AC 15: Back closes the sheet, the URL and the page scroll stay, focus returns to the tile', async ({ page }) => {
  await start(page, '/collection');
  await page.evaluate(() => scrollTo({ top: 1500, behavior: 'instant' }));
  await page.waitForTimeout(300);
  const url = page.url();
  const y = await page.evaluate(() => scrollY);
  expect(y).toBe(1500);
  const length = await historyLength(page);
  // The tile under the middle of the viewport, so the click scrolls nothing.
  const id = await page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('[data-entry]')?.getAttribute('data-entry'));
  expect(id).toBeTruthy();
  await page.mouse.click(PHONE.width / 2, PHONE.height / 2);
  await expect(sheet(page)).toBeVisible();
  await page.waitForTimeout(350);
  expect(await historyLength(page)).toBe(length + 1);
  await page.goBack();
  await expect(anyDialog(page)).toHaveCount(0);
  expect(page.url()).toBe(url);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => scrollY)).toBe(y);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-entry'))).toBe(id);
  // The entry is used up: the next Back leaves the page.
  await page.goBack();
  await page.waitForURL(/\/decks$/);
});

for (const how of ['Close', 'Escape', 'backdrop', 'swipe'] as const) {
  test(`AC 13 / AC 15: closed by ${how}, then one Back goes to the previous page`, async ({ page }) => {
    await start(page, '/collection');
    const length = await historyLength(page);
    const id = await openCollectionCard(page);
    if (how === 'Close') await page.locator('app-card-dialog .close-button').click();
    else if (how === 'Escape') await page.keyboard.press('Escape');
    else if (how === 'backdrop') await page.mouse.click(PHONE.width / 2, 4);
    else await dragHead(page, 'app-card-dialog .head', 220, 8);
    await expect(anyDialog(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-entry'))).toBe(id);
    await expect.poll(() => historyLength(page)).toBe(length + 1); // the entry stays in the list but is not current
    await page.waitForTimeout(100);
    expect(new URL(page.url()).pathname).toBe('/collection');
    await page.goBack();
    await page.waitForURL(/\/decks$/);
  });
}

test('AC 11: a short slow drag snaps back; a quick flick closes; a drag in the body never closes', async ({ page }) => {
  await start(page, '/collection');
  await openCollectionCard(page);
  await dragHead(page, 'app-card-dialog .head', 60, 10);
  await page.waitForTimeout(400);
  await expect(sheet(page)).toBeVisible();
  expect(await sheet(page).evaluate((el) => getComputedStyle(el).transform)).toBe('none');

  // A drag in the body: scrolls it (or nothing), never closes.
  await dragHead(page, 'app-card-dialog .sheet-body', 250, 8);
  await page.waitForTimeout(400);
  await expect(sheet(page)).toBeVisible();

  // A quick flick (short distance, fast).
  await dragHead(page, 'app-card-dialog .head', 70, 2);
  await expect(anyDialog(page)).toHaveCount(0);
});

test('AC 9 / AC 3: deck dialog step bar: Previous / Next at the bottom, stepping adds no history and resets the body', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await seedStorage(page, seed);
  await page.goto(`/decks/${OPEN_DECK_ID}`);
  await page.locator('[data-card]').nth(2).click();
  await expect(sheet(page)).toBeVisible();
  await page.waitForTimeout(350);
  const length = await historyLength(page);
  const visibleHead = await page
    .locator('app-deck-card-dialog .head button:visible')
    .evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
  expect(visibleHead).toEqual(['Close']);
  const bar = page.locator('app-deck-card-dialog .step-bar');
  const next = bar.getByRole('button', { name: 'Next card' });
  const prev = bar.getByRole('button', { name: 'Previous card' });
  for (const b of [prev, next]) {
    const box = (await b.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(96);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const barBox = (await bar.boundingBox())!;
  expect(Math.round(barBox.y + barBox.height)).toBe(PHONE.height);
  const title = page.locator('app-deck-card-dialog h2');
  const before = await title.innerText();
  await page.locator('app-deck-card-dialog .sheet-body').evaluate((el) => el.scrollTo({ top: 300 }));
  const paneTop = (await sheet(page).boundingBox())!.y;
  await next.click();
  await expect(title).not.toHaveText(before);
  expect(await page.locator('app-deck-card-dialog .sheet-body').evaluate((el) => el.scrollTop)).toBe(0);
  expect((await sheet(page).boundingBox())!.y).toBe(paneTop);
  await next.click();
  await prev.click();
  expect(await historyLength(page)).toBe(length);
});

test('AC 14: a deck row in the sheet opens that deck; one Back returns to the first deck with no sheet open', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  await page.locator(`a.deck-tile[href="/decks/${OPEN_DECK_ID}"]`).click();
  await page.waitForURL(new RegExp(`/decks/${OPEN_DECK_ID}$`));
  await page.locator('[data-card]').nth(2).click();
  await expect(sheet(page)).toBeVisible();
  const other = page.locator('app-deck-card-dialog a[href^="/decks/"]').first();
  const href = (await other.getAttribute('href'))!;
  await other.click();
  await page.waitForURL((u) => u.pathname === href);
  await expect(anyDialog(page)).toHaveCount(0);
  await page.goBack();
  await page.waitForURL(new RegExp(`/decks/${OPEN_DECK_ID}$`));
  await expect(anyDialog(page)).toHaveCount(0);
  await page.goBack();
  await page.waitForURL(/\/decks$/);
});

test('AC 20 / S7: at 1440 the Collection dialog is the centred dialog as before (Previous / Next in the head); Back closes it too', async ({ page }) => {
  await start(page, '/collection', { width: 1440, height: 900 });
  const length = await historyLength(page);
  await page.locator('[data-entry]').nth(4).click();
  const pane = page.locator('.cdk-overlay-pane.card-dialog-panel');
  await expect(pane).toBeVisible();
  await expect(sheet(page)).toHaveCount(0);
  const labels = await page.locator('app-card-dialog .head button:visible').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
  expect(labels).toEqual(['Previous card', 'Next card', 'Close']);
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Close');
  const box = (await pane.boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - (720 - 7.5))).toBeLessThanOrEqual(1); // centred in the viewport minus the page scrollbar
  await page.goBack();
  await expect(anyDialog(page)).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe('/collection');
  expect(await historyLength(page)).toBe(length + 1);
});

test('AC 17: reduced motion: no slide on open or close, a short drag snaps back at once, dragging still follows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page, '/collection');
  await page.locator('[data-entry]').nth(4).click();
  await expect(sheet(page)).toBeVisible();
  expect(await sheet(page).evaluate((el) => parseFloat(getComputedStyle(el).animationDuration) * 1000)).toBeLessThan(1);
  // Dragging follows the finger (direct manipulation), then snaps back with no visible transition.
  const box = (await page.locator('app-card-dialog .head').boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 50, { steps: 4 });
  await page.mouse.move(box.x + 100, box.y + 80, { steps: 4 });
  expect(await sheet(page).evaluate((el) => el.style.transform)).toBe('translateY(50px)');
  await page.mouse.up();
  await page.waitForTimeout(30);
  expect(await sheet(page).evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  const t0 = Date.now();
  await page.locator('app-card-dialog .close-button').click();
  await expect(anyDialog(page)).toHaveCount(0, { timeout: 500 });
  expect(Date.now() - t0).toBeLessThan(500);
});

test('S7 (RJ 2026-11-28, every width): at 768 the deck card dialog closes on Back and the deck page stays', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  await page.locator(`a.deck-tile[href="/decks/${OPEN_DECK_ID}"]`).click();
  await page.waitForURL(new RegExp(`/decks/${OPEN_DECK_ID}$`));
  await page.locator('[data-card]').nth(2).click();
  await expect(anyDialog(page)).toBeVisible();
  await expect(sheet(page)).toHaveCount(0);
  await page.locator('app-deck-card-dialog .head').getByRole('button', { name: 'Next card' }).click();
  await page.goBack();
  await expect(anyDialog(page)).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe(`/decks/${OPEN_DECK_ID}`);
  await page.goBack();
  await page.waitForURL(/\/decks$/);
});
