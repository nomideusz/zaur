<script lang="ts">
	import { page } from '$app/stores';
	import {
		Calendar,
		Database,
		Inbox,
		LayoutTemplate,
		Mail,
		Palette,
		PencilLine,
		Settings as SettingsIcon,
		User,
		type Icon as LucideIcon
	} from 'lucide-svelte';
	import { isSettingsNavActive, type SettingsNavIcon, type SettingsNavLink } from '$lib/settings/nav';
	import { settings } from '$lib/stores/settings.svelte';
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

	const ICON_MAP: Record<SettingsNavIcon, typeof LucideIcon> = {
		account: User,
		general: SettingsIcon,
		inbox: Inbox,
		reading: Mail,
		writing: PencilLine,
		appearance: Palette,
		layout: LayoutTemplate,
		calendar: Calendar,
		backup: Database
	};

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
						{@const Icon = ICON_MAP[link.icon]}
						<li>
							<a
								href={link.href}
								class={cn(
									'flex items-center gap-2 rounded-sm px-2 py-2 text-sm transition-colors',
									isSettingsNavActive($page.url.pathname, link.href)
										? 'z-surface-active'
										: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
								)}
								aria-current={isSettingsNavActive($page.url.pathname, link.href)
									? 'page'
									: undefined}
								onclick={onNavigate}
							>
								{#if !settings.compactSettingsNav}
									<Icon class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
								{/if}
								<span class="truncate">{link.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/each}
</div>
