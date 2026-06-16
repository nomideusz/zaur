<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { onDestroy } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import { haptic } from '$lib/utils/haptics';
	import { animateSpringScalar } from '$lib/utils/swipe-row-spring';
	import { clampSwipeOffset, swipeCommitThreshold, type SwipeSide } from '$lib/utils/swipe-row';

	export interface SwipeAction {
		id: string;
		label: string;
		variant?: 'default' | 'accent' | 'danger' | 'warning';
		icon?: Component<{ class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
		/** Row slides off-screen on commit (move/delete). Return false from onAction to roll it back. */
		dismiss?: boolean;
		onAction: () => void | boolean | Promise<void | boolean>;
	}

	interface Props {
		enabled?: boolean;
		/** Only the first action of each side is used — one primary action per direction. */
		leading?: SwipeAction[];
		trailing?: SwipeAction[];
		longPressEnabled?: boolean;
		/** Spring snap on release; off when reduce motion is enabled. */
		springSnap?: boolean;
		onLongPress?: (event: PointerEvent, target: HTMLElement) => void;
		onLongPressEnd?: (event: PointerEvent) => void;
		onLongPressCancel?: (event: PointerEvent) => void;
		class?: string;
		children: Snippet;
	}

	let {
		enabled = true,
		leading = [],
		trailing = [],
		longPressEnabled = false,
		springSnap = true,
		onLongPress,
		onLongPressEnd,
		onLongPressCancel,
		class: className = '',
		children
	}: Props = $props();

	let offset = $state(0);
	let dragging = $state(false);
	let swipeActive = $state(false);
	let snapping = $state(false);
	/** True once the drag is deep enough that a release fires the action. */
	let armed = $state(false);
	/** Keeps the action panel painted while the commit animation runs. */
	let committing = $state(false);
	/**
	 * The action captured at commit time. The panel keeps showing it through the
	 * close animation, so a toggle (e.g. Highlight) doesn't flip its label to the
	 * opposite state (Remove highlight) while the row is still springing shut.
	 */
	let committedAction = $state<SwipeAction | null>(null);
	let pointerId: number | null = null;
	let foregroundEl: HTMLElement | null = $state(null);
	let rowWidth = 0;
	let startX = 0;
	let startY = 0;
	let axisLock: 'x' | 'y' | null = null;
	/* Intentional-horizontal gate: enough travel, clearly flatter than vertical. */
	const AXIS_LOCK_PX = 8;
	const AXIS_DOMINANCE = 1.3;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressFired = false;
	let suppressClick = false;
	let cancelSpring: (() => void) | null = null;

	/** One primary action per direction — the configured first action. */
	const leadingAction = $derived(leading[0] ?? null);
	const trailingAction = $derived(trailing[0] ?? null);
	const hasSwipe = $derived(enabled && (!!leadingAction || !!trailingAction));

	const activeSide = $derived<SwipeSide | null>(
		offset > 0 ? 'leading' : offset < 0 ? 'trailing' : null
	);
	const activeAction = $derived(
		activeSide === 'leading' ? leadingAction : activeSide === 'trailing' ? trailingAction : null
	);
	const leadingWidth = $derived(offset > 0 ? offset : 0);
	const trailingWidth = $derived(offset < 0 ? -offset : 0);

	/* While committing, keep painting the captured action so its label/icon
	   don't flip to the post-toggle state mid-animation. */
	const leadingPaneAction = $derived(
		committing && committedAction && offset > 0 ? committedAction : leadingAction
	);
	const trailingPaneAction = $derived(
		committing && committedAction && offset < 0 ? committedAction : trailingAction
	);

	function stopSpring() {
		cancelSpring?.();
		cancelSpring = null;
		snapping = false;
	}

	function closeRow() {
		stopSpring();
		offset = 0;
		armed = false;
		committing = false;
	}

	function measureRowWidth() {
		rowWidth = foregroundEl?.offsetWidth ?? 0;
	}

	function animateOffset(target: number, onComplete?: () => void) {
		stopSpring();
		if (!springSnap || target === offset) {
			offset = target;
			onComplete?.();
			return;
		}

		snapping = true;
		const from = offset;
		cancelSpring = animateSpringScalar(from, target, {
			onUpdate: (value) => {
				offset = value;
			},
			onComplete: () => {
				snapping = false;
				offset = target;
				cancelSpring = null;
				onComplete?.();
			}
		});
	}

	async function commitAction(action: SwipeAction) {
		const dir = offset > 0 ? 1 : -1;
		/* Freeze the panel on the committed action until it finishes closing. */
		committedAction = action;
		committing = true;

		if (action.dismiss) {
			if (rowWidth === 0) measureRowWidth();
			/* Slide the row away; the colored panel grows to fill behind it. */
			animateOffset(dir * Math.max(rowWidth, Math.abs(offset)));
			let result: void | boolean;
			try {
				result = await action.onAction();
			} catch {
				result = false;
			}
			if (result === false) {
				/* Cancelled (e.g. delete confirm) or failed — bring the row back. */
				armed = false;
				committing = false;
				committedAction = null;
				animateOffset(0);
				return;
			}
			/* Row usually unmounts via the store update; tidy local state regardless. */
			armed = false;
			committing = false;
			committedAction = null;
			closeRow();
			return;
		}

		/* Non-destructive toggle — fire, then spring the row back into place. */
		armed = false;
		animateOffset(0, () => {
			committing = false;
			committedAction = null;
		});
		void action.onAction();
	}

	function resetDragState() {
		dragging = false;
		swipeActive = false;
		axisLock = null;
		pointerId = null;
	}

	function releaseCapturedPointer(event: PointerEvent) {
		if (!foregroundEl) return;
		try {
			if (foregroundEl.hasPointerCapture(event.pointerId)) {
				foregroundEl.releasePointerCapture(event.pointerId);
			}
		} catch {
			// capture may already be released
		}
	}

	function lockHorizontalSwipe(event: PointerEvent) {
		axisLock = 'x';
		swipeActive = true;
		/* Any real horizontal drag must never end in opening the message. */
		suppressClick = true;
		if (!foregroundEl) return;
		try {
			foregroundEl.setPointerCapture(event.pointerId);
		} catch {
			// Pointer capture may fail on some browsers for non-primary pointers.
		}
		event.preventDefault();
	}

	function onContextMenu(event: Event) {
		if (!hasSwipe && !longPressEnabled) return;
		event.preventDefault();
	}

	function onPointerDown(event: PointerEvent) {
		if (!hasSwipe && !longPressEnabled) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		stopSpring();
		longPressFired = false;
		suppressClick = false;
		axisLock = null;
		startX = event.clientX;
		startY = event.clientY;

		if (hasSwipe) {
			measureRowWidth();
			dragging = true;
			swipeActive = false;
			armed = false;
			pointerId = event.pointerId;
		}

		if (longPressEnabled && onLongPress && event.pointerType !== 'mouse') {
			const longPressEvent = event;
			const longPressTarget = event.currentTarget as HTMLElement;
			longPressTimer = setTimeout(() => {
				longPressFired = true;
				suppressClick = true;
				onLongPress(longPressEvent, longPressTarget);
				haptic(12);
			}, 420);
		}
	}

	function updateArmed() {
		const threshold = swipeCommitThreshold(rowWidth);
		const next = !!activeAction && Math.abs(offset) >= threshold;
		if (next === armed) return;
		armed = next;
		if (armed) haptic(10);
	}

	function onPointerMove(event: PointerEvent) {
		const moveX = Math.abs(event.clientX - startX);
		const moveY = Math.abs(event.clientY - startY);
		if (longPressTimer && (moveX > 10 || moveY > 10)) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		if (longPressFired && !swipeActive && (moveX > 10 || moveY > 10)) {
			cancelLongPress(event);
		}
		if (!dragging || event.pointerId !== pointerId) return;

		if (!swipeActive && hasSwipe) {
			if (moveX < AXIS_LOCK_PX && moveY < AXIS_LOCK_PX) return;

			if (moveX >= moveY * AXIS_DOMINANCE) {
				lockHorizontalSwipe(event);
			} else if (moveY >= moveX * AXIS_DOMINANCE) {
				/* Vertical intent — hand the gesture back to the scroller. */
				resetDragState();
				return;
			} else {
				return;
			}
		}

		if (!swipeActive || axisLock !== 'x') return;

		event.preventDefault();
		const delta = event.clientX - startX;
		offset = clampSwipeOffset(delta, !!leadingAction, !!trailingAction, rowWidth);
		updateArmed();
	}

	function finishLongPress(event: PointerEvent) {
		if (!longPressFired) return;
		longPressFired = false;
		onLongPressEnd?.(event);
	}

	function cancelLongPress(event: PointerEvent) {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		if (!longPressFired) return;
		longPressFired = false;
		onLongPressCancel?.(event);
	}

	function onPointerUp(event: PointerEvent) {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		finishLongPress(event);
		if (!dragging || event.pointerId !== pointerId) return;

		const wasSwipe = swipeActive;
		if (wasSwipe) releaseCapturedPointer(event);
		resetDragState();

		if (!wasSwipe) return;

		if (armed && activeAction) {
			void commitAction(activeAction);
			return;
		}
		/* Released short of the threshold — spring back, nothing fires. */
		armed = false;
		animateOffset(0);
	}

	function onPointerCancel(event: PointerEvent) {
		cancelLongPress(event);
		if (event.pointerId !== pointerId) return;
		releaseCapturedPointer(event);
		resetDragState();
		armed = false;
		animateOffset(0);
	}

	/**
	 * The swipe logic runs on pointer events, but `preventDefault` on a
	 * pointermove does NOT stop the browser's native scroll — only `touch-action`
	 * does, and that can't change mid-gesture. So once we've locked to a
	 * horizontal swipe, veto the vertical scroll here: a `preventDefault` on a
	 * non-passive `touchmove` overrides `touch-action: pan-y` for the gesture
	 * in flight, keeping the list from scrolling up/down under the finger.
	 */
	function onTouchMove(event: TouchEvent) {
		if (axisLock === 'x') event.preventDefault();
	}

	/* Svelte attaches `touchmove` as passive by default, which can't cancel
	   scrolling — bind it explicitly as non-passive. */
	$effect(() => {
		const el = foregroundEl;
		if (!el) return;
		el.addEventListener('touchmove', onTouchMove, { passive: false });
		return () => el.removeEventListener('touchmove', onTouchMove);
	});

	function onClickCapture(event: MouseEvent) {
		if (suppressClick) {
			event.preventDefault();
			event.stopPropagation();
			suppressClick = false;
		}
	}

	onDestroy(() => {
		if (longPressTimer) clearTimeout(longPressTimer);
		stopSpring();
	});

	const paneVariantClass = (variant: SwipeAction['variant']) => {
		switch (variant) {
			case 'danger':
				return 'z-swipe-row__pane--danger';
			case 'warning':
				return 'z-swipe-row__pane--warning';
			case 'accent':
				return 'z-swipe-row__pane--accent';
			default:
				return 'z-swipe-row__pane--default';
		}
	};
</script>

{#snippet pane(action: SwipeAction, side: SwipeSide, width: number, isArmed: boolean)}
	{@const PaneIcon = action.icon}
	<div
		class={cn(
			'z-swipe-row__pane',
			`z-swipe-row__pane--${side}`,
			paneVariantClass(action.variant),
			isArmed && 'z-swipe-row__pane--armed'
		)}
		style="width: {width}px;"
		aria-hidden="true"
	>
		<div class="z-swipe-row__pane-content">
			{#if PaneIcon}
				<span class="z-swipe-row__pane-icon">
					<PaneIcon class="size-[1.25rem]" />
				</span>
			{/if}
			<span class="z-swipe-row__pane-label">{action.label}</span>
		</div>
	</div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn(
		'z-swipe-row',
		hasSwipe && 'z-swipe-row--interactive',
		(swipeActive || snapping || committing) && 'z-swipe-row--dragging',
		armed && 'z-swipe-row--armed',
		className
	)}
	data-swipe-side={activeSide ?? undefined}
	onclickcapture={onClickCapture}
>
	{#if hasSwipe && leadingPaneAction && leadingWidth > 0}
		{@render pane(leadingPaneAction, 'leading', leadingWidth, activeSide === 'leading' && armed)}
	{/if}
	{#if hasSwipe && trailingPaneAction && trailingWidth > 0}
		{@render pane(trailingPaneAction, 'trailing', trailingWidth, activeSide === 'trailing' && armed)}
	{/if}

	<div
		bind:this={foregroundEl}
		class="z-swipe-row__foreground"
		style={hasSwipe ? `transform: translate3d(${offset}px, 0, 0)` : undefined}
		oncontextmenu={onContextMenu}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerCancel}
	>
		{@render children()}
	</div>
</div>
