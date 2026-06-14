import type { Mailbox, MailboxRole, MessagePreview } from '../types/mail';
import {
	LABEL_MARK_IMPORTANT,
	LABEL_MARK_SEEN,
	LABEL_REMOVE_IMPORTANT,
	LABEL_UNSEE
} from './new-mail.ts';

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
	canMarkImportant: boolean;
	canMarkSpam: boolean;
	hasInbox: boolean;
}

const RESTORE_ROLES = new Set<MailboxRole>(['trash', 'junk', 'archive']);

/**
 * Swipe right — the primary action toggles the Highlight where it's available
 * (the everyday triage on this app), falling back to Seen/Unseen in folders
 * that can't be highlighted. Trash/spam/archive swap in a single restore.
 */
export function listSwipeLeadingActions(ctx: ListSwipeContext): ListSwipeAction[] {
	const { message, mailbox, canMarkImportant, hasInbox } = ctx;
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

	const actions: ListSwipeAction[] = [];

	if (canMarkImportant) {
		actions.push(
			message.important
				? { id: 'remove-important', label: LABEL_REMOVE_IMPORTANT, variant: 'accent' }
				: { id: 'mark-important', label: LABEL_MARK_IMPORTANT, variant: 'accent' }
		);
	}

	actions.push(
		message.unread
			? { id: 'mark-seen', label: LABEL_MARK_SEEN, variant: 'default' }
			: { id: 'unsee', label: LABEL_UNSEE, variant: 'default' }
	);

	return actions;
}

/**
 * Swipe left — negative actions. Tier 1 (full swipe) trashes — the everyday
 * move; tier 2 (deep swipe) files as spam where a junk folder applies.
 * Trash and drafts swap in their permanent delete.
 */
export function listSwipeTrailingActions(ctx: ListSwipeContext): ListSwipeAction[] {
	const { mailbox, canMarkSpam } = ctx;
	const role = mailbox?.role;

	if (role === 'trash') {
		return [{ id: 'delete-forever', label: 'Delete', variant: 'danger', dismiss: true }];
	}

	if (role === 'drafts') {
		return [{ id: 'delete-draft', label: 'Delete', variant: 'danger', dismiss: true }];
	}

	const actions: ListSwipeAction[] = [
		{ id: 'trash', label: 'Trash', variant: 'danger', dismiss: true }
	];

	if (canMarkSpam) {
		actions.push({ id: 'spam', label: 'Spam', variant: 'warning', dismiss: true });
	}

	return actions;
}

export function listSwipeContext(
	message: MessagePreview,
	mailbox: Mailbox | null | undefined,
	options: { canMarkImportant: boolean; canMarkSpam: boolean; hasInbox: boolean }
): ListSwipeContext {
	return {
		message,
		mailbox,
		canMarkImportant: options.canMarkImportant,
		canMarkSpam: options.canMarkSpam,
		hasInbox: options.hasInbox
	};
}
