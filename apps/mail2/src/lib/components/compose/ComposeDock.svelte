<script lang="ts">
	import { compose } from '#lib/compose/store.svelte.ts';

	const minimized = $derived(compose.drafts.filter((draft) => draft.stage === 'minimized'));

	let dockEl = $state<HTMLElement | null>(null);
	let drag: { pointerId: number; id: string } | null = null;

	function chipStatus(draft: { to: unknown[]; body: string }): boolean {
		return draft.to.length > 0 || draft.body.trim().length > 0;
	}

	function chipMeta(draft: { to: { name: string; email: string }[] }): string {
		if (draft.to.length === 0) return 'No recipients yet';
		return draft.to.map((person) => person.name || person.email).join(', ');
	}

	function startDrag(event: PointerEvent, id: string) {
		if (event.button !== 0) return;
		drag = { pointerId: event.pointerId, id };
		compose.trayDragId = id;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function moveDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const chips = Array.from(
			dockEl?.querySelectorAll<HTMLElement>('[data-dock-chip]') ?? []
		);
		const rects = chips
			.map((el) => ({ id: el.dataset.dockChip ?? '', rect: el.getBoundingClientRect() }))
			.filter((chip) => chip.id);
		const dragged = rects.find((chip) => chip.id === drag!.id);
		if (!dragged) return;
		// Reading order over the wrapped rows: bucket rows by top, then by left.
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
	<div
		bind:this={dockEl}
		class="absolute right-5 bottom-3.5 z-[68] flex max-w-[calc(100%-360px)] flex-wrap-reverse justify-end gap-2"
	>
		{#each minimized as draft (draft.id)}
			<div
				data-dock-chip={draft.id}
				role="button"
				tabindex="0"
				aria-label="Minimized draft: {chipTitle(draft)}. Activate to reopen."
				class="flex h-11 w-[204px] cursor-grab items-center gap-2 rounded-pop border border-border bg-container pr-1.5 pl-[11px] shadow-chip select-none transition-[transform,box-shadow] duration-[150ms] {compose.trayDragId ===
				draft.id
					? 'translate-y-[-3px] shadow-chip-lift transition-none'
					: ''}"
				onpointerdown={(event) => startDrag(event, draft.id)}
				onpointermove={moveDrag}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				ondblclick={() => compose.restore(draft.id)}
				onkeydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						compose.restore(draft.id);
					}
				}}
			>
				<span
					class="size-1.5 shrink-0 rounded-pill {chipStatus(draft) ? 'bg-accent' : 'bg-border-strong'}"
					aria-hidden="true"
				></span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-xs font-semibold">{chipTitle(draft)}</span>
					<span class="block truncate text-[11px] text-ink-tertiary">{chipMeta(draft)}</span>
				</span>
				<button
					type="button"
					class="flex size-[26px] shrink-0 items-center justify-center rounded-menu-item text-ink-muted transition-colors duration-[160ms] hover:bg-hairline"
					aria-label="Reopen draft"
					onpointerdown={(event) => event.stopPropagation()}
					onclick={() => compose.restore(draft.id)}
				>
					<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
				<button
					type="button"
					class="flex size-[26px] shrink-0 items-center justify-center rounded-menu-item text-ink-muted transition-colors duration-[160ms] hover:bg-hairline"
					aria-label="Close draft"
					onpointerdown={(event) => event.stopPropagation()}
					onclick={() => compose.close(draft.id)}
				>
					<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}
