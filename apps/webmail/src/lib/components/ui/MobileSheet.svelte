<script lang="ts">
	import FocusTrap from '$lib/components/ui/FocusTrap.svelte';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		/** Accessible name for the sheet (used as aria-label on the trapped panel). */
		ariaLabel: string;
		children: Snippet;
	}

	let { class: className, ariaLabel, children }: Props = $props();
</script>

<div class="z-mobile-sheet-backdrop md:hidden" role="presentation">
	<FocusTrap
		class={cn(
			'm-2 flex h-[calc(100%-1rem)] w-[calc(100%-1rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-md outline-none',
			className
		)}
		role="dialog"
		aria-modal="true"
		aria-label={ariaLabel}
		tabindex={-1}
	>
		{@render children()}
	</FocusTrap>
</div>
