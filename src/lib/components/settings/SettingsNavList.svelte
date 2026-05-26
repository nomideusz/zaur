<script lang="ts">
	import { page } from '$app/stores';
	import { settings } from '$lib/stores/settings.svelte';
	import { isSettingsNavActive, type SettingsNavLink } from '$lib/settings/nav';
	import { cn } from '$lib/utils/cn';

	let {
		links,
		sections,
		onNavigate
	}: {
		links: SettingsNavLink[];
		sections: readonly { id: string; label: string }[];
		onNavigate?: () => void;
	} = $props();

	function linksForSection(sectionId: string) {
		return links.filter((link) => link.section === sectionId);
	}
</script>

<nav class="space-y-4">
	{#each sections as section}
		{@const sectionLinks = linksForSection(section.id)}
		{#if sectionLinks.length > 0}
			<div>
				<p class="mb-1.5 px-3 text-xs font-medium tracking-wide text-fg-subtle uppercase">
					{section.label}
				</p>
				<div class="space-y-0.5">
					{#each sectionLinks as link (link.href)}
						<a
							href={link.href}
							class={cn(
								'flex min-h-11 items-center rounded-lg px-3 transition-colors',
								settings.compactSettingsNav ? 'py-2' : 'py-2.5',
								isSettingsNavActive($page.url.pathname, link.href)
									? 'bg-surface-sunken'
									: 'hover:bg-surface-sunken active:bg-surface-sunken'
							)}
							aria-current={isSettingsNavActive($page.url.pathname, link.href) ? 'page' : undefined}
							onclick={onNavigate}
						>
							<div class="min-w-0 flex-1">
								<span
									class={cn(
										'block text-sm',
										isSettingsNavActive($page.url.pathname, link.href)
											? 'font-semibold text-fg'
											: 'font-medium text-fg'
									)}
								>
									{link.label}
								</span>
								{#if !settings.hideSettingsNavHints}
									<span class="block truncate text-xs text-fg-muted">{link.hint}</span>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</nav>
