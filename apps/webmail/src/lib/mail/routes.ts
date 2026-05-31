export const INBOX_MAILBOX_ROUTE_ID = 'inbox';

/** Reserved first segments under `/mail` (static routes and folder slugs). */
export const MAIL_ROUTE_SEGMENTS = {
	compose: 'compose',
	search: 'search',
	inbox: INBOX_MAILBOX_ROUTE_ID,
	drafts: 'drafts',
	sent: 'sent',
	archive: 'archive',
	junk: 'junk',
	trash: 'trash',
	important: 'important',
	scheduled: 'scheduled',
	memos: 'memos',
	snoozed: 'snoozed'
} as const;

const FOLDER_ROUTE_IDS = new Set<string>([
	MAIL_ROUTE_SEGMENTS.drafts,
	MAIL_ROUTE_SEGMENTS.sent,
	MAIL_ROUTE_SEGMENTS.archive,
	MAIL_ROUTE_SEGMENTS.junk,
	MAIL_ROUTE_SEGMENTS.trash,
	MAIL_ROUTE_SEGMENTS.important,
	MAIL_ROUTE_SEGMENTS.scheduled,
	MAIL_ROUTE_SEGMENTS.memos,
	MAIL_ROUTE_SEGMENTS.snoozed
]);

function encodeRouteSegment(value: string): string {
	return encodeURIComponent(value);
}

export function mailListHref(mailboxRouteId: string): string {
	if (mailboxRouteId === INBOX_MAILBOX_ROUTE_ID) return '/';
	return `/mail/${encodeRouteSegment(mailboxRouteId)}`;
}

export function mailThreadHref(
	mailboxRouteId: string,
	threadId: string,
	searchParams?: URLSearchParams | string
): string {
	const encodedThreadId = encodeRouteSegment(threadId);
	const base =
		mailboxRouteId === INBOX_MAILBOX_ROUTE_ID
			? `/mail/inbox/${encodedThreadId}`
			: `/mail/${encodeRouteSegment(mailboxRouteId)}/${encodedThreadId}`;
	if (!searchParams) return base;
	const qs = typeof searchParams === 'string' ? searchParams : searchParams.toString();
	return qs ? `${base}?${qs}` : base;
}

export function isMailPath(pathname: string): boolean {
	return pathname === '/' || pathname.startsWith('/mail');
}

export function isFolderRouteId(routeId: string): boolean {
	return FOLDER_ROUTE_IDS.has(routeId);
}

export function parseMailContext(pathname: string): {
	kind: 'mailbox' | 'search';
	mailboxRouteId: string | null;
	threadId: string | null;
} | null {
	if (pathname === '/') {
		return { kind: 'mailbox', mailboxRouteId: INBOX_MAILBOX_ROUTE_ID, threadId: null };
	}

	const parts = pathname.split('/').filter(Boolean);
	if (parts[0] !== 'mail') return null;
	if (parts[1] === 'compose') return null;

	if (parts[1] === 'search') {
		return { kind: 'search', mailboxRouteId: null, threadId: parts[2] ?? null };
	}

	const mailboxRouteId = parts[1] ?? null;
	if (!mailboxRouteId) return null;

	const threadId = parts[2] ? decodeURIComponent(parts[2]) : null;
	return { kind: 'mailbox', mailboxRouteId, threadId };
}
