import { error, type RequestHandler } from '@sveltejs/kit';
import { requireAccount } from '#lib/server/account';
import { createConnectedClient } from '#lib/server/jmap';
import { reportError } from '#lib/server/report';

/**
 * Attachment download, proxied.
 *
 * Stalwart's `downloadUrl` needs the account's credentials, which never leave
 * the server, so the bytes come through here — the mirror of `/api/upload`.
 * A file transfer is not remote-function state either.
 *
 * The blob is streamed rather than buffered: an attachment can be tens of
 * megabytes and there is no reason for it to sit in this process's heap.
 */
export const GET: RequestHandler = async ({ url }) => {
	const account = requireAccount();

	const blobId = url.searchParams.get('blobId');
	if (!blobId) error(400, 'Missing blobId');
	const name = url.searchParams.get('name') ?? 'attachment';
	const type = url.searchParams.get('type') || 'application/octet-stream';

	// A mailbox shared with you keeps its blobs in its own account.
	const shared = url.searchParams.get('account');

	let upstream: Response;
	try {
		const own = await createConnectedClient(account);
		const client = shared ? own.forAccount(shared) : own;
		upstream = client ? await client.downloadBlob(blobId, name, type) : new Response(null, { status: 404 });
	} catch (cause) {
		if (cause instanceof Error && cause.message === 'Unauthorized') error(401, 'Unauthorized');
		console.error('[api/download] Upstream download failed:', cause);
		reportError(cause, { where: 'api/download' });
		error(502, 'Download failed');
	}

	if (!upstream.ok || !upstream.body) {
		error(upstream.status === 404 ? 404 : 502, 'Download failed');
	}

	// `filename*` is the RFC 5987 form, so a name with non-ASCII in it survives;
	// the plain `filename` stays as a fallback with quotes and backslashes
	// stripped, since either would break out of the quoted string.
	const safe = name.replace(/["\\]/g, '');
	const disposition = `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(name)}`;

	const headers = new Headers({
		'Content-Type': upstream.headers.get('content-type') ?? type,
		'Content-Disposition': disposition,
		// The blob is immutable and addressed by id, but it is also private.
		'Cache-Control': 'private, max-age=3600',
		'X-Content-Type-Options': 'nosniff',
		// The bytes are whatever the sender attached. Should one ever be opened as
		// a page (an HTML or SVG file), it runs no script and cannot be framed.
		'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"
	});
	const length = upstream.headers.get('content-length');
	if (length) headers.set('Content-Length', length);

	return new Response(upstream.body, { headers });
};
