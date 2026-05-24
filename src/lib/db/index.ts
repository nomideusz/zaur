export {
	closeMailDatabase,
	getAccountId,
	getMailDatabase,
	initMailDatabase,
	type MailDatabase
} from './database';
export {
	clearComposeDraft,
	getComposeDraft,
	migrateLegacyComposeDraft,
	saveComposeDraft,
	type DraftSnapshot
} from './drafts';
export {
	countPendingOutbox,
	enqueueOutbox,
	listPendingOutbox,
	removeOutboxItem,
	updateOutboxStatus,
	type OutboxEnqueueInput
} from './outbox';
export {
	cacheMessagePreviews,
	getCachedMessagePreviews,
	patchCachedMessage,
	removeCachedMessage
} from './recent-threads';
export { getAllSyncStates, getSyncState, setSyncState } from './sync-state';
export type { DraftDoc, OutboxDoc, OutboxStatus, RecentThreadDoc, SyncStateDoc, SyncStateType } from './types';
