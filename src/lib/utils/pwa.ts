import { browser } from '$app/environment';

const INSTALL_DISMISS_KEY = 'zaur:pwa-install-dismissed-at';
const INSTALL_DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isStandalone(): boolean {
	if (!browser) return false;

	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		window.matchMedia('(display-mode: window-controls-overlay)').matches ||
		// Safari iOS
		(navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}

export function isIos(): boolean {
	if (!browser) return false;
	return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isInstallDismissed(): boolean {
	if (!browser) return true;

	try {
		const raw = localStorage.getItem(INSTALL_DISMISS_KEY);
		if (!raw) return false;

		const dismissedAt = Number(raw);
		if (!Number.isFinite(dismissedAt)) return false;

		const ageMs = Date.now() - dismissedAt;
		return ageMs < INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
	} catch {
		return false;
	}
}

export function dismissInstallPrompt(): void {
	if (!browser) return;

	try {
		localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
	} catch {
		// Ignore storage failures
	}
}

export function clearInstallDismissal(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(INSTALL_DISMISS_KEY);
	} catch {
		// Ignore storage failures
	}
}

export type { BeforeInstallPromptEvent };
