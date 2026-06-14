import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
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

export interface AccountInfo {
	key: string;
	username: string;
	displayName: string;
	isActive: boolean;
	identities?: JMAPIdentity[];
}

interface SessionResponse {
	authenticated: boolean;
	serverUrl?: string;
	username?: string;
	displayName?: string;
	identities?: JMAPIdentity[];
	accounts?: AccountInfo[];
	activeKey?: string | null;
}

interface LoginResponse {
	serverUrl: string;
	username: string;
	displayName: string;
	identities?: JMAPIdentity[];
	error?: string;
	code?: LoginErrorCode;
	redirectTo?: string;
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
	/** All accounts signed into this session; the active one drives the mail view. */
	accounts = $state<AccountInfo[]>([]);
	activeKey = $state<string | null>(null);
	client = $state<JMAPClient | null>(null);
	/** Re-entrancy guard while isolating a dead account in handleUnauthorized(). */
	private handlingUnauthorized = false;
	oauthConfig = $state<{
		enabled: boolean;
		passwordFallback?: boolean;
		passkeyEnabled?: boolean;
		passkeyOnly?: boolean;
		clientId?: string;
		issuerUrl?: string;
		authorizationEndpoint?: string;
		error?: string;
	} | null>(null);

	async init() {
		if (!browser) return;
		try {
			await this.checkOauthConfig();
			await this.restore();
		} finally {
			this.isRestoring = false;
		}
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

	/** Pull the multi-account list (and active-account fields) from the session probe. */
	private async refreshAccounts(): Promise<void> {
		try {
			const res = await fetch('/api/auth/session');
			if (!res.ok) return;
			const payload = (await res.json()) as SessionResponse;
			if (!payload.authenticated) return;
			this.applyAccounts(payload);
		} catch {
			// Best-effort; keep the current list on failure.
		}
	}

	private applyAccounts(payload: SessionResponse): void {
		this.accounts = payload.accounts ?? [];
		this.activeKey = payload.activeKey ?? null;
		if (payload.serverUrl) this.serverUrl = payload.serverUrl;
		if (payload.username) this.username = payload.username;
		this.displayName = payload.displayName ?? payload.username ?? this.displayName;
		this.identities = payload.identities ?? this.identities;
	}

	/** Switch the active mailbox: flip server-side, then rebuild the mail layer for it. */
	async switchAccount(key: string): Promise<void> {
		if (!browser || key === this.activeKey) return;
		this.isLoading = true;
		this.error = null;
		try {
			const res = await fetch('/api/auth/switch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key })
			});
			if (!res.ok) {
				toast.show('Could not switch account', 'error');
				return;
			}

			await this.rebuildActiveAccount();
			toast.show(`Switched to ${this.displayName ?? this.username}`, 'success');
			await goto(settings.preferredMailHref());
		} catch (error) {
			console.error('Switch account failed:', error);
			toast.show('Could not switch account', 'error');
		} finally {
			this.isLoading = false;
		}
	}

	/** Tear down the mail layer and bring it back up for whichever account is now active. */
	private async rebuildActiveAccount(): Promise<void> {
		this.resetMailState();
		const client = JMAPClient.createProxy();
		await client.connect();
		await this.openOfflineLayer(client);
		await this.bootstrapMail(client);

		this.client = client;
		await this.refreshAccounts();
		this.isAuthenticated = true;
		settings.setUser(this.username);
		await settings.syncFromAccount();
		this.startBackgroundSync(client, this.username ?? '', this.displayName ?? undefined);
	}

	/** Sign out of a single account; full logout if it was the last one. */
	async removeAccount(key: string): Promise<void> {
		if (!browser) return;
		const wasActive = key === this.activeKey;
		this.isLoading = true;
		try {
			const res = await fetch('/api/auth/remove-account', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key })
			});
			const payload = (await res.json()) as { authenticated?: boolean };
			if (!payload.authenticated) {
				await this.logout();
				return;
			}
			if (wasActive) {
				// Delete the signed-out account's local cache before bringing up the next one.
				await this.wipeOfflineLayer();
				await this.rebuildActiveAccount();
				await goto(settings.preferredMailHref());
			} else {
				await this.refreshAccounts();
			}
			toast.show('Signed out of that account.', 'info');
		} catch {
			toast.show('Could not sign out of that account.', 'error');
		} finally {
			this.isLoading = false;
		}
	}

	/** Start the add-account flow — a fresh Logto sign-in that appends a new mailbox. */
	addAccountFlow(email?: string): void {
		if (!browser) return;
		const hint = email?.trim() ? `&email=${encodeURIComponent(email.trim())}` : '';
		window.location.href = `/login/start?mode=add${hint}`;
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
			await this.refreshAccounts();

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

			const email = options?.loginHint?.trim().toLowerCase();
			if (!email || !email.includes('@')) {
				throw new Error('Enter your email address before signing in with a passkey.');
			}

			const optionsRes = await fetch('/api/auth/passkey/options', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					rememberMe: options?.rememberMe,
					redirectTo: options?.redirectTo
				})
			});
			const optionsPayload = (await optionsRes.json()) as {
				authenticationOptions?: Record<string, unknown>;
				error?: string;
			};
			if (!optionsRes.ok || !optionsPayload.authenticationOptions) {
				throw new Error(optionsPayload.error ?? 'Could not start passkey sign-in.');
			}

			let credential;
			try {
				credential = await startAuthentication({
					optionsJSON: optionsPayload.authenticationOptions as unknown as Parameters<
						typeof startAuthentication
					>[0]['optionsJSON']
				});
			} catch (error) {
				if (error instanceof Error && error.name === 'NotAllowedError') {
					throw new Error('Passkey sign-in was cancelled.');
				}
				throw error;
			}

			const verifyRes = await fetch('/api/auth/passkey/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ credential })
			});
			const verifyPayload = (await verifyRes.json()) as { code?: string; state?: string; error?: string };
			if (!verifyRes.ok || !verifyPayload.code) {
				throw new Error(verifyPayload.error ?? 'Passkey verification failed.');
			}

			await this.completeOauthLogin(verifyPayload.code, verifyPayload.state);
		} catch (error) {
			this.isLoading = false;
			this.error = error instanceof Error ? error.message : 'Failed to sign in with passkey';
		}
	}

	/** @deprecated Use loginWithPasskey */
	async loginWithSSO() {
		return this.loginWithPasskey();
	}

	async registerPasskey(input: {
		email: string;
		password?: string;
		token?: string;
		rememberMe?: boolean;
		redirectTo?: string;
	}) {
		this.isLoading = true;
		this.error = null;

		try {
			if (!this.oauthConfig?.enabled) {
				throw new Error('Passkey setup is not configured yet.');
			}

			const email = input.email.trim().toLowerCase();
			if (!email.includes('@')) {
				throw new Error('Enter a valid email address.');
			}
			if (!input.token && !input.password) {
				throw new Error('Confirm your password to add a passkey.');
			}

			const optionsRes = await fetch('/api/auth/passkey/register/options', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password: input.password,
					token: input.token,
					rememberMe: input.rememberMe,
					redirectTo: input.redirectTo
				})
			});
			const optionsPayload = (await optionsRes.json()) as {
				registrationOptions?: Record<string, unknown>;
				error?: string;
			};
			if (!optionsRes.ok || !optionsPayload.registrationOptions) {
				throw new Error(optionsPayload.error ?? 'Could not start passkey setup.');
			}

			let credential;
			try {
				credential = await startRegistration({
					optionsJSON: optionsPayload.registrationOptions as unknown as Parameters<
						typeof startRegistration
					>[0]['optionsJSON']
				});
			} catch (error) {
				if (error instanceof Error && error.name === 'NotAllowedError') {
					throw new Error('Passkey setup was cancelled.');
				}
				throw error;
			}

			const verifyRes = await fetch('/api/auth/passkey/register/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ credential })
			});
			const verifyPayload = (await verifyRes.json()) as {
				success?: boolean;
				code?: string;
				state?: string;
				error?: string;
			};
			if (!verifyRes.ok || !verifyPayload.success) {
				throw new Error(verifyPayload.error ?? 'Passkey setup failed.');
			}

			if (verifyPayload.code) {
				await this.completeOauthLogin(verifyPayload.code, verifyPayload.state);
				return;
			}
		} catch (error) {
			throw error instanceof Error ? error : new Error('Passkey setup failed.');
		} finally {
			this.isLoading = false;
		}
	}

	async completeOauthLogin(code: string, state?: string | null) {
		this.isLoading = true;
		this.error = null;
		this.errorCode = null;
		this.resetMailState();

		try {
			const expectedState = sessionStorage.getItem('oauth_state');
			const hasSessionFlow = Boolean(expectedState && state && expectedState === state);

			const codeVerifier = sessionStorage.getItem('oauth_code_verifier') || '';
			const rememberMe = sessionStorage.getItem('oauth_remember_me') === 'true';
			const redirectTo = sessionStorage.getItem('oauth_redirect_to') || undefined;

			if (hasSessionFlow) {
				sessionStorage.removeItem('oauth_code_verifier');
				sessionStorage.removeItem('oauth_state');
				sessionStorage.removeItem('oauth_remember_me');
				sessionStorage.removeItem('oauth_redirect_to');
			}

			const redirectUri = `${window.location.origin}/oauth/callback`;

			const response = await fetch('/api/auth/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code,
					codeVerifier: hasSessionFlow ? codeVerifier : undefined,
					redirectUri,
					rememberMe: hasSessionFlow ? rememberMe : undefined,
					state: state ?? undefined
				})
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
			await this.refreshAccounts();

			await goto(payload.redirectTo ?? redirectTo ?? settings.preferredMailHref());
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
			this.accounts = payload.accounts ?? [];
			this.activeKey = payload.activeKey ?? null;
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
		await this.wipeOfflineLayer();
		mail.reset();

		try {
			await this.openOfflineLayer(this.client);
			await this.bootstrapMail(this.client);
			this.startBackgroundSync(this.client, this.username, this.displayName ?? undefined);
			if (this.client) {
				pushListener.start(this.client, (change) => {
					const accountChanges = change.changed[this.client!.getAccountId()];
					if (accountChanges) {
						void mail.handlePushChange(this.client!, accountChanges);
					}
				});
			}
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
		await this.wipeOfflineLayer();
		this.client?.disconnect();
		this.client = null;
		this.serverUrl = null;
		this.username = null;
		this.displayName = null;
		this.identities = [];
		this.accounts = [];
		this.activeKey = null;
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

	/**
	 * The active account's token was rejected (401). If another account is
	 * available, isolate the failure — drop the dead account and switch to a
	 * healthy one — instead of signing out of everything. Otherwise full logout.
	 */
	async handleUnauthorized() {
		if (!this.isAuthenticated || this.handlingUnauthorized) return;
		this.handlingUnauthorized = true;
		try {
			const deadKey = this.activeKey;
			const fallback = this.accounts.find((account) => account.key !== deadKey);
			if (deadKey && fallback) {
				try {
					await fetch('/api/auth/remove-account', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ key: deadKey })
					});
					await this.rebuildActiveAccount();
					toast.show('That account’s session expired — switched to another account.', 'info');
					return;
				} catch {
					// The fallback is unusable too — fall through to a full sign-out.
				}
			}
			this.forceLogout();
		} finally {
			this.handlingUnauthorized = false;
		}
	}

	/** Wipe all local session state and return to the login screen. */
	private forceLogout() {
		pushListener.stop();
		this.stopBackgroundSync();
		void this.wipeOfflineLayer();
		this.client?.disconnect();
		this.client = null;
		this.serverUrl = null;
		this.username = null;
		this.displayName = null;
		this.identities = [];
		this.accounts = [];
		this.activeKey = null;
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

	/** Close the active account's local DB but keep its data (used when switching). */
	private async closeOfflineLayer() {
		if (!browser) return;
		const { closeMailDatabase } = await import('$lib/db');
		await closeMailDatabase();
	}

	/** Delete the active account's local DB (used for sign-out and cache wipe). */
	private async wipeOfflineLayer() {
		if (!browser) return;
		const { removeMailDatabase } = await import('$lib/db');
		await removeMailDatabase();
	}
}

export const auth = new AuthStore();
