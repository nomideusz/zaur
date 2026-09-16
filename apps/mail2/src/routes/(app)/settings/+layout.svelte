<script lang="ts">
	import { page } from '$app/state';
	import ZaurMark from '#lib/components/mail/ZaurMark.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ href: '/settings', label: 'General' },
		{ href: '/settings/security', label: 'Security' }
	] as const;

	const current = $derived(
		tabs.find((tab) => page.url.pathname === tab.href) ??
			tabs.find((tab) => tab.href !== '/settings' && page.url.pathname.startsWith(tab.href)) ??
			tabs[0]
	);
</script>

<div class="flex h-svh w-full flex-col items-center justify-center overflow-hidden bg-[#ebeef2] text-slate-900">
	<div class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden bg-white">
		<header
			class="flex h-[52px] shrink-0 items-center gap-3 border-b border-[#cbd5e1] bg-white px-4 select-none max-md:gap-2 max-md:px-2.5"
		>
			<ZaurMark unread={0} label="Settings" />
			<div class="h-4 w-px bg-slate-200 max-md:hidden"></div>
			<a href="/" class="btn-tactile gap-1.5" data-sveltekit-preload-data="hover">
				<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				Mail
			</a>
			<h1 class="text-[13px] font-semibold text-slate-800 max-md:hidden">Settings</h1>

			<!-- The same segmented control the top bar uses for its sections. -->
			<nav
				class="ml-auto flex items-center rounded-[6px] border border-[#cbd5e1] bg-white p-0.5 shadow-2xs"
				aria-label="Settings sections"
			>
				{#each tabs as tab (tab.href)}
					<a
						href={tab.href}
						aria-current={current.href === tab.href ? 'page' : undefined}
						data-sveltekit-preload-data="hover"
						class="flex h-[26px] items-center rounded-[4px] px-2.5 text-[12px] transition-colors {current.href ===
						tab.href
							? 'bg-slate-100 font-semibold text-slate-900'
							: 'font-medium text-slate-500 hover:text-slate-900'}"
					>
						{tab.label}
					</a>
				{/each}
			</nav>
		</header>

		<div class="min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4 max-md:py-4">
			<div class="mx-auto flex max-w-[640px] flex-col gap-6">
				{@render children()}
			</div>
		</div>
	</div>
</div>
