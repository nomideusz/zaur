<script lang="ts">
	import MenuItem from '$lib/components/ui/menu/MenuItem.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		onclick: () => void;
		icon?: Snippet;
		danger?: boolean;
		disabled?: boolean;
	}

	let { label, onclick, icon, danger = false, disabled = false }: Props = $props();
</script>

<!-- Thin wrapper over the shared MenuItem (which owns the Ark Menu.Item markup). -->
<MenuItem
	{label}
	variant={danger ? 'destructive' : 'default'}
	{disabled}
	onSelect={onclick}
>
	{#if icon}
		<span class="flex size-5 shrink-0 items-center justify-center">
			{@render icon()}
		</span>
	{/if}
	<span class="truncate">{label}</span>
</MenuItem>
