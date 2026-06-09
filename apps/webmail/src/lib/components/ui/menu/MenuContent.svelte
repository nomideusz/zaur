<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		id?: string;
		side?: 'top' | 'bottom' | 'left' | 'right';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
		class?: string;
		children: Snippet;
	}

	let {
		id,
		side = 'bottom',
		align = 'end',
		sideOffset = 8,
		class: className,
		children
	}: Props = $props();
</script>

<DropdownMenu.Portal>
	<DropdownMenu.Content
		{id}
		{side}
		{align}
		{sideOffset}
		collisionPadding={12}
		sticky="always"
		updatePositionStrategy="always"
		class={cn(
			'z-menu-content z-overflow-menu z-overflow-menu--fixed w-72 min-w-64 max-w-[calc(100vw-1rem)] py-1',
			className
		)}
		data-slot="menu-content"
		onpointerdown={(event) => event.stopPropagation()}
	>
		{@render children()}
	</DropdownMenu.Content>
</DropdownMenu.Portal>
