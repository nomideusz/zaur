import type { JMAPIdentity, JMAPMailbox, JMAPMethodCall, JMAPResponse, JMAPSession } from './types';

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
}
