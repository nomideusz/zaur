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
	<div
		id={rowId}
		data-settings-row
		class={cn(
			'scroll-mt-20 border-b border-border/80 px-4 py-3 last:border-b-0',
			settings.compactSettingsRows && 'px-3 py-2.5'
		)}
	>
		<p class="text-sm font-medium text-fg">{title}</p>
		{#if description}
			<p class="mt-0.5 text-xs text-fg-muted">{description}</p>
		{/if}
		<div class="mt-2">{@render children()}</div>
	</div>
{/if}
