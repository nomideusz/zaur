import type { JMAPClient } from '$lib/jmap/client';
import { parseAddressList } from '$lib/utils/addresses';
import type { MessageDetail } from '$lib/types/mail';

class ComposeStore {
	to = $state('');
	subject = $state('');
	body = $state('');
	isSending = $state(false);
	error = $state<string | null>(null);

	startNew() {
		this.to = '';
		this.subject = '';
		this.body = '';
		this.error = null;
	}

	startReply(message: MessageDetail) {
		const when = new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(message.receivedAt));

		this.to = message.from.email;
		this.subject = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`;
		this.body = `\n\n---\nOn ${when}, ${message.from.name} wrote:\n${message.bodyText}`;
		this.error = null;
	}

	reset() {
		this.to = '';
		this.subject = '';
		this.body = '';
		this.isSending = false;
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

		try {
			await client.sendEmail(recipients, this.subject.trim(), this.body, {
				fromEmail,
				fromName: fromName?.trim() || undefined
			});
			this.reset();
			return true;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to send message';
			return false;
		} finally {
			this.isSending = false;
		}
	}
}

export const compose = new ComposeStore();
