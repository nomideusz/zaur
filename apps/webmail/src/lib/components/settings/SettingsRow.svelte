<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { Field } from '@ark-ui/svelte/field';
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
		searchable = true,
		children
	}: {
		title: string;
		description?: string;
		/** toggle: label + switch · menu: label + picker · action: label + button · info: label + value */
		kind?: SettingsRowKind;
		/** Off for dynamic list rows (e.g. one per account) — they aren't searchable settings. */
		searchable?: boolean;
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
		if (!searchable) return;
		// Capture the id at registration — rowId is reactive and can change before
		// the cleanup runs (e.g. pathname updates mid-navigation), which would leak
		// the entry under its old id.
		const id = rowId;
		const href = get(page).url.pathname;
		settingsSearch.register({ id, title, description: description ?? '', href });
		return () => settingsSearch.unregister(id);
	});

	$effect(() => {
		if ($page.url.hash !== `#${rowId}`) return;
		requestAnimationFrame(() => settingsSearch.scrollTo(rowId));
	});
</script>

{#if visible}
	<Field.Root
		id={rowId}
		ids={{
			root: rowId,
			label: labelId,
			helperText: descId,
			control: linksControl ? controlId : undefined
		}}
		data-settings-row
		data-settings-row-kind={kind}
		class={cn('z-settings-row scroll-mt-20', `z-settings-row--${kind}`)}
	>
		{#if linksControl}
			<Field.Label id={labelId} class="z-settings-row-label">{title}</Field.Label>
		{:else}
			<span id={labelId} class="z-settings-row-label">{title}</span>
		{/if}
		{#if description}
			<Field.HelperText id={descId} class="z-settings-row-desc">{description}</Field.HelperText>
		{/if}
		<div class="z-settings-row-control">
			{@render children()}
		</div>
	</Field.Root>
{/if}
