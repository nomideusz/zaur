<script lang="ts">
	import { Fieldset } from '@ark-ui/svelte/fieldset';
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
		description?: string;
		visibleOn?: 'all' | 'desktop' | 'mobile';
		children: import('svelte').Snippet;
	} = $props();

	let sectionRef = $state<HTMLFieldSetElement | null>(null);
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

<Fieldset.Root
	bind:ref={sectionRef}
	class={cn(
		'z-settings-section z-settings-form-section',
		visibleOn === 'desktop' && 'z-settings-section--desktop',
		visibleOn === 'mobile' && 'z-settings-section--mobile',
		!hasRows && 'hidden'
	)}
>
	{#if hasRows}
		<div class="z-settings-section-heading">
			<Fieldset.Legend class="z-settings-section-title">{title}</Fieldset.Legend>
			{#if description}
				<Fieldset.HelperText class="z-settings-form-heading-desc">{description}</Fieldset.HelperText>
			{/if}
		</div>
	{/if}
	<div class="z-settings-list">
		<div class="z-settings-form-intro" aria-hidden="true">
			<p class="z-settings-form-intro-title">{title}</p>
			{#if description}
				<p class="z-settings-form-intro-desc">{description}</p>
			{/if}
		</div>
		<div class="z-settings-form-fields">
			{@render children()}
		</div>
	</div>
</Fieldset.Root>
