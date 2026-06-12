import type { Component } from 'svelte';
import Calendar from '$lib/components/icons/Calendar.svelte';
import Mail from '$lib/components/icons/Mail.svelte';
import Search from '$lib/components/icons/Search.svelte';
import Settings from '$lib/components/icons/Settings.svelte';
import Users from '$lib/components/icons/Users.svelte';
import { isMailPath } from '$lib/mail/routes';
import { calendar } from '$lib/stores/calendar.svelte';
import { settings } from '$lib/stores/settings.svelte';

export type AppNavItem = {
	id: string;
	href: string;
	label: string;
	icon: Component;
	isActive: (path: string) => boolean;
};

/**
 * Single source of truth for top-level app navigation (Mail, Contacts,
 * Calendar). Consumed by the desktop header switcher and the mobile bottom nav
 * so both stay in sync. Settings is intentionally excluded — it lives in the
 * account/avatar menu, not the app switcher. Call inside a reactive context —
 * it reads the calendar/settings stores.
 */
export function appNavItems(): AppNavItem[] {
	return [
		{
			id: 'mail',
			href: settings.preferredMailHref(),
			label: 'Mail',
			icon: Mail,
			isActive: (path) => isMailPath(path)
		},
		{
			id: 'contacts',
			href: '/contacts',
			label: 'Contacts',
			icon: Users,
			isActive: (path) => path.startsWith('/contacts')
		},
		...(calendar.supported !== false
			? [
					{
						id: 'calendar',
						href: '/calendar',
						label: 'Calendar',
						icon: Calendar,
						isActive: (path: string) => path.startsWith('/calendar')
					}
				]
			: [])
	];
}

/**
 * App switcher items plus the Search/Settings utilities the mobile island
 * appends — one list so the island nav and its collapsed-pill glyph agree.
 * Search lives under /mail/*, so Mail is suppressed while searching.
 */
export function mobileNavItems(): AppNavItem[] {
	return [
		...appNavItems(),
		{
			id: 'search',
			href: '/mail/search',
			label: 'Search',
			icon: Search,
			isActive: (path) => path.startsWith('/mail/search')
		},
		{
			id: 'settings',
			href: '/settings/account',
			label: 'Settings',
			icon: Settings,
			isActive: (path) => path.startsWith('/settings')
		}
	];
}

/** The mobile nav item that's active for `path`, if any. */
export function activeMobileNavItem(path: string): AppNavItem | undefined {
	const items = mobileNavItems();
	const onSearch = path.startsWith('/mail/search');
	return items.find((item) => (item.id === 'mail' && onSearch ? false : item.isActive(path)));
}

