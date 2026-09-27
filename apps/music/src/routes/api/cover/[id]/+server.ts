import type { RequestHandler } from '@sveltejs/kit';
import { apiUser } from '#lib/server/auth';
import { userRestUrl } from '#lib/server/navidrome';
import { pipe } from '#lib/server/proxy';

const SIZES = [96, 300, 600];

export const GET: RequestHandler = ({ params, url, request, locals }) => {
	const asked = Number(url.searchParams.get('size')) || 300;
	const size = SIZES.find((s) => s >= asked) ?? SIZES.at(-1);
	return pipe(userRestUrl(apiUser(locals), 'getCoverArt', { id: params.id, size }), request, 'private, max-age=604800');
};
