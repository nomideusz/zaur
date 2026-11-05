import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db';
import { overview } from '#lib/server/report';
import { SITES } from '#lib/sites';
import { readChart, readDays, readWho } from '#lib/view';

export const load: PageServerLoad = async ({ depends, url }) => {
	depends('stats:data');
	const who = readWho(url.searchParams);
	const days = readDays(url.searchParams);
	const line = overview(getDb(), Date.now(), { who, days });
	const sites = SITES.map((s, i) => ({ id: s.id, name: s.name, no: i + 1, ...line(s.id) })).sort((a, b) => b.count - a.count || a.no - b.no);
	return { sites, who, days, chart: readChart(url.searchParams), peak: line.peak, step: line.step, slots: line.slots, columnSlots: line.columnSlots, columnPeak: line.columnPeak, from: line.from, today: line.today, counts: line.counts };
};
