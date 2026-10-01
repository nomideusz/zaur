import { signedIn } from '#lib/server/auth';
import { relatedArtists } from '#lib/server/albums';
import { sub } from '#lib/server/navidrome';
import type { Album, Artist } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const { artist } = await sub<{ artist: Artist }>(user, 'getArtist', { id: event.params.id });
	// The artist's songs, for the page's list and its Play and Shuffle.
	// ponytail: one getAlbum per album (Subsonic has no "songs by artist"); fine
	// for tens of albums, page it if someone has hundreds.
	const albums = await Promise.all(
		(artist.album ?? []).map((album) => sub<{ album: Album }>(user, 'getAlbum', { id: album.id }).then((r) => r.album.song ?? []))
	);
	// Streamed: Deezer never holds the page up.
	return { user, artist, songs: albums.flat(), related: relatedArtists(user, artist.name) };
};
