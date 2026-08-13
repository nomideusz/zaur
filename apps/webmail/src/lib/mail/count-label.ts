import { LABEL_UNSEEN } from '$lib/mail/new-mail';
import type { Mailbox } from '$lib/types/mail';

export function mailCountLabel(
	total: number | undefined,
	messageCount: number,
	mailbox: Mailbox | null | undefined,
	options?: { unseenOnly?: boolean }
): string {
	const loaded = messageCount;
	const unread = mailbox?.unread ?? 0;
	if (options?.unseenOnly) {
		const count = Math.max(total ?? 0, unread, loaded);
		return `${count} ${LABEL_UNSEEN.toLowerCase()}`;
	}
	const totalCount = Math.max(total ?? 0, mailbox?.total ?? 0, loaded);
	if (unread > 0) return `${unread} ${LABEL_UNSEEN.toLowerCase()} · ${totalCount}`;
	return String(totalCount);
}
