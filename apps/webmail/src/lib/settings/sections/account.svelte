<script lang="ts">
	import PushNotificationStatus from '$lib/components/settings/PushNotificationStatus.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsFormGroup from '$lib/components/settings/SettingsFormGroup.svelte';
	import SettingsFormToggle from '$lib/components/settings/SettingsFormToggle.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { appConfig } from '$lib/config';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		vacation,
		vacationDateInputValue,
		vacationDateToUtc
	} from '$lib/stores/vacation.svelte';
	import type { JMAPVacationResponse } from '$lib/jmap/types';

	// Bare hostname of the mail server — IMAP/SMTP share the JMAP host.
	const mailHost = $derived(
		(auth.serverUrl ?? appConfig.jmapServerUrl).replace(/^https?:\/\//, '').replace(/[/:].*$/, '')
	);

	let lastSyncedDisplayName = $state(settings.displayName);
	async function saveDisplayNameToServer() {
		if (settings.displayName === lastSyncedDisplayName) return;
		lastSyncedDisplayName = settings.displayName;
		const ok = await auth.updateDisplayName(settings.displayName);
		if (!ok) {
			toast.show('Saved on this device — could not sync your name to the server.', 'info');
		}
	}

	$effect(() => {
		if (auth.client) void vacation.load(auth.client);
	});

	async function saveVacation(patch: Partial<Omit<JMAPVacationResponse, 'id'>>) {
		if (!auth.client) return;
		const ok = await vacation.save(auth.client, patch);
		if (!ok) toast.show('Could not save your auto-reply to the server.', 'error');
	}

	let refreshingIdentities = $state(false);
	async function refreshIdentities() {
		if (refreshingIdentities) return;
		refreshingIdentities = true;
		const before = auth.identities.length;
		const ok = await auth.refreshIdentities();
		refreshingIdentities = false;
		if (!ok) {
			toast.show('Could not refresh send-from addresses.', 'error');
			return;
		}
		const found = auth.identities.length;
		toast.show(
			found > before
				? `Found ${found - before} new send-from ${found - before === 1 ? 'address' : 'addresses'}.`
				: 'Send-from addresses are up to date.',
			'success'
		);
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

{#if vacation.status !== 'unavailable'}
	<SettingsFormGroup
		title="Vacation responder"
		description="Automatically reply to incoming mail while you're away."
	>
		{#if vacation.status === 'error'}
			<SettingsRow
				kind="action"
				searchable={false}
				title="Auto-reply"
				description="Could not load your auto-reply from the server."
			>
				<Button
					variant="ghost"
					onclick={() => auth.client && void vacation.load(auth.client, { force: true })}
				>
					Retry
				</Button>
			</SettingsRow>
		{:else}
			<SettingsFormToggle
				title="Auto-reply to incoming mail"
				description="Senders get your away message at most once per week."
			>
				<Switch
					checked={vacation.isEnabled}
					disabled={vacation.status !== 'ready' || vacation.saving}
					onchange={(checked) => void saveVacation({ isEnabled: checked })}
				/>
			</SettingsFormToggle>

			<SettingsField title="First day" description="Leave empty to start right away.">
				{#snippet children({ id })}
					<input
						{id}
						type="date"
						class="z-input"
						value={vacationDateInputValue(vacation.fromDate)}
						disabled={vacation.status !== 'ready'}
						max={vacationDateInputValue(vacation.toDate) || undefined}
						onchange={(e) =>
							void saveVacation({ fromDate: vacationDateToUtc(e.currentTarget.value, 'start') })}
					/>
				{/snippet}
			</SettingsField>

			<SettingsField title="Last day" description="Leave empty to reply until you switch it off.">
				{#snippet children({ id })}
					<input
						{id}
						type="date"
						class="z-input"
						value={vacationDateInputValue(vacation.toDate)}
						disabled={vacation.status !== 'ready'}
						min={vacationDateInputValue(vacation.fromDate) || undefined}
						onchange={(e) =>
							void saveVacation({ toDate: vacationDateToUtc(e.currentTarget.value, 'end') })}
					/>
				{/snippet}
			</SettingsField>

			<SettingsField title="Subject" description="Leave empty for the server default.">
				{#snippet children({ id })}
					<input
						{id}
						type="text"
						class="z-input"
						value={vacation.subject}
						disabled={vacation.status !== 'ready'}
						placeholder="Out of office"
						onblur={(e) => {
							const value = e.currentTarget.value.trim();
							if (value !== vacation.subject) void saveVacation({ subject: value || null });
						}}
					/>
				{/snippet}
			</SettingsField>

			<SettingsField title="Message" description="The reply senders receive while you're away.">
				{#snippet children({ id })}
					<textarea
						{id}
						class="z-input resize-y"
						rows={4}
						value={vacation.textBody}
						disabled={vacation.status !== 'ready'}
						placeholder="I'm away until … and will reply when I'm back."
						onblur={(e) => {
							const value = e.currentTarget.value;
							if (value !== vacation.textBody) void saveVacation({ textBody: value || null });
						}}
					></textarea>
				{/snippet}
			</SettingsField>
		{/if}
	</SettingsFormGroup>
{/if}

<SettingsGroup title="Accounts">
	{#each auth.accounts as account (account.key)}
		<SettingsRow
			kind="action"
			searchable={false}
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
			<SettingsRow kind="info" searchable={false} title={identity.name?.trim() || identity.email}>
				<div class="flex flex-col items-end">
					<span class="text-fg">{identity.email}</span>
					{#if identity.name?.trim() && identity.name !== identity.email}
						<span class="text-fg-muted">{identity.name}</span>
					{/if}
				</div>
			</SettingsRow>
		{/each}
	{/if}

	<SettingsRow
		kind="action"
		title="Send-from addresses"
		description="Refresh the list of addresses you can send from if an alias isn't showing up."
	>
		<Button variant="ghost" disabled={refreshingIdentities} onclick={() => void refreshIdentities()}>
			{refreshingIdentities ? 'Refreshing…' : 'Refresh'}
		</Button>
	</SettingsRow>
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

<SettingsGroup title="Device & Notifications">
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


