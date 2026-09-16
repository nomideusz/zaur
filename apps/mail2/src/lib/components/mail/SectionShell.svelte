<script lang="ts">
	import type { Snippet } from 'svelte';
	import ZaurMark from './ZaurMark.svelte';
	import SectionTabs from './SectionTabs.svelte';

	/**
	 * The frame a sibling section (Contacts, Calendar) sits in: the same
	 * edge-to-edge shell as mail, the same 52px header with the mark, a way
	 * back to Mail, the section tabs, and a slot in the header for the
	 * section's own controls. Pages fill the rest.
	 */
	let {
		title,
		unread = 0,
		controls,
		children
	}: { title: string; unread?: number; controls?: Snippet; children: Snippet } = $props();
</script>

<div class="flex h-svh w-full flex-col items-center justify-center overflow-hidden bg-[#ebeef2] text-slate-900">
	<div class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden bg-white">
		<header
			class="flex h-[52px] shrink-0 items-center gap-3 border-b border-[#cbd5e1] bg-white px-4 select-none max-md:gap-2 max-md:px-2.5"
		>
			<ZaurMark {unread} label={title} />
			<div class="h-4 w-px bg-slate-200 max-md:hidden"></div>
			<a href="/" class="btn-tactile gap-1.5" data-sveltekit-preload-data="hover" title="Back to Mail">
				<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				<span class="max-md:sr-only">Mail</span>
			</a>
			<h1 class="text-[13px] font-semibold text-slate-800">{title}</h1>

			<div class="ml-auto flex min-w-0 items-center gap-2.5">
				{@render controls?.()}
				<SectionTabs class="hidden sm:flex" />
			</div>
		</header>

		{@render children()}
	</div>
</div>
