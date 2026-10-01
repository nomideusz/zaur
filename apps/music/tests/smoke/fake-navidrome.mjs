/**
 * Smoke-test helper: a fake Navidrome (the Subsonic calls this app makes) and a
 * fake Yattee (search + one downloadable video), so the app runs signed in
 * without touching the real library.
 *
 *   node tests/smoke/fake-navidrome.mjs                 # :4599 (FAKE_NAVIDROME_PORT)
 *   node --env-file-if-exists=.env --import tsx tests/smoke/seed-session.ts   # prints the cookie
 *   NAVIDROME_URL=http://127.0.0.1:4599 NAVIDROME_USER_KEY=smoke \
 *   YATTEE_URL=http://127.0.0.1:4599 MUSIC_DIR=/tmp/music-smoke pnpm dev
 *
 * Any username/password is accepted. Songs are short sine tones (8–40 s, so
 * the queue advances while you watch), covers are generated SVGs, a few albums
 * have no cover, and some names are long or Polish to stress the layout.
 * Adding a video needs ffmpeg on the PATH (the fake makes its download with it);
 * video id `fakevideo07` fails on purpose.
 * Stars, play counts and playlists live in memory. The seeded playlists belong
 * to smoke@zaur.app (seed-session's address), one to someone else (read-only).
 */
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_NAVIDROME_PORT) || 4599;
const BASE = `http://127.0.0.1:${PORT}`;

const ARTISTS = [
	['Kasia Lins', ['Moja wina', 'Omen', 'Take My Tears']],
	['The Very Long Named Orchestra of Northern Lower Silesia and Friends', ['Symphony No. 5 in C minor, Op. 67 — Complete Recording with Rehearsal Takes and Commentary (Deluxe Remaster)']],
	['Łąki Łan', ['ŁąkiŁanda', 'Armanda', 'Syntonia']],
	['Boards of Canada', ['Music Has the Right to Children', 'Geogaddi', 'The Campfire Headphase', 'Tomorrow’s Harvest']],
	['Hania Rani', ['Esja', 'Home', 'Ghosts']],
	['YouTube rips', ['[Unknown Album]']],
	['Khruangbin', ['The Universe Smiles Upon You', 'Con Todo El Mundo', 'Mordechai', 'A La Sala']],
	['Ólafur Arnalds', ['re:member', 'some kind of peace']],
	['Bicep', ['Bicep', 'Isles']],
	['Mitski', ['Puberty 2', 'Be the Cowboy', 'Laurel Hell']],
	['A', ['B']]
];
const WORDS = 'night river glass echo slow żółta łódź neon static garden paper moon ocean thread amber signal winter hollow ćma'.split(' ');

const artists = [];
const albums = [];
const songs = new Map();
let seed = 7;
const rand = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
const title = () => Array.from({ length: 1 + rand(4) }, () => WORDS[rand(WORDS.length)]).join(' ').replace(/^./, (c) => c.toUpperCase());

ARTISTS.forEach(([name, names], a) => {
	const artist = { id: `ar-${a}`, name, albumCount: names.length, coverArt: `ar-${a}` };
	artists.push(artist);
	names.forEach((albumName, b) => {
		const id = `al-${a}-${b}`;
		// One big album, one single, the rest ordinary; every fifth album has no cover.
		const count = a === 1 ? 42 : name === 'A' ? 1 : 3 + rand(10);
		const cover = albums.length % 5 === 4 ? undefined : id;
		const song = Array.from({ length: count }, (_, i) => {
			const s = {
				id: `so-${a}-${b}-${i}`,
				title: i === 2 ? `${title()} (feat. Someone With A Rather Long Name) [Live at the Philharmonic, 2019 Remaster]` : title(),
				artist: name,
				artistId: artist.id,
				album: albumName,
				albumId: id,
				coverArt: cover,
				duration: 8 + rand(33),
				// The big album is two discs, numbered 1–21 each, as real tags are.
				track: a === 1 ? (i % 21) + 1 : i + 1,
				discNumber: a === 1 && i >= 21 ? 2 : 1,
				year: 1998 + rand(27),
				// Most measured (loud, like real masters), some not yet: the player evens them out.
				replayGain: i % 4 === 3 ? {} : { trackGain: -10 + rand(14), trackPeak: 0.9 },
				contentType: 'audio/wav',
				suffix: 'wav'
			};
			songs.set(s.id, s);
			return s;
		});
		albums.push({
			id,
			name: albumName,
			artist: name,
			artistId: artist.id,
			coverArt: cover,
			songCount: count,
			duration: song.reduce((sum, s) => sum + s.duration, 0),
			year: song[0].year,
			created: new Date(Date.UTC(2026, 0, 1 + albums.length)).toISOString(),
			playCount: rand(50),
			song
		});
	});
});

const all = [...songs.values()];
const ME = 'smoke@zaur.app';
const playlists = [
	{ id: 'pl-1', name: 'Morning', owner: ME, entry: all.filter((_, i) => i % 9 === 0) },
	{ id: 'pl-2', name: 'A playlist with a fairly long name that should truncate somewhere sensible', owner: ME, entry: all.filter((_, i) => i % 23 === 0) },
	{ id: 'pl-3', name: 'Empty', owner: ME, entry: [] },
	{ id: 'pl-4', name: 'Everything', owner: ME, entry: all },
	{ id: 'pl-5', name: 'Shared by Ola', owner: 'ola@zaur.app', public: true, entry: all.filter((_, i) => i % 31 === 0) }
];
let made = 0;
/** A Subsonic failure (70 not found, 50 not allowed), thrown out of a method. */
const fail = (code, message) => Object.assign(new Error(message), { code });
function owned(q, key) {
	const playlist = playlists.find((p) => p.id === q.get(key));
	if (!playlist) throw fail(70, 'The requested data was not found.');
	if (playlist.owner !== q.get('u')) throw fail(50, 'User is not authorized for the given operation.');
	return playlist;
}
const starred = new Map([all[3], all[11], all[40], albums[2]].map((item) => [item.id, new Date().toISOString()]));

const withStar = (item) => (starred.has(item.id) ? { ...item, starred: starred.get(item.id) } : item);
const bare = ({ song: _song, ...album }) => withStar(album);
const full = (album) => ({ ...withStar(album), song: album.song.map(withStar) });
const listed = ({ entry, ...p }) => ({ ...p, songCount: entry.length, duration: entry.reduce((sum, s) => sum + s.duration, 0), coverArt: entry[0]?.coverArt });

const SORTS = {
	newest: (a, b) => b.created.localeCompare(a.created),
	recent: (a, b) => b.playCount - a.playCount,
	frequent: (a, b) => b.playCount - a.playCount,
	alphabeticalByName: (a, b) => a.name.localeCompare(b.name),
	alphabeticalByArtist: (a, b) => a.artist.localeCompare(b.artist),
	random: () => rand(3) - 1
};

const METHODS = {
	ping: () => ({}),
	getAlbumList2: (q) => {
		const size = Number(q.get('size')) || 10;
		const offset = Number(q.get('offset')) || 0;
		const type = q.get('type');
		const list = type === 'starred' ? albums.filter((a) => starred.has(a.id)) : albums.toSorted(SORTS[type] ?? SORTS.newest);
		return { albumList2: { album: list.slice(offset, offset + size).map(bare) } };
	},
	getAlbum: (q) => {
		const album = albums.find((a) => a.id === q.get('id'));
		return album ? { album: full(album) } : null;
	},
	getArtists: () => {
		const index = new Map();
		for (const artist of artists.toSorted((a, b) => a.name.localeCompare(b.name))) {
			const letter = artist.name[0].toUpperCase();
			index.set(letter, [...(index.get(letter) ?? []), artist]);
		}
		return { artists: { ignoredArticles: 'The', index: [...index].map(([name, artist]) => ({ name, artist })) } };
	},
	getArtist: (q) => {
		const artist = artists.find((a) => a.id === q.get('id'));
		return artist ? { artist: { ...artist, album: albums.filter((a) => a.artistId === artist.id).map(bare) } } : null;
	},
	getPlaylists: () => ({ playlists: { playlist: playlists.map(listed) } }),
	getPlaylist: (q) => {
		const playlist = playlists.find((p) => p.id === q.get('id'));
		return playlist ? { playlist: { ...listed(playlist), entry: playlist.entry.map(withStar) } } : null;
	},
	getStarred2: () => ({
		starred2: {
			song: all.filter((s) => starred.has(s.id)).map(withStar),
			album: albums.filter((a) => starred.has(a.id)).map(bare)
		}
	}),
	getRandomSongs: (q) => ({ randomSongs: { song: all.toSorted(() => rand(3) - 1).slice(0, Number(q.get('size')) || 10).map(withStar) } }),
	search3: (q) => {
		const words = (q.get('query') ?? '').replaceAll('"', '').toLowerCase();
		const has = (text) => text.toLowerCase().includes(words);
		const take = (list, key) => list.slice(0, Number(q.get(key)) || 20);
		return {
			searchResult3: {
				artist: take(artists.filter((a) => has(a.name)), 'artistCount'),
				album: take(albums.filter((a) => has(a.name)), 'albumCount').map(bare),
				song: take(all.filter((s) => has(s.title)), 'songCount').map(withStar)
			}
		};
	},
	createPlaylist: (q) => {
		const playlist = { id: `pl-new-${++made}`, name: q.get('name') ?? 'Untitled', owner: q.get('u'), entry: q.getAll('songId').map((id) => songs.get(id)).filter(Boolean) };
		playlists.push(playlist);
		return { playlist: { ...listed(playlist), entry: playlist.entry } };
	},
	updatePlaylist: (q) => {
		const playlist = owned(q, 'playlistId');
		if (q.get('name')) playlist.name = q.get('name');
		// Highest index first, so the earlier ones still point at the same songs.
		const gone = q.getAll('songIndexToRemove').map(Number).sort((a, b) => b - a);
		playlist.entry = [...playlist.entry]; // "Everything" shares the library's own array
		for (const index of gone) playlist.entry.splice(index, 1);
		playlist.entry.push(...q.getAll('songIdToAdd').map((id) => songs.get(id)).filter(Boolean));
		return {};
	},
	deletePlaylist: (q) => (playlists.splice(playlists.indexOf(owned(q, 'id')), 1), {}),
	star: (q) => (q.getAll('id').concat(q.getAll('albumId')).forEach((id) => starred.set(id, new Date().toISOString())), {}),
	unstar: (q) => (q.getAll('id').concat(q.getAll('albumId')).forEach((id) => starred.delete(id)), {}),
	scrobble: () => ({}),
	startScan: () => ({ scanStatus: { scanning: true, count: all.length } }),
	getScanStatus: () => ({ scanStatus: { scanning: false, count: all.length } })
};

/** A sine tone as 8-bit mono PCM WAV: plays everywhere, needs no encoder. */
function tone(seconds, hz) {
	const rate = 8000;
	const n = seconds * rate;
	const wav = Buffer.alloc(44 + n);
	wav.write('RIFF', 0);
	wav.writeUInt32LE(36 + n, 4);
	wav.write('WAVEfmt ', 8);
	wav.writeUInt32LE(16, 16);
	wav.writeUInt16LE(1, 20);
	wav.writeUInt16LE(1, 22);
	wav.writeUInt32LE(rate, 24);
	wav.writeUInt32LE(rate, 28);
	wav.writeUInt16LE(1, 32);
	wav.writeUInt16LE(8, 34);
	wav.write('data', 36);
	wav.writeUInt32LE(n, 40);
	for (let i = 0; i < n; i++) wav[44 + i] = 128 + Math.round(40 * Math.sin((2 * Math.PI * hz * i) / rate));
	return wav;
}

// What "Add from YouTube" downloads: real AAC, because the app copies the stream into an .m4a untouched.
let m4a;
const download = () =>
	(m4a ??= execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=10', '-c:a', 'aac', '-f', 'ipod', '-movflags', 'frag_keyframe+empty_moov', 'pipe:1'], { maxBuffer: 1 << 24 }));

const hue = (id) => [...id].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) % 360, 7);
const cover = (id) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="hsl(${hue(id)} 55% 45%)"/><circle cx="${60 + (hue(id) % 180)}" cy="150" r="90" fill="hsl(${(hue(id) + 40) % 360} 70% 65%)"/><text x="16" y="284" font-family="monospace" font-size="20" fill="#fff">${id}</text></svg>`;

function sendBytes(req, res, type, body) {
	const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
	if (!range) return res.writeHead(200, { 'content-type': type, 'content-length': body.length, 'accept-ranges': 'bytes' }).end(body);
	const start = range[1] ? Number(range[1]) : body.length - Number(range[2]);
	const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
	res
		.writeHead(206, {
			'content-type': type,
			'content-length': end - start + 1,
			'content-range': `bytes ${start}-${end}/${body.length}`,
			'accept-ranges': 'bytes'
		})
		.end(body.subarray(start, end + 1));
}

const json = (res, body, status = 200) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
const subsonic = (res, body) => json(res, { 'subsonic-response': { status: 'ok', version: '1.16.1', type: 'navidrome', ...body } });

// Yattee's side: search hits (with a short and a live stream the app should drop) and one video.
const hits = (words) => [
	...Array.from({ length: 8 }, (_, i) => ({
		type: 'video',
		videoId: `fakevideo${String(i).padStart(2, '0')}`,
		title: i === 1 ? `${words} — an extremely long video title that goes on and on (Official Video) [4K Remaster] with extra words` : `${words} result ${i + 1} (Official Video)`,
		author: i % 2 ? 'Some Channel - Topic' : 'A Channel With A Long Name VEVO',
		lengthSeconds: 95 + i * 47
	})),
	{ type: 'video', videoId: 'fakeshort00', title: 'a short', author: 'x', lengthSeconds: 20, isShort: true },
	{ type: 'video', videoId: 'fakelive000', title: 'a live stream', author: 'x', lengthSeconds: 0, liveNow: true }
];

createServer((req, res) => {
	const url = new URL(req.url, BASE);
	const rest = /^\/rest\/(\w+?)(?:\.view)?$/.exec(url.pathname)?.[1];
	if (rest) console.log(`[fake-navidrome] ${rest} ${url.searchParams.get('id') ?? url.searchParams.get('type') ?? url.searchParams.get('query') ?? ''}`);
	if (rest === 'stream') {
		const song = songs.get(url.searchParams.get('id'));
		if (!song) return res.writeHead(404).end();
		return sendBytes(req, res, 'audio/wav', tone(song.duration, 220 + (hue(song.id) % 12) * 40));
	}
	if (rest === 'getCoverArt') return sendBytes(req, res, 'image/svg+xml', Buffer.from(cover(url.searchParams.get('id') ?? '')));
	if (rest) {
		let failure = fail(70, 'The requested data was not found.');
		try {
			const body = METHODS[rest]?.(url.searchParams);
			if (body) return subsonic(res, body);
		} catch (error) {
			failure = error;
		}
		return json(res, { 'subsonic-response': { status: 'failed', version: '1.16.1', error: { code: failure.code ?? 0, message: failure.message } } });
	}
	if (url.pathname === '/api/v1/search') return json(res, hits(url.searchParams.get('q') ?? ''));
	const video = /^\/api\/v1\/videos\/([\w-]{11})$/.exec(url.pathname)?.[1];
	if (video === 'fakevideo07') return json(res, { error: 'This video is unavailable' }, 500);
	if (video)
		return json(res, {
			videoId: video,
			title: `Fake Artist - Fake Song ${video.slice(-2)} (Official Video)`,
			author: 'Fake Artist - Topic',
			published: 1700000000,
			videoThumbnails: [],
			adaptiveFormats: [{ type: 'audio/mp4; codecs="mp4a.40.2"', url: `${BASE}/download/${video}`, bitrate: 64000, clen: String(download().length) }]
		});
	if (url.pathname.startsWith('/download/')) return sendBytes(req, res, 'audio/mp4', download());
	// Navidrome's native API: the admin login and user creation the app falls back to.
	if (url.pathname === '/auth/login') return json(res, { token: 'fake' });
	if (url.pathname.startsWith('/api/user')) return json(res, req.method === 'GET' ? [] : {});
	res.writeHead(404).end();
}).listen(PORT, '127.0.0.1', () => console.log(`fake Navidrome + Yattee listening on ${BASE} (${albums.length} albums, ${all.length} songs)`));
