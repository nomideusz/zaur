/**
 * Whole albums: Deezer knows what is on them (and has the cover), YouTube has
 * the audio. Each track is looked up on YouTube when its turn in the add queue
 * comes, and filed with Deezer's tags, so it joins the album already in the
 * library (the library's albums were tagged from Deezer too; see
 * /data/retag/retag.py on the server).
 */
import { sub } from '#lib/server/navidrome';
import { searchYouTube, type AlbumTags } from '#lib/server/youtube';
import type { OutsideAlbum, Song, User, YouTubeResult } from '#lib/types';

interface DeezerAlbum {
	id: number;
	title: string;
	artist: { name: string };
	cover_medium?: string;
	cover_xl?: string;
	nb_tracks?: number;
	record_type?: string;
	release_date?: string;
}

interface DeezerTrack {
	title: string;
	title_short?: string;
	duration: number;
	track_position?: number;
	disk_number?: number;
	artist: { name: string };
}

async function deezer<T>(path: string): Promise<T> {
	const response = await fetch(`https://api.deezer.com${path}`, { signal: AbortSignal.timeout(10_000) });
	const body = (await response.json()) as T & { error?: { message?: string } };
	if (!response.ok || body.error) throw new Error(`Deezer: ${body.error?.message ?? response.status}`);
	return body;
}

/** Letters and digits only, no accents, no leading "The": "The Beatles!" and "beatles" are one. */
export const norm = (s: string) =>
	s
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/^the\s+/, '')
		.replace(/[^\p{L}\p{N}]/gu, '');

// "(Deluxe Edition)", "[2011 Remaster]": the same album to anyone listening.
const EDITION = /\s*[([][^)\]]*\b(?:deluxe|remaster(?:ed)?|expanded|edition|anniversary|bonus)\b[^)\]]*[)\]]/gi;
export const albumName = (title: string) => title.replace(EDITION, '').trim() || title;

const toOutside = (album: DeezerAlbum): OutsideAlbum => ({
	id: album.id,
	title: albumName(album.title),
	artist: album.artist.name,
	cover: album.cover_medium,
	tracks: album.nb_tracks ?? 0,
	kind: album.record_type
});

/** Albums (and EPs) for these words, to add whole. Singles are what song search is for. */
export async function searchAlbums(query: string): Promise<OutsideAlbum[]> {
	const { data } = await deezer<{ data: DeezerAlbum[] }>(`/search/album?${new URLSearchParams({ q: query, limit: '12' })}`);
	return data
		.filter((album) => album.record_type !== 'single' && (album.nb_tracks ?? 0) > 1)
		.slice(0, 8)
		.map(toOutside);
}

/** The Deezer album (not a single) for one in the library, by its name and artist. */
export async function findAlbum(name: string, artist: string): Promise<OutsideAlbum | null> {
	const { data } = await deezer<{ data: DeezerAlbum[] }>(`/search/album?${new URLSearchParams({ q: `${artist} ${name}`, limit: '25' })}`);
	const hit = data.find(
		(album) =>
			album.record_type !== 'single' && norm(albumName(album.title)) === norm(albumName(name)) && norm(album.artist.name) === norm(artist)
	);
	return hit ? toOutside(hit) : null;
}

export interface AlbumTrack extends AlbumTags {
	seconds: number;
}

/** What is on a Deezer album, each track with the tags it is filed under. */
export async function albumTracks(id: number): Promise<AlbumTrack[]> {
	const album = await deezer<DeezerAlbum>(`/album/${id}`);
	const { data } = await deezer<{ data: DeezerTrack[] }>(`/album/${id}/tracks?limit=200`);
	const discs = new Set(data.map((track) => track.disk_number ?? 1)).size;
	return data.map((track, index) => ({
		title: track.title,
		artist: track.artist.name,
		album: albumName(album.title),
		albumArtist: album.artist.name,
		year: album.release_date?.slice(0, 4),
		track: track.track_position ?? index + 1,
		disc: discs > 1 ? track.disk_number : undefined,
		cover: album.cover_xl,
		seconds: track.duration
	}));
}

// Not the recording on the album, unless the album's title says so. (Global, for match(): never .test() it.)
const OTHER_TAKE =
	/\b(live|cover|remix|mix|karaoke|instrumental|acoustic|slowed|sped|reverb|nightcore|8d|reaction|tutorial|lesson|piano|guitar|drum|bass boosted|extended|hour|loop|mashup|edit|version|demo|session|unplugged)\b/gi;
// The album's own audio, as the label put it up.
const ALBUM_AUDIO = /\b(official audio|visuali[sz]er|audio)\b/i;

/** Words, spaced: "Don't Stop (Live, 2003)" is " don t stop live 2003 ". */
const words = (s: string) =>
	` ${s
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()} `;

/**
 * The YouTube upload that is this track: its title in the video's, the artist
 * in the video's title or channel, as long give or take an intro, and the same
 * take — a live track wants that concert, a studio one no live take or cover.
 * The artist's own channel wins, then the album audio, then the length.
 */
export function pickUpload(track: AlbumTrack, hits: YouTubeResult[]): YouTubeResult | null {
	const [, bare, qualifier = ''] = track.title.match(/^(.*?)\s*(?:[([](.*))?$/) ?? [];
	const title = words(bare || track.title);
	// "(Live at The Aragon Ballroom, July 2, 2003)", "(Remix)": that take, word for word.
	const take = qualifier.search(OTHER_TAKE) >= 0 ? words(qualifier.replace(/[)\]]+$/, '')) : '';
	const artist = norm(track.artist);
	const scored = hits.flatMap((hit) => {
		const said = words(hit.title);
		// Its title outside the brackets: "(You Just Do as You're Told)" has no song called "Do" in it.
		// (Unless the track's own title starts with one: "(Set Me Free) Remotivate Me".)
		const outside = bare ? words(hit.title.replace(/[([][^)\]]*[)\]]/g, ' ')) : said;
		if (!outside.includes(title) || !said.includes(take)) return [];
		const channel = norm(hit.author.replace(/\s*-\s*Topic$|VEVO$|\s*Official$/i, ''));
		const own = channel === artist || channel === norm(track.albumArtist ?? '');
		if (!own && !norm(hit.title).includes(artist) && !channel.includes(artist)) return [];
		if (hit.title.match(OTHER_TAKE)?.some((word) => !words(track.title).includes(words(word)))) return [];
		const off = Math.abs(hit.seconds - track.seconds);
		if (off > Math.max(15, track.seconds * 0.07)) return [];
		return [{ hit, score: (own ? 10 : 0) + (ALBUM_AUDIO.test(hit.title) || / - Topic$/.test(hit.author) ? 5 : 0) - off / 2 }];
	});
	return scored.sort((a, b) => b.score - a.score)[0]?.hit ?? null;
}

const bare = (title: string) => title.replace(/\s*[([].*$/, '') || title;

/** The upload for a track, searched for on YouTube: a live or remixed take by its full name if need be. */
export async function findUpload(track: AlbumTrack): Promise<YouTubeResult | null> {
	const found = pickUpload(track, await searchYouTube(`${track.artist} ${bare(track.title)}`));
	if (found || bare(track.title) === track.title) return found;
	return pickUpload(track, await searchYouTube(`${track.artist} ${track.title}`));
}

/** "Hurricane" and "Hurricane (2003 Remaster)" are one song; "Hurricane (Live)" is another. */
export const sameSong = (a: string, b: string) =>
	norm(a) === norm(b) || (norm(bare(a)) === norm(bare(b)) && a.search(OTHER_TAKE) < 0 && b.search(OTHER_TAKE) < 0);

// ponytail: in memory, a few hundred answers for ten minutes; Deezer and YouTube change slower than that.
const answers = new Map<string, { at: number; value: Promise<unknown> }>();
/** The same question again soon (Back to a search, the album page twice) is not asked again. */
export function cached<T>(key: string, ask: () => Promise<T>): Promise<T> {
	const hit = answers.get(key);
	if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value as Promise<T>;
	const value = ask();
	// A failure is not remembered.
	value.catch(() => answers.delete(key));
	answers.set(key, { at: Date.now(), value });
	if (answers.size > 300) answers.delete(answers.keys().next().value!);
	return value;
}

/** An album's tracks the library does not have yet (by title, among the library's songs on that album). */
export async function missingTracks(user: User, id: number, songs?: Song[]): Promise<AlbumTrack[]> {
	const tracks = await cached(`tracks:${id}`, () => albumTracks(id));
	if (!tracks.length) return [];
	if (!songs) {
		const { searchResult3 } = await sub<{ searchResult3: { song?: Song[] } }>(user, 'search3', {
			query: tracks[0].album,
			songCount: 500,
			albumCount: 0,
			artistCount: 0
		});
		songs = (searchResult3.song ?? []).filter((song) => song.album && norm(albumName(song.album)) === norm(tracks[0].album));
	}
	return tracks.filter((track) => !songs.some((song) => sameSong(song.title, track.title)));
}

/** Albums and songs out there for a search, to add. Either may fail alone; the page says so. */
export async function lookOutside(q: string): Promise<{ albums: OutsideAlbum[]; videos: YouTubeResult[]; failed: boolean }> {
	const key = q.toLowerCase();
	const [albums, videos] = await Promise.allSettled([
		cached(`albums:${key}`, () => searchAlbums(q)),
		process.env.YATTEE_URL ? cached(`videos:${key}`, () => searchYouTube(q)) : Promise.resolve([])
	]);
	for (const result of [albums, videos]) if (result.status === 'rejected') console.warn('[search] outside search failed', result.reason);
	return {
		albums: albums.status === 'fulfilled' ? albums.value : [],
		videos: videos.status === 'fulfilled' ? videos.value : [],
		failed: albums.status === 'rejected' || videos.status === 'rejected'
	};
}
