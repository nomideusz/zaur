import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { appConfig } from '$lib/config';
import { JMAPClient } from '$lib/jmap/client';
import { classifyJmapError, loginErrorMessage, type LoginErrorCode } from '$lib/jmap/errors';
import { mail } from '$lib/stores/mail.svelte';

const SESSION_KEY = 'zaur:session';

interface StoredSession {
	serverUrl: string;
	username: string;
	password: string;
}

class AuthStore {
	isAuthenticated = $state(false);
	isLoading = $state(false);
	isRestoring = $state(true);
	error = $state<string | null>(null);
	errorCode = $state<LoginErrorCode | null>(null);
	serverUrl = $state<string | null>(null);
	username = $state<string | null>(null);
	displayName = $state<string | null>(null);
	client = $state<JMAPClient | null>(null);

	async init() {
		if (!browser) return;
		await this.restore();
		this.isRestoring = false;
	}

	async login(email: string, password: string, totp?: string) {
		const effectivePassword = totp?.trim() ? `${password}$${totp.trim()}` : password;
		this.isLoading = true;
		this.error = null;
		this.errorCode = null;

		try {
			const serverUrl = appConfig.jmapServerUrl;
			const client = new JMAPClient(serverUrl, email.trim(), effectivePassword);
			await client.connect();

			const identities = await client.getIdentities();
			const primary = identities.find((id) => id.email === email.trim()) ?? identities[0];

			await mail.loadMailboxes(client);

			this.client = client;
			this.serverUrl = serverUrl;
			this.username = email.trim();
			this.displayName = primary?.name ?? primary?.email ?? email.trim();
			this.isAuthenticated = true;

			sessionStorage.setItem(
				SESSION_KEY,
				JSON.stringify({
					serverUrl,
					username: email.trim(),
					password: effectivePassword
				} satisfies StoredSession)
			);

			await goto('/mail/inbox');
		} catch (error) {
			const code = classifyJmapError(error);
			this.errorCode = code;
			this.error = loginErrorMessage(code);
			this.client?.disconnect();
			this.client = null;
			this.isAuthenticated = false;
		} finally {
			this.isLoading = false;
		}
	}

	async restore() {
		const raw = sessionStorage.getItem(SESSION_KEY);
		if (!raw) return;

		try {
			const stored = JSON.parse(raw) as StoredSession;
			const client = new JMAPClient(stored.serverUrl, stored.username, stored.password);
			await client.connect();
			await mail.loadMailboxes(client);

			this.client = client;
			this.serverUrl = stored.serverUrl;
			this.username = stored.username;
			this.displayName = stored.username;
			this.isAuthenticated = true;
		} catch {
			sessionStorage.removeItem(SESSION_KEY);
		}
	}

	logout() {
		this.client?.disconnect();
		this.client = null;
		this.serverUrl = null;
		this.username = null;
		this.displayName = null;
		this.isAuthenticated = false;
		this.error = null;
		this.errorCode = null;
		mail.reset();
		sessionStorage.removeItem(SESSION_KEY);
		goto('/login');
	}
}

export const auth = new AuthStore();
