<script lang="ts">
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import { cn } from '$lib/utils/cn';
	import { letterIndexAtY } from './letter-rail-hit';

	let {
		letters,
		selectedLetter,
		onSelectLetter
	}: {
		letters: string[];
		selectedLetter: string | null;
		onSelectLetter: (letter: string | null) => void;
	} = $props();

	/* The buttons are 28px on phones — under the 44px guideline, and 27 of them
	   can't grow and still fit. iOS answers the same constraint by making the
	   rail scrubbable rather than tappable, so a finger can drag through the
	   letters. Tapping still works and keeps the toggle behaviour. */
	let railEl = $state<HTMLDivElement | null>(null);
	let scrubbing = false;
	let dragged = false;

	function letterAt(clientY: number): string | null {
		if (!railEl) return null;
		const buttons = [...railEl.querySelectorAll<HTMLElement>('[data-letter]')];
		const index = letterIndexAtY(
			buttons.map((el) => el.getBoundingClientRect()),
			clientY
		);
		return index < 0 ? null : (buttons[index].dataset.letter ?? null);
	}

	function onPointerDown(event: PointerEvent) {
		// Mouse keeps plain click semantics; scrubbing is for fingers and pens.
		if (event.pointerType === 'mouse') return;
		scrubbing = true;
		dragged = false;
		railEl?.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!scrubbing) return;
		event.preventDefault();
		dragged = true;
		const letter = letterAt(event.clientY);
		// Always set while scrubbing — toggling off mid-drag would flicker the
		// list every time the finger crossed the active letter.
		if (letter && letter !== selectedLetter) onSelectLetter(letter);
	}

	function endScrub(event: PointerEvent) {
		if (!scrubbing) return;
		scrubbing = false;
		if (railEl?.hasPointerCapture(event.pointerId)) railEl.releasePointerCapture(event.pointerId);
	}

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
		<!-- touch-none: a vertical scrub must not scroll the list underneath. -->
		<div
			bind:this={railEl}
			role="group"
			class="pointer-events-auto flex max-h-full touch-none flex-col items-center gap-0.5 overflow-y-auto rounded-xl border border-border/80 bg-surface-raised/90 px-0.5 py-1 shadow-sm backdrop-blur-sm"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={endScrub}
			onpointercancel={endScrub}
		>
			{#each letters as letter (letter)}
				<TooltipWrap label={`Jump to ${letter}`} side="left">
					{#snippet trigger({ props })}
						<button
							{...props}
							type="button"
							data-letter={letter}
							class={letterButtonClass(selectedLetter === letter)}
							aria-current={selectedLetter === letter ? 'true' : undefined}
							aria-label={`Jump to ${letter}`}
							onclick={() => {
								// A scrub ends with a click on whichever button the finger
								// lifted over; that must not toggle the letter back off.
								if (dragged) {
									dragged = false;
									return;
								}
								onSelectLetter(selectedLetter === letter ? null : letter);
							}}
						>
							{letter}
						</button>
					{/snippet}
				</TooltipWrap>
			{/each}
		</div>
	</nav>
{/if}
