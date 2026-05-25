<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { settings } from '$lib/stores/settings.svelte';
	import { shouldShowSetting } from '$lib/settings/detail-level';
	import { settingsSearch, settingsSearchSlug } from '$lib/settings/search-registry.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		title,
		description,
		advanced,
		children
	}: {
		title: string;
		description?: string;
		advanced?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	const rowId = $derived(`${$page.url.pathname}-${settingsSearchSlug(title)}`);

	const visible = $derived(
		shouldShowSetting(settings.settingsDetailLevel, { advanced, title }) &&
			settingsSearch.matchesRow(title, description)
	);

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
	<label
		id={rowId}
		data-settings-row
		class={cn(
			'flex min-w-0 scroll-mt-24 items-center justify-between gap-4 rounded-lg border border-border transition-shadow',
			settings.compactSettingsRows ? 'px-3 py-2' : 'px-4 py-3',
			settings.hidePaneBorders && 'border-transparent',
			'[&:has(:disabled)]:cursor-not-allowed'
		)}
	>
		<div class="min-w-0 flex-1">
			<p class="text-sm font-medium text-fg">{title}</p>
			{#if description}
				<p class="text-xs text-fg-muted">{description}</p>
			{/if}
		</div>
		<div class="shrink-0">{@render children()}</div>
	</label>
{/if}
