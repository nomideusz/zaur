import { signedIn } from '#lib/server/auth';
import { sub } from '#lib/server/navidrome';
import type { Album } from '#lib/types';
import type { PageServerLoad } from './$types';

const SORTS = {
	newest: 'Recently added',
	alphabeticalByName: 'A–Z',
	alphabeticalByArtist: 'By artist',
	frequent: 'Most played',
	recent: 'Recently played',
	random: 'Random'
} as const;

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const asked = event.url.searchParams.get('sort') ?? '';
	const sort = (asked in SORTS ? asked : 'newest') as keyof typeof SORTS;
	// "Show more" asks for a longer list; Subsonic caps a page at 500.
	const count = Math.min(500, Math.max(60, Number(event.url.searchParams.get('count')) || 60));
	const { albumList2 } = await sub<{ albumList2: { album?: Album[] } }>(user, 'getAlbumList2', { type: sort, size: count });
	return { sort, sorts: SORTS, count, albums: albumList2.album ?? [] };
};
