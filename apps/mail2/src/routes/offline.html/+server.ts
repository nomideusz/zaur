import page from '#lib/offline.html?raw';
import { BIRD } from '#lib/bird';
import { appName, brandName, hasBird, MARK } from '#lib/brand';
import type { RequestHandler } from './$types';

/** The brand mark, inline: an offline page can fetch nothing, not even its icon. */
const mark = hasBird
	? `<svg width="30" viewBox="0 0 ${BIRD.width} ${BIRD.height}" aria-hidden="true">` +
		BIRD.shapes
			.map(([colour, d]) => `<path fill="${colour}" stroke="${colour}" stroke-width="2" stroke-linejoin="round" fill-rule="evenodd" d="${d}" />`)
			.join('') +
		'</svg>'
	: '<svg width="24" height="24" viewBox="0 0 16 16" aria-hidden="true"><rect width="16" height="16" rx="3.5" fill="#2563eb" />' +
		'<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
		`<path d="${MARK.faint}" stroke-opacity="0.45" /><path d="${MARK.bold}" /></g></svg>`;

/** The service worker's offline page (#lib/offline.html), in this deployment's names. */
const html = page.replaceAll('{{APP_NAME}}', appName).replaceAll('{{BRAND_NAME}}', brandName).replaceAll('{{MARK}}', mark);

export const GET: RequestHandler = () =>
	new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
