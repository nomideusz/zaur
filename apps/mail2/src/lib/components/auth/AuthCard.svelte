<script module lang="ts">
	/** A field row: icon + input in one bordered box. */
	export const fieldClass =
		'flex h-10 items-center gap-2.5 rounded-[8px] border border-[var(--z-line)] bg-[var(--z-surface)] px-[11px] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] focus-within:border-[var(--z-accent)] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.18)]';
	export const inputClass =
		'min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[var(--z-ink)] outline-none placeholder:text-[var(--z-faint)] disabled:opacity-60 max-md:text-base';
	export const linkClass = 'font-semibold text-[var(--z-accent)] hover:text-[var(--z-accent-edge)]';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The signed-out screens' card: sign in, forgotten password, new password.
	 * A top edge in the accent, the mark and wordmark with its Beta chip, the title, then
	 * the page's own content. The one screen with no channels on it, so the
	 * accent is the only colour. `below` sits under the card.
	 */
	let { title, children, below }: { title: string; children: Snippet; below?: Snippet } = $props();
</script>

<div class="z-screen flex w-full flex-col items-center justify-center gap-5 overflow-y-auto bg-[var(--z-canvas)] px-6 py-10 text-[var(--z-ink)]">
	<div class="relative w-full max-w-[380px] overflow-hidden rounded-[12px] border border-[var(--z-line)] bg-[var(--z-surface)] shadow-[var(--z-shadow-window)]">
		<span class="absolute inset-x-0 top-0 h-[3px] bg-[var(--z-accent)]" aria-hidden="true"></span>

		<div class="px-[22px] pt-6 pb-[22px]">
			<div class="flex items-center gap-[9px]">
				<!-- static/favicon.svg, drawn here: the error card is also what shows when nothing can be fetched. -->
				<svg class="size-6 shrink-0" viewBox="0 0 16 16" aria-hidden="true">
					<defs>
						<linearGradient id="z-mark-sky" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" /><stop offset="1" stop-color="#1d4ed8" /></linearGradient>
					</defs>
					<rect width="16" height="16" rx="3.5" fill="url(#z-mark-sky)" />
					<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
						<rect x="2" y="4" width="12" height="8" fill="#fff" fill-opacity="0.12" stroke="none" />
						<path d="M2 4V12M14 4V12M2 4L8 8" stroke-opacity="0.45" />
						<path d="M2 4H14L2 12H14" />
					</g>
				</svg>
				<span class="text-[17px] font-bold tracking-[-0.025em] text-[var(--z-ink)]">Zaur</span>
				<span class="z-chip z-chip-filled !tracking-[0.06em]" style="--z-fill:var(--z-ch-needs-fill);--z-stroke:var(--z-ch-needs-solid);--z-ink-on:var(--z-ch-needs-ink)">Beta</span>
			</div>
			<h1 class="mt-3.5 text-[22px] leading-[1.15] font-bold tracking-[-0.025em] text-[var(--z-ink)]">{title}</h1>
			{@render children()}
		</div>
	</div>

	{#if below}
		<p class="text-[13px] text-[var(--z-muted)]">{@render below()}</p>
	{/if}
</div>
