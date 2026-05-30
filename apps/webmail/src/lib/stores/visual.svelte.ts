import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';
import {
	applyVisualPreferences,
	readAccentColor,
	VISUAL_STORAGE,
	type AccentColor
} from '$lib/theme/visual';

class VisualStore {
	accentColor = $state<AccentColor>(readAccentColor());

	init() {
		if (!browser) return;

		this.accentColor = readAccentColor();
		this.apply();
	}

	setAccentColor(value: AccentColor) {
		this.accentColor = value;
		if (browser) {
			localStorage.setItem(VISUAL_STORAGE.accentColor, value);
			scheduleAccountSettingsPush();
		}
		this.apply();
	}

	resetToDefaults() {
		this.setAccentColor('charcoal');
	}

	private apply() {
		if (!browser) return;
		applyVisualPreferences(document.documentElement, {
			accentColor: this.accentColor
		});
	}
}

export const visual = new VisualStore();
