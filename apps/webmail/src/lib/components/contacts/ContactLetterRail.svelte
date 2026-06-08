<script lang="ts">
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		letters,
		selectedLetter,
		onSelectLetter,
		variant = 'vertical'
	}: {
		letters: string[];
		selectedLetter: string | null;
		onSelectLetter: (letter: string | null) => void;
		variant?: 'vertical' | 'horizontal';
	} = $props();

	const letterButtonClass = (active: boolean) =>
		cn(
			'rounded-lg font-semibold transition-all',
			variant === 'horizontal' ? 'min-h-10 min-w-10 shrink-0 px-3 text-sm' : 'size-9 text-sm',
			active
				? 'bg-accent text-accent-fg shadow-sm'
				: 'text-fg-muted hover:bg-surface-sunken/80 hover:text-fg active:bg-surface-sunken'
		);
</script>

{#if letters.length}
	{#if variant === 'horizontal'}
		<nav
			class="w-full shrink-0 overflow-x-auto pb-1 md:hidden"
			aria-label="Browse contacts by letter"
		>
			<div class="flex min-w-max items-center gap-1.5">
				<button
					type="button"
					class={letterButtonClass(selectedLetter === null)}
					onclick={() => onSelectLetter(null)}
				>
					All
				</button>
				{#each letters as letter (letter)}
					<button
						type="button"
						class={letterButtonClass(selectedLetter === letter)}
						aria-current={selectedLetter === letter ? 'true' : undefined}
						onclick={() => onSelectLetter(letter)}
					>
						{letter}
					</button>
				{/each}
			</div>
		</nav>
	{:else}
		<nav
			class="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-11 md:flex md:flex-col md:items-center md:justify-center md:py-3"
			aria-label="Browse contacts by letter"
		>
			<div
				class="pointer-events-auto z-pane-scroll flex max-h-full flex-col items-center gap-0.5 overflow-y-auto rounded-xl border border-border/80 bg-surface-raised/90 px-0.5 py-1 shadow-sm backdrop-blur-sm"
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
{/if}
