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

export interface JMAPSession {
	apiUrl: string;
	downloadUrl: string;
	eventSourceUrl?: string;
	primaryAccounts?: Record<string, string>;
	accounts?: Record<string, { name?: string }>;
	capabilities?: Record<string, unknown>;
}

export type JMAPMethodCall = [string, Record<string, unknown>, string];

export interface JMAPResponse {
	methodResponses: Array<[string, Record<string, unknown>, string]>;
}
