import { error, isHttpError, json, type RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { lyricsOf } from '#lib/server/lyrics';

/** A song's lyrics, or null when nobody has them. */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		return json(await lyricsOf(apiUser(locals), params.id!));
	} catch (cause) {
		if (isHttpError(cause)) throw cause;
		console.warn('[lyrics] LRCLIB failed', cause);
		error(502, 'Lyrics are not answering.');
	}
};
