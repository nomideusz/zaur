<script lang="ts">
	import { appConfig } from '$lib/config';
	import { auth } from '$lib/stores/auth.svelte';
</script>

<svelte:head>
	<title>Account · ZAUR Webmail</title>
</svelte:head>

<div class="z-panel rounded-xl p-6">
	<h2 class="text-lg font-semibold text-fg">Account & security</h2>
	<p class="mt-1 text-sm text-fg-muted">Identities, signatures, and authentication.</p>

	<dl class="mt-6 space-y-4 text-sm">
		<div class="flex justify-between gap-4 border-b border-border pb-3">
			<dt class="text-fg-muted">Primary address</dt>
			<dd class="font-medium text-fg">{auth.username ?? '—'}</dd>
		</div>
		<div class="flex justify-between gap-4 border-b border-border pb-3">
			<dt class="text-fg-muted">JMAP server</dt>
			<dd class="font-medium text-fg">{auth.serverUrl ?? appConfig.jmapServerUrl}</dd>
		</div>
		<div class="flex justify-between gap-4">
			<dt class="text-fg-muted">Session</dt>
			<dd class="font-medium text-fg">{auth.isAuthenticated ? 'Active' : 'Signed out'}</dd>
		</div>
	</dl>
</div>
