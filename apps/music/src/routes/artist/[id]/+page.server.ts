import { signedIn } from '#lib/server/auth';
import { relatedArtists } from '#lib/server/albums';
import { sub } from '#lib/server/navidrome';
import type { Album, Artist, ArtistAbout, Song, User } from '#lib/types';
import type { PageServerLoad } from './$types';

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', '#39': "'", apos: "'", lt: '<', gt: '>', nbsp: ' ' };

/** The bio as text: Last.fm's ends in a "Read more" link, and its markup is no use here. */
const plainBio = (html: string) =>
	html
		.replace(/<a\b[^>]*>[^<]*<\/a>\.?/gi, '')
		.replace(/<[^>]+>/g, '')
		.replace(/&(\w+|#\d+);/g, (all, name) => ENTITIES[name] ?? all)
		.trim();

/** The bio and the most played songs the library has, from Navidrome's agents (Deezer, Apple Music, Last.fm). */
async function about(user: User, artist: Artist): Promise<ArtistAbout> {
	const [info, top] = await Promise.allSettled([
		sub<{ artistInfo2: { biography?: string } }>(user, 'getArtistInfo2', { id: artist.id }),
		sub<{ topSongs: { song?: Song[] } }>(user, 'getTopSongs', { artist: artist.name, count: 10 })
	]);
	return {
		bio: info.status === 'fulfilled' ? plainBio(info.value.artistInfo2.biography ?? '') || undefined : undefined,
		top: top.status === 'fulfilled' ? (top.value.topSongs.song ?? []) : []
	};
}

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const { artist } = await sub<{ artist: Artist }>(user, 'getArtist', { id: event.params.id });
	// The artist's songs, for the page's list and its Play and Shuffle.
	// ponytail: one getAlbum per album (Subsonic has no "songs by artist"); fine
	// for tens of albums, page it if someone has hundreds.
	const albums = await Promise.all(
		(artist.album ?? []).map((album) => sub<{ album: Album }>(user, 'getAlbum', { id: album.id }).then((r) => r.album.song ?? []))
	);
	// Streamed: neither Deezer nor Navidrome's agents hold the page up.
	return { user, artist, songs: albums.flat(), related: relatedArtists(user, artist.name), about: about(user, artist) };
};
