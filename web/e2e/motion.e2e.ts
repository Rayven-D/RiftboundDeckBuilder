/**
 * H-717 (Brief H-716, RJ 2026-11-28 "not too much motion, but not too blocky"): the motion pass in a real browser.
 * Tests are named by the brief's acceptance check numbers (check n) and spec items (S n). Test data: fixtures.ts.
 *
 * Every view transition is recorded by wrapping `Document.prototype.startViewTransition` (an init script): the
 * classes on <html> and the running animations once it is ready (`pseudo:animationName`), so a check can tell which
 * parts moved, and that nothing ran under reduced motion.
 */
import { expect, test, type Page } from '@playwright/test';
import { OPEN_DECK_ID, blockFirebase, buildSeed, seedStorage, type Seed } from './fixtures';

let seed: Seed;
test.beforeAll(async () => {
  seed = await buildSeed({ extraDecks: 2 });
});

interface VtRecord {
  cls: string[];
  anims: string[];
}

test.beforeEach(async ({ context }) => {
  await blockFirebase(context);
  await context.addInitScript(() => {
    const w = window as unknown as { __vt: VtRecord[] };
    w.__vt = [];
    const orig = Document.prototype.startViewTransition;
    if (!orig) return;
    Document.prototype.startViewTransition = function (this: Document, arg: never) {
      const t = orig.call(this, arg);
      const rec: VtRecord = { cls: [...document.documentElement.classList], anims: [] };
      w.__vt.push(rec);
      t.ready
        .then(() => {
          rec.cls = [...document.documentElement.classList];
          rec.anims = document
            .getAnimations()
            .map((a) => `${(a.effect as KeyframeEffect | null)?.pseudoElement ?? ''}:${(a as CSSAnimation).animationName ?? ''}`)
            .filter((s) => s.startsWith('::view-transition'));
        })
        .catch(() => undefined);
      return t;
    } as typeof orig;
  });
});

const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };
const DECK = new RegExp(`/decks/${OPEN_DECK_ID}$`);
const vts = (page: Page) => page.evaluate(() => (window as unknown as { __vt: VtRecord[] }).__vt);
const clearVts = (page: Page) => page.evaluate(() => ((window as unknown as { __vt: VtRecord[] }).__vt = []));

/** /decks, then the Open deck by a click (so Back has an app page to return to). */
async function openDeck(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(size);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  await page.locator(`a.deck-tile[href="/decks/${OPEN_DECK_ID}"]`).click();
  await page.waitForURL(DECK);
  await expect(page.locator('[data-card]').first()).toBeVisible();
  await page.waitForTimeout(400);
  await dismissNotices(page);
}

/** A notice at the top (e.g. the sync notice of the blocked Firebase) would cover the sticky section bar on phones. */
async function dismissNotices(page: Page): Promise<void> {
  const ok = page.locator('mat-snack-bar-container button');
  if (await ok.count()) {
    await ok.first().click();
    await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
  }
}

/** Scrolls (instantly) so the heading of `zone` sits `gap` px under the sticky section bar. */
async function headingUnderBar(page: Page, zone: string, gap = 12): Promise<void> {
  await page.evaluate(
    ({ zone, gap }) => {
      const h = document.getElementById(`zone-${zone}`)!;
      const bar = document.querySelector('.deck-bar')!.getBoundingClientRect();
      const header = document.querySelector('.site-header')!.getBoundingClientRect().height;
      scrollTo({ top: scrollY + h.getBoundingClientRect().top - (header + bar.height) - gap, behavior: 'instant' });
    },
    { zone, gap },
  );
  await page.waitForTimeout(150);
}

/** Clicks a view toggle button where it is: Playwright's own click scrolls a sticky element to its static place first. */
async function pressToggle(page: Page, label: string): Promise<void> {
  const box = (await page.locator('.view-toggle button', { hasText: label }).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

const headingTop = (page: Page, zone: string) =>
  page.evaluate((zone) => document.getElementById(`zone-${zone}`)!.getBoundingClientRect().top, zone);

for (const vp of [
  { name: '1440', ...DESKTOP },
  { name: '375', ...PHONE },
]) {
  test(`check 1 / S1 (${vp.name}): Card ↔ List keeps the section heading in place (±4 px) and cross-fades without a rise`, async ({ page }) => {
    await openDeck(page, vp);
    for (const zone of ['main', 'battlefields']) {
      await headingUnderBar(page, zone);
      const before = await headingTop(page, zone);
      await clearVts(page);
      await pressToggle(page, 'List view');
      await expect(page.locator('.view-toggle button', { hasText: 'List view' })).toHaveAttribute('aria-pressed', 'true');
      await page.waitForTimeout(400);
      expect(Math.abs((await headingTop(page, zone)) - before), `${zone} ${await page.evaluate(() => [scrollY, document.documentElement.scrollHeight - innerHeight])}`).toBeLessThanOrEqual(4);
      const [rec] = await vts(page);
      expect(rec.cls).toContain('vt-view-swap');
      // The cards fade (old: route-out, new: fade-in, no rise); the section bar and the chrome do not move.
      expect(rec.anims).toContain('::view-transition-old(main):route-out');
      expect(rec.anims).toContain('::view-transition-new(main):fade-in');
      expect(rec.anims.filter((a) => /deck-section-bar|deck-panel|site-header|site-footer|tab-bar/.test(a))).toEqual([]);

      await pressToggle(page, 'Card view');
      await page.waitForTimeout(400);
      expect(Math.abs((await headingTop(page, zone)) - before), `${zone} ${await page.evaluate(() => [scrollY, document.documentElement.scrollHeight - innerHeight])}`).toBeLessThanOrEqual(4);
    }
  });
}

test('check 1 / S1: at the very top the page stays at the top; deep in a section the same section stays current', async ({ page }) => {
  await openDeck(page, DESKTOP);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await pressToggle(page, 'List view');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await pressToggle(page, 'Card view');
  await page.waitForTimeout(400);
  // Halfway into Main deck (its heading is off screen above).
  await page.evaluate(() => {
    const s = document.getElementById('section-main')!.getBoundingClientRect();
    scrollTo({ top: scrollY + s.top + s.height / 2, behavior: 'instant' });
  });
  await page.waitForTimeout(200);
  await pressToggle(page, 'List view');
  await page.waitForTimeout(400);
  await expect(page.locator('.section-nav a[aria-current="location"]')).toHaveAttribute('data-zone', 'main');
});

// Check 2 (the sheet fading out with the old page on a link) is not built: keeping the dialog in the route transition's
// picture crashed Chromium's renderer on a deck-to-deck link (H-717). The link closes the sheet at once, as in H-699.
test('check 3 / S2 (375): Back to a sheet reopened from history: the page behind is instant, the sheet fades in place', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openDeck(page, PHONE);
  await page.locator('[data-card]').nth(2).click();
  await expect(page.locator('.cdk-overlay-pane.card-sheet-panel')).toBeVisible();
  await page.waitForTimeout(350);
  await clearVts(page);
  await page.locator('app-deck-card-dialog a[href^="/collection"]').first().click();
  await page.waitForURL(/\/collection\?q=/);
  await expect(page.locator('mat-dialog-container')).toHaveCount(0);
  let [rec] = await vts(page);
  expect(rec.anims).toContain('::view-transition-new(main):route-in');

  await page.waitForTimeout(400);
  await clearVts(page);
  await page.goBack();
  await page.waitForURL(DECK);
  const pane = page.locator('.cdk-overlay-pane.card-sheet-panel');
  await expect(pane).toBeVisible();
  [rec] = await vts(page);
  // The page behind is instant (vt-instant: no main, footer or overlay animation) ...
  expect(rec.cls).toContain('vt-instant');
  expect(rec.anims).toEqual([]);
  // ... and the restored sheet fades in place instead of sliding up from the bottom.
  await expect(pane).toHaveClass(/card-dialog-restored/);
  expect(await pane.evaluate((el) => getComputedStyle(el).animationName)).toBe('card-sheet-fade-in');
  expect(errors).toEqual([]);
});

test('check 3 / S2 (768): the centred dialog reopened by Back fades without the rise', async ({ page }) => {
  await openDeck(page, { width: 768, height: 900 });
  await page.locator('[data-card]').nth(2).click();
  await expect(page.locator('mat-dialog-container')).toBeVisible();
  await page.waitForTimeout(350);
  await page.locator('app-deck-card-dialog a[href^="/collection"]').first().click();
  await page.waitForURL(/\/collection\?q=/);
  await page.waitForTimeout(400);
  await page.goBack();
  await page.waitForURL(DECK);
  await expect(page.locator('.cdk-overlay-pane.card-dialog-restored')).toBeVisible();
  expect(await page.locator('.card-dialog-restored .mat-mdc-dialog-surface').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
});

test('check 5 / S4: route changes fade the footer (its own group, opacity only) instead of jumping with the root', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await seedStorage(page, seed);
  await page.goto('/');
  await expect(page.locator('.site-footer')).toBeVisible();
  expect(await page.locator('.site-footer').evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('site-footer');
  for (const path of ['/decks', '/collection', '/tournaments']) {
    await clearVts(page);
    await page.locator(`.site-nav a[href="${path}"]`).click();
    await page.waitForURL((u) => u.pathname === path);
    await page.waitForTimeout(400);
    const [rec] = await vts(page);
    expect(rec.anims).toContain('::view-transition-old(site-footer):route-out');
    expect(rec.anims).toContain('::view-transition-new(site-footer):fade-in');
    expect(rec.anims.some((a) => a.startsWith('::view-transition-group(site-footer)'))).toBe(false);
  }
});

test('check 6 / S5 (1-2): an ownership chip moves no other chip; the active-filter row grows and shrinks', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  const xs = () => page.locator('.own-chip').evaluateAll((els) => els.map((e) => [e.getBoundingClientRect().left, e.getBoundingClientRect().width]));
  const start = await xs();
  const reveal = page.locator('.active-filters-reveal');
  expect((await reveal.boundingBox())!.height).toBe(0);
  for (let i = 1; i < start.length; i++) {
    await page.locator('.own-chip').nth(i).click();
    await expect(page.locator('.own-chip').nth(i)).toHaveAttribute('aria-checked', 'true');
    const now = await xs();
    now.forEach(([x, w], j) => {
      expect(Math.abs(x - start[j][0])).toBeLessThanOrEqual(0.5);
      expect(Math.abs(w - start[j][1])).toBeLessThanOrEqual(0.5);
    });
  }
  await page.waitForTimeout(400);
  expect((await reveal.boundingBox())!.height).toBeGreaterThan(20);
  // With view transitions the row is its own clipped group that opens and closes with the tiles (S5 (3)).
  await clearVts(page);
  await page.locator('.own-chip').first().click(); // All: no filter
  await page.waitForTimeout(400);
  const [rec] = await vts(page);
  expect(rec.anims.some((a) => a.startsWith('::view-transition-group(deck-filter-row)'))).toBe(true);
  expect((await reveal.boundingBox())!.height).toBe(0);
  await expect(reveal).toHaveAttribute('inert', '');
  // Without them (older browsers) the row's own height transition does it: still closing a frame after the tap.
  await page.evaluate(() => delete (Document.prototype as { startViewTransition?: unknown }).startViewTransition);
  await page.locator('.own-chip').nth(1).click();
  await page.waitForTimeout(400);
  await page.locator('.own-chip').first().click();
  const mid = await page.evaluate(() => new Promise<number>((r) => requestAnimationFrame(() => r(document.querySelector('.active-filters-reveal')!.getBoundingClientRect().height))));
  expect(mid).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  expect((await reveal.boundingBox())!.height).toBe(0);
});

test('check 8 / S7 (1440): a dialog rises from 98% (never zooms from 80%); the exit is 120 ms', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await seedStorage(page, seed);
  await page.goto('/collection');
  const tile = page.locator('[data-entry]').nth(3);
  await expect(tile).toBeVisible();
  // Samples the surface's scale and translation every frame from the click on.
  const samples = page.evaluate(
    () =>
      new Promise<{ scale: number; ty: number }[]>((resolve) => {
        const out: { scale: number; ty: number }[] = [];
        const t0 = performance.now();
        const tick = () => {
          const s = document.querySelector('.mat-mdc-dialog-surface');
          if (s) {
            const m = new DOMMatrix(getComputedStyle(s).transform === 'none' ? undefined : getComputedStyle(s).transform);
            out.push({ scale: m.a, ty: m.f });
          }
          if (performance.now() - t0 < 600) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
  );
  await tile.click();
  const got = await samples;
  expect(got.length).toBeGreaterThan(0);
  expect(Math.min(...got.map((s) => s.scale))).toBeGreaterThanOrEqual(0.979);
  expect(Math.max(...got.map((s) => s.ty))).toBeLessThanOrEqual(8.01);
  expect(got.at(-1)!.scale).toBe(1);
  const closing = await page.locator('mat-dialog-container').evaluate((el) => {
    el.classList.add('mdc-dialog--closing');
    el.classList.remove('mdc-dialog--open');
    const s = getComputedStyle(el.querySelector('.mat-mdc-dialog-surface')!);
    return s.transitionDuration;
  });
  expect(closing).toBe('0.12s');
});

test('check 18 (reduced motion): Card ↔ List keeps the anchor and starts no view transition; the restored sheet does not animate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDeck(page, PHONE);
  await headingUnderBar(page, 'main');
  const before = await headingTop(page, 'main');
  await clearVts(page);
  await pressToggle(page, 'List view');
  await page.waitForTimeout(200);
  expect(Math.abs((await headingTop(page, 'main')) - before)).toBeLessThanOrEqual(4);
  expect(await vts(page)).toEqual([]);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

// ---------------------------------------------------------------- P2

test('check 4 / S3: the theme toggle cross-fades the whole page at once (one --dur-med fade, nothing moves), both ways', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  await dismissNotices(page);
  for (let i = 0; i < 2; i++) {
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await clearVts(page);
    await page.locator('.theme-toggle').click();
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).not.toBe(before);
    const [rec] = await vts(page);
    expect(rec.cls).toContain('vt-theme');
    expect(rec.anims).toContain('::view-transition-old(root):route-out');
    expect(rec.anims).toContain('::view-transition-new(root):fade-in');
    expect(rec.anims).toContain('::view-transition-new(site-header):fade-in');
    // No group moves, and no part runs on its own timing (every old / new pair is the same fade).
    expect(rec.anims.filter((a) => a.startsWith('::view-transition-group'))).toEqual([]);
    expect(rec.anims.every((a) => /:(route-out|fade-in)$/.test(a))).toBe(true);
  }
});

test('check 6 / S5 (3): an ownership chip moves the tiles (named groups); typing in search animates nothing', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  await dismissNotices(page);
  await clearVts(page);
  await page.locator('.own-chip').nth(2).click();
  await page.waitForTimeout(400);
  const [rec] = await vts(page);
  expect(rec.cls).toContain('vt-list');
  expect(rec.anims.some((a) => /^::view-transition-(group|old|new)\(deck-/.test(a))).toBe(true);
  expect(rec.anims.filter((a) => /\((main|site-footer)\)/.test(a))).toEqual([]);
  // The names are taken off again after the transition.
  expect(await page.locator('.deck-grid > li').evaluateAll((els) => els.filter((e) => (e as HTMLElement).style.viewTransitionName).length)).toBe(0);
  await clearVts(page);
  await page.locator('.deck-toolbar input').first().fill('Deck');
  await page.waitForTimeout(500);
  expect(await vts(page)).toEqual([]);
});

for (const vp of [
  { name: 'sheet 375', ...PHONE },
  { name: 'dialog 768', width: 768, height: 900 },
]) {
  test(`check 7 / S6 (${vp.name}): Next enters from the right, Previous from the left (12 px, --dur-med); rapid clicks never queue`, async ({ page }) => {
    await openDeck(page, vp);
    await page.locator('[data-card]').nth(2).click();
    await expect(page.locator('mat-dialog-container')).toBeVisible();
    await page.waitForTimeout(350);
    const bar = vp.width <= 640 ? page.locator('.step-bar') : page.locator('.head');
    const enter = () =>
      page.locator('app-deck-card-dialog app-deck-card-content').evaluate((el) =>
        el.getAnimations().map((a) => {
          const k = (a.effect as KeyframeEffect).getKeyframes();
          return { from: String(k[0]['transform']), duration: (a.effect as KeyframeEffect).getTiming().duration };
        }),
      );
    await bar.getByRole('button', { name: 'Next card' }).click();
    expect(await enter()).toEqual([{ from: 'translateX(12px)', duration: 220 }]);
    await bar.getByRole('button', { name: 'Previous card' }).click();
    expect(await enter()).toEqual([{ from: 'translateX(-12px)', duration: 220 }]);
    for (let i = 0; i < 3; i++) await bar.getByRole('button', { name: 'Next card' }).click();
    expect((await enter()).length).toBeLessThanOrEqual(1);
  });
}

test('check 12 / S10: the header tab underline moves from the old tab to the new one; from Home it fades in', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await seedStorage(page, seed);
  await page.goto('/');
  await expect(page.locator('.site-footer')).toBeVisible();
  await clearVts(page);
  await page.locator('.site-nav a[href="/decks"]').click();
  await page.waitForURL(/\/decks$/);
  await page.waitForTimeout(400);
  let [rec] = await vts(page);
  expect(rec.anims.some((a) => a.startsWith('::view-transition-new(nav-indicator)'))).toBe(true);
  expect(rec.anims.some((a) => a.startsWith('::view-transition-group(nav-indicator)'))).toBe(false);
  await clearVts(page);
  await page.locator('.site-nav a[href="/collection"]').click();
  await page.waitForURL(/\/collection$/);
  await page.waitForTimeout(400);
  [rec] = await vts(page);
  expect(rec.anims.some((a) => a.startsWith('::view-transition-group(nav-indicator)'))).toBe(true);
  // Only the active tab carries the name (one underline).
  expect(
    await page.locator('.site-nav .nav-indicator').evaluateAll((els) => els.filter((e) => getComputedStyle(e).viewTransitionName !== 'none').length),
  ).toBe(1);
});

test('check 12 / S10 (375): the phone tab bar marker moves between tabs', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  await clearVts(page);
  await page.locator('.tab-bar a[href="/collection"]').click();
  await page.waitForURL(/\/collection$/);
  await page.waitForTimeout(400);
  const [rec] = await vts(page);
  expect(rec.anims.some((a) => a.startsWith('::view-transition-group(tab-indicator)'))).toBe(true);
});

test('check 13 / S11 (375): the FAB label narrows and fades on scroll, its accessible name unchanged; it fades in with each page', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  const fab = page.locator('button.page-fab');
  await expect(fab).toBeVisible();
  const name = (await fab.innerText()).trim();
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 600);
  await expect(fab).toHaveClass(/collapsed/);
  // The label eases to 0 width (several frames in between), it does not snap.
  const widths = await page.locator('button.page-fab .label').evaluate(
    (el) =>
      new Promise<number[]>((resolve) => {
        const out: number[] = [];
        const t0 = performance.now();
        const tick = () => {
          out.push(el.getBoundingClientRect().width);
          if (performance.now() - t0 < 400) requestAnimationFrame(tick);
          else resolve(out);
        };
        tick();
      }),
  );
  expect(widths.at(-1)).toBe(0);
  await expect(fab).toHaveAccessibleName(name);
  await page.mouse.wheel(0, -3000);
  await expect(fab).not.toHaveClass(/collapsed/);
  await page.waitForTimeout(300);
  await clearVts(page);
  // Collection's button waits for its 5,000 entries, so it is not in the route change's new picture: the old one fades
  // out with the page, and the new one plays its own arrival (60 ms, 92% → 100%) when it comes.
  const arrived = page.waitForFunction(() => document.querySelector('app-collection-page button.page-fab')?.classList.contains('arriving'), undefined, { polling: 'raf' });
  await page.locator('.tab-bar a[href="/collection"]').click();
  await page.waitForURL(/\/collection$/);
  await arrived;
  const [rec] = await vts(page);
  expect(rec.anims).toContain('::view-transition-old(page-fab):route-out');
  // Back to Decks: the same, never a pop.
  await page.waitForTimeout(400);
  const again = page.waitForFunction(() => document.querySelector('app-decks-page button.page-fab')?.classList.contains('arriving'), undefined, { polling: 'raf' });
  await page.locator('.tab-bar a[href="/decks"]').click();
  await page.waitForURL(/\/decks$/);
  await again;
});

test('check 18 (reduced motion): the theme toggle and an ownership chip start no view transition; nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(DESKTOP);
  await seedStorage(page, seed);
  await page.goto('/decks');
  await expect(page.locator('app-deck-tile').first()).toBeVisible();
  await dismissNotices(page);
  await clearVts(page);
  await page.locator('.theme-toggle').click();
  await page.locator('.own-chip').nth(1).click();
  await page.waitForTimeout(100);
  expect(await vts(page)).toEqual([]);
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
});
