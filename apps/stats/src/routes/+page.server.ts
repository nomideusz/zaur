import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { overview } from '#lib/server/report';
import { SITES } from '#lib/sites';

export const load: PageServerLoad = async ({ depends }) => {
	depends('stats:data');
	const line = overview(getDb());
	const sites = SITES.map((s) => ({ id: s.id, name: s.name, ...line(s.id) }));
	return { sites };
};
