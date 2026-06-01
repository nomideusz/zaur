import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';

const STORAGE_KEY = 'zaur:important-rainbow-phases';
const RAINBOW_ANIMATION_NAME = 'z-important-rainbow';
const RAINBOW_ANIMATION_MS = 3000;
/** Gradient band width — keep in sync with --important-rainbow-band (44rem). */
const RAINBOW_BAND_REM = 44;
/** Hover animation travel — stay non-positive so the left edge stays covered. */
const RAINBOW_PHASE_SPAN_REM = 2.75;
const RAINBOW_PHASE_MIN_REM = -(RAINBOW_BAND_REM * 0.5);

function clampPhaseOffset(phase: number): number {
	return Math.max(RAINBOW_PHASE_MIN_REM, Math.min(phase, 0));
}

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

function defaultPhaseOffset(messageId: string): number {
	const span = RAINBOW_BAND_REM * 0.35;
	return -Math.round(((hashMessageId(messageId) % Math.round(span * 10)) / 10) * 10) / 10;
}

/** Legacy values were % picks — remap to safe non-positive rem offsets. */
function migrateLegacyPhase(value: number): number {
	if (value <= 100) {
		const rem = (value / 100) * RAINBOW_BAND_REM * 0.35;
		return clampPhaseOffset(-Math.round(rem * 10) / 10);
	}
	return clampPhaseOffset(value);
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
				phases[id] = migrateLegacyPhase(value);
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

/** Read gradient X position as rem (absolute offset within the band). */
export function readImportantRainbowPhase(subjectEl: HTMLElement): number | null {
	if (!browser) return null;

	const style = getComputedStyle(subjectEl);
	const posX = style.backgroundPositionX || style.backgroundPosition.split(/\s+/)[0];

	if (posX.endsWith('rem')) {
		const phase = parseFloat(posX);
		return Number.isFinite(phase) ? phase : null;
	}

	if (posX.endsWith('px')) {
		const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
		if (!Number.isFinite(rootSize) || rootSize <= 0) return null;
		const phase = parseFloat(posX) / rootSize;
		return Number.isFinite(phase) ? Math.round(phase * 10) / 10 : null;
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
		return Math.round((basePhase - progress * RAINBOW_PHASE_SPAN_REM) * 10) / 10;
	}

	return null;
}

class ImportantRainbowStore {
	/** User-picked background-position X (rem) per message id. */
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
		const phase = this.pickedPhases[messageId] ?? defaultPhaseOffset(messageId);
		return clampPhaseOffset(phase);
	}

	cssVars(messageId: string): string {
		const hue = defaultHue(messageId);
		const phase = this.phaseFor(messageId);
		return `--important-hue: ${hue}deg; --important-phase-offset: ${phase}`;
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

		const rounded = clampPhaseOffset(Math.round(phase * 10) / 10);
		if (this.pickedPhases[messageId] === rounded) return;

		this.pickedPhases = { ...this.pickedPhases, [messageId]: rounded };
		writeStoredPhases(this.pickedPhases);
		scheduleAccountSettingsPush();
	}

	/** Save gradient position after hover — user-chosen color persists. */
	pickFromRow(row: HTMLElement, messageId: string) {
		if (!browser) return;

		const subject = row.querySelector('.z-mail-list-subject--important');
		if (!(subject instanceof HTMLElement)) return;

		const phase = this.readPhase(subject, messageId);
		if (phase === null) return;

		this.pickPhase(messageId, phase);
	}
}

export const importantRainbow = new ImportantRainbowStore();
