import type { RequestHandler } from './$types';
import { readSort, wholeOrder } from '#lib/arrange';
import { getDb } from '#lib/server/db';
import { writeArrangement } from '#lib/server/prefs';

/** The overview's order. hooks.server.ts has already checked the sign-in and the origin. */
export const PUT: RequestHandler = async ({ request, locals }) => {
	const body = (await request.json().catch(() => null)) as { order?: unknown; sort?: unknown; asc?: unknown } | null;
	const sort = readSort(body?.sort);
	const asc = typeof body?.asc === 'boolean' ? body.asc : undefined;
	if (!body || (body.order === undefined && !sort && asc === undefined)) return new Response('Nothing to change', { status: 400 });
	writeArrangement(getDb(), locals.user!.email, {
		...(body.order !== undefined ? { order: wholeOrder(body.order) } : {}),
		...(sort ? { sort } : {}),
		...(asc !== undefined ? { asc } : {})
	});
	return new Response(null, { status: 204 });
};
