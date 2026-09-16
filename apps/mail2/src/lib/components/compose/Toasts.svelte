<script lang="ts">
	import { compose } from '#lib/compose/store.svelte.ts';
	import type { ToastTone } from '#lib/compose/store.svelte.ts';

	/**
	 * Notification cards in the inspiration's vocabulary: a white 10px card with
	 * a tone-coloured accent bar on the left, the message as the title, and a
	 * tactile action button (not a bare link) plus a dismiss X.
	 */
	const BAR: Record<ToastTone, string> = {
		info: 'bg-blue-500',
		success: 'bg-green-600',
		warning: 'bg-amber-600',
		error: 'bg-red-500'
	};
</script>

{#if compose.toasts.length > 0}
	<div class="absolute bottom-[62px] left-6 z-[60] flex flex-col gap-2 max-md:right-3 max-md:bottom-3 max-md:left-3 max-md:z-[80]">
		{#each compose.toasts as toast (toast.id)}
			<div
				class="flex max-w-[min(380px,calc(100vw-3rem))] items-center gap-2.5 rounded-[10px] border border-[#cbd5e1] bg-white py-2.5 pr-2 pl-3 shadow-lg"
				role="status"
			>
				<span
					class="w-1 shrink-0 self-stretch rounded-full {BAR[toast.tone ?? 'info']}"
					aria-hidden="true"
				></span>
				<p class="min-w-0 flex-1 text-[13px] font-medium text-slate-800">{toast.text}</p>
				{#if toast.actionLabel}
					<button
						type="button"
						class="btn-tactile shrink-0 !h-[26px] !px-2.5 !text-[12px] font-semibold"
						onclick={() => compose.runToastAction(toast.id)}
					>
						{toast.actionLabel}
					</button>
				{/if}
				<button
					type="button"
					class="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
					aria-label="Dismiss notification"
					onclick={() => compose.dismissToast(toast.id)}
				>
					<svg class="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}
