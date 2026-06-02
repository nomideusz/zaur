import type { MessagePreview } from '../types/mail';

/** User-facing “New” maps to JMAP $seen / `message.unread`. */
export function isNewMessage(message: Pick<MessagePreview, 'unread'>): boolean {
	return message.unread;
}

/**
 * What clears New (sets $seen / unread=false). Opening a message does not.
 *
 * - Done — explicit “processed, not pinned” (swipe, reader, keyboard)
 * - Mark important — acknowledged and pinned; leaves Important queue
 * - Trash / delete — message removed
 * - Move to inbox — restore from trash/spam/archive (interop; does not clear New by itself)
 */
export const CLEARS_NEW_ACTIONS = [
	'done',
	'mark-important',
	'trash',
	'delete',
	'move'
] as const;

/** Restores New (JMAP $seen removed / unread=true). */
export const RESTORES_NEW_ACTIONS = ['mark-new'] as const;

export type ClearsNewAction = (typeof CLEARS_NEW_ACTIONS)[number];
