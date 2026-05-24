import { browser } from '$app/environment';
import type { JMAPClient } from '$lib/jmap/client';
import { parseAddressList } from '$lib/utils/addresses';
import type { MessageDetail } from '$lib/types/mail';

export type ComposeMode = 'new' | 'reply' | 'reply-all' | 'forward';

const AUTOSAVE_MS = 2000;
const SERVER_DRAFT_MS = 5000;

function quoteHeader(message: MessageDetail) {
	const when = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(message.receivedAt));

	const toLine = message.to.map((addr) => addr.name || addr.email).join(', ');
	return `From: ${message.from.name} <${message.from.email}>\nDate: ${when}\nSubject: ${message.subject}\nTo: ${toLine}`;
}

class ComposeStore {
	to = $state('');
	cc = $state('');
	bcc = $state('');
	subject = $state('');
	body = $state('');
	showCcBcc = $state(false);
	mode = $state<ComposeMode>('new');
	jmapDraftId = $state<string | undefined>(undefined);
	isSending = $state(false);
	isSavingDraft = $state(false);
	draftSavedAt = $state<number | null>(null);
	error = $state<string | null>(null);

	private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
	private serverDraftTimer: ReturnType<typeof setTimeout> | null = null;

	startNew() {
		void this.restoreLocalDraft();
	}

	private async restoreLocalDraft() {
		if (!browser) return;

		const { getAccountId, getComposeDraft } = await import('$lib/db');
		const accountId = getAccountId();
		if (!accountId) {
			this.resetComposeFields();
			return;
		}

		const draft = await getComposeDraft(accountId);
		if (!draft) {
			this.resetComposeFields();
			return;
		}

		this.to = draft.to;
		this.cc = draft.cc;
		this.bcc = draft.bcc;
		this.subject = draft.subject;
		this.body = draft.body;
		this.jmapDraftId = draft.jmapDraftId;
		this.showCcBcc = !!(draft.cc || draft.bcc);
		this.mode = draft.mode;
		this.draftSavedAt = draft.updatedAt;
		this.error = null;
	}

	private resetComposeFields() {
		this.to = '';
		this.cc = '';
		this.bcc = '';
		this.subject = '';
		this.body = '';
		this.showCcBcc = false;
		this.mode = 'new';
		this.jmapDraftId = undefined;
		this.error = null;
		this.draftSavedAt = null;
	}

	startReply(message: MessageDetail) {
		const when = new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(message.receivedAt));

		this.mode = 'reply';
		this.to = message.from.email;
		this.cc = '';
		this.bcc = '';
		this.showCcBcc = false;
		this.subject = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`;
		this.body = `\n\n---\nOn ${when}, ${message.from.name} wrote:\n${message.bodyText}`;
		this.jmapDraftId = undefined;
		this.error = null;
		this.draftSavedAt = null;
	}

	startReplyAll(message: MessageDetail, thread: MessageDetail[], userEmail: string) {
		const normalizedUser = userEmail.trim().toLowerCase();
		const recipients = new Set<string>();

		for (const item of thread) {
			if (item.from.email.toLowerCase() !== normalizedUser) {
				recipients.add(item.from.email);
			}
			for (const addr of item.to) {
				if (addr.email.toLowerCase() !== normalizedUser) {
					recipients.add(addr.email);
				}
			}
			for (const addr of item.cc) {
				if (addr.email.toLowerCase() !== normalizedUser) {
					recipients.add(addr.email);
				}
			}
		}

		const when = new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(message.receivedAt));

		this.mode = 'reply-all';
		this.to = Array.from(recipients).join(', ');
		this.cc = '';
		this.bcc = '';
		this.showCcBcc = false;
		this.subject = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`;
		this.body = `\n\n---\nOn ${when}, ${message.from.name} wrote:\n${message.bodyText}`;
		this.jmapDraftId = undefined;
		this.error = null;
		this.draftSavedAt = null;
	}

	startForward(message: MessageDetail) {
		this.mode = 'forward';
		this.to = '';
		this.cc = '';
		this.bcc = '';
		this.showCcBcc = false;
		this.subject = message.subject.startsWith('Fwd:') ? message.subject : `Fwd: ${message.subject}`;
		this.body = `\n\n---\nForwarded message:\n${quoteHeader(message)}\n\n${message.bodyText}`;
		this.jmapDraftId = undefined;
		this.error = null;
		this.draftSavedAt = null;
	}

	scheduleAutosave(client: JMAPClient | null, fromEmail: string, fromName?: string) {
		if (!browser) return;

		if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
		this.autosaveTimer = setTimeout(() => {
			void this.persistLocalDraft();
		}, AUTOSAVE_MS);

		if (!client || this.mode !== 'new') return;

		if (this.serverDraftTimer) clearTimeout(this.serverDraftTimer);
		this.serverDraftTimer = setTimeout(() => {
			void this.saveServerDraft(client, fromEmail, fromName);
		}, SERVER_DRAFT_MS);
	}

	reset() {
		if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
		if (this.serverDraftTimer) clearTimeout(this.serverDraftTimer);
		void this.clearLocalDraft();
		this.to = '';
		this.cc = '';
		this.bcc = '';
		this.subject = '';
		this.body = '';
		this.showCcBcc = false;
		this.mode = 'new';
		this.jmapDraftId = undefined;
		this.isSending = false;
		this.isSavingDraft = false;
		this.draftSavedAt = null;
		this.error = null;
	}

	async send(client: JMAPClient, fromEmail: string, fromName?: string) {
		const recipients = parseAddressList(this.to);
		if (!recipients.length) {
			this.error = 'Enter at least one recipient';
			return false;
		}
		if (!this.subject.trim()) {
			this.error = 'Subject is required';
			return false;
		}

		this.isSending = true;
		this.error = null;

		const cc = parseAddressList(this.cc);
		const bcc = parseAddressList(this.bcc);
		const draftId = this.jmapDraftId;

		try {
			await client.sendEmail(recipients, this.subject.trim(), this.body, {
				fromEmail,
				fromName: fromName?.trim() || undefined,
				cc: cc.length ? cc : undefined,
				bcc: bcc.length ? bcc : undefined
			});

			if (draftId) {
				try {
					await client.destroyEmail(draftId);
				} catch {
					// Draft cleanup is best-effort
				}
			}

			this.reset();
			return true;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to send message';
			return false;
		} finally {
			this.isSending = false;
		}
	}

	private async persistLocalDraft() {
		if (!browser || this.mode !== 'new') return;
		if (!this.to && !this.cc && !this.bcc && !this.subject && !this.body) {
			await this.clearLocalDraft();
			return;
		}

		const { getAccountId, saveComposeDraft } = await import('$lib/db');
		const accountId = getAccountId();
		if (!accountId) return;

		const updatedAt = Date.now();
		await saveComposeDraft(accountId, {
			to: this.to,
			cc: this.cc,
			bcc: this.bcc,
			subject: this.subject,
			body: this.body,
			mode: this.mode,
			jmapDraftId: this.jmapDraftId,
			updatedAt
		});
		this.draftSavedAt = updatedAt;
	}

	private async clearLocalDraft() {
		if (!browser) return;
		const { getAccountId, clearComposeDraft } = await import('$lib/db');
		const accountId = getAccountId();
		if (!accountId) return;
		await clearComposeDraft(accountId);
	}

	private async saveServerDraft(client: JMAPClient, fromEmail: string, fromName?: string) {
		if (!this.to && !this.subject && !this.body) return;

		this.isSavingDraft = true;
		try {
			const id = await client.saveDraft({
				jmapDraftId: this.jmapDraftId,
				to: parseAddressList(this.to),
				cc: parseAddressList(this.cc),
				bcc: parseAddressList(this.bcc),
				subject: this.subject.trim(),
				body: this.body,
				fromEmail,
				fromName: fromName?.trim() || undefined
			});
			this.jmapDraftId = id;
			this.draftSavedAt = Date.now();
			void this.persistLocalDraft();
		} catch {
			// Server draft save is best-effort
		} finally {
			this.isSavingDraft = false;
		}
	}
}

export const compose = new ComposeStore();
