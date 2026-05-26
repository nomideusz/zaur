<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { appConfig } from '$lib/config';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let clearingCache = $state(false);

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
</script>

<svelte:head>
	<title>Account · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Account"
	description="Your name and signature, and the account on this device."
>
	<SettingsGroup title="Identity" description="Name and signature for outgoing messages.">
		<SettingsField
			title="Display name"
			description={settings.hideAccountFieldHints ? undefined : 'Shown when you send mail and in the header'}
		>
			<input
				type="text"
				class="z-input"
				value={settings.displayName}
				placeholder={auth.displayName ?? auth.username ?? 'Your name'}
				oninput={(e) => settings.setDisplayName(e.currentTarget.value)}
			/>
		</SettingsField>

		<SettingsField
			title="Signature"
			description={settings.hideAccountFieldHints ? undefined : 'Appended to new messages, replies, and forwards'}
		>
			<textarea
				class="z-input min-h-24 resize-y"
				value={settings.signature}
				placeholder="Best regards,&#10;Your name"
				oninput={(e) => settings.setSignature(e.currentTarget.value)}
			></textarea>
		</SettingsField>

		<SettingsRow
			title="Include signature"
			description="Append your signature to new messages, replies, and forwards"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.useSignature}
				onchange={(e) => settings.setUseSignature(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Account" description="Server connection for this session.">
		<SettingsRow title="Primary address">
			<span class="text-sm font-medium text-fg">{auth.username ?? '—'}</span>
		</SettingsRow>
		<SettingsRow title="JMAP server">
			<span class="max-w-[12rem] truncate text-sm font-medium text-fg sm:max-w-none">
				{auth.serverUrl ?? appConfig.jmapServerUrl}
			</span>
		</SettingsRow>
		<SettingsRow title="Session">
			<span class="text-sm font-medium text-fg">{auth.isAuthenticated ? 'Active' : 'Signed out'}</span>
		</SettingsRow>
		<SettingsRow title="Sign out" description="Sign out of ZAUR Webmail on this device">
			<Button
				variant="ghost"
				class="text-sm"
				onclick={() => {
					if (confirm('Sign out of ZAUR Webmail on this device?')) auth.logout();
				}}
			>
				Sign out
			</Button>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup
		title="Sync"
		description="Preferences are stored on your mail account and cached in this browser."
	>
		<SettingsRow
			title="Refresh from account"
			description="Load the latest preferences from your mail account"
		>
			<button
				type="button"
				class="z-btn-ghost text-sm"
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
		<SettingsRow
			title="Save to account"
			description="Push your current preferences to your other devices"
		>
			<button type="button" class="z-btn-ghost text-sm" onclick={() => void settings.syncToAccount()}>
				Save
			</button>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup
		title="Local data"
		description="Cached mail on this device — your account on the server is unchanged."
	>
		<SettingsRow
			title="Clear local cache"
			description="Remove downloaded messages and sync state from this browser"
		>
			<Button variant="ghost" class="text-sm" disabled={clearingCache} onclick={clearLocalCache}>
				{clearingCache ? 'Clearing…' : 'Clear'}
			</Button>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Defaults">
		<SettingsRow
			title="Reset profile"
			description="Restore display name and signature on this page"
		>
			<button
				type="button"
				class="z-btn-ghost text-sm"
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
