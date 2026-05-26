import { getMailDatabase } from './database';
import type { OutboxDoc, OutboxStatus } from './types';
import type { OutboxAttachmentPayload } from '$lib/types/compose';

export interface OutboxEnqueueInput {
	to: string;
	cc: string;
	bcc: string;
	subject: string;
	body: string;
	fromEmail: string;
	fromName?: string;
	attachments?: OutboxAttachmentPayload[];
}

function newOutboxId(): string {
	return crypto.randomUUID();
}

export async function enqueueOutbox(accountId: string, input: OutboxEnqueueInput): Promise<string> {
	const db = getMailDatabase();
	if (!db) throw new Error('Offline database not ready');

	const now = Date.now();
	const id = newOutboxId();

	await db.outbox.insert({
		id,
		accountId,
		to: input.to,
		cc: input.cc,
		bcc: input.bcc,
		subject: input.subject,
		body: input.body,
		fromEmail: input.fromEmail,
		fromName: input.fromName,
		attachmentsJson: input.attachments?.length ? JSON.stringify(input.attachments) : undefined,
		status: 'pending',
		attempts: 0,
		createdAt: now,
		updatedAt: now
	});

	return id;
}

export async function listOutboxItems(accountId: string): Promise<OutboxDoc[]> {
	const db = getMailDatabase();
	if (!db) return [];

	const docs = await db.outbox
		.find({
			selector: {
				accountId,
				status: { $in: ['pending', 'sending', 'failed'] as OutboxStatus[] }
			},
			sort: [{ createdAt: 'asc' }]
		})
		.exec();

	return docs.map((doc) => doc.toJSON());
}

export async function retryOutboxItem(id: string): Promise<void> {
	const db = getMailDatabase();
	if (!db) return;

	const doc = await db.outbox.findOne({ selector: { id } }).exec();
	if (!doc) return;

	await doc.patch({
		status: 'pending',
		error: undefined,
		updatedAt: Date.now()
	});
}

export async function listPendingOutbox(accountId: string): Promise<OutboxDoc[]> {
	const db = getMailDatabase();
	if (!db) return [];

	const docs = await db.outbox
		.find({
			selector: {
				accountId,
				status: { $in: ['pending', 'sending', 'failed'] as OutboxStatus[] }
			},
			sort: [{ createdAt: 'asc' }]
		})
		.exec();

	return docs.map((doc) => doc.toJSON());
}

export async function updateOutboxStatus(
	id: string,
	status: OutboxStatus,
	patch: Partial<Pick<OutboxDoc, 'error' | 'attempts'>> = {}
): Promise<void> {
	const db = getMailDatabase();
	if (!db) return;

	const doc = await db.outbox.findOne({ selector: { id } }).exec();
	if (!doc) return;

	await doc.patch({
		status,
		error: patch.error,
		attempts: patch.attempts ?? doc.attempts,
		updatedAt: Date.now()
	});
}

export async function removeOutboxItem(id: string): Promise<void> {
	const db = getMailDatabase();
	if (!db) return;

	const doc = await db.outbox.findOne({ selector: { id } }).exec();
	if (doc) await doc.remove();
}

export async function countPendingOutbox(accountId: string): Promise<number> {
	const db = getMailDatabase();
	if (!db) return 0;

	return db.outbox
		.count({ selector: { accountId, status: { $in: ['pending', 'sending', 'failed'] } } })
		.exec();
}
