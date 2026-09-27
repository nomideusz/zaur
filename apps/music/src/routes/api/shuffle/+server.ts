import { json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Song } from '#lib/types';

export const GET: RequestHandler = async ({ locals }) => {
	const { randomSongs } = await sub<{ randomSongs: { song?: Song[] } }>(apiUser(locals), 'getRandomSongs', { size: 100 });
	return json(randomSongs.song ?? []);
};
