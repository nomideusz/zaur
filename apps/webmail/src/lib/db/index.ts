export {
	closeMailDatabase,
	removeMailDatabase,
	removeMailDatabaseById,
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
	listOutboxItems,
	listPendingOutbox,
	removeOutboxItem,
	retryOutboxItem,
	setOutboxJmapEmailId,
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
export { cacheThread, getCachedThread } from './thread-cache';
export {
	cacheAttachmentBlob,
	getCachedAttachmentBlob,
	isAttachmentCached,
	MAX_BLOB_BYTES
} from './attachment-blobs';
export type {
	DraftDoc,
	OutboxDoc,
	OutboxStatus,
	RecentThreadDoc,
	SyncStateDoc,
	SyncStateType,
	ThreadCacheDoc,
	AttachmentBlobDoc
} from './types';
