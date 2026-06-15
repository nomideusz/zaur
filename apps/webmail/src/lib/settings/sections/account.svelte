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
	import { mail } from '$lib/stores/mail.svelte';
	import { settings, type CalendarMaxEventsPerDay } from '$lib/stores/settings.svelte';
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
		description="Show the number of unread messages as a badge on the installed app's icon."
	>
		<Switch
			checked={settings.showUnreadAppBadge}
			onchange={(checked) => settings.setShowUnreadAppBadge(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Unseen count in tab title"
		description="Show the number of unread messages in the browser tab title."
	>
		<Switch
			checked={settings.showUnreadInTitle}
			onchange={(checked) => settings.setShowUnreadInTitle(checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Calendar">
	<SettingsRow
		kind="toggle"
		title="Week starts on Monday"
		description="Begin each calendar week on Monday instead of Sunday."
	>
		<Switch
			checked={settings.calendarWeekStartsOnMonday}
			onchange={(checked) => settings.setCalendarWeekStartsOnMonday(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Hide event times"
		description="Show events by title only, without their start and end times."
	>
		<Switch
			checked={settings.hideCalendarEventTimes}
			onchange={(checked) => settings.setHideCalendarEventTimes(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="menu"
		title="Events per day in month view"
		description="How many events to list under a day before the rest collapse into a count."
	>
		<SettingsSelect
			label="Events per day in month view"
			value={String(settings.calendarMaxEventsPerDay)}
			options={[
				{ value: '2', label: '2' },
				{ value: '3', label: '3' },
				{ value: '5', label: '5' }
			]}
			onchange={(v) => {
				if (v === '2' || v === '3' || v === '5') {
					settings.setCalendarMaxEventsPerDay(Number(v) as CalendarMaxEventsPerDay);
				}
			}}
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

{#if trashMailbox || junkMailbox}
	<SettingsGroup title="Mailbox" description="Bulk cleanup actions. These permanently delete mail and can't be undone.">
		{#if trashMailbox}
			<SettingsRow
				kind="action"
				title="Empty Trash"
				description="Permanently delete every message in the Trash folder."
			>
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
			<SettingsRow
				kind="action"
				title="Empty Spam"
				description="Permanently delete every message in the Spam folder."
			>
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

<SettingsGroup
	title="Sync & data"
	description="Your preferences sync automatically across your devices. These are manual backups and resets."
>
	<SettingsRow
		kind="action"
		title="Sync now"
		description="Force an immediate sync with your account instead of waiting for the automatic one."
	>
		<button type="button" class="z-mail-text-nav__link" onclick={() => void settings.syncToAccount()}>
			Sync
		</button>
	</SettingsRow>

	<SettingsRow
		kind="action"
		title="Export settings"
		description="Download your preferences as a JSON file."
	>
		<button type="button" class="z-mail-text-nav__link" onclick={() => settings.downloadLocalPreferences()}>
			Export
		</button>
	</SettingsRow>

	<SettingsRow
		kind="action"
		title="Import settings"
		description="Load preferences from a previously exported file."
	>
		<input bind:this={importInput} type="file" accept="application/json,.json" class="hidden" onchange={importPreferences} />
		<button type="button" class="z-mail-text-nav__link" onclick={() => importInput?.click()}>
			Import
		</button>
	</SettingsRow>

	<SettingsRow
		kind="action"
		title="Clear local cache"
		description="Remove downloaded mail and sync state from this device. Your mail on the server is untouched."
	>
		<button
			type="button"
			class="z-mail-text-nav__link"
			disabled={clearingCache}
			onclick={() => void clearLocalCache()}
		>
			{clearingCache ? 'Clearing…' : 'Clear'}
		</button>
	</SettingsRow>

	<SettingsRow
		kind="action"
		title="Reset preferences"
		description="Restore all settings to their defaults. Your display name and signature are kept."
	>
		<button
			type="button"
			class="z-mail-text-nav__link z-mail-text-nav__link--danger"
			onclick={() => void resetPreferences()}
		>
			Reset
		</button>
	</SettingsRow>

	<SettingsRow
		kind="action"
		title="Sign out"
		description="Sign out of ZAUR Webmail on this device."
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
