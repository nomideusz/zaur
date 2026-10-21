import type { RequestHandler } from '@sveltejs/kit';
import { artistPicture } from '#lib/server/albums';
import { apiUser } from '#lib/server/auth';
import { sub, userRestUrl } from '#lib/server/navidrome';
import { pipe } from '#lib/server/proxy';
import type { Artist } from '#lib/types';

const SIZES = [96, 300, 600];
const WEEK = 'private, max-age=604800';
// Navidrome's stand-in for an artist with no photo is one small image at every size (546 bytes
// in 0.63); a real photo is kilobytes even at 96px.
const PLACEHOLDER_MAX = 1024;

export const GET: RequestHandler = async ({ params, url, request, locals }) => {
	const asked = Number(url.searchParams.get('size')) || 300;
	const size = SIZES.find((s) => s >= asked) ?? SIZES.at(-1)!;
	const user = apiUser(locals);
	const answer = await pipe(userRestUrl(user, 'getCoverArt', { id: params.id, size }), request, WEEK);
	// An artist Navidrome has no photo of (its agents found none): Deezer's, by the artist's name.
	const length = Number(answer.headers.get('content-length'));
	if (!params.id?.startsWith('ar-') || !answer.ok || !length || length > PLACEHOLDER_MAX) return answer;
	const id = params.id.slice(3).replace(/_[^_]*$/, '');
	const picture = await sub<{ artist: Artist }>(user, 'getArtist', { id })
		.then(({ artist }) => artistPicture(artist.name, size))
		.catch((cause) => void console.warn('[cover] no artist picture', cause));
	if (!picture) {
		// Navidrome's own stand-in, but not for a week: a photo may turn up (Navidrome's or Deezer's).
		answer.headers.set('cache-control', 'private, max-age=86400');
		return answer;
	}
	void answer.body?.cancel();
	return pipe(picture, request, WEEK);
};
