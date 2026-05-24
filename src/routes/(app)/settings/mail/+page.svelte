<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
</script>

<svelte:head>
	<title>Mail · ZAUR Webmail</title>
</svelte:head>

<div class="z-panel rounded-xl p-6">
	<h2 class="text-lg font-semibold text-fg">Mail</h2>
	<p class="mt-1 text-sm text-fg-muted">Reading and message behavior.</p>

	<div class="mt-6 space-y-4">
		<label class="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
			<div>
				<p class="text-sm font-medium text-fg">Mark as read when opened</p>
				<p class="text-xs text-fg-muted">Automatically mark conversations read when you open them</p>
			</div>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.markAsReadOnOpen}
				onchange={(e) => settings.setMarkAsReadOnOpen(e.currentTarget.checked)}
			/>
		</label>
	</div>
</div>
