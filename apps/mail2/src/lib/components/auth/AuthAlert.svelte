<script lang="ts">
	/** A railed notice on the signed-out card: what went wrong, or what happened. */
	let {
		title,
		hint = null,
		tone = 'error'
	}: { title: string; hint?: string | null; tone?: 'error' | 'ok' } = $props();
</script>

<div
	class="z-railed z-alert mt-2.5 flex items-start gap-[9px] {tone === 'ok' ? 'z-tone-confirmed' : 'z-tone-discard'}"
	role={tone === 'ok' ? 'status' : 'alert'}
>
	<svg class="mt-px size-[15px] shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<circle cx="8" cy="8" r="6.2" stroke="currentColor" stroke-width="1.4" />
		{#if tone === 'ok'}
			<path d="M5.3 8.2l1.8 1.8 3.6-3.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
		{:else}
			<path d="M8 5v3.6M8 10.7v.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
		{/if}
	</svg>
	<span class="min-w-0">
		<span class="z-alert-title">{title}</span>
		{#if hint}
			<span class="mt-0.5 block">{hint}</span>
		{/if}
	</span>
</div>
