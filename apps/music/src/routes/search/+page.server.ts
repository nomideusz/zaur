import { signedIn } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Album, Artist, Song } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const q = event.url.searchParams.get('q')?.trim() ?? '';
	if (!q) return { q, artists: [], albums: [], songs: [] };
	const { searchResult3: r } = await sub<{ searchResult3: { artist?: Artist[]; album?: Album[]; song?: Song[] } }>(user, 'search3', {
		query: q,
		artistCount: 8,
		albumCount: 18,
		songCount: 50
	});
	return { q, artists: r.artist ?? [], albums: r.album ?? [], songs: r.song ?? [] };
};
