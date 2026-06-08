<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy } from 'svelte';
	import { cn } from '$lib/utils/cn';
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
	let pointerId: number | null = null;
	let startX = 0;
	let startY = 0;
	let startOffset = 0;
	const SWIPE_LOCK_PX = 10;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressFired = false;
	let suppressClick = false;

	const leadingWidth = $derived(swipeRevealWidth(leading.length));
	const trailingWidth = $derived(swipeRevealWidth(trailing.length));
	const hasSwipe = $derived(enabled && (leadingWidth > 0 || trailingWidth > 0));

	function closeRow() {
		offset = 0;
		openSide = null;
	}

	function registerOpen() {
		registerSwipeRow(closeRow);
	}

	function applySnap(nextOffset: number) {
		const snapped = snapSwipeOffset(nextOffset, leadingWidth, trailingWidth);
		offset = snapped.offset;
		openSide = snapped.side;
		if (snapped.side) registerOpen();
		else unregisterSwipeRow(closeRow);
	}

	function commitPrimary(side: 'leading' | 'trailing') {
		const actions = side === 'leading' ? leading : trailing;
		const primary = actions[0];
		closeRow();
		closeActiveSwipeRow();
		primary?.onAction();
	}

	function onContextMenu(event: Event) {
		if (!hasSwipe && !longPressEnabled) return;
		event.preventDefault();
	}

	function onPointerDown(event: PointerEvent) {
		if (!hasSwipe && !longPressEnabled) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		longPressFired = false;
		suppressClick = false;
		startX = event.clientX;
		startY = event.clientY;

		if (hasSwipe) {
			closeActiveSwipeRow();
			dragging = true;
			swipeActive = false;
			pointerId = event.pointerId;
			startOffset = offset;
		}

		if (longPressEnabled && onLongPress && event.pointerType !== 'mouse') {
			const longPressEvent = event;
			// Capture the element now — `currentTarget` is null once the deferred timer fires.
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
			if (moveX < SWIPE_LOCK_PX && moveY < SWIPE_LOCK_PX) return;
			if (moveY > moveX) {
				dragging = false;
				pointerId = null;
				return;
			}
			swipeActive = true;
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		}

		if (!swipeActive) return;

		const delta = event.clientX - startX;
		const next = clampSwipeOffset(startOffset + delta, leadingWidth, trailingWidth);
		offset = next;
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

		dragging = false;
		pointerId = null;
		if (swipeActive) {
			try {
				(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
			} catch {
				// capture may already be released
			}
		}
		swipeActive = false;

		if (!hasSwipe || offset === startOffset && !openSide) return;

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
		dragging = false;
		pointerId = null;
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
		swipeActive && 'z-swipe-row--dragging',
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
