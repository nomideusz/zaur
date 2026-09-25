import { outgoingHtml } from './html';
import { prefs } from '../settings.svelte.ts';
import type { MessageDetail } from '@zaur/mail-core';
import { inlineImageDownloadUrl } from '@zaur/mail-core/email/inline-images';
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
	hasDraftContent,
	localDraft,
	type LocalDraft
} from './draft-save';
import {
	classifySendFailure,
	enqueueOutbox,
	listLocalDrafts,
	listOutbox,
	putLocalDraft,
	removeLocalDraft,
	removeOutboxEntry,
	updateOutboxEntry
} from './outbox';
import { PANEL_DEFAULT_W } from './layout';
import { formatScheduleTime } from './schedule';
import { commitRecipient, isDuplicate, makeRecipient, recipientEmails } from './recipients';
import { forwardSeed, replyAllRecipients, replySeed, signatureBlock, withSignature } from './quote';
import type {
	ComposeContact,
	ComposeIdentity,
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
	/** Send-as address; the account's first (primary) address when omitted. */
	from?: string;
}


class ComposeStore {
	drafts = $state<Draft[]>([]);
	zTop = $state(70);
	trayDragId = $state<string | null>(null);
	toasts = $state<Toast[]>([]);
	contacts = $state<ComposeContact[]>([]);
	/** The account's own addresses, primary first. */
	identities = $state<ComposeIdentity[]>([]);

	#transport: ComposeTransport | null = null;
	#draining = false;
	#recovering = false;
	#saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
	#savedSignatures = new Map<string, string>();

	setTransport(transport: ComposeTransport) {
		this.#transport = transport;
	}

	setContacts(contacts: ComposeContact[]) {
		this.contacts = contacts;
	}

	setIdentities(identities: ComposeIdentity[]) {
		this.identities = identities;
	}

	#identity(email: string): ComposeIdentity | undefined {
		const want = email.trim().toLowerCase();
		return want
			? this.identities.find((identity) => identity.email.toLowerCase() === want)
			: this.identities[0];
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
		const from = options.from ?? this.identities[0]?.email ?? '';
		// A reopened draft already carries whatever signature it was written with.
		const signature = options.kind === 'draft' ? '' : signatureBlock(this.#identity(from)?.signature);
		const body = options.body ?? '';
		const draft: Draft = {
			id: crypto.randomUUID(),
			kind: options.kind ?? 'new',
			from,
			signature,
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
			body: withSignature(body, signature),
			bodyHtml: options.bodyHtml ?? '',
			// A draft that was written rich reopens rich, whatever the preference says now.
			plain: options.bodyHtml ? false : prefs.composePlain,
			attachments: options.attachments ?? [],
			sendAt: null,
			// A saved draft has been written in (an image in it would not fit the closed box).
			bodyOpened: !!options.jmapDraftId,
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
		// Answer from the address it was sent to, when that is one of ours.
		const addressed = [...message.to, ...message.cc].find(
			(person) => person.email && this.#identity(person.email)
		);
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
			from: addressed ? this.#identity(addressed.email)?.email : undefined,
			to,
			subject: seed.subject,
			body: seed.body,
			// A reply is addressed and titled already: straight to writing. A forward still needs a To.
			focusTarget: mode === 'forward' ? 'to' : 'body'
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
	 * already has a server copy is treated as a discard of that copy. A save
	 * that fails leaves the draft on this device until the server takes it.
	 */
	close(id: string) {
		const draft = this.#find(id);
		if (!draft) return;
		const transport = this.#transport;
		if (hasDraftContent(draft)) {
			const signature = draftContentSignature(draft);
			if (signature !== this.#savedSignatures.get(id) && transport) {
				const record = localDraft(draft, transport.account, true);
				this.#removeInternal(id);
				void (async () => {
					await putLocalDraft(record).catch(() => {});
					try {
						await transport.saveDraft(buildDraftSaveInput(record.draft));
						await removeLocalDraft(id);
					} catch (cause) {
						this.pushToast(
							classifySendFailure(cause) === 'network'
								? { text: "You're offline — the draft is kept on this device until it can be saved", tone: 'warning' }
								: { text: 'Draft could not be saved', tone: 'error' }
						);
					}
				})();
				return;
			}
		} else if (draft.jmapDraftId && transport) {
			const emailId = draft.jmapDraftId;
			void transport.deleteDraft(emailId).catch(() => {});
		}
		this.#removeInternal(id);
		void removeLocalDraft(id).catch(() => {});
	}

	discard(id: string) {
		const draft = this.#find(id);
		this.#removeInternal(id);
		void removeLocalDraft(id).catch(() => {});
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

	/**
	 * Plain ⇄ rich. Going plain keeps the words and drops the formatting (`body` is
	 * already the editor's plain reading); going rich reseeds the editor from the
	 * text. This draft only — what new messages start as is a setting.
	 */
	setPlain(id: string, plain: boolean) {
		this.patch(id, { plain, bodyHtml: '', focusTarget: 'body' });
	}

	consumeFocus(id: string) {
		const draft = this.#find(id);
		if (draft) draft.focusTarget = null;
	}

	/**
	 * Switch the send-as address. The signature follows wherever compose can
	 * still find it: anywhere in plain text, or in a rich body nobody has written
	 * in yet (clearing `bodyHtml` reseeds the editor from the text).
	 */
	setFrom(id: string, from: string) {
		const draft = this.#find(id);
		if (!draft || draft.from === from) return;
		const next = signatureBlock(this.#identity(from)?.signature);
		// ponytail: rich text that has been edited keeps its signature — swapping it
		// inside Trix's HTML needs an editor API, add it if people switch From mid-message.
		const untouched = draft.plain || !draft.bodyHtml;
		if (untouched && draft.signature && draft.body.includes(draft.signature)) {
			this.patch(id, { from, signature: next, body: draft.body.replace(draft.signature, next), bodyHtml: '' });
		} else if (untouched && !draft.signature && !draft.body.trim()) {
			this.patch(id, { from, signature: next, body: next, bodyHtml: '' });
		} else {
			this.patch(id, { from });
		}
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

	/**
	 * An image written into the text (rich compose): uploaded like an attachment,
	 * but shown and sent inline, so it is not a chip. Resolves to the URL the
	 * editor shows it from; the draft counts it as pending until then, and will
	 * not send meanwhile.
	 */
	async uploadInlineImage(id: string, file: File): Promise<string> {
		const draft = this.#find(id);
		const transport = this.#transport;
		if (!draft || !transport) throw new Error('Mail is still connecting');
		if (file.size > MAX_ATTACHMENT_BYTES) {
			this.pushToast({ text: `"${file.name}" is too large — the limit is 25 MB`, tone: 'warning' });
			throw new Error('Too large');
		}
		draft.inlineUploads = (draft.inlineUploads ?? 0) + 1;
		try {
			const uploaded = await transport.uploadAttachment(file);
			return inlineImageDownloadUrl({ blobId: uploaded.blobId, name: file.name || 'image', type: uploaded.type });
		} catch (cause) {
			this.pushToast({ text: `Could not upload "${file.name}"`, tone: 'error' });
			throw cause;
		} finally {
			const current = this.#find(id);
			if (current) current.inlineUploads = Math.max(0, (current.inlineUploads ?? 1) - 1);
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
		const transport = this.#transport;
		const record = localDraft(draft, transport.account, false);
		draft.draftSaving = true;
		try {
			// On this device first, so a reload while the server is out of reach keeps it.
			await putLocalDraft(record).catch(() => {});
			const { emailId } = await transport.saveDraft(buildDraftSaveInput(record.draft));
			this.#savedSignatures.set(id, signature);
			const current = this.#find(id);
			if (current) {
				current.jmapDraftId = emailId;
				current.draftSavedAt = Date.now();
				if (draftContentSignature(current) !== signature) this.scheduleDraftSave(id);
				else await removeLocalDraft(id).catch(() => {});
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
			from: seed.from ? this.#identity(seed.from)?.email : undefined,
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
		if (draft.inlineUploads) {
			draft.sendError = 'Images are still uploading — try again in a moment.';
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
			from: draft.from || undefined,
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
			void removeLocalDraft(id).catch(() => {});
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
					void removeLocalDraft(id).catch(() => {});
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
				// Its body already holds the signature.
				kind: 'draft',
				from: payload.from,
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

	/**
	 * Settle what only this device holds: drafts closed while the server was out
	 * of reach go to Drafts, drafts a reload interrupted come back to the dock,
	 * and drafts still open here retry their save. Run on load and on `online`.
	 */
	async recoverLocalDrafts(): Promise<void> {
		const transport = this.#transport;
		if (this.#recovering || !transport?.account) return;
		this.#recovering = true;
		let restored = 0;
		try {
			for (const record of await listLocalDrafts()) {
				if (record.account && record.account !== transport.account) continue;
				if (this.#find(record.id)) {
					this.scheduleDraftSave(record.id);
					continue;
				}
				if (record.closed) {
					try {
						await transport.saveDraft(buildDraftSaveInput(record.draft));
						await removeLocalDraft(record.id);
						continue;
					} catch (cause) {
						if (classifySendFailure(cause) === 'network') continue;
						// The server refuses it: hand it back rather than lose it.
					}
				}
				this.#restoreLocal(record);
				restored += 1;
			}
		} catch {
			// No local database: nothing was kept, so nothing to recover.
		} finally {
			this.#recovering = false;
		}
		if (restored) {
			this.pushToast({
				text: restored === 1 ? 'Restored an unsaved draft' : `Restored ${restored} unsaved drafts`,
				tone: 'info'
			});
		}
	}

	// ponytail: two tabs open on load both restore the same unsaved draft, and
	// either one's save wins; claim records per tab (Web Locks) if that bites.
	#restoreLocal(record: LocalDraft) {
		const draft = this.#find(this.newDraft({ kind: record.draft.kind }));
		if (!draft) return;
		Object.assign(draft, record.draft, { stage: 'minimized', focusTarget: null });
		this.scheduleDraftSave(draft.id);
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
