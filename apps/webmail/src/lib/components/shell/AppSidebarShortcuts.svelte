<script lang="ts">
	import { Calendar, Mail, Settings, Users } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		/** When true, omit Settings and put Mail first (settings sidebar). */
		inSettings?: boolean;
	}

	let { inSettings = false }: Props = $props();

	const items = $derived(
		inSettings
			? [
					{
						href: settings.preferredMailHref(),
						label: 'Mail',
						icon: Mail,
						active: $page.url.pathname.startsWith('/mail')
					},
					...(!settings.mailOnlyNavigation && calendar.supported !== false
						? [
								{
									href: '/calendar',
									label: 'Calendar',
									icon: Calendar,
									active: $page.url.pathname.startsWith('/calendar')
								}
							]
						: []),
					...(!settings.mailOnlyNavigation
						? [
								{
									href: '/contacts',
									label: 'Contacts',
									icon: Users,
									active: $page.url.pathname.startsWith('/contacts')
								}
							]
						: [])
				]
			: [
					...(!settings.mailOnlyNavigation
						? [
								{
									href: '/contacts',
									label: 'Contacts',
									icon: Users,
									active: $page.url.pathname.startsWith('/contacts')
								}
							]
						: []),
					...(!settings.mailOnlyNavigation && calendar.supported !== false
						? [
								{
									href: '/calendar',
									label: 'Calendar',
									icon: Calendar,
									active: $page.url.pathname.startsWith('/calendar')
								}
							]
						: []),
					{
						href: '/settings/account',
						label: 'Settings',
						icon: Settings,
						active: $page.url.pathname.startsWith('/settings')
					}
				]
	);
</script>

{#if !settings.hideSidebarShortcuts && items.length > 0}
	<div
		class={cn(
			'shrink-0 space-y-0.5',
			!settings.hidePaneBorders && 'border-t border-border/80',
			settings.compactFolderSidebar ? 'p-1.5' : settings.compactSidebarShortcuts ? 'p-2' : 'p-2.5'
		)}
	>
		{#each items as item (item.href)}
			{@const Icon = item.icon}
			<a
				href={item.href}
				aria-current={item.active ? 'page' : undefined}
				class={cn(
					'flex items-center gap-2 rounded-sm px-3 text-sm transition-colors',
					settings.compactSidebarShortcuts ? 'py-1.5' : 'py-2',
					item.active
						? 'z-surface-active'
						: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
				)}
			>
				<Icon class="size-4 shrink-0" aria-hidden="true" />
				{item.label}
			</a>
		{/each}
	</div>
{/if}
