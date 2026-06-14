import { json, type RequestHandler } from '@sveltejs/kit';
import type { JMAPMethodCall, JMAPResponse } from '$lib/jmap/types';
import { createConnectedClient } from '$lib/server/jmap';
import { resolveRequestAccount } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const account = resolveRequestAccount(cookies, request);
	if (!account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: { using?: string[]; methodCalls?: JMAPMethodCall[] };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	if (!body.methodCalls?.length) {
		return json({ error: 'methodCalls required' }, { status: 400 });
	}

	try {
		const client = await createConnectedClient(account, cookies);
		const response = await client.request(body.methodCalls, body.using);
		return json(response satisfies JMAPResponse);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'JMAP request failed';
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
