<script lang="ts">
	import { Checkbox } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type CheckedState = boolean | 'indeterminate';

	interface Props {
		checked: CheckedState;
		disabled?: boolean;
		label: string;
		class?: string;
		onchange?: (checked: CheckedState) => void;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		checked = $bindable(false),
		disabled = false,
		label,
		class: className = '',
		onchange,
		onclick,
		children
	}: Props = $props();
</script>

<Checkbox.Root
	checked={checked === true}
	indeterminate={checked === 'indeterminate'}
	{disabled}
	aria-label={label}
	class={children ? className : cn('z-checkbox', className)}
	onCheckedChange={(next) => {
		checked = next;
		onchange?.(next);
	}}
	{onclick}
>
	{#if children}
		<span class="z-checkbox" aria-hidden="true"></span>
		{@render children()}
	{/if}
</Checkbox.Root>
