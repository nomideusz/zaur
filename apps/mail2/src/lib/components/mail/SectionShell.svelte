<script lang="ts">
	import type { Snippet } from 'svelte';
	import ZaurMark from './ZaurMark.svelte';
	import SectionTabs from './SectionTabs.svelte';

	/**
	 * The frame a sibling section (Contacts, Calendar, Settings) sits in: the
	 * same edge-to-edge shell as mail, the same 52px header with the stamp, a
	 * way back to Mail, the section tabs, and a slot in the header for the
	 * section's own controls. Pages fill the rest.
	 */
	let {
		title,
		controls,
		children
	}: { title: string; controls?: Snippet; children: Snippet } = $props();
</script>

<div class="flex h-svh w-full flex-col items-center justify-center overflow-hidden bg-[var(--z-ground)] text-[var(--z-ink)]">
	<div class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden bg-[var(--z-surface)]">
		<header
			class="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--z-line)] bg-[var(--z-surface)] px-4 select-none max-md:gap-2 max-md:px-2.5"
		>
			<ZaurMark size="md" class="max-md:hidden" />
			<ZaurMark size="sm" class="md:hidden" />
			<div class="h-4 w-px bg-[var(--z-hairline)] max-md:hidden"></div>
			<a href="/" class="btn-tactile gap-1.5" data-sveltekit-preload-data="hover" title="Back to Mail">
				<svg class="size-3.5 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				<span class="max-md:sr-only">Mail</span>
			</a>
			<h1 class="text-[13px] font-semibold text-[var(--z-body)]">{title}</h1>

			<div class="ml-auto flex min-w-0 items-center gap-2.5">
				{@render controls?.()}
				<SectionTabs class="hidden sm:flex" />
			</div>
		</header>

		{@render children()}
	</div>
</div>
