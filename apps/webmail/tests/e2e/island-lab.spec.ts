import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('top bar shows mail filters and account rail; island is compose-only', async ({ page }) => {
	await page.goto('/island-lab');
	await expect(page.getByTestId('mobile-topbar')).toBeVisible();
	await expect(page.getByTestId('account-rail')).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Mail views' })).toBeVisible();
	await expect(page.getByTestId('island-compose')).toBeVisible();
	await expect(page.getByTestId('island-compose').getByText('Compose')).toBeVisible();
});

test('inline rail shows avatars for two accounts and switches on tap', async ({ page }) => {
	await page.goto('/island-lab');
	await expect(page.getByTestId('account-rail')).toBeVisible();
	await expect(page.getByTestId('account-rail-avatar')).toHaveCount(2);
	await expect(page.getByTestId('active-key')).toHaveText('active:a');

	await page.locator('[data-testid="account-rail-avatar"][data-account-key="b"]').click();
	await expect(page.getByTestId('active-key')).toHaveText('active:b');
});

test('four accounts use overflow control that opens the switcher sheet', async ({ page }) => {
	await page.goto('/island-lab');
	await page.getByTestId('account-count').selectOption('4');
	await expect(page.getByTestId('account-rail-overflow')).toBeVisible();
	await expect(page.getByTestId('account-rail')).toHaveCount(0);

	await page.getByTestId('account-rail-overflow').click();
	await expect(page.getByText('Tap an account to switch')).toBeVisible();
	await page.getByRole('button', { name: /Cy/ }).click();
	await expect(page.getByTestId('active-key')).toHaveText('active:c');
});

test('single account hides the rail', async ({ page }) => {
	await page.goto('/island-lab');
	await page.getByTestId('account-count').selectOption('1');
	await expect(page.getByTestId('account-rail')).toHaveCount(0);
	await expect(page.getByTestId('account-rail-overflow')).toHaveCount(0);
});
