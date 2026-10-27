import { error, json, type RequestHandler } from '@sveltejs/kit';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { requestedTrack } from '#lib/server/albums';
import { addJob, jobsFor } from '#lib/server/youtube';

/**
 * Radio Bartek's request fetcher (radiobartek repo, subwave/request-fetcher): a song a
 * listener asked for that the library lacks. POST { artist, title? } finds it on Deezer
 * and adds it like an album's track; GET ?id= says how that job is doing. No session: a
 * bearer token, the one in FETCH_TOKEN_FILE (/data/fetch-token). No file, no endpoint.
 */
const BY = 'radio@radiobartek.com';

async function authorize(request: Request): Promise<void> {
	const token = (await readFile(process.env.FETCH_TOKEN_FILE || '/data/fetch-token', 'utf8').catch(() => '')).trim();
	if (!token) error(503, 'Fetching is not set up here.');
	const hash = (s: string) => createHash('sha256').update(s).digest();
	const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
	if (!timingSafeEqual(hash(given), hash(token))) error(401, 'Wrong token.');
}

export const GET: RequestHandler = async ({ request, url }) => {
	await authorize(request);
	return json(jobsFor(BY).find((job) => job.id === url.searchParams.get('id')) ?? error(404, 'No such job.'));
};

export const POST: RequestHandler = async ({ request }) => {
	await authorize(request);
	const { artist, title } = (await request.json().catch(() => ({}))) as { artist?: unknown; title?: unknown };
	if (typeof artist !== 'string' || !artist.trim()) error(400, 'Which artist?');
	if (!process.env.YATTEE_URL) error(501, 'Adding needs Yattee (YATTEE_URL).');
	const track = await requestedTrack(artist.trim().slice(0, 200), typeof title === 'string' && title.trim() ? title.trim().slice(0, 200) : undefined).catch(
		(cause) => {
			console.warn('[fetch] Deezer lookup failed', artist, title, cause);
			error(502, 'Could not look it up on Deezer.');
		}
	);
	if (!track) error(404, 'Not on Deezer.');
	// A mix or a whole live set is not a request the radio plays.
	if (track.seconds > 600) error(422, `${track.title} is longer than ten minutes.`);
	return json({ ...addJob(track, BY), title: track.title, artist: track.artist, album: track.album });
};
