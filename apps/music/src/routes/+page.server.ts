import { signedIn } from '#lib/server/auth';
import { playlistsOf, sub } from '#lib/server/navidrome';
import type { Album, Song } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = signedIn(event);
	const albums = (type: string) =>
		sub<{ albumList2: { album?: Album[] } }>(user, 'getAlbumList2', { type, size: 16 }).then((r) => r.albumList2.album ?? []);
	const [recent, newest, frequent, playlists, favourites] = await Promise.all([
		albums('recent'),
		albums('newest'),
		albums('frequent'),
		playlistsOf(user).then((lists) => lists.own),
		sub<{ starred2: { song?: Song[] } }>(user, 'getStarred2').then((r) => r.starred2.song ?? [])
	]);
	return { user, recent, newest, frequent, playlists: playlists.slice(0, 8), favourites: favourites.slice(0, 8) };
};
