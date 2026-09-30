import { signedIn } from '#lib/server/auth';
import { playlistsOf } from '#lib/server/navidrome';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const { own, shared } = await playlistsOf(user);
	return { user, playlists: own, shared };
};
