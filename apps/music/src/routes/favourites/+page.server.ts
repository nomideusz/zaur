import { signedIn } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Album, Song } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const { starred2 } = await sub<{ starred2: { song?: Song[]; album?: Album[] } }>(user, 'getStarred2');
	return { user, songs: starred2.song ?? [], albums: starred2.album ?? [] };
};
