import { test, expect } from '@playwright/test';

// Exercises the unified single-dropdown GlobalSearchCombobox via the throwaway /search-lab route.
// Auth-independent (the lab mocks a client + seeds contacts). Key guarantee: there is only ever
// ONE dropdown — quick filters, type-ahead, and the inline Advanced section share one panel.

type Page = import('@playwright/test').Page;
const shell = (page: Page) => page.locator('[data-testid="shell-search"]');
const input = (page: Page) => shell(page).locator('input#global-search');
const dropdown = (page: Page) => page.locator('#global-search-dropdown');

test('idle focus shows quick filters in one dropdown', async ({ page }) => {
	await page.goto('/search-lab');
	await input(page).focus();

	await expect(dropdown(page)).toHaveCount(1);
	await expect(dropdown(page).getByText('Quick Filters')).toBeVisible();
	await expect(dropdown(page).getByRole('button', { name: 'Has attachment' })).toBeVisible();
	// The advanced section is collapsed, reachable from the same panel — not a second dropdown.
	await expect(dropdown(page).getByRole('button', { name: 'Advanced search' })).toBeVisible();
});

test('typing swaps quick filters for search action + contacts (still one dropdown)', async ({ page }) => {
	await page.goto('/search-lab');
	await input(page).fill('zo');

	await expect(dropdown(page)).toHaveCount(1);
	await expect(dropdown(page).getByText('Quick Filters')).toHaveCount(0);
	await expect(dropdown(page).getByRole('button', { name: /Search mail for "zo"/ })).toBeVisible();
	await expect(dropdown(page).getByText('Contacts')).toBeVisible();
	await expect(dropdown(page).getByText('zoe@example.com')).toBeVisible();
});

test('Advanced expands inline within the same dropdown — never a second panel', async ({ page }) => {
	await page.goto('/search-lab');
	await input(page).focus();
	await dropdown(page).getByRole('button', { name: 'Advanced search' }).click();

	// Still exactly one dropdown element.
	await expect(dropdown(page)).toHaveCount(1);
	// Advanced fields are now in it; the quick-filter list is hidden (focused form view).
	await expect(dropdown(page).getByText('Search in')).toBeVisible();
	await expect(dropdown(page).getByPlaceholder("Recipient's name or email")).toBeVisible();
	await expect(dropdown(page).getByText('Quick Filters')).toHaveCount(0);
	await expect(dropdown(page).getByRole('button', { name: 'Search', exact: true })).toBeVisible();
});

test('keyboard: ArrowDown highlights and Enter runs a quick filter', async ({ page }) => {
	await page.goto('/search-lab');
	await input(page).focus();

	await input(page).press('ArrowDown'); // highlight first quick filter (Has attachment)
	await input(page).press('Enter');

	// Quick filter "Has attachment" sets the query to has:attachment.
	await expect(input(page)).toHaveValue('has:attachment');
});
