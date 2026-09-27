import { signedIn } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Artist } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { artist } = await sub<{ artist: Artist }>(signedIn(event), 'getArtist', { id: event.params.id });
	return { artist };
};
