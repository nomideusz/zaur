import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';
import {
	isCircadianDark,
	sampleCircadian,
	startCircadian,
	stopCircadianTheme
} from '@zaur/ui/circadian';

export type ThemeMode = 'circadian' | 'light' | 'dark';

function readStoredTheme(): ThemeMode {
	if (!browser) return 'circadian';
	const saved = localStorage.getItem('zaur-theme');
	if (saved === 'circadian' || saved === 'light' || saved === 'dark') return saved;
	if (saved === 'system') return 'circadian';
	return 'circadian';
}

class ThemeStore {
	/** User preference: automatic (circadian), fixed light, or fixed dark. */
	mode = $state<ThemeMode>(readStoredTheme());
	/** Resolved appearance for email rendering and UI that needs a binary light/dark. */
	resolved = $state<'light' | 'dark'>('light');

	private stopCircadian: (() => void) | null = null;

	init() {
		if (!browser) return;
		this.mode = readStoredTheme();
		this.applyMode();
		this.clearLegacyAccentPreference();
	}

	set(value: ThemeMode) {
		this.mode = value;
		if (browser) {
			localStorage.setItem('zaur-theme', value);
			scheduleAccountSettingsPush();
		}
		this.applyMode();
	}

	private applyMode() {
		if (!browser) return;

		this.stopCircadian?.();
		this.stopCircadian = null;

		const el = document.documentElement;

		if (this.mode === 'circadian') {
			this.stopCircadian = startCircadian({
				onTick: (sample) => {
					this.resolved = isCircadianDark(sample) ? 'dark' : 'light';
				}
			});
			const sample = sampleCircadian();
			this.resolved = isCircadianDark(sample) ? 'dark' : 'light';
			return;
		}

		stopCircadianTheme(el);
		this.resolved = this.mode === 'dark' ? 'dark' : 'light';
		el.classList.toggle('dark', this.resolved === 'dark');
		el.classList.toggle('light', this.resolved === 'light');
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
