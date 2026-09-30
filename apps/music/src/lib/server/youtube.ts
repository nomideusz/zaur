/**
 * "Add from YouTube": yt-dlp fetches the audio (and the thumbnail as cover
 * art), we tag it and file it under <MUSIC_DIR>/YouTube/<artist>/, and
 * Navidrome picks it up on a scan. One download at a time.
 *
 * YouTube/ is in the library folder's Syncthing .stignore on the server: that
 * folder is receive-only, and Syncthing would otherwise count these files as
 * local changes, and reverting those deletes them.
 *
 * With YATTEE_URL set, Yattee Server does the YouTube part instead: its yt-dlp
 * runs signed in on another host, past the bot check this server's IP gets.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import type { AddJob, YouTubeResult } from '#lib/types';
import { adminSub } from '#lib/server/navidrome';
import { findUpload, type AlbumTrack } from '#lib/server/albums';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The video in a pasted link or shared text: YouTube's own URLs (watch?v=,
 * youtu.be, shorts, embed, live, music.youtube) and Bartube's /watch/<id>.
 */
export function videoIdFrom(input: string): string | null {
	const text = input.trim();
	if (VIDEO_ID.test(text)) return text;
	const link = text.match(/https?:\/\/\S+/)?.[0];
	const url = link ? URL.parse(link) : null;
	if (!url) return null;
	const v = url.searchParams.get('v');
	if (v && VIDEO_ID.test(v)) return v;
	const parts = url.pathname.split('/').filter(Boolean);
	if (url.hostname === 'youtu.be' && VIDEO_ID.test(parts[0] ?? '')) return parts[0];
	if (['watch', 'shorts', 'embed', 'live', 'v'].includes(parts[0] ?? '') && VIDEO_ID.test(parts[1] ?? '')) return parts[1];
	return null;
}

/** yt-dlp's info dict, the fields tagging reads. */
export interface VideoInfo {
	id: string;
	title: string;
	track?: string;
	artist?: string;
	artists?: string[];
	album?: string;
	uploader?: string;
	channel?: string;
	release_year?: number;
	upload_date?: string;
}

// "(Official Video)", "[Lyrics]", "(4K Remaster)" and the like.
const NOISE = /\s*[([](?:official|lyrics?|audio|video|visuali[sz]er|hd|hq|4k|remaster|m\/?v)\b[^)\]]*[)\]]/gi;

/** How a song is filed: what tagsFor reads from a video, or what an album's tracklist says. */
export interface AlbumTags {
	artist: string;
	title: string;
	album: string;
	year?: string;
	albumArtist?: string;
	track?: number;
	disc?: number;
	/** The album's cover, instead of the video's thumbnail. */
	cover?: string;
}

export function tagsFor(info: VideoInfo): AlbumTags {
	const channel = (info.channel || info.uploader || 'Unknown artist').replace(/\s*-\s*Topic$/, '').replace(/VEVO$/, '').trim();
	let artist = info.artists?.length ? info.artists.join(', ') : info.artist;
	let title = info.track;
	if (!title) {
		// "Artist - Title" is how most music uploads are named.
		const split = info.title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
		if (split && !artist) [artist, title] = [split[1], split[2]];
		else title = info.title;
	}
	title = title.replace(NOISE, '').replace(/\s+/g, ' ').trim() || info.title;
	const year = info.release_year ? String(info.release_year) : info.upload_date?.slice(0, 4);
	// No album: file it as a single, so it gets its own tile with the thumbnail.
	return { artist: artist?.trim() || channel, title, album: info.album?.trim() || title, year };
}

const safeName = (s: string) =>
	s.replace(/[/\\:*?"<>|\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 100) || 'Untitled';

const youtubeDir = () => join(process.env.MUSIC_DIR?.trim() || '/music', 'YouTube');

/** An album's track has no video yet: it is looked up on YouTube when its turn comes. */
type Job = AddJob & { by: string; track?: AlbumTrack };
// ponytail: jobs live in memory — a restart forgets the list, not the files.
const jobs: Job[] = [];
let queue: Promise<void> = Promise.resolve();

const sameTrack = (a: AlbumTrack, b: AlbumTrack) =>
	a.album === b.album && a.albumArtist === b.albumArtist && a.disc === b.disc && a.track === b.track;

/** A video to add, by its ID, or an album's track to find on YouTube and add. */
export function addJob(what: string | AlbumTrack, email: string): AddJob {
	const mine = (j: Job) => j.by === email && (typeof what === 'string' ? j.videoId === what : !!j.track && sameTrack(j.track, what));
	const earlier = jobs.findIndex(mine);
	if (earlier >= 0) {
		if (jobs[earlier].status !== 'failed') return strip(jobs[earlier]);
		// A retry takes the failed attempt's place rather than adding a row.
		jobs.splice(earlier, 1);
	}
	const job: Job =
		typeof what === 'string'
			? { id: randomUUID(), videoId: what, by: email, status: 'queued', at: Date.now() }
			: { id: randomUUID(), by: email, track: what, title: what.title, artist: what.artist, album: what.album, status: 'queued', at: Date.now() };
	jobs.unshift(job);
	jobs.splice(500);
	queue = queue.then(() => run(job));
	return strip(job);
}

/** Try a failed row again, however it was added. */
export function retryJob(id: string, email: string): AddJob | null {
	const job = jobs.find((j) => j.id === id && j.by === email && j.status === 'failed');
	return job ? addJob(job.track ?? job.videoId!, email) : null;
}

export const jobsFor = (email: string): AddJob[] => jobs.filter((j) => j.by === email).map(strip);

/** Take a finished row off this person's list (a file it added stays in the library). */
export function removeJob(id: string, email: string): void {
	const at = jobs.findIndex((j) => j.id === id && j.by === email && (j.status === 'failed' || j.status === 'done'));
	if (at >= 0) jobs.splice(at, 1);
}

function strip({ by: _, track: __, ...job }: Job): AddJob {
	return job;
}

async function run(job: Job): Promise<void> {
	const work = await mkdtemp(join(tmpdir(), 'zaur-music-'));
	try {
		job.status = 'downloading';
		if (!job.videoId && job.track) {
			const upload = await findUpload(job.track);
			if (!upload) throw new Error('Not found on YouTube (not this take of it, anyway).');
			job.videoId = upload.videoId;
		}
		const existing = await findInLibrary(job.videoId!);
		if (existing) {
			Object.assign(job, { status: 'done', title: existing, error: 'Already in the library' });
			return;
		}
		const info = await download(job, work);
		const tags = job.track ?? tagsFor(info);
		Object.assign(job, { title: tags.title, artist: tags.artist });
		if (tags.cover) await save(tags.cover, join(work, 'cover-album.jpg')).catch((error) => console.warn('[add] no album cover', error));

		const files = await readdir(work);
		const audio = files.find((f) => f.startsWith('audio.') && /\.(m4a|mp4|aac|mp3|opus|ogg|webm)$/.test(f));
		const thumb = files.find((f) => f === 'cover-album.jpg') ?? files.find((f) => f.startsWith('audio.') && /\.(webp|jpe?g|png)$/.test(f));
		if (!audio) throw new Error('yt-dlp left no audio file');

		const input = ['-i', join(work, audio)];
		const art: string[] = [];
		if (thumb) {
			// YouTube thumbnails are 16:9; album art is square. Topic uploads carry the
			// square cover centred in the frame, so a centre crop finds it.
			await ffmpeg(['-i', join(work, thumb), '-vf', "crop='min(iw,ih)':'min(iw,ih)',scale=600:600", join(work, 'cover.jpg')]);
			input.push('-i', join(work, 'cover.jpg'));
			art.push('-map', '1:v', '-disposition:v:0', 'attached_pic');
		}
		const meta = {
			title: tags.title,
			artist: tags.artist,
			album_artist: tags.albumArtist ?? tags.artist,
			album: tags.album,
			date: tags.year,
			track: tags.track,
			disc: tags.disc,
			comment: `https://youtu.be/${info.id}`
		};
		const tagged = join(work, 'tagged.m4a');
		await ffmpeg([
			...input,
			'-map', '0:a', ...art, '-c', 'copy',
			...Object.entries(meta).flatMap(([key, value]) => (value ? ['-metadata', `${key}=${value}`] : [])),
			tagged
		]);

		// An album's tracks go together, in order: YouTube/<album artist>/<album>/03 Title [id].m4a.
		const folder = job.track
			? join(youtubeDir(), safeName(tags.albumArtist ?? tags.artist), safeName(tags.album))
			: join(youtubeDir(), safeName(tags.artist));
		const number = job.track && tags.track ? `${tags.disc ? `${tags.disc}-` : ''}${String(tags.track).padStart(2, '0')} ` : '';
		await mkdir(folder, { recursive: true });
		// Copy, not rename: the temp dir may sit on another filesystem.
		await copyFile(tagged, join(folder, `${number}${safeName(tags.title)} [${info.id}].m4a`));
		await adminSub('startScan').catch((error) => console.warn('[add] scan request failed', error));
		job.status = 'done';
	} catch (error) {
		console.error('[add] failed', job.videoId, error);
		job.status = 'failed';
		const message = error instanceof Error ? error.message.split('\n').at(-1) ?? '' : '';
		job.error = /not a bot|Sign in to confirm/.test(message)
			? 'YouTube wants this server to sign in first. Adding needs YouTube cookies set up (YTDLP_COOKIES).'
			: message.slice(0, 300) || 'Failed';
	} finally {
		await rm(work, { recursive: true, force: true });
	}
}

async function findInLibrary(videoId: string): Promise<string | null> {
	const files = await readdir(youtubeDir(), { recursive: true }).catch(() => [] as string[]);
	const hit = files.find((f) => f.includes(`[${videoId}]`));
	return hit ? hit.split('/').at(-1)!.replace(/^(?:\d+-)?\d+ /, '').replace(/ \[[^\]]+\]\.\w+$/, '') : null;
}

function download(job: Job, work: string): Promise<VideoInfo> {
	if (yatteeUrl()) return downloadViaYattee(job, work);
	const args = [
		'--no-playlist',
		'--js-runtimes', 'node',
		'-f', 'bestaudio[ext=m4a]/bestaudio',
		'-x', '--audio-format', 'm4a',
		'--write-thumbnail',
		'--no-mtime',
		'-o', join(work, 'audio.%(ext)s'),
		'--print', 'after_move:%()j',
		'--progress', '--newline',
		'--progress-template', 'download:progress %(progress._percent_str)s',
		`https://www.youtube.com/watch?v=${job.videoId}`
	];
	// YouTube asks datacenter IPs to sign in: a cookies.txt from a signed-in
	// browser gets past that. yt-dlp saves the refreshed cookies back to it.
	const cookies = process.env.YTDLP_COOKIES?.trim();
	if (cookies) args.unshift('--cookies', cookies);
	let info: VideoInfo | undefined;
	return tool(process.env.YTDLP_BIN || 'yt-dlp', args, 10 * 60_000, (line) => {
		if (line.startsWith('{')) info = JSON.parse(line) as VideoInfo;
		const percent = line.match(/^progress\s+([\d.]+)%/);
		if (percent) job.progress = Math.round(Number(percent[1]));
	}).then(() => {
		if (!info) throw new Error('yt-dlp gave no video info');
		return info;
	});
}

/** Yattee's Invidious-shaped video, the fields we read. */
interface YatteeVideo {
	videoId: string;
	title: string;
	author: string;
	published?: number;
	videoThumbnails?: { url: string; width?: number }[];
	adaptiveFormats?: { type: string; url: string; bitrate?: number | string; clen?: string }[];
}

const yatteeUrl = () => process.env.YATTEE_URL?.trim().replace(/\/+$/, '');

async function yattee<T>(path: string, timeoutMs = 120_000): Promise<T> {
	const login = Buffer.from(`${process.env.YATTEE_USER}:${process.env.YATTEE_PASSWORD}`).toString('base64');
	const response = await fetch(`${yatteeUrl()}${path}`, {
		headers: { authorization: `Basic ${login}` },
		signal: AbortSignal.timeout(timeoutMs)
	});
	if (!response.ok) {
		const text = await response.text();
		// Yattee explains itself in JSON ({"error": "This video is unavailable"}): say that, not the envelope.
		let reason: unknown;
		try {
			reason = JSON.parse(text).error;
		} catch {
			// Not JSON: a proxy's error page.
		}
		throw new Error(typeof reason === 'string' && reason ? reason : `Yattee: ${response.status} ${text.slice(0, 200)}`);
	}
	return (await response.json()) as T;
}

/** YouTube's videos for a search, through Yattee. Shorts and live streams aren't songs. */
export async function searchYouTube(query: string): Promise<YouTubeResult[]> {
	if (!yatteeUrl()) throw new Error('Searching YouTube needs Yattee (YATTEE_URL).');
	type Hit = YouTubeResult & { type: string; lengthSeconds: number; isShort?: boolean; liveNow?: boolean };
	const hits = await yattee<Hit[]>(`/api/v1/search?${new URLSearchParams({ q: query, type: 'video' })}`, 30_000);
	return hits
		.filter((hit) => hit.type === 'video' && !hit.isShort && !hit.liveNow && hit.lengthSeconds > 0)
		.map(({ videoId, title, author, lengthSeconds }) => ({ videoId, title, author, seconds: lengthSeconds }));
}

/**
 * proxy_mode=download makes Yattee's stream URLs /proxy/fast/ ones: yt-dlp
 * fetches on Yattee's host and streams the file here, a token in the URL.
 */
async function downloadViaYattee(job: Job, work: string): Promise<VideoInfo> {
	const video = await yattee<YatteeVideo>(`/api/v1/videos/${job.videoId}?proxy=true&proxy_mode=download`);
	// AAC first: it goes into the .m4a without re-encoding.
	const aac = (type: string) => Number(type.startsWith('audio/mp4'));
	const audio = video.adaptiveFormats
		?.filter((f) => f.type.startsWith('audio/'))
		.sort((a, b) => aac(b.type) - aac(a.type) || Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0))[0];
	if (!audio) throw new Error('Yattee found no audio for this video');
	await save(audio.url, join(work, aac(audio.type) ? 'audio.m4a' : 'audio.webm'), job, Number(audio.clen));
	const thumb = video.videoThumbnails?.toSorted((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
	if (thumb) await save(thumb.url, join(work, 'audio.jpg')).catch((error) => console.warn('[add] no thumbnail', error));
	const uploaded = video.published ? new Date(video.published * 1000).toISOString().slice(0, 10).replaceAll('-', '') : undefined;
	return { id: video.videoId, title: video.title, channel: video.author, upload_date: uploaded };
}

async function save(url: string, file: string, job?: Job, size = 0): Promise<void> {
	const response = await fetch(url, { signal: AbortSignal.timeout(10 * 60_000) });
	if (!response.ok || !response.body) throw new Error(`Download failed (${response.status})`);
	const body = Readable.fromWeb(response.body as ReadableStream);
	let got = 0;
	if (job && size) body.on('data', (chunk: Buffer) => (job.progress = Math.round(((got += chunk.length) / size) * 100)));
	await pipeline(body, createWriteStream(file));
}

// ffmpeg's own words ("Error opening output files: Invalid argument") go to the log as the cause.
const ffmpeg = (args: string[]) =>
	tool('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], 120_000).catch((cause) => {
		throw new Error('Could not convert the audio.', { cause });
	});

/** Run a tool; resolves on exit 0, rejects with the tail of stderr otherwise. */
function tool(command: string, args: string[], timeoutMs: number, onLine?: (line: string) => void): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs });
		let errors = '';
		let buffer = '';
		child.stdout.on('data', (chunk: Buffer) => {
			buffer += chunk.toString();
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const line of lines) onLine?.(line.trim());
		});
		child.stderr.on('data', (chunk: Buffer) => {
			errors = (errors + chunk.toString()).slice(-2000);
		});
		child.on('error', reject);
		child.on('close', (code) => {
			if (buffer) onLine?.(buffer.trim());
			if (code === 0) resolve();
			else reject(new Error(errors.trim() || `${command} exited with ${code}`));
		});
	});
}
