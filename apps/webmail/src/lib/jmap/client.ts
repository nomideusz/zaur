import type {
	JMAPChangesResult,
	JMAPIdentity,
	JMAPMailbox,
	JMAPMethodCall,
	JMAPResponse,
	JMAPSession,
	JMAPEmail
} from './types';
import { parseSearchQuery } from '$lib/mail/search-query';
import { buildEmailCreateData, type ComposeFormat, type EmailAttachmentInput } from './email-build';
import { resolveMailAccountId } from './account';
import { buildDownloadUrl, buildUploadUrl } from './urls';
import type {
	CalendarEventQueryResult,
	JMAPCalendar,
	JMAPCalendarEvent
} from './calendar-types';
import { browser } from '$app/environment';

interface CachedSessionData {
	session: JMAPSession;
	apiUrl: string;
	accountId: string;
	username: string;
}

interface CachedSessionEntry {
	data: CachedSessionData;
	timestamp: number;
}

const SESSION_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function basicAuthHeader(username: string, password: string): string {
	const credentials = `${username}:${password}`;
	if (typeof Buffer !== 'undefined') {
		return `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`;
	}
	return `Basic ${btoa(credentials)}`;
}
const sessionCache = new Map<string, CachedSessionEntry>();

const CALENDARS_URN = 'urn:ietf:params:jmap:calendars';
const CALENDAR_USING = ['urn:ietf:params:jmap:core', CALENDARS_URN] as const;

const CALENDAR_EVENT_PROPERTIES = [
	'id',
	'baseEventId',
	'recurrenceId',
	'calendarIds',
	'title',
	'description',
	'start',
	'duration',
	'timeZone',
	'showWithoutTime',
	'utcStart',
	'utcEnd',
	'locations',
	'recurrenceRule',
	'recurrenceRules'
] as const;

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
	'bcc',
	'subject',
	'preview',
	'textBody',
	'htmlBody',
	'bodyValues',
	'hasAttachment',
	'bodyStructure'
] as const;

function jmapFailureMessage(value: unknown, fallback: string): string {
	if (value && typeof value === 'object') {
		const failure = value as { description?: unknown; type?: unknown };
		if (typeof failure.description === 'string' && failure.description) return failure.description;
		if (typeof failure.type === 'string' && failure.type) return failure.type;
	}
	return fallback;
}

function assertNoMethodErrors(response: JMAPResponse, fallback: string): void {
	for (const [methodName, result] of response.methodResponses ?? []) {
		if (methodName.endsWith('/error') || methodName === 'error') {
			throw new Error(jmapFailureMessage(result, fallback));
		}
	}
}

function assertEmailSetSucceeded(response: JMAPResponse, fallback: string): Record<string, unknown> {
	assertNoMethodErrors(response, fallback);
	const first = response.methodResponses?.find(([methodName]) => methodName === 'Email/set');
	if (!first) throw new Error('Unexpected Email/set response');

	const result = first[1];
	const failureBuckets = [result.notCreated, result.notUpdated, result.notDestroyed];
	for (const bucket of failureBuckets) {
		if (bucket && typeof bucket === 'object' && Object.keys(bucket).length) {
			throw new Error(jmapFailureMessage(Object.values(bucket)[0], fallback));
		}
	}

	return result;
}

export interface EmailQueryResult {
	emails: JMAPEmail[];
	total: number;
	hasMore: boolean;
}

export class JMAPClient {
	private serverUrl: string;
	private username: string;
	private password?: string;
	private authHeader: string;
	private apiUrl = '';
	private accountId = '';
	private session: JMAPSession | null = null;
	private readonly proxyMode: boolean;

	constructor(serverUrl: string, username: string, passwordOrToken: string, proxyMode = false, isToken = false) {
		this.serverUrl = serverUrl.replace(/\/$/, '');
		this.username = username;
		this.password = isToken ? undefined : passwordOrToken;
		this.proxyMode = proxyMode;
		this.authHeader = proxyMode
			? ''
			: isToken
				? `Bearer ${passwordOrToken}`
				: basicAuthHeader(username, passwordOrToken);
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

	hasCalendars(): boolean {
		return !!this.session?.capabilities?.[CALENDARS_URN];
	}

	getCalendarAccountId(): string {
		return this.session?.primaryAccounts?.[CALENDARS_URN] ?? this.accountId;
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
		const cacheKey = `${this.serverUrl}|${this.authHeader}`;
		const cached = sessionCache.get(cacheKey);
		const now = Date.now();

		if (cached && (now - cached.timestamp < SESSION_CACHE_TTL_MS)) {
			this.session = cached.data.session;
			this.apiUrl = cached.data.apiUrl;
			this.accountId = cached.data.accountId;
			this.username = cached.data.username;
			return;
		}

		try {
			const sessionResponse = await this.authenticatedFetch(sessionUrl, { method: 'GET' });

			if (!sessionResponse.ok) {
				if (sessionResponse.status === 401) {
					sessionCache.delete(cacheKey);
					throw new Error('Invalid username or password');
				}
				throw new Error(`Failed to get session: ${sessionResponse.status}`);
			}

			const session = (await sessionResponse.json()) as JMAPSession;
			this.rewriteSessionUrls(session);

			this.session = session;
			this.apiUrl = session.apiUrl;

			if (session.username) {
				this.username = session.username;
			}

			const mailAccount = resolveMailAccountId(session, this.username);
			this.accountId = mailAccount;

			if (!this.accountId) {
				throw new Error('No mail account found in session');
			}

			sessionCache.set(cacheKey, {
				data: {
					session,
					apiUrl: this.apiUrl,
					accountId: this.accountId,
					username: this.username
				},
				timestamp: Date.now()
			});
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

		const url = buildDownloadUrl(this.session.downloadUrl, this.accountId, blobId, name, type);
		return this.authenticatedFetch(url);
	}

	async uploadBlob(
		data: ArrayBuffer | Blob,
		type: string
	): Promise<{ blobId: string; size: number; type: string }> {
		if (this.proxyMode) {
			const response = await fetch('/api/jmap/upload', {
				method: 'POST',
				headers: { 'Content-Type': type || 'application/octet-stream' },
				body: data
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as {
					error?: string;
					message?: string;
				};
				throw new Error(
					payload.error ?? payload.message ?? `Upload failed: ${response.status}`
				);
			}

			return (await response.json()) as { blobId: string; size: number; type: string };
		}

		if (!this.session?.uploadUrl) {
			throw new Error('Upload not supported by this server');
		}

		const url = buildUploadUrl(this.session.uploadUrl, this.accountId);

		const response = await this.authenticatedFetch(url, {
			method: 'POST',
			headers: { 'Content-Type': type || 'application/octet-stream' },
			body: data
		});

		if (!response.ok) {
			const detail = (await response.text()).slice(0, 200);
			throw new Error(
				detail ? `Upload failed: ${response.status} - ${detail}` : `Upload failed: ${response.status}`
			);
		}

		const payload = (await response.json()) as {
			blobId?: string;
			size?: number;
			type?: string;
		};

		if (!payload.blobId) {
			throw new Error('Upload response missing blobId');
		}

		return {
			blobId: payload.blobId,
			size: payload.size ?? 0,
			type: payload.type ?? type
		};
	}

	async fetchSyncStates(): Promise<Record<string, string>> {
		const response = await this.request([
			['Mailbox/get', { accountId: this.accountId, ids: [], properties: ['id'] }, 'mb'],
			['Email/get', { accountId: this.accountId, ids: [], properties: ['id'] }, 'em']
		]);

		const states: Record<string, string> = {};
		for (const [method, result] of response.methodResponses ?? []) {
			if (method === 'Mailbox/get' && result.state) states.Mailbox = result.state as string;
			if (method === 'Email/get' && result.state) states.Email = result.state as string;
		}
		return states;
	}

	async getEmailChanges(sinceState: string, maxChanges = 500): Promise<JMAPChangesResult> {
		const response = await this.request([
			[
				'Email/changes',
				{ accountId: this.accountId, sinceState, maxChanges },
				'ec0'
			]
		]);

		const first = response.methodResponses?.[0];
		if (first?.[0] === 'error') {
			const error = first[1] as { type?: string; description?: string };
			throw new Error(error.description ?? error.type ?? 'Email/changes failed');
		}
		if (first?.[0] !== 'Email/changes') {
			throw new Error('Unexpected Email/changes response');
		}

		const result = first[1];
		return {
			oldState: (result.oldState as string) ?? sinceState,
			newState: result.newState as string,
			hasMoreChanges: !!result.hasMoreChanges,
			created: (result.created as string[]) ?? [],
			updated: (result.updated as string[]) ?? [],
			destroyed: (result.destroyed as string[]) ?? []
		};
	}

	async getMailboxChanges(sinceState: string, maxChanges = 100): Promise<JMAPChangesResult> {
		const response = await this.request([
			[
				'Mailbox/changes',
				{ accountId: this.accountId, sinceState, maxChanges },
				'mc0'
			]
		]);

		const first = response.methodResponses?.[0];
		if (first?.[0] === 'error') {
			const error = first[1] as { type?: string; description?: string };
			throw new Error(error.description ?? error.type ?? 'Mailbox/changes failed');
		}
		if (first?.[0] !== 'Mailbox/changes') {
			throw new Error('Unexpected Mailbox/changes response');
		}

		const result = first[1];
		return {
			oldState: (result.oldState as string) ?? sinceState,
			newState: result.newState as string,
			hasMoreChanges: !!result.hasMoreChanges,
			created: (result.created as string[]) ?? [],
			updated: (result.updated as string[]) ?? [],
			destroyed: (result.destroyed as string[]) ?? []
		};
	}

	async getEmailsByIds(ids: string[], detail = false): Promise<JMAPEmail[]> {
		if (!ids.length) return [];

		const response = await this.request([
			[
				'Email/get',
				{
					accountId: this.accountId,
					ids,
					properties: detail ? [...EMAIL_DETAIL_PROPERTIES] : [...EMAIL_LIST_PROPERTIES],
					...(detail
						? {
								fetchTextBodyValues: true,
								fetchHTMLBodyValues: true,
								maxBodyValueBytes: 256000
							}
						: {})
				},
				'eg0'
			]
		]);

		const first = response.methodResponses?.[0];
		if (first?.[0] !== 'Email/get') return [];
		return (first[1].list as JMAPEmail[]) ?? [];
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
		if (session.uploadUrl) {
			session.uploadUrl = this.rewriteSessionUrl(session.uploadUrl);
		}
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
			let detail = responseText.slice(0, 300);
			try {
				const parsed = JSON.parse(responseText) as { error?: string };
				if (typeof parsed.error === 'string' && parsed.error) {
					detail = parsed.error;
				}
			} catch {
				// Use raw response text
			}
			if (response.status === 502) {
				throw new Error(
					`Mail server unavailable (502). Check that your mail server is running and reachable. ${detail}`
				);
			}
			throw new Error(`Request failed: ${response.status} — ${detail}`);
		}

		return JSON.parse(responseText) as JMAPResponse;
	}

	private async calendarRequest(methodCalls: JMAPMethodCall[]): Promise<JMAPResponse> {
		return this.request(methodCalls, [...CALENDAR_USING]);
	}

	async getCalendars(): Promise<JMAPCalendar[]> {
		if (!this.hasCalendars()) return [];

		const response = await this.calendarRequest([
			['Calendar/get', { accountId: this.getCalendarAccountId() }, 'cal']
		]);

		const first = response.methodResponses?.[0];
		if (first?.[0] === 'error') {
			const error = first[1] as { type?: string; description?: string };
			throw new Error(error.description ?? error.type ?? 'Calendar/get failed');
		}
		if (first?.[0] !== 'Calendar/get') {
			throw new Error('Unexpected Calendar/get response');
		}

		const list = (first[1].list as JMAPCalendar[]) ?? [];
		return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
	}

	async queryCalendarEvents(params: {
		after: string;
		before: string;
		calendarId?: string;
		timeZone?: string;
	}): Promise<CalendarEventQueryResult> {
		if (!this.hasCalendars()) return { events: [], total: 0 };

		const accountId = this.getCalendarAccountId();
		const filter: Record<string, string> = {
			after: params.after,
			before: params.before
		};
		if (params.calendarId) filter.inCalendar = params.calendarId;

		const response = await this.calendarRequest([
			[
				'CalendarEvent/query',
				{
					accountId,
					filter,
					expandRecurrences: false,
					timeZone: params.timeZone ?? 'Etc/UTC',
					limit: 500
				},
				'ceq'
			],
			[
				'CalendarEvent/get',
				{
					accountId,
					'#ids': { resultOf: 'ceq', name: 'CalendarEvent/query', path: '/ids' },
					properties: [...CALENDAR_EVENT_PROPERTIES]
				},
				'ceg'
			]
		]);

		const queryResult = response.methodResponses?.[0];
		if (queryResult?.[0] === 'error') {
			const error = queryResult[1] as { type?: string; description?: string };
			throw new Error(error.description ?? error.type ?? 'CalendarEvent/query failed');
		}

		const getResult = response.methodResponses?.[1];
		if (getResult?.[0] !== 'CalendarEvent/get') {
			return { events: [], total: 0 };
		}

		const events = (getResult[1].list as JMAPCalendarEvent[]) ?? [];
		const total = (queryResult?.[1]?.total as number) ?? events.length;
		return { events, total };
	}

	async getCalendarEvent(eventId: string): Promise<JMAPCalendarEvent | null> {
		if (!this.hasCalendars()) return null;

		const response = await this.calendarRequest([
			[
				'CalendarEvent/get',
				{
					accountId: this.getCalendarAccountId(),
					ids: [eventId],
					properties: [...CALENDAR_EVENT_PROPERTIES]
				},
				'ce0'
			]
		]);

		const first = response.methodResponses?.[0];
		if (first?.[0] !== 'CalendarEvent/get') return null;
		const list = (first[1].list as JMAPCalendarEvent[]) ?? [];
		return list[0] ?? null;
	}

	private buildCalendarEventData(
		input: {
			calendarId: string;
			title: string;
			start: string;
			duration: string;
			timeZone: string;
			showWithoutTime: boolean;
			description?: string;
			location?: string;
			previousCalendarIds?: string[];
			recurrenceRule?: { '@type': 'RecurrenceRule'; frequency: string };
		},
		mode: 'create' | 'update'
	): Record<string, unknown> {
		const calendarIds: Record<string, boolean | null> = { [input.calendarId]: true };
		if (mode === 'update' && input.previousCalendarIds) {
			for (const id of input.previousCalendarIds) {
				if (id !== input.calendarId) calendarIds[id] = null;
			}
		}

		const eventData: Record<string, unknown> = {
			calendarIds,
			title: input.title,
			start: input.start,
			duration: input.duration,
			timeZone: input.timeZone,
			showWithoutTime: input.showWithoutTime
		};

		if (mode === 'create') {
			eventData['@type'] = 'Event';
			eventData.uid = crypto.randomUUID();
			eventData.useDefaultAlerts = true;
		}

		if (input.description) {
			eventData.description = input.description;
		} else if (mode === 'update') {
			eventData.description = null;
		}

		if (input.location) {
			eventData.locations = {
				'1': { '@type': 'Location', name: input.location }
			};
		} else if (mode === 'update') {
			eventData.locations = null;
		}

		if (input.recurrenceRule) {
			eventData.recurrenceRule = input.recurrenceRule;
		}

		return eventData;
	}

	async createCalendarEvent(input: {
		calendarId: string;
		title: string;
		start: string;
		duration: string;
		timeZone: string;
		showWithoutTime: boolean;
		description?: string;
		location?: string;
		recurrenceRule?: { '@type': 'RecurrenceRule'; frequency: string };
	}): Promise<string> {
		if (!this.hasCalendars()) throw new Error('Calendars not supported');

		const accountId = this.getCalendarAccountId();
		const createKey = `evt-${Date.now()}`;

		const response = await this.calendarRequest([
			[
				'CalendarEvent/set',
				{
					accountId,
					create: { [createKey]: this.buildCalendarEventData(input, 'create') }
				},
				'ces'
			]
		]);

		const first = response.methodResponses?.[0];
		if (first?.[0] === 'error') {
			const error = first[1] as { type?: string; description?: string };
			throw new Error(error.description ?? error.type ?? 'Failed to create event');
		}
		if (first?.[0] !== 'CalendarEvent/set') {
			throw new Error('Unexpected CalendarEvent/set response');
		}

		const result = first[1];
		const created = result.created as Record<string, { id?: string }> | undefined;
		const notCreated = result.notCreated as
			| Record<string, { description?: string; type?: string }>
			| undefined;

		if (notCreated && Object.keys(notCreated).length) {
			const firstError = Object.values(notCreated)[0];
			throw new Error(firstError?.description ?? firstError?.type ?? 'Failed to create event');
		}

		const id = created?.[createKey]?.id;
		if (!id) throw new Error('Failed to create event');
		return id;
	}

	async updateCalendarEvent(
		eventId: string,
		input: {
			calendarId: string;
			title: string;
			start: string;
			duration: string;
			timeZone: string;
			showWithoutTime: boolean;
			description?: string;
			location?: string;
			previousCalendarIds?: string[];
		}
	): Promise<void> {
		if (!this.hasCalendars()) throw new Error('Calendars not supported');

		const response = await this.calendarRequest([
			[
				'CalendarEvent/set',
				{
					accountId: this.getCalendarAccountId(),
					update: { [eventId]: this.buildCalendarEventData(input, 'update') }
				},
				'ceu'
			]
		]);

		const first = response.methodResponses?.[0];
		if (first?.[0] === 'error') {
			const error = first[1] as { type?: string; description?: string };
			throw new Error(error.description ?? error.type ?? 'Failed to update event');
		}
		if (first?.[0] !== 'CalendarEvent/set') {
			throw new Error('Unexpected CalendarEvent/set response');
		}

		const notUpdated = first[1].notUpdated as
			| Record<string, { description?: string; type?: string }>
			| undefined;
		if (notUpdated && Object.keys(notUpdated).length) {
			const firstError = Object.values(notUpdated)[0];
			throw new Error(firstError?.description ?? firstError?.type ?? 'Failed to update event');
		}
	}

	async destroyCalendarEvent(eventId: string): Promise<void> {
		if (!this.hasCalendars()) throw new Error('Calendars not supported');

		const response = await this.calendarRequest([
			[
				'CalendarEvent/set',
				{
					accountId: this.getCalendarAccountId(),
					destroy: [eventId]
				},
				'ced'
			]
		]);

		const first = response.methodResponses?.[0];
		if (first?.[0] === 'error') {
			const error = first[1] as { type?: string; description?: string };
			throw new Error(error.description ?? error.type ?? 'Failed to delete event');
		}
		if (first?.[0] !== 'CalendarEvent/set') {
			throw new Error('Unexpected CalendarEvent/set response');
		}

		const notDestroyed = first[1].notDestroyed as
			| Record<string, { description?: string; type?: string }>
			| undefined;
		if (notDestroyed && Object.keys(notDestroyed).length) {
			const firstError = Object.values(notDestroyed)[0];
			throw new Error(firstError?.description ?? firstError?.type ?? 'Failed to delete event');
		}
	}

	async getMailboxes(): Promise<JMAPMailbox[]> {
		const response = await this.request([['Mailbox/get', { accountId: this.accountId }, 'mb']]);
		const first = response.methodResponses?.[0];
		if (first?.[0] === 'error') {
			const error = first[1] as { type?: string; description?: string };
			throw new Error(error.description ?? error.type ?? 'Mailbox/get failed');
		}
		if (first?.[0] !== 'Mailbox/get') {
			throw new Error('Unexpected Mailbox/get response');
		}
		return (first[1].list as JMAPMailbox[]) ?? [];
	}

	async getMailboxesByIds(ids: string[]): Promise<JMAPMailbox[]> {
		if (!ids.length) return [];

		const response = await this.request([
			['Mailbox/get', { accountId: this.accountId, ids }, 'mb']
		]);
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

	async queryEmails(
		mailboxId: string,
		limit = 50,
		position = 0,
		options?: { unseenOnly?: boolean }
	): Promise<EmailQueryResult> {
		const filter = options?.unseenOnly
			? { inMailbox: mailboxId, notKeyword: '$seen' }
			: { inMailbox: mailboxId };
		const response = await this.request([
			[
				'Email/query',
				{
					accountId: this.accountId,
					filter,
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

	async searchEmails(
		query: string,
		limit = 50,
		position = 0,
		mailboxId?: string
	): Promise<EmailQueryResult> {
		const { filter } = parseSearchQuery(query);
		const scopedFilter = mailboxId ? { and: [{ inMailbox: mailboxId }, filter] } : filter;

		const response = await this.request([
			[
				'Email/query',
				{
					accountId: this.accountId,
					filter: scopedFilter,
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
		await this.markManyAsRead([emailId], read);
	}

	async markManyAsRead(emailIds: string[], read = true): Promise<void> {
		if (!emailIds.length) return;

		const update: Record<string, Record<string, unknown>> = {};
		for (const emailId of emailIds) {
			update[emailId] = { 'keywords/$seen': read ? true : null };
		}

		const response = await this.request([
			['Email/set', { accountId: this.accountId, update }, '0']
		]);
		assertEmailSetSucceeded(response, 'Could not update read status');
	}

	async toggleStar(emailId: string, starred: boolean): Promise<void> {
		const response = await this.request([
			[
				'Email/set',
				{
					accountId: this.accountId,
					update: { [emailId]: { 'keywords/$flagged': starred } }
				},
				'0'
			]
		]);
		assertEmailSetSucceeded(response, 'Could not update star');
	}

	async toggleImportant(
		emailIds: string[],
		important: boolean,
		importantMailboxId?: string
	): Promise<void> {
		if (!emailIds.length) return;

		const update: Record<string, Record<string, unknown>> = {};
		for (const emailId of emailIds) {
			const patch: Record<string, unknown> = {
				'keywords/$important': important ? true : null
			};
			if (importantMailboxId) {
				patch[`mailboxIds/${importantMailboxId}`] = important ? true : null;
			}
			update[emailId] = patch;
		}

		const response = await this.request([
			['Email/set', { accountId: this.accountId, update }, '0']
		]);
		assertEmailSetSucceeded(response, 'Could not update highlight');
	}

	async moveToMailbox(emailId: string, mailboxId: string, sourceMailboxId?: string): Promise<void> {
		await this.moveEmailsToMailbox([emailId], mailboxId, sourceMailboxId);
	}

	async moveEmailsToMailbox(emailIds: string[], mailboxId: string, sourceMailboxId?: string): Promise<void> {
		if (!emailIds.length) return;

		const update: Record<string, Record<string, unknown>> = {};
		for (const emailId of emailIds) {
			update[emailId] = sourceMailboxId
				? {
						[`mailboxIds/${sourceMailboxId}`]: null,
						[`mailboxIds/${mailboxId}`]: true
					}
				: { mailboxIds: { [mailboxId]: true } };
		}

		const response = await this.request([
			['Email/set', { accountId: this.accountId, update }, '0']
		]);
		assertEmailSetSucceeded(response, 'Could not move message');
	}

	async destroyEmail(emailId: string): Promise<void> {
		await this.destroyEmails([emailId]);
	}

	/** Permanently delete every email in a mailbox. Returns the count removed. */
	async emptyMailbox(mailboxId: string): Promise<number> {
		const BATCH = 200;
		let removed = 0;
		while (true) {
			const response = await this.request([
				[
					'Email/query',
					{
						accountId: this.accountId,
						filter: { inMailbox: mailboxId },
						limit: BATCH,
						position: 0
					},
					'q0'
				]
			]);
			const queryResult = response.methodResponses?.[0]?.[1] as
				| { ids?: string[] }
				| undefined;
			const ids = queryResult?.ids ?? [];
			if (!ids.length) return removed;
			await this.destroyEmails(ids);
			removed += ids.length;
			if (ids.length < BATCH) return removed;
		}
	}

	async destroyEmails(emailIds: string[]): Promise<void> {
		if (!emailIds.length) return;

		const response = await this.request([
			['Email/set', { accountId: this.accountId, destroy: emailIds }, '0']
		]);
		assertEmailSetSucceeded(response, 'Could not delete message');
	}

	async saveDraft(params: {
		jmapDraftId?: string;
		to: string[];
		cc?: string[];
		bcc?: string[];
		subject: string;
		body: string;
		bodyHtml?: string;
		fromEmail: string;
		fromName?: string;
		attachments?: EmailAttachmentInput[];
		format?: ComposeFormat;
	}): Promise<string> {
		const mailboxes = await this.getMailboxes();
		const draftsMailbox = mailboxes.find((mb) => mb.role === 'drafts');
		if (!draftsMailbox) throw new Error('No drafts folder found');

		const draftKey = params.jmapDraftId ?? `draft-${Date.now()}`;
		const emailData = buildEmailCreateData({
			fromEmail: params.fromEmail,
			fromName: params.fromName,
			to: params.to,
			cc: params.cc,
			bcc: params.bcc,
			subject: params.subject,
			bodyText: params.body,
			bodyHtml: params.bodyHtml,
			format: params.format,
			mailboxIds: { [draftsMailbox.id]: true },
			keywords: { $draft: true, $seen: true },
			attachments: params.attachments
		});

		if (params.jmapDraftId) {
			const newDraftKey = `draft-update-${Date.now()}`;
			const response = await this.request([
				[
					'Email/set',
					{
						accountId: this.accountId,
						create: { [newDraftKey]: emailData }
					},
					'0'
				],
				[
					'Email/set',
					{
						accountId: this.accountId,
						destroy: [params.jmapDraftId]
					},
					'1'
				]
			]);
			const result = assertEmailSetSucceeded(response, 'Could not update draft');
			const created = result.created as Record<string, { id?: string }> | undefined;
			const createdId = created?.[newDraftKey]?.id;
			if (!createdId) throw new Error('Draft update response missing id');
			return createdId;
		}

		const response = await this.request([
			['Email/set', { accountId: this.accountId, create: { [draftKey]: emailData } }, '0']
		]);
		const result = assertEmailSetSucceeded(response, 'Could not save draft');
		const created = result.created as Record<string, { id?: string }> | undefined;
		const createdId = created?.[draftKey]?.id;
		if (!createdId) throw new Error('Draft save response missing id');
		return createdId;
	}

	openEventStream(): Promise<Response> {
		if (this.proxyMode) {
			return fetch('/api/jmap/events');
		}

		if (!this.session?.eventSourceUrl) {
			throw new Error('No event source URL');
		}

		let url = this.session.eventSourceUrl;
		if (url.includes('{types}')) {
			url = url
				.replace('{types}', encodeURIComponent('Mailbox,Email'))
				.replace('{closeafter}', encodeURIComponent('no'))
				.replace('{ping}', encodeURIComponent('30'));
		} else {
			const separator = url.includes('?') ? '&' : '?';
			url = `${url}${separator}types=Mailbox,Email&closeafter=no&ping=30`;
		}
		return this.authenticatedFetch(url, { headers: { Accept: 'text/event-stream' } });
	}

	async sendEmail(
		to: string[],
		subject: string,
		body: string,
		options?: {
			cc?: string[];
			bcc?: string[];
			identityId?: string;
			fromEmail?: string;
			fromName?: string;
			attachments?: EmailAttachmentInput[];
			format?: ComposeFormat;
			bodyHtml?: string;
			/** Server email id from a previous attempt; lets retries resume instead of re-creating. */
			jmapEmailId?: string;
			/** Called with the server email id once the outgoing email exists, before submission. */
			onEmailCreated?: (emailId: string) => void | Promise<void>;
		}
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

		const holdingMailboxId = draftsMailbox?.id ?? sentMailbox.id;
		const fromEmail = options?.fromEmail ?? this.username;

		// Phase 1: make sure the outgoing email exists on the server exactly once.
		// On retry, check whether a previous attempt already submitted it — a lost
		// response after the server accepted the send must not produce a duplicate.
		let emailId = options?.jmapEmailId;
		if (emailId) {
			const status = await this.checkSendStatus(emailId);
			if (status === 'submitted') return;
			if (status === 'missing') emailId = undefined;
		}

		if (!emailId) {
			const emailData = buildEmailCreateData({
				fromEmail,
				fromName: options?.fromName,
				to,
				cc: options?.cc,
				bcc: options?.bcc,
				subject,
				bodyText: body,
				bodyHtml: options?.bodyHtml,
				format: options?.format,
				mailboxIds: { [holdingMailboxId]: true },
				keywords: { $draft: true },
				attachments: options?.attachments
			});
			emailId = await this.createOutgoingEmail(emailData);
			await options?.onEmailCreated?.(emailId);
		}

		// Phase 2: submit for delivery and move out of the holding mailbox.
		const response = await this.request(
			[
				[
					'EmailSubmission/set',
					{
						accountId: this.accountId,
						create: { '1': { emailId, identityId } },
						onSuccessUpdateEmail: {
							'#1': {
								[`mailboxIds/${holdingMailboxId}`]: null,
								[`mailboxIds/${sentMailbox.id}`]: true,
								'keywords/$draft': null,
								'keywords/$seen': true
							}
						}
					},
					'0'
				]
			],
			['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail', 'urn:ietf:params:jmap:submission']
		);
		this.throwOnSetErrors(response, 'Failed to send email');
	}

	private async createOutgoingEmail(emailData: Record<string, unknown>): Promise<string> {
		const createId = 'outgoing';
		const response = await this.request(
			[
				[
					'Email/set',
					{
						accountId: this.accountId,
						create: { [createId]: emailData }
					},
					'0'
				]
			],
			['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail']
		);
		this.throwOnSetErrors(response, 'Failed to create outgoing email');

		for (const [methodName, result] of response.methodResponses ?? []) {
			if (methodName === 'Email/set') {
				const created = (result.created as Record<string, { id?: string }> | undefined)?.[createId];
				if (created?.id) return created.id;
			}
		}
		throw new Error('Failed to create outgoing email');
	}

	/**
	 * Determine whether a previously created outgoing email was already submitted.
	 * Returns `draft` when in doubt (e.g. the server can't answer) so the caller
	 * falls back to submitting — the same behavior as before this check existed.
	 */
	private async checkSendStatus(emailId: string): Promise<'submitted' | 'draft' | 'missing'> {
		try {
			const response = await this.request(
				[
					[
						'EmailSubmission/query',
						{ accountId: this.accountId, filter: { emailIds: [emailId] } },
						'0'
					],
					['Email/get', { accountId: this.accountId, ids: [emailId], properties: ['id'] }, '1']
				],
				['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail', 'urn:ietf:params:jmap:submission']
			);

			let submitted = false;
			let emailGetAnswered = false;
			let emailExists = false;

			for (const [methodName, result] of response.methodResponses ?? []) {
				if (methodName === 'EmailSubmission/query' && Array.isArray(result.ids)) {
					submitted = result.ids.length > 0;
				}
				if (methodName === 'Email/get' && Array.isArray(result.list)) {
					emailGetAnswered = true;
					emailExists = result.list.length > 0;
				}
			}

			if (submitted) return 'submitted';
			if (!emailGetAnswered) return 'draft';
			return emailExists ? 'draft' : 'missing';
		} catch {
			return 'draft';
		}
	}

	private throwOnSetErrors(response: JMAPResponse, fallbackMessage: string): void {
		for (const [methodName, result] of response.methodResponses ?? []) {
			if (methodName.endsWith('/error')) {
				throw new Error((result.description as string) || `${fallbackMessage}: ${methodName}`);
			}
			if (result.notCreated || result.notUpdated) {
				const errors = (result.notCreated ?? result.notUpdated) as Record<
					string,
					{ description?: string; type?: string }
				>;
				const firstError = Object.values(errors)[0];
				throw new Error(firstError?.description || firstError?.type || fallbackMessage);
			}
		}
	}
}
