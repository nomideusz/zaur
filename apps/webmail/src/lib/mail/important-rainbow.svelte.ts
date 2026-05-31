import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';

const STORAGE_KEY = 'zaur:important-rainbow-phases';
const RAINBOW_ANIMATION_NAME = 'z-important-rainbow';
const RAINBOW_ANIMATION_MS = 3000;
const RAINBOW_PHASE_SPAN = 45;

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

function parseLengthPx(value: string, elementWidth: number): number | null {
	const trimmed = value.trim();
	if (trimmed.endsWith('%')) {
		return (elementWidth * parseFloat(trimmed)) / 100;
	}
	if (trimmed.endsWith('px')) {
		return parseFloat(trimmed);
	}
	return null;
}

/** Read gradient X position as a percentage (handles px and % from getComputedStyle). */
export function readImportantRainbowPhase(subjectEl: HTMLElement): number | null {
	if (!browser) return null;

	const style = getComputedStyle(subjectEl);
	const posX = style.backgroundPositionX || style.backgroundPosition.split(/\s+/)[0];
	const width = subjectEl.clientWidth;
	if (!width) return null;

	if (posX.endsWith('%')) {
		const phase = parseFloat(posX);
		return Number.isFinite(phase) ? phase : null;
	}

	if (posX.endsWith('px')) {
		const px = parseFloat(posX);
		if (!Number.isFinite(px)) return null;

		const sizeX = style.backgroundSizeX || style.backgroundSize.split(/\s+/)[0];
		const bgWidth = parseLengthPx(sizeX, width);
		if (bgWidth === null) return null;

		const range = width - bgWidth;
		if (Math.abs(range) < 0.5) return null;
		return (px / range) * 100;
	}

	return null;
}

function readPhaseFromAnimation(subjectEl: HTMLElement, basePhase: number): number | null {
	for (const anim of subjectEl.getAnimations()) {
		if (anim.animationName !== RAINBOW_ANIMATION_NAME) continue;
		const time = anim.currentTime;
		if (time === null) continue;

		const t = Number(time) % (RAINBOW_ANIMATION_MS * 2);
		const progress = t <= RAINBOW_ANIMATION_MS ? t / RAINBOW_ANIMATION_MS : 2 - t / RAINBOW_ANIMATION_MS;
		return basePhase + progress * RAINBOW_PHASE_SPAN;
	}

	return null;
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

	/** Sample current gradient position from a list row (call on pointermove while hovering). */
	sampleFromRow(row: HTMLElement, messageId: string): number | null {
		const subject = row.querySelector('.z-mail-list-subject--important');
		if (!(subject instanceof HTMLElement)) return null;
		return this.readPhase(subject, messageId);
	}

	readPhase(subjectEl: HTMLElement, messageId: string): number | null {
		const fromStyle = readImportantRainbowPhase(subjectEl);
		if (fromStyle !== null) return fromStyle;
		return readPhaseFromAnimation(subjectEl, this.phaseFor(messageId));
	}

	pickPhase(messageId: string, phase: number) {
		if (!browser || !Number.isFinite(phase)) return;

		const rounded = Math.round(phase * 10) / 10;
		this.pickedPhases = { ...this.pickedPhases, [messageId]: rounded };
		writeStoredPhases(this.pickedPhases);
		scheduleAccountSettingsPush();
	}

	/** Save gradient position after hover — user-chosen color persists. */
	pickFromRow(row: HTMLElement, messageId: string, fallbackPhase?: number) {
		if (!browser) return;

		const subject = row.querySelector('.z-mail-list-subject--important');
		if (!(subject instanceof HTMLElement)) return;

		const phase =
			this.readPhase(subject, messageId) ??
			(fallbackPhase !== undefined && Number.isFinite(fallbackPhase) ? fallbackPhase : null);
		if (phase === null) return;

		this.pickPhase(messageId, phase);
	}
}

export const importantRainbow = new ImportantRainbowStore();
