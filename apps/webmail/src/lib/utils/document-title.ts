import { browser } from '$app/environment';
import { mail } from '$lib/stores/mail.svelte';
import { settings } from '$lib/stores/settings.svelte';
import { syncAppBadge } from '$lib/utils/app-badge';
import { getInactiveUnread } from '$lib/utils/unread-state';

const UNREAD_PREFIX = /^\(\d+\)\s*/;

export function inboxUnreadCount(): number {
	const inbox = mail.mailboxes.find((mb) => mb.role === 'inbox');
	return inbox?.unread ?? 0;
}

export function stripUnreadPrefix(title: string): string {
	return title.replace(UNREAD_PREFIX, '');
}

export function withUnreadPrefix(title: string, unread: number): string {
	const base = stripUnreadPrefix(title);
	if (!settings.showUnreadInTitle) return base;
	return unread > 0 ? `(${unread}) ${base}` : base;
}

export function applyUnreadPrefixToDocument(): void {
	const unread = inboxUnreadCount();
	// Title reflects the active account's inbox; the OS app badge is the total across
	// all accounts (active inbox + the other accounts' unread from the last poll).
	document.title = withUnreadPrefix(document.title, unread);
	if (browser) {
		void syncAppBadge(unread + getInactiveUnread());
	}
}
