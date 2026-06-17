<script lang="ts">
	import { Field as ArkField } from '@ark-ui/svelte/field';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	export type FieldIds = {
		root?: string;
		label?: string;
		helperText?: string;
		control?: string;
	};

	interface Props {
		id: string;
		ids: FieldIds;
		class?: string;
		bodyClass?: string;
		label: string;
		labelClass?: string;
		description?: string;
		descriptionClass?: string;
		children: Snippet<[{ controlId: string }]>;
		[key: string]: unknown;
	}

	let {
		id,
		ids,
		class: className,
		bodyClass,
		label,
		labelClass,
		description,
		descriptionClass,
		children,
		...rest
	}: Props = $props();

	const controlId = $derived(ids.control ?? `${id}-control`);
</script>

<!--
	Ark Field wires label ↔ control ids and root aria-labelledby / aria-describedby.
	Settings pages pass stable ids so search deep-links and Switch hiddenInput stay in sync.
-->
<ArkField.Root {id} {ids} class={cn('z-field', className)} {...rest}>
	<ArkField.Label class={cn('z-field__label', labelClass)}>{label}</ArkField.Label>
	{#if description}
		<ArkField.HelperText class={cn('z-field__desc', descriptionClass)}>{description}</ArkField.HelperText>
	{/if}
	<div class={cn('z-field__body', bodyClass)}>
		{@render children({ controlId })}
	</div>
</ArkField.Root>
