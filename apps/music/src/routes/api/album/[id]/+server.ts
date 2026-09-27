import { json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Album } from '#lib/types';

/** An album's songs, for the play button on a tile. */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { album } = await sub<{ album: Album }>(apiUser(locals), 'getAlbum', { id: params.id });
	return json(album.song ?? []);
};
