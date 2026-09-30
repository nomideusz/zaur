import { signedIn } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Artist } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const { artists } = await sub<{ artists: { index?: { name: string; artist: Artist[] }[] } }>(user, 'getArtists');
	return { user, index: artists.index ?? [] };
};
