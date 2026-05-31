import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';

const STORAGE_KEY = 'zaur:important-rainbow-phases';

/** Stable hash → per-message rainbow hue and default gradient phase. */
function hashMessageId(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
	}
	return hash >>> 0;
}

function defaultHue(messageId: string): number {
	return hashMessageId(messageId) % 360;
}

function defaultPhase(messageId: string): number {
	return 5 + (hashMessageId(messageId) % 61);
}

function readStoredPhases(): Record<string, number> {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
		const phases: Record<string, number> = {};
		for (const [id, value] of Object.entries(parsed)) {
			if (typeof value === 'number' && Number.isFinite(value)) {
				phases[id] = value;
			}
		}
		return phases;
	} catch {
		return {};
	}
}

function writeStoredPhases(phases: Record<string, number>) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(phases));
}

class ImportantRainbowStore {
	/** User-picked background-position X (percent) per message id. */
	pickedPhases = $state<Record<string, number>>({});

	init() {
		this.reload();
	}

	/** Re-read from localStorage (after account settings pull). */
	reload() {
		if (!browser) return;
		this.pickedPhases = readStoredPhases();
	}

	hasPicked(messageId: string): boolean {
		return this.pickedPhases[messageId] !== undefined;
	}

	phaseFor(messageId: string): number {
		return this.pickedPhases[messageId] ?? defaultPhase(messageId);
	}

	cssVars(messageId: string): string {
		const hue = defaultHue(messageId);
		const phase = this.phaseFor(messageId);
		return `--important-hue: ${hue}deg; --important-phase: ${phase}%`;
	}

	/** Save gradient position after hover — user-chosen color persists. */
	pickFromElement(messageId: string, subjectEl: HTMLElement) {
		if (!browser) return;

		const pos = getComputedStyle(subjectEl).backgroundPosition;
		const match = pos.match(/^(-?[\d.]+)%/);
		if (!match) return;

		const phase = Math.round(parseFloat(match[1]) * 10) / 10;
		if (!Number.isFinite(phase)) return;

		this.pickedPhases = { ...this.pickedPhases, [messageId]: phase };
		writeStoredPhases(this.pickedPhases);
		scheduleAccountSettingsPush();
	}
}

export const importantRainbow = new ImportantRainbowStore();
