<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		count: number;
		class?: string;
	}

	let { count, class: className }: Props = $props();
</script>

{#if count > 0}
	<span
		class={cn(
			'inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-medium leading-none text-accent-fg',
			className
		)}
	>
		{count > 99 ? '99+' : count}
	</span>
{/if}
