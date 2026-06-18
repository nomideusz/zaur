<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import Field from '$lib/components/ui/Field.svelte';
	import {
		SETTINGS_A11Y,
		type SettingsA11yContext
	} from '$lib/components/settings/settings-control-context';
	import { settingsSearch, settingsSearchSlug } from '$lib/settings/search-registry.svelte';

	let {
		title,
		description,
		children: control
	}: {
		title: string;
		description?: string;
		children: import('svelte').Snippet<[{ id: string }]>;
	} = $props();

	const rowId = $derived(`${$page.url.pathname}-${settingsSearchSlug(title)}`);
	const labelId = $derived(`${rowId}-label`);
	const controlId = $derived(`${rowId}-control`);
	const descId = $derived(description ? `${rowId}-desc` : undefined);

	const visible = $derived(settingsSearch.matchesRow(title, description));

	const a11yIds = $state<SettingsA11yContext>({ labelId: '', controlId: '' });
	$effect(() => {
		a11yIds.labelId = labelId;
		a11yIds.descId = descId;
		a11yIds.controlId = controlId;
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
	<Field
		id={rowId}
		ids={{ root: rowId, label: labelId, helperText: descId, control: controlId }}
		data-settings-row
		class="z-settings-field scroll-mt-20"
		bodyClass="z-settings-field-body"
		label={title}
		labelClass="z-settings-field-label"
		{description}
		descriptionClass="z-settings-field-desc"
	>
		{#snippet children({ controlId: fieldControlId })}
			{@render control({ id: fieldControlId })}
		{/snippet}
	</Field>
{/if}
