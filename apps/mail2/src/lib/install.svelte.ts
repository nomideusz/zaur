/**
 * Installing the app. Chromium fires `beforeinstallprompt` once per page load,
 * soon after it, and only while the app is not installed — so the listener is
 * attached when this module first loads (the root layout imports it) and the
 * event is kept for whoever offers the button later (Settings).
 *
 * Safari has no such event: on an iPhone or iPad the only way in is Share →
 * Add to Home Screen, so `ios` says when to show that sentence instead.
 */
type InstallPromptEvent = Event & {
	prompt(): Promise<unknown>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** An iPhone or iPad (iPadOS calls itself a Mac) in a browser tab, not yet on the Home Screen. */
export function isIosTab(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	return ios && !matchMedia('(display-mode: standalone)').matches;
}

class Install {
	#event = $state.raw<InstallPromptEvent | null>(null);

	/** The browser will show its install dialog if asked. */
	get available(): boolean {
		return this.#event !== null;
	}

	/** iOS Safari, not installed: there is no dialog to open, only instructions to give. */
	readonly ios = isIosTab();

	/** Open the browser's install dialog. Resolves true when the person accepted. */
	async prompt(): Promise<boolean> {
		const event = this.#event;
		if (!event) return false;
		// The event is good for one prompt; the browser fires a new one if it was dismissed.
		this.#event = null;
		await event.prompt();
		return (await event.userChoice).outcome === 'accepted';
	}

	constructor() {
		if (typeof window === 'undefined') return;
		window.addEventListener('beforeinstallprompt', (event) => {
			// Keeps Chrome's own mini-infobar away; the app offers the button itself.
			event.preventDefault();
			this.#event = event as InstallPromptEvent;
		});
		window.addEventListener('appinstalled', () => (this.#event = null));
	}
}

export const install = new Install();
