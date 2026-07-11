import { expect, test as setup } from '@playwright/test';

const email = process.env.E2E_MAIL_EMAIL;
const password = process.env.E2E_MAIL_PASSWORD;

export const AUTH_STATE = 'test-results/.auth/mail.json';

// One real sign-in per run — the mail account is shared and rate-limited
// (20 attempts / 15 min), so every @auth test reuses this stored session.
setup('authenticate against Stalwart', { tag: '@auth' }, async ({ page }) => {
	setup.skip(!email || !password, 'Set E2E_MAIL_EMAIL and E2E_MAIL_PASSWORD');

	await page.goto('/login');
	await page.getByLabel('Email').fill(email!);
	await page.locator('#password').fill(password!);
	const submit = page.getByRole('button', { name: 'Sign in' });
	await expect(submit).toBeEnabled();
	await submit.click();

	await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 });
	// Fresh accounts get the first-login identity dialog — dismiss it once.
	const welcome = page.getByRole('dialog', { name: 'Welcome to your mail' });
	if (await welcome.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await welcome.getByRole('button', { name: 'Skip' }).click();
		await expect(welcome).toBeHidden();
	}
	await expect(page.getByRole('complementary', { name: 'Mail navigation' })).toBeVisible({
		timeout: 30_000
	});

	await page.context().storageState({ path: AUTH_STATE });
});
