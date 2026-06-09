<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import {
		ACTION_BAR_CTX,
		type ActionBarContext,
		type ActionBarPositioning
	} from '$lib/components/ui/action-bar/action-bar-context';

	interface Props {
		open?: boolean;
		defaultOpen?: boolean;
		closeOnEscape?: boolean;
		lazyMount?: boolean;
		unmountOnExit?: boolean;
		positioning?: ActionBarPositioning;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	}

	let {
		open,
		defaultOpen = false,
		closeOnEscape = true,
		lazyMount = true,
		unmountOnExit = true,
		positioning,
		onOpenChange,
		children
	}: Props = $props();

	const defaultPositioning = { placement: 'bottom', gutter: '16px', mode: 'floating' } as const;

	let internalOpen = $state(defaultOpen);

	const isControlled = $derived(open !== undefined);
	const isOpen = $derived(isControlled ? !!open : internalOpen);

	function handleClose() {
		if (!isControlled) internalOpen = false;
		onOpenChange?.(false);
	}

	function handleOpen() {
		if (!isControlled) internalOpen = true;
		onOpenChange?.(true);
	}

	const actionBarCtx = $state<ActionBarContext>({
		isOpen: defaultOpen,
		lazyMount,
		unmountOnExit,
		positioning: {
			...defaultPositioning,
			...positioning,
			mode: positioning?.mode ?? defaultPositioning.mode
		},
		onClose: handleClose,
		onOpen: handleOpen
	});

	$effect(() => {
		actionBarCtx.isOpen = isOpen;
		actionBarCtx.lazyMount = lazyMount;
		actionBarCtx.unmountOnExit = unmountOnExit;
		actionBarCtx.positioning = {
			...defaultPositioning,
			...positioning,
			mode: positioning?.mode ?? defaultPositioning.mode
		};
		actionBarCtx.onClose = handleClose;
		actionBarCtx.onOpen = handleOpen;
	});

	setContext(ACTION_BAR_CTX, actionBarCtx);

	$effect(() => {
		if (!isOpen || !closeOnEscape) return;

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape' || event.defaultPrevented) return;
			event.preventDefault();
			handleClose();
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

{@render children()}
