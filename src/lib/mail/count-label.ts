import { settings } from '$lib/stores/settings.svelte';
import type { Mailbox } from '$lib/types/mail';

export function mailCountLabel(
	total: number | undefined,
	messageCount: number,
	mailbox: Mailbox | null | undefined
): string {
	const totalCount = total ?? messageCount;
	const unread = mailbox?.unread ?? 0;
	if (!settings.showFolderUnreadCounts) return String(totalCount);
	if (unread > 0) return `${unread} unread · ${totalCount}`;
	return String(totalCount);
}
