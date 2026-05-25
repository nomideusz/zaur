<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		title,
		description,
		advanced = false,
		children
	}: {
		title: string;
		description?: string;
		advanced?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	let sectionRef = $state<HTMLElement | null>(null);
	let hasRows = $state(true);

	const visible = $derived(settings.settingsDetailLevel === 'advanced' || !advanced);

	$effect(() => {
		const q = settingsSearch.query.trim();
		if (!sectionRef) return;
		if (!q) {
			hasRows = true;
			return;
		}
		hasRows = sectionRef.querySelector('[data-settings-row]') !== null;
	});
</script>

{#if visible && hasRows}
	<section bind:this={sectionRef} class={cn(settings.compactSettingsRows ? 'space-y-3' : 'space-y-4')}>
		<div>
			<h3 class="text-sm font-semibold text-fg">{title}</h3>
			{#if description && !settings.hideSettingsPanelDescriptions}
				<p class="mt-0.5 text-xs text-fg-muted">{description}</p>
			{/if}
		</div>
		<div
			class={cn(
				'grid gap-3',
				settings.compactSettingsRows ? 'lg:grid-cols-2 lg:gap-4' : 'lg:grid-cols-2 lg:gap-4 xl:gap-5'
			)}
		>
			{@render children()}
		</div>
	</section>
{/if}
