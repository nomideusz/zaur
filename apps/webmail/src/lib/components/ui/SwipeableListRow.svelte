<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import { animateSpringScalar } from '$lib/utils/swipe-row-spring';
	import {
		SWIPE_ACTION_WIDTH,
		clampSwipeOffset,
		shouldCommitSwipeAction,
		snapSwipeOffset,
		swipeRevealWidth
	} from '$lib/utils/swipe-row';
	import {
		closeActiveSwipeRow,
		registerSwipeRow,
		unregisterSwipeRow
	} from '$lib/utils/swipe-row-controller';

	export interface SwipeAction {
		id: string;
		label: string;
		variant?: 'default' | 'danger' | 'accent';
		icon?: Snippet;
		onAction: () => void;
	}

	interface Props {
		enabled?: boolean;
		leading?: SwipeAction[];
		trailing?: SwipeAction[];
		longPressEnabled?: boolean;
		/** Spring snap on release; off when reduce motion is enabled. */
		springSnap?: boolean;
		/** When true, long-press selection is skipped (e.g. important-subject color pick). */
		longPressExempt?: (event: PointerEvent) => boolean;
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
		longPressExempt,
		onLongPress,
		onLongPressEnd,
		onLongPressCancel,
		class: className = '',
		children
	}: Props = $props();

	let offset = $state(0);
	let openSide = $state<'leading' | 'trailing' | null>(null);
	let dragging = $state(false);
	let swipeActive = $state(false);
	let snapping = $state(false);
	let pointerId: number | null = null;
	let foregroundEl: HTMLElement | null = null;
	let startX = 0;
	let startY = 0;
	let startOffset = 0;
	let axisLock: 'x' | 'y' | null = null;
	const AXIS_LOCK_PX = 6;
	const AXIS_DOMINANCE = 1.15;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressFired = false;
	let suppressClick = false;
	let cancelSpring: (() => void) | null = null;

	const leadingWidth = $derived(swipeRevealWidth(leading.length));
	const trailingWidth = $derived(swipeRevealWidth(trailing.length));
	const hasSwipe = $derived(enabled && (leadingWidth > 0 || trailingWidth > 0));

	function stopSpring() {
		cancelSpring?.();
		cancelSpring = null;
		snapping = false;
	}

	function closeRow() {
		stopSpring();
		offset = 0;
		openSide = null;
	}

	function registerOpen() {
		registerSwipeRow(closeRow);
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

	function applySnap(nextOffset: number) {
		const snapped = snapSwipeOffset(nextOffset, leadingWidth, trailingWidth);
		animateOffset(snapped.offset, () => {
			openSide = snapped.side;
			if (snapped.side) registerOpen();
			else unregisterSwipeRow(closeRow);
		});
	}

	function commitPrimary(side: 'leading' | 'trailing') {
		const actions = side === 'leading' ? leading : trailing;
		const primary = actions[0];
		closeRow();
		closeActiveSwipeRow();
		primary?.onAction();
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
			closeActiveSwipeRow();
			dragging = true;
			swipeActive = false;
			pointerId = event.pointerId;
			startOffset = offset;
		}

		if (
			longPressEnabled &&
			onLongPress &&
			event.pointerType !== 'mouse' &&
			!longPressExempt?.(event)
		) {
			const longPressEvent = event;
			const longPressTarget = event.currentTarget as HTMLElement;
			longPressTimer = setTimeout(() => {
				longPressFired = true;
				suppressClick = true;
				onLongPress(longPressEvent, longPressTarget);
				if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
					navigator.vibrate(12);
				}
			}, 420);
		}
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
				resetDragState();
				return;
			} else {
				return;
			}
		}

		if (!swipeActive || axisLock !== 'x') return;

		event.preventDefault();
		const delta = event.clientX - startX;
		offset = clampSwipeOffset(startOffset + delta, leadingWidth, trailingWidth);
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

		if (!hasSwipe || (!wasSwipe && offset === startOffset && !openSide)) return;

		if (offset > 0 && shouldCommitSwipeAction(offset, leadingWidth)) {
			commitPrimary('leading');
			return;
		}
		if (offset < 0 && shouldCommitSwipeAction(offset, trailingWidth)) {
			commitPrimary('trailing');
			return;
		}

		applySnap(offset);
	}

	function onPointerCancel(event: PointerEvent) {
		cancelLongPress(event);
		if (event.pointerId !== pointerId) return;
		releaseCapturedPointer(event);
		resetDragState();
		applySnap(offset);
	}

	function onClickCapture(event: MouseEvent) {
		if (!suppressClick) return;
		event.preventDefault();
		event.stopPropagation();
		suppressClick = false;
	}

	onDestroy(() => {
		if (longPressTimer) clearTimeout(longPressTimer);
		stopSpring();
		unregisterSwipeRow(closeRow);
	});

	const actionVariantClass = (variant: SwipeAction['variant']) => {
		switch (variant) {
			case 'danger':
				return 'z-swipe-row__action--danger';
			case 'accent':
				return 'z-swipe-row__action--accent';
			default:
				return 'z-swipe-row__action--default';
		}
	};
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn(
		'z-swipe-row',
		hasSwipe && 'z-swipe-row--interactive',
		openSide && 'z-swipe-row--elevated',
		(swipeActive || snapping) && 'z-swipe-row--dragging',
		className
	)}
	data-swipe-open={openSide ?? undefined}
	onclickcapture={onClickCapture}
>
	{#if hasSwipe}
		<div
			class="z-swipe-row__actions z-swipe-row__actions--leading"
			style="width: {leadingWidth}px; display: {offset > 0 || openSide === 'leading' ? 'flex' : 'none'};"
			aria-hidden={leadingWidth === 0 || (offset <= 0 && openSide !== 'leading')}
		>
			{#each leading as action (action.id)}
				<button
					type="button"
					class={cn('z-swipe-row__action', actionVariantClass(action.variant))}
					style="width: {SWIPE_ACTION_WIDTH}px"
					aria-label={action.label}
					onclick={() => {
						closeRow();
						closeActiveSwipeRow();
						action.onAction();
					}}
				>
					{#if action.icon}
						<span class="z-swipe-row__action-icon" aria-hidden="true">
							{@render action.icon()}
						</span>
					{/if}
					<span class="z-swipe-row__action-label">{action.label}</span>
				</button>
			{/each}
		</div>
		<div
			class="z-swipe-row__actions z-swipe-row__actions--trailing"
			style="width: {trailingWidth}px; display: {offset < 0 || openSide === 'trailing' ? 'flex' : 'none'};"
			aria-hidden={trailingWidth === 0 || (offset >= 0 && openSide !== 'trailing')}
		>
			{#each trailing as action (action.id)}
				<button
					type="button"
					class={cn('z-swipe-row__action', actionVariantClass(action.variant))}
					style="width: {SWIPE_ACTION_WIDTH}px"
					aria-label={action.label}
					onclick={() => {
						closeRow();
						closeActiveSwipeRow();
						action.onAction();
					}}
				>
					{#if action.icon}
						<span class="z-swipe-row__action-icon" aria-hidden="true">
							{@render action.icon()}
						</span>
					{/if}
					<span class="z-swipe-row__action-label">{action.label}</span>
				</button>
			{/each}
		</div>
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
