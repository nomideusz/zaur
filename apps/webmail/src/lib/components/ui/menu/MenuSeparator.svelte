<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<Menu.Separator
	class={cn('z-menu-separator -mx-1 my-1 h-px bg-border', className)}
	data-slot="menu-separator"
/>
