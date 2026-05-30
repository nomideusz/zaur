<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		count: number;
		variant?: 'accent' | 'muted';
		class?: string;
	}

	let { count, variant = 'accent', class: className }: Props = $props();

	const compact = $derived(settings.compactFolderBadges);
</script>

{#if count > 0}
	<span
		class={cn(
			variant === 'accent' &&
				'inline-flex items-center justify-center rounded-full bg-accent font-medium leading-none text-accent-fg',
			variant === 'accent' &&
				(compact ? 'min-w-4 px-1 py-px text-[10px]' : 'min-w-5 px-1.5 py-0.5 text-[11px]'),
			variant === 'muted' &&
				'shrink-0 tabular-nums leading-none text-fg-subtle',
			variant === 'muted' && (compact ? 'text-[10px]' : 'text-xs'),
			className
		)}
	>
		{count > 99 ? '99+' : count}
	</span>
{/if}
