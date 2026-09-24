import { CATEGORIES, CATEGORY_OTHER, categoryKeyword, categoryLabel } from '@zaur/mail-core';

/**
 * The list's filter: everything, only unseen, or one label. A label is a
 * keyword the message carries — your flag, the server's "important", or a
 * category (`cat.<id>`) — so it narrows the open folder rather than replacing it.
 */
export type ListFilter = 'all' | 'unseen' | 'flagged' | 'important' | `cat:${string}`;

/** The sidebar's Labels, in the order a row's chip ranks them. "Other" is nothing in particular. */
export const LABEL_FILTERS: ListFilter[] = [
	'important',
	'flagged',
	...CATEGORIES.filter((category) => category.id !== CATEGORY_OTHER).map(
		(category): ListFilter => `cat:${category.id}`
	)
];

/** The keyword a filter narrows to; none for All and Unseen. */
export function filterKeyword(filter: ListFilter | undefined): string | undefined {
	if (filter === 'flagged') return '$flagged';
	if (filter === 'important') return '$important';
	if (filter?.startsWith('cat:')) return categoryKeyword(filter.slice(4));
	return undefined;
}

const NAMES: Record<string, string> = { all: 'All', unseen: 'Unseen', flagged: 'Flagged', important: 'Important' };

export function filterName(filter: ListFilter): string {
	return filter.startsWith('cat:') ? categoryLabel(filter.slice(4)) : (NAMES[filter] ?? filter);
}
