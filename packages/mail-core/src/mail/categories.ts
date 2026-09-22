/**
 * Content categories: what kind of thing a message is, as opposed to what
 * state it is in (seen, flagged). A category is a JMAP keyword `cat.<id>` on
 * the message, so it is set once and every client sees it — by a Sieve rule
 * at delivery (`addflag`), or by a classifier for mail no rule caught. A
 * message carries at most one; `other` means "looked at, nothing fits", which
 * is what keeps a classifier from looking again.
 */

export interface MailCategory {
	id: string;
	label: string;
	/** What belongs here — shown in Settings, and the criterion a classifier is given. */
	hint: string;
}

export const CATEGORY_OTHER = 'other';

export const CATEGORIES: MailCategory[] = [
	{
		id: 'receipts',
		label: 'Receipts',
		hint: 'Order confirmations, receipts, tickets, shipping and delivery updates for something bought'
	},
	{
		id: 'transactions',
		label: 'Transactions',
		hint: 'Bank, card and payment notices, invoices, subscription billing, exchange and wallet activity'
	},
	{
		id: 'newsletters',
		label: 'Newsletters',
		hint: 'Bulk mailings: newsletters, digests, marketing, promotions'
	},
	{
		id: 'notifications',
		label: 'Notifications',
		hint: 'Automated notices from a service or app: sign-in codes, password resets, alerts, social and build activity'
	}
];

const PREFIX = 'cat.';

export function isCategoryId(id: string): boolean {
	return id === CATEGORY_OTHER || CATEGORIES.some((category) => category.id === id);
}

export function categoryLabel(id: string): string {
	return CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

export function categoryKeyword(id: string): string {
	return PREFIX + id;
}

/** The category a message's keywords carry, if any (`other` included). */
export function categoryOf(keywords: Record<string, boolean> | undefined | null): string | undefined {
	for (const [keyword, on] of Object.entries(keywords ?? {})) {
		if (!on || !keyword.startsWith(PREFIX)) continue;
		const id = keyword.slice(PREFIX.length);
		if (isCategoryId(id)) return id;
	}
	return undefined;
}
