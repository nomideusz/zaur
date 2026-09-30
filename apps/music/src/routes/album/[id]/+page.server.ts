import { signedIn } from '#lib/server/auth';
import { cached, findAlbum, missingTracks } from '#lib/server/albums';
import { sub } from '#lib/server/navidrome';
import type { Album } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const { album } = await sub<{ album: Album }>(user, 'getAlbum', { id: event.params.id });
	// The album's songs the library lacks, to add: streamed, Deezer answers after the page is up.
	const rest = album.artist
		? cached(`album:${album.artist}\u0000${album.name}`, () => findAlbum(album.name, album.artist!))
				.then(async (outside) => (outside ? { id: outside.id, missing: (await missingTracks(user, outside.id, album.song ?? [])).length } : null))
				.catch((cause) => (console.warn('[album] Deezer lookup failed', cause), null))
		: null;
	return { user, album, rest };
};
