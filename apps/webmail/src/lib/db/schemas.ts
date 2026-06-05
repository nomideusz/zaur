import type { RxJsonSchema } from 'rxdb';
import type { DraftDoc, OutboxDoc, RecentThreadDoc, SyncStateDoc, ThreadCacheDoc, AttachmentBlobDoc } from './types';

export const draftSchema: RxJsonSchema<DraftDoc> = {
	title: 'draft',
	version: 1,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 200 },
		accountId: { type: 'string', maxLength: 128 },
		to: { type: 'string' },
		cc: { type: 'string' },
		bcc: { type: 'string' },
		subject: { type: 'string' },
		body: { type: 'string' },
		bodyHtml: { type: 'string' },
		mode: { type: 'string', maxLength: 16 },
		jmapDraftId: { type: 'string', maxLength: 128 },
		attachmentsJson: { type: 'string' },
		updatedAt: { type: 'number', minimum: 0, maximum: 9_000_000_000_000, multipleOf: 1 },
		createdAt: { type: 'number', minimum: 0, maximum: 9_000_000_000_000, multipleOf: 1 }
	},
	required: ['id', 'accountId', 'to', 'cc', 'bcc', 'subject', 'body', 'mode', 'updatedAt', 'createdAt'],
	indexes: ['accountId', 'updatedAt']
};

export const outboxSchema: RxJsonSchema<OutboxDoc> = {
	title: 'outbox',
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 128 },
		accountId: { type: 'string', maxLength: 128 },
		to: { type: 'string' },
		cc: { type: 'string' },
		bcc: { type: 'string' },
		subject: { type: 'string' },
		body: { type: 'string' },
		fromEmail: { type: 'string', maxLength: 320 },
		fromName: { type: 'string', maxLength: 320 },
		attachmentsJson: { type: 'string' },
		status: { type: 'string', maxLength: 16 },
		error: { type: 'string' },
		attempts: { type: 'number', minimum: 0, maximum: 1000, multipleOf: 1 },
		createdAt: { type: 'number', minimum: 0, maximum: 9_000_000_000_000, multipleOf: 1 },
		updatedAt: { type: 'number', minimum: 0, maximum: 9_000_000_000_000, multipleOf: 1 }
	},
	required: [
		'id',
		'accountId',
		'to',
		'cc',
		'bcc',
		'subject',
		'body',
		'fromEmail',
		'status',
		'attempts',
		'createdAt',
		'updatedAt'
	],
	indexes: ['accountId', 'status', 'createdAt']
};

export const recentThreadSchema: RxJsonSchema<RecentThreadDoc> = {
	title: 'recentThread',
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 320 },
		accountId: { type: 'string', maxLength: 128 },
		mailboxRouteId: { type: 'string', maxLength: 128 },
		threadId: { type: 'string', maxLength: 128 },
		emailId: { type: 'string', maxLength: 128 },
		fromName: { type: 'string', maxLength: 320 },
		fromEmail: { type: 'string', maxLength: 320 },
		subject: { type: 'string', maxLength: 998 },
		preview: { type: 'string', maxLength: 512 },
		receivedAt: { type: 'string', maxLength: 64 },
		unread: { type: 'boolean' },
		starred: { type: 'boolean' },
		important: { type: 'boolean' },
		hasAttachment: { type: 'boolean' },
		replied: { type: 'boolean' },
		cachedAt: { type: 'number', minimum: 0, maximum: 9_000_000_000_000, multipleOf: 1 }
	},
	required: [
		'id',
		'accountId',
		'mailboxRouteId',
		'threadId',
		'emailId',
		'fromName',
		'fromEmail',
		'subject',
		'preview',
		'receivedAt',
		'unread',
		'starred',
		'hasAttachment',
		'cachedAt'
	],
	indexes: ['accountId', 'mailboxRouteId', 'receivedAt', 'cachedAt']
};

export const syncStateSchema: RxJsonSchema<SyncStateDoc> = {
	title: 'syncState',
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 160 },
		accountId: { type: 'string', maxLength: 128 },
		type: { type: 'string', maxLength: 16 },
		state: { type: 'string', maxLength: 128 },
		updatedAt: { type: 'number', minimum: 0, maximum: 9_000_000_000_000, multipleOf: 1 }
	},
	required: ['id', 'accountId', 'type', 'state', 'updatedAt'],
	indexes: ['accountId', 'type']
};

export const threadCacheSchema: RxJsonSchema<ThreadCacheDoc> = {
	title: 'threadCache',
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 256 },
		accountId: { type: 'string', maxLength: 128 },
		threadId: { type: 'string', maxLength: 128 },
		mailboxRouteId: { type: 'string', maxLength: 128 },
		messagesJson: { type: 'string' },
		cachedAt: { type: 'number', minimum: 0, maximum: 9_000_000_000_000, multipleOf: 1 }
	},
	required: ['id', 'accountId', 'threadId', 'mailboxRouteId', 'messagesJson', 'cachedAt'],
	indexes: ['accountId', 'threadId', 'cachedAt']
};

export const attachmentBlobSchema: RxJsonSchema<AttachmentBlobDoc> = {
	title: 'attachmentBlob',
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 256 },
		accountId: { type: 'string', maxLength: 128 },
		blobId: { type: 'string', maxLength: 128 },
		name: { type: 'string', maxLength: 512 },
		type: { type: 'string', maxLength: 128 },
		size: { type: 'number', minimum: 0, maximum: 52_428_800, multipleOf: 1 },
		dataBase64: { type: 'string' },
		cachedAt: { type: 'number', minimum: 0, maximum: 9_000_000_000_000, multipleOf: 1 }
	},
	required: ['id', 'accountId', 'blobId', 'name', 'type', 'size', 'dataBase64', 'cachedAt'],
	indexes: ['accountId', 'blobId', 'cachedAt']
};
