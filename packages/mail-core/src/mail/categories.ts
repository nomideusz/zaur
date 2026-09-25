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
	/** The neighbouring category this one is easily confused with — the classifier's side only. */
	notFor: string;
	/** A few subject lines that belong here — the classifier's side only. */
	examples: string[];
}

export const CATEGORY_OTHER = 'other';

export const CATEGORIES: MailCategory[] = [
	{
		id: 'receipts',
		label: 'Receipts',
		hint: 'Order confirmations, receipts, tickets, shipping and delivery updates for something bought',
		notFor: 'Money moving on its own: a card charge, a bill to pay, a statement — those are transactions',
		examples: ['Your order has shipped', 'Receipt for your ride', 'Your e-ticket for Friday']
	},
	{
		id: 'transactions',
		label: 'Transactions',
		hint: 'Bank, card and payment notices, invoices, subscription billing, exchange and wallet activity',
		notFor: 'Confirmation of something ordered, booked or delivered — that is a receipt',
		examples: ['Your card was charged €12.99', 'Invoice #4021 is due', 'Your monthly statement is ready']
	},
	{
		id: 'newsletters',
		label: 'Newsletters',
		hint: 'Bulk mailings: newsletters, digests, marketing, promotions',
		notFor: 'A notice about your own account or activity, even when it carries an unsubscribe link',
		examples: ['This week in Rust', '50% off ends tonight', 'Our October digest']
	},
	{
		id: 'notifications',
		label: 'Notifications',
		hint: 'Automated notices from a service or app: sign-in codes, password resets, alerts, social and build activity',
		notFor: 'Money or purchases (receipts, transactions) and promotional bulk mail (newsletters)',
		examples: ['Your verification code is 482913', 'Build failed on main', 'Anna mentioned you in a comment']
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
