import { browser } from '$app/environment';

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
	theme = $state<ThemeMode>(readStoredTheme());
	resolved = $state<'light' | 'dark'>(resolveTheme(readStoredTheme()));

	private mediaQuery: MediaQueryList | null = null;
	private onSystemChange = () => {
		if (this.theme !== 'system') return;
		this.resolved = resolveTheme('system');
		this.applyResolved();
	};

	init() {
		if (!browser) return;

		this.theme = readStoredTheme();
		this.resolved = resolveTheme(this.theme);
		this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		this.mediaQuery.addEventListener('change', this.onSystemChange);
		this.applyResolved();
	}

	toggle() {
		this.set(this.resolved === 'light' ? 'dark' : 'light');
	}

	set(value: ThemeMode) {
		this.theme = value;
		this.resolved = resolveTheme(value);
		if (browser) {
			localStorage.setItem('zaur-theme', value);
		}
		this.applyResolved();
	}

	private applyResolved() {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', this.resolved === 'dark');
	}
}

export const theme = new ThemeStore();
