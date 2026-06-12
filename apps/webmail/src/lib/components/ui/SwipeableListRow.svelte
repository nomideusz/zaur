<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { onDestroy } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import { haptic } from '$lib/utils/haptics';
	import { animateSpringScalar } from '$lib/utils/swipe-row-spring';
	import {
		SWIPE_ACTION_WIDTH,
		clampSwipeOffset,
		snapSwipeOffset,
		swipeArmedTier,
		swipeRevealWidth
	} from '$lib/utils/swipe-row';
	import {
		closeOtherSwipeRows,
		registerSwipeRow,
		unregisterSwipeRow
	} from '$lib/utils/swipe-row-controller';

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
	/** Which action a release right now would commit: 0 none, 1 primary, 2 secondary. */
	let armedTier = $state<0 | 1 | 2>(0);
	/** Keeps the armed fill visible while the commit animation runs. */
	let committing = $state(false);
	let pointerId: number | null = null;
	let foregroundEl: HTMLElement | null = null;
	let rowWidth = 0;
	let startX = 0;
	let startY = 0;
	let startOffset = 0;
	let axisLock: 'x' | 'y' | null = null;
	/* Intentional-horizontal gate: enough travel, clearly flatter than vertical. */
	const AXIS_LOCK_PX = 8;
	const AXIS_DOMINANCE = 1.3;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressFired = false;
	let suppressClick = false;
	let cancelSpring: (() => void) | null = null;

	const leadingWidth = $derived(swipeRevealWidth(leading.length));
	const trailingWidth = $derived(swipeRevealWidth(trailing.length));
	const hasSwipe = $derived(enabled && (leadingWidth > 0 || trailingWidth > 0));

	const activeSide = $derived(offset > 0 ? 'leading' : offset < 0 ? 'trailing' : null);
	const sideActions = $derived(activeSide === 'leading' ? leading : trailing);
	const armedAction = $derived(
		armedTier > 0 ? (sideActions[Math.min(armedTier, sideActions.length) - 1] ?? null) : null
	);
	const armedVisual = $derived((swipeActive || committing) && armedAction !== null);

	/* The action tray grows with the pull so the armed action fills it edge-to-edge. */
	const leadingTrayWidth = $derived(offset > 0 ? Math.max(leadingWidth, offset) : leadingWidth);
	const trailingTrayWidth = $derived(offset < 0 ? Math.max(trailingWidth, -offset) : trailingWidth);

	/* Primary action sits at the outer screen edge — full pulls read as "into" it. */
	const trailingRender = $derived([...trailing].reverse());

	function stopSpring() {
		cancelSpring?.();
		cancelSpring = null;
		snapping = false;
	}

	function closeRow() {
		stopSpring();
		offset = 0;
		openSide = null;
		armedTier = 0;
		committing = false;
	}

	function registerOpen() {
		registerSwipeRow(closeRow);
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

	function applySnap(nextOffset: number) {
		armedTier = 0;
		const snapped = snapSwipeOffset(nextOffset, leadingWidth, trailingWidth);
		animateOffset(snapped.offset, () => {
			openSide = snapped.side;
			if (snapped.side) registerOpen();
			else unregisterSwipeRow(closeRow);
		});
	}

	async function commitAction(action: SwipeAction, direction?: 1 | -1) {
		unregisterSwipeRow(closeRow);
		openSide = null;

		if (action.dismiss) {
			committing = true;
			if (rowWidth === 0) measureRowWidth();
			const dir = direction ?? (offset > 0 ? 1 : -1);
			animateOffset(dir * Math.max(rowWidth, Math.abs(offset)));
			let result: void | boolean;
			try {
				result = await action.onAction();
			} catch {
				result = false;
			}
			if (result === false) {
				/* Cancelled (e.g. delete confirm) or failed — bring the row back. */
				committing = false;
				armedTier = 0;
				animateOffset(0);
				return;
			}
			/* Row usually unmounts via the store update; tidy local state regardless. */
			committing = false;
			armedTier = 0;
			closeRow();
			return;
		}

		armedTier = 0;
		animateOffset(0, () => {
			committing = false;
		});
		void action.onAction();
	}

	function commitFromTray(action: SwipeAction, side: 'leading' | 'trailing') {
		void commitAction(action, side === 'leading' ? 1 : -1);
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
			/* Tidy other rows; a tap that closes one must not also navigate. */
			if (closeOtherSwipeRows(closeRow)) suppressClick = true;
			measureRowWidth();
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
				haptic(12);
			}, 420);
		}
	}

	function updateArmedTier() {
		const revealWidth = activeSide === 'leading' ? leadingWidth : trailingWidth;
		const tier = swipeArmedTier(offset, revealWidth, rowWidth, sideActions.length);
		if (tier === armedTier) return;
		if (tier > armedTier || tier > 0) haptic(tier === 2 ? [10, 30, 14] : 8);
		armedTier = tier;
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
		offset = clampSwipeOffset(startOffset + delta, leadingWidth, trailingWidth, rowWidth);
		updateArmedTier();
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

		if (wasSwipe && armedAction) {
			void commitAction(armedAction);
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
		if (suppressClick) {
			event.preventDefault();
			event.stopPropagation();
			suppressClick = false;
			return;
		}
		/* Tap on an open row closes it instead of opening the message —
		   taps on the revealed action buttons still go through. */
		if (
			openSide &&
			!(event.target instanceof Element && event.target.closest('.z-swipe-row__actions'))
		) {
			event.preventDefault();
			event.stopPropagation();
			unregisterSwipeRow(closeRow);
			applySnap(0);
		}
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
			case 'warning':
				return 'z-swipe-row__action--warning';
			case 'accent':
				return 'z-swipe-row__action--accent';
			default:
				return 'z-swipe-row__action--default';
		}
	};
</script>

{#snippet trayAction(action: SwipeAction, side: 'leading' | 'trailing')}
	{@const ActionIcon = action.icon}
	<button
		type="button"
		class={cn(
			'z-swipe-row__action',
			actionVariantClass(action.variant),
			armedVisual && action === armedAction && 'z-swipe-row__action--armed',
			armedVisual && action !== armedAction && 'z-swipe-row__action--collapsed'
		)}
		style="flex-basis: {SWIPE_ACTION_WIDTH}px"
		aria-label={action.label}
		onclick={() => commitFromTray(action, side)}
	>
		{#if ActionIcon}
			<span class="z-swipe-row__action-icon" aria-hidden="true">
				<ActionIcon class="size-[1.125rem]" />
			</span>
		{/if}
		<span class="z-swipe-row__action-label">{action.label}</span>
	</button>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn(
		'z-swipe-row',
		hasSwipe && 'z-swipe-row--interactive',
		openSide && 'z-swipe-row--elevated',
		(swipeActive || snapping) && 'z-swipe-row--dragging',
		armedVisual && 'z-swipe-row--armed',
		className
	)}
	data-swipe-open={openSide ?? undefined}
	onclickcapture={onClickCapture}
>
	{#if hasSwipe}
		<div
			class="z-swipe-row__actions z-swipe-row__actions--leading"
			style="width: {leadingTrayWidth}px; display: {offset > 0 || openSide === 'leading'
				? 'flex'
				: 'none'};"
			aria-hidden={leadingWidth === 0 || (offset <= 0 && openSide !== 'leading')}
		>
			{#each leading as action (action.id)}
				{@render trayAction(action, 'leading')}
			{/each}
		</div>
		<div
			class="z-swipe-row__actions z-swipe-row__actions--trailing"
			style="width: {trailingTrayWidth}px; display: {offset < 0 || openSide === 'trailing'
				? 'flex'
				: 'none'};"
			aria-hidden={trailingWidth === 0 || (offset >= 0 && openSide !== 'trailing')}
		>
			{#each trailingRender as action (action.id)}
				{@render trayAction(action, 'trailing')}
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
