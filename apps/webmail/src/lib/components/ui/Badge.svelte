<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		count: number;
		class?: string;
	}

	let { count, class: className }: Props = $props();
</script>

{#if count > 0}
	<span
		class={cn(
			'inline-flex items-center justify-center rounded-full bg-accent font-medium leading-none text-accent-fg',
			settings.compactFolderBadges ? 'min-w-4 px-1 py-px text-[10px]' : 'min-w-5 px-1.5 py-0.5 text-[11px]',
			className
		)}
	>
		{count > 99 ? '99+' : count}
	</span>
{/if}
