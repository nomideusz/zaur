/**
 * Total unread across the user's *inactive* accounts, kept in a dependency-free leaf
 * module so the app-badge code (document-title) can include it without importing the
 * auth store (which would create an import cycle). The auth store sets it on each
 * unread poll; the active account's count comes from the live mail store separately.
 */
let inactiveUnread = 0;

export function setInactiveUnread(total: number): void {
	inactiveUnread = Math.max(0, total | 0);
}

export function getInactiveUnread(): number {
	return inactiveUnread;
}
