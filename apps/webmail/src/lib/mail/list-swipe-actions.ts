import type { Mailbox, MailboxRole, MessagePreview } from '../types/mail';
import { LABEL_MARK_SEEN, LABEL_UNSEE } from './new-mail.ts';

export type ListSwipeActionVariant = 'default' | 'accent' | 'danger' | 'warning';

export interface ListSwipeAction {
	id: string;
	label: string;
	variant?: ListSwipeActionVariant;
	/** Row slides off after commit (move/destroy) instead of snapping back. */
	dismiss?: boolean;
}

export interface ListSwipeContext {
	message: MessagePreview;
	mailbox: Pick<Mailbox, 'role'> | null | undefined;
	hasInbox: boolean;
}

const RESTORE_ROLES = new Set<MailboxRole>(['trash', 'junk', 'archive']);

/**
 * Swipe right — one action: Seen/Unsee toggle. Trash/spam/archive folders
 * swap in a restore instead.
 */
export function listSwipeLeadingActions(ctx: ListSwipeContext): ListSwipeAction[] {
	const { message, mailbox, hasInbox } = ctx;
	const role = mailbox?.role;

	if (role && RESTORE_ROLES.has(role)) {
		if (!hasInbox) return [];
		return [
			{
				id: 'move-inbox',
				label: role === 'junk' ? 'Not spam' : 'Move to inbox',
				variant: 'accent',
				dismiss: true
			}
		];
	}

	if (role === 'drafts') return [];

	return [
		message.unread
			? { id: 'mark-seen', label: LABEL_MARK_SEEN, variant: 'default' }
			: { id: 'unsee', label: LABEL_UNSEE, variant: 'default' }
	];
}

/**
 * Swipe left — one action: Trash. Trash and drafts swap in permanent delete.
 */
export function listSwipeTrailingActions(ctx: ListSwipeContext): ListSwipeAction[] {
	const role = ctx.mailbox?.role;

	if (role === 'trash') {
		return [{ id: 'delete-forever', label: 'Delete', variant: 'danger', dismiss: true }];
	}

	if (role === 'drafts') {
		return [{ id: 'delete-draft', label: 'Delete', variant: 'danger', dismiss: true }];
	}

	return [{ id: 'trash', label: 'Trash', variant: 'danger', dismiss: true }];
}

export function listSwipeContext(
	message: MessagePreview,
	mailbox: Mailbox | null | undefined,
	options: { hasInbox: boolean }
): ListSwipeContext {
	return { message, mailbox, hasInbox: options.hasInbox };
}
