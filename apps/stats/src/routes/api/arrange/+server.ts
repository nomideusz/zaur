import type { RequestHandler } from './$types';
import { wholeOrder } from '#lib/arrange';
import { getDb } from '#lib/server/db';
import { writeArrangement } from '#lib/server/prefs';

/** The overview's order. hooks.server.ts has already checked the sign-in and the origin. */
export const PUT: RequestHandler = async ({ request, locals }) => {
	const body = (await request.json().catch(() => null)) as { order?: unknown; ranked?: unknown } | null;
	if (!body || (body.order === undefined && typeof body.ranked !== 'boolean')) return new Response('Nothing to change', { status: 400 });
	writeArrangement(getDb(), locals.user!.email, {
		...(body.order !== undefined ? { order: wholeOrder(body.order) } : {}),
		...(typeof body.ranked === 'boolean' ? { ranked: body.ranked } : {})
	});
	return new Response(null, { status: 204 });
};
