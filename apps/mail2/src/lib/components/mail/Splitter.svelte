<script lang="ts">
	interface Props {
		width: number;
		min?: number;
		max?: number;
		onResize: (width: number) => void;
		onReset: () => void;
	}

	let { width, min = 380, max = 760, onResize, onReset }: Props = $props();

	let dragging = $state(false);

	function clamp(value: number): number {
		return Math.min(max, Math.max(min, value));
	}

	function handlePointerDown(event: PointerEvent) {
		event.preventDefault();
		dragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging) return;
		// Track the cursor 1:1 — no transitions while gesturing.
		onResize(clamp(width + event.movementX));
	}

	function handlePointerUp(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			onResize(clamp(width - 24));
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			onResize(clamp(width + 24));
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
	class="group relative w-px shrink-0 cursor-col-resize bg-line transition-colors duration-[120ms] hover:bg-accent-tint focus:bg-accent-tint focus:outline-none {dragging
		? 'bg-accent-tint'
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
