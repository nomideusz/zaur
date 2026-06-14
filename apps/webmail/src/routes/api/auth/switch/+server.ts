import { json, type RequestHandler } from '@sveltejs/kit';
import { getAccount, readSessionFull, setActiveAccount } from '$lib/server/session';

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
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (!getAccount(session, key)) {
		return json({ error: 'Unknown account' }, { status: 404 });
	}

	const next = setActiveAccount(cookies, key);
	return json({ ok: true, activeKey: next?.activeKey ?? session.activeKey });
};
