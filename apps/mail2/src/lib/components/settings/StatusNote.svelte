<script lang="ts">
	/**
	 * The one-line outcome of the last thing a settings page did. It sits at
	 * the top of the column rather than in the header, so a page and its
	 * message scroll together and the shared header stays a header.
	 */
	let { status }: { status: { text: string; error?: boolean } | null } = $props();
</script>

{#if status}
	<p
		class="z-railed rounded-[10px] border px-4 py-2.5 text-[13px] font-medium {status.error
			? 'border-[var(--z-ch-discard-line)] bg-[var(--z-ch-discard-hover)] text-[var(--z-ch-discard-ink)]'
			: 'border-[var(--z-hairline)] bg-[var(--z-surface)] text-[var(--z-strong)]'}"
		style:--z-rail={status.error ? 'var(--z-ch-discard-solid)' : 'var(--z-accent)'}
		role="status"
		aria-live="polite"
	>
		{status.text}
	</p>
{/if}
