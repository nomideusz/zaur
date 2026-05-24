<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import { appConfig } from '$lib/config';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';

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

<SettingsPanel title="Account" description="Your profile and sign-in details.">
	<SettingsGroup title="Profile">
		<SettingsField title="Display name" description="Shown when you send mail and in the header">
			<input
				type="text"
				class="z-input"
				value={settings.displayName}
				placeholder={auth.displayName ?? auth.username ?? 'Your name'}
				oninput={(e) => settings.setDisplayName(e.currentTarget.value)}
			/>
		</SettingsField>

		<SettingsField title="Email signature" description="Appended to new messages, replies, and forwards">
			<textarea
				class="z-input min-h-24 resize-y"
				value={settings.signature}
				placeholder="Best regards,&#10;Your name"
				oninput={(e) => settings.setSignature(e.currentTarget.value)}
			></textarea>
		</SettingsField>
	</SettingsGroup>

	{#snippet footer()}
		<h3 class="text-xs font-medium tracking-wide text-fg-subtle uppercase">Account details</h3>
		<dl class="mt-4 space-y-4 text-sm">
			<div class="flex justify-between gap-4 border-b border-border pb-3">
				<dt class="text-fg-muted">Primary address</dt>
				<dd class="font-medium text-fg">{auth.username ?? '—'}</dd>
			</div>
			<div class="flex justify-between gap-4 border-b border-border pb-3">
				<dt class="text-fg-muted">JMAP server</dt>
				<dd class="truncate font-medium text-fg">{auth.serverUrl ?? appConfig.jmapServerUrl}</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-fg-muted">Session</dt>
				<dd class="font-medium text-fg">{auth.isAuthenticated ? 'Active' : 'Signed out'}</dd>
			</div>
		</dl>

		<div class="mt-6 space-y-4 border-t border-border pt-6">
			<div>
				<p class="text-sm font-medium text-fg">Local data</p>
				<p class="mt-0.5 text-xs text-fg-muted">
					Remove cached messages and sync state from this browser. Your account on the server is
					unchanged.
				</p>
				<Button variant="ghost" class="mt-3" disabled={clearingCache} onclick={clearLocalCache}>
					{clearingCache ? 'Clearing…' : 'Clear local cache'}
				</Button>
			</div>

			<Button variant="ghost" onclick={() => auth.logout()}>Sign out</Button>
		</div>
	{/snippet}
</SettingsPanel>
