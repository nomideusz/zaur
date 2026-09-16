import { error, json, type Cookies, type RequestHandler } from '@sveltejs/kit';
import { getActiveAccount, readSessionFull } from '@zaur/server-auth';
import type { SessionData } from '@zaur/server-auth';
import { createConnectedClient } from '#lib/server/jmap';
import { reportError } from '#lib/server/report';

export const config = {
	bodySizeLimit: 25 * 1024 * 1024
};

function requireAccount(cookies: Cookies): SessionData {
	const session = readSessionFull(cookies);
	const account = session ? getActiveAccount(session) : undefined;
	if (!account) error(401, 'Unauthorized');
	return account;
}

/**
 * Raw blob upload for compose attachments: the file bytes go through as the
 * request body, the server forwards them to Stalwart's JMAP upload endpoint
 * and returns `{ blobId, size, type }`. File transfers are not remote-function
 * state, so this is a plain endpoint — same shape as webmail 1.0's
 * /api/jmap/upload proxy.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const account = requireAccount(cookies);

	const type = request.headers.get('content-type') ?? 'application/octet-stream';
	const data = await request.arrayBuffer();
	if (!data.byteLength) error(400, 'Empty upload');

	try {
		const client = await createConnectedClient(account);
		const result = await client.uploadBlob(data, type);
		return json(result);
	} catch (cause) {
		if (cause instanceof Error && cause.message === 'Unauthorized') {
			error(401, 'Unauthorized');
		}
		console.error('[api/upload] Upstream upload failed:', cause);
		reportError(cause, { where: 'api/upload' });
		return json({ error: 'Upload failed' }, { status: 502 });
	}
};
