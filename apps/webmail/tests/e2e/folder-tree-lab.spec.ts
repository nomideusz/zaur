import { test, expect } from '@playwright/test';

// Exercises the custom-folder tree-view via the dev-only /folder-tree-lab fixture.
// Auth-independent: covers nesting, navigation links, active highlight, and expand/collapse.
// Note: leaf rows carry role="treeitem" (Ark tree ARIA) while branch rows hold a plain
// link — so selectors target href/text, not role.

const link = (page: import('@playwright/test').Page, href: string) => page.locator(`a[href="${href}"]`);

test('folder tree: nesting, links, active highlight, collapse', async ({ page }) => {
	await page.goto('/folder-tree-lab');

	// 1. Roots + nested descendants render (expanded by default), each with its route.
	await expect(link(page, '/mail/work')).toHaveText(/Work/);
	await expect(link(page, '/mail/personal')).toHaveText(/Personal/);
	await expect(link(page, '/mail/work-projects')).toHaveText(/Projects/);
	await expect(link(page, '/mail/work-projects-q1')).toHaveText(/Q1/);

	// 2. The active folder (work-projects) is marked; others are not.
	await expect(link(page, '/mail/work-projects')).toHaveAttribute('aria-current', 'page');
	await expect(link(page, '/mail/work-projects')).toHaveClass(/z-folder-active/);
	await expect(link(page, '/mail/personal')).not.toHaveAttribute('aria-current', 'page');

	// 3. Unread badge shows for Work (3); Personal (0 unread) has none.
	await expect(link(page, '/mail/work').locator('.z-folder-badge')).toHaveText('3');
	await expect(link(page, '/mail/personal').locator('.z-folder-badge')).toHaveCount(0);

	// 4. Collapsing Work flips aria-expanded and hides its descendants; expanding restores.
	const workBranch = page.locator('[data-branch="work"]');
	await expect(workBranch).toHaveAttribute('aria-expanded', 'true');
	await page.locator('button[aria-label="Toggle Work"]').click();
	await expect(workBranch).toHaveAttribute('aria-expanded', 'false');
	await expect(link(page, '/mail/work-projects')).toBeHidden();
	await page.locator('button[aria-label="Toggle Work"]').click();
	await expect(workBranch).toHaveAttribute('aria-expanded', 'true');
	await expect(link(page, '/mail/work-projects')).toBeVisible();
});
