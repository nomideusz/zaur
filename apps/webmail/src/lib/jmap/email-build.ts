import { plainTextToSafeHtml } from '$lib/email/html';

export interface EmailAttachmentInput {
	blobId: string;
	name: string;
	type: string;
	size: number;
	cid?: string;
	disposition?: string;
}

export type ComposeFormat = 'plain' | 'html';

export interface EmailCreateInput {
	fromEmail: string;
	fromName?: string;
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	bodyText: string;
	bodyHtml?: string;
	format?: ComposeFormat;
	mailboxIds: Record<string, boolean>;
	keywords?: Record<string, boolean>;
	attachments?: EmailAttachmentInput[];
}

export function buildEmailCreateData(input: EmailCreateInput): Record<string, unknown> {
	const fromName = input.fromName?.trim();
	const attachments = input.attachments?.filter((attachment) => attachment.blobId) ?? [];

	const data: Record<string, unknown> = {
		from: [{ ...(fromName ? { name: fromName } : {}), email: input.fromEmail }],
		to: input.to.map((email) => ({ email })),
		...(input.cc?.length ? { cc: input.cc.map((email) => ({ email })) } : {}),
		...(input.bcc?.length ? { bcc: input.bcc.map((email) => ({ email })) } : {}),
		subject: input.subject,
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
		size: attachment.size,
		...(attachment.cid ? { cid: attachment.cid } : {}),
		disposition: attachment.disposition || 'attachment'
	}));

	return data;
}

