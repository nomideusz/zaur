import { error, json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { sub, userRestUrl } from '#lib/server/navidrome';

/**
 * { name?, add?: song ids, remove?: position } — rename, add songs to the end,
 * take one out. Navidrome lets only the owner do any of it.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { name, add, remove } = (await request.json().catch(() => ({}))) as { name?: string; add?: string[]; remove?: number };
	const ids = Array.isArray(add) ? add.filter((id) => typeof id === 'string' && id) : [];
	// ponytail: sub() takes one value per key and an album is many songIdToAdd, so
	// the ids are appended to the URL here; move to sub() if it learns arrays.
	const url =
		userRestUrl(apiUser(locals), 'updatePlaylist', {
			playlistId: params.id,
			name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 200) : undefined,
			songIndexToRemove: Number.isInteger(remove) ? remove : undefined
		}) + ids.map((id) => `&songIdToAdd=${encodeURIComponent(id)}`).join('');
	const reply = (await fetch(url, { signal: AbortSignal.timeout(20_000) })
		.then((response) => response.json())
		.catch(() => null)) as { 'subsonic-response'?: { status?: string } } | null;
	if (reply?.['subsonic-response']?.status !== 'ok') error(502, 'Could not change the playlist.');
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await sub(apiUser(locals), 'deletePlaylist', { id: params.id });
	return json({ ok: true });
};
