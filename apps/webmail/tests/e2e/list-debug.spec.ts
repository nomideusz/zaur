import { test } from '@playwright/test';

test('debug list details', async ({ page }) => {
	await page.setViewportSize({ width: 1024, height: 768 });
	await page.goto('/mail/inbox');
	await page.waitForTimeout(1000);

	console.log('--- DOM STRUCTURE ---');
	const html = await page.evaluate(() => {
		const flow = document.querySelector('.z-mail-list-flow');
		if (!flow) return 'No flow element found';
		// Return outer HTML of flow container but truncated/simplified
		return flow.innerHTML.substring(0, 1000);
	});
	console.log('Simplified HTML:', html);

	// Let's print classes and styles of the sections and rows
	const elementsInfo = await page.evaluate(() => {
		const results: any[] = [];
		const uls = document.querySelectorAll('.z-mail-list-flow ul');
		uls.forEach((ul, ulIndex) => {
			const ulStyle = window.getComputedStyle(ul);
			const rows = ul.querySelectorAll('.z-mail-list-row');
			const rowInfos: any[] = [];

			rows.forEach((row, rowIndex) => {
				const rowStyle = window.getComputedStyle(row);
				const checkbox = row.querySelector('.z-mail-list-row__checkbox');
				const checkboxStyle = checkbox ? window.getComputedStyle(checkbox) : null;
				const rowRect = row.getBoundingClientRect();
				const checkboxRect = checkbox ? checkbox.getBoundingClientRect() : null;

				rowInfos.push({
					index: rowIndex,
					className: row.className,
					position: rowStyle.position,
					left: rowStyle.left,
					rectLeft: rowRect.left,
					checkbox: checkboxStyle ? {
						position: checkboxStyle.position,
						left: checkboxStyle.left,
						marginLeft: checkboxStyle.marginLeft,
						rectLeft: checkboxRect?.left,
					} : null
				});
			});

			results.push({
				ulIndex,
				className: ul.className,
				position: ulStyle.position,
				paddingLeft: ulStyle.paddingLeft,
				marginLeft: ulStyle.marginLeft,
				rows: rowInfos
			});
		});
		return results;
	});

	console.log('Elements Info:', JSON.stringify(elementsInfo, null, 2));
});
