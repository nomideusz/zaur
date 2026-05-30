import { browser } from '$app/environment';
import type { JMAPClient } from '$lib/jmap/client';
import type { EmailAttachmentInput } from '$lib/jmap/email-build';
import { validateAttachmentFile } from '$lib/attachments/upload';
import { invalidAddressParts, parseAddressList, formatAddressList } from '$lib/utils/addresses';
import { mapEmailDetail } from '$lib/jmap/map';
import { isOfflineError } from '$lib/utils/network';
import { outbox } from '$lib/stores/outbox.svelte';
import { settings, type ComposeFormat } from '$lib/stores/settings.svelte';
import { toast, UNDO_SEND_DELAY_MS } from '$lib/stores/toast.svelte';
import type { ComposeAttachment, StoredComposeAttachment } from '$lib/types/compose';
import type { MessageDetail } from '$lib/types/mail';

export type ComposeMode = 'new' | 'reply' | 'reply-all' | 'forward';
export type ComposeSendResult = 'sent' | 'pending' | 'queued' | false;

export interface ComposeSendOptions {
	onUndo?: () => void;
	onComplete?: (result: 'sent' | 'queued') => void;
}

interface ComposeSnapshot {
	to: string;
	cc: string;
	bcc: string;
	subject: string;
	body: string;
	showCcBcc: boolean;
	mode: ComposeMode;
	jmapDraftId?: string;
	attachments: ComposeAttachment[];
}

interface SendPayload {
	recipients: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	body: string;
	toRaw: string;
	ccRaw: string;
	bccRaw: string;
	draftId?: string;
	attachments: EmailAttachmentInput[];
	sendOptions: {
		fromEmail: string;
		fromName?: string;
		cc?: string[];
		bcc?: string[];
		attachments?: EmailAttachmentInput[];
		format: ComposeFormat;
	};
}

interface ArchiveTarget {
	emailId: string;
	mailboxId?: string;
}

interface PendingSend {
	id: string;
	timer: ReturnType<typeof setTimeout>;
	snapshot: ComposeSnapshot;
	payload: SendPayload;
	client: JMAPClient;
	fromEmail: string;
	fromName?: string;
	options?: ComposeSendOptions;
	archiveTarget?: ArchiveTarget;
}

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
	attachments = $state<ComposeAttachment[]>([]);
	sourceEmailId = $state<string | undefined>(undefined);
	sourceMailboxId = $state<string | undefined>(undefined);

	private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
	private serverDraftTimer: ReturnType<typeof setTimeout> | null = null;
	private pendingSend: PendingSend | null = null;

	isComposeEmpty = $derived.by(() => {
		const bodyText = this.body.trim();
		const signatureText = settings.useSignature ? settings.signature.trim() : '';
		const isBodyEmpty = bodyText === '' || bodyText === signatureText;

		return (
			!this.to.trim() &&
			!this.cc.trim() &&
			!this.bcc.trim() &&
			!this.subject.trim() &&
			!this.attachments.length &&
			isBodyEmpty
		);
	});

	hasUploadingAttachments = $derived.by(() =>
		this.attachments.some((attachment) => attachment.uploading)
	);

	canSend = $derived.by(
		() =>
			!this.isSending &&
			!this.hasUploadingAttachments &&
			parseAddressList(this.to).length > 0
	);

	startNew() {
		this.resetComposeFields();
		void this.clearLocalDraft();
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
		this.attachments = (draft.attachments ?? []).map((attachment) => ({
			id: crypto.randomUUID(),
			name: attachment.name,
			type: attachment.type,
			size: attachment.size,
			blobId: attachment.blobId,
			uploading: false
		}));
	}

	private clearAttachments() {
		this.attachments = [];
	}

	private importMessageAttachments(message: MessageDetail) {
		this.attachments = message.attachments.map((attachment) => ({
			id: crypto.randomUUID(),
			name: attachment.name,
			type: attachment.type,
			size: attachment.size,
			blobId: attachment.blobId,
			uploading: false
		}));
	}

	private resetComposeFields() {
		this.to = '';
		this.cc = '';
		this.bcc = '';
		this.subject = '';
		this.body = settings.composeBodyWithSignature();
		this.showCcBcc = false;
		this.mode = 'new';
		this.jmapDraftId = undefined;
		this.sourceEmailId = undefined;
		this.sourceMailboxId = undefined;
		this.error = null;
		this.draftSavedAt = null;
		this.clearAttachments();
	}

	private clearComposeFields() {
		this.to = '';
		this.cc = '';
		this.bcc = '';
		this.subject = '';
		this.body = '';
		this.showCcBcc = false;
		this.mode = 'new';
		this.jmapDraftId = undefined;
		this.sourceEmailId = undefined;
		this.sourceMailboxId = undefined;
		this.error = null;
		this.draftSavedAt = null;
		this.clearAttachments();
	}

	private storedAttachments(): StoredComposeAttachment[] {
		return this.attachments
			.filter((attachment): attachment is ComposeAttachment & { blobId: string } => !!attachment.blobId)
			.map((attachment) => ({
				name: attachment.name,
				type: attachment.type,
				size: attachment.size,
				blobId: attachment.blobId
			}));
	}

	private readyAttachments(): EmailAttachmentInput[] {
		return this.storedAttachments();
	}

	async addAttachments(client: JMAPClient, files: FileList | File[]) {
		if (!browser) return;
		if (!navigator.onLine) {
			toast.show('Connect to the internet to attach files', 'error');
			return;
		}

		for (const file of files) {
			const validationError = validateAttachmentFile(file, this.attachments.length);
			if (validationError) {
				toast.show(validationError, 'error');
				continue;
			}

			const id = crypto.randomUUID();
			this.attachments = [
				...this.attachments,
				{
					id,
					name: file.name,
					type: file.type || 'application/octet-stream',
					size: file.size,
					blobId: null,
					uploading: true
				}
			];

			try {
				const uploaded = await client.uploadBlob(file, file.type || 'application/octet-stream');
				this.attachments = this.attachments.map((attachment) =>
					attachment.id === id
						? { ...attachment, blobId: uploaded.blobId, uploading: false, uploadError: undefined }
						: attachment
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Upload failed';
				this.attachments = this.attachments.map((attachment) =>
					attachment.id === id
						? { ...attachment, uploading: false, uploadError: message }
						: attachment
				);
				toast.show(`Could not attach "${file.name}" — ${message}`, 'error');
			}
		}
	}

	removeAttachment(id: string) {
		this.attachments = this.attachments.filter((attachment) => attachment.id !== id);
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
		this.body = settings.composeBodyWithSignature(
			`\n\n---\nOn ${when}, ${message.from.name} wrote:\n${message.bodyText}`
		);
		this.jmapDraftId = undefined;
		this.error = null;
		this.draftSavedAt = null;
		this.sourceEmailId = message.id;
		this.sourceMailboxId = message.mailboxId;
		this.clearAttachments();
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
		this.body = settings.composeBodyWithSignature(
			`\n\n---\nOn ${when}, ${message.from.name} wrote:\n${message.bodyText}`
		);
		this.jmapDraftId = undefined;
		this.error = null;
		this.draftSavedAt = null;
		this.sourceEmailId = message.id;
		this.sourceMailboxId = message.mailboxId;
		this.clearAttachments();
	}

	startForward(message: MessageDetail) {
		this.mode = 'forward';
		this.to = '';
		this.cc = '';
		this.bcc = '';
		this.showCcBcc = false;
		this.subject = message.subject.startsWith('Fwd:') ? message.subject : `Fwd: ${message.subject}`;
		this.body = settings.composeBodyWithSignature(
			`\n\n---\nForwarded message:\n${quoteHeader(message)}\n\n${message.bodyText}`
		);
		this.jmapDraftId = undefined;
		this.error = null;
		this.draftSavedAt = null;
		this.importMessageAttachments(message);
		void this.persistLocalDraft();
	}

	openDraft(message: MessageDetail) {
		this.cancelPendingSend();
		this.mode = 'new';
		this.to = formatAddressList(message.to);
		this.cc = formatAddressList(message.cc);
		this.bcc = formatAddressList(message.bcc ?? []);
		this.showCcBcc = !!(this.cc || this.bcc);
		this.subject = message.subject === '(no subject)' ? '' : message.subject;
		this.body = message.bodyText || '';
		this.jmapDraftId = message.id;
		this.error = null;
		this.draftSavedAt = null;
		this.importMessageAttachments(message);
		void this.persistLocalDraft();
	}

	async loadDraft(client: JMAPClient, draftId: string) {
		const email = await client.getEmail(draftId);
		if (!email) throw new Error('Draft not found');
		this.openDraft(mapEmailDetail(email, 'drafts'));
	}

	scheduleAutosave(
		client: JMAPClient | null,
		fromEmail: string,
		fromName?: string,
		_triggerState?: unknown
	) {
		if (!browser) return;

		if (this.isComposeEmpty) {
			if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
			if (this.serverDraftTimer) clearTimeout(this.serverDraftTimer);
			void this.persistLocalDraft();
			return;
		}

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
		this.cancelPendingSend();
		if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
		if (this.serverDraftTimer) clearTimeout(this.serverDraftTimer);
		void this.clearLocalDraft();
		this.clearComposeFields();
		this.isSending = false;
		this.isSavingDraft = false;
	}

	async discard(client: JMAPClient | null) {
		this.cancelPendingSend();
		if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
		if (this.serverDraftTimer) clearTimeout(this.serverDraftTimer);

		const draftId = this.jmapDraftId;
		if (draftId && client) {
			try {
				await client.destroyEmail(draftId);
			} catch {
				// Best-effort
			}
		}

		await this.clearLocalDraft();
		this.clearComposeFields();
		this.isSending = false;
		this.isSavingDraft = false;
	}

	cancelPendingSend() {
		if (!this.pendingSend) return;
		clearTimeout(this.pendingSend.timer);
		this.pendingSend = null;
	}

	private snapshotCompose(): ComposeSnapshot {
		return {
			to: this.to,
			cc: this.cc,
			bcc: this.bcc,
			subject: this.subject,
			body: this.body,
			showCcBcc: this.showCcBcc,
			mode: this.mode,
			jmapDraftId: this.jmapDraftId,
			attachments: this.attachments.map((attachment) => ({ ...attachment }))
		};
	}

	private restoreSnapshot(snapshot: ComposeSnapshot) {
		this.to = snapshot.to;
		this.cc = snapshot.cc;
		this.bcc = snapshot.bcc;
		this.subject = snapshot.subject;
		this.body = snapshot.body;
		this.showCcBcc = snapshot.showCcBcc;
		this.mode = snapshot.mode;
		this.jmapDraftId = snapshot.jmapDraftId;
		this.attachments = snapshot.attachments.map((attachment) => ({ ...attachment }));
		this.error = null;
		this.isSending = false;
	}

	private undoPendingSend() {
		const pending = this.pendingSend;
		if (!pending) return;

		clearTimeout(pending.timer);
		this.pendingSend = null;
		this.restoreSnapshot(pending.snapshot);
		pending.options?.onUndo?.();
		toast.show('Send cancelled', 'info');
	}

	private async flushPendingSend() {
		const pending = this.pendingSend;
		if (!pending) return;

		clearTimeout(pending.timer);
		this.pendingSend = null;
		await this.commitPendingSend(pending);
	}

	private async commitPendingSend(job: PendingSend) {
		this.isSending = true;
		try {
			const result = await this.deliverPayload(job.client, job.payload, job.fromEmail, job.fromName);
			if (result === 'sent' || result === 'queued') {
				if (job.archiveTarget) {
					void this.archiveSourceThread(job.client, job.archiveTarget);
				}
				job.options?.onComplete?.(result);
				return;
			}

			this.restoreSnapshot(job.snapshot);
			job.options?.onUndo?.();
			toast.show('Could not send message — restored your draft', 'error');
		} finally {
			this.isSending = false;
		}
	}

	private captureArchiveTarget(): ArchiveTarget | undefined {
		if (!settings.autoArchiveOnReply) return undefined;
		if (this.mode !== 'reply' && this.mode !== 'reply-all') return undefined;
		if (!this.sourceEmailId) return undefined;
		return { emailId: this.sourceEmailId, mailboxId: this.sourceMailboxId };
	}

	private async archiveSourceThread(client: JMAPClient, target: ArchiveTarget) {
		try {
			const { mail } = await import('$lib/stores/mail.svelte');
			const archive = mail.archiveMailbox();
			if (!archive?.jmapId) return;
			await client.moveToMailbox(target.emailId, archive.jmapId, target.mailboxId);
		} catch {
			// Auto-archive is best-effort; surfacing a failure here would be noisier than helpful.
		}
	}

	async send(
		client: JMAPClient,
		fromEmail: string,
		fromName?: string,
		options?: ComposeSendOptions
	): Promise<ComposeSendResult> {
		const invalid = [
			...invalidAddressParts(this.to),
			...invalidAddressParts(this.cc),
			...invalidAddressParts(this.bcc)
		];
		if (invalid.length) {
			this.error = `Check recipient address: ${invalid[0]}`;
			return false;
		}

		const recipients = parseAddressList(this.to);
		if (!recipients.length) {
			this.error = 'Enter at least one recipient';
			return false;
		}
		if (this.hasUploadingAttachments) {
			this.error = 'Wait for attachments to finish uploading';
			return false;
		}

		const failedAttachment = this.attachments.find((attachment) => attachment.uploadError);
		if (failedAttachment) {
			this.error = `Remove or re-attach "${failedAttachment.name}" before sending`;
			return false;
		}

		const cc = parseAddressList(this.cc);
		const bcc = parseAddressList(this.bcc);
		if (settings.bccSelf && fromEmail) {
			const normalizedFrom = fromEmail.toLowerCase();
			const alreadyOnMessage = [...recipients, ...cc, ...bcc].some(
				(address) => address.toLowerCase() === normalizedFrom
			);
			if (!alreadyOnMessage) bcc.push(fromEmail);
		}
		const draftId = this.jmapDraftId;
		const attachments = this.readyAttachments();
		const subject = this.subject.trim() || '(no subject)';
		const payload: SendPayload = {
			recipients,
			cc,
			bcc,
			subject,
			body: this.body,
			toRaw: this.to,
			ccRaw: this.cc,
			bccRaw: this.bcc,
			draftId,
			attachments,
			sendOptions: {
				fromEmail,
				fromName: fromName?.trim() || undefined,
				cc: cc.length ? cc : undefined,
				bcc: bcc.length ? bcc : undefined,
				attachments: attachments.length ? attachments : undefined,
				format: settings.defaultComposeFormat
			}
		};

		if (!settings.enableUndoSend) {
			this.isSending = true;
			this.error = null;
			const archiveTarget = this.captureArchiveTarget();
			try {
				const result = await this.deliverPayload(client, payload, fromEmail, fromName);
				if (result === 'sent' || result === 'queued') {
					this.clearComposeFields();
					void this.clearLocalDraft();
					if (archiveTarget) void this.archiveSourceThread(client, archiveTarget);
					options?.onComplete?.(result);
				}
				return result;
			} finally {
				this.isSending = false;
			}
		}

		await this.flushPendingSend();

		this.isSending = true;
		this.error = null;

		const snapshot = this.snapshotCompose();
		const archiveTarget = this.captureArchiveTarget();
		const jobId = crypto.randomUUID();
		const timer = setTimeout(() => {
			const pending = this.pendingSend;
			if (!pending || pending.id !== jobId) return;
			this.pendingSend = null;
			void this.commitPendingSend(pending);
		}, UNDO_SEND_DELAY_MS);

		this.pendingSend = {
			id: jobId,
			timer,
			snapshot,
			payload,
			client,
			fromEmail,
			fromName,
			options,
			archiveTarget
		};

		this.clearComposeFields();
		void this.clearLocalDraft();
		this.isSending = false;

		toast.showUndo(`Sending "${subject}"…`, () => this.undoPendingSend());
		return 'pending';
	}

	private async deliverPayload(
		client: JMAPClient,
		payload: SendPayload,
		fromEmail: string,
		fromName?: string
	): Promise<ComposeSendResult> {
		try {
			await client.sendEmail(payload.recipients, payload.subject, payload.body, payload.sendOptions);

			if (payload.draftId) {
				try {
					await client.destroyEmail(payload.draftId);
				} catch {
					// Draft cleanup is best-effort
				}
			}

			return 'sent';
		} catch (error) {
			if (browser && isOfflineError(error)) {
				const { getAccountId, enqueueOutbox } = await import('$lib/db');
				const accountId = getAccountId();
				if (accountId) {
					await enqueueOutbox(accountId, {
						to: payload.toRaw,
						cc: payload.ccRaw,
						bcc: payload.bccRaw,
						subject: payload.subject,
						body: payload.body,
						fromEmail,
						fromName: fromName?.trim() || undefined,
						attachments: payload.attachments.length ? payload.attachments : undefined
					});
					void import('$lib/sync/outbox-processor').then(({ outboxProcessor }) =>
						outboxProcessor.processQueue()
					);
					void outbox.refresh();
					toast.show(`"${payload.subject}" queued — will send when back online`, 'info');
					return 'queued';
				}
			}

			const message = error instanceof Error ? error.message : 'Failed to send message';
			this.error = message;
			toast.show(message, 'error');
			return false;
		}
	}

	private async persistLocalDraft() {
		if (!browser) return;
		if (this.mode !== 'new' && !this.attachments.length) return;
		if (this.isComposeEmpty) {
			await this.clearLocalDraft();
			const draftId = this.jmapDraftId;
			if (draftId) {
				this.jmapDraftId = undefined;
				this.draftSavedAt = null;
				void import('$lib/stores/auth.svelte').then(({ auth }) => {
					if (auth.client) {
						void auth.client.destroyEmail(draftId).catch(() => {});
					}
				});
			}
			return;
		}

		const { getAccountId, saveComposeDraft } = await import('$lib/db');
		const accountId = getAccountId();
		if (!accountId) return;

		const updatedAt = Date.now();
		const storedAttachments = this.storedAttachments();
		await saveComposeDraft(accountId, {
			to: this.to,
			cc: this.cc,
			bcc: this.bcc,
			subject: this.subject,
			body: this.body,
			mode: this.mode,
			jmapDraftId: this.jmapDraftId,
			attachments: storedAttachments.length ? storedAttachments : undefined,
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
		if (this.isComposeEmpty) return;
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
				fromName: fromName?.trim() || undefined,
				attachments: this.readyAttachments(),
				format: settings.defaultComposeFormat
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
