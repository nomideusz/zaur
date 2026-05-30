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
				<p class={cn('z-type-label mb-1.5 px-2', isMobile && 'text-[11px]')}>{section.label}</p>
				<ul class={cn(isMobile && 'overflow-hidden rounded-lg border border-border bg-surface-raised divide-y divide-border')}>
					{#each sectionLinks as link (link.href)}
						{@const Icon = ICON_MAP[link.icon]}
						<li>
							<a
								href={link.href}
								class={cn(
									'flex items-center gap-3 transition-colors',
									isMobile
										? 'min-h-12 px-4 py-3 text-base'
										: 'gap-2 rounded-sm px-2 py-2 text-sm',
									isSettingsNavActive($page.url.pathname, link.href)
										? isMobile
											? 'bg-accent/10 font-medium text-fg'
											: 'z-surface-active'
										: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
								)}
								aria-current={isSettingsNavActive($page.url.pathname, link.href)
									? 'page'
									: undefined}
								onclick={onNavigate}
							>
								{#if !settings.compactSettingsNav || isMobile}
									<Icon
										class={cn(
											'shrink-0 text-fg-subtle',
											isMobile ? 'size-5' : 'size-4'
										)}
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
