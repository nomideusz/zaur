import { browser } from '$app/environment';

const STORAGE_KEY = 'zaur:block-external';

function readBlockExternal(): boolean {
	if (!browser) return true;
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored !== 'false';
}

class SettingsStore {
	blockExternalContent = $state(readBlockExternal());

	setBlockExternalContent(value: boolean) {
		this.blockExternalContent = value;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, String(value));
		}
	}

	init() {
		this.blockExternalContent = readBlockExternal();
	}
}

export const settings = new SettingsStore();
