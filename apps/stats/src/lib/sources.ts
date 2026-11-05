/** The words a source is read by; shared with the browser, so outside lib/server. */
export const SOURCES: Record<string, string> = {
	tagged: 'tagged link',
	mail: 'mail',
	social: 'social',
	search: 'search',
	ai: 'AI chat',
	own: 'our other sites',
	other: 'other sites',
	direct: 'direct',
	internal: 'within the site'
};

/** The five colours of a site's strip, always in this order, so position says as much as hue. */
export const SOURCE_GROUPS = [
	{ id: 'direct', label: 'direct' },
	{ id: 'search', label: 'search' },
	{ id: 'social', label: 'social' },
	{ id: 'ai', label: 'AI chat' },
	{ id: 'rest', label: 'tagged and other' }
] as const;
export type SourceGroup = (typeof SOURCE_GROUPS)[number]['id'];

/** A source's group, or null for a move within the site, which is not an arrival. */
export function groupOf(source: string): SourceGroup | null {
	if (source === 'internal') return null;
	return source === 'direct' || source === 'search' || source === 'social' || source === 'ai' ? source : 'rest';
}

export function groupRows(rows: [string, number][]): { id: SourceGroup; label: string; n: number }[] {
	const counts = new Map<SourceGroup, number>();
	for (const [k, n] of rows) {
		const g = groupOf(k);
		if (g) counts.set(g, (counts.get(g) ?? 0) + n);
	}
	return SOURCE_GROUPS.map((g) => ({ id: g.id, label: g.label, n: counts.get(g.id) ?? 0 })).filter((g) => g.n > 0);
}
