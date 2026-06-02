<script lang="ts">
	import { onMount } from 'svelte';
	import PushNotificationStatus from '$lib/components/settings/PushNotificationStatus.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { appConfig } from '$lib/config';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let emptyingTrash = $state(false);
	let emptyingSpam = $state(false);
	let passkeyPassword = $state('');
	let passkeyLoading = $state(false);
	let passkeyConfigured = $state<boolean | null>(null);

	const oauthEnabled = $derived(auth.oauthConfig?.enabled === true);
	const trashMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'trash'));
	const junkMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'junk'));

	onMount(async () => {
		await auth.checkOauthConfig();
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
			passkeyConfigured = true;
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
		if (!confirm(`Permanently delete every message in ${label}? This cannot be undone.`)) {
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
</script>

<svelte:head>
	<title>Account · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<SettingsField title="Display name">
		<input
			type="text"
			class="z-input"
			value={settings.displayName}
			placeholder={auth.displayName ?? auth.username ?? 'Your name'}
			oninput={(e) => settings.setDisplayName(e.currentTarget.value)}
		/>
	</SettingsField>

	<SettingsField title="Signature">
		<textarea
			class="z-input resize-y"
			value={settings.signature}
			placeholder="Best regards,&#10;Your name"
			oninput={(e) => settings.setSignature(e.currentTarget.value)}
		></textarea>
	</SettingsField>

	<SettingsRow title="Include signature">
		<input
			type="checkbox"
			checked={settings.useSignature}
			onchange={(e) => settings.setUseSignature(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Primary address">
		<span class="text-fg">{auth.username ?? '—'}</span>
	</SettingsRow>

	<SettingsRow title="JMAP server">
		<span class="max-w-[12rem] truncate text-fg sm:max-w-none">
			{auth.serverUrl ?? appConfig.jmapServerUrl}
		</span>
	</SettingsRow>

	<SettingsRow title="Session">
		<span class="text-fg">{auth.isAuthenticated ? 'Active' : 'Signed out'}</span>
	</SettingsRow>

	<SettingsRow title="App install">
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

	<SettingsRow title="Push notifications">
		<PushNotificationStatus />
	</SettingsRow>

	{#if oauthEnabled}
		<SettingsField
			title="Passkey"
			description="Use Face ID, Touch ID, or your device PIN to sign in without your password."
		>
			<div class="flex w-full flex-col gap-2 sm:max-w-xs">
				<input
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
					{passkeyLoading ? 'Waiting for passkey…' : 'Add passkey'}
				</button>
				{#if passkeyConfigured}
					<p class="text-fg-muted">Passkey added on this device.</p>
				{/if}
			</div>
		</SettingsField>
	{/if}

	{#if auth.identities.length > 1}
		{#each auth.identities as identity (identity.id)}
			<SettingsRow title={identity.name?.trim() || identity.email}>
				<div class="flex flex-col items-end">
					<span class="text-fg">{identity.email}</span>
					{#if identity.name?.trim() && identity.name !== identity.email}
						<span class="text-fg-muted">{identity.name}</span>
					{/if}
				</div>
			</SettingsRow>
		{/each}
	{/if}

	{#if trashMailbox}
		<SettingsRow title="Empty Trash">
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
		<SettingsRow title="Empty Spam">
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

	<SettingsRow title="Refresh from account">
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

	<SettingsRow title="Save to account">
		<button type="button" class="z-mail-text-nav__link" onclick={() => void settings.syncToAccount()}>
			Save
		</button>
	</SettingsRow>

	<SettingsRow title="Sign out">
		<button
			type="button"
			class="z-mail-text-nav__link text-fg-subtle"
			onclick={() => {
				if (confirm('Sign out of ZAUR Webmail on this device?')) auth.logout();
			}}
		>
			Sign out
		</button>
	</SettingsRow>
</SettingsPanel>
