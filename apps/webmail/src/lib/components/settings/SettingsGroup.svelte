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
	class={cn(
		'z-settings-section',
		settings.compactSettingsRows && 'z-settings-section--compact',
		!hasRows && 'hidden'
	)}
>
	{#if hasRows}
		<div
			class={cn(
				'z-settings-section-heading',
				settings.hidePaneBorders && 'z-settings-section-heading--plain'
			)}
		>
			<h3 class="z-settings-section-title">{title}</h3>
		</div>
	{/if}
	<div
		class={cn(
			'z-settings-list',
			settings.hidePaneBorders && 'z-settings-list--plain'
		)}
	>
		{@render children()}
	</div>
</section>
