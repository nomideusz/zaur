import { browser } from '$app/environment';
import { settings } from '$lib/stores/settings.svelte';

export function canUseAppBadge(): boolean {
	return browser && 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
}

export async function syncAppBadge(unread: number, enabled = settings.showUnreadAppBadge): Promise<void> {
	if (!canUseAppBadge()) return;

	try {
		if (!enabled || unread <= 0) {
			await navigator.clearAppBadge!();
			return;
		}

		await navigator.setAppBadge!(unread);
	} catch {
		// Badging is optional — ignore unsupported or denied cases
	}
}

export async function clearAppBadge(): Promise<void> {
	if (!canUseAppBadge()) return;

	try {
		await navigator.clearAppBadge!();
	} catch {
		// Ignore
	}
}
