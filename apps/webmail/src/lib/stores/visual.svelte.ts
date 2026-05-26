import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';
import {
	applyVisualPreferences,
	readAccentColor,
	readCornerStyle,
	readSurfaceStyle,
	VISUAL_STORAGE,
	type AccentColor,
	type CornerStyle,
	type SurfaceStyle
} from '$lib/theme/visual';

class VisualStore {
	accentColor = $state<AccentColor>(readAccentColor());
	cornerStyle = $state<CornerStyle>(readCornerStyle());
	surfaceStyle = $state<SurfaceStyle>(readSurfaceStyle());

	init() {
		if (!browser) return;

		this.accentColor = readAccentColor();
		this.cornerStyle = readCornerStyle();
		this.surfaceStyle = readSurfaceStyle();
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

	setCornerStyle(value: CornerStyle) {
		this.cornerStyle = value;
		if (browser) {
			localStorage.setItem(VISUAL_STORAGE.cornerStyle, value);
			scheduleAccountSettingsPush();
		}
		this.apply();
	}

	setSurfaceStyle(value: SurfaceStyle) {
		this.surfaceStyle = value;
		if (browser) {
			localStorage.setItem(VISUAL_STORAGE.surfaceStyle, value);
			scheduleAccountSettingsPush();
		}
		this.apply();
	}

	resetToDefaults() {
		this.setAccentColor('blue');
		this.setCornerStyle('default');
		this.setSurfaceStyle('default');
	}

	private apply() {
		if (!browser) return;
		applyVisualPreferences(document.documentElement, {
			accentColor: this.accentColor,
			cornerStyle: this.cornerStyle,
			surfaceStyle: this.surfaceStyle
		});
	}
}

export const visual = new VisualStore();
