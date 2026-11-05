/** Which visits and which period a page shows: the same two choices, read and linked the same way everywhere. */
export type Who = 'others' | 'mine' | 'all';
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
	return w === 'mine' || w === 'all' ? w : 'others';
};
export const readDays = (q: Query): number => {
	const asked = Number(q.get('days'));
	return (DAYS as readonly number[]).includes(asked) ? asked : 30;
};

/** `site` null is the overview. There is no live overview, so its Live goes to all sites. */
export function viewHref(v: { site: string | null; who: Who; days: number; live?: boolean; extra?: Record<string, string> }): string {
	const q = new URLSearchParams();
	if (v.who !== 'others') q.set('who', v.who);
	if (!v.live && v.days !== 30) q.set('days', String(v.days));
	for (const [k, value] of Object.entries(v.extra ?? {})) q.set(k, value);
	const path = v.live ? `/s/${v.site ?? 'all'}/live` : v.site ? `/s/${v.site}` : '/';
	return q.size ? `${path}?${q}` : path;
}
