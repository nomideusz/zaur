import { signedIn } from '#lib/server/auth';
import { lookOutside } from '#lib/server/albums';
import { sub } from '#lib/server/navidrome';
import type { Album, Artist, Song } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const q = event.url.searchParams.get('q')?.trim() ?? '';
	if (!q) return { user, q, artists: [], albums: [], songs: [], outside: null };
	const { searchResult3: r } = await sub<{ searchResult3: { artist?: Artist[]; album?: Album[]; song?: Song[] } }>(user, 'search3', {
		query: q,
		artistCount: 8,
		albumCount: 18,
		songCount: 50
	});
	// What is out there to add comes after the library's own, streamed: YouTube takes a second or two.
	const outside = q.length > 1 && !/https?:\/\//.test(q) ? lookOutside(q.slice(0, 200)) : null;
	return { user, q, artists: r.artist ?? [], albums: r.album ?? [], songs: r.song ?? [], outside };
};
