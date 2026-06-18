<script lang="ts">
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		letters,
		selectedLetter,
		onSelectLetter
	}: {
		letters: string[];
		selectedLetter: string | null;
		onSelectLetter: (letter: string | null) => void;
	} = $props();

	const letterButtonClass = (active: boolean) =>
		cn(
			'flex shrink-0 items-center justify-center rounded-md font-semibold transition-all',
			// Compact on mobile so the A–Z index hugs the edge; larger touch target on desktop.
			'size-7 text-[0.6875rem] md:size-9 md:text-sm',
			active
				? 'bg-accent text-accent-fg shadow-sm'
				: 'text-fg-muted hover:bg-surface-sunken/80 hover:text-fg active:bg-surface-sunken'
		);
</script>

{#if letters.length}
	<nav
		class="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-9 flex-col items-center justify-center py-2 md:w-11 md:py-3"
		aria-label="Browse contacts by letter"
	>
		<div
			class="pointer-events-auto flex max-h-full flex-col items-center gap-0.5 overflow-y-auto rounded-xl border border-border/80 bg-surface-raised/90 px-0.5 py-1 shadow-sm backdrop-blur-sm"
		>
			{#each letters as letter (letter)}
				<TooltipWrap label={`Jump to ${letter}`} side="left">
					{#snippet trigger({ props })}
						<button
							{...props}
							type="button"
							class={letterButtonClass(selectedLetter === letter)}
							aria-current={selectedLetter === letter ? 'true' : undefined}
							aria-label={`Jump to ${letter}`}
							onclick={() => onSelectLetter(selectedLetter === letter ? null : letter)}
						>
							{letter}
						</button>
					{/snippet}
				</TooltipWrap>
			{/each}
		</div>
	</nav>
{/if}
