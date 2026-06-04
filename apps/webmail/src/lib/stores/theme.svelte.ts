import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';

export type ThemeMode = 'light' | 'dark' | 'system';

function readStoredTheme(): ThemeMode {
	if (!browser) return 'system';
	const saved = localStorage.getItem('zaur-theme');
	if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
	return 'system';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
	if (!browser || mode !== 'system') return mode === 'dark' ? 'dark' : 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

class ThemeStore {
	/** User preference: light, dark, or follow system. */
	mode = $state<ThemeMode>(readStoredTheme());
	/** Resolved appearance applied to the document. */
	resolved = $state<'light' | 'dark'>(resolveTheme(readStoredTheme()));

	private mediaQuery: MediaQueryList | null = null;
	private onSystemChange = () => {
		if (this.mode !== 'system') return;
		this.resolved = resolveTheme('system');
		this.applyResolved();
	};

	init() {
		if (!browser) return;

		this.mode = readStoredTheme();
		this.resolved = resolveTheme(this.mode);
		this.mediaQuery?.removeEventListener('change', this.onSystemChange);
		this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		this.mediaQuery.addEventListener('change', this.onSystemChange);
		this.applyResolved();
		this.clearLegacyAccentPreference();
	}

	toggle() {
		this.set(this.resolved === 'light' ? 'dark' : 'light');
	}

	set(value: ThemeMode) {
		this.mode = value;
		this.resolved = resolveTheme(value);
		if (browser) {
			localStorage.setItem('zaur-theme', value);
			scheduleAccountSettingsPush();
		}
		this.applyResolved();
	}

	private applyResolved() {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', this.resolved === 'dark');
		document.documentElement.classList.toggle('light', this.resolved === 'light');
	}

	private clearLegacyAccentPreference() {
		if (!browser) return;
		document.documentElement.removeAttribute('data-accent');
		try {
			localStorage.removeItem('zaur:accent-color');
		} catch {
			// Ignore storage errors in private mode.
		}
	}
}

export const theme = new ThemeStore();
