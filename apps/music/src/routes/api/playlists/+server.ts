import { error, json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { playlistsOf, sub } from '#lib/server/navidrome';
import type { Playlist } from '#lib/types';

/** The playlists this person can add to: their own (ones shared with them are read-only). */
export const GET: RequestHandler = async ({ locals }) => {
	return json((await playlistsOf(apiUser(locals))).own);
};

/** { name } — a new, empty playlist; answers with its id. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { name } = (await request.json().catch(() => ({}))) as { name?: string };
	if (typeof name !== 'string' || !name.trim()) error(400, 'A playlist needs a name.');
	const { playlist } = await sub<{ playlist: Playlist }>(apiUser(locals), 'createPlaylist', { name: name.trim().slice(0, 200) });
	return json({ id: playlist.id, name: playlist.name });
};
