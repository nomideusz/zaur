import { json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Song } from '#lib/types';

/** Songs in the library like this one (Navidrome asks its agents: Deezer, Last.fm, ListenBrainz), for a radio from it. */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { similarSongs } = await sub<{ similarSongs: { song?: Song[] } }>(apiUser(locals), 'getSimilarSongs', { id: params.id, count: 50 });
	return json(similarSongs.song ?? []);
};
