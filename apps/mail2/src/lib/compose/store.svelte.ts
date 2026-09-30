import { goto } from '$app/navigation';
import { outgoingHtml } from './html';
import { messageOf } from '../errors';
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
	updateOutboxEntry,
	withOutboxLock
} from './outbox';
import { PANEL_DEFAULT_W } from './layout';
import { formatScheduleTime } from './schedule';
import { commitRecipient, isDuplicate, outgoingRecipients, splitRecipients, uniqueRecipients } from './recipients';
import { answerLink, forwardSeed, replyAllRecipients, replyRecipients, replySeed, signatureBlock, withSignature } from './quote';
import type {
	AnswerLink,
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
// Steady typing never pauses that long: a change waits this much at most.
const DRAFT_SAVE_MAX_WAIT_MS = 5000;
// The copy on this device is written this soon: a reload costs this much typing at most.
const DRAFT_LOCAL_COPY_MS = 300;
const MAX_TOASTS = 3;
// How long anything waits for a draft save that is out: see `#savedCopy`.
const SAVE_WAIT_MS = 8000;
const settled = (save: Promise<unknown> | undefined) =>
	Promise.race([save, new Promise((resolve) => setTimeout(resolve, SAVE_WAIT_MS))]);

/**
 * A failure `classifySendFailure` calls the network's, in errors.ts's words for
 * which of the two it was: no connection here, or a server that is not
 * answering (online, it is not "offline"). Handed a stand-in, because the
 * decision is already made and the browser's own wording varies.
 */
const unreachable = (then: string) => messageOf(new TypeError('Failed to fetch'), then);
/** How often a waiting outbox is tried again, whatever the browser says about the network. */
const OUTBOX_RETRY_MS = 20_000;

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
	id: string;
	text: string;
	tone?: ToastTone;
	actionLabel?: string;
	action?: () => void;
}

/** A sent message inside its undo window: the timer that sends it, and the draft an Undo gives back. */
interface HeldSend {
	timer: ReturnType<typeof setTimeout>;
	draft: Draft;
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
	cc?: Recipient[];
	subject?: string;
	body?: string;
	bodyHtml?: string;
	focusTarget?: FocusTarget;
	attachments?: DraftAttachment[];
	jmapDraftId?: string | null;
	/** Send-as address; the account's first (primary) address when omitted. */
	from?: string;
	answers?: AnswerLink;
}


class ComposeStore {
	drafts = $state<Draft[]>([]);
	zTop = $state(70);
	trayDragId = $state<string | null>(null);
	toasts = $state<Toast[]>([]);
	contacts = $state<ComposeContact[]>([]);
	/** The account's own addresses, primary first. */
	identities = $state<ComposeIdentity[]>([]);
	/** Messages waiting in the outbox for the server to be reachable: past their undo window, not yet sent. */
	outboxCount = $state(0);
	/**
	 * The panel the keyboard was last in, until something outside the panels is
	 * clicked or focused. Focus that falls out of it to <body> (a control that
	 * removed itself) is still typing into that panel as far as its author knows,
	 * so the page's letter shortcuts stay off: they archived mail.
	 */
	keysIn: string | null = null;

	#transport: ComposeTransport | null = null;
	#draining = false;
	#recovering = false;
	#saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
	/** When each draft's oldest unsaved change was made. */
	#unsavedSince = new Map<string, number>();
	#savedSignatures = new Map<string, string>();
	/**
	 * The save each draft has on its way. A server save is create-new +
	 * destroy-old, so two out at once with the same old id leave two copies:
	 * every save of a draft queues behind the one before it.
	 */
	#saves = new Map<string, Promise<void>>();
	#localTimers = new Map<string, ReturnType<typeof setTimeout>>();
	/** Keyed by outbox entry id. */
	#held = new Map<string, HeldSend>();
	#watching = false;
	#retryTimer: ReturnType<typeof setTimeout> | null = null;

	/** A message is waiting out its undo window: leaving now would delay it to the next visit. */
	get holding(): boolean {
		return this.#held.size > 0;
	}

	setTransport(transport: ComposeTransport) {
		this.#transport = transport;
		this.#watchOutbox();
	}

	/**
	 * The outbox looks after itself from the first time compose is wired up in a
	 * browser: it is tried again on a timer for as long as anything waits in it,
	 * and at once when the network or the tab comes back. `navigator.onLine` is
	 * not trusted to say so — a server out of reach never flips it.
	 */
	#watchOutbox() {
		if (this.#watching || typeof window === 'undefined') return;
		this.#watching = true;
		const retry = () => void this.drainOutbox();
		window.addEventListener('online', retry);
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') retry();
			// Hidden is the last the page may hear before it is closed or put away
			// (a phone gives no other warning): what was typed is saved now.
			else void this.flush();
		});
		void this.#countOutbox();
	}

	/** Recount what waits, and keep a retry pending while something does. */
	async #countOutbox(): Promise<void> {
		const entries = await listOutbox().catch(() => []);
		// This tab's own undo windows have their own timers.
		const waiting = entries.filter((entry) => !this.#held.has(entry.id));
		const now = Date.now();
		this.outboxCount = waiting.filter((entry) => (entry.holdUntil ?? 0) <= now).length;
		if (this.#retryTimer) clearTimeout(this.#retryTimer);
		this.#retryTimer = waiting.length
			? setTimeout(() => void this.drainOutbox(), OUTBOX_RETRY_MS)
			: null;
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

	/** See `keysIn`: true while the panel that last had the keyboard is still open. */
	holdsKeys(): boolean {
		return this.openPanels().some((draft) => draft.id === this.keysIn);
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
			to: uniqueRecipients(options.to ?? []),
			toInput: '',
			toOpen: false,
			toHi: 0,
			cc: uniqueRecipients(options.cc ?? []),
			ccInput: '',
			ccOpen: false,
			ccHi: 0,
			bcc: [],
			bccInput: '',
			bccOpen: false,
			bccHi: 0,
			ccShown: !!options.cc?.length,
			bccShown: false,
			subject: options.subject ?? '',
			body: withSignature(body, signature),
			bodyHtml: options.bodyHtml ?? '',
			// A draft that was written rich reopens rich, whatever the preference says now.
			plain: options.bodyHtml ? false : prefs.composePlain,
			attachments: options.attachments ?? [],
			...(options.answers && { answers: options.answers }),
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
		let cc: Recipient[] = [];
		if (mode === 'reply') {
			to = replyRecipients(message, myEmails).map((person) => ({ ...person, meta: '' }));
		} else if (mode === 'replyAll') {
			const all = replyAllRecipients(message, myEmails);
			to = all.to.map((person) => ({ ...person, meta: '' }));
			cc = all.cc.map((person) => ({ ...person, meta: '' }));
		}
		return this.newDraft({
			...position,
			kind: mode,
			from: addressed ? this.#identity(addressed.email)?.email : undefined,
			to,
			cc,
			subject: seed.subject,
			body: seed.body,
			// A forward carries the files: the blobs are already the account's, so nothing re-uploads.
			attachments: mode === 'forward' ? message.attachments.map(attachmentFromServer) : undefined,
			answers: answerLink(message, mode === 'forward'),
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
		this.#unsavedSince.delete(id);
		this.#savedSignatures.delete(id);
		clearTimeout(this.#localTimers.get(id));
		this.#localTimers.delete(id);
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
		// Being sent: it is no longer a draft to keep, or to throw away.
		if (!draft || draft.sending) return;
		const transport = this.#transport;
		if (hasDraftContent(draft)) {
			const signature = draftContentSignature(draft);
			if (signature !== this.#savedSignatures.get(id) && transport) {
				const record = localDraft(draft, transport.account, true);
				this.#removeInternal(id);
				void (async () => {
					await putLocalDraft(record).catch(() => {});
					try {
						record.draft.jmapDraftId = await this.#savedCopy(draft);
						await transport.saveDraft(buildDraftSaveInput(record.draft));
						await removeLocalDraft(id);
					} catch (cause) {
						this.pushToast(
							classifySendFailure(cause) === 'network'
								? { text: unreachable('The draft is kept on this device until it can be saved'), tone: 'warning' }
								: { text: 'Draft could not be saved', tone: 'error' }
						);
					}
				})();
				return;
			}
		} else if (transport) {
			void this.#savedCopy(draft)
				.then((emailId) => emailId && transport.deleteDraft(emailId))
				.catch(() => {});
		}
		this.#removeInternal(id);
		void removeLocalDraft(id).catch(() => {});
	}

	discard(id: string) {
		const draft = this.#find(id);
		if (draft?.sending) return;
		this.#removeInternal(id);
		void removeLocalDraft(id).catch(() => {});
		// Undo writes it again as a new draft: the saved copy is gone by then.
		const kept = draft && { ...$state.snapshot(draft), jmapDraftId: null, sending: false, draftSaving: false };
		const discarded = {
			text: 'Draft discarded',
			tone: 'info' as const,
			...(kept && { actionLabel: 'Undo', action: () => this.#restoreDiscarded(kept) })
		};
		const transport = this.#transport;
		void (async () => {
			const emailId = draft && (await this.#savedCopy(draft));
			if (emailId) await transport?.deleteDraft(emailId);
			this.pushToast(discarded);
		})().catch(() =>
			this.pushToast({
				text: 'Draft discarded — the saved copy could not be deleted',
				tone: 'warning'
			})
		);
	}

	/**
	 * The id of a draft's saved copy, once the save on its way (if any) has
	 * answered. A save that never answers is not waited out: a copy left in
	 * Drafts beats a Discard, a Close or a sign-out that never happens.
	 */
	async #savedCopy(draft: Draft): Promise<string | null> {
		await settled(this.#saves.get(draft.id));
		return draft.jmapDraftId;
	}

	/**
	 * After a send: the saved draft goes, and a save that was on its way when
	 * Send was pressed has replaced it, so it is that one's copy. Send itself
	 * does not wait for it.
	 */
	#dropSavedCopy(draft: Draft, transport: ComposeTransport) {
		void this.#savedCopy(draft)
			.then((emailId) => emailId && transport.deleteDraft(emailId))
			.catch(() => {});
	}

	#restoreDiscarded(kept: Draft) {
		const draft = this.#find(this.newDraft({ kind: kept.kind }));
		if (!draft) return;
		Object.assign(draft, kept, { id: draft.id, z: draft.z, focusTarget: null });
		this.scheduleDraftSave(draft.id);
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
		const draft = this.#find(id);
		if (!draft) return;
		// A picture has no place in plain text: the "[image]" line that stood for it
		// in the text reading of the rich message goes with it.
		const body = plain ? draft.body.replace(/^(?:> ?)*\[image\]\n?/gm, '') : draft.body;
		this.patch(id, { plain, body, bodyHtml: '', focusTarget: 'body' });
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
		// What Send objected to is being corrected.
		draft.sendError = null;
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

	/**
	 * Every way an address gets in — Enter, a comma, leaving the field, a paste,
	 * Send — ends here: the highlighted suggestion, or every address in the text
	 * (a list is as many chips). What is not an address stays in the field.
	 */
	addRecipient(
		id: string,
		field: RecipientField,
		input: string,
		highlighted: ComposeContact | null
	) {
		const draft = this.#find(id);
		if (!draft) return;
		const { recipients, remaining } = commitRecipient(input, highlighted);
		draft[INPUT[field]] = remaining;
		draft[OPEN[field]] = false;
		draft[HI[field]] = 0;
		for (const recipient of recipients) {
			// One row per person: an address added here leaves the row it was in.
			for (const other of RECIPIENT_FIELDS) {
				if (other !== field && isDuplicate(draft[other], recipient.email)) {
					draft[other] = draft[other].filter((r) => r.email.toLowerCase() !== recipient.email.toLowerCase());
				}
			}
			if (!isDuplicate(draft[field], recipient.email)) draft[field].push(recipient);
		}
		if (recipients.length) this.scheduleDraftSave(id);
	}

	/**
	 * Commit the addresses still sitting in a recipient input. Blurring the
	 * field and sending both route through here, so a recipient typed without
	 * pressing Enter is never silently dropped. Text with no address in it is
	 * left alone for the user to finish — Send refuses to go around it.
	 */
	commitPendingRecipient(id: string, field: RecipientField) {
		const draft = this.#find(id);
		if (!draft) return;
		const input = draft[INPUT[field]];
		if (splitRecipients(input).recipients.length) this.addRecipient(id, field, input, null);
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
		const rest = draft[field].filter((_, at) => at !== index);
		// Usually one address for one; a list typed into the chip takes its place, all of it.
		const replacements = splitRecipients(next, draft[field][index]?.meta ?? '').recipients.filter(
			(recipient) => !isDuplicate(rest, recipient.email)
		);
		draft[field] = [...rest.slice(0, index), ...replacements, ...rest.slice(index)];
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
		this.#keepLocal(id);
		const existing = this.#saveTimers.get(id);
		if (existing) clearTimeout(existing);
		const since = this.#unsavedSince.get(id) ?? Date.now();
		this.#unsavedSince.set(id, since);
		this.#saveTimers.set(
			id,
			setTimeout(
				() => {
					this.#saveTimers.delete(id);
					this.#unsavedSince.delete(id);
					void this.saveDraftNow(id);
				},
				Math.max(0, Math.min(DRAFT_SAVE_DEBOUNCE_MS, since + DRAFT_SAVE_MAX_WAIT_MS - Date.now()))
			)
		);
	}

	/**
	 * The server save waits for a pause in the typing; the copy on this device
	 * does not. A reload, or a tab the phone throws away, inside that wait finds
	 * the draft in the dock again (`recoverLocalDrafts`). The server's answer
	 * removes the copy.
	 */
	#keepLocal(id: string) {
		if (this.#localTimers.has(id)) return;
		this.#localTimers.set(
			id,
			setTimeout(() => {
				this.#localTimers.delete(id);
				const draft = this.#find(id);
				if (!draft || draft.sending || !this.#transport || !hasDraftContent(draft)) return;
				// Saved while this waited: a copy written now would come back as a second draft.
				if (draftContentSignature(draft) === this.#savedSignatures.get(id)) return;
				void putLocalDraft(localDraft(draft, this.#transport.account, false)).catch(() => {});
			}, DRAFT_LOCAL_COPY_MS)
		);
	}

	/**
	 * Save now what is waiting out the debounce: before a sign-out or an account
	 * switch ends the session it would be saved into, and the page reloads.
	 */
	async flush(): Promise<void> {
		const ids = [...new Set([...this.#saveTimers.keys(), ...this.#saves.keys()])];
		for (const id of ids) clearTimeout(this.#saveTimers.get(id));
		this.#saveTimers.clear();
		this.#unsavedSince.clear();
		await settled(Promise.all(ids.map((id) => this.saveDraftNow(id))));
	}

	/** Persist the draft to the Drafts mailbox; reschedules if it changed mid-save. */
	saveDraftNow(id: string): Promise<void> {
		const run = (this.#saves.get(id) ?? Promise.resolve()).then(() => this.#save(id));
		this.#saves.set(id, run);
		void run.then(() => {
			if (this.#saves.get(id) === run) this.#saves.delete(id);
		});
		return run;
	}

	/** Never rejects: the queue behind it, and whoever waits for the saved copy, go on. */
	async #save(id: string): Promise<void> {
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
			// Also when the panel went meanwhile: Send, Close and Discard wait for this id.
			draft.jmapDraftId = emailId;
			const current = this.#find(id);
			if (current) {
				this.#savedSignatures.set(id, signature);
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
		// Already open, or waiting in the dock: a second panel on the same saved
		// draft would have the two saving over each other.
		const open = seed.jmapDraftId && this.drafts.find((draft) => draft.jmapDraftId === seed.jmapDraftId);
		if (open) {
			this.restore(open.id);
			return open.id;
		}
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
			answers: seed.answers,
			focusTarget: seed.to.length === 0 ? 'to' : seed.subject.trim() ? 'body' : 'subject'
		});
		const draft = this.#find(id);
		if (draft) {
			draft.cc = uniqueRecipients(seed.cc);
			draft.bcc = uniqueRecipients(seed.bcc);
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
		// Text left in an address row was meant to be somebody. Sending around it
		// dropped them without a word: the row is shown, marked, and says why.
		const stray = RECIPIENT_FIELDS.find((field) => draft[INPUT[field]].trim());
		if (stray) {
			if (draft.stage === 'minimized') this.restore(id);
			draft.sendError = `“${draft[INPUT[stray]].trim()}” is not an email address — correct it or remove it.`;
			draft.focusTarget = stray;
			return;
		}
		const to = outgoingRecipients(draft.to);
		const cc = outgoingRecipients(draft.cc);
		const bcc = outgoingRecipients(draft.bcc);
		if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
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
			to,
			cc,
			bcc,
			subject: draft.subject,
			body: draft.body,
			bodyHtml: draft.bodyHtml ? outgoingHtml(draft.bodyHtml) : undefined,
			sendAt: draft.sendAt ?? undefined,
			attachments: outgoingAttachments(draft.attachments),
			from: draft.from || undefined,
			answers: $state.snapshot(draft.answers),
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
		// A scheduled send has its own Undo, and a later time is window enough.
		const undoMs = payload.sendAt ? 0 : prefs.undoSendSeconds * 1000;
		if (undoMs > 0 && (await this.#hold(draft, payload, undoMs))) return;

		try {
			const result = await transport.send(payload);
			// The sent copy lives in Sent — the saved draft must not linger too.
			this.#dropSavedCopy(draft, transport);
			this.#removeInternal(id);
			void removeLocalDraft(id).catch(() => {});
			if (payload.sendAt && result.emailId) {
				const emailId = result.emailId;
				this.pushToast({
					text: `Scheduled for ${formatScheduleTime(new Date(payload.sendAt))}`,
					tone: 'success',
					actionLabel: 'Undo',
					action: () => void this.#undoScheduled(emailId, draft)
				});
			} else {
				this.pushToast({ text: 'Message sent', tone: 'success' });
			}
		} catch (cause) {
			if (classifySendFailure(cause) === 'network') {
				try {
					await enqueueOutbox(payload, { draftId: draft.jmapDraftId ?? undefined });
					this.#removeInternal(id);
					void removeLocalDraft(id).catch(() => {});
					this.pushToast({ text: unreachable('Message saved to the outbox'), tone: 'warning' });
					void this.#countOutbox();
				} catch {
					draft.sending = false;
					draft.sendError = unreachable("The message couldn't be stored. Try again.");
				}
			} else {
				draft.sending = false;
				draft.sendError = messageOf(cause, 'The message could not be sent.');
			}
		}
	}

	/**
	 * Cancelling moves the scheduled copy back to Drafts, so the panel that
	 * returns — the one that was sent, as it was — takes that copy as its own.
	 */
	async #undoScheduled(emailId: string, draft: Draft): Promise<void> {
		try {
			await this.#transport?.cancelScheduled(emailId);
			draft.jmapDraftId = emailId;
			if (!this.#giveBack(draft, null)) this.pushToast({ text: 'Scheduled send cancelled', tone: 'info' });
		} catch {
			this.pushToast({ text: 'Could not cancel the scheduled message', tone: 'error' });
		}
	}

	/**
	 * The undo window. The message waits in the outbox, not in memory, so a tab
	 * closed or crashed inside the window still sends it — on the next load,
	 * which is why the page asks before it is left while one is held.
	 * False when there is no local database: then it goes at once.
	 */
	async #hold(draft: Draft, payload: SendPayload, undoMs: number): Promise<boolean> {
		let entryId: string;
		try {
			entryId = await enqueueOutbox(payload, {
				holdUntil: Date.now() + undoMs,
				draftId: draft.jmapDraftId ?? undefined
			});
		} catch {
			return false;
		}
		this.#removeInternal(draft.id);
		void removeLocalDraft(draft.id).catch(() => {});
		this.#held.set(entryId, { draft, timer: setTimeout(() => void this.#release(entryId), undoMs) });
		this.pushToast({
			text: 'Sending…',
			tone: 'info',
			actionLabel: 'Undo',
			action: () => void this.#unsend(entryId),
			duration: undoMs
		});
		return true;
	}

	async #release(entryId: string): Promise<void> {
		const transport = this.#transport;
		await withOutboxLock(async () => {
			// Undone while the lock was busy: the Undo won.
			const held = this.#held.get(entryId);
			if (!held || !transport) return;
			this.#held.delete(entryId);
			const entry = (await listOutbox()).find((candidate) => candidate.id === entryId);
			if (!entry) return; // another tab sent it
			try {
				await transport.send(entry.payload);
				await removeOutboxEntry(entryId);
				// ponytail: a tab closed inside the undo window sends from the entry alone, which
				// knows the copy as it was at Send; one saved after that stays in Drafts.
				this.#dropSavedCopy(held.draft, transport);
				this.pushToast({ text: 'Message sent', tone: 'success' });
			} catch (cause) {
				if (classifySendFailure(cause) === 'network') {
					this.pushToast({ text: unreachable('Message saved to the outbox'), tone: 'warning' });
					void this.#countOutbox();
					return;
				}
				// Refused: handed back with the reason, as a send without the window would be.
				await removeOutboxEntry(entryId);
				this.#giveBack(held.draft, messageOf(cause, 'The message could not be sent.'));
			}
		});
	}

	async #unsend(entryId: string): Promise<void> {
		const held = this.#held.get(entryId);
		if (!held) {
			this.pushToast({ text: 'Already sent', tone: 'info' });
			return;
		}
		clearTimeout(held.timer);
		this.#held.delete(entryId);
		await withOutboxLock(() => removeOutboxEntry(entryId));
		this.#giveBack(held.draft, null);
	}

	/**
	 * The same panel, where it was, with what was written — and saved again, locally and to Drafts.
	 * Panels are drawn on the Mail page only: from any other section the draft comes
	 * back out of sight, so a notice says where it is. True when it did.
	 */
	#giveBack(draft: Draft, sendError: string | null): boolean {
		draft.sending = false;
		draft.sendError = sendError;
		if (draft.stage !== 'minimized') draft.z = ++this.zTop;
		this.drafts = [...this.drafts, draft];
		this.scheduleDraftSave(draft.id);
		if (location.pathname === '/') return false;
		// Open that a leave-guard turned back (an unsaved event) is offered again:
		// the notice was the only thing saying where the draft went.
		const offer = () =>
			this.pushToast({
				text: sendError ? 'Could not send — the draft is back in Mail' : 'Not sent — the draft is back in Mail',
				tone: sendError ? 'error' : 'info',
				actionLabel: 'Open',
				action: () =>
					void goto('/')
						.catch(() => {})
						.then(() => {
							if (location.pathname !== '/') offer();
						})
			});
		offer();
		return true;
	}

	/**
	 * Drain the offline outbox; returns how many queued messages were sent.
	 * Callers may sit in an `$effect`: nothing reactive is read before the first await.
	 */
	async drainOutbox(): Promise<number> {
		if (this.#draining || !this.#transport) return 0;
		this.#draining = true;
		try {
			const sent = await withOutboxLock(() => this.#drain());
			// The "saved to the outbox" notice was the last the user heard of it.
			if (sent) {
				this.pushToast({
					text: sent === 1 ? 'Queued message sent' : `${sent} queued messages sent`,
					tone: 'success'
				});
			}
			return sent;
		} finally {
			this.#draining = false;
			await this.#countOutbox();
		}
	}

	async #drain(): Promise<number> {
		const transport = this.#transport;
		if (!transport) return 0;
		let sent = 0;
		for (const entry of await listOutbox()) {
			// Inside an undo window — this tab's, or another's that may still take it back.
			if (this.#held.has(entry.id) || (entry.holdUntil ?? 0) > Date.now()) continue;
			// Written in another account: it waits for that account, and a wait is not
			// a failed attempt (five of those would delete the message).
			const owner = entry.payload.account;
			if (owner && owner !== transport.account) continue;
			try {
				await transport.send(entry.payload);
				await removeOutboxEntry(entry.id);
				if (entry.draftId) void transport.deleteDraft(entry.draftId).catch(() => {});
				sent += 1;
			} catch (cause) {
				entry.attempts += 1;
				entry.lastError = messageOf(cause, 'The message could not be sent.');
				await updateOutboxEntry(entry);
				if (classifySendFailure(cause) === 'network') break;
				if (entry.attempts >= 5) {
					await removeOutboxEntry(entry.id);
					this.pushToast({ text: 'A queued message kept failing and was removed', tone: 'error' });
				}
			}
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

	pushToast({
		duration,
		...toast
	}: {
		text: string;
		tone?: ToastTone;
		actionLabel?: string;
		action?: () => void;
		/** How long it stays, when that is not the default for its kind. */
		duration?: number;
	}) {
		const id = crypto.randomUUID();
		// Three notices at most: every action says something, and six of them stood
		// over the list. One said again (a key held down) replaces itself, and the
		// oldest go first — a notice with a button last of all, being an Undo still
		// good for its few seconds. Quick triage leaves the last three Undos.
		const kept = this.toasts.filter((old) => old.action || old.text !== toast.text);
		for (let over = kept.length + 1 - MAX_TOASTS; over > 0; over -= 1) {
			const oldest = kept.findLastIndex((old) => !old.action);
			kept.splice(oldest < 0 ? kept.length - 1 : oldest, 1);
		}
		this.toasts = [{ id, ...toast }, ...kept];
		setTimeout(() => this.dismissToast(id), duration ?? (toast.action ? 9000 : 5000));
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
