export const INBOX_MAILBOX_ROUTE_ID = 'inbox';

export function mailListHref(mailboxRouteId: string): string {
	if (mailboxRouteId === INBOX_MAILBOX_ROUTE_ID) return '/';
	return `/mail/${mailboxRouteId}`;
}

export function mailThreadHref(
	mailboxRouteId: string,
	threadId: string,
	searchParams?: URLSearchParams | string
): string {
	const base = `/mail/${mailboxRouteId}/${threadId}`;
	if (!searchParams) return base;
	const qs = typeof searchParams === 'string' ? searchParams : searchParams.toString();
	return qs ? `${base}?${qs}` : base;
}

export function isMailPath(pathname: string): boolean {
	return pathname === '/' || pathname.startsWith('/mail');
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
	const threadId = parts[2] ?? null;
	if (!mailboxRouteId) return null;
	return { kind: 'mailbox', mailboxRouteId, threadId };
}
