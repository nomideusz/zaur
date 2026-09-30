<script lang="ts">
	interface Props {
		width: number;
		min?: number;
		max?: number;
		onResize: (width: number) => void;
		onReset: () => void;
	}

	let { width, min = 380, max = 760, onResize, onReset }: Props = $props();

	/** Where the gesture began: the pointer, and the width the list had on screen. */
	let drag = $state<{ x: number; width: number } | null>(null);
	const dragging = $derived(drag !== null);

	/**
	 * Half of what the list and the reader share: the shell's grid never shows
	 * the list wider (base.css, `.z-shell`), so neither a drag nor a key may ask
	 * for more — the handle would stop following and the stored width mean nothing.
	 */
	function limit(handle: EventTarget | null): number {
		const list = (handle as HTMLElement).previousElementSibling?.getBoundingClientRect();
		const reader = (handle as HTMLElement).nextElementSibling?.getBoundingClientRect();
		return list && reader ? Math.min(max, Math.floor((reader.right - list.left) / 2)) : max;
	}

	/** From the width on screen: a stored one the window has no room for is shown narrower. */
	function resize(handle: EventTarget | null, from: number, by: number) {
		const most = limit(handle);
		onResize(Math.max(min, Math.min(most, Math.min(from, most) + by)));
	}

	function handlePointerDown(event: PointerEvent) {
		event.preventDefault();
		drag = { x: event.clientX, width: Math.min(width, limit(event.currentTarget)) };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!drag) return;
		// From where it began, not step by step: past a limit the handle waits for the pointer to come back to it.
		resize(event.currentTarget, drag.width, event.clientX - drag.x);
	}

	function handlePointerUp(event: PointerEvent) {
		if (!drag) return;
		drag = null;
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			resize(event.currentTarget, width, -24);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			resize(event.currentTarget, width, 24);
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="separator"
	aria-orientation="vertical"
	aria-label="Resize message list"
	aria-valuenow={Math.round(width)}
	aria-valuemin={min}
	aria-valuemax={max}
	tabindex="0"
	class="group relative w-px shrink-0 cursor-col-resize touch-none bg-line transition-colors duration-[120ms] max-md:hidden hover:bg-accent-line focus:outline-none focus-visible:bg-accent focus-visible:shadow-[0_0_0_1px_var(--z-accent)] {dragging
		? 'bg-accent-line'
		: ''}"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
	ondblclick={onReset}
	onkeydown={handleKeydown}
>
	<!-- 6px invisible grab strip centered on the 1px rule -->
	<div class="absolute inset-y-0 -left-px -right-2 z-5"></div>
</div>
