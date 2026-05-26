import { getMailDatabase } from './database';
import type { DraftDoc } from './types';
import type { ComposeMode } from '$lib/stores/compose.svelte';
import type { StoredComposeAttachment } from '$lib/types/compose';

const LOCAL_DRAFT_KEY = 'zaur:compose-draft';
const COMPOSE_DRAFT_ID = 'compose';

export interface DraftSnapshot {
	to: string;
	cc: string;
	bcc: string;
	subject: string;
	body: string;
	mode: ComposeMode;
	jmapDraftId?: string;
	attachments?: StoredComposeAttachment[];
	updatedAt: number;
}

function parseAttachments(json?: string): StoredComposeAttachment[] | undefined {
	if (!json) return undefined;
	try {
		const parsed = JSON.parse(json) as StoredComposeAttachment[];
		return Array.isArray(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function toSnapshot(doc: DraftDoc): DraftSnapshot {
	return {
		to: doc.to,
		cc: doc.cc,
		bcc: doc.bcc,
		subject: doc.subject,
		body: doc.body,
		mode: doc.mode,
		jmapDraftId: doc.jmapDraftId,
		attachments: parseAttachments(doc.attachmentsJson),
		updatedAt: doc.updatedAt
	};
}

export async function getComposeDraft(accountId: string): Promise<DraftSnapshot | null> {
	const db = getMailDatabase();
	if (!db) return null;

	const doc = await db.drafts.findOne({ selector: { id: `${accountId}:${COMPOSE_DRAFT_ID}` } }).exec();
	return doc ? toSnapshot(doc.toJSON()) : null;
}

export async function saveComposeDraft(
	accountId: string,
	draft: Omit<DraftSnapshot, 'updatedAt'> & { updatedAt?: number }
): Promise<void> {
	const db = getMailDatabase();
	if (!db) return;

	const now = draft.updatedAt ?? Date.now();
	const id = `${accountId}:${COMPOSE_DRAFT_ID}`;
	const existing = await db.drafts.findOne({ selector: { id } }).exec();

	await db.drafts.upsert({
		id,
		accountId,
		to: draft.to,
		cc: draft.cc,
		bcc: draft.bcc,
		subject: draft.subject,
		body: draft.body,
		mode: draft.mode,
		jmapDraftId: draft.jmapDraftId,
		attachmentsJson: draft.attachments?.length ? JSON.stringify(draft.attachments) : undefined,
		updatedAt: now,
		createdAt: existing?.createdAt ?? now
	});
}

export async function clearComposeDraft(accountId: string): Promise<void> {
	const db = getMailDatabase();
	if (!db) return;

	const doc = await db.drafts.findOne({ selector: { id: `${accountId}:${COMPOSE_DRAFT_ID}` } }).exec();
	if (doc) await doc.remove();
}

/** One-time migration from legacy localStorage compose draft. */
export async function migrateLegacyComposeDraft(accountId: string): Promise<DraftSnapshot | null> {
	const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
	if (!raw) return null;

	try {
		const legacy = JSON.parse(raw) as {
			to?: string;
			cc?: string;
			bcc?: string;
			subject?: string;
			body?: string;
			jmapDraftId?: string;
			updatedAt?: number;
		};

		if (!legacy.to && !legacy.cc && !legacy.bcc && !legacy.subject && !legacy.body) {
			localStorage.removeItem(LOCAL_DRAFT_KEY);
			return null;
		}

		const snapshot: DraftSnapshot = {
			to: legacy.to ?? '',
			cc: legacy.cc ?? '',
			bcc: legacy.bcc ?? '',
			subject: legacy.subject ?? '',
			body: legacy.body ?? '',
			mode: 'new',
			jmapDraftId: legacy.jmapDraftId,
			updatedAt: legacy.updatedAt ?? Date.now()
		};

		await saveComposeDraft(accountId, snapshot);
		localStorage.removeItem(LOCAL_DRAFT_KEY);
		return snapshot;
	} catch {
		localStorage.removeItem(LOCAL_DRAFT_KEY);
		return null;
	}
}
