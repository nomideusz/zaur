import type { Component } from 'svelte';
import Calendar from '$lib/components/icons/Calendar.svelte';
import FileText from '$lib/components/icons/FileText.svelte';
import Mail from '$lib/components/icons/Mail.svelte';
import Users from '$lib/components/icons/Users.svelte';
import { isMailPath } from '$lib/mail/routes';
import { calendar } from '$lib/stores/calendar.svelte';
import { files } from '$lib/stores/files.svelte';
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
 * Calendar, Files). Consumed by the desktop header switcher and the
 * mobile drawer's UserMenu so both stay in sync. Settings is intentionally excluded — it lives in the
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
			: []),
		...(files.supported !== false
			? [
					{
						id: 'files',
						href: '/files',
						label: 'Files',
						icon: FileText,
						isActive: (path: string) => path.startsWith('/files')
					}
				]
			: [])
	];
}

export type TopSearchSection = {
	id: 'mail' | 'calendar' | 'contacts' | 'files';
	placeholder: string;
	/** Route that renders this section's search results (the bar drives its ?q). */
	searchPath: string;
	/** Where clearing the search returns to. */
	homePath: string;
};

/**
 * Sections that render the shared mobile top search bar. The bar is the single
 * search input — it drives the section's results route via ?q and persists across
 * the list → results transition, so there's never a second, different-looking
 * field. Settings owns a richer inline search combobox and opts out here.
 */
export function topSearchSection(path: string): TopSearchSection | undefined {
	if (path.startsWith('/calendar')) {
		return {
			id: 'calendar',
			placeholder: 'Search events',
			searchPath: '/calendar/search',
			homePath: '/calendar'
		};
	}
	if (path.startsWith('/files')) {
		return {
			id: 'files',
			placeholder: 'Search files',
			searchPath: '/files/search',
			homePath: '/files'
		};
	}
	if (path.startsWith('/contacts')) {
		return {
			id: 'contacts',
			placeholder: 'Search contacts',
			searchPath: '/contacts/search',
			homePath: '/contacts'
		};
	}
	if (path === '/' || isMailPath(path)) {
		return {
			id: 'mail',
			placeholder: 'Search all mail',
			searchPath: '/mail/search',
			homePath: settings.preferredMailHref()
		};
	}
	return undefined;
}

/** True when `path` is a section's search-results route (the bar owns its ?q there). */
export function isSectionSearchRoute(path: string): boolean {
	return (
		path === '/mail/search' ||
		path === '/contacts/search' ||
		path === '/calendar/search' ||
		path === '/files/search'
	);
}

/**
 * Focused views suppress the *search* chrome in the mobile top bar.
 * Thread/compose still show the top bar (back control) via MobileTopBar.showBar;
 * only the searchable filter/account row is replaced.
 */
export function topSearchSuppressed(path: string): boolean {
	if (path.startsWith('/mail/compose')) return true;
	// Mail thread reader is a focused full-screen view on mobile.
	if (/^\/mail\/[^/]+\/[^/]+/.test(path)) return true;
	return false;
}

