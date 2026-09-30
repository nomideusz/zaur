import { signedIn } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Album } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const { album } = await sub<{ album: Album }>(user, 'getAlbum', { id: event.params.id });
	return { user, album };
};
