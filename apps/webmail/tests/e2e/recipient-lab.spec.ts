import { test, expect } from '@playwright/test';

// Exercises ComposeRecipientInput (Ark tags-input) via the throwaway /recipient-lab route.
// Auth-independent: covers chip commit, the echo guard, pending-folding, and deletion.

const chips = (page: import('@playwright/test').Page) => page.locator('.z-compose__chip-preview');
const value = (page: import('@playwright/test').Page) => page.getByTestId('value');
const input = (page: import('@playwright/test').Page) => page.locator('#lab-to');

test('recipient chips: commit, echo-guard, fold, delete', async ({ page }) => {
	await page.goto('/recipient-lab');
	await expect(input(page)).toBeVisible();

	// 1. Initial value is split into two chips.
	await expect(chips(page)).toHaveCount(2);
	await expect(value(page)).toHaveText('alice@example.com, bob@example.com');

	// 2. Comma commits a new chip and clears the input.
	await input(page).click();
	await input(page).pressSequentially('carol@example.com,');
	await expect(chips(page)).toHaveCount(3);
	await expect(value(page)).toContainText('carol@example.com');
	await expect(input(page)).toHaveValue('');

	// 3. Echo guard: typing without a delimiter must NOT create a chip,
	//    but the pending text IS folded into the emitted value.
	await input(page).pressSequentially('partialtext');
	await expect(chips(page)).toHaveCount(3);
	await expect(input(page)).toHaveValue('partialtext');
	await expect(value(page)).toContainText('partialtext');

	// 4. Enter commits the pending text as a chip (invalid, but allowed).
	await input(page).press('Enter');
	await expect(chips(page)).toHaveCount(4);
	await expect(input(page)).toHaveValue('');
	await expect(page.locator('.z-compose__chip--invalid')).toHaveCount(1);

	// 5. Deleting a chip removes it from the value.
	await page.getByLabel('Remove alice@example.com').click();
	await expect(chips(page)).toHaveCount(3);
	await expect(value(page)).not.toContainText('alice@example.com');

	// 6. Pending text is folded into the value as you type (so Send always sees it),
	//    and leaving the field commits it as a chip — recipients end up as pills.
	await input(page).click();
	await input(page).pressSequentially('dave@example.com');
	await expect(value(page)).toContainText('dave@example.com');
	const beforeBlur = await chips(page).count();
	await page.getByTestId('value').click(); // blur the field
	await expect(chips(page)).toHaveCount(beforeBlur + 1); // blur commits the pending chip
	await expect(value(page)).toContainText('dave@example.com'); // still in the value

	// 7. External value change (reply/forward/draft prefill) re-syncs the chips.
	await page.getByTestId('prefill').click();
	await expect(chips(page)).toHaveCount(3);
	await expect(value(page)).toHaveText('erin@example.com, frank@example.com, grace@example.com');

	// 8. External clear (after send) empties the field.
	await page.getByTestId('clear').click();
	await expect(chips(page)).toHaveCount(0);
});

test('suggestion: Enter picks the top contact, not the raw partial', async ({ page }) => {
	await page.goto('/recipient-lab');
	await input(page).click();

	// Typing a partial that matches a seeded contact shows the suggestion list.
	await input(page).pressSequentially('zoe');
	await expect(page.getByRole('listbox', { name: 'Contact suggestions' })).toBeVisible();

	// Enter must commit the contact's full address (zoe@example.com), not the raw "zoe",
	// and leave the input empty (no leftover first letters).
	await input(page).press('Enter');
	await expect(chips(page).filter({ hasText: 'zoe@example.com' })).toHaveCount(1);
	await expect(chips(page).filter({ hasText: /^zoe$/ })).toHaveCount(0);
	await expect(input(page)).toHaveValue('');
});

test('suggestion: clicking a contact picks it and clears the input', async ({ page }) => {
	await page.goto('/recipient-lab');
	await input(page).click();
	await input(page).pressSequentially('zane');
	await page.getByRole('listbox', { name: 'Contact suggestions' }).getByText('zane@example.com').click();
	await expect(chips(page).filter({ hasText: 'zane@example.com' })).toHaveCount(1);
	await expect(chips(page).filter({ hasText: /^zane\s*$/ })).toHaveCount(0);
	await expect(input(page)).toHaveValue('');
});

test('pasting an address list commits chips, including newline-separated', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/recipient-lab');
	await input(page).click();

	await page.evaluate(() => navigator.clipboard.writeText('dan@example.com\nDee Dee <dee@example.com>; don@example.com'));
	await input(page).press('ControlOrMeta+v');
	await expect(chips(page)).toHaveCount(5); // 2 initial + 3 pasted
	await expect(input(page)).toHaveValue('');
	await expect(value(page)).toContainText('dee@example.com');

	// A non-address fragment paste is left as editable text, not hijacked into a chip.
	await page.evaluate(() => navigator.clipboard.writeText('not-an-address'));
	await input(page).press('ControlOrMeta+v');
	await expect(input(page)).toHaveValue('not-an-address');
	await expect(chips(page)).toHaveCount(5);
});
