import { browser } from '$app/environment';
import type { MailViewMode } from '$lib/mail/view-mode';
import { MAIL_VIEW_MODE_LABELS } from '$lib/mail/view-mode';

/** Where to land after a mode switch so layout always starts from a stable entry point. */
export function mailViewModeSwitchLanding(pathname: string): string {
	if (pathname.startsWith('/settings')) return '/settings';
	if (pathname.startsWith('/mail')) return '/mail/inbox';
	return '/mail/inbox';
}

export function mailViewModeSwitchMessage(mode: MailViewMode): string {
	const label = MAIL_VIEW_MODE_LABELS[mode];
	return `Switch to ${label} mode? The app will reload with a different layout and settings experience.`;
}
