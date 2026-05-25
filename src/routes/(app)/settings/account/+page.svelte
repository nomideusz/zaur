<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { appConfig } from '$lib/config';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

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
	<title>You · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel title="You" description="How you appear when sending mail, plus account and local data on this device.">
	<SettingsGroup title="About you" description="Name and signature for outgoing messages.">
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
			title="Email signature"
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

	<SettingsGroup title="This page" advanced>
		<SettingsRow
			title="Hide field hints"
			description="Remove description text under profile fields and local data on this page"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideAccountFieldHints}
				onchange={(e) => settings.setHideAccountFieldHints(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Preferences backup">
		<SettingsRow
			title="Export settings"
			description="Download a JSON backup of your preferences — also under Backup & reset"
		>
			<button type="button" class="z-btn-ghost text-sm" onclick={() => settings.downloadLocalPreferences()}>
				Export
			</button>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Defaults">
		<SettingsRow
			title="Reset you settings"
			description="Restore display name, signature, and field hints on this page to their original values"
		>
			<button
				type="button"
				class="z-btn-ghost text-sm"
				onclick={() => {
					if (confirm('Reset your profile settings to defaults?')) {
						settings.resetAccountSettings();
					}
				}}
			>
				Reset
			</button>
		</SettingsRow>
	</SettingsGroup>

	{#snippet footer()}
		<h3 class="text-xs font-medium tracking-wide text-fg-subtle uppercase">Account details</h3>
		<dl class="mt-4 space-y-4 text-sm">
			<div
				class={cn(
					'flex justify-between gap-4 pb-3',
					!settings.hidePaneBorders && 'border-b border-border'
				)}
			>
				<dt class="text-fg-muted">Primary address</dt>
				<dd class="font-medium text-fg">{auth.username ?? '—'}</dd>
			</div>
			<div
				class={cn(
					'flex justify-between gap-4 pb-3',
					!settings.hidePaneBorders && 'border-b border-border'
				)}
			>
				<dt class="text-fg-muted">JMAP server</dt>
				<dd class="truncate font-medium text-fg">{auth.serverUrl ?? appConfig.jmapServerUrl}</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-fg-muted">Session</dt>
				<dd class="font-medium text-fg">{auth.isAuthenticated ? 'Active' : 'Signed out'}</dd>
			</div>
		</dl>

		<div
			class={cn(
				'mt-6 space-y-4',
				settings.compactSettingsPanel ? 'pt-4' : 'pt-6',
				!settings.hidePaneBorders && 'border-t border-border'
			)}
		>
			<div>
				<p class="text-sm font-medium text-fg">Local data</p>
				{#if !settings.hideAccountFieldHints}
					<p class="mt-0.5 text-xs text-fg-muted">
						Remove cached messages and sync state from this browser. Your account on the server is
						unchanged.
					</p>
				{/if}
				<Button variant="ghost" class="mt-3" disabled={clearingCache} onclick={clearLocalCache}>
					{clearingCache ? 'Clearing…' : 'Clear local cache'}
				</Button>
			</div>

			<Button
				variant="ghost"
				onclick={() => {
					if (confirm('Sign out of ZAUR Webmail on this device?')) auth.logout();
				}}
			>
				Sign out
			</Button>
		</div>
	{/snippet}
</SettingsPanel>
