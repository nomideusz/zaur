<script lang="ts">
	import { onMount } from 'svelte';
	import PushNotificationStatus from '$lib/components/settings/PushNotificationStatus.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { appConfig } from '$lib/config';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let emptyingTrash = $state(false);
	let emptyingSpam = $state(false);
	let passkeyPassword = $state('');
	let passkeyLoading = $state(false);
	let passkeyRegistered = $state<boolean | null>(null);
	let passkeyStatusLoading = $state(false);
	let importInput = $state<HTMLInputElement | null>(null);
	let clearingCache = $state(false);

	const oauthEnabled = $derived(auth.oauthConfig?.enabled === true);
	const trashMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'trash'));
	const junkMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'junk'));

	async function loadPasskeyStatus() {
		if (!oauthEnabled || !auth.username) return;
		passkeyStatusLoading = true;
		try {
			const res = await fetch('/api/auth/passkey/status');
			if (res.ok) {
				const payload = (await res.json()) as { registered?: boolean };
				passkeyRegistered = payload.registered === true;
			}
		} catch {
			// Non-critical — keep add-passkey UI available.
		} finally {
			passkeyStatusLoading = false;
		}
	}

	onMount(async () => {
		await auth.checkOauthConfig();
		await loadPasskeyStatus();
	});

	async function addPasskey() {
		if (!auth.username || !passkeyPassword) return;
		passkeyLoading = true;
		try {
			await auth.registerPasskey({
				email: auth.username,
				password: passkeyPassword
			});
			passkeyPassword = '';
			passkeyRegistered = true;
			void loadPasskeyStatus();
			toast.show('Passkey added. You can use it to sign in next time.', 'success');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Passkey setup failed.';
			toast.show(message, 'error');
		} finally {
			passkeyLoading = false;
		}
	}

	async function emptyMailbox(role: 'trash' | 'junk') {
		const mailbox = role === 'trash' ? trashMailbox : junkMailbox;
		const client = auth.client;
		if (!mailbox?.jmapId || !client) {
			toast.show(`No ${role === 'trash' ? 'Trash' : 'Spam'} folder available on this account`, 'error');
			return;
		}
		const label = role === 'trash' ? 'Trash' : 'Spam';
		if (
			!(await confirm.ask({
				title: `Empty ${label}?`,
				description: `Permanently delete every message in ${label}? This cannot be undone.`,
				confirmLabel: `Empty ${label}`,
				tone: 'danger'
			}))
		) {
			return;
		}

		if (role === 'trash') emptyingTrash = true;
		else emptyingSpam = true;

		try {
			const removed = await client.emptyMailbox(mailbox.jmapId);
			toast.show(
				removed
					? `Deleted ${removed} message${removed === 1 ? '' : 's'} from ${label}`
					: `${label} was already empty`,
				removed ? 'success' : 'info'
			);
			await mail.refreshMailboxes(client);
		} catch (error) {
			const message = error instanceof Error ? error.message : `Could not empty ${label}`;
			toast.show(message, 'error');
		} finally {
			if (role === 'trash') emptyingTrash = false;
			else emptyingSpam = false;
		}
	}

	function importPreferences(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		void file.text().then((text) => {
			const result = settings.importLocalPreferences(text);
			if (result.ok) {
				toast.show('Settings imported', 'success');
			} else {
				toast.show(result.error, 'error');
			}
			input.value = '';
		});
	}

	async function clearLocalCache() {
		if (
			!(await confirm.ask({
				title: 'Clear local cache?',
				description:
					'Clear downloaded mail and sync state from this device? Your messages on the server are not affected.',
				confirmLabel: 'Clear cache',
				tone: 'danger'
			}))
		) {
			return;
		}

		clearingCache = true;
		try {
			await auth.clearLocalCache();
		} finally {
			clearingCache = false;
		}
	}

	async function resetPreferences() {
		if (
			!(await confirm.ask({
				title: 'Reset preferences?',
				description:
					'Reset mail and display preferences to defaults? Your display name and signature are unchanged.',
				confirmLabel: 'Reset',
				tone: 'danger'
			}))
		) {
			return;
		}
		settings.resetAllSettings();
		toast.show('Preferences reset', 'success');
	}
</script>

<SettingsGroup title="Profile">
	<SettingsField title="Display name">
		{#snippet children({ id })}
			<input
				{id}
				type="text"
				class="z-input"
				value={settings.displayName}
				placeholder={auth.displayName ?? auth.username ?? 'Your name'}
				oninput={(e) => settings.setDisplayName(e.currentTarget.value)}
			/>
		{/snippet}
	</SettingsField>

	<SettingsField title="Signature">
		{#snippet children({ id })}
			<textarea
				{id}
				class="z-input resize-y"
				value={settings.signature}
				placeholder="Best regards,&#10;Your name"
				oninput={(e) => settings.setSignature(e.currentTarget.value)}
			></textarea>
		{/snippet}
	</SettingsField>

	<SettingsRow kind="toggle" title="Include signature">
		<Switch
			checked={settings.useSignature}
			onchange={(checked) => settings.setUseSignature(checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Account">
	<SettingsRow kind="info" title="Primary address">
		<span class="text-fg">{auth.username ?? '—'}</span>
	</SettingsRow>

	<SettingsRow kind="info" title="JMAP server">
		<span class="max-w-[12rem] truncate text-fg sm:max-w-none">
			{auth.serverUrl ?? appConfig.jmapServerUrl}
		</span>
	</SettingsRow>

	<SettingsRow kind="info" title="Session">
		<span class="text-fg">{auth.isAuthenticated ? 'Active' : 'Signed out'}</span>
	</SettingsRow>

	{#if auth.identities.length > 1}
		{#each auth.identities as identity (identity.id)}
			<SettingsRow kind="info" title={identity.name?.trim() || identity.email}>
				<div class="flex flex-col items-end">
					<span class="text-fg">{identity.email}</span>
					{#if identity.name?.trim() && identity.name !== identity.email}
						<span class="text-fg-muted">{identity.name}</span>
					{/if}
				</div>
			</SettingsRow>
		{/each}
	{/if}
</SettingsGroup>

<SettingsGroup title="Notifications & Actions">
	<SettingsRow kind="toggle" title="Confirm before delete">
		<Switch
			checked={settings.confirmBeforeDelete}
			onchange={(checked) => settings.setConfirmBeforeDelete(checked)}
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Hide action toasts">
		<Switch
			checked={settings.hideActionToasts}
			onchange={(checked) => settings.setHideActionToasts(checked)}
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Unseen count on app icon">
		<Switch
			checked={settings.showUnreadAppBadge}
			onchange={(checked) => settings.setShowUnreadAppBadge(checked)}
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Unseen count in tab title">
		<Switch
			checked={settings.showUnreadInTitle}
			onchange={(checked) => settings.setShowUnreadInTitle(checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Device">
	<SettingsRow kind="action" title="App install">
		{#if pwa.isInstalled}
			<span class="text-fg-muted">Installed</span>
		{:else if pwa.canInstall}
			<button type="button" class="z-mail-text-nav__link" onclick={() => pwa.showInstallPromptAgain()}>
				Install
			</button>
		{:else}
			<span class="text-fg-muted">Use browser menu</span>
		{/if}
	</SettingsRow>

	<SettingsRow kind="toggle" title="Push notifications">
		<PushNotificationStatus />
	</SettingsRow>
</SettingsGroup>

{#if oauthEnabled}
	<SettingsGroup title="Security">
		<SettingsField title="Passkey">
			{#snippet children({ id })}
				<div class="flex w-full flex-col gap-2 sm:max-w-xs">
					{#if passkeyStatusLoading}
						<p class="text-fg-muted">Checking passkey status…</p>
					{:else if passkeyRegistered}
						<p class="text-fg">Passkey registered for this account.</p>
						<p class="text-fg-muted">You can sign in with a passkey from the login page.</p>
					{/if}
					<input
						{id}
						type="password"
						class="z-input"
						bind:value={passkeyPassword}
						autocomplete="current-password"
						placeholder="Confirm password"
						disabled={passkeyLoading}
					/>
					<button
						type="button"
						class="z-mail-text-nav__link w-fit"
						disabled={passkeyLoading || !passkeyPassword.trim()}
						onclick={() => void addPasskey()}
					>
						{passkeyLoading
							? 'Waiting for passkey…'
							: passkeyRegistered
								? 'Add another passkey'
								: 'Add passkey'}
					</button>
				</div>
			{/snippet}
		</SettingsField>
	</SettingsGroup>
{/if}

{#if trashMailbox || junkMailbox}
	<SettingsGroup title="Mailbox">
		{#if trashMailbox}
			<SettingsRow kind="action" title="Empty Trash">
				<button
					type="button"
					class="z-mail-text-nav__link z-mail-text-nav__link--danger"
					disabled={emptyingTrash || !auth.client}
					onclick={() => void emptyMailbox('trash')}
				>
					{emptyingTrash ? 'Emptying…' : 'Empty'}
				</button>
			</SettingsRow>
		{/if}

		{#if junkMailbox}
			<SettingsRow kind="action" title="Empty Spam">
				<button
					type="button"
					class="z-mail-text-nav__link z-mail-text-nav__link--danger"
					disabled={emptyingSpam || !auth.client}
					onclick={() => void emptyMailbox('junk')}
				>
					{emptyingSpam ? 'Emptying…' : 'Empty'}
				</button>
			</SettingsRow>
		{/if}
	</SettingsGroup>
{/if}

<SettingsGroup title="Sync & data">
	<SettingsRow kind="action" title="Refresh from account">
		<button
			type="button"
			class="z-mail-text-nav__link"
			onclick={async () => {
				const changed = await settings.refreshFromAccount();
				toast.show(
					changed ? 'Settings updated from your account' : 'Settings are already up to date',
					changed ? 'success' : 'info'
				);
			}}
		>
			Refresh
		</button>
	</SettingsRow>

	<SettingsRow kind="action" title="Save to account">
		<button type="button" class="z-mail-text-nav__link" onclick={() => void settings.syncToAccount()}>
			Save
		</button>
	</SettingsRow>

	<SettingsRow kind="action" title="Export settings">
		<button type="button" class="z-mail-text-nav__link" onclick={() => settings.downloadLocalPreferences()}>
			Export
		</button>
	</SettingsRow>

	<SettingsRow kind="action" title="Import settings">
		<input bind:this={importInput} type="file" accept="application/json,.json" class="hidden" onchange={importPreferences} />
		<button type="button" class="z-mail-text-nav__link" onclick={() => importInput?.click()}>
			Import
		</button>
	</SettingsRow>

	<SettingsRow kind="action" title="Clear local cache">
		<button
			type="button"
			class="z-mail-text-nav__link"
			disabled={clearingCache}
			onclick={() => void clearLocalCache()}
		>
			{clearingCache ? 'Clearing…' : 'Clear'}
		</button>
	</SettingsRow>

	<SettingsRow kind="action" title="Reset preferences">
		<button type="button" class="z-mail-text-nav__link text-fg-subtle" onclick={() => void resetPreferences()}>
			Reset
		</button>
	</SettingsRow>

	<SettingsRow kind="action" title="Sign out">
		<button
			type="button"
			class="z-mail-text-nav__link text-fg-subtle"
			onclick={async () => {
				if (
					await confirm.ask({
						title: 'Sign out?',
						description: 'Sign out of ZAUR Webmail on this device?',
						confirmLabel: 'Sign out',
						tone: 'danger'
					})
				) {
					auth.logout();
				}
			}}
		>
			Sign out
		</button>
	</SettingsRow>
</SettingsGroup>
