import { browser } from '$app/environment';

function readTheme(): 'light' | 'dark' {
	if (!browser) return 'light';
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

class ThemeStore {
	theme = $state<'light' | 'dark'>(readTheme());

	toggle() {
		this.theme = this.theme === 'light' ? 'dark' : 'light';
		this.apply();
	}

	set(value: 'light' | 'dark') {
		this.theme = value;
		this.apply();
	}

	private apply() {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', this.theme === 'dark');
		localStorage.setItem('zaur-theme', this.theme);
	}

	init() {
		if (!browser) return;
		const saved = localStorage.getItem('zaur-theme');
		if (saved === 'light' || saved === 'dark') {
			this.theme = saved;
		} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			this.theme = 'dark';
		}
		this.apply();
	}
}

export const theme = new ThemeStore();
