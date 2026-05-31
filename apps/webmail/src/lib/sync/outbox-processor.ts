import { browser } from '$app/environment';
import type { JMAPClient } from '$lib/jmap/client';
import { parseAddressList } from '$lib/utils/addresses';
import { isOfflineError } from '$lib/utils/network';
import { outbox } from '$lib/stores/outbox.svelte';
import { toast } from '$lib/stores/toast.svelte';
import type { OutboxAttachmentPayload } from '$lib/types/compose';

const RETRY_MS = 30_000;
const MAX_ATTEMPTS = 5;

function parseOutboxAttachments(json?: string): OutboxAttachmentPayload[] | undefined {
	if (!json) return undefined;
	try {
		const parsed = JSON.parse(json) as OutboxAttachmentPayload[];
		return Array.isArray(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

class OutboxProcessor {
	private client: JMAPClient | null = null;
	private fromEmail = '';
	private fromName: string | undefined;
	private interval: ReturnType<typeof setInterval> | null = null;
	private processing = false;
	private onlineHandler: (() => void) | null = null;

	start(client: JMAPClient, fromEmail: string, fromName?: string) {
		if (!browser) return;

		this.stop();
		this.client = client;
		this.fromEmail = fromEmail;
		this.fromName = fromName;

		this.onlineHandler = () => {
			void this.processQueue();
		};
		window.addEventListener('online', this.onlineHandler);
		this.interval = setInterval(() => {
			void this.processQueue();
		}, RETRY_MS);

		void this.processQueue();
	}

	stop() {
		if (this.onlineHandler) {
			window.removeEventListener('online', this.onlineHandler);
			this.onlineHandler = null;
		}
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		this.client = null;
		this.fromEmail = '';
		this.fromName = undefined;
	}

	async processQueue(): Promise<void> {
		if (!browser || this.processing || !this.client || !navigator.onLine) return;

		const { getAccountId, listPendingOutbox, updateOutboxStatus, removeOutboxItem } =
			await import('$lib/db');
		const accountId = getAccountId();
		if (!accountId) return;

		const pending = await listPendingOutbox(accountId);
		if (!pending.length) return;

		this.processing = true;
		const client = this.client;

		try {
			for (const item of pending) {
				if (item.attempts >= MAX_ATTEMPTS) continue;

				await updateOutboxStatus(item.id, 'sending', { attempts: item.attempts + 1 });

				try {
					const to = parseAddressList(item.to);
					const cc = parseAddressList(item.cc);
					const bcc = parseAddressList(item.bcc);

					await client.sendEmail(to, item.subject, item.body, {
						fromEmail: item.fromEmail || this.fromEmail,
						fromName: item.fromName ?? this.fromName,
						cc: cc.length ? cc : undefined,
						bcc: bcc.length ? bcc : undefined,
						attachments: parseOutboxAttachments(item.attachmentsJson)
					});

					const subject = item.subject || '(no subject)';
					await removeOutboxItem(item.id);
					toast.show(`"${subject}" sent`, 'success');
					void import('$lib/stores/mail.svelte').then(({ mail }) => {
						void mail.refreshAfterSend(client);
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Send failed';
					if (isOfflineError(error)) {
						await updateOutboxStatus(item.id, 'pending', {
							attempts: item.attempts,
							error: message
						});
						break;
					}

					const subject = item.subject || '(no subject)';
					const nextAttempts = item.attempts + 1;
					await updateOutboxStatus(item.id, 'failed', {
						attempts: nextAttempts,
						error: message
					});

					if (nextAttempts >= MAX_ATTEMPTS) {
						toast.show(`Could not send "${subject}" — ${message}`, 'error');
					}
				}
			}
		} finally {
			this.processing = false;
			void outbox.refresh();
		}
	}
}

export const outboxProcessor = new OutboxProcessor();
