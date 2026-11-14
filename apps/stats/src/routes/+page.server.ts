import type { PageServerLoad } from './$types';
import { arrange } from '#lib/arrange';
import { getDb } from '#lib/server/db';
import { overview } from '#lib/server/report';
import { SITES } from '#lib/sites';
import { readChart, readDays, readWho } from '#lib/view';

export const load: PageServerLoad = async ({ depends, url, parent }) => {
	depends('stats:data');
	const { arrangement } = await parent();
	const who = readWho(url.searchParams);
	const days = readDays(url.searchParams);
	const line = overview(getDb(), Date.now(), { who, days });
	// Today's own column is left out on Today, where the period's count is the same figure.
	const sort = arrangement.sort === 'today' && days === 1 ? 'count' : arrangement.sort;
	const sites = arrange(
		SITES.map((s, i) => ({ id: s.id, name: s.name, no: i + 1, ...line(s.id) })),
		{ ...arrangement, sort }
	);
	return { sites, sort, asc: arrangement.asc, who, days, chart: readChart(url.searchParams), peak: line.peak, step: line.step, slots: line.slots, columnSlots: line.columnSlots, columnPeak: line.columnPeak, from: line.from, today: line.today, counts: line.counts };
};
