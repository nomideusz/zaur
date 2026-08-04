import type { Mailbox, MailboxRole, MessagePreview } from '../types/mail';
import {
	LABEL_MARK_IMPORTANT,
	LABEL_MARK_SEEN,
	LABEL_REMOVE_IMPORTANT,
	LABEL_UNSEE
} from './new-mail.ts';

export type ListSwipeActionVariant = 'default' | 'accent' | 'danger' | 'warning';

/** Short tier = everyday action; deep tier = stronger commit. */
export type ListSwipeTier = 1 | 2;

export interface ListSwipeAction {
	id: string;
	label: string;
	variant?: ListSwipeActionVariant;
	/** Row slides off after commit (move/destroy) instead of snapping back. */
	dismiss?: boolean;
	/** 1 = short swipe, 2 = deep swipe. Defaults to array order (1 then 2). */
	tier?: ListSwipeTier;
}

export interface ListSwipeContext {
	message: MessagePreview;
	mailbox: Pick<Mailbox, 'role'> | null | undefined;
	canMarkImportant: boolean;
	canMarkSpam: boolean;
	canArchive: boolean;
	hasInbox: boolean;
}

const RESTORE_ROLES = new Set<MailboxRole>(['trash', 'junk', 'archive']);

/**
 * Swipe right — short = Seen/Unsee; deep = Archive (dismiss) when available,
 * otherwise Highlight toggle. Trash/spam/archive folders swap in a restore.
 */
export function listSwipeLeadingActions(ctx: ListSwipeContext): ListSwipeAction[] {
	const { message, mailbox, canMarkImportant, canArchive, hasInbox } = ctx;
	const role = mailbox?.role;

	if (role && RESTORE_ROLES.has(role)) {
		if (!hasInbox) return [];
		return [
			{
				id: 'move-inbox',
				label: role === 'junk' ? 'Not spam' : 'Move to inbox',
				variant: 'accent',
				dismiss: true,
				tier: 1
			}
		];
	}

	if (role === 'drafts') return [];

	const actions: ListSwipeAction[] = [
		message.unread
			? { id: 'mark-seen', label: LABEL_MARK_SEEN, variant: 'default', tier: 1 }
			: { id: 'unsee', label: LABEL_UNSEE, variant: 'default', tier: 1 }
	];

	if (canArchive) {
		actions.push({
			id: 'archive',
			label: 'Archive',
			variant: 'accent',
			dismiss: true,
			tier: 2
		});
	} else if (canMarkImportant) {
		actions.push(
			message.important
				? {
						id: 'remove-important',
						label: LABEL_REMOVE_IMPORTANT,
						variant: 'accent',
						tier: 2
					}
				: {
						id: 'mark-important',
						label: LABEL_MARK_IMPORTANT,
						variant: 'accent',
						tier: 2
					}
		);
	}

	return actions;
}

/**
 * Swipe left — short = Trash; deep = Spam where a junk folder applies.
 * Trash and drafts swap in permanent delete.
 */
export function listSwipeTrailingActions(ctx: ListSwipeContext): ListSwipeAction[] {
	const { mailbox, canMarkSpam } = ctx;
	const role = mailbox?.role;

	if (role === 'trash') {
		return [{ id: 'delete-forever', label: 'Delete', variant: 'danger', dismiss: true, tier: 1 }];
	}

	if (role === 'drafts') {
		return [{ id: 'delete-draft', label: 'Delete', variant: 'danger', dismiss: true, tier: 1 }];
	}

	const actions: ListSwipeAction[] = [
		{ id: 'trash', label: 'Trash', variant: 'danger', dismiss: true, tier: 1 }
	];

	if (canMarkSpam) {
		actions.push({ id: 'spam', label: 'Spam', variant: 'warning', dismiss: true, tier: 2 });
	}

	return actions;
}

/** Pick the action for an armed tier (1 or 2), falling back to the short tier. */
export function listSwipeActionForTier(
	actions: ListSwipeAction[],
	level: ListSwipeTier
): ListSwipeAction | null {
	if (!actions.length || level < 1) return null;
	const match =
		actions.find((action, index) => (action.tier ?? index + 1) === level) ?? null;
	return match ?? actions[0] ?? null;
}

export function listSwipeContext(
	message: MessagePreview,
	mailbox: Mailbox | null | undefined,
	options: {
		canMarkImportant: boolean;
		canMarkSpam: boolean;
		canArchive: boolean;
		hasInbox: boolean;
	}
): ListSwipeContext {
	return {
		message,
		mailbox,
		canMarkImportant: options.canMarkImportant,
		canMarkSpam: options.canMarkSpam,
		canArchive: options.canArchive,
		hasInbox: options.hasInbox
	};
}
