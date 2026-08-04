import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('fullscreen reader sits below top bar with a single subject', async ({ page }) => {
	await page.goto('/mobile-chrome-lab');

	const topbar = page.getByTestId('mobile-topbar');
	const reader = page.getByTestId('fullscreen-reader');
	const subject = page.getByTestId('reader-subject');
	const from = page.getByTestId('reader-from');

	await expect(topbar).toBeVisible();
	await expect(reader).toBeVisible();
	await expect(subject).toBeVisible();
	await expect(from).toBeVisible();

	// Top bar must not repeat the subject.
	await expect(topbar.getByText(/Quarterly planning/)).toHaveCount(0);

	const topbarBox = await topbar.boundingBox();
	const fromBox = await from.boundingBox();
	const subjectBox = await subject.boundingBox();
	expect(topbarBox).toBeTruthy();
	expect(fromBox).toBeTruthy();
	expect(subjectBox).toBeTruthy();

	// Reader chrome starts below the sticky top bar — no overlap.
	expect(fromBox!.y).toBeGreaterThanOrEqual(topbarBox!.y + topbarBox!.height - 1);

	// Subject is the sole title surface and is not single-line truncated away.
	const subjectText = await subject.innerText();
	expect(subjectText.length).toBeGreaterThan(40);
	expect(subjectBox!.height).toBeGreaterThan(20);
});

test('top bar exposes a back control without a chrome title', async ({ page }) => {
	await page.goto('/mobile-chrome-lab');
	await expect(page.getByRole('link', { name: 'Back to list' })).toBeVisible();
	await expect(page.getByTestId('mobile-topbar').locator('.truncate')).toHaveCount(0);
});

test('short landscape viewport still clears the top bar', async ({ page }) => {
	await page.setViewportSize({ width: 740, height: 360 });
	await page.goto('/mobile-chrome-lab');

	const topbar = page.getByTestId('mobile-topbar');
	const from = page.getByTestId('reader-from');
	const subject = page.getByTestId('reader-subject');
	await expect(from).toBeVisible();
	await expect(subject).toBeVisible();

	const topbarBox = await topbar.boundingBox();
	const fromBox = await from.boundingBox();
	expect(topbarBox).toBeTruthy();
	expect(fromBox).toBeTruthy();
	expect(fromBox!.y).toBeGreaterThanOrEqual(topbarBox!.y + topbarBox!.height - 1);

	/* Usable reading band remains between top bar and viewport bottom. */
	const readingBand = 360 - (topbarBox!.y + topbarBox!.height);
	expect(readingBand).toBeGreaterThan(200);
});
