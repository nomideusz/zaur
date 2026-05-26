<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { OVERFLOW_MENU_CTX, type OverflowMenuContext } from '$lib/components/ui/overflow-menu-context';
	import { cn } from '$lib/utils/cn';

	interface Props {
		label: string;
		onclick: () => void;
		icon?: Snippet;
		danger?: boolean;
		disabled?: boolean;
	}

	let { label, onclick, icon, danger = false, disabled = false }: Props = $props();

	const menu = getContext<OverflowMenuContext>(OVERFLOW_MENU_CTX);

	function select() {
		if (disabled) return;
		onclick();
		menu?.close();
	}
</script>

<button
	type="button"
	role="menuitem"
	class={cn('z-overflow-menu-item', danger && 'z-overflow-menu-item--danger')}
	{disabled}
	onclick={select}
>
	{#if icon}
		<span class="flex size-5 shrink-0 items-center justify-center">
			{@render icon()}
		</span>
	{/if}
	<span class="truncate">{label}</span>
</button>
