<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		'aria-label'?: string;
		class?: string;
		disabled?: boolean;
		/** Extra click handling (e.g. stopPropagation inside a clickable row). */
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let {
		'aria-label': ariaLabel,
		class: className,
		disabled = false,
		onclick,
		children
	}: Props = $props();
</script>

<!-- Ark sets aria-controls/haspopup/expanded on the trigger automatically. -->
<Menu.Trigger
	aria-label={ariaLabel}
	class={cn('z-menu-trigger', className)}
	{disabled}
	{onclick}
	data-slot="menu-trigger"
>
	{@render children()}
</Menu.Trigger>
