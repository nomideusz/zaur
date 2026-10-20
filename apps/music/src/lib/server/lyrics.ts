/**
 * A song's lyrics: the library's own first (in the file's tags, or a .lrc
 * beside it), else LRCLIB's, which has timed lines for many songs and needs
 * no key (lrclib.net).
 */
import { cached } from './albums';
import { sub } from './navidrome';
import type { Lyrics, Song, User } from '#lib/types';

interface Structured {
	synced: boolean;
	/** ms; positive shows the lines sooner (OpenSubsonic). */
	offset?: number;
	line?: { start?: number; value: string }[];
}

interface Lrclib {
	duration?: number;
	instrumental?: boolean;
	plainLyrics?: string | null;
	syncedLyrics?: string | null;
}

/** "[01:02.34] words" lines, in time order; a line sung twice has two stamps. Tags like [ar:…] are dropped. */
export function parseLrc(lrc: string): Lyrics['lines'] {
	const lines: Lyrics['lines'] = [];
	for (const row of lrc.split('\n')) {
		const text = row.replace(/\[[^\]]*\]/g, '').trim();
		for (const [, m, s] of row.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)) lines.push({ start: Math.round((Number(m) * 60 + Number(s)) * 1000), text });
	}
	return lines.sort((a, b) => a.start! - b.start!);
}

async function fromLrclib(song: Song): Promise<Lyrics | null> {
	const query = new URLSearchParams({ track_name: song.title, artist_name: song.artist ?? '' });
	const response = await fetch(`https://lrclib.net/api/search?${query}`, {
		headers: { 'User-Agent': 'ZaurMusic/1.0 (+https://music.zaur.app)' },
		signal: AbortSignal.timeout(8000)
	});
	if (!response.ok) throw new Error(`LRCLIB answered ${response.status}`);
	// The same recording: within a few seconds of ours (a live take or an edit is not). Timed ones first.
	const hits = ((await response.json()) as Lrclib[]).filter(
		(hit) => !hit.instrumental && (!song.duration || !hit.duration || Math.abs(hit.duration - song.duration) <= 3)
	);
	const timed = hits.find((hit) => hit.syncedLyrics);
	if (timed) return { synced: true, source: 'lrclib', lines: parseLrc(timed.syncedLyrics!) };
	const plain = hits.find((hit) => hit.plainLyrics)?.plainLyrics;
	return plain ? { synced: false, source: 'lrclib', lines: plain.split('\n').map((text) => ({ text: text.trim() })) } : null;
}

/** null when nobody has them. */
export const lyricsOf = (user: User, id: string) =>
	cached(`lyrics:${id}`, async (): Promise<Lyrics | null> => {
		const [{ song }, { lyricsList }] = await Promise.all([
			sub<{ song: Song }>(user, 'getSong', { id }),
			sub<{ lyricsList: { structuredLyrics?: Structured[] } }>(user, 'getLyricsBySongId', { id })
		]);
		const all = lyricsList.structuredLyrics ?? [];
		const own = all.find((lyrics) => lyrics.synced && lyrics.line?.length) ?? all.find((lyrics) => lyrics.line?.length);
		if (!own) return fromLrclib(song);
		return {
			synced: own.synced,
			source: 'library',
			lines: own.line!.map((line) => ({ start: own.synced ? (line.start ?? 0) - (own.offset ?? 0) : undefined, text: line.value }))
		};
	});
