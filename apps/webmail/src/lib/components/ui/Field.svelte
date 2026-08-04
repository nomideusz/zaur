<script lang="ts">
	import { Field as ArkField } from '@ark-ui/svelte/field';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	export type FieldIds = {
		root?: string;
		label?: string;
		helperText?: string;
		errorText?: string;
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
		/** Marks the field invalid and wires aria-invalid / describedby to ErrorText. */
		invalid?: boolean;
		/** Shown via Ark Field.ErrorText when `invalid` is true. */
		error?: string;
		errorClass?: string;
		children: Snippet<[{ controlId: string; errorId?: string }]>;
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
		invalid = false,
		error,
		errorClass,
		children,
		...rest
	}: Props = $props();

	const controlId = $derived(ids.control ?? `${id}-control`);
	const showError = $derived(invalid && !!error?.trim());
	const errorId = $derived(
		showError ? (ids.errorText ?? `${id}-error`) : undefined
	);
	const fieldIds = $derived({
		...ids,
		errorText: errorId
	});
</script>

<!--
	Ark Field wires label ↔ control ids and root aria-labelledby / aria-describedby.
	Settings pages pass stable ids so search deep-links and Switch hiddenInput stay in sync.
	When `invalid` + `error` are set, ErrorText is included in the describedby chain.
-->
<ArkField.Root {id} ids={fieldIds} {invalid} class={cn('z-field', className)} {...rest}>
	<ArkField.Label class={cn('z-field__label', labelClass)}>{label}</ArkField.Label>
	{#if description}
		<ArkField.HelperText class={cn('z-field__desc', descriptionClass)}>{description}</ArkField.HelperText>
	{/if}
	<div class={cn('z-field__body', bodyClass)}>
		{@render children({ controlId, errorId })}
	</div>
	{#if showError}
		<ArkField.ErrorText class={cn('z-field__error', errorClass)}>{error}</ArkField.ErrorText>
	{/if}
</ArkField.Root>
