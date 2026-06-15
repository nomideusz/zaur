<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	type MenuItemVariant = 'default' | 'destructive';

	interface Props {
		label?: string;
		/** Defaults to a generated id; Ark needs a unique value per item. */
		value?: string;
		variant?: MenuItemVariant;
		disabled?: boolean;
		closeOnClick?: boolean;
		onSelect?: () => void;
		children?: Snippet;
	}

	let {
		label,
		value,
		variant = 'default',
		disabled = false,
		closeOnClick = true,
		onSelect,
		children
	}: Props = $props();

	const uid = $props.id();
</script>

<!-- Ark fires onSelect for both pointer and keyboard, and closes the menu itself
     (closeOnSelect) — so no MENU_CTX close plumbing is needed. valueText drives typeahead. -->
<Menu.Item
	value={value ?? uid}
	valueText={label}
	{disabled}
	closeOnSelect={closeOnClick}
	onSelect={() => onSelect?.()}
	class={cn(
		'z-menu-item z-overflow-menu-item',
		variant === 'destructive' && 'z-menu-item--destructive z-overflow-menu-item--danger'
	)}
	data-slot="menu-item"
	data-variant={variant}
>
	{#if children}
		{@render children()}
	{:else}
		<span class="truncate">{label}</span>
	{/if}
</Menu.Item>
