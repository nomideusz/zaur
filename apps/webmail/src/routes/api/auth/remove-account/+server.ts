import { json, type RequestHandler } from '@sveltejs/kit';
import { getAccount, readSessionFull, removeAccount } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: { key?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const key = typeof body.key === 'string' ? body.key.trim() : '';
	if (!key) {
		return json({ error: 'key required' }, { status: 400 });
	}

	const session = readSessionFull(cookies);
	if (!session) {
		return json({ authenticated: false });
	}
	// Already gone — report current state rather than erroring.
	if (!getAccount(session, key)) {
		return json({ authenticated: true, activeKey: session.activeKey });
	}

	const next = removeAccount(cookies, key);
	if (!next) {
		// That was the last account; the session has been cleared.
		return json({ authenticated: false });
	}
	return json({ authenticated: true, activeKey: next.activeKey });
};
