/** Which visits and which period a page shows: the same two choices, read and linked the same way everywhere. */
/** Others and mine are people; all is both; bots are the views bots.ts took for programs. */
export type Who = 'others' | 'mine' | 'all' | 'bots';
export const DAYS = [1, 7, 30, 90] as const;

export const PERIODS: [number, string][] = [
	[1, 'Today'],
	[7, '7 days'],
	[30, '30 days'],
	[90, '90 days']
];
export const periodName = (days: number) => PERIODS.find(([d]) => d === days)?.[1] ?? `${days} days`;

type Query = Pick<URLSearchParams, 'get'>;
export const readWho = (q: Query): Who => {
	const w = q.get('who');
	return w === 'mine' || w === 'all' || w === 'bots' ? w : 'others';
};
export const readDays = (q: Query): number => {
	const asked = Number(q.get('days'));
	return (DAYS as readonly number[]).includes(asked) ? asked : 30;
};

/** How a period is drawn: the lines through the hours, or a column for each day. */
export type Chart = 'pulse' | 'days';
export const readChart = (q: Query): Chart => (q.get('chart') === 'days' ? 'days' : 'pulse');

/**
 * What a report can be narrowed to, by the name each has in the address, with the word
 * it is read by. Each is a list on the report, and a row of that list sets it;
 * `under` is set by a row of a site's parts.
 */
export const FILTERS = {
	// A page and every page under it, where the rest each name one thing exactly.
	under: 'pages under',
	path: 'page',
	source: 'from',
	ref: 'referrer',
	place: 'place',
	network: 'network',
	lang: 'language',
	system: 'system',
	screen: 'screen'
} as const;
export type Filter = keyof typeof FILTERS;
export type Filters = Partial<Record<Filter, string>>;
export const readFilters = (q: Query): Filters => {
	const found: Filters = {};
	for (const k of Object.keys(FILTERS) as Filter[]) {
		const value = q.get(k);
		if (value) found[k] = value;
	}
	return found;
};

/** The columns a visit log can run by, each with the way it runs when first chosen: true is smallest first. */
export const VISIT_SORTS = {
	when: false,
	site: true,
	page: true,
	from: true,
	where: true,
	network: true,
	device: true,
	time: false,
	read: false
} as const;
export type VisitSort = keyof typeof VISIT_SORTS;
export const VISITS_PER_PAGE = 100;
export interface VisitOrder {
	by: VisitSort;
	asc: boolean;
	/** The first page is 1. */
	page: number;
}
export const readVisitOrder = (q: Query): VisitOrder => {
	const asked = q.get('sort') ?? '';
	const by = Object.hasOwn(VISIT_SORTS, asked) ? (asked as VisitSort) : 'when';
	const dir = q.get('dir');
	const page = Number(q.get('page'));
	return { by, asc: dir === 'asc' ? true : dir === 'desc' ? false : VISIT_SORTS[by], page: Number.isInteger(page) && page > 1 ? page : 1 };
};
/** The log's part of an address, leaving out whatever is the default. */
export function visitQuery(o: VisitOrder): Record<string, string> {
	const q: Record<string, string> = { view: 'visits' };
	if (o.by !== 'when') q.sort = o.by;
	if (o.asc !== VISIT_SORTS[o.by]) q.dir = o.asc ? 'asc' : 'desc';
	if (o.page > 1) q.page = String(o.page);
	return q;
}

/** `site` null is the overview. There is no live overview, so its Live goes to all sites. */
export function viewHref(v: { site: string | null; who: Who; days: number; chart?: Chart; live?: boolean; extra?: Record<string, string | undefined> }): string {
	const q = new URLSearchParams();
	if (v.who !== 'others') q.set('who', v.who);
	if (!v.live && v.days !== 30) q.set('days', String(v.days));
	if (!v.live && v.chart === 'days') q.set('chart', 'days');
	for (const [k, value] of Object.entries(v.extra ?? {})) if (value != null) q.set(k, value);
	const path = v.live ? `/s/${v.site ?? 'all'}/live` : v.site ? `/s/${v.site}` : '/';
	return q.size ? `${path}?${q}` : path;
}
