<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import {
		SETTINGS_A11Y,
		type SettingsA11yContext
	} from '$lib/components/settings/settings-control-context';
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
	const labelId = $derived(`${rowId}-label`);
	const controlId = $derived(`${rowId}-control`);
	const descId = $derived(description ? `${rowId}-desc` : undefined);

	const visible = $derived(settingsSearch.matchesRow(title, description));

	const a11yIds = $state<SettingsA11yContext>({ labelId: '', controlId: '' });
	$effect(() => {
		a11yIds.labelId = labelId;
		a11yIds.controlId = controlId;
		a11yIds.descId = descId;
	});
	setContext(SETTINGS_A11Y, a11yIds);

	onMount(() => {
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
	<div
		id={rowId}
		data-settings-row
		data-settings-row-kind="toggle"
		class="z-settings-form-toggle scroll-mt-20"
		role="group"
		aria-labelledby={labelId}
		aria-describedby={descId}
	>
		<div class="z-settings-form-toggle-control">
			{@render children()}
		</div>
		<div class="z-settings-form-toggle-copy">
			<label for={controlId} id={labelId} class="z-settings-form-toggle-label">{title}</label>
			{#if description}
				<p id={descId} class="z-settings-form-toggle-desc">{description}</p>
			{/if}
		</div>
	</div>
{/if}
