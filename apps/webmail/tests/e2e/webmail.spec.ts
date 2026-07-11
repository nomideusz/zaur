import { expect, test, type Page } from '@playwright/test';

// Session comes from the auth-setup project (single sign-in, stored state).
const email = process.env.E2E_MAIL_EMAIL;

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('zaur:enable-undo-send', 'false');
	});
});

async function openMail(page: Page) {
	await page.goto('/');
	// A fresh account may still show the first-login identity dialog.
	const welcome = page.getByRole('dialog', { name: 'Welcome to your mail' });
	if (await welcome.isVisible({ timeout: 3_000 }).catch(() => false)) {
		await welcome.getByRole('button', { name: 'Skip' }).click();
	}
	await expect(page.getByRole('complementary', { name: 'Mail navigation' })).toBeVisible({
		timeout: 30_000
	});
}

test('shows the mail workspace for the signed-in account', { tag: '@auth' }, async ({ page }) => {
	await openMail(page);
	await expect(page.getByRole('navigation', { name: 'Apps' })).toBeVisible();
});

test('composes a message and enables send', { tag: '@auth' }, async ({ page }) => {
	// Deterministic compose smoke test. It stops at "Send is enabled" on purpose: actually
	// delivering would send real mail on every CI run and then race the search index — too
	// flaky and side-effecting to gate on. This covers the compose UI end to end.
	await openMail(page);
	const subject = `E2E compose ${Date.now()}`;

	await page.goto('/mail/compose');
	await expect(page.getByRole('heading', { name: 'New message' })).toBeVisible();
	// Recipient is an Ark TagsInput — a machine-controlled input that ignores fill(); type real
	// keystrokes, then Enter to commit the chip (fill() would leave the field with no recipient).
	const to = page.getByRole('textbox', { name: 'To' });
	await to.pressSequentially(email!);
	await to.press('Enter');
	// The committed chip carries a "Remove <addr>" delete control.
	await expect(page.getByRole('button', { name: `Remove ${email}` })).toBeVisible();
	await page.getByRole('textbox', { name: 'Subject' }).fill(subject);
	await page.getByRole('textbox', { name: 'Message' }).fill(`Smoke test body for ${subject}`);

	// A valid recipient + body means Send is offered (exact — not the "Schedule send" caret).
	await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeEnabled();
});

test('adds and searches a local contact', { tag: '@auth' }, async ({ page }) => {
	await openMail(page);
	const contactEmail = `contact-${Date.now()}@example.com`;
	const contactName = 'E2E Contact';

	await page.goto('/contacts');
	// Two "Add contact" buttons (nav rail + list header) — use the list one.
	await page.getByLabel('Contacts list').getByRole('button', { name: 'Add contact' }).click();
	await page.getByPlaceholder('Jane Doe').fill(contactName);
	await page.getByPlaceholder('jane@example.com').fill(contactEmail);
	await page.getByRole('button', { name: 'Save contact' }).click();

	await page.getByPlaceholder('Search contacts…').fill(contactEmail);
	await expect(page.getByRole('button', { name: new RegExp(contactName) })).toBeVisible();
});

test('inbox list uses scroll area with load-more footer', { tag: '@auth' }, async ({ page }) => {
	await openMail(page);
	// The message-list pane is the inner scroll area (the shell is the outer one).
	await expect(page.locator('.z-scroll-area--pane')).toBeVisible({ timeout: 30_000 });

	const loadMore = page.locator('.z-mail-list-load-more');
	if (await loadMore.isVisible().catch(() => false)) {
		await expect(loadMore.getByRole('button', { name: 'Load more' })).toBeVisible();
	}
});

test('opens calendar or explains missing calendar support', { tag: '@auth' }, async ({ page }) => {
	await openMail(page);
	await page.goto('/calendar');

	const unavailable = page.getByRole('heading', { name: 'Calendar unavailable' });
	if (await unavailable.isVisible().catch(() => false)) {
		await expect(unavailable).toBeVisible();
		return;
	}

	await expect(page.getByRole('button', { name: 'New event' }).first()).toBeVisible();
});

test('opens the branded account security center', { tag: '@auth' }, async ({ page }) => {
	await openMail(page);
	await page.goto('/settings/security');
	// Section titles render as duplicated legend + intro (one hidden per breakpoint), so anchor
	// on the identity-confirmation gate: a unique, always-visible current-password field + Confirm.
	await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible({
		timeout: 30_000
	});
	await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible();
});
