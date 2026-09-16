<script lang="ts">
	import { compose } from '#lib/compose/store.svelte.ts';
	import type { ToastTone } from '#lib/compose/store.svelte.ts';

	/**
	 * Notification cards in the inspiration's vocabulary: a white 10px card with
	 * a tone-coloured accent bar on the left, the message as the title, and a
	 * tactile action button (not a bare link) plus a dismiss X.
	 *
	 * That accent bar is where `.z-railed` came from, so the toast wears the
	 * real thing — the tone in place of a person's hue.
	 */
	// A tone is a channel's solid: correspondence, confirmed, needs, discard.
	const TONE: Record<ToastTone, string> = {
		info: '#2563eb',
		success: '#16a34a',
		warning: '#d97706',
		error: '#dc2626'
	};

	/**
	 * The dock is the other floating thing down here, and it is *persistent* —
	 * a notice must never land on it. Same store, so this costs no plumbing.
	 */
	const docked = $derived(compose.drafts.some((draft) => draft.stage === 'minimized'));
</script>

{#if compose.toasts.length > 0}
	<!--
		Centred, because the bottom corners are both spoken for: the sidebar's
		New message button sits bottom left (and the message list does when the
		sidebar is collapsed), the compose dock bottom right. The middle is the
		one strip of the bottom edge that nothing persistent occupies, and a
		notice that covers a message row for three seconds costs nothing.
	-->
	<div class="z-toasts absolute z-[60] flex flex-col items-center gap-2" data-docked={docked}>
		{#each compose.toasts as toast (toast.id)}
			<div
				class="z-railed flex max-w-[min(380px,calc(100vw-3rem))] items-center gap-2.5 rounded-[10px] border border-[#cbd5e1] bg-white py-2.5 pr-2 pl-[18px] shadow-[var(--z-shadow-menu)]"
				style:--z-rail={TONE[toast.tone ?? 'info']}
				style:--z-rail-inset="10px"
				role="status"
			>
				<p class="min-w-0 flex-1 text-[13px] font-medium text-[#1e293b]">{toast.text}</p>
				{#if toast.actionLabel}
					<button
						type="button"
						class="btn-tactile shrink-0 !h-[26px] !rounded-[6px] !px-2.5 !text-[12px] !font-semibold"
						onclick={() => compose.runToastAction(toast.id)}
					>
						{toast.actionLabel}
					</button>
				{/if}
				<button
					type="button"
					class="z-icon-btn !size-6"
					aria-label="Dismiss notification"
					onclick={() => compose.dismissToast(toast.id)}
				>
					<svg class="size-[11px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.z-toasts {
		left: 50%;
		transform: translateX(-50%);
		/* Clear of the status line, which is 36px. */
		bottom: 46px;
		transition: bottom 160ms ease;
	}

	/* One dock row is a 44px chip on a 48px offset; sit above it. */
	.z-toasts[data-docked='true'] {
		bottom: 104px;
	}

	/*
	 * A phone has no status line and no sidebar in the layout, so the notice
	 * spans the width — but the dock is a strip on the same edge there, so the
	 * same rule applies, just closer in.
	 */
	@media (max-width: 767px) {
		.z-toasts {
			left: 12px;
			right: 12px;
			transform: none;
			bottom: 12px;
			z-index: 80;
			align-items: stretch;
		}

		.z-toasts[data-docked='true'] {
			bottom: 68px;
		}
	}
</style>
