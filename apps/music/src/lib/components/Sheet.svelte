<script lang="ts">
	import { tick, type Snippet } from 'svelte';

	/**
	 * A native modal <dialog>: a menu beside the button that opened it (give
	 * open() that button), or a small centred card; on a phone a sheet from the
	 * bottom either way. The top layer keeps it clear of the scroller and the
	 * dock, and being modal, a tap outside closes it without also landing on the
	 * row underneath. Esc, the focus trap and focus coming back are the browser's.
	 */
	let { label, heading = false, children }: { label: string; heading?: boolean; children: Snippet } = $props();
	let dialog: HTMLDialogElement;
	let anchored = $state(false);

	export async function open(anchor?: HTMLElement): Promise<void> {
		anchored = Boolean(anchor);
		// The caller has just set what the sheet shows: let that render, then measure.
		await tick();
		dialog.showModal();
		if (!anchor) return;
		const box = anchor.getBoundingClientRect();
		const below = box.bottom + 4;
		// No room under the button (the last rows): open upwards.
		const top = below + dialog.offsetHeight > innerHeight - 8 ? box.top - 4 - dialog.offsetHeight : below;
		dialog.style.setProperty('--top', `${Math.max(8, top)}px`);
		dialog.style.setProperty('--right', `${Math.max(8, innerWidth - box.right)}px`);
	}
	export const close = () => dialog.close();

	// Up and down walk the items, as in any menu (Tab works too).
	function keys(event: KeyboardEvent) {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		const items = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input')];
		const next = items.indexOf(document.activeElement as HTMLElement) + (event.key === 'ArrowDown' ? 1 : -1);
		items.at(next % items.length)?.focus();
		event.preventDefault();
	}
</script>

<!-- A click that lands on the dialog itself is on its backdrop: the content fills the box. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	class:anchored
	aria-label={label}
	onclick={(event) => event.target === dialog && dialog.close()}
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
		dialog {
			inset: auto 0 0;
			width: 100%;
			max-width: none;
			max-height: 85dvh;
			margin: 0;
			padding-bottom: env(safe-area-inset-bottom);
			border-width: 1px 0 0;
			border-radius: 16px 16px 0 0;
		}
		.in {
			padding: 8px;
		}
		.card {
			padding: 16px;
		}
	}
</style>
