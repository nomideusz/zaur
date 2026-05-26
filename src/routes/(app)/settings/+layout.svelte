<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { ArrowLeft, ChevronDown } from 'lucide-svelte';
	import SettingsDetailToggle from '$lib/components/settings/SettingsDetailToggle.svelte';
	import SettingsNavList from '$lib/components/settings/SettingsNavList.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { settingsNavLinks, isSettingsNavActive } from '$lib/settings/nav';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	let { children } = $props();

	let mobileNavOpen = $state(false);

	const mailHref = $derived(settings.preferredMailHref());
	const links = $derived(settingsNavLinks(settings.settingsDetailLevel));

	const sections = $derived([
		{ id: 'personal', label: 'Personal' },
		{ id: 'mail', label: 'Behavior' },
		{ id: 'customize', label: 'Customize' },
		...(settings.settingsDetailLevel === 'advanced' ? [{ id: 'advanced', label: 'More' }] : [])
	] as const);

	const activeLink = $derived(
		links.find((link) => isSettingsNavActive($page.url.pathname, link.href)) ?? null
	);

	afterNavigate(() => {
		mobileNavOpen = false;
	});

	function closeMobileNav() {
		mobileNavOpen = false;
	}
</script>

<div
	class={cn(
		'mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-y-auto xl:max-w-7xl',
		'md:flex-row',
		settings.compactSettingsLayout
			? 'gap-4 px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:gap-6 md:px-6 md:pt-6 md:pb-[max(2.5rem,env(safe-area-inset-bottom))]'
			: 'gap-6 px-5 pt-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:gap-8 md:px-8 md:pt-8 md:pb-[max(3rem,env(safe-area-inset-bottom))] lg:px-10 lg:pt-10 lg:pb-[max(3.5rem,env(safe-area-inset-bottom))]'
	)}
>
	<header
		class={cn(
			'sticky top-0 z-20 border-b border-border bg-surface/95 pb-3 backdrop-blur-sm md:hidden',
			settings.compactSettingsLayout
				? '-mx-4 px-4 pt-4'
				: '-mx-5 px-5 pt-5'
		)}
	>
		{#if !settings.hideSettingsBackLink}
			<a
				href={mailHref}
				class="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
			>
				<ArrowLeft class="size-4" aria-hidden="true" />
				Back to mail
			</a>
		{/if}
		<div class="mb-3 flex items-center justify-between gap-3">
			{#if !settings.hideSettingsPageTitle}
				<h1 class="text-lg font-semibold text-fg">Settings</h1>
			{:else if activeLink}
				<h1 class="truncate text-lg font-semibold text-fg">{activeLink.label}</h1>
			{:else}
				<span class="text-lg font-semibold text-fg">Settings</span>
			{/if}
			<SettingsDetailToggle />
		</div>
		<SettingsSearch />
		<details bind:open={mobileNavOpen} class="group mt-3">
			<summary
				class={cn(
					'flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-3 transition-colors',
					settings.compactSettingsNav ? 'py-2' : 'py-2.5',
					'hover:bg-surface-sunken [&::-webkit-details-marker]:hidden'
				)}
			>
				<div class="min-w-0">
					<p class="text-xs font-medium text-fg-subtle">Section</p>
					<p class="truncate text-sm font-semibold text-fg">
						{activeLink?.label ?? 'Choose a section'}
					</p>
				</div>
				<ChevronDown
					class="size-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
					aria-hidden="true"
				/>
			</summary>
			<div
				class={cn(
					'mt-2 max-h-[min(60vh,24rem)] overflow-y-auto rounded-xl border border-border bg-surface-raised p-2',
					settings.compactSettingsNav ? 'space-y-3' : 'space-y-4'
				)}
			>
				<SettingsNavList {links} {sections} onNavigate={closeMobileNav} />
			</div>
		</details>
		{#if settings.settingsDetailLevel === 'basic'}
			<p class="mt-3 text-xs text-fg-subtle">
				Switch to <strong class="font-medium text-fg-muted">All options</strong> for fine-tuning.
			</p>
		{/if}
	</header>

	<aside class="hidden w-56 shrink-0 md:block lg:w-60">
		<div class="sticky top-6 rounded-lg border border-border bg-surface-raised/90 p-3 shadow-sm">
			{#if !settings.hideSettingsBackLink}
				<a
					href={mailHref}
					class="mb-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
				>
					<ArrowLeft class="size-4" aria-hidden="true" />
					Back to mail
				</a>
			{/if}
			{#if !settings.hideSettingsPageTitle}
				<h1 class="mb-4 px-2 text-lg font-semibold text-fg lg:text-xl">Settings</h1>
			{/if}
			<div class="mb-4">
				<SettingsSearch />
			</div>
			<SettingsNavList {links} {sections} />
			{#if settings.settingsDetailLevel === 'basic'}
				<p class="mt-4 px-3 text-xs text-fg-subtle">
					Switch to <strong class="font-medium text-fg-muted">All options</strong> in any section for fine-tuning.
				</p>
			{/if}
		</div>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col gap-4">
		<div class="hidden md:flex md:justify-end">
			<SettingsDetailToggle />
		</div>
		<div class="min-w-0 flex-1">{@render children()}</div>
		{#if !settings.hideSettingsNavHints}
			<p class="text-center text-xs text-fg-subtle md:text-left">
				Settings sync to your mail account and stay available on other devices. This browser keeps a
				local copy for offline use.
			</p>
		{/if}
	</div>
</div>
