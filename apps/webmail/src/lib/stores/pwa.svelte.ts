import { browser } from '$app/environment';
import {
	clearInstallDismissal,
	dismissInstallPrompt,
	isInstallDismissed,
	isIos,
	isStandalone,
	type BeforeInstallPromptEvent
} from '$lib/utils/pwa';

class PwaStore {
	canInstall = $state(false);
	isInstalled = $state(false);
	showIosHint = $state(false);
	showPrompt = $state(false);
	private deferredPrompt: BeforeInstallPromptEvent | null = null;
	private initialized = false;

	init() {
		if (!browser || this.initialized) return;
		this.initialized = true;

		this.refreshInstalledState();

		window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
		window.addEventListener('appinstalled', this.onAppInstalled);

		if (isIos() && !this.isInstalled && !isInstallDismissed()) {
			this.showIosHint = true;
			this.showPrompt = true;
		}
	}

	destroy() {
		if (!browser) return;

		window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
		window.removeEventListener('appinstalled', this.onAppInstalled);
		this.initialized = false;
	}

	refreshInstalledState() {
		this.isInstalled = isStandalone();
		document.documentElement.classList.toggle('z-standalone', this.isInstalled);
		if (this.isInstalled) {
			this.canInstall = false;
			this.showPrompt = false;
			this.showIosHint = false;
			this.deferredPrompt = null;
		}
	}

	private onBeforeInstallPrompt = (event: Event) => {
		event.preventDefault();
		this.deferredPrompt = event as BeforeInstallPromptEvent;

		if (isInstallDismissed()) {
			this.canInstall = true;
			this.showPrompt = false;
			return;
		}

		this.canInstall = true;
		this.showPrompt = true;
	};

	private onAppInstalled = () => {
		this.isInstalled = true;
		document.documentElement.classList.add('z-standalone');
		this.canInstall = false;
		this.showPrompt = false;
		this.showIosHint = false;
		this.deferredPrompt = null;
		clearInstallDismissal();
	};

	async install(): Promise<boolean> {
		if (!this.deferredPrompt) return false;

		await this.deferredPrompt.prompt();
		const choice = await this.deferredPrompt.userChoice;
		this.deferredPrompt = null;

		if (choice.outcome === 'accepted') {
			this.canInstall = false;
			this.showPrompt = false;
			return true;
		}

		return false;
	}

	dismissPrompt() {
		dismissInstallPrompt();
		this.showPrompt = false;
		this.showIosHint = false;
	}

	showInstallPromptAgain() {
		clearInstallDismissal();
		if (this.deferredPrompt || (isIos() && !this.isInstalled)) {
			this.showPrompt = true;
			if (isIos()) this.showIosHint = true;
		}
	}
}

export const pwa = new PwaStore();
