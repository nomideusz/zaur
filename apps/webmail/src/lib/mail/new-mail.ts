import type { MessagePreview } from '../types/mail';

/** User-facing “Unseen” maps to JMAP $seen / `message.unread`. */
export function isNewMessage(message: Pick<MessagePreview, 'unread'>): boolean {
	return message.unread;
}

export const LABEL_UNSEEN = 'Unseen';
export const LABEL_SEEN = 'Seen';
/** Clears Unseen — sets $seen / unread=false. */
export const LABEL_MARK_SEEN = 'Mark seen';
/** Restores Unseen — removes $seen / unread=true. */
export const LABEL_UNSEE = 'Unsee';

/** @deprecated Use {@link LABEL_MARK_SEEN}. */
export const LABEL_CLEAR_NEW = LABEL_MARK_SEEN;
/** @deprecated Use {@link LABEL_UNSEE}. */
export const LABEL_RESTORE_NEW = LABEL_UNSEE;

/** Pin for follow-up — clears Unseen when the message is still unseen. */
export const LABEL_MARK_IMPORTANT = 'Important';

/** File as normal — clears Unseen, or removes the Important pin. */
export const LABEL_NOT_IMPORTANT = 'Not important';

export const LABEL_REMOVE_IMPORTANT = 'Remove important';

/**
 * What clears Unseen (sets $seen / unread=false). Opening a message does so automatically.
 *
 * - Not important — file as normal: mark seen and remove Important pin
 * - Important — acknowledged and pinned; leaves Unseen queue
 * - Trash / delete — message removed
 * - Move to inbox — restore from trash/spam/archive (interop; does not clear Unseen by itself)
 */
export const CLEARS_NEW_ACTIONS = [
	'clear-new',
	'mark-important',
	'trash',
	'delete',
	'move'
] as const;

/** Restores Unseen (JMAP $seen removed / unread=true). */
export const RESTORES_NEW_ACTIONS = ['mark-new'] as const;

export type ClearsNewAction = (typeof CLEARS_NEW_ACTIONS)[number];
