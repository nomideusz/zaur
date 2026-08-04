import { test, expect } from '@playwright/test';

// Mobile message-list rows via /list-lab: two fixed lines (sender / truncated
// subject), date on line 1 right, icons on line 2 right. Selectable lists
// reserve a left checkbox gutter so bulk-select never reflows row content.

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
	/* Right rail hugs the trailing edge (gutter + padding leave ~1–2rem slack). */
	expect(time.x + time.width).toBeGreaterThan(rowBox.x + rowBox.width - 40);
	expect(icons.x + icons.width).toBeGreaterThan(rowBox.x + rowBox.width - 40);
	expect(subject.x + subject.width).toBeLessThanOrEqual(icons.x + 1);
});

test('checkbox gutter is reserved before select and keeps row geometry stable', async ({
	page
}) => {
	await page.goto('/list-lab');
	const row = page.locator('.z-mail-list-row').first();
	await expect(row).toBeVisible();

	const gutter = row.locator('.z-mail-list-checkbox-col');
	await expect(gutter).toBeVisible();
	const senderBefore = await box(row.locator('.list-sender'));
	const before = await box(row);

	await page.getByTestId('toggle-select').click();
	await expect(page.locator('.z-mail-list--selecting')).toHaveCount(1);

	const after = await box(row);
	expect(after.height).toBe(before.height);

	const senderAfter = await box(row.locator('.list-sender'));
	/* Reserved gutter — sender must not jump when selection starts. */
	expect(Math.abs(senderAfter.x - senderBefore.x)).toBeLessThan(2);

	const cb = await box(gutter);
	expect(cb.x).toBeLessThan(senderAfter.x);

	await page.getByTestId('toggle-select').click();
	await expect(page.locator('.z-mail-list--selecting')).toHaveCount(0);
	await expect(gutter).toBeVisible();
});

test('list cursor attribute moves without changing row height', async ({ page }) => {
	await page.goto('/list-lab');
	/* List is newest-first after collapse — fixture m5 is first, then m4… */
	const first = page.locator('.z-mail-list-row').first();
	await expect(first).toBeVisible();
	await expect(first).toHaveAttribute('data-cursor', 'true');
	await expect(page.getByTestId('cursor-id')).toHaveText('m5');

	const before = await box(first);
	await page.getByTestId('cursor-next').click();
	await expect(page.getByTestId('cursor-id')).toHaveText('m4');
	await expect(page.locator('.z-mail-list-row[data-message-id="m4"]')).toHaveAttribute(
		'data-cursor',
		'true'
	);
	await expect(first).not.toHaveAttribute('data-cursor', 'true');

	const after = await box(page.locator('.z-mail-list-row[data-message-id="m4"]'));
	expect(after.height).toBe(before.height);
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
	await page.waitForTimeout(500); // > 350ms long-press threshold
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

test('staged swipe exposes arm levels on the row shell', async ({ page }) => {
	await page.goto('/list-lab');
	const row = page.locator('.z-mail-list-row').first();
	const foreground = row.locator('.z-swipe-row__foreground');
	await expect(foreground).toBeVisible();
	const b = await box(foreground);
	const swipe = row.locator('.z-swipe-row');

	await foreground.dispatchEvent('pointerdown', {
		pointerType: 'touch',
		pointerId: 2,
		isPrimary: true,
		clientX: b.x + b.width * 0.7,
		clientY: b.y + b.height / 2,
		button: 0
	});
	/* Horizontal lock + short arm (~88px on a ~360px row). */
	await foreground.dispatchEvent('pointermove', {
		pointerType: 'touch',
		pointerId: 2,
		isPrimary: true,
		clientX: b.x + b.width * 0.7 + 100,
		clientY: b.y + b.height / 2,
		button: 0
	});
	await expect(swipe).toHaveAttribute('data-arm-level', '1');

	await foreground.dispatchEvent('pointermove', {
		pointerType: 'touch',
		pointerId: 2,
		isPrimary: true,
		clientX: b.x + b.width * 0.7 + 200,
		clientY: b.y + b.height / 2,
		button: 0
	});
	/* Without an archive mailbox in the lab, deep tier may still be Highlight
	   (tier 2) when canMarkImportant — or stay at 1 if only Seen applies. */
	const arm = await swipe.getAttribute('data-arm-level');
	expect(arm === '1' || arm === '2').toBeTruthy();

	await foreground.dispatchEvent('pointerup', {
		pointerType: 'touch',
		pointerId: 2,
		isPrimary: true,
		clientX: b.x + b.width * 0.7 + 200,
		clientY: b.y + b.height / 2,
		button: 0
	});
});
