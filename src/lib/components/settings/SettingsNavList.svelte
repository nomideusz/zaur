<script lang="ts">
	import { page } from '$app/stores';
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

<div class="space-y-4 pt-2">
	{#each sections as section}
		{@const sectionLinks = linksForSection(section.id)}
		{#if sectionLinks.length > 0}
			<div>
				<p class="z-type-label mb-1 px-2">{section.label}</p>
				<ul class="space-y-0.5">
					{#each sectionLinks as link (link.href)}
						<li>
							<a
								href={link.href}
								class={cn(
									'block rounded-sm px-2 py-2 text-sm transition-colors',
									isSettingsNavActive($page.url.pathname, link.href)
										? 'z-surface-active'
										: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
								)}
								aria-current={isSettingsNavActive($page.url.pathname, link.href)
									? 'page'
									: undefined}
								onclick={onNavigate}
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/each}
</div>
