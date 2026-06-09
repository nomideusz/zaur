<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<div
	role="separator"
	aria-orientation="vertical"
	class={cn('z-action-bar-separator mx-1 h-1/2 w-px shrink-0 self-center bg-border', className)}
	data-slot="action-bar-separator"
	data-orientation="vertical"
></div>
