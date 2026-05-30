<script lang="ts">
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import { page } from '$app/stores';
	import Calendar from '$lib/components/icons/Calendar.svelte';
	import Database from '$lib/components/icons/Database.svelte';
	import Inbox from '$lib/components/icons/Inbox.svelte';
	import LayoutTemplate from '$lib/components/icons/LayoutTemplate.svelte';
	import Mail from '$lib/components/icons/Mail.svelte';
	import Palette from '$lib/components/icons/Palette.svelte';
	import PencilLine from '$lib/components/icons/PencilLine.svelte';
	import SettingsIcon from '$lib/components/icons/Settings.svelte';
	import User from '$lib/components/icons/User.svelte';
	type LucideIcon = any;
	import { isSettingsNavActive, type SettingsNavIcon, type SettingsNavLink } from '$lib/settings/nav';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		links,
		sections,
		onNavigate,
		variant = 'sidebar'
	}: {
		links: SettingsNavLink[];
		sections: readonly { id: string; label: string }[];
		onNavigate?: () => void;
		variant?: 'sidebar' | 'mobile';
	} = $props();

	const isMobile = $derived(variant === 'mobile');

	const ICON_MAP: Record<SettingsNavIcon, LucideIcon> = {
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

<div class={cn(isMobile ? 'space-y-5' : 'space-y-4 pt-2')}>
	{#each sections as section}
		{@const sectionLinks = linksForSection(section.id)}
		{#if sectionLinks.length > 0}
			<div>
				<p class={cn('z-type-label z-settings-nav-section', isMobile && 'mb-2')}>{section.label}</p>
				<ul class={cn(isMobile && 'z-settings-list')}>
					{#each sectionLinks as link (link.href)}
						{@const Icon = ICON_MAP[link.icon]}
						{@const active = isSettingsNavActive($page.url.pathname, link.href)}
						<li>
							<a
								href={link.href}
								class={cn(
									'z-settings-nav-link',
									active && 'z-settings-nav-link--active',
									isMobile && 'z-settings-nav-link--mobile'
								)}
								aria-current={active ? 'page' : undefined}
								onclick={onNavigate}
							>
								{#if !settings.compactSettingsNav || isMobile}
									<Icon
										class={cn('shrink-0 text-fg-subtle', isMobile ? 'size-5' : 'size-4')}
										aria-hidden="true"
									/>
								{/if}
								<span class="min-w-0 flex-1 truncate">{link.label}</span>
								{#if isMobile}
									<ChevronRight class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/each}
</div>
