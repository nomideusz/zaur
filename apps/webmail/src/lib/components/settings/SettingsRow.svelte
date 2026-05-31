<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { settingsSearch, settingsSearchSlug } from '$lib/settings/search-registry.svelte';

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
		class="z-settings-row scroll-mt-20"
	>
		<p class="z-settings-row-label">{title}</p>
		{#if description}
			<p class="z-settings-row-desc">{description}</p>
		{/if}
		<div class="z-settings-row-control">{@render children()}</div>
	</div>
{/if}
