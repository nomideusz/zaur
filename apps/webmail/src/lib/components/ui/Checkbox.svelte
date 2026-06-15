<script lang="ts">
	import { Checkbox } from '@ark-ui/svelte/checkbox';
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

<!--
	Ark renders Root(label) > Control(box) + focusable HiddenInput. The check/dash
	is drawn by CSS ::after on `.z-checkbox` keyed off [data-state], so no Indicator
	is needed. Row mode keeps `.z-checkbox-row` on Root (the flex layout); standalone
	mode uses `.z-checkbox-root` (display:contents) so Control stays the layout box.
	Ark accepts CheckedState directly, so the boolean/indeterminate split is gone.
-->
<Checkbox.Root
	{checked}
	{disabled}
	{onclick}
	class={children ? cn('z-checkbox-row', className) : 'z-checkbox-root'}
	onCheckedChange={(details) => {
		// When onchange is provided the parent owns checked state — avoid double toggles.
		if (onchange) onchange(details.checked);
		else checked = details.checked;
	}}
>
	<Checkbox.Control class={children ? 'z-checkbox' : cn('z-checkbox', className)} />
	{#if children}
		{@render children()}
	{/if}
	<Checkbox.HiddenInput aria-label={label} />
</Checkbox.Root>
