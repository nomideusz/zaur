import { test, expect } from '@playwright/test';

// Exercises SettingsSearch (Ark combobox + Highlight) via /settings-search-lab.
// Auth-independent: the registry always merges the static settings index.

type Page = import('@playwright/test').Page;
const input = (page: Page) => page.getByPlaceholder('Search settings…');

test('typing filters results and highlights the matched substring', async ({ page }) => {
	await page.goto('/settings-search-lab');
	await input(page).click();
	await input(page).pressSequentially('account');

	// Results dropdown (portaled to body) opens with at least one item.
	await expect(page.getByRole('option').first()).toBeVisible();

	// The matched substring is wrapped in an Ark <Highlight> mark.
	const mark = page.locator('mark.z-search-mark').first();
	await expect(mark).toBeVisible();
	await expect(mark).toHaveText(/account/i);
});

test('clearing the query empties the results', async ({ page }) => {
	await page.goto('/settings-search-lab');
	await input(page).click();
	await input(page).pressSequentially('account');
	await expect(page.getByRole('option').first()).toBeVisible();

	// filtered() returns [] for an empty query, so the result list (and its marks) clears.
	await input(page).press('ControlOrMeta+a');
	await input(page).press('Delete');
	await expect(page.getByRole('option')).toHaveCount(0);
	await expect(page.locator('mark.z-search-mark')).toHaveCount(0);
});
