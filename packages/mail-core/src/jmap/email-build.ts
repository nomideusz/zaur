import { plainTextToSafeHtml } from '../email/text.ts';

export interface EmailAttachmentInput {
	blobId: string;
	name: string;
	type: string;
	size: number;
	cid?: string;
	disposition?: string;
}

export type ComposeFormat = 'plain' | 'html';

/** A recipient: a bare address, or one with the display name it goes out under. */
export type EmailRecipientInput = string | { name?: string; email: string };

export function recipientEmail(recipient: EmailRecipientInput): string {
	return typeof recipient === 'string' ? recipient : recipient.email;
}

function recipientAddress(recipient: EmailRecipientInput): { name?: string; email: string } {
	if (typeof recipient === 'string') return { email: recipient };
	const name = recipient.name?.trim();
	return { ...(name ? { name } : {}), email: recipient.email };
}

export interface EmailCreateInput {
	fromEmail: string;
	fromName?: string;
	to: EmailRecipientInput[];
	cc?: EmailRecipientInput[];
	bcc?: EmailRecipientInput[];
	subject: string;
	bodyText: string;
	bodyHtml?: string;
	format?: ComposeFormat;
	mailboxIds: Record<string, boolean>;
	keywords?: Record<string, boolean>;
	attachments?: EmailAttachmentInput[];
	/** A reply's threading headers: Message-IDs without angle brackets (RFC 8621 §4.1.2.3). */
	inReplyTo?: string[];
	references?: string[];
}

/**
 * The message a reply answers or a forward carries: its headers thread the
 * reply under it, and once the reply is sent it is flagged `$answered` (or
 * `$forwarded`).
 */
export interface EmailAnswerInput {
	/** Server id of that message, to flag it; without one nothing is flagged. */
	emailId?: string;
	/** Its Message-ID, without angle brackets. */
	messageId: string;
	forward?: boolean;
	/** A reply's `References`: the thread so far, this message last. */
	references?: string[];
}

/** `In-Reply-To` and `References` for a reply; a forward starts a thread of its own. */
export function answerHeaders(answers: EmailAnswerInput | undefined): { inReplyTo?: string[]; references?: string[] } {
	if (!answers?.messageId || answers.forward) return {};
	return {
		inReplyTo: [answers.messageId],
		references: answers.references?.length ? answers.references : [answers.messageId]
	};
}

export function buildEmailCreateData(input: EmailCreateInput): Record<string, unknown> {
	const fromName = input.fromName?.trim();
	const attachments = input.attachments?.filter((attachment) => attachment.blobId) ?? [];

	const data: Record<string, unknown> = {
		from: [{ ...(fromName ? { name: fromName } : {}), email: input.fromEmail }],
		to: input.to.map(recipientAddress),
		...(input.cc?.length ? { cc: input.cc.map(recipientAddress) } : {}),
		...(input.bcc?.length ? { bcc: input.bcc.map(recipientAddress) } : {}),
		subject: input.subject,
		...(input.inReplyTo?.length ? { inReplyTo: input.inReplyTo } : {}),
		...(input.references?.length ? { references: input.references } : {}),
		mailboxIds: input.mailboxIds,
		...(input.keywords ? { keywords: input.keywords } : {}),
		...(input.format === 'html'
			? {
					bodyValues: {
						'1': { value: input.bodyText },
						'2': { value: input.bodyHtml || plainTextToSafeHtml(input.bodyText) }
					},
					textBody: [{ partId: '1', type: 'text/plain' }],
					htmlBody: [{ partId: '2', type: 'text/html' }]
				}
			: {
					bodyValues: { '1': { value: input.bodyText } },
					textBody: [{ partId: '1', type: 'text/plain' }]
				})
	};

	if (!attachments.length) return data;

	data.attachments = attachments.map((attachment) => ({
		type: attachment.type || 'application/octet-stream',
		name: attachment.name,
		blobId: attachment.blobId,
		// Unknown for an image written into the text; the server has the blob's own.
		...(attachment.size ? { size: attachment.size } : {}),
		...(attachment.cid ? { cid: attachment.cid } : {}),
		disposition: attachment.disposition || 'attachment'
	}));

	return data;
}

