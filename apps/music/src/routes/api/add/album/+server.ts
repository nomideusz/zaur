import { error, json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { missingTracks } from '#lib/server/albums';
import { addJob, jobsFor } from '#lib/server/youtube';

/** { id } — a Deezer album: each of its tracks the library lacks is found on YouTube and added. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = apiUser(locals);
	const { id } = (await request.json().catch(() => ({}))) as { id?: unknown };
	if (!Number.isSafeInteger(id)) error(400, 'Which album?');
	if (!process.env.YATTEE_URL) error(501, 'Adding needs Yattee (YATTEE_URL).');
	const missing = await missingTracks(user, id as number).catch((cause) => {
		console.warn('[add] album lookup failed', id, cause);
		error(502, 'Could not look the album up. Try again?');
	});
	for (const track of missing) addJob(track, user.email);
	return json({ queued: missing.length, jobs: jobsFor(user.email) });
};
