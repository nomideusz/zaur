<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
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

<div class="z-panel rounded-xl p-6">
	<h2 class="text-lg font-semibold text-fg">Account</h2>
	<p class="mt-1 text-sm text-fg-muted">Your profile and sign-in details.</p>

	<div class="mt-6 space-y-6">
		<label class="block">
			<span class="text-sm font-medium text-fg">Display name</span>
			<p class="mt-0.5 text-xs text-fg-muted">Shown when you send mail and in the header</p>
			<input
				type="text"
				class="z-input mt-2"
				value={settings.displayName}
				placeholder={auth.displayName ?? auth.username ?? 'Your name'}
				oninput={(e) => settings.setDisplayName(e.currentTarget.value)}
			/>
		</label>

		<label class="block">
			<span class="text-sm font-medium text-fg">Email signature</span>
			<p class="mt-0.5 text-xs text-fg-muted">Appended to new messages, replies, and forwards</p>
			<textarea
				class="z-input mt-2 min-h-24 resize-y"
				value={settings.signature}
				placeholder="Best regards,&#10;Your name"
				oninput={(e) => settings.setSignature(e.currentTarget.value)}
			></textarea>
		</label>

		<dl class="space-y-4 border-t border-border pt-6 text-sm">
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

		<div class="space-y-4 border-t border-border pt-6">
			<div>
				<p class="text-sm font-medium text-fg">Local data</p>
				<p class="mt-0.5 text-xs text-fg-muted">
					Remove cached messages and sync state from this browser. Your account on the server is
					unchanged.
				</p>
				<Button
					variant="ghost"
					class="mt-3"
					disabled={clearingCache}
					onclick={clearLocalCache}
				>
					{clearingCache ? 'Clearing…' : 'Clear local cache'}
				</Button>
			</div>

			<Button variant="ghost" onclick={() => auth.logout()}>Sign out</Button>
		</div>
	</div>
</div>
