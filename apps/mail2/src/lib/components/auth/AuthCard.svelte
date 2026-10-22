<script lang="ts">
	import type { Snippet } from 'svelte';
	import { brandName, MARK } from '#lib/brand';

	/**
	 * The signed-out screens' card: sign in, forgotten password, new password.
	 * A top edge in the accent, the mark and wordmark with its Beta chip, the title, then
	 * the page's own content. The one screen with no channels on it, so the
	 * accent is the only colour. `below` sits under the card.
	 */
	let { title, children, below }: { title: string; children: Snippet; below?: Snippet } = $props();
</script>

<div class="z-screen flex w-full flex-col items-center justify-center gap-5 overflow-y-auto bg-[var(--z-canvas)] px-6 py-10 text-[var(--z-ink)]">
	<div class="z-auth-card max-w-[380px]">

		<div class="px-[22px] pt-6 pb-[22px]">
			<div class="flex items-center gap-[9px]">
				<!-- The favicon (#lib/brand's mark), drawn here: the error card is also what shows when nothing can be fetched. -->
				<svg class="size-6 shrink-0" viewBox="0 0 16 16" aria-hidden="true">
					<defs>
						<linearGradient id="z-mark-sky" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" /><stop offset="1" stop-color="#1d4ed8" /></linearGradient>
					</defs>
					<rect width="16" height="16" rx="3.5" fill="url(#z-mark-sky)" />
					<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
						<rect x="2" y="4" width="12" height="8" fill="#fff" fill-opacity="0.12" stroke="none" />
						<path d={MARK.faint} stroke-opacity="0.45" />
						<path d={MARK.bold} />
					</g>
				</svg>
				<span class="text-[17px] font-bold tracking-[-0.025em] text-[var(--z-ink)]">{brandName}</span>
				<span class="z-chip z-chip-filled z-tone-needs !tracking-[0.06em]">Beta</span>
			</div>
			<h1 class="mt-3.5 text-[22px] leading-[1.15] font-bold tracking-[-0.025em] text-[var(--z-ink)]">{title}</h1>
			{@render children()}
		</div>
	</div>

	{#if below}
		<p class="text-[13px] text-[var(--z-muted)]">{@render below()}</p>
	{/if}
</div>
