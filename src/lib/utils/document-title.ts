import { mail } from '$lib/stores/mail.svelte';

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
	return unread > 0 ? `(${unread}) ${base}` : base;
}

export function applyUnreadPrefixToDocument(): void {
	const unread = inboxUnreadCount();
	document.title = withUnreadPrefix(document.title, unread);
}
