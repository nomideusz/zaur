<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		label: string;
		onclick: () => void;
		icon?: Snippet;
		danger?: boolean;
		disabled?: boolean;
	}

	let { label, onclick, icon, danger = false, disabled = false }: Props = $props();

	const uid = $props.id();
</script>

<!-- Ark fires onSelect for pointer + keyboard and auto-closes the menu. -->
<Menu.Item
	value={uid}
	valueText={label}
	{disabled}
	onSelect={() => onclick()}
	class={cn('z-overflow-menu-item', danger && 'z-overflow-menu-item--danger')}
>
	{#if icon}
		<span class="flex size-5 shrink-0 items-center justify-center">
			{@render icon()}
		</span>
	{/if}
	<span class="truncate">{label}</span>
</Menu.Item>
