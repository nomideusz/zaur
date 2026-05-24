import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { appConfig } from '$lib/config';
import { JMAPClient } from '$lib/jmap/client';
import { classifyJmapError, loginErrorMessage, type LoginErrorCode } from '$lib/jmap/errors';
import { pushListener } from '$lib/jmap/push-listener';
import { mail } from '$lib/stores/mail.svelte';
import { compose } from '$lib/stores/compose.svelte';
import { search } from '$lib/stores/search.svelte';

interface SessionResponse {
	authenticated: boolean;
	serverUrl?: string;
	username?: string;
	displayName?: string;
}

interface LoginResponse {
	serverUrl: string;
	username: string;
	displayName: string;
	error?: string;
	code?: LoginErrorCode;
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
		this.isLoading = true;
		this.error = null;
		this.errorCode = null;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), password, totp })
			});

			const payload = (await response.json()) as LoginResponse;

			if (!response.ok) {
				const code = payload.code ?? classifyJmapError(new Error(payload.error ?? ''));
				this.errorCode = code;
				this.error = payload.error ?? loginErrorMessage(code);
				return;
			}

			const client = JMAPClient.createProxy();
			await client.connect();
			await this.openOfflineLayer(client);
			await mail.loadMailboxes(client);

			this.client = client;
			this.serverUrl = payload.serverUrl;
			this.username = payload.username;
			this.displayName = payload.displayName;
			this.isAuthenticated = true;

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
		try {
			const response = await fetch('/api/auth/session');
			if (!response.ok) return;

			const payload = (await response.json()) as SessionResponse;
			if (!payload.authenticated || !payload.username) return;

			const client = JMAPClient.createProxy();
			await client.connect();
			await this.openOfflineLayer(client);
			await mail.loadMailboxes(client);

			this.client = client;
			this.serverUrl = payload.serverUrl ?? appConfig.jmapServerUrl;
			this.username = payload.username;
			this.displayName = payload.displayName ?? payload.username;
			this.isAuthenticated = true;
		} catch {
			// Session cookie invalid or server unreachable
		}
	}

	async logout() {
		pushListener.stop();
		await this.closeOfflineLayer();
		this.client?.disconnect();
		this.client = null;
		this.serverUrl = null;
		this.username = null;
		this.displayName = null;
		this.isAuthenticated = false;
		this.error = null;
		this.errorCode = null;
		mail.reset();
		compose.reset();
		search.reset();

		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch {
			// Best-effort server logout
		}

		goto('/login');
	}

	/** Clear local session when the server rejects credentials (401). */
	handleUnauthorized() {
		if (!this.isAuthenticated) return;
		pushListener.stop();
		void this.closeOfflineLayer();
		this.client?.disconnect();
		this.client = null;
		this.serverUrl = null;
		this.username = null;
		this.displayName = null;
		this.isAuthenticated = false;
		mail.reset();
		compose.reset();
		search.reset();
		goto('/login');
	}

	private async openOfflineLayer(client: JMAPClient) {
		if (!browser) return;

		const { initMailDatabase, migrateLegacyComposeDraft } = await import('$lib/db');
		const accountId = client.getAccountId();
		await initMailDatabase(accountId);
		await migrateLegacyComposeDraft(accountId);
	}

	private async closeOfflineLayer() {
		if (!browser) return;
		const { closeMailDatabase } = await import('$lib/db');
		await closeMailDatabase();
	}
}

export const auth = new AuthStore();
