import type { RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { userRestUrl } from '#lib/server/navidrome';
import { pipe } from '#lib/server/proxy';

// The file as stored (no transcoding): the library is m4a/mp3/flac, all of which browsers play.
// Kept for an hour, so a replay or a seek back does not download it again.
export const GET: RequestHandler = ({ params, request, locals }) =>
	pipe(userRestUrl(apiUser(locals), 'stream', { id: params.id, format: 'raw' }), request, 'private, max-age=3600');
