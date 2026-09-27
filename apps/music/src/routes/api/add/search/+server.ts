import { error, json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { searchYouTube } from '#lib/server/youtube';

/** ?q= — YouTube's videos for these words, to add from. */
export const GET: RequestHandler = async ({ url, locals }) => {
	apiUser(locals);
	const q = url.searchParams.get('q')?.trim().slice(0, 200);
	if (!q) return json([]);
	if (!process.env.YATTEE_URL) error(501, 'Searching YouTube needs Yattee (YATTEE_URL).');
	try {
		return json(await searchYouTube(q));
	} catch (cause) {
		console.warn('[add] search failed', cause);
		error(502, 'YouTube search failed. Try again?');
	}
};
