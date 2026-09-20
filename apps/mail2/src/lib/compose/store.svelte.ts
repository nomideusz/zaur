import { outgoingHtml } from './html';
import type { MessageDetail } from '@zaur/mail-core';
import {
	MAX_ATTACHMENT_BYTES,
	MAX_ATTACHMENT_COUNT,
	attachmentFromServer,
	outgoingAttachments
} from './attachments';
import {
	DRAFT_CONTENT_KEYS,
	buildDraftSaveInput,
	draftContentSignature,
	hasDraftContent
} from './draft-save';
import {
	classifySendFailure,
	enqueueOutbox,
	listOutbox,
	removeOutboxEntry,
	updateOutboxEntry
} from './outbox';
import { PANEL_DEFAULT_W } from './layout';
import { formatScheduleTime } from './schedule';
import { commitRecipient, isDuplicate, makeRecipient, recipientEmails } from './recipients';
import { forwardSeed, replyAllRecipients, replySeed } from './quote';
import type {
	ComposeContact,
	ComposeTransport,
	Draft,
	DraftAttachment,
	DraftKind,
	DraftSeed,
	RecipientField,
	FocusTarget,
	OutgoingAttachment,
	Recipient,
	ReplyMode,
	SendPayload
} from './types';

const DRAFT_SAVE_DEBOUNCE_MS = 1500;

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
	id: string;
	text: string;
	tone?: ToastTone;
	actionLabel?: string;
	action?: () => void;
}

export const RECIPIENT_FIELDS = ['to', 'cc', 'bcc'] as const satisfies readonly RecipientField[];

/**
 * The per-field key names, so a method can take a field rather than existing
 * three times. `to`/`cc`/`bcc` are the chip lists themselves and index directly.
 */
const INPUT = { to: 'toInput', cc: 'ccInput', bcc: 'bccInput' } as const;
const OPEN = { to: 'toOpen', cc: 'ccOpen', bcc: 'bccOpen' } as const;
const HI = { to: 'toHi', cc: 'ccHi', bcc: 'bccHi' } as const;
const SHOWN = { cc: 'ccShown', bcc: 'bccShown' } as const;

export interface NewDraftOptions {
	x?: number;
	y?: number;
	kind?: DraftKind;
	to?: Recipient[];
	subject?: string;
	body?: string;
	bodyHtml?: string;
	focusTarget?: FocusTarget;
	attachments?: DraftAttachment[];
	jmapDraftId?: string | null;
}

class ComposeStore {
	drafts = $state<Draft[]>([]);
	zTop = $state(70);
	trayDragId = $state<string | null>(null);
	toasts = $state<Toast[]>([]);
	contacts = $state<ComposeContact[]>([]);

	#transport: ComposeTransport | null = null;
	#draining = false;
	#saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
	#savedSignatures = new Map<string, string>();

	setTransport(transport: ComposeTransport) {
		this.#transport = transport;
	}

	setContacts(contacts: ComposeContact[]) {
		this.contacts = contacts;
	}

	openPanels(): Draft[] {
		return this.drafts.filter((draft) => draft.stage !== 'minimized');
	}

	frontPanel(): Draft | null {
		let front: Draft | null = null;
		for (const draft of this.drafts) {
			if (draft.stage !== 'minimized' && (!front || draft.z > front.z)) front = draft;
		}
		return front;
	}

	newDraft(options: NewDraftOptions = {}): string {
		const draft: Draft = {
			id: crypto.randomUUID(),
			kind: options.kind ?? 'new',
			to: options.to ?? [],
			toInput: '',
			toOpen: false,
			toHi: 0,
			cc: [],
			ccInput: '',
			ccOpen: false,
			ccHi: 0,
			bcc: [],
			bccInput: '',
			bccOpen: false,
			bccHi: 0,
			ccShown: false,
			bccShown: false,
			subject: options.subject ?? '',
			body: options.body ?? '',
			bodyHtml: options.bodyHtml ?? '',
			attachments: options.attachments ?? [],
			sendAt: null,
			bodyOpened: false,
			stage: 'default',
			x: options.x ?? 24,
			y: options.y ?? 76,
			w: PANEL_DEFAULT_W,
			h: 460,
			saved: null,
			auto: true,
			gesture: false,
			z: ++this.zTop,
			focusTarget: options.focusTarget ?? 'to',
			sending: false,
			sendError: null,
			jmapDraftId: options.jmapDraftId ?? null,
			draftSaving: false,
			draftSavedAt: null
		};
		this.drafts.push(draft);
		return draft.id;
	}

	reply(
		message: MessageDetail,
		thread: MessageDetail[],
		myEmails: Set<string>,
		mode: ReplyMode,
		position?: { x: number; y: number }
	): string {
		const seed = mode === 'forward' ? forwardSeed(message) : replySeed(message);
		let to: Recipient[] = [];
		if (mode === 'reply') {
			to = [{ name: message.from.name, email: message.from.email, meta: '' }];
		} else if (mode === 'replyAll') {
			to = replyAllRecipients(thread, myEmails).map((person) => ({
				...person,
				meta: ''
			}));
		}
		return this.newDraft({
			...position,
			kind: mode,
			to,
			subject: seed.subject,
			body: seed.body,
			focusTarget: mode === 'forward' ? 'body' : 'subject'
		});
	}

	#find(id: string): Draft | undefined {
		return this.drafts.find((draft) => draft.id === id);
	}

	#removeInternal(id: string) {
		const timer = this.#saveTimers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.#saveTimers.delete(id);
		}
		this.#savedSignatures.delete(id);
		this.drafts = this.drafts.filter((draft) => draft.id !== id);
	}

	/**
	 * Close: persist to the Drafts mailbox first, then remove the panel.
	 * Silent per spec — no toast unless the save fails. An emptied draft that
	 * already has a server copy is treated as a discard of that copy.
	 */
	close(id: string) {
		const draft = this.#find(id);
		if (!draft) return;
		if (hasDraftContent(draft)) {
			const signature = draftContentSignature(draft);
			if (signature !== this.#savedSignatures.get(id) && this.#transport) {
				const input = buildDraftSaveInput(draft);
				this.#removeInternal(id);
				void this.#transport.saveDraft(input).catch(() => {
					this.pushToast({ text: 'Draft could not be saved', tone: 'error' });
				});
				return;
			}
		} else if (draft.jmapDraftId && this.#transport) {
			const emailId = draft.jmapDraftId;
			void this.#transport.deleteDraft(emailId).catch(() => {});
		}
		this.#removeInternal(id);
	}

	discard(id: string) {
		const draft = this.#find(id);
		this.#removeInternal(id);
		if (draft?.jmapDraftId) {
			void this.#transport
				?.deleteDraft(draft.jmapDraftId)
				.then(() => this.pushToast({ text: 'Draft discarded', tone: 'info' }))
				.catch(() =>
					this.pushToast({
						text: 'Draft discarded — the saved copy could not be deleted',
						tone: 'warning'
					})
				);
		} else {
			this.pushToast({ text: 'Draft discarded', tone: 'info' });
		}
	}

	minimize(id: string) {
		const draft = this.#find(id);
		if (!draft) return;
		draft.stage = 'minimized';
		draft.toOpen = false;
	}

	restore(id: string) {
		const draft = this.#find(id);
		if (!draft) return;
		draft.stage = 'default';
		draft.z = ++this.zTop;
	}

	toggleMaximize(id: string) {
		const draft = this.#find(id);
		if (!draft) return;
		if (draft.stage === 'maximized') {
			draft.stage = 'default';
			if (draft.saved) {
				draft.x = draft.saved.x;
				draft.y = draft.saved.y;
				draft.w = draft.saved.w;
				draft.h = draft.saved.h;
				draft.saved = null;
			}
		} else {
			draft.saved = { x: draft.x, y: draft.y, w: draft.w, h: draft.h };
			draft.stage = 'maximized';
		}
		draft.z = ++this.zTop;
	}

	raise(id: string) {
		const draft = this.#find(id);
		if (!draft || draft.stage === 'minimized' || draft.z === this.zTop) return;
		draft.z = ++this.zTop;
	}

	move(id: string, x: number, y: number) {
		const draft = this.#find(id);
		if (!draft) return;
		draft.x = x;
		draft.y = y;
	}

	setRect(id: string, rect: { x: number; y: number; w: number; h: number }) {
		const draft = this.#find(id);
		if (!draft) return;
		draft.x = rect.x;
		draft.y = rect.y;
		draft.w = rect.w;
		draft.h = rect.h;
		draft.auto = false;
		draft.saved = null;
	}

	setGesture(id: string, gesture: boolean) {
		const draft = this.#find(id);
		if (draft) draft.gesture = gesture;
	}

	patch(id: string, patch: Partial<Draft>) {
		const draft = this.#find(id);
		if (!draft) return;
		Object.assign(draft, patch);
		for (const key of Object.keys(patch)) {
			if (DRAFT_CONTENT_KEYS.has(key)) {
				this.scheduleDraftSave(id);
				break;
			}
		}
	}

	consumeFocus(id: string) {
		const draft = this.#find(id);
		if (draft) draft.focusTarget = null;
	}

	setSendAt(id: string, sendAt: string | null) {
		const draft = this.#find(id);
		if (draft) draft.sendAt = sendAt;
	}

	// --- recipients ---
	//
	// To, Cc and Bcc are one field three times over, so everything below takes
	// which one it is acting on rather than existing three times.

	setRecipientInput(id: string, field: RecipientField, value: string) {
		const draft = this.#find(id);
		if (!draft) return;
		draft[INPUT[field]] = value;
		draft[OPEN[field]] = value.trim().length > 0;
		draft[HI[field]] = 0;
	}

	setRecipientOpen(id: string, field: RecipientField, open: boolean, highlighted = 0) {
		const draft = this.#find(id);
		if (!draft) return;
		draft[OPEN[field]] = open;
		draft[HI[field]] = highlighted;
	}

	setRecipientHighlight(id: string, field: RecipientField, highlighted: number) {
		const draft = this.#find(id);
		if (draft) draft[HI[field]] = highlighted;
	}

	addRecipient(
		id: string,
		field: RecipientField,
		input: string,
		highlighted: ComposeContact | null
	) {
		const draft = this.#find(id);
		if (!draft) return;
		const { recipient } = commitRecipient(input, highlighted);
		draft[INPUT[field]] = '';
		draft[OPEN[field]] = false;
		draft[HI[field]] = 0;
		if (recipient && !isDuplicate(draft[field], recipient.email)) {
			draft[field].push(recipient);
			this.scheduleDraftSave(id);
		}
	}

	/**
	 * Commit a complete address still sitting in a recipient input. Blurring the
	 * field and sending both route through here, so a recipient typed without
	 * pressing Enter is never silently dropped. Partial text that is not an
	 * address yet is left alone for the user to finish.
	 */
	commitPendingRecipient(id: string, field: RecipientField) {
		const draft = this.#find(id);
		if (!draft) return;
		const input = draft[INPUT[field]];
		if (makeRecipient(input)) this.addRecipient(id, field, input, null);
		else draft[OPEN[field]] = false;
	}

	removeRecipient(id: string, field: RecipientField, email: string) {
		const draft = this.#find(id);
		if (!draft) return;
		const before = draft[field].length;
		draft[field] = draft[field].filter((r) => r.email !== email);
		if (draft[field].length !== before) this.scheduleDraftSave(id);
	}

	/**
	 * Correct one chip in place. A typo in the fourth of four addresses used to
	 * mean deleting it and typing the whole thing again; the chip hands its text
	 * back instead. Empty text removes it, and text that collides with another
	 * chip on the same field just drops the one being edited.
	 */
	editRecipient(id: string, field: RecipientField, email: string, next: string) {
		const draft = this.#find(id);
		if (!draft) return;
		const index = draft[field].findIndex((r) => r.email === email);
		if (index === -1) return;
		const replacement = makeRecipient(next, draft[field][index]?.meta ?? '');
		const rest = draft[field].filter((_, at) => at !== index);
		if (!replacement || isDuplicate(rest, replacement.email)) draft[field] = rest;
		else draft[field] = draft[field].map((r, at) => (at === index ? replacement : r));
		this.scheduleDraftSave(id);
	}

	backspaceRemoveRecipient(id: string, field: RecipientField) {
		const draft = this.#find(id);
		if (draft && !draft[INPUT[field]] && draft[field].length > 0) {
			draft[field].pop();
			this.scheduleDraftSave(id);
		}
	}

	/** Reveal or hide a Cc / Bcc row. Hiding one empties it — see the ✕ on the row. */
	showRecipientField(id: string, field: 'cc' | 'bcc', shown: boolean) {
		const draft = this.#find(id);
		if (!draft) return;
		draft[SHOWN[field]] = shown;
		if (!shown) {
			draft[field] = [];
			draft[INPUT[field]] = '';
			draft[OPEN[field]] = false;
			this.scheduleDraftSave(id);
		}
	}

	// --- attachments ---

	/** Upload each picked file and track it as a live chip on the draft. */
	attachFiles(id: string, files: File[]): void {
		const draft = this.#find(id);
		if (!draft) return;
		for (const file of files) {
			if (draft.attachments.length >= MAX_ATTACHMENT_COUNT) {
				this.pushToast({
					text: `A draft can hold at most ${MAX_ATTACHMENT_COUNT} attachments`,
					tone: 'warning'
				});
				break;
			}
			if (file.size > MAX_ATTACHMENT_BYTES) {
				this.pushToast({ text: `"${file.name}" is too large — the limit is 25 MB`, tone: 'warning' });
				continue;
			}
			const chip: DraftAttachment = {
				id: crypto.randomUUID(),
				name: file.name || 'file',
				type: file.type || 'application/octet-stream',
				size: file.size,
				blobId: null,
				status: 'uploading'
			};
			draft.attachments.push(chip);
			// Kept until the upload lands, so a failed chip can be retried
			// without picking the file again.
			this.#pendingFiles.set(chip.id, file);
			this.scheduleDraftSave(id);
			this.#uploadInto(id, chip.id, file);
		}
	}

	/** The `File` behind each chip that has not uploaded yet — never persisted. */
	#pendingFiles = new Map<string, File>();

	/** Try a failed upload again with the file that was picked. */
	retryAttachment(draftId: string, chipId: string): void {
		const chip = this.#findAttachment(draftId, chipId);
		const file = this.#pendingFiles.get(chipId);
		if (!chip || chip.status !== 'error') return;
		if (!file) {
			// The page was reloaded in between; the bytes are gone with it.
			this.pushToast({ text: `Pick "${chip.name}" again to attach it`, tone: 'warning' });
			return;
		}
		chip.status = 'uploading';
		this.#uploadInto(draftId, chipId, file);
	}

	#uploadInto(draftId: string, chipId: string, file: File): void {
		const transport = this.#transport;
		if (!transport) {
			this.#attachmentFailed(draftId, chipId);
			return;
		}
		transport
			.uploadAttachment(file)
			.then((uploaded) => {
				const chip = this.#findAttachment(draftId, chipId);
				if (!chip) return;
				chip.blobId = uploaded.blobId;
				chip.size = uploaded.size;
				chip.type = uploaded.type;
				chip.status = 'ready';
				this.#pendingFiles.delete(chipId);
				this.scheduleDraftSave(draftId);
			})
			.catch(() => this.#attachmentFailed(draftId, chipId));
	}

	#attachmentFailed(draftId: string, chipId: string): void {
		const chip = this.#findAttachment(draftId, chipId);
		if (!chip) return;
		chip.status = 'error';
		this.pushToast({ text: `Could not upload "${chip.name}"`, tone: 'error' });
	}

	#findAttachment(draftId: string, chipId: string): DraftAttachment | undefined {
		return this.#find(draftId)?.attachments.find((attachment) => attachment.id === chipId);
	}

	removeAttachment(id: string, attachmentId: string): void {
		const draft = this.#find(id);
		if (!draft) return;
		draft.attachments = draft.attachments.filter((attachment) => attachment.id !== attachmentId);
		this.#pendingFiles.delete(attachmentId);
		this.scheduleDraftSave(id);
	}

	// --- draft persistence ---

	scheduleDraftSave(id: string): void {
		const draft = this.#find(id);
		if (!draft || draft.sending || !this.#transport) return;
		const existing = this.#saveTimers.get(id);
		if (existing) clearTimeout(existing);
		this.#saveTimers.set(
			id,
			setTimeout(() => {
				this.#saveTimers.delete(id);
				void this.saveDraftNow(id);
			}, DRAFT_SAVE_DEBOUNCE_MS)
		);
	}

	/** Persist the draft to the Drafts mailbox; reschedules if it changed mid-save. */
	async saveDraftNow(id: string): Promise<void> {
		const draft = this.#find(id);
		if (!draft || draft.sending || !this.#transport) return;
		if (!hasDraftContent(draft)) return;
		const signature = draftContentSignature(draft);
		if (signature === this.#savedSignatures.get(id)) return;
		const input = buildDraftSaveInput(draft);
		draft.draftSaving = true;
		try {
			const { emailId } = await this.#transport.saveDraft(input);
			this.#savedSignatures.set(id, signature);
			const current = this.#find(id);
			if (current) {
				current.jmapDraftId = emailId;
				current.draftSavedAt = Date.now();
				if (draftContentSignature(current) !== signature) this.scheduleDraftSave(id);
			}
		} catch (cause) {
			if (classifySendFailure(cause) !== 'network') {
				this.pushToast({ text: 'Draft could not be saved', tone: 'error' });
			}
		} finally {
			const current = this.#find(id);
			if (current) current.draftSaving = false;
		}
	}

	/** Open a panel from a persisted server draft (Drafts mailbox → compose). */
	reopenDraft(seed: DraftSeed, position?: { x: number; y: number }): string {
		const id = this.newDraft({
			...position,
			kind: 'draft',
			to: seed.to,
			subject: seed.subject,
			body: seed.body,
			bodyHtml: seed.bodyHtml,
			attachments: seed.attachments,
			jmapDraftId: seed.jmapDraftId,
			focusTarget: seed.to.length === 0 ? 'to' : seed.subject.trim() ? 'body' : 'subject'
		});
		const draft = this.#find(id);
		if (draft) {
			draft.cc = seed.cc;
			draft.bcc = seed.bcc;
			draft.ccShown = seed.cc.length > 0;
			draft.bccShown = seed.bcc.length > 0;
			this.#savedSignatures.set(id, draftContentSignature(draft));
		}
		return id;
	}

	reorderMinimized(fromId: string, toIndex: number) {
		// Dock order = array order of the minimized drafts; open panels interleave
		// in the array, so reorder within the minimized subsequence only.
		const order = this.drafts.filter((draft) => draft.stage === 'minimized');
		const from = order.findIndex((draft) => draft.id === fromId);
		if (from === -1) return;
		const clamped = Math.max(0, Math.min(toIndex, order.length - 1));
		if (clamped === from) return;
		const [moved] = order.splice(from, 1);
		if (moved) order.splice(clamped, 0, moved);
		const minimizedIds = new Set(order.map((draft) => draft.id));
		let next = 0;
		this.drafts = this.drafts.map((draft) =>
			minimizedIds.has(draft.id) ? order[next++]! : draft
		);
	}

	async sendDraft(id: string): Promise<void> {
		const draft = this.#find(id);
		if (!draft || draft.sending) return;
		for (const field of RECIPIENT_FIELDS) this.commitPendingRecipient(id, field);
		const cc = recipientEmails(draft.cc);
		const bcc = recipientEmails(draft.bcc);
		if (draft.to.length === 0 && cc.length === 0 && bcc.length === 0) {
			// Never invent a recipient: restore + focus To instead (spec).
			if (draft.stage === 'minimized') this.restore(id);
			this.patch(id, { focusTarget: 'to' });
			return;
		}
		const pending = draft.attachments.find((attachment) => attachment.status !== 'ready');
		if (pending) {
			draft.sendError =
				pending.status === 'uploading'
					? 'Attachments are still uploading — try again in a moment.'
					: 'An attachment failed to upload — remove it before sending.';
			return;
		}

		const payload: SendPayload = {
			to: recipientEmails(draft.to),
			cc,
			bcc,
			subject: draft.subject,
			body: draft.body,
			bodyHtml: draft.bodyHtml ? outgoingHtml(draft.bodyHtml) : undefined,
			sendAt: draft.sendAt ?? undefined,
			attachments: outgoingAttachments(draft.attachments),
			account: this.#transport?.account ?? undefined
		};

		draft.sendError = null;
		draft.sending = true;
		const transport = this.#transport;
		if (!transport) {
			draft.sending = false;
			draft.sendError = 'Mail is still connecting — try again.';
			return;
		}

		try {
			const result = await transport.send(payload);
			// The sent copy lives in Sent — the saved draft must not linger too.
			const savedDraftId = draft.jmapDraftId;
			if (savedDraftId) {
				void transport.deleteDraft(savedDraftId).catch(() => {});
			}
			this.#removeInternal(id);
			if (payload.sendAt && result.emailId) {
				const emailId = result.emailId;
				this.pushToast({
					text: `Scheduled for ${formatScheduleTime(new Date(payload.sendAt))}`,
					tone: 'success',
					actionLabel: 'Undo',
					action: () => void this.undoScheduled(emailId, payload)
				});
			} else {
				this.pushToast({ text: 'Message sent', tone: 'success' });
			}
		} catch (cause) {
			if (classifySendFailure(cause) === 'network') {
				try {
					await enqueueOutbox(payload);
					this.#removeInternal(id);
					this.pushToast({ text: "You're offline — message saved to the outbox", tone: 'warning' });
				} catch {
					draft.sending = false;
					draft.sendError = "You're offline and the message couldn't be stored. Try again.";
				}
			} else {
				draft.sending = false;
				draft.sendError =
					cause instanceof Error ? cause.message : 'The message could not be sent.';
			}
		}
	}

	async undoScheduled(emailId: string, payload: SendPayload): Promise<void> {
		try {
			await this.#transport?.cancelScheduled(emailId);
			this.newDraft({
				to: payload.to.map((email) => ({ name: '', email, meta: '' })),
				subject: payload.subject,
				body: payload.body,
				bodyHtml: payload.bodyHtml,
				attachments: payload.attachments?.map((part) => attachmentFromServer(part)),
				focusTarget: 'subject'
			});
			this.pushToast({ text: 'Scheduled send cancelled', tone: 'info' });
		} catch {
			this.pushToast({ text: 'Could not cancel the scheduled message', tone: 'error' });
		}
	}

	/** Drain the offline outbox; returns how many queued messages were sent. */
	async drainOutbox(): Promise<number> {
		if (this.#draining || !this.#transport) return 0;
		this.#draining = true;
		let sent = 0;
		try {
			const entries = await listOutbox();
			for (const entry of entries) {
				// Written in another account: it waits for that account, and a wait is not
				// a failed attempt (five of those would delete the message).
				const owner = entry.payload.account;
				if (owner && owner !== this.#transport.account) continue;
				try {
					await this.#transport.send(entry.payload);
					await removeOutboxEntry(entry.id);
					sent += 1;
				} catch (cause) {
					entry.attempts += 1;
					entry.lastError = cause instanceof Error ? cause.message : String(cause);
					await updateOutboxEntry(entry);
					if (classifySendFailure(cause) === 'network') break;
					if (entry.attempts >= 5) {
						await removeOutboxEntry(entry.id);
						this.pushToast({ text: 'A queued message kept failing and was removed', tone: 'error' });
					}
				}
			}
		} finally {
			this.#draining = false;
		}
		return sent;
	}

	pushToast(toast: { text: string; tone?: ToastTone; actionLabel?: string; action?: () => void }) {
		const id = crypto.randomUUID();
		this.toasts.unshift({ id, ...toast });
		setTimeout(() => this.dismissToast(id), toast.action ? 9000 : 5000);
	}

	dismissToast(id: string) {
		this.toasts = this.toasts.filter((toast) => toast.id !== id);
	}

	runToastAction(id: string) {
		const toast = this.toasts.find((t) => t.id === id);
		this.dismissToast(id);
		toast?.action?.();
	}
}

export const compose = new ComposeStore();
