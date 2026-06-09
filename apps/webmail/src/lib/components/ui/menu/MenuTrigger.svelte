<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		'aria-label'?: string;
		'aria-controls'?: string;
		class?: string;
		disabled?: boolean;
		children: Snippet;
	}

	let {
		'aria-label': ariaLabel,
		'aria-controls': ariaControls,
		class: className,
		disabled = false,
		children
	}: Props = $props();
</script>

<DropdownMenu.Trigger
	aria-label={ariaLabel}
	aria-controls={ariaControls}
	class={cn('z-menu-trigger', className)}
	{disabled}
	data-slot="menu-trigger"
>
	{@render children()}
</DropdownMenu.Trigger>
