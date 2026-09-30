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

// Subsonic caps a page at 500.
const PAGE = 500;

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const asked = event.url.searchParams.get('sort') ?? '';
	const sort = (asked in SORTS ? asked : 'newest') as keyof typeof SORTS;
	// "Show more" asks for a longer list. Random has no pages: each call is a fresh draw.
	const count = sort === 'random' ? 60 : Math.max(60, Math.floor(Number(event.url.searchParams.get('count'))) || 60);
	const albums: Album[] = [];
	while (albums.length < count) {
		const size = Math.min(PAGE, count - albums.length);
		const { albumList2 } = await sub<{ albumList2: { album?: Album[] } }>(user, 'getAlbumList2', { type: sort, size, offset: albums.length });
		albums.push(...(albumList2.album ?? []));
		// A short page is the end of the library.
		if ((albumList2.album?.length ?? 0) < size) break;
	}
	return { sort, sorts: SORTS, count, albums };
};
