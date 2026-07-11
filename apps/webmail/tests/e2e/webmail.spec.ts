import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_MAIL_EMAIL;
const password = process.env.E2E_MAIL_PASSWORD;

test.skip(!email || !password, 'Set E2E_MAIL_EMAIL and E2E_MAIL_PASSWORD in .env.e2e.local');

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill(email!);
	await page.locator('#password').fill(password!);
	const submit = page.getByRole('button', { name: 'Sign in' });
	await expect(submit).toBeEnabled();
	await submit.click();
	// The inbox lives at the root URL; just assert we left the login page.
	await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 });
	await expect(page.getByRole('link', { name: /Inbox/i })).toBeVisible({ timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('zaur:enable-undo-send', 'false');
	});
});

test('signs in with the dedicated Stalwart test mailbox', { tag: '@auth' }, async ({ page }) => {
	await signIn(page);
	await expect(page.getByRole('link', { name: /Inbox/i })).toBeVisible();
});

test('sends a message to itself and finds it through search', { tag: '@auth' }, async ({ page }) => {
	await signIn(page);
	const subject = `E2E self-send ${Date.now()}`;

	await page.goto('/mail/compose');
	await expect(page.getByRole('heading', { name: 'New message' })).toBeVisible();
	await page.getByPlaceholder('recipient@example.com').fill(email!);
	await page.getByPlaceholder('Subject').fill(subject);
	await page.getByPlaceholder('Write your message…').fill(`Smoke test body for ${subject}`);
	await page.getByRole('button', { name: 'Send' }).click();
	await expect(page).toHaveURL(/\/mail\/sent/, { timeout: 30_000 });

	await page.goto(`/mail/search?q=${encodeURIComponent(subject)}`);
	await expect(page.getByTitle(new RegExp(subject)).first()).toBeVisible({ timeout: 30_000 });
});

test('adds and searches a local contact', { tag: '@auth' }, async ({ page }) => {
	await signIn(page);
	const contactEmail = `contact-${Date.now()}@example.com`;
	const contactName = 'E2E Contact';

	await page.goto('/contacts');
	await page.getByRole('button', { name: 'Add contact' }).click();
	await page.getByPlaceholder('Jane Doe').fill(contactName);
	await page.getByPlaceholder('jane@example.com').fill(contactEmail);
	await page.getByRole('button', { name: 'Save contact' }).click();

	await page.getByPlaceholder('Search contacts…').fill(contactEmail);
	await expect(page.getByRole('button', { name: new RegExp(contactName) })).toBeVisible();
});

test('inbox list uses scroll area with load-more footer', { tag: '@auth' }, async ({ page }) => {
	await signIn(page);
	await page.goto('/mail/inbox');
	await expect(page.locator('.z-scroll-area')).toBeVisible({ timeout: 30_000 });

	const loadMore = page.locator('.z-mail-list-load-more');
	if (await loadMore.isVisible().catch(() => false)) {
		await expect(loadMore.getByRole('button', { name: 'Load more' })).toBeVisible();
	}
});

test('opens calendar or explains missing calendar support', { tag: '@auth' }, async ({ page }) => {
	await signIn(page);
	await page.goto('/calendar');

	const unavailable = page.getByRole('heading', { name: 'Calendar unavailable' });
	if (await unavailable.isVisible().catch(() => false)) {
		await expect(unavailable).toBeVisible();
		return;
	}

	await expect(page.getByRole('button', { name: 'New event' }).first()).toBeVisible();
});

test('opens the branded account security center', { tag: '@auth' }, async ({ page }) => {
	await signIn(page);
	await page.goto('/settings/security');
	await expect(page.getByText('Confirm your identity', { exact: true })).toBeVisible();
	await expect(page.getByText('Two-factor authentication', { exact: true })).toBeVisible();
	await expect(page.getByText('App passwords', { exact: true })).toBeVisible();
	await expect(page.getByText('ZAUR sessions', { exact: true })).toBeVisible();
	await expect(page.getByText('Advanced · API keys', { exact: true })).toBeVisible();
});
