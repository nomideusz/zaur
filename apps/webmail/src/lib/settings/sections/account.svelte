<script lang="ts">
	import { onMount } from 'svelte';
	import PushNotificationStatus from '$lib/components/settings/PushNotificationStatus.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsFormGroup from '$lib/components/settings/SettingsFormGroup.svelte';
	import SettingsFormToggle from '$lib/components/settings/SettingsFormToggle.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { appConfig } from '$lib/config';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let passkeyPassword = $state('');
	let passkeyLoading = $state(false);
	let passkeyRegistered = $state<boolean | null>(null);
	let passkeyStatusLoading = $state(false);

	const oauthEnabled = $derived(auth.oauthConfig?.enabled === true);
	// Bare hostname of the mail server — IMAP/SMTP share the JMAP host.
	const mailHost = $derived(
		(auth.serverUrl ?? appConfig.jmapServerUrl).replace(/^https?:\/\//, '').replace(/[/:].*$/, '')
	);

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

	let lastSyncedDisplayName = $state(settings.displayName);
	async function saveDisplayNameToServer() {
		if (settings.displayName === lastSyncedDisplayName) return;
		lastSyncedDisplayName = settings.displayName;
		const ok = await auth.updateDisplayName(settings.displayName);
		if (!ok) {
			toast.show('Saved on this device — could not sync your name to the server.', 'info');
		}
	}
</script>

<SettingsFormGroup title="Profile" description="How you appear when you send mail.">
	<SettingsField title="Display name" description="Shown to recipients on messages you send.">
		{#snippet children({ id })}
			<input
				{id}
				type="text"
				class="z-input"
				value={settings.displayName}
				placeholder={auth.displayName ?? auth.username ?? 'Your name'}
				oninput={(e) => settings.setDisplayName(e.currentTarget.value)}
				onblur={() => void saveDisplayNameToServer()}
			/>
		{/snippet}
	</SettingsField>

	<SettingsField title="Signature" description="Appended to the bottom of new messages.">
		{#snippet children({ id })}
			<textarea
				{id}
				class="z-input resize-y"
				rows={4}
				value={settings.signature}
				placeholder="Best regards,&#10;Your name"
				oninput={(e) => settings.setSignature(e.currentTarget.value)}
			></textarea>
		{/snippet}
	</SettingsField>

	<SettingsFormToggle title="Include signature" description="Add your signature when composing.">
		<Switch
			checked={settings.useSignature}
			onchange={(checked) => settings.setUseSignature(checked)}
		/>
	</SettingsFormToggle>
</SettingsFormGroup>

<SettingsGroup title="Accounts">
	{#each auth.accounts as account (account.key)}
		<SettingsRow
			kind="action"
			title={account.displayName}
			description={account.displayName.trim().toLowerCase() !== account.username.trim().toLowerCase()
				? account.username
				: undefined}
		>
			<div class="flex items-center gap-2">
				{#if (auth.unread[account.key] ?? 0) > 0}
					<span
						class="rounded-full bg-accent/15 px-1.5 py-0.5 text-xs font-medium tabular-nums text-accent"
						aria-label="{auth.unread[account.key]} unread"
					>
						{auth.unread[account.key] > 99 ? '99+' : auth.unread[account.key]}
					</span>
				{/if}
				{#if account.isActive}
					<span class="text-sm text-fg-muted">Active</span>
				{:else}
					<Button variant="ghost" onclick={() => void auth.switchAccount(account.key)}>Switch</Button>
				{/if}
			</div>
		</SettingsRow>
	{/each}

	<SettingsRow kind="action" title="Add account" description="Sign in to another mailbox.">
		<Button variant="ghost" onclick={() => auth.addAccountFlow()}>Add</Button>
	</SettingsRow>

	{#if auth.accounts.length > 1}
		<SettingsRow
			kind="action"
			title="Sign out of this account"
			description="Keep your other accounts signed in."
		>
			<Button
				variant="ghost"
				onclick={() => auth.activeKey && void auth.removeAccount(auth.activeKey)}
			>
				Sign out
			</Button>
		</SettingsRow>
	{/if}

	<SettingsRow
		kind="action"
		title="Sign out"
		description="Sign out of every account on this device."
	>
		<button
			type="button"
			class="z-mail-text-nav__link z-mail-text-nav__link--danger"
			onclick={async () => {
				if (
					await confirm.ask({
						title: 'Sign out?',
						description:
							auth.accounts.length > 1
								? 'Sign out of all accounts on this device?'
								: 'Sign out of ZAUR Webmail on this device?',
						confirmLabel: 'Sign out',
						tone: 'danger'
					})
				) {
					auth.logout();
				}
			}}
		>
			{auth.accounts.length > 1 ? 'Sign out of all' : 'Sign out'}
		</button>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Account">
	<SettingsRow kind="info" title="Primary address">
		<span class="text-fg">{auth.username ?? '—'}</span>
	</SettingsRow>

	<SettingsRow kind="info" title="JMAP server" description="The mail server this app syncs with.">
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

<SettingsGroup
	title="Other email apps"
	description="Use any IMAP client — Apple Mail, Thunderbird, Outlook. Sign in with your full email address and mailbox password."
>
	<SettingsRow kind="info" title="IMAP server">
		<span class="text-fg">{mailHost}</span>
	</SettingsRow>

	<SettingsRow kind="info" title="IMAP port" description="Incoming mail, SSL/TLS.">
		<span class="text-fg tabular-nums">993</span>
	</SettingsRow>

	<SettingsRow kind="info" title="SMTP server">
		<span class="text-fg">{mailHost}</span>
	</SettingsRow>

	<SettingsRow kind="info" title="SMTP port" description="Outgoing mail. SSL/TLS, or 587 with STARTTLS.">
		<span class="text-fg tabular-nums">465</span>
	</SettingsRow>

	<SettingsRow kind="info" title="Username">
		<span class="max-w-[12rem] truncate text-fg sm:max-w-none">{auth.username ?? '—'}</span>
	</SettingsRow>

	<SettingsRow kind="info" title="Password" description="Your mailbox password — the one you registered with.">
		<span class="text-fg-muted">Mailbox password</span>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Notifications & Actions">
	<SettingsRow
		kind="toggle"
		title="Confirm before delete"
		description="Ask before moving messages to the Trash."
	>
		<Switch
			checked={settings.confirmBeforeDelete}
			onchange={(checked) => settings.setConfirmBeforeDelete(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="menu"
		title="Undo window"
		description="How long an Undo button stays after you send, archive, delete, or move a message. Off acts immediately."
	>
		<SettingsSelect
			label="Undo window"
			value={String(settings.undoSendDelay)}
			options={[
				{ value: '0', label: 'Off' },
				{ value: '5000', label: '5 s' },
				{ value: '10000', label: '10 s' },
				{ value: '20000', label: '20 s' }
			]}
			onchange={(v) => {
				const next = Number(v);
				if (next === 0 || next === 5000 || next === 10000 || next === 20000) {
					settings.setUndoSendDelay(next);
				}
			}}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Hide action toasts"
		description="Stop showing the brief confirmations that pop up after actions."
	>
		<Switch
			checked={settings.hideActionToasts}
			onchange={(checked) => settings.setHideActionToasts(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Unseen count on app icon"
		description="Show the number of unseen messages as a badge on the installed app's icon."
	>
		<Switch
			checked={settings.showUnreadAppBadge}
			onchange={(checked) => settings.setShowUnreadAppBadge(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Unseen count in tab title"
		description="Show the number of unseen messages in the browser tab title."
	>
		<Switch
			checked={settings.showUnreadInTitle}
			onchange={(checked) => settings.setShowUnreadInTitle(checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Device">
	<SettingsRow
		kind="action"
		title="App install"
		description="Install ZAUR as an app on this device for a standalone window."
	>
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

	<SettingsRow
		kind="toggle"
		title="Push notifications"
		description="Get notified about new mail even when ZAUR isn't open."
	>
		<PushNotificationStatus />
	</SettingsRow>
</SettingsGroup>

{#if oauthEnabled}
	<SettingsGroup title="Security">
		<SettingsField title="Passkey" description="Sign in with your device's biometrics or PIN instead of a password.">
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

