<script lang="ts">
	/** A railed notice on the signed-out card: what went wrong, or what happened. */
	let {
		title,
		hint = null,
		tone = 'error'
	}: { title: string; hint?: string | null; tone?: 'error' | 'ok' } = $props();

	const channel = $derived(tone === 'ok' ? 'confirmed' : 'discard');
</script>

<div
	class="z-railed mt-2.5 flex items-start gap-[9px] rounded-[8px] border py-[9px] pr-[11px] pl-[18px]"
	style:border-color="var(--z-ch-{channel}-stroke)"
	style:background="var(--z-ch-{channel}-fill)"
	style:color="var(--z-ch-{channel}-ink)"
	style:--z-rail="var(--z-ch-{channel}-solid)"
	style:--z-rail-inset="8px"
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
		<span class="block text-[13px] font-semibold">{title}</span>
		{#if hint}
			<span class="mt-0.5 block text-[12.5px] leading-normal">{hint}</span>
		{/if}
	</span>
</div>
