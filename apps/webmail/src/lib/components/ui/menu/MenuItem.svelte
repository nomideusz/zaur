<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { MENU_CTX, type MenuContext } from '$lib/components/ui/menu/menu-context';
	import { cn } from '$lib/utils/cn';
	import { getContext, type Snippet } from 'svelte';

	type MenuItemVariant = 'default' | 'destructive';

	interface Props {
		label?: string;
		variant?: MenuItemVariant;
		disabled?: boolean;
		closeOnClick?: boolean;
		onSelect?: () => void;
		children?: Snippet;
	}

	let {
		label,
		variant = 'default',
		disabled = false,
		closeOnClick = true,
		onSelect,
		children
	}: Props = $props();

	const menu = getContext<MenuContext>(MENU_CTX);

	function handleSelect() {
		if (disabled) return;
		onSelect?.();
		if (closeOnClick) menu?.close();
	}
</script>

<DropdownMenu.Item
	class={cn(
		'z-menu-item z-overflow-menu-item',
		variant === 'destructive' && 'z-menu-item--destructive z-overflow-menu-item--danger'
	)}
	{disabled}
	textValue={label}
	data-slot="menu-item"
	data-variant={variant}
	onSelect={handleSelect}
>
	{#if children}
		{@render children()}
	{:else}
		<span class="truncate">{label}</span>
	{/if}
</DropdownMenu.Item>
