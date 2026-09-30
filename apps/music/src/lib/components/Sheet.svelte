<script lang="ts" module>
	/** Whether a menu or a card is up (Now playing is a dialog too, but not one of these). */
	export const sheetOpen = (): boolean => document.querySelector('dialog[data-sheet][open]') !== null;
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	/**
	 * A native modal <dialog>: a menu beside the button that opened it (give
	 * open() that button; on a phone it is a sheet from the bottom), or a small
	 * card with a heading. The top layer keeps it clear of the scroller and the
	 * dock, and being modal, a tap outside closes it without also landing on the
	 * row underneath. Esc, the focus trap and focus coming back are the browser's.
	 *
	 * Like Now playing it is a history entry of its own (`page.state.sheet`), so
	 * Back closes it and stays on the page. A link inside closes it the same
	 * way once its page is had, and then goes there (visit.svelte.ts). Anything
	 * else that navigates or reloads the page's data after closing waits for
	 * close(): Kit drops a load that a history step lands on.
	 */
	let { label, heading = false, children }: { label: string; heading?: boolean; children: Snippet } = $props();
	let dialog: HTMLDialogElement;
	let anchored = $state(false);
	let closing: (() => void) | undefined;
	// Whether the last thing done was a tap or a click, not a key.
	let tapped = false;

	export async function open(anchor?: HTMLElement): Promise<void> {
		anchored = Boolean(anchor);
		// The caller has just set what the sheet shows: let that render, then measure.
		await tick();
		dialog.showModal();
		// The browser focuses the first thing inside, and WebKit rings it even after a tap. Opened
		// with one, the sheet itself takes the focus — unless that is a card's field, about to be typed in.
		if (tapped && !(document.activeElement instanceof HTMLInputElement)) dialog.focus();
		// A sheet that takes over from another (the menu's "Add to playlist…") inherits its entry.
		if (!page.state.sheet) void goto('', { state: { ...page.state, sheet: true }, shallow: true, persistState: true });
		if (!anchor) return;
		const box = anchor.getBoundingClientRect();
		const below = box.bottom + 4;
		// No room under the button (the last rows): open upwards.
		const top = below + dialog.offsetHeight > innerHeight - 8 ? box.top - 4 - dialog.offsetHeight : below;
		dialog.style.setProperty('--top', `${Math.max(8, top)}px`);
		dialog.style.setProperty('--right', `${Math.max(8, innerWidth - box.right)}px`);
	}

	/** Resolves once the sheet's history entry is gone as well. */
	export function close(): Promise<void> {
		if (!dialog.open) return Promise.resolve();
		dialog.close();
		return new Promise((done) => (closing = done));
	}

	/** When what the card shows is swapped and the focused button goes with it. */
	export const focus = (): void => dialog.focus();

	// However it closed: Esc, a tap outside, close(), Back.
	function closed() {
		const done = closing ?? (() => {});
		closing = undefined;
		// Its history entry goes too, unless Back or a link already took it, or another sheet has taken it over.
		if (sheetOpen()) return done();
		// Focus is back on the button that opened it: the same ring, the same answer.
		if (tapped) (document.activeElement as HTMLElement | null)?.blur();
		if (!page.state.sheet) return done();
		addEventListener('popstate', done, { once: true });
		history.back();
	}

	// Back, or a link inside whose page is had.
	$effect(() => {
		if (!page.state.sheet && dialog.open) dialog.close();
	});

	// Up and down walk the items, as in any menu (Tab works too).
	function keys(event: KeyboardEvent) {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		const items = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input')];
		const at = items.indexOf(document.activeElement as HTMLElement);
		// From the sheet itself, where focus starts, down is the first item and up the last.
		items.at(event.key === 'ArrowDown' ? (at + 1) % items.length : Math.max(at, 0) - 1)?.focus();
		event.preventDefault();
	}
</script>

<!-- A menu is placed once, beside its button: a window that changes size leaves it somewhere else
     (on a phone it is a sheet along the bottom, and stays right). -->
<svelte:window
	onresize={() => anchored && dialog.open && innerWidth > 640 && dialog.close()}
	onpointerdown={() => (tapped = true)}
	onkeydown={() => (tapped = false)}
/>

<!-- A click that lands on the dialog itself is on its backdrop: the content fills the box. -->
<dialog
	bind:this={dialog}
	class:anchored
	data-sheet
	tabindex="-1"
	aria-label={label}
	onclick={(event) => event.target === dialog && dialog.close()}
	onclose={closed}
	onkeydown={keys}
>
	<div class="in" class:card={heading}>
		{#if heading}<h2>{label}</h2>{/if}
		{@render children()}
	</div>
</dialog>

<style>
	dialog {
		width: min(360px, calc(100vw - 32px));
		max-height: calc(100dvh - 32px);
		margin: auto;
		padding: 0;
		overflow-y: auto;
		border: 1px solid var(--z-line);
		border-radius: 12px;
		background: var(--z-surface);
		color: var(--z-body);
		box-shadow: var(--z-shadow-panel);
		/* The dialog itself takes focus when it opens: no ring round the whole card. */
		outline: none;
	}
	dialog::backdrop {
		background: var(--z-scrim);
	}
	.in {
		padding: 6px;
	}
	.card {
		padding: 16px;
	}
	h2 {
		margin: 0 0 12px;
		color: var(--z-ink);
		font-size: 16px;
		font-weight: 650;
	}
	.in :global(input.z-field) {
		height: 36px;
	}
	@media (pointer: coarse) {
		/* Under 16px, iOS zooms the page when a field takes focus. */
		.in :global(input.z-field) {
			height: 44px;
			font-size: 16px;
		}
	}
	@media (min-width: 641px) {
		.anchored {
			inset: var(--top, 8px) var(--right, 8px) auto auto;
			width: 232px;
			margin: 0;
			box-shadow: var(--z-shadow-menu);
		}
		.anchored::backdrop {
			background: none;
		}
	}
	@media (max-width: 640px) {
		/* A card sits high, where the phone's keyboard leaves its field in view. */
		dialog {
			margin-top: 12dvh;
		}
		.anchored {
			inset: auto 0 0;
			width: 100%;
			max-width: none;
			max-height: 85dvh;
			margin: 0;
			padding-bottom: env(safe-area-inset-bottom);
			border-width: 1px 0 0;
			border-radius: 16px 16px 0 0;
		}
		.anchored .in {
			padding: 8px;
		}
	}
</style>
