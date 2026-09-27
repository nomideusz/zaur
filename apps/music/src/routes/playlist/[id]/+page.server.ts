import { signedIn } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Playlist } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { playlist } = await sub<{ playlist: Playlist }>(signedIn(event), 'getPlaylist', { id: event.params.id });
	return { playlist };
};
