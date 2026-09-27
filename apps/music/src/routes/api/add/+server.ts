import { error, json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { addJob, jobsFor, videoIdFrom } from '#lib/server/youtube';

export const GET: RequestHandler = ({ locals }) => json(jobsFor(apiUser(locals).email));

/** { url } — a YouTube or Bartube link, or text with one in it (a phone's share). */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { url } = (await request.json().catch(() => ({}))) as { url?: string };
	const videoId = typeof url === 'string' ? videoIdFrom(url) : null;
	if (!videoId) error(400, 'That does not look like a YouTube or Bartube video link.');
	return json(addJob(videoId, apiUser(locals).email));
};
