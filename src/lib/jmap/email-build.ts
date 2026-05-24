export interface EmailAttachmentInput {
	blobId: string;
	name: string;
	type: string;
	size: number;
}

export interface EmailCreateInput {
	fromEmail: string;
	fromName?: string;
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	body: string;
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
		bodyValues: { '1': { value: input.body } },
		textBody: [{ partId: '1', type: 'text/plain' }]
	};

	if (!attachments.length) return data;

	data.bodyStructure = {
		type: 'multipart/mixed',
		subParts: [
			{ partId: '1', type: 'text/plain' },
			...attachments.map((attachment) => ({
				type: attachment.type || 'application/octet-stream',
				name: attachment.name,
				blobId: attachment.blobId,
				size: attachment.size,
				disposition: 'attachment'
			}))
		]
	};

	return data;
}
