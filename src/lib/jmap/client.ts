import type { JMAPIdentity, JMAPMailbox, JMAPMethodCall, JMAPResponse, JMAPSession, JMAPEmail } from './types';

const EMAIL_LIST_PROPERTIES = [
	'id',
	'threadId',
	'mailboxIds',
	'keywords',
	'size',
	'receivedAt',
	'from',
	'to',
	'cc',
	'subject',
	'preview',
	'hasAttachment'
] as const;

export interface EmailQueryResult {
	emails: JMAPEmail[];
	total: number;
	hasMore: boolean;
}

export class JMAPClient {
	private serverUrl: string;
	private username: string;
	private password: string;
	private authHeader: string;
	private apiUrl = '';
	private accountId = '';
	private session: JMAPSession | null = null;

	constructor(serverUrl: string, username: string, password: string) {
		this.serverUrl = serverUrl.replace(/\/$/, '');
		this.username = username;
		this.password = password;
		this.authHeader = `Basic ${btoa(`${username}:${password}`)}`;
	}

	getSession(): JMAPSession | null {
		return this.session;
	}

	getAccountId(): string {
		return this.accountId;
	}

	getUsername(): string {
		return this.username;
	}

	private async authenticatedFetch(url: string, init?: RequestInit): Promise<Response> {
		const headers = {
			...(init?.headers as Record<string, string> | undefined),
			Authorization: this.authHeader
		};
		return fetch(url, { ...init, headers });
	}

	async connect(): Promise<void> {
		const sessionUrl = `${this.serverUrl}/.well-known/jmap`;

		try {
			const sessionResponse = await this.authenticatedFetch(sessionUrl, { method: 'GET' });

			if (!sessionResponse.ok) {
				if (sessionResponse.status === 401) {
					throw new Error('Invalid username or password');
				}
				throw new Error(`Failed to get session: ${sessionResponse.status}`);
			}

			const session = (await sessionResponse.json()) as JMAPSession;
			this.rewriteSessionUrls(session);

			this.session = session;
			this.apiUrl = session.apiUrl;

			const mailAccount = session.primaryAccounts?.['urn:ietf:params:jmap:mail'];
			const fallbackAccount = Object.keys(session.accounts ?? {})[0];
			this.accountId = mailAccount ?? fallbackAccount ?? '';

			if (!this.accountId) {
				throw new Error('No mail account found in session');
			}
		} catch (error) {
			if (
				error instanceof TypeError &&
				(error.message === 'Failed to fetch' || error.message.includes('NetworkError'))
			) {
				try {
					await fetch(sessionUrl, { mode: 'no-cors' });
					throw new Error('CORS_ERROR');
				} catch (inner) {
					if (inner instanceof Error && inner.message === 'CORS_ERROR') throw inner;
				}
			}
			throw error;
		}
	}

	disconnect(): void {
		this.apiUrl = '';
		this.accountId = '';
		this.session = null;
	}

	private rewriteSessionUrl(url: string): string {
		try {
			const parsed = new URL(url);
			const server = new URL(this.serverUrl);
			if (parsed.origin === server.origin) return url;
			const pathStart = url.indexOf('/', url.indexOf('//') + 2);
			return server.origin + url.slice(pathStart);
		} catch {
			return url;
		}
	}

	private rewriteSessionUrls(session: JMAPSession): void {
		session.apiUrl = this.rewriteSessionUrl(session.apiUrl);
		session.downloadUrl = this.rewriteSessionUrl(session.downloadUrl);
		if (session.eventSourceUrl) {
			session.eventSourceUrl = this.rewriteSessionUrl(session.eventSourceUrl);
		}
	}

	private async request(methodCalls: JMAPMethodCall[], using?: string[]): Promise<JMAPResponse> {
		if (!this.apiUrl) {
			throw new Error('Not connected. Call connect() first.');
		}

		const response = await this.authenticatedFetch(this.apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				using: using ?? ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
				methodCalls
			})
		});

		const responseText = await response.text();
		if (!response.ok) {
			throw new Error(`Request failed: ${response.status} - ${responseText.slice(0, 200)}`);
		}

		return JSON.parse(responseText) as JMAPResponse;
	}

	async getMailboxes(): Promise<JMAPMailbox[]> {
		const response = await this.request([['Mailbox/get', { accountId: this.accountId }, 'mb']]);
		const first = response.methodResponses?.[0];
		if (first?.[0] !== 'Mailbox/get') {
			throw new Error('Unexpected Mailbox/get response');
		}
		return (first[1].list as JMAPMailbox[]) ?? [];
	}

	async getIdentities(): Promise<JMAPIdentity[]> {
		const response = await this.request(
			[['Identity/get', { accountId: this.accountId }, 'id']],
			['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail', 'urn:ietf:params:jmap:submission']
		);
		const first = response.methodResponses?.[0];
		if (first?.[0] !== 'Identity/get') {
			return [];
		}
		return (first[1].list as JMAPIdentity[]) ?? [];
	}

	async queryEmails(mailboxId: string, limit = 50, position = 0): Promise<EmailQueryResult> {
		const response = await this.request([
			[
				'Email/query',
				{
					accountId: this.accountId,
					filter: { inMailbox: mailboxId },
					sort: [{ property: 'receivedAt', isAscending: false }],
					limit,
					position
				},
				'q0'
			],
			[
				'Email/get',
				{
					accountId: this.accountId,
					'#ids': { resultOf: 'q0', name: 'Email/query', path: '/ids' },
					properties: [...EMAIL_LIST_PROPERTIES]
				},
				'g0'
			]
		]);

		const queryResult = response.methodResponses?.[0]?.[1];
		const getResult = response.methodResponses?.[1]?.[1];

		if (response.methodResponses?.[1]?.[0] !== 'Email/get' || !getResult) {
			return { emails: [], total: 0, hasMore: false };
		}

		const emails = (getResult.list as JMAPEmail[]) ?? [];
		const total = (queryResult?.total as number) ?? emails.length;
		const hasMore = position + emails.length < total;

		return { emails, total, hasMore };
	}

	async getEmail(emailId: string): Promise<JMAPEmail | null> {
		const response = await this.request([
			[
				'Email/get',
				{
					accountId: this.accountId,
					ids: [emailId],
					properties: [
						'id',
						'threadId',
						'mailboxIds',
						'keywords',
						'receivedAt',
						'from',
						'to',
						'cc',
						'subject',
						'preview',
						'textBody',
						'htmlBody',
						'bodyValues',
						'hasAttachment'
					],
					fetchTextBodyValues: true,
					fetchHTMLBodyValues: true,
					maxBodyValueBytes: 256000
				},
				'e0'
			]
		]);

		const first = response.methodResponses?.[0];
		if (first?.[0] !== 'Email/get') return null;
		const list = (first[1].list as JMAPEmail[]) ?? [];
		return list[0] ?? null;
	}

	async markAsRead(emailId: string, read = true): Promise<void> {
		await this.request([
			[
				'Email/set',
				{
					accountId: this.accountId,
					update: { [emailId]: { 'keywords/$seen': read } }
				},
				'0'
			]
		]);
	}

	async toggleStar(emailId: string, starred: boolean): Promise<void> {
		await this.request([
			[
				'Email/set',
				{
					accountId: this.accountId,
					update: { [emailId]: { 'keywords/$flagged': starred } }
				},
				'0'
			]
		]);
	}

	async moveToMailbox(emailId: string, mailboxId: string): Promise<void> {
		await this.request([
			[
				'Email/set',
				{
					accountId: this.accountId,
					update: { [emailId]: { mailboxIds: { [mailboxId]: true } } }
				},
				'0'
			]
		]);
	}

	async destroyEmail(emailId: string): Promise<void> {
		await this.request([
			['Email/set', { accountId: this.accountId, destroy: [emailId] }, '0']
		]);
	}

	async sendEmail(
		to: string[],
		subject: string,
		body: string,
		options?: { cc?: string[]; bcc?: string[]; identityId?: string; fromEmail?: string; fromName?: string }
	): Promise<void> {
		const mailboxes = await this.getMailboxes();
		const sentMailbox = mailboxes.find((mb) => mb.role === 'sent');
		const draftsMailbox = mailboxes.find((mb) => mb.role === 'drafts');
		if (!sentMailbox) throw new Error('No sent mailbox found');

		let identityId = options?.identityId;
		if (!identityId) {
			const identities = await this.getIdentities();
			const fromEmail = options?.fromEmail ?? this.username;
			identityId =
				identities.find((id) => id.email === fromEmail)?.id ?? identities[0]?.id ?? this.accountId;
		}

		const emailId = `draft-${Date.now()}`;
		const holdingMailboxId = draftsMailbox?.id ?? sentMailbox.id;
		const fromEmail = options?.fromEmail ?? this.username;
		const fromName = options?.fromName;

		const response = await this.request(
			[
				[
					'Email/set',
					{
						accountId: this.accountId,
						create: {
							[emailId]: {
								from: [{ ...(fromName ? { name: fromName } : {}), email: fromEmail }],
								to: to.map((email) => ({ email })),
								cc: options?.cc?.map((email) => ({ email })),
								bcc: options?.bcc?.map((email) => ({ email })),
								subject,
								keywords: { $draft: true },
								mailboxIds: { [holdingMailboxId]: true },
								bodyValues: { '1': { value: body } },
								textBody: [{ partId: '1', type: 'text/plain' }]
							}
						}
					},
					'0'
				],
				[
					'EmailSubmission/set',
					{
						accountId: this.accountId,
						create: { '1': { emailId: `#${emailId}`, identityId } },
						onSuccessUpdateEmail: {
							'#1': {
								[`mailboxIds/${holdingMailboxId}`]: null,
								[`mailboxIds/${sentMailbox.id}`]: true,
								'keywords/$draft': null,
								'keywords/$seen': true
							}
						}
					},
					'1'
				]
			],
			['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail', 'urn:ietf:params:jmap:submission']
		);

		for (const [methodName, result] of response.methodResponses ?? []) {
			if (methodName.endsWith('/error')) {
				throw new Error((result.description as string) || `Failed to send: ${methodName}`);
			}
			if (result.notCreated || result.notUpdated) {
				const errors = (result.notCreated ?? result.notUpdated) as Record<
					string,
					{ description?: string; type?: string }
				>;
				const firstError = Object.values(errors)[0];
				throw new Error(firstError?.description || firstError?.type || 'Failed to send email');
			}
		}
	}
}
