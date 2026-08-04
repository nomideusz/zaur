import { expect, test } from '@playwright/test';

test('uses ZAUR-branded inline password and TOTP steps', async ({ page }) => {
	await page.route('**/api/auth/login', async (route) => {
		await route.fulfill({
			status: 202,
			contentType: 'application/json',
			body: JSON.stringify({ requiresTotp: true, code: 'mfa_required' })
		});
	});
	await page.goto('/login');
	await expect(page.getByRole('link', { name: /secure sign-in/i })).toHaveCount(0);
	const submit = page.getByRole('button', { name: 'Sign in' });
	await expect
		.poll(async () => {
			await page.getByLabel('Email').fill('user@zaur.app');
			await page.locator('#password').fill('not-sent-anywhere-else');
			return submit.isEnabled();
		})
		.toBe(true);
	await submit.click();
	await expect(page.getByText('Two-factor authentication')).toBeVisible();
	// Ark PinInput: autofill lives on the hidden aggregate input; digits are typed in slots.
	await expect(page.locator('#totp')).toHaveAttribute('autocomplete', 'one-time-code');
	await expect(page.getByRole('button', { name: 'Verify and sign in' })).toBeDisabled();
	await page.locator('.z-pin-input__slot').first().click();
	await page.keyboard.type('123456');
	await expect(page.getByRole('button', { name: 'Verify and sign in' })).toBeEnabled();
});
