import { signedIn } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Playlist } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const { playlists } = await sub<{ playlists: { playlist?: Playlist[] } }>(user, 'getPlaylists');
	return { user, playlists: playlists.playlist ?? [] };
};
