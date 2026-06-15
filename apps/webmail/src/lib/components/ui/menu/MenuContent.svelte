<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<Portal>
	<Menu.Positioner>
		<Menu.Content
			class={cn(
				'z-menu-content z-overflow-menu z-overflow-menu--fixed w-72 min-w-64 max-w-[calc(100vw-1rem)] py-1',
				className
			)}
			data-slot="menu-content"
			onpointerdown={(event) => event.stopPropagation()}
		>
			{@render children()}
		</Menu.Content>
	</Menu.Positioner>
</Portal>
