import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { appConfig } from '$lib/config';
import { JMAPClient } from '$lib/jmap/client';
import { classifyJmapError, loginErrorMessage, type LoginErrorCode } from '$lib/jmap/errors';
import type { JMAPIdentity } from '$lib/jmap/types';
import { pushListener } from '$lib/jmap/push-listener';
import { mail } from '$lib/stores/mail.svelte';
import { compose } from '$lib/stores/compose.svelte';
import { search } from '$lib/stores/search.svelte';
import { outbox } from '$lib/stores/outbox.svelte';
import { calendar } from '$lib/stores/calendar.svelte';
import { settings } from '$lib/stores/settings.svelte';
import { toast } from '$lib/stores/toast.svelte';
import { saveRememberedLogin } from '$lib/auth/remember-login';

interface SessionResponse {
	authenticated: boolean;
	serverUrl?: string;
	username?: string;
	displayName?: string;
	identities?: JMAPIdentity[];
}

interface LoginResponse {
	serverUrl: string;
	username: string;
	displayName: string;
	identities?: JMAPIdentity[];
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
	identities = $state<JMAPIdentity[]>([]);
	client = $state<JMAPClient | null>(null);
	oauthConfig = $state<{
		enabled: boolean;
		passkeysFirst?: boolean;
		passwordFallback?: boolean;
		clientId?: string;
		issuerUrl?: string;
		authorizationEndpoint?: string;
		error?: string;
	} | null>(null);

	async init() {
		if (!browser) return;
		await this.checkOauthConfig();
		await this.restore();
		this.isRestoring = false;
	}

	async checkOauthConfig() {
		try {
			const res = await fetch('/api/auth/config');
			if (res.ok) {
				this.oauthConfig = await res.json();
			}
		} catch (e) {
			console.error('Failed to load OIDC config:', e);
		}
	}

	private async bootstrapMail(client: JMAPClient) {
		await mail.loadMailboxes(client);
		try {
			const { markAccountSettingsEmailsRead } = await import('$lib/settings/account-settings-email');
			if (await markAccountSettingsEmailsRead(client)) {
				await mail.refreshMailboxes(client);
			}
		} catch {
			// Non-critical housekeeping
		}
	}

	async login(email: string, password: string, totp?: string, rememberMe = false, redirectTo?: string) {
		this.isLoading = true;
		this.error = null;
		this.errorCode = null;
		this.resetMailState();

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), password, totp, rememberMe })
			});

			const payload = (await response.json()) as LoginResponse;

			if (!response.ok) {
				const code = payload.code ?? classifyJmapError(new Error(payload.error ?? ''));
				this.errorCode = code;
				this.error =
					payload.error ??
					loginErrorMessage(code, payload.serverUrl ?? appConfig.jmapServerUrl);
				return;
			}

			const client = JMAPClient.createProxy();
			await client.connect();
			await this.openOfflineLayer(client);
			await this.bootstrapMail(client);

			this.client = client;
			this.serverUrl = payload.serverUrl;
			this.username = payload.username;
			this.displayName = payload.displayName;
			this.identities = payload.identities ?? [];
			this.isAuthenticated = true;
			settings.setUser(payload.username);
			saveRememberedLogin(email, rememberMe);
			await settings.syncFromAccount();
			this.startBackgroundSync(client, payload.username, payload.displayName);

			await goto(redirectTo ?? settings.preferredMailHref());
		} catch (error) {
			const code = classifyJmapError(error);
			this.errorCode = code;
			const detail = error instanceof Error ? error.message : '';
			this.error =
				detail && (code !== 'generic' || detail.length < 120)
					? detail
					: loginErrorMessage(code);
			this.client?.disconnect();
			this.client = null;
			this.isAuthenticated = false;
		} finally {
			this.isLoading = false;
		}
	}

	async loginWithPasskey(options?: {
		rememberMe?: boolean;
		redirectTo?: string;
		loginHint?: string;
	}) {
		this.isLoading = true;
		this.error = null;
		this.errorCode = null;

		try {
			if (!this.oauthConfig?.enabled) {
				throw new Error('Sign-in is not configured yet.');
			}

			const verifier = generateRandomString(48);
			const state = generateRandomString(32);
			const redirectUri = `${window.location.origin}/oauth/callback`;

			sessionStorage.setItem('oauth_code_verifier', verifier);
			sessionStorage.setItem('oauth_state', state);
			sessionStorage.setItem('oauth_remember_me', String(options?.rememberMe === true));
			if (options?.redirectTo) {
				sessionStorage.setItem('oauth_redirect_to', options.redirectTo);
			} else {
				sessionStorage.removeItem('oauth_redirect_to');
			}

			const challenge = await generateChallengeOfVerifier(verifier);

			const response = await fetch('/api/auth/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					state,
					codeChallenge: challenge,
					redirectUri,
					loginHint: options?.loginHint
				})
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as { error?: string };
				throw new Error(payload.error ?? 'Could not start sign-in.');
			}

			const { url } = (await response.json()) as { url: string };
			window.location.href = url;
		} catch (error) {
			this.isLoading = false;
			this.error = error instanceof Error ? error.message : 'Failed to start sign-in';
		}
	}

	/** @deprecated Use loginWithPasskey */
	async loginWithSSO() {
		return this.loginWithPasskey();
	}

	async completeOauthLogin(code: string, state?: string | null) {
		this.isLoading = true;
		this.error = null;
		this.errorCode = null;
		this.resetMailState();

		try {
			const expectedState = sessionStorage.getItem('oauth_state');
			if (!expectedState || !state || expectedState !== state) {
				throw new Error('Sign-in session expired. Please try again.');
			}

			const codeVerifier = sessionStorage.getItem('oauth_code_verifier') || '';
			const rememberMe = sessionStorage.getItem('oauth_remember_me') === 'true';
			const redirectTo = sessionStorage.getItem('oauth_redirect_to') || undefined;

			sessionStorage.removeItem('oauth_code_verifier');
			sessionStorage.removeItem('oauth_state');
			sessionStorage.removeItem('oauth_remember_me');
			sessionStorage.removeItem('oauth_redirect_to');

			const redirectUri = `${window.location.origin}/oauth/callback`;

			const response = await fetch('/api/auth/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, codeVerifier, redirectUri, rememberMe })
			});

			const payload = (await response.json()) as LoginResponse;

			if (!response.ok) {
				const code = payload.code ?? classifyJmapError(new Error(payload.error ?? ''));
				this.errorCode = code;
				this.error = payload.error ?? loginErrorMessage(code);
				await goto('/login');
				return;
			}

			const client = JMAPClient.createProxy();
			await client.connect();
			await this.openOfflineLayer(client);
			await this.bootstrapMail(client);

			this.client = client;
			this.serverUrl = payload.serverUrl;
			this.username = payload.username;
			this.displayName = payload.displayName;
			this.identities = payload.identities ?? [];
			this.isAuthenticated = true;
			settings.setUser(payload.username);
			if (payload.username) {
				saveRememberedLogin(payload.username, rememberMe);
			}
			await settings.syncFromAccount();
			this.startBackgroundSync(client, payload.username, payload.displayName);

			await goto(redirectTo ?? settings.preferredMailHref());
		} catch (error) {
			console.error('OAuth complete failed:', error);
			const code = classifyJmapError(error);
			this.errorCode = code;
			this.error = error instanceof Error ? error.message : 'Passkey sign-in failed';
			this.client?.disconnect();
			this.client = null;
			this.isAuthenticated = false;
			await goto('/login');
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
			await this.bootstrapMail(client);

			this.client = client;
			this.serverUrl = payload.serverUrl ?? appConfig.jmapServerUrl;
			this.username = payload.username;
			this.displayName = payload.displayName ?? payload.username;
			this.identities = payload.identities ?? [];
			this.isAuthenticated = true;
			settings.setUser(payload.username);
			await settings.syncFromAccount();
			this.startBackgroundSync(client, payload.username, payload.displayName ?? payload.username);
		} catch (error) {
			console.warn('Session restore failed:', error);
		}
	}

	/** Wipe offline mail data on this device and resync from the server. */
	async clearLocalCache(): Promise<boolean> {
		if (!browser || !this.client || !this.username) return false;

		pushListener.stop();
		this.stopBackgroundSync();
		await this.closeOfflineLayer();
		mail.reset();

		try {
			await this.openOfflineLayer(this.client);
			await this.bootstrapMail(this.client);
			this.startBackgroundSync(this.client, this.username, this.displayName ?? undefined);
			toast.show('Local mail cache cleared. Sync will rebuild from the server.', 'success');
			return true;
		} catch {
			toast.show('Could not rebuild local cache. Try signing out and back in.', 'error');
			return false;
		}
	}

	async logout() {
		pushListener.stop();
		this.stopBackgroundSync();
		await this.closeOfflineLayer();
		this.client?.disconnect();
		this.client = null;
		this.serverUrl = null;
		this.username = null;
		this.displayName = null;
		this.identities = [];
		this.isAuthenticated = false;
		this.error = null;
		this.errorCode = null;
		settings.setUser(null);
		mail.reset();
		compose.reset();
		search.reset();
		outbox.reset();
		calendar.reset();
		void import('$lib/utils/app-badge').then(({ clearAppBadge }) => clearAppBadge());

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
		this.stopBackgroundSync();
		void this.closeOfflineLayer();
		this.client?.disconnect();
		this.client = null;
		this.serverUrl = null;
		this.username = null;
		this.displayName = null;
		this.identities = [];
		this.isAuthenticated = false;
		settings.setUser(null);
		mail.reset();
		compose.reset();
		search.reset();
		outbox.reset();
		calendar.reset();
		void import('$lib/utils/app-badge').then(({ clearAppBadge }) => clearAppBadge());
		void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
			// Best-effort stale cookie cleanup
		});
		goto('/login');
	}

	private resetMailState() {
		pushListener.stop();
		this.stopBackgroundSync();
		void this.closeOfflineLayer();
		this.client?.disconnect();
		this.client = null;
		mail.reset();
		compose.reset();
		search.reset();
		outbox.reset();
		calendar.reset();
	}

	private async openOfflineLayer(client: JMAPClient) {
		if (!browser) return;

		const { initMailDatabase, migrateLegacyComposeDraft } = await import('$lib/db');
		const accountId = client.getAccountId();
		await initMailDatabase(accountId);
		await migrateLegacyComposeDraft(accountId);

		const { syncEngine } = await import('$lib/sync/engine');
		await syncEngine.bootstrap(client);
	}

	private startBackgroundSync(client: JMAPClient, fromEmail: string, fromName?: string) {
		if (!browser) return;
		outbox.start();
		void import('$lib/sync/outbox-processor').then(({ outboxProcessor }) => {
			outboxProcessor.start(client, fromEmail, fromName);
		});
	}

	private stopBackgroundSync() {
		if (!browser) return;
		outbox.stop();
		void import('$lib/sync/outbox-processor').then(({ outboxProcessor }) => {
			outboxProcessor.stop();
		});
	}

	private async closeOfflineLayer() {
		if (!browser) return;
		const { closeMailDatabase } = await import('$lib/db');
		await closeMailDatabase();
	}
}

export const auth = new AuthStore();

function generateRandomString(length: number): string {
	const array = new Uint8Array(length);
	window.crypto.getRandomValues(array);
	return Array.from(array, (dec) => dec.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a: ArrayBuffer): string {
	const bytes = new Uint8Array(a);
	let str = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		str += String.fromCharCode(bytes[i]);
	}
	return btoa(str)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

async function generateChallengeOfVerifier(verifier: string): Promise<string> {
	const hashed = await sha256(verifier);
	return base64urlencode(hashed);
}
