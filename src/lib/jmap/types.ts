export interface JMAPIdentity {
	id: string;
	name?: string;
	email: string;
	replyTo?: { name?: string; email: string }[];
}

export interface JMAPMailbox {
	id: string;
	name: string;
	parentId?: string | null;
	role?: string | null;
	totalEmails?: number;
	unreadEmails?: number;
	sortOrder?: number;
}

export interface JMAPEmailAddress {
	name?: string;
	email: string;
}

export interface JMAPEmailBodyPart {
	partId?: string;
	type?: string;
}

export interface JMAPEmail {
	id: string;
	threadId: string;
	mailboxIds?: Record<string, boolean>;
	keywords?: Record<string, boolean>;
	size?: number;
	receivedAt: string;
	from?: JMAPEmailAddress[];
	to?: JMAPEmailAddress[];
	cc?: JMAPEmailAddress[];
	subject?: string;
	preview?: string;
	textBody?: JMAPEmailBodyPart[];
	htmlBody?: JMAPEmailBodyPart[];
	bodyValues?: Record<string, { value: string; isEncodingProblem?: boolean; isTruncated?: boolean }>;
	hasAttachment?: boolean;
}

export interface JMAPSession {
	apiUrl: string;
	downloadUrl: string;
	uploadUrl?: string;
	eventSourceUrl?: string;
	primaryAccounts?: Record<string, string>;
	accounts?: Record<string, { name?: string }>;
	capabilities?: Record<string, unknown>;
}

export type JMAPMethodCall = [string, Record<string, unknown>, string];

export interface JMAPResponse {
	methodResponses: Array<[string, Record<string, unknown>, string]>;
}
