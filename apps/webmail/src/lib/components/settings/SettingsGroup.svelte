<script lang="ts">
	import { observeVisibleSettingsRows } from '$lib/settings/observe-visible-rows';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		title,
		description,
		visibleOn = 'all',
		children
	}: {
		title: string;
		/** Optional one-line subtitle under the group heading. */
		description?: string;
		/** Hide entire section on the wrong viewport — e.g. desktop-only layout options. */
		visibleOn?: 'all' | 'desktop' | 'mobile';
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
		visibleOn === 'desktop' && 'z-settings-section--desktop',
		visibleOn === 'mobile' && 'z-settings-section--mobile',
		!hasRows && 'hidden'
	)}
>
	{#if hasRows}
		<div class="z-settings-section-heading">
			<p class="z-settings-section-title">{title}</p>
			{#if description}
				<p class="z-settings-section-desc">{description}</p>
			{/if}
		</div>
	{/if}
	<div class="z-settings-list">
		{@render children()}
	</div>
</section>
