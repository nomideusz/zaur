<script lang="ts">
	/**
	 * The one-line outcome of the last thing a settings page did. It sits at
	 * the top of the column rather than in the header, so the shared header
	 * stays a header — and it sticks there: the button that caused it can be a
	 * screen further down, and a failed save that scrolled out of sight reads
	 * as a save.
	 */
	let { status }: { status: { text: string; error?: boolean } | null } = $props();
</script>

{#if status}
	<p
		class="z-railed sticky top-3 z-10 rounded-[10px] border px-4 py-2.5 text-[13px] font-medium {status.error
			? 'border-[var(--z-ch-discard-line)] bg-[var(--z-ch-discard-hover)] text-[var(--z-ch-discard-ink)]'
			: 'border-[var(--z-hairline)] bg-[var(--z-surface)] text-[var(--z-strong)]'}"
		style:--z-rail={status.error ? 'var(--z-ch-discard-solid)' : 'var(--z-accent)'}
		role="status"
		aria-live="polite"
	>
		{status.text}
	</p>
{/if}
