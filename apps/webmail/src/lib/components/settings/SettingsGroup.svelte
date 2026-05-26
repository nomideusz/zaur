<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { observeVisibleSettingsRows } from '$lib/settings/observe-visible-rows';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		title,
		description,
		children
	}: {
		title: string;
		description?: string;
		advanced?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	let sectionRef = $state<HTMLElement | null>(null);
	let hasRows = $state(true);

	$effect(() => {
		settingsSearch.query;
		if (!sectionRef) {
			hasRows = false;
			return;
		}

		return observeVisibleSettingsRows(sectionRef, (next) => {
			hasRows = next;
		});
	});
</script>

<section
		bind:this={sectionRef}
		class={cn(!hasRows && 'hidden', settings.compactSettingsRows ? 'space-y-2' : 'space-y-3')}
	>
		{#if hasRows}
			<div class={cn(!settings.hidePaneBorders && 'border-b border-border/80 pb-2')}>
				<h3 class="text-sm font-semibold text-fg">{title}</h3>
				{#if description && !settings.hideSettingsPanelDescriptions}
					<p class="mt-0.5 text-xs text-fg-muted">{description}</p>
				{/if}
			</div>
		{/if}
		<div
			class={cn(
				'divide-y divide-border/80 rounded-sm border border-border/80 bg-surface-raised',
				settings.hidePaneBorders && 'border-transparent bg-transparent'
			)}
		>
			{@render children()}
		</div>
</section>
