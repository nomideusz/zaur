<script lang="ts">
	import { compose } from '#lib/compose/store.svelte.ts';

	const minimized = $derived(compose.drafts.filter((draft) => draft.stage === 'minimized'));

	let dockEl = $state<HTMLElement | null>(null);
	let drag: { pointerId: number; id: string; x: number; y: number } | null = null;
	/** The press turned into a drag: the click that ends it must not reopen the draft. */
	let moved = false;

	function chipStatus(draft: { to: unknown[]; body: string }): boolean {
		return draft.to.length > 0 || draft.body.trim().length > 0;
	}

	function chipMeta(draft: { to: { name: string; email: string }[] }): string {
		if (draft.to.length === 0) return 'No recipients yet';
		return draft.to.map((person) => person.email || person.name).join(', ');
	}

	function startDrag(event: PointerEvent, id: string) {
		moved = false;
		if (event.button !== 0 || event.pointerType === 'touch') return;
		drag = { pointerId: event.pointerId, id, x: event.clientX, y: event.clientY };
		compose.trayDragId = id;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function moveDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		if (Math.abs(event.clientX - drag.x) > 4 || Math.abs(event.clientY - drag.y) > 4) moved = true;
		if (!moved) return;
		const chips = Array.from(
			dockEl?.querySelectorAll<HTMLElement>('[data-dock-chip]') ?? []
		);
		const rects = chips
			.map((el) => ({ id: el.dataset.dockChip ?? '', rect: el.getBoundingClientRect() }))
			.filter((chip) => chip.id);
		const dragged = rects.find((chip) => chip.id === drag!.id);
		if (!dragged) return;
		const rowOf = (top: number) => Math.round(top / 10);
		const pointerRow = rowOf(dragged.rect.top);
		let index = 0;
		for (const chip of rects) {
			if (chip.id === drag.id) continue;
			const row = rowOf(chip.rect.top);
			const before =
				row < pointerRow ||
				(row === pointerRow && chip.rect.left + chip.rect.width / 2 < event.clientX);
			if (before) index += 1;
		}
		compose.reorderMinimized(drag.id, index);
	}

	function endDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		drag = null;
		compose.trayDragId = null;
	}

	function chipTitle(draft: { subject: string }) {
		return draft.subject.trim() || 'New message';
	}
</script>

{#if minimized.length > 0}
	<!-- On a phone the dock is a row of the page, under the panes, not a float over
	     them: whatever pane is showing (list, drawer, reader) ends above it, so
	     its last row is never under a chip. -->
	<div
		bind:this={dockEl}
		class="absolute right-5 bottom-12 z-[68] flex max-w-[calc(100%-360px)] flex-wrap-reverse justify-end gap-2.5 max-md:static max-md:max-w-none max-md:shrink-0 max-md:flex-nowrap max-md:justify-start max-md:overflow-x-auto max-md:border-t max-md:border-[var(--z-line)] max-md:px-3 max-md:py-2"
	>
		{#each minimized as draft (draft.id)}
			<!-- A dock chip: 44px, the menu's shadow, a status dot ringed in the
			     correspondence fill when the draft has something in it. -->
			<div
				data-dock-chip={draft.id}
				role="button"
				tabindex="0"
				aria-label="Minimized draft: {chipTitle(draft)}. Activate to reopen."
				class="flex h-11 w-[220px] shrink-0 cursor-grab items-center gap-[9px] rounded-[10px] border border-[var(--z-line)] bg-[var(--z-surface)] pr-1.5 pl-[11px] shadow-[var(--z-shadow-menu)] select-none max-md:pr-0.5 transition-[transform,border-color,box-shadow] duration-[150ms] hover:border-[var(--z-faint)] max-md:w-auto max-md:min-w-[140px] max-md:flex-1 max-md:cursor-default {compose.trayDragId ===
				draft.id
					? '-translate-y-1 shadow-[var(--z-shadow-panel)]'
					: ''}"
				onpointerdown={(event) => startDrag(event, draft.id)}
				onpointermove={moveDrag}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				onclick={() => {
					// A click or a tap anywhere on the chip reopens it; a drag only reorders.
					if (!moved) compose.restore(draft.id);
				}}
				onkeydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						compose.restore(draft.id);
					}
				}}
			>
				<span
					class="size-2 shrink-0 rounded-full {chipStatus(draft) ? 'bg-[var(--z-accent)] shadow-[0_0_0_3px_var(--z-accent-soft)]' : 'bg-[var(--z-line)]'}"
					aria-hidden="true"
				></span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-[12px] font-bold text-[var(--z-body)]">{chipTitle(draft)}</span>
					<span class="z-mono block truncate text-[10px] text-[var(--z-soft)] max-md:text-[12px]">{chipMeta(draft)}</span>
				</span>
				<!-- On a phone the chip itself is the way back in, so the one icon left is a thumb-sized Close. -->
				<button
					type="button"
					class="z-icon-btn !size-6 max-md:hidden"
					aria-label="Reopen draft"
					onpointerdown={(event) => event.stopPropagation()}
					onclick={(event) => {
						event.stopPropagation();
						compose.restore(draft.id);
					}}
				>
					<svg class="size-[13px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
				<button
					type="button"
					class="z-icon-btn !size-6 hover:!bg-[var(--z-ch-discard-hover)] hover:!text-[var(--z-ch-discard-solid)] max-md:!size-10"
					aria-label="Close draft"
					onpointerdown={(event) => event.stopPropagation()}
					onclick={(event) => {
						event.stopPropagation();
						compose.close(draft.id);
					}}
				>
					<svg class="size-[11px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}
