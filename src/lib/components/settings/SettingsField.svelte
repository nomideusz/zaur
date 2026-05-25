<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { settings } from '$lib/stores/settings.svelte';
	import { settingsSearch, settingsSearchSlug } from '$lib/settings/search-registry.svelte';
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

	const rowId = $derived(`${$page.url.pathname}-${settingsSearchSlug(title)}`);

	const visible = $derived(settingsSearch.matchesRow(title, description));

	onMount(() => {
		const href = get(page).url.pathname;
		settingsSearch.register({ id: rowId, title, description: description ?? '', href });
		return () => settingsSearch.unregister(rowId);
	});

	$effect(() => {
		if ($page.url.hash !== `#${rowId}`) return;
		requestAnimationFrame(() => settingsSearch.scrollTo(rowId));
	});
</script>

{#if visible}
	<label id={rowId} data-settings-row class="block scroll-mt-24 transition-shadow">
		<span class="text-sm font-medium text-fg">{title}</span>
		{#if description}
			<p class="mt-0.5 text-xs text-fg-muted">{description}</p>
		{/if}
		<div class={cn(settings.compactSettingsRows ? 'mt-1.5' : 'mt-2')}>
			{@render children()}
		</div>
	</label>
{/if}
