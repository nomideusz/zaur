import { json, error, type RequestHandler } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';
import { resolveRequestAccount } from '$lib/server/session';

export const config = {
	bodySizeLimit: 25 * 1024 * 1024
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const account = resolveRequestAccount(cookies, request);
	if (!account) {
		error(401, 'Unauthorized');
	}

	const rate = checkRateLimit({
		key: `jmap-upload:${account.id ?? getClientAddress(request)}`,
		limit: 60,
		windowMs: 10 * 60_000
	});
	if (!rate.allowed) {
		return json(
			{ error: 'Too many uploads' },
			{ status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
		);
	}

	const type = request.headers.get('content-type') ?? 'application/octet-stream';
	const data = await request.arrayBuffer();

	if (!data.byteLength) {
		error(400, 'Empty upload');
	}

	try {
		const client = await createConnectedClient(account, cookies);
		const result = await client.uploadBlob(data, type);
		return json(result);
	} catch (err) {
		console.error('[api/jmap/upload] Upstream upload failed:', err);
		return json({ error: 'Upload failed' }, { status: 502 });
	}
};
