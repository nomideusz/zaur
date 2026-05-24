<script lang="ts">
	import { settings, type ListDensity } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
</script>

<svelte:head>
	<title>Display · ZAUR Webmail</title>
</svelte:head>

<div class="z-panel rounded-xl p-6">
	<h2 class="text-lg font-semibold text-fg">Display</h2>
	<p class="mt-1 text-sm text-fg-muted">Appearance and how messages are shown in the list and reader.</p>

	<div class="mt-6 space-y-4">
		<label class="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
			<div>
				<p class="text-sm font-medium text-fg">Theme</p>
				<p class="text-xs text-fg-muted">Light, dark, or match your system</p>
			</div>
			<select
				class="z-input w-auto"
				value={theme.theme}
				onchange={(e) => theme.set(e.currentTarget.value as ThemeMode)}
			>
				<option value="system">System</option>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
			</select>
		</label>

		<label class="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
			<div>
				<p class="text-sm font-medium text-fg">List density</p>
				<p class="text-xs text-fg-muted">Spacing between messages in the inbox list</p>
			</div>
			<select
				class="z-input w-auto"
				value={settings.listDensity}
				onchange={(e) => settings.setListDensity(e.currentTarget.value as ListDensity)}
			>
				<option value="comfortable">Comfortable</option>
				<option value="compact">Compact</option>
			</select>
		</label>

		<label class="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
			<div>
				<p class="text-sm font-medium text-fg">Block external content</p>
				<p class="text-xs text-fg-muted">Images and remote resources in HTML mail</p>
			</div>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.blockExternalContent}
				onchange={(e) => settings.setBlockExternalContent(e.currentTarget.checked)}
			/>
		</label>
	</div>
</div>
