import page from '#lib/offline.html?raw';
import { appName, brandName, MARK } from '#lib/brand';
import type { RequestHandler } from './$types';

/** The service worker's offline page (#lib/offline.html), in this deployment's names. */
const html = page
	.replaceAll('{{APP_NAME}}', appName)
	.replaceAll('{{BRAND_NAME}}', brandName)
	.replaceAll('{{MARK_FAINT}}', MARK.faint)
	.replaceAll('{{MARK_BOLD}}', MARK.bold);

export const GET: RequestHandler = () =>
	new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
