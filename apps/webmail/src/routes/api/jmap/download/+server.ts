import { error, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { resolveRequestAccount } from '$lib/server/session';

// Types safe to render inline (browser won't execute script from them).
const SAFE_INLINE_TYPE = /^(image\/(png|jpe?g|gif|webp|avif|bmp|x-icon)|application\/pdf|text\/plain|audio\/|video\/)/i;
// Never let the browser treat an attachment as an active document.
const ACTIVE_TYPE = /html|svg|xml|xhtml|javascript/i;

function safeContentType(requested: string): string {
	return ACTIVE_TYPE.test(requested) ? 'application/octet-stream' : requested;
}

function contentDisposition(disposition: 'inline' | 'attachment', name: string): string {
	const fallback = name.replace(/[\r\n"\\/:*?<>|]+/g, '_').trim() || 'attachment';
	const encoded = encodeURIComponent(name.replace(/[\r\n]/g, ''))
		.replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
		.replace(/\*/g, '%2A');
	return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export const GET: RequestHandler = async ({ url, cookies, request }) => {
	const account = resolveRequestAccount(cookies, request);
	if (!account) {
		error(401, 'Unauthorized');
	}

	const blobId = url.searchParams.get('blobId');
	const name = url.searchParams.get('name');
	const type = safeContentType(url.searchParams.get('type') ?? 'application/octet-stream');
	// Only honor inline for types the browser can't execute; everything else downloads.
	const inline = url.searchParams.get('inline') === '1' && SAFE_INLINE_TYPE.test(type);

	if (!blobId || !name) {
		error(400, 'blobId and name are required');
	}

	try {
		const client = await createConnectedClient(account, cookies);
		const response = await client.downloadBlob(blobId, name, type);

		if (!response.ok) {
			error(response.status, 'Download failed');
		}

		const headers = new Headers();
		// Serve our sanitized type, not whatever upstream echoes back from the query.
		headers.set('Content-Type', type);
		headers.set('Content-Disposition', contentDisposition(inline ? 'inline' : 'attachment', name));
		headers.set('X-Content-Type-Options', 'nosniff');
		// Defense in depth: this response can never run script or be framed, even if a type slips through.
		headers.set('Content-Security-Policy', "default-src 'none'; sandbox");

		return new Response(response.body, { headers });
	} catch {
		error(502, 'Download failed');
	}
};
