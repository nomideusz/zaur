<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import {
		SETTINGS_A11Y,
		type SettingsA11yContext
	} from '$lib/components/settings/settings-control-context';
	import { settingsSearch, settingsSearchSlug } from '$lib/settings/search-registry.svelte';
	import { cn } from '$lib/utils/cn';

	export type SettingsRowKind = 'toggle' | 'menu' | 'action' | 'info';

	let {
		title,
		description,
		kind = 'info',
		children
	}: {
		title: string;
		description?: string;
		/** toggle: label + switch · menu: label + picker · action: label + button · info: label + value */
		kind?: SettingsRowKind;
		children: import('svelte').Snippet;
	} = $props();

	const rowId = $derived(`${$page.url.pathname}-${settingsSearchSlug(title)}`);
	const labelId = $derived(`${rowId}-label`);
	const controlId = $derived(`${rowId}-control`);
	const descId = $derived(description ? `${rowId}-desc` : undefined);
	const linksControl = $derived(kind === 'toggle' || kind === 'menu');

	const visible = $derived(settingsSearch.matchesRow(title, description));

	const a11yIds = $state<SettingsA11yContext>({ labelId: '', controlId: '' });
	$effect(() => {
		a11yIds.labelId = labelId;
		a11yIds.controlId = linksControl ? controlId : undefined;
		a11yIds.descId = descId;
	});
	setContext(SETTINGS_A11Y, a11yIds);

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
		data-settings-row-kind={kind}
		class={cn('z-settings-row scroll-mt-20', `z-settings-row--${kind}`)}
		role="group"
		aria-labelledby={labelId}
		aria-describedby={descId}
	>
		{#if linksControl}
			<label for={controlId} id={labelId} class="z-settings-row-label">{title}</label>
		{:else}
			<span id={labelId} class="z-settings-row-label">{title}</span>
		{/if}
		{#if description}
			<p id={descId} class="z-settings-row-desc">{description}</p>
		{/if}
		<div class="z-settings-row-control">
			{@render children()}
		</div>
	</div>
{/if}
