<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		'data-slot'?: string;
		children: Snippet;
	}

	let { class: className, 'data-slot': dataSlot, children }: Props = $props();
</script>

<!--
	The one portalled menu surface: Portal > Positioner > Content. Every menu in
	the app composes this (directly or via MenuContent) so the overflow-menu
	chrome and the pointerdown guard live in exactly one place.
-->
<Portal>
	<Menu.Positioner>
		<Menu.Content
			class={cn('z-overflow-menu z-overflow-menu--fixed', className)}
			data-slot={dataSlot}
			onpointerdown={(event) => event.stopPropagation()}
		>
			{@render children()}
		</Menu.Content>
	</Menu.Positioner>
</Portal>
