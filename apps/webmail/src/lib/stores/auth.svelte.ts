import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { appConfig } from '$lib/config';
import { JMAPClient } from '$lib/jmap/client';
import { normalizeEmail } from '$lib/jmap/account';
import { classifyJmapError, loginErrorMessage, type LoginErrorCode } from '$lib/jmap/errors';
import type { JMAPIdentity } from '$lib/jmap/types';

/** localStorage map of account key (email) → JMAP accountId, for wiping inactive DBs on sign-out. */
const ACCOUNT_DB_MAP_KEY = 'zaur:account-dbs';
import { pushListener } from '$lib/jmap/push-listener';
import { mail } from '$lib/stores/mail.svelte';
import { compose } from '$lib/stores/compose.svelte';
import { search } from '$lib/stores/search.svelte';
import { outbox } from '$lib/stores/outbox.svelte';
import { calendar } from '$lib/stores/calendar.svelte';
import { settings } from '$lib/stores/settings.svelte';
import { toast } from '$lib/stores/toast.svelte';
import { saveRememberedLogin } from '$lib/auth/remember-login';
import { setInactiveUnread } from '$lib/utils/unread-state';

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
	/** Per-account-key inbox unread counts (all accounts), refreshed on a poll. */
	unread = $state<Record<string, number>>({});
	client = $state<JMAPClient | null>(null);
	/** Re-entrancy guard while isolating a dead account in handleUnauthorized(). */
	private handlingUnauthorized = false;

	async init() {
		if (!browser) return;
		try {
			await this.restore();
		} finally {
			this.isRestoring = false;
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

	/**
	 * Rebuild the send-from identity list from the account's current aliases.
	 * Stalwart never updates stored identities when aliases change, so this
	 * destroys and regenerates them (names/signatures are preserved).
	 */
	async refreshIdentities(): Promise<boolean> {
		if (!browser || !this.client) return false;
		try {
			this.identities = await this.client.resyncIdentities();
			return true;
		} catch (error) {
			console.warn('Could not refresh send-from addresses:', error);
			return false;
		}
	}

	/**
	 * One-time self-heal per account: accounts that show a single identity may
	 * actually have aliases the server never turned into identities (added after
	 * the identity list was first created). Resync once so the From picker and
	 * alias features work without a manual step.
	 */
	private maybeResyncIdentities(): void {
		if (!browser || !this.client || !this.username) return;
		if (this.identities.length > 1) return;
		const marker = `zaur:identities-resynced:${normalizeEmail(this.username)}`;
		try {
			if (localStorage.getItem(marker)) return;
		} catch {
			return;
		}
		void this.refreshIdentities().then((ok) => {
			if (!ok) return;
			try {
				localStorage.setItem(marker, new Date().toISOString());
			} catch {
				// Ignore storage failures — worst case we resync again next load.
			}
		});
	}

	/**
	 * Persist the active account's Display name to its Stalwart identity so it is
	 * authoritative server-side and consistent across devices. No-ops when unchanged.
	 */
	async updateDisplayName(name: string): Promise<boolean> {
		if (!browser || !this.client) return false;
		const trimmed = name.trim();
		const target = this.username ? normalizeEmail(this.username) : '';
		const primary =
			this.identities.find((identity) => identity.email && normalizeEmail(identity.email) === target) ??
			this.identities[0];
		if (!primary) return false;
		if ((primary.name ?? '').trim() === trimmed) return true; // nothing changed

		try {
			await this.client.setIdentityName(primary.id, trimmed);
			this.identities = this.identities.map((identity) =>
				identity.id === primary.id ? { ...identity, name: trimmed } : identity
			);
			if (trimmed) this.displayName = trimmed;
			return true;
		} catch (error) {
			console.warn('Could not save display name to the server:', error);
			return false;
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
	async switchAccount(key: string, options?: { redirectTo?: string }): Promise<void> {
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
			await goto(options?.redirectTo ?? settings.preferredMailHref());
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
		this.maybeResyncIdentities();
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
				this.forgetAccountDb(key);
				await this.rebuildActiveAccount();
				await goto(settings.preferredMailHref());
			} else {
				// Inactive account removed — wipe its (not-open) local cache by id.
				const accountId = this.readAccountDbMap()[key];
				if (accountId) {
					const { removeMailDatabaseById } = await import('$lib/db');
					await removeMailDatabaseById(accountId);
				}
				this.forgetAccountDb(key);
				await this.refreshAccounts();
			}
			toast.show('Signed out of that account.', 'info');
		} catch {
			toast.show('Could not sign out of that account.', 'error');
		} finally {
			this.isLoading = false;
		}
	}

	/** Start the add-account flow on our own login screen, appending a mailbox. */
	addAccountFlow(email?: string): void {
		if (!browser) return;
		const hint = email?.trim() ? `&email=${encodeURIComponent(email.trim())}` : '';
		void goto(`/login?mode=add${hint}`);
	}

	async login(
		email: string,
		password: string,
		totp?: string,
		rememberMe = false,
		redirectTo?: string,
		options?: { add?: boolean }
	) {
		const add = options?.add === true;
		this.isLoading = true;
		this.error = null;
		this.errorCode = null;
		// In add mode the current account stays live until the new sign-in succeeds.
		if (!add) this.resetMailState();

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), password, totp, rememberMe, add })
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

			saveRememberedLogin(email, rememberMe);

			if (add) {
				// Appended + made active server-side; switch the mail layer to it.
				await this.rebuildActiveAccount();
				toast.show(`Added ${this.displayName ?? this.username}`, 'success');
				await goto(redirectTo ?? settings.preferredMailHref());
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
			await settings.syncFromAccount();
			this.maybeResyncIdentities();
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
			// Don't tear down the current account when an add attempt fails.
			if (!add) {
				this.client?.disconnect();
				this.client = null;
				this.isAuthenticated = false;
			}
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
			this.maybeResyncIdentities();
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
		await this.wipeAllOfflineLayers();
		this.client?.disconnect();
		this.client = null;
		this.serverUrl = null;
		this.username = null;
		this.displayName = null;
		this.identities = [];
		this.accounts = [];
		this.activeKey = null;
		this.unread = {};
		setInactiveUnread(0);
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
		void this.wipeAllOfflineLayers();
		this.client?.disconnect();
		this.client = null;
		this.serverUrl = null;
		this.username = null;
		this.displayName = null;
		this.identities = [];
		this.accounts = [];
		this.activeKey = null;
		this.unread = {};
		setInactiveUnread(0);
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
		// Remember this account's DB id so a later sign-out can wipe it even when inactive.
		this.rememberAccountDb(normalizeEmail(client.getUsername()), accountId);

		const { syncEngine } = await import('$lib/sync/engine');
		await syncEngine.bootstrap(client);
	}

	private readAccountDbMap(): Record<string, string> {
		if (!browser) return {};
		try {
			return JSON.parse(localStorage.getItem(ACCOUNT_DB_MAP_KEY) || '{}') as Record<string, string>;
		} catch {
			return {};
		}
	}

	private writeAccountDbMap(map: Record<string, string>): void {
		if (!browser) return;
		try {
			localStorage.setItem(ACCOUNT_DB_MAP_KEY, JSON.stringify(map));
		} catch {
			// Ignore storage quota / availability issues.
		}
	}

	private rememberAccountDb(key: string, accountId: string | undefined): void {
		if (!browser || !key || !accountId) return;
		const map = this.readAccountDbMap();
		if (map[key] === accountId) return;
		map[key] = accountId;
		this.writeAccountDbMap(map);
	}

	private forgetAccountDb(key: string): void {
		if (!browser || !key || !(key in this.readAccountDbMap())) return;
		const map = this.readAccountDbMap();
		delete map[key];
		this.writeAccountDbMap(map);
	}

	/** Delete the local databases of every account in this session (full sign-out). */
	private async wipeAllOfflineLayers(): Promise<void> {
		if (!browser) return;
		const map = this.readAccountDbMap();
		const { removeMailDatabase, removeMailDatabaseById } = await import('$lib/db');
		await removeMailDatabase(); // the currently-open (active) account
		for (const accountId of Object.values(map)) {
			await removeMailDatabaseById(accountId);
		}
		try {
			localStorage.removeItem(ACCOUNT_DB_MAP_KEY);
		} catch {
			// Ignore.
		}
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

	/**
	 * Sink for per-account inbox unread counts, fed by the `unreadCounts` live query
	 * (subscribed in the app layout). Updates the switcher badges + app-badge total.
	 */
	setUnread(counts: Record<string, number>): void {
		this.unread = counts;
		let inactive = 0;
		for (const [key, count] of Object.entries(counts)) {
			if (key !== this.activeKey) inactive += count;
		}
		setInactiveUnread(inactive);
		void import('$lib/utils/document-title').then(({ applyUnreadPrefixToDocument }) =>
			applyUnreadPrefixToDocument()
		);
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
