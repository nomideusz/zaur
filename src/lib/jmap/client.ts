import type { JMAPIdentity, JMAPMailbox, JMAPMethodCall, JMAPResponse, JMAPSession, JMAPEmail } from './types';
import { browser } from '$app/environment';

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

const EMAIL_DETAIL_PROPERTIES = [
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
	'hasAttachment',
	'bodyStructure'
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
	private readonly proxyMode: boolean;

	constructor(serverUrl: string, username: string, password: string, proxyMode = false) {
		this.serverUrl = serverUrl.replace(/\/$/, '');
		this.username = username;
		this.password = password;
		this.proxyMode = proxyMode;
		this.authHeader = proxyMode ? '' : `Basic ${btoa(`${username}:${password}`)}`;
	}

	/** Browser client that routes JMAP through the server-side proxy. */
	static createProxy(): JMAPClient {
		return new JMAPClient('', '', '', true);
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
		if (this.proxyMode) {
			const sessionResponse = await fetch('/api/jmap/session');

			if (!sessionResponse.ok) {
				if (sessionResponse.status === 401) {
					if (browser) {
						window.dispatchEvent(new CustomEvent('zaur:unauthorized'));
					}
					throw new Error('Unauthorized');
				}
				const payload = (await sessionResponse.json().catch(() => ({}))) as { error?: string };
				throw new Error(payload.error ?? `Failed to get session: ${sessionResponse.status}`);
			}

			const payload = (await sessionResponse.json()) as {
				session: JMAPSession;
				accountId: string;
				username: string;
			};

			this.session = payload.session;
			this.apiUrl = '/api/jmap';
			this.accountId = payload.accountId;
			this.username = payload.username;
			return;
		}

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

	async downloadBlob(blobId: string, name: string, type: string): Promise<Response> {
		if (this.proxyMode) {
			const params = new URLSearchParams({ blobId, name, type });
			return fetch(`/api/jmap/download?${params}`);
		}

		if (!this.session) {
			throw new Error('Not connected. Call connect() first.');
		}

		const base = this.session.downloadUrl.endsWith('/')
			? this.session.downloadUrl
			: `${this.session.downloadUrl}/`;
		const url = `${base}${this.accountId}/${blobId}/${encodeURIComponent(name)}?accept=${encodeURIComponent(type)}`;
		return this.authenticatedFetch(url);
	}

	async fetchSyncStates(): Promise<Record<string, string>> {
		const response = await this.request([
			['Mailbox/get', { accountId: this.accountId, ids: null, properties: ['id'] }, 'mb'],
			['Email/get', { accountId: this.accountId, ids: [], properties: ['id'] }, 'em']
		]);

		const states: Record<string, string> = {};
		for (const [method, result] of response.methodResponses ?? []) {
			if (method === 'Mailbox/get' && result.state) states.Mailbox = result.state as string;
			if (method === 'Email/get' && result.state) states.Email = result.state as string;
		}
		return states;
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

	async request(methodCalls: JMAPMethodCall[], using?: string[]): Promise<JMAPResponse> {
		if (!this.apiUrl) {
			throw new Error('Not connected. Call connect() first.');
		}

		const body = JSON.stringify({
			using: using ?? ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
			methodCalls
		});

		const response = this.proxyMode
			? await fetch('/api/jmap', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body
				})
			: await this.authenticatedFetch(this.apiUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body
				});

		const responseText = await response.text();
		if (!response.ok) {
			if (response.status === 401) {
				if (browser) {
					window.dispatchEvent(new CustomEvent('zaur:unauthorized'));
				}
				throw new Error('Unauthorized');
			}
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

	async searchEmails(query: string, limit = 50, position = 0): Promise<EmailQueryResult> {
		const response = await this.request([
			[
				'Email/query',
				{
					accountId: this.accountId,
					filter: { text: query },
					sort: [{ property: 'receivedAt', isAscending: false }],
					limit,
					position
				},
				's0'
			],
			[
				'Email/get',
				{
					accountId: this.accountId,
					'#ids': { resultOf: 's0', name: 'Email/query', path: '/ids' },
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
					properties: [...EMAIL_DETAIL_PROPERTIES],
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

	async getThreadEmails(threadId: string): Promise<JMAPEmail[]> {
		const response = await this.request([
			[
				'Email/query',
				{
					accountId: this.accountId,
					filter: { inThread: threadId },
					sort: [{ property: 'receivedAt', isAscending: true }],
					limit: 100
				},
				'tq0'
			],
			[
				'Email/get',
				{
					accountId: this.accountId,
					'#ids': { resultOf: 'tq0', name: 'Email/query', path: '/ids' },
					properties: [...EMAIL_DETAIL_PROPERTIES],
					fetchTextBodyValues: true,
					fetchHTMLBodyValues: true,
					maxBodyValueBytes: 256000
				},
				'tg0'
			]
		]);

		const getResult = response.methodResponses?.[1]?.[1];
		if (response.methodResponses?.[1]?.[0] !== 'Email/get' || !getResult) {
			return [];
		}

		return (getResult.list as JMAPEmail[]) ?? [];
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

	async saveDraft(params: {
		jmapDraftId?: string;
		to: string[];
		cc?: string[];
		bcc?: string[];
		subject: string;
		body: string;
		fromEmail: string;
		fromName?: string;
	}): Promise<string> {
		const mailboxes = await this.getMailboxes();
		const draftsMailbox = mailboxes.find((mb) => mb.role === 'drafts');
		if (!draftsMailbox) throw new Error('No drafts folder found');

		const draftKey = params.jmapDraftId ?? `draft-${Date.now()}`;
		const emailData = {
			from: [{ ...(params.fromName ? { name: params.fromName } : {}), email: params.fromEmail }],
			to: params.to.map((email) => ({ email })),
			...(params.cc?.length ? { cc: params.cc.map((email) => ({ email })) } : {}),
			...(params.bcc?.length ? { bcc: params.bcc.map((email) => ({ email })) } : {}),
			subject: params.subject,
			keywords: { $draft: true },
			mailboxIds: { [draftsMailbox.id]: true },
			bodyValues: { '1': { value: params.body } },
			textBody: [{ partId: '1', type: 'text/plain' }]
		};

		if (params.jmapDraftId) {
			await this.request([
				['Email/set', { accountId: this.accountId, update: { [params.jmapDraftId]: emailData } }, '0']
			]);
			return params.jmapDraftId;
		}

		await this.request([
			['Email/set', { accountId: this.accountId, create: { [draftKey]: emailData } }, '0']
		]);
		return draftKey;
	}

	openEventStream(): Promise<Response> {
		if (this.proxyMode) {
			return fetch('/api/jmap/events');
		}

		if (!this.session?.eventSourceUrl) {
			throw new Error('No event source URL');
		}

		const url = `${this.session.eventSourceUrl}?types=Mailbox,Email&closeafter=no&ping=30000`;
		return this.authenticatedFetch(url, { headers: { Accept: 'text/event-stream' } });
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
