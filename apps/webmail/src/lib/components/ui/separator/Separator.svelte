<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		orientation?: 'horizontal' | 'vertical';
		class?: string;
	}

	let { orientation = 'horizontal', class: className }: Props = $props();
</script>

<div
	role="separator"
	aria-orientation={orientation}
	data-orientation={orientation}
	data-slot="separator"
	class={cn(
		'z-separator shrink-0 bg-border',
		orientation === 'horizontal' && 'h-px w-full',
		orientation === 'vertical' && 'w-px self-stretch',
		className
	)}
></div>
