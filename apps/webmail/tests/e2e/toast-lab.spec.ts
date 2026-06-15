import { test, expect } from '@playwright/test';

// Exercises the Ark-toast-backed ToastStack via the throwaway /toast-lab route.
// Auth-independent: covers appearance, variant data-attr, max-2 stacking, auto-dismiss,
// the Undo action callback, and dismiss-all.

type Page = import('@playwright/test').Page;
const items = (page: Page) => page.locator('.z-status-line__item');
const messages = (page: Page) => page.locator('.z-status-line__message');

test('toast appears with its message and variant', async ({ page }) => {
	await page.goto('/toast-lab');

	await page.getByTestId('fire-success').click();
	await expect(items(page)).toHaveCount(1);
	await expect(messages(page)).toContainText('Saved');
	await expect(items(page).first()).toHaveAttribute('data-variant', 'success');

	await page.getByTestId('fire-error').click();
	await expect(page.locator('.z-status-line__item[data-variant="error"]')).toBeVisible();
});

test('stacking is capped at 2 visible (max), extras queue', async ({ page }) => {
	await page.goto('/toast-lab');

	for (let i = 0; i < 4; i++) await page.getByTestId('fire-info').click();

	// max: 2 → never more than two rendered at once; the rest queue.
	await expect(items(page)).toHaveCount(2);
});

test('toast auto-dismisses after its duration', async ({ page }) => {
	await page.goto('/toast-lab');

	await page.getByTestId('fire-quick').click();
	await expect(items(page)).toHaveCount(1);

	// 800ms duration → gone shortly after (allow for Ark removeDelay exit transition).
	await expect(items(page)).toHaveCount(0, { timeout: 3000 });
});

test('Undo action runs the callback and dismisses', async ({ page }) => {
	await page.goto('/toast-lab');

	await page.getByTestId('fire-undo').click();
	const undo = page.locator('.z-status-line__action', { hasText: 'Undo' });
	await expect(undo).toBeVisible();
	await expect(page.getByTestId('undo-result')).toHaveText('idle');

	await undo.click();
	await expect(page.getByTestId('undo-result')).toHaveText('undone');
	await expect(items(page)).toHaveCount(0);
});

test('dismiss all clears every toast', async ({ page }) => {
	await page.goto('/toast-lab');

	await page.getByTestId('fire-success').click();
	await page.getByTestId('fire-error').click();
	await expect(items(page)).toHaveCount(2);

	await page.getByTestId('dismiss-all').click();
	await expect(items(page)).toHaveCount(0);
});
