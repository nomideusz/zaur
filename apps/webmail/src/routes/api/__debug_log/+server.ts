import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const LOG_PATH = '/opt/cursor/logs/debug.log';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		mkdirSync(dirname(LOG_PATH), { recursive: true });
		appendFileSync(LOG_PATH, `${JSON.stringify(body)}\n`);
		return json({ ok: true });
	} catch (error) {
		return json({ ok: false, error: String(error) }, { status: 500 });
	}
};
