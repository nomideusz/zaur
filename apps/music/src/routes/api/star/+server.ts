import { error, json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';

/** { id, star } — favourite a song (or album/artist: Navidrome takes any id). */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { id, star } = (await request.json().catch(() => ({}))) as { id?: string; star?: boolean };
	if (typeof id !== 'string' || !id) error(400, 'id required');
	await sub(apiUser(locals), star ? 'star' : 'unstar', { id });
	return json({ ok: true });
};
