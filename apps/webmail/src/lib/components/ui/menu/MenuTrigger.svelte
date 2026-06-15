<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		'aria-label'?: string;
		class?: string;
		disabled?: boolean;
		children: Snippet;
	}

	let {
		'aria-label': ariaLabel,
		class: className,
		disabled = false,
		children
	}: Props = $props();
</script>

<!-- Ark sets aria-controls/haspopup/expanded on the trigger automatically. -->
<Menu.Trigger
	aria-label={ariaLabel}
	class={cn('z-menu-trigger', className)}
	{disabled}
	data-slot="menu-trigger"
>
	{@render children()}
</Menu.Trigger>
