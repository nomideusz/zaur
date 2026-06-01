<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { appConfig } from '$lib/config';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let clearingCache = $state(false);
	let emptyingTrash = $state(false);
	let emptyingSpam = $state(false);

	const trashMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'trash'));
	const junkMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'junk'));

	async function clearLocalCache() {
		if (
			!confirm(
				'Clear downloaded mail and sync state from this device? Your messages on the server are not affected.'
			)
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

	async function emptyMailbox(role: 'trash' | 'junk') {
		const mailbox = role === 'trash' ? trashMailbox : junkMailbox;
		const client = auth.client;
		if (!mailbox?.jmapId || !client) {
			toast.show(`No ${role === 'trash' ? 'Trash' : 'Spam'} folder available on this account`, 'error');
			return;
		}
		const label = role === 'trash' ? 'Trash' : 'Spam';
		if (
			!confirm(
				`Permanently delete every message in ${label}? This cannot be undone.`
			)
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
</script>

<svelte:head>
	<title>Account · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<SettingsGroup title="Identity">
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
				class="z-input min-h-24 resize-y"
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
	</SettingsGroup>

	<SettingsGroup title="Account">
		<SettingsRow title="Primary address">
			<span class="font-medium text-fg">{auth.username ?? '—'}</span>
		</SettingsRow>
		<SettingsRow title="JMAP server">
			<span class="max-w-[12rem] truncate font-medium text-fg sm:max-w-none">
				{auth.serverUrl ?? appConfig.jmapServerUrl}
			</span>
		</SettingsRow>
		<SettingsRow title="Session">
			<span class="font-medium text-fg">{auth.isAuthenticated ? 'Active' : 'Signed out'}</span>
		</SettingsRow>
		<SettingsRow title="Sign out">
			<Button
				variant="ghost"
				onclick={() => {
					if (confirm('Sign out of ZAUR Webmail on this device?')) auth.logout();
				}}
			>
				Sign out
			</Button>
		</SettingsRow>
	</SettingsGroup>

	{#if auth.identities.length > 1}
		<SettingsGroup title="Addresses">
			{#each auth.identities as identity (identity.id)}
				<SettingsRow title={identity.name?.trim() || identity.email}>
					<div class="flex flex-col items-end">
						<span class="font-medium text-fg">{identity.email}</span>
						{#if identity.name?.trim() && identity.name !== identity.email}
							<span class="text-fg-muted">{identity.name}</span>
						{/if}
					</div>
				</SettingsRow>
			{/each}
		</SettingsGroup>
	{/if}

	{#if trashMailbox || junkMailbox}
		<SettingsGroup title="Mailbox cleanup">
			{#if trashMailbox}
				<SettingsRow title="Empty Trash">
					<Button
						variant="ghost"
						disabled={emptyingTrash || !auth.client}
						onclick={() => void emptyMailbox('trash')}
					>
						{emptyingTrash ? 'Emptying…' : 'Empty'}
					</Button>
				</SettingsRow>
			{/if}
			{#if junkMailbox}
				<SettingsRow title="Empty Spam">
					<Button
						variant="ghost"
						disabled={emptyingSpam || !auth.client}
						onclick={() => void emptyMailbox('junk')}
					>
						{emptyingSpam ? 'Emptying…' : 'Empty'}
					</Button>
				</SettingsRow>
			{/if}
		</SettingsGroup>
	{/if}

	<SettingsGroup title="Sync">
		<SettingsRow title="Refresh from account">
			<button
				type="button"
				class="z-btn-ghost"
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
			<button type="button" class="z-btn-ghost" onclick={() => void settings.syncToAccount()}>
				Save
			</button>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Local data">
		<SettingsRow title="Clear local cache">
			<Button variant="ghost" disabled={clearingCache} onclick={clearLocalCache}>
				{clearingCache ? 'Clearing…' : 'Clear'}
			</Button>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Defaults">
		<SettingsRow title="Reset profile">
			<button
				type="button"
				class="z-btn-ghost"
				onclick={() => {
					if (confirm('Reset your profile to defaults?')) {
						settings.resetAccountSettings();
					}
				}}
			>
				Reset
			</button>
		</SettingsRow>
	</SettingsGroup>
</SettingsPanel>
