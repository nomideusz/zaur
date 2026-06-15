<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import type { Snippet } from 'svelte';

	type Side = 'top' | 'bottom' | 'left' | 'right';
	type Align = 'start' | 'center' | 'end';
	type Placement = Side | `${Side}-start` | `${Side}-end`;

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		/** Placement + collision config lives on the Ark root, not the content. */
		side?: Side;
		align?: Align;
		/** Stable content id — Ark wires it into the trigger's aria-controls. */
		menuId?: string;
		children: Snippet;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		side = 'bottom',
		align = 'end',
		menuId,
		children
	}: Props = $props();

	const placement = $derived<Placement>(align === 'center' ? side : `${side}-${align}`);
</script>

<Menu.Root
	{open}
	onOpenChange={(details) => {
		open = details.open;
		onOpenChange?.(details.open);
	}}
	positioning={{ placement, gutter: 8, overflowPadding: 12 }}
	ids={menuId ? { content: menuId } : undefined}
	lazyMount
	unmountOnExit
>
	{@render children()}
</Menu.Root>
