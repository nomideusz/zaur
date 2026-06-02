import type { Mailbox, MailboxRole, MessagePreview } from '../types/mail';
import { LABEL_MARK_IMPORTANT, LABEL_NOT_IMPORTANT } from './new-mail.ts';

export type ListSwipeActionVariant = 'default' | 'danger' | 'accent';

export interface ListSwipeAction {
	id: string;
	label: string;
	variant?: ListSwipeActionVariant;
}

export interface ListSwipeContext {
	message: MessagePreview;
	mailbox: Pick<Mailbox, 'role'> | null | undefined;
	canMarkImportant: boolean;
	hasInbox: boolean;
}

const RESTORE_ROLES = new Set<MailboxRole>(['trash', 'junk', 'archive']);

/** Swipe right — positive actions (leading / revealed on the left). */
export function listSwipeLeadingActions(ctx: ListSwipeContext): ListSwipeAction[] {
	const { message, mailbox, canMarkImportant, hasInbox } = ctx;
	const role = mailbox?.role;
	const isNew = message.unread;

	if (role && RESTORE_ROLES.has(role)) {
		if (!hasInbox) return [];
		return [
			{
				id: 'move-inbox',
				label: role === 'junk' ? 'Not spam' : 'Move to inbox',
				variant: 'accent'
			}
		];
	}

	if (role === 'drafts') return [];

	if (isNew) {
		if (canMarkImportant && !message.important) {
			return [{ id: 'mark-important', label: LABEL_MARK_IMPORTANT, variant: 'accent' }];
		}
		return [{ id: 'done', label: LABEL_NOT_IMPORTANT, variant: 'default' }];
	}

	if (canMarkImportant && !message.important) {
		return [{ id: 'mark-important', label: LABEL_MARK_IMPORTANT, variant: 'accent' }];
	}

	return [];
}

/** Swipe left — negative actions (trailing / revealed on the right). */
export function listSwipeTrailingActions(ctx: ListSwipeContext): ListSwipeAction[] {
	const { mailbox } = ctx;
	const role = mailbox?.role;

	if (role === 'trash') {
		return [{ id: 'delete-forever', label: 'Delete', variant: 'danger' }];
	}

	if (role === 'drafts') {
		return [{ id: 'delete-draft', label: 'Delete', variant: 'danger' }];
	}

	return [{ id: 'trash', label: 'Trash', variant: 'danger' }];
}

export function listSwipeContext(
	message: MessagePreview,
	mailbox: Mailbox | null | undefined,
	options: { canMarkImportant: boolean; hasInbox: boolean }
): ListSwipeContext {
	return {
		message,
		mailbox,
		canMarkImportant: options.canMarkImportant,
		hasInbox: options.hasInbox
	};
}
