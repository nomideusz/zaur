<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowLeft } from 'lucide-svelte';
	import SettingsDetailToggle from '$lib/components/settings/SettingsDetailToggle.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { settingsNavLinks, isSettingsNavActive } from '$lib/settings/nav';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	let { children } = $props();

	const mailHref = $derived(settings.preferredMailHref());
	const links = $derived(settingsNavLinks(settings.settingsDetailLevel));

	const sections = $derived([
		{ id: 'personal', label: 'Personal' },
		{ id: 'mail', label: 'Behavior' },
		{ id: 'customize', label: 'Customize' },
		...(settings.settingsDetailLevel === 'advanced' ? [{ id: 'advanced', label: 'More' }] : [])
	] as const);

	function linksForSection(sectionId: string) {
		return links.filter((link) => link.section === sectionId);
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
	<header class="md:hidden">
		{#if !settings.hideSettingsBackLink}
			<a
				href={mailHref}
				class="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
			>
				<ArrowLeft class="size-4" aria-hidden="true" />
				Back to mail
			</a>
		{/if}
		{#if !settings.hideSettingsPageTitle}
			<div class="mb-3 flex items-center justify-between gap-3">
				<h1 class="text-lg font-semibold text-fg">Settings</h1>
				<SettingsDetailToggle />
			</div>
		{:else}
			<div class="mb-3 flex justify-end">
				<SettingsDetailToggle />
			</div>
		{/if}
		<div class="mb-3">
			<SettingsSearch />
		</div>
		<nav class="flex flex-col gap-3 pb-1">
			{#each sections as section}
				{@const sectionLinks = linksForSection(section.id)}
				{#if sectionLinks.length > 0}
					<div>
						<p class="mb-1 px-1 text-[10px] font-medium tracking-wide text-fg-subtle uppercase">
							{section.label}
						</p>
						<div class="flex gap-1 overflow-x-auto">
							{#each sectionLinks as link}
								<a
									href={link.href}
									class={cn(
										'shrink-0 rounded-md text-sm transition-colors',
										settings.compactSettingsNav ? 'px-2.5 py-1.5' : 'px-3 py-2',
										isSettingsNavActive($page.url.pathname, link.href)
											? 'bg-surface-sunken font-medium text-fg'
											: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
									)}
								>
									{link.label}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</nav>
	</header>

	<aside class="hidden w-56 shrink-0 md:block lg:w-60">
		{#if !settings.hideSettingsBackLink}
			<a
				href={mailHref}
				class="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
			>
				<ArrowLeft class="size-4" aria-hidden="true" />
				Back to mail
			</a>
		{/if}
		{#if !settings.hideSettingsPageTitle}
			<h1 class="mb-4 text-lg font-semibold text-fg lg:text-xl">Settings</h1>
		{/if}
		<div class="mb-4">
			<SettingsSearch />
		</div>
		<nav class="space-y-5">
			{#each sections as section}
				{@const sectionLinks = linksForSection(section.id)}
				{#if sectionLinks.length > 0}
					<div>
						<p class="mb-1.5 px-3 text-[10px] font-medium tracking-wide text-fg-subtle uppercase">
							{section.label}
						</p>
						<div class="space-y-0.5">
							{#each sectionLinks as link}
								<a
									href={link.href}
									class={cn(
										'block rounded-md px-3 transition-colors',
										settings.compactSettingsNav ? 'py-1.5' : 'py-2',
										isSettingsNavActive($page.url.pathname, link.href)
											? 'bg-surface-sunken'
											: 'hover:bg-surface-sunken'
									)}
								>
									<span
										class={cn(
											'block text-sm',
											isSettingsNavActive($page.url.pathname, link.href)
												? 'font-medium text-fg'
												: 'text-fg'
										)}
									>
										{link.label}
									</span>
									{#if !settings.hideSettingsNavHints}
										<span class="block text-xs text-fg-muted">{link.hint}</span>
									{/if}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</nav>
		{#if settings.settingsDetailLevel === 'basic'}
			<p class="mt-4 px-3 text-xs text-fg-subtle">
				Switch to <strong class="font-medium text-fg-muted">All options</strong> in any section for fine-tuning.
			</p>
		{/if}
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
