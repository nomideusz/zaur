import { browser } from '$app/environment';

export type ListDensity = 'comfortable' | 'compact';

const STORAGE = {
	blockExternal: 'zaur:block-external',
	listDensity: 'zaur:list-density',
	markAsReadOnOpen: 'zaur:mark-read-on-open',
	displayName: (email: string) => `zaur:display-name:${email}`
} as const;

const LIST_ROW_HEIGHT: Record<ListDensity, string> = {
	comfortable: '4.25rem',
	compact: '3rem'
};

function readBlockExternal(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.blockExternal) !== 'false';
}

function readListDensity(): ListDensity {
	if (!browser) return 'comfortable';
	return localStorage.getItem(STORAGE.listDensity) === 'compact' ? 'compact' : 'comfortable';
}

function readMarkAsReadOnOpen(): boolean {
	if (!browser) return true;
	return localStorage.getItem(STORAGE.markAsReadOnOpen) !== 'false';
}

function readDisplayName(email: string | null): string {
	if (!browser || !email) return '';
	return localStorage.getItem(STORAGE.displayName(email)) ?? '';
}

class SettingsStore {
	blockExternalContent = $state(readBlockExternal());
	listDensity = $state<ListDensity>(readListDensity());
	markAsReadOnOpen = $state(readMarkAsReadOnOpen());
	displayName = $state('');

	private userEmail: string | null = null;

	init() {
		this.blockExternalContent = readBlockExternal();
		this.listDensity = readListDensity();
		this.markAsReadOnOpen = readMarkAsReadOnOpen();
		this.applyListDensity(this.listDensity);
	}

	setUser(email: string | null) {
		this.userEmail = email;
		this.displayName = readDisplayName(email);
	}

	resolvedDisplayName(fallback?: string | null): string {
		const trimmed = this.displayName.trim();
		if (trimmed) return trimmed;
		const fromFallback = fallback?.trim();
		return fromFallback || 'User';
	}

	setBlockExternalContent(value: boolean) {
		this.blockExternalContent = value;
		if (browser) {
			localStorage.setItem(STORAGE.blockExternal, String(value));
		}
	}

	setListDensity(value: ListDensity) {
		this.listDensity = value;
		if (browser) {
			localStorage.setItem(STORAGE.listDensity, value);
		}
		this.applyListDensity(value);
	}

	setMarkAsReadOnOpen(value: boolean) {
		this.markAsReadOnOpen = value;
		if (browser) {
			localStorage.setItem(STORAGE.markAsReadOnOpen, String(value));
		}
	}

	setDisplayName(value: string) {
		this.displayName = value;
		if (!browser || !this.userEmail) return;

		const trimmed = value.trim();
		if (trimmed) {
			localStorage.setItem(STORAGE.displayName(this.userEmail), trimmed);
		} else {
			localStorage.removeItem(STORAGE.displayName(this.userEmail));
		}
	}

	private applyListDensity(value: ListDensity) {
		if (!browser) return;
		document.documentElement.style.setProperty('--z-list-row', LIST_ROW_HEIGHT[value]);
	}
}

export const settings = new SettingsStore();
