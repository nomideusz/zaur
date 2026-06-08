import type { Component } from 'svelte';
import Calendar from '$lib/components/icons/Calendar.svelte';
import Mail from '$lib/components/icons/Mail.svelte';
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
 * Calendar, Settings). Consumed by the desktop header switcher and the mobile
 * bottom nav so both stay in sync. Call inside a reactive context — it reads
 * the calendar/settings stores.
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
			: []),
		{
			id: 'settings',
			href: '/settings/account',
			label: 'Settings',
			icon: Settings,
			isActive: (path) => path.startsWith('/settings')
		}
	];
}
