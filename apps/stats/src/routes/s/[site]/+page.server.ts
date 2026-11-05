import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { DAYS, report, type Who } from '#lib/server/report';
import { siteById, siteUrl } from '#lib/sites';

export const load: PageServerLoad = async ({ params, url, depends }) => {
	depends('stats:data');
	const site = params.site === 'all' ? null : siteById(params.site);
	if (params.site !== 'all' && !site) error(404, 'No such site');
	const q = url.searchParams;
	const asked = Number(q.get('days'));
	const who: Who = q.get('who') === 'mine' ? 'mine' : q.get('who') === 'all' ? 'all' : 'others';
	const r = report(getDb(), {
		site: params.site,
		days: (DAYS as readonly number[]).includes(asked) ? asked : 30,
		who,
		tag: q.get('tag')
	});
	return { r, name: site?.name ?? 'All sites', origin: site ? siteUrl(site) : null };
};
