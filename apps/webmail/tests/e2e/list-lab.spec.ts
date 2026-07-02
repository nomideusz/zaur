import { test, expect } from '@playwright/test';

// Mobile message-list rows via /list-lab: two fixed lines (sender / truncated
// subject), date on line 1 right, icons on line 2 right, and no row-height
// change when bulk-select mode adds the left checkbox column.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function box(locator: import('@playwright/test').Locator) {
	const b = await locator.boundingBox();
	if (!b) throw new Error('not visible');
	return b;
}

test('rows are two lines with date and icons in the right rail', async ({ page }) => {
	await page.goto('/list-lab');
	const row = page.locator('.z-mail-list-row').first();
	await expect(row).toBeVisible();

	const sender = await box(row.locator('.list-sender'));
	const subject = await box(row.locator('.list-subject'));
	const time = await box(row.locator('.list-time'));
	const icons = await box(row.locator('.z-mail-list-row-icons'));
	const rowBox = await box(row);

	// Subject is a single truncated line despite the long fixture text.
	expect(subject.height).toBeLessThan(sender.height * 1.8);
	// Line 1: sender left, date right. Line 2: subject left, icons right.
	expect(Math.abs(time.y - sender.y)).toBeLessThan(sender.height);
	expect(icons.y).toBeGreaterThan(sender.y + sender.height / 2);
	expect(time.x + time.width).toBeGreaterThan(rowBox.x + rowBox.width - 24);
	expect(icons.x + icons.width).toBeGreaterThan(rowBox.x + rowBox.width - 24);
	expect(subject.x + subject.width).toBeLessThanOrEqual(icons.x + 1);
});

test('entering bulk select keeps row height and puts checkboxes on the left', async ({ page }) => {
	await page.goto('/list-lab');
	const row = page.locator('.z-mail-list-row').first();
	await expect(row).toBeVisible();
	const before = await box(row);

	await page.getByTestId('toggle-select').click();
	const checkbox = row.locator('.z-mail-list-checkbox-col');
	await expect(checkbox).toBeVisible();

	const after = await box(row);
	expect(after.height).toBe(before.height);

	// Checkbox column sits at the row's left edge, before the text.
	const cb = await box(checkbox);
	const sender = await box(row.locator('.list-sender'));
	expect(cb.x).toBeLessThan(sender.x);

	await page.getByTestId('toggle-select').click();
	await expect(checkbox).toHaveCount(0);
});

test('long press on a row starts bulk selection', async ({ page }) => {
	await page.goto('/list-lab');
	const row = page.locator('.z-mail-list-row').nth(1);
	await expect(row).toBeVisible();
	const b = await box(row);

	// Pointer handlers live on the swipe row's foreground element.
	const target = row.locator('.z-swipe-row__foreground');
	await target.dispatchEvent('pointerdown', {
		pointerType: 'touch',
		pointerId: 1,
		isPrimary: true,
		clientX: b.x + b.width / 2,
		clientY: b.y + b.height / 2,
		button: 0
	});
	await page.waitForTimeout(600); // > 420ms long-press threshold
	await target.dispatchEvent('pointerup', {
		pointerType: 'touch',
		pointerId: 1,
		isPrimary: true,
		clientX: b.x + b.width / 2,
		clientY: b.y + b.height / 2,
		button: 0
	});

	await expect(page.locator('.z-mail-list--selecting')).toHaveCount(1);
	await expect(row.locator('.z-mail-list-checkbox-col')).toBeVisible();
});
