<script lang="ts">
	import Calendar from '$lib/components/icons/Calendar.svelte';
	import Mail from '$lib/components/icons/Mail.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import Users from '$lib/components/icons/Users.svelte';
	import { page } from '$app/stores';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { isMailPath } from '$lib/mail/routes';
	import { cn } from '$lib/utils/cn';

	interface Props {
		/** When true, omit Settings and put Mail first (settings sidebar). */
		inSettings?: boolean;
		hideApps?: boolean;
	}

	let { inSettings = false, hideApps = false }: Props = $props();

	const items = $derived(
		inSettings
			? [
					{
						href: settings.preferredMailHref(),
						label: 'Mail',
						icon: Mail,
						active: isMailPath($page.url.pathname)
					},
					...(!hideApps && calendar.supported !== false
						? [
								{
									href: '/calendar',
									label: 'Calendar',
									icon: Calendar,
									active: $page.url.pathname.startsWith('/calendar')
								}
							]
						: []),
					...(!hideApps
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
					...(!hideApps
						? [
								{
									href: '/contacts',
									label: 'Contacts',
									icon: Users,
									active: $page.url.pathname.startsWith('/contacts')
								}
							]
						: []),
					...(!hideApps && calendar.supported !== false
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

{#if items.length > 0}
	<div
		class={cn(
			'shrink-0 space-y-0.5',
			'border-t border-border/80',
			'p-2'
		)}
	>
		{#each items as item (item.href)}
			{@const Icon = item.icon}
			<a
				href={item.href}
				aria-current={item.active ? 'page' : undefined}
				class={cn(
					'flex items-center gap-2 rounded-md px-3 text-sm transition-colors',
					'py-2',
					item.active
						? 'z-surface-active font-medium'
						: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
				)}
			>
				<Icon class="size-4 shrink-0" aria-hidden="true" />
				{item.label}
			</a>
		{/each}
	</div>
{/if}
