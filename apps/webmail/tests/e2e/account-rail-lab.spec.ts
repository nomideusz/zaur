import { test, expect, type Locator } from '@playwright/test';

// Header account rail via /account-rail-lab. Covers the two things the old
// switcher got wrong: every avatar switches (the active one is a marker, not a
// hidden menu trigger), and the active account's badge is live rather than
// waiting on the unread poll.

const LAB = '/account-rail-lab';

function rail(page: import('@playwright/test').Page, index = 0): Locator {
	return page.locator('.lab__bar').nth(index).locator('.z-account-rail');
}

test.beforeEach(async ({ page }) => {
	await page.goto(LAB);
	await expect(rail(page).locator('.z-account-rail__avatar').first()).toBeVisible();
});

test('every avatar is a switcher except the active marker', async ({ page }) => {
	const el = rail(page);
	// 3 accounts by default: one marker + two switchers.
	await expect(el.locator('.z-account-rail__avatar--active')).toHaveCount(1);
	await expect(el.locator('button.z-account-rail__avatar')).toHaveCount(2);
});

test('the active avatar is not a menu trigger', async ({ page }) => {
	const active = rail(page).locator('.z-account-rail__avatar--active');
	await expect(active).toHaveAttribute('aria-current', 'true');
	// It must not be a button — that ambiguity is what made it confusing.
	await expect(active).toHaveJSProperty('tagName', 'SPAN');
});

test('tapping another avatar switches the active account', async ({ page }) => {
	const el = rail(page);
	await expect(el.locator('.z-account-rail__avatar--active')).toContainText('A');

	await el.locator('button.z-account-rail__avatar').first().click();

	// Grace is now the marker and Ada became a switcher.
	await expect(el.locator('.z-account-rail__avatar--active')).toContainText('G');
	await expect(el.locator('button.z-account-rail__avatar').first()).toContainText('A');
});

test('active badge updates live without waiting for the poll', async ({ page }) => {
	const badge = rail(page).locator('.z-account-rail__avatar--active .z-account-rail__badge');
	await expect(badge).toHaveText('4');

	await page.getByTestId('live-dec').click();
	await expect(badge).toHaveText('3');
	await page.getByTestId('live-dec').click();
	await expect(badge).toHaveText('2');
});

test('badge disappears at zero and reappears above it', async ({ page }) => {
	const badge = rail(page).locator('.z-account-rail__avatar--active .z-account-rail__badge');
	for (let i = 0; i < 4; i++) await page.getByTestId('live-dec').click();
	await expect(badge).toHaveCount(0);

	await page.getByTestId('live-inc').click();
	await expect(badge).toHaveText('1');
});

test('overflow collapses extra accounts into a +N hint', async ({ page }) => {
	await page.getByTestId('count-6').click();

	// Phone rail caps at 3: 2 avatars + "+4".
	const el = rail(page);
	await expect(el.locator('.z-account-rail__avatar')).toHaveCount(2);
	await expect(el.locator('.z-account-rail__overflow')).toHaveText('+4');

	// Desktop caps at 5: 4 avatars + "+2".
	const wide = rail(page, 1);
	await expect(wide.locator('.z-account-rail__avatar')).toHaveCount(4);
	await expect(wide.locator('.z-account-rail__overflow')).toHaveText('+2');
});

	test('menu opener is a control, not another avatar', async ({ page }) => {
	const el = rail(page);
	// UserMenu renders Ark's Menu.Trigger directly, so match on the icon-button
	// class rather than the wrapper's data-slot.
	const trigger = el.locator('.z-chrome-icon-btn');
	await expect(trigger).toHaveCount(1);
	await expect(trigger).toHaveAttribute('aria-label', /Account menu/);
	// It carries no avatar glyph, so it cannot be mistaken for a switcher.
	await expect(trigger).not.toHaveClass(/z-account-rail__avatar/);
});

test('menu lists the other accounts and sign out', async ({ page }) => {
	await rail(page).locator('.z-chrome-icon-btn').click();
	const content = page.locator('[data-scope="menu"][data-part="content"]');
	await expect(content).toBeVisible();
	await expect(content.getByText('grace@zaur.app')).toBeVisible();
	await expect(content.getByText('Add account')).toBeVisible();
	await expect(content.getByText('Sign out')).toBeVisible();
});
