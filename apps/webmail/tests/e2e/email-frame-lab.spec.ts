import { test, expect } from '@playwright/test';

// Exercises the sandboxed EmailHtmlFrame via the throwaway /email-frame-lab route.
// Auth-independent: covers script isolation (sandbox blocks execution), auto-height sizing,
// height re-measure on body swap, and hardened external links.

type Page = import('@playwright/test').Page;
const frame = (page: Page) => page.locator('[data-testid="frame-host"] iframe');

test('renders email HTML inside the iframe', async ({ page }) => {
	await page.goto('/email-frame-lab');
	await expect(frame(page)).toBeVisible();
	await expect(frame(page).contentFrame().locator('#lead')).toContainText('Hello from inside the frame');
});

test('sandbox blocks inline scripts in the email body', async ({ page }) => {
	await page.goto('/email-frame-lab');
	await expect(frame(page).contentFrame().locator('#lead')).toBeVisible();
	// The body contains <script>window.parent.__pwned = true</script>; sandbox omits allow-scripts.
	expect(await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)).toBeUndefined();
});

test('auto-sizes height to content and re-measures on body swap', async ({ page }) => {
	await page.goto('/email-frame-lab');
	const el = frame(page);
	await expect(el.contentFrame().locator('#tall')).toBeVisible();

	// Tall body (~800px block) should drive the iframe well past its 48px min-height.
	await expect.poll(async () => (await el.boundingBox())?.height ?? 0).toBeGreaterThan(400);

	// The frame must contain the whole body — no clipping. body.scrollHeight undercounts trailing
	// margins, so the height is read from documentElement after collapsing; guard that here.
	const clip = await el.evaluate((f: HTMLIFrameElement) => {
		const d = f.contentDocument!;
		const last = Math.ceil(d.body.lastElementChild!.getBoundingClientRect().bottom);
		return last - Math.round(f.getBoundingClientRect().height);
	});
	expect(clip).toBeLessThanOrEqual(1);

	const tall = (await el.boundingBox())?.height ?? 0;
	await page.getByTestId('mode-short').click();
	// Swapping to a one-line body reloads the srcdoc and shrinks the frame.
	await expect.poll(async () => (await el.boundingBox())?.height ?? 0).toBeLessThan(tall);
});

test('fixed-width mail scrolls horizontally instead of clipping', async ({ page }) => {
	// Narrow viewport so the ~2000px #wide table can't fit — the phone-bug scenario.
	await page.setViewportSize({ width: 380, height: 800 });
	await page.goto('/email-frame-lab');
	const el = frame(page);
	await expect(el.contentFrame().locator('#wide')).toBeVisible();

	// The frame's document must be horizontally scrollable (overflow-x), not clipped.
	const overflow = await el.evaluate((f: HTMLIFrameElement) => {
		const root = f.contentDocument!.documentElement;
		return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
	});
	expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);

	// And scrolling right actually moves — proves the content is reachable, not cut off.
	const moved = await el.evaluate((f: HTMLIFrameElement) => {
		const root = f.contentDocument!.documentElement;
		root.scrollLeft = root.scrollWidth;
		return root.scrollLeft;
	});
	expect(moved).toBeGreaterThan(0);
});

test('frame defaults links to a new tab via <base>', async ({ page }) => {
	// Link hardening (rel=noopener) happens upstream in html.ts; the frame itself adds a
	// <base target="_blank"> so any link still opens out of the sandbox rather than navigating it.
	await page.goto('/email-frame-lab');
	await expect(frame(page).contentFrame().locator('#ext')).toBeVisible();
	await expect(frame(page).contentFrame().locator('base')).toHaveAttribute('target', '_blank');
});
