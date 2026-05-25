<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';
	import type { SettingsDetailLevel } from '$lib/settings/detail-level';

	const options: { value: SettingsDetailLevel; label: string }[] = [
		{ value: 'basic', label: 'Essential' },
		{ value: 'advanced', label: 'All options' }
	];
</script>

<div
	class="inline-flex rounded-lg border border-border bg-surface p-0.5"
	role="group"
	aria-label="Settings detail level"
>
	{#each options as option}
		<button
			type="button"
			class={cn(
				'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
				settings.settingsDetailLevel === option.value
					? 'bg-surface-sunken text-fg shadow-sm'
					: 'text-fg-muted hover:text-fg'
			)}
			aria-pressed={settings.settingsDetailLevel === option.value}
			onclick={() => settings.setSettingsDetailLevel(option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>
