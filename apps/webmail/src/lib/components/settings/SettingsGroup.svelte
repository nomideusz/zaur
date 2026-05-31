<script lang="ts">
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
	class={cn('z-settings-section', !hasRows && 'hidden')}
>
	{#if hasRows}
		<div class="z-settings-section-heading">
			<h3 class="z-settings-section-title">{title}</h3>
		</div>
	{/if}
	<div class="z-settings-list">
		{@render children()}
	</div>
</section>
