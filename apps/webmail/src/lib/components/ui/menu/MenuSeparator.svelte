<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<DropdownMenu.Separator
	class={cn('z-menu-separator -mx-1 my-1 h-px bg-border', className)}
	data-slot="menu-separator"
/>
