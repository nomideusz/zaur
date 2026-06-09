<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { MENU_CTX, type MenuContext } from '$lib/components/ui/menu/menu-context';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	}

	let { open = $bindable(false), onOpenChange, children }: Props = $props();

	function close() {
		open = false;
	}

	setContext<MenuContext>(MENU_CTX, { close });
</script>

<DropdownMenu.Root bind:open {onOpenChange}>
	{@render children()}
</DropdownMenu.Root>
