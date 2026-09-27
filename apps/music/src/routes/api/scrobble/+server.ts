import { error, json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';

/** { id, submission } — false: now playing; true: played (counts, "recently played"). */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { id, submission } = (await request.json().catch(() => ({}))) as { id?: string; submission?: boolean };
	if (typeof id !== 'string' || !id) error(400, 'id required');
	await sub(apiUser(locals), 'scrobble', { id, submission: submission === true });
	return json({ ok: true });
};
