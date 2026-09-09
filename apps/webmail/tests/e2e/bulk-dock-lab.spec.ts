import { test, expect, type Locator, type Page } from '@playwright/test';

// Phone bulk-select dock via /bulk-dock-lab. The lab pins the phone layout on
// inside a 390px frame, so these run at a desktop viewport — that override is
// what makes the dock reviewable without a device or devtools.

const LAB = '/bulk-dock-lab';

async function dock(page: Page): Promise<Locator> {
	const el = page.locator('.z-bulk-dock__phone');
	await expect(el).toBeVisible();
	return el;
}

test.beforeEach(async ({ page }) => {
	await page.goto(LAB);
	await expect(page.locator('.z-mail-list-row').first()).toBeVisible();
});

test('dock stays closed until select mode or a selection', async ({ page }) => {
	await expect(page.locator('.z-bulk-dock__phone')).toHaveCount(0);
	await expect(page.getByTestId('status')).toContainText('dock=closed');
});

test('select mode opens the dock with nothing checked', async ({ page }) => {
	await page.getByTestId('enter-select-mode').click();

	const el = await dock(page);
	await expect(el.getByText('Select messages')).toBeVisible();
	await expect(page.getByTestId('status')).toContainText('selected=0');
	await expect(page.getByTestId('status')).toContainText('dock=open');

	// Nothing to act on yet — the mark actions only appear once something is
	// selected, and the rest are disabled rather than silently no-op.
	await expect(el.locator('.z-bulk-dock__action--danger')).toBeDisabled();
	await expect(el.getByRole('button', { name: 'Select all' })).toBeEnabled();
});

test('select all reveals every action and the count', async ({ page }) => {
	await page.getByTestId('enter-select-mode').click();
	await page.getByTestId('select-all').click();

	const el = await dock(page);
	await expect(page.getByTestId('status')).toContainText('selected=5');

	// Fixture mixes read/unread and highlighted/not, so all four mark actions show.
	// Exact names: "Read" is a substring of "Unread" and vice versa for the rest.
	for (const label of ['Unread', 'Read', 'Highlight', 'Unhighlight', 'Spam', 'Trash']) {
		await expect(el.getByRole('button', { name: label, exact: true })).toBeVisible();
	}
	// The overflow trigger carries a descriptive aria-label, not its "More" text.
	await expect(
		el.getByRole('button', { name: 'More actions for selected messages' })
	).toBeVisible();
	await expect(el.locator('.z-bulk-dock__action--danger')).toBeEnabled();
});

test('dock height stays two rows regardless of action count', async ({ page }) => {
	await page.getByTestId('enter-select-mode').click();
	await page.getByTestId('select-all').click();

	const box = await (await dock(page)).boundingBox();
	if (!box) throw new Error('dock not measurable');
	// Header (~44px) + action row (~52px) + paddings. The old pill wrapped to
	// three lines at this width and blew past this.
	expect(box.height).toBeLessThan(150);
});

test('action row scrolls instead of wrapping', async ({ page }) => {
	await page.getByTestId('enter-select-mode').click();
	await page.getByTestId('select-all').click();

	const row = page.locator('.z-bulk-dock__actions');
	const metrics = await row.evaluate((el) => ({
		scrollWidth: el.scrollWidth,
		clientWidth: el.clientWidth
	}));
	// 7 buttons at min-width 4rem exceed the frame: overflow is scrolled, not wrapped.
	expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
});

test('trash folder swaps the destructive label to Delete', async ({ page }) => {
	await page.getByTestId('folder-trash').click();
	await page.getByTestId('enter-select-mode').click();
	await page.getByTestId('select-all').click();

	const el = await dock(page);
	await expect(el.locator('.z-bulk-dock__action--danger')).toContainText('Delete');
	// Spam is not offered from inside Spam/Trash.
	await expect(el.getByRole('button', { name: 'Spam', exact: true })).toHaveCount(0);
});

test('spam folder offers Not spam instead of Mark spam', async ({ page }) => {
	await page.getByTestId('folder-junk').click();
	await page.getByTestId('enter-select-mode').click();
	await page.getByTestId('select-all').click();

	const el = await dock(page);
	await expect(el.getByRole('button', { name: 'Not spam', exact: true })).toBeVisible();
	await expect(el.getByRole('button', { name: 'Spam', exact: true })).toHaveCount(0);
});

test('clear all keeps the dock open, exit closes it', async ({ page }) => {
	await page.getByTestId('enter-select-mode').click();
	await page.getByTestId('select-all').click();
	await page.getByTestId('clear-all').click();

	// Clearing must not tear down the dock — the user is still picking rows.
	await expect(page.locator('.z-bulk-dock__phone')).toBeVisible();
	await expect(page.getByTestId('status')).toContainText('selected=0');

	await page.getByTestId('exit-select-mode').click();
	await expect(page.locator('.z-bulk-dock__phone')).toHaveCount(0);
});

test('desktop pill is hidden while the phone layout is forced', async ({ page }) => {
	await page.getByTestId('enter-select-mode').click();
	await expect(page.locator('.z-bulk-dock__inline')).toBeHidden();
});
