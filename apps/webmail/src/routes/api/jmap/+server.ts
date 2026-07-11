import { errorMessage } from '@zaur/mail-core/utils/errors';
import { json, type RequestHandler } from '@sveltejs/kit';
import type { JMAPResponse } from '$lib/jmap/types';
import { createConnectedClient } from '$lib/server/jmap';
import { validateJmapRequest } from '$lib/server/jmap-request';
import { checkRateLimit, getClientAddress } from '$lib/server/rate-limit';
import { resolveRequestAccount } from '$lib/server/session';

export const config = {
	bodySizeLimit: 5 * 1024 * 1024
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const account = resolveRequestAccount(cookies, request);
	if (!account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const rate = checkRateLimit({
		key: `jmap:${account.id ?? getClientAddress(request)}`,
		limit: 300,
		windowMs: 60_000
	});
	if (!rate.allowed) {
		return json(
			{ error: 'Too many requests' },
			{ status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const validated = validateJmapRequest(body);
	if (!validated.ok) {
		return json({ error: validated.error }, { status: 400 });
	}

	try {
		const client = await createConnectedClient(account, cookies);
		const response = await client.request(validated.value.methodCalls, validated.value.using);
		return json(response satisfies JMAPResponse);
	} catch (error) {
		const message = errorMessage(error, 'JMAP request failed');
		const unauthorized = message.includes('401') || message.includes('Unauthorized');
		if (!unauthorized) {
			console.error('[api/jmap] Upstream request failed:', error);
		}
		// Don't echo upstream error details to the client.
		return json(
			{ error: unauthorized ? 'Unauthorized' : 'JMAP request failed' },
			{ status: unauthorized ? 401 : 502 }
		);
	}
};
