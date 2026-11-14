import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { report } from '#lib/server/report';
import { siteById, siteUrl } from '#lib/sites';
import { readChart, readDays, readFilters, readVisitOrder, readWho } from '#lib/view';

export const load: PageServerLoad = async ({ params, url, depends }) => {
	depends('stats:data');
	const site = params.site === 'all' ? null : siteById(params.site);
	if (params.site !== 'all' && !site) error(404, 'No such site');
	const q = url.searchParams;
	const order = readVisitOrder(q);
	const r = report(getDb(), { site: params.site, days: readDays(q), who: readWho(q), tag: q.get('tag'), filters: readFilters(q), visits: order });
	return {
		r,
		name: site?.name ?? 'All sites',
		origin: site ? siteUrl(site) : null,
		detail: site ? site.detail !== false : true,
		parts: site?.parts ?? null,
		visits: q.get('view') === 'visits',
		order: { ...order, page: r.page },
		chart: readChart(q),
		counts: { mine: r.mineCount, others: r.othersCount }
	};
};
