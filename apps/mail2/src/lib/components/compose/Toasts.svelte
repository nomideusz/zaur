<script lang="ts">
	import { compose } from '#lib/compose/store.svelte.ts';
</script>

{#if compose.toasts.length > 0}
	<div class="absolute bottom-[62px] left-6 z-[60] flex flex-col gap-2">
		{#each compose.toasts as toast (toast.id)}
			<div class="flex items-center gap-3 rounded-card border border-border bg-container py-2.5 pr-2 pl-3.5 shadow-toast">
				<p class="text-[13px]">{toast.text}</p>
				{#if toast.actionLabel}
					<button
						type="button"
						class="text-[13px] font-semibold text-accent hover:underline"
						onclick={() => compose.runToastAction(toast.id)}
					>
						{toast.actionLabel}
					</button>
				{/if}
				<button
					type="button"
					class="flex size-6 items-center justify-center rounded-menu-item text-ink-secondary transition-colors duration-[160ms] hover:bg-divider"
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
