/**
 * H-679 (RJ, 2026-11-26): signed out, Load test data fills Collection and Decks from memory only. In a real browser:
 * nothing reaches localStorage or IndexedDB, the cards show, and a reload brings back the empty signed-out page.
 */
import { expect, test } from '@playwright/test';
import { blockFirebase } from './fixtures';

/** Every app record key (the theme lives under `device-theme`, outside `rift.*`). */
const riftStorage = () => Object.keys(localStorage).filter((k) => k.startsWith('rift.'));

test('H-679 guest test data: load signed out, see cards and decks, nothing stored, gone after a reload', async ({
  page,
  context,
}) => {
  await blockFirebase(context);
  await page.goto('/collection');
  const panel = page.locator('app-sign-in-panel');
  await expect(panel.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await panel.getByRole('button', { name: 'Load test data' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Nothing is saved');
  await dialog.getByLabel(/Small/).check();
  await dialog.getByRole('button', { name: 'Load' }).click();

  await expect(page.locator('app-collection-tile').first()).toBeVisible();
  await expect(page.locator('#count-line')).toContainText('of 50 cards');
  await expect(page.locator('.banner--test')).toContainText("You're trying Rift Builder with test data.");
  await expect(page.getByRole('button', { name: 'Add to your collection' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Decks' }).first().click();
  await expect(page.locator('app-deck-tile')).toHaveCount(3);
  await expect(page.getByText('Card data not loaded')).toHaveCount(0);

  expect(await page.evaluate(riftStorage)).toEqual([]);
  expect(await page.evaluate(async () => (await indexedDB.databases?.())?.map((d) => d.name) ?? [])).toEqual([]);

  await page.reload();
  await expect(page.locator('app-sign-in-panel').getByRole('button', { name: 'Load test data' })).toBeVisible();
  await expect(page.locator('app-deck-tile')).toHaveCount(0);
  await page.goto('/collection');
  await expect(page.locator('app-collection-tile')).toHaveCount(0);
  await expect(page.locator('app-sign-in-panel')).toBeVisible();
});
