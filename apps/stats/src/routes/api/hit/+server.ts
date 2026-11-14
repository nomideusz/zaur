// The beacon (static/s.js). Which site it counts for comes from the Origin
// header, not the body, so a site cannot write under another's name by mistake.
// Always answers 204: a counter must never break a page or teach anyone anything.
import type { RequestHandler } from './$types';
import { hitHappened } from '#lib/server/bus';
import { getDb } from '#lib/server/db';
import { ipapiPlace, offlinePlace } from '#lib/server/geo';
import { clientIp } from '#lib/server/ip';
import { fillPlace, isOwnerIp, overLimit, recordHit } from '#lib/server/ingest';
import { secret } from '#lib/server/session';
import { siteForHost } from '#lib/sites';

const NOTHING = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export const POST: RequestHandler = async (event) => {
	const { request } = event;
	let host = '';
	try {
		host = new URL(request.headers.get('origin') ?? '').hostname;
	} catch {
		return NOTHING();
	}
	const site = siteForHost(host);
	if (!site) return NOTHING();
	const ip = clientIp(event);
	if (overLimit(ip)) return NOTHING();
	const raw = await request.text();
	if (raw.length > 8192) return NOTHING();
	let body: { id?: string } | undefined;
	try {
		body = JSON.parse(raw);
	} catch {
		return NOTHING();
	}
	try {
		const db = getDb();
		const done = recordHit(db, body, {
			site,
			host,
			ua: request.headers.get('user-agent') ?? '',
			owner: isOwnerIp(db, ip, secret()),
			place: offlinePlace(ip),
			ip
		});
		if (done) hitHappened(site.id);
		// Written first, asked after: an end beacon can come before the answer does.
		if (done === 'view' && site.lookup === 'ipapi' && body?.id) {
			const id = body.id;
			void ipapiPlace(ip).then((place) => {
				fillPlace(getDb(), site.id, id, place);
				hitHappened(site.id);
			});
		}
	} catch (err) {
		console.error('[hit]', (err as Error).message);
	}
	return NOTHING();
};
