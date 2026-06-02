import type { MessagePreview } from '../types/mail';

/** User-facing “New” maps to JMAP $seen / `message.unread`. */
export function isNewMessage(message: Pick<MessagePreview, 'unread'>): boolean {
	return message.unread;
}

/** Clears New — fallback when Important triage is unavailable (e.g. Trash). */
export const LABEL_CLEAR_NEW = 'Not new';

/** Restores New — pairs with {@link LABEL_CLEAR_NEW}. */
export const LABEL_RESTORE_NEW = 'Mark as new';

/** Pin for follow-up — clears New when the message is still New. */
export const LABEL_MARK_IMPORTANT = 'Important';

/** File as normal — clears New, or removes the Important pin. */
export const LABEL_NOT_IMPORTANT = 'Not important';

/**
 * What clears New (sets $seen / unread=false). Opening a message does not.
 *
 * - Not important — file as normal: clear New and remove Important pin
 * - Important — acknowledged and pinned; leaves New queue
 * - Trash / delete — message removed
 * - Move to inbox — restore from trash/spam/archive (interop; does not clear New by itself)
 */
export const CLEARS_NEW_ACTIONS = [
	'clear-new',
	'mark-important',
	'trash',
	'delete',
	'move'
] as const;

/** Restores New (JMAP $seen removed / unread=true). */
export const RESTORES_NEW_ACTIONS = ['mark-new'] as const;

export type ClearsNewAction = (typeof CLEARS_NEW_ACTIONS)[number];
