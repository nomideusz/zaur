import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';

const STORAGE_KEY = 'zaur:important-rainbow-phases';
const RAINBOW_ANIMATION_NAME = 'z-important-rainbow';
const RAINBOW_ANIMATION_MS = 3000;
/** Gradient band width — keep in sync with --important-rainbow-band (44rem). */
const RAINBOW_BAND_REM = 44;
/** Hover animation travel — keep in sync with --important-rainbow-travel in list.css. */
const RAINBOW_PHASE_SPAN_REM = 12;
const RAINBOW_PHASE_MIN_REM = -(RAINBOW_BAND_REM * 0.5);
const PHASE_PRECISION = 100;

function clampPhaseOffset(phase: number): number {
	return Math.max(RAINBOW_PHASE_MIN_REM, Math.min(phase, 0));
}

function roundPhase(phase: number): number {
	return Math.round(phase * PHASE_PRECISION) / PHASE_PRECISION;
}

function rootFontSizePx(): number {
	if (!browser) return 16;
	const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
	return Number.isFinite(size) && size > 0 ? size : 16;
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

function easeInOut(t: number): number {
	return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function readBasePhaseFromElement(subjectEl: HTMLElement, fallback: number): number {
	const inline = subjectEl.style.getPropertyValue('--important-phase-offset').trim();
	if (inline) {
		const parsed = parseFloat(inline);
		if (Number.isFinite(parsed)) return clampPhaseOffset(parsed);
	}

	const computed = getComputedStyle(subjectEl).getPropertyValue('--important-phase-offset').trim();
	if (computed) {
		const parsed = parseFloat(computed);
		if (Number.isFinite(parsed)) return clampPhaseOffset(parsed);
	}

	return fallback;
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
		const phase = parseFloat(posX) / rootFontSizePx();
		return Number.isFinite(phase) ? phase : null;
	}

	return null;
}

function hasRainbowAnimation(subjectEl: HTMLElement): boolean {
	return subjectEl.getAnimations().some((anim) => anim.animationName === RAINBOW_ANIMATION_NAME);
}

/** Re-bind CSS animation after a prior WAAPI cancel() left the element without one. */
function ensureRainbowAnimation(subjectEl: HTMLElement) {
	if (hasRainbowAnimation(subjectEl)) return;

	subjectEl.style.animation = 'none';
	void subjectEl.offsetWidth;
	subjectEl.style.removeProperty('animation');
	void subjectEl.offsetWidth;
}

/** Inline background-position overrides the animated value — clear before sampling/hover. */
function clearInlineBackgroundPosition(subjectEl: HTMLElement) {
	subjectEl.style.removeProperty('background-position');
}

/** Fallback when computed style does not expose the interpolated position (matches ease-in-out alternate). */
function readPhaseFromAnimation(subjectEl: HTMLElement, basePhase: number): number | null {
	for (const anim of subjectEl.getAnimations()) {
		if (anim.animationName !== RAINBOW_ANIMATION_NAME) continue;
		const time = anim.currentTime;
		if (time === null) continue;

		const duration =
			anim.effect instanceof KeyframeEffect
				? Number(anim.effect.getTiming().duration) || RAINBOW_ANIMATION_MS
				: RAINBOW_ANIMATION_MS;

		const t = Number(time) % (duration * 2);
		const linearT = t <= duration ? t / duration : (t - duration) / duration;
		const progress = t <= duration ? easeInOut(linearT) : 1 - easeInOut(linearT);

		return clampPhaseOffset(roundPhase(basePhase - progress * RAINBOW_PHASE_SPAN_REM));
	}

	return null;
}

class ImportantRainbowStore {
	/** User-picked background-position X (rem) per message id. */
	pickedPhases = $state<Record<string, number>>({});

	/** Last rAF-sampled phase while hovering — most accurate on pointerleave. */
	private hoverSamplePhase = new Map<string, number>();
	private hoverSampleRaf: number | null = null;
	private hoverSampleTarget: { el: HTMLElement; id: string } | null = null;

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

	/** Track live gradient position every frame while hovered. */
	startHoverSample(subjectEl: HTMLElement, messageId: string) {
		if (!browser) return;

		this.stopHoverSample();
		clearInlineBackgroundPosition(subjectEl);
		ensureRainbowAnimation(subjectEl);
		this.hoverSampleTarget = { el: subjectEl, id: messageId };

		const sample = () => {
			if (!this.hoverSampleTarget) return;
			const { el, id } = this.hoverSampleTarget;
			const phase = this.readLivePhase(el, id);
			if (phase !== null) this.hoverSamplePhase.set(id, phase);
			this.hoverSampleRaf = requestAnimationFrame(sample);
		};

		this.hoverSampleRaf = requestAnimationFrame(sample);
	}

	stopHoverSample(messageId?: string) {
		if (this.hoverSampleRaf !== null) {
			cancelAnimationFrame(this.hoverSampleRaf);
			this.hoverSampleRaf = null;
		}
		this.hoverSampleTarget = null;
		if (messageId) this.hoverSamplePhase.delete(messageId);
	}

	/** Sample current gradient position from a list row (call on pointermove while hovering). */
	sampleFromRow(row: HTMLElement, messageId: string): number | null {
		const subject = row.querySelector('.z-mail-list-subject--important');
		if (!(subject instanceof HTMLElement)) return null;
		return this.readPhase(subject, messageId);
	}

	/** Apply phase to the element immediately so unhover never flashes the old base offset. */
	commitPhaseVisual(subjectEl: HTMLElement, messageId: string, phase: number) {
		const rounded = clampPhaseOffset(roundPhase(phase));
		const hue = defaultHue(messageId);

		subjectEl.style.setProperty('--important-hue', `${hue}deg`);
		subjectEl.style.setProperty('--important-phase-offset', String(rounded));
		clearInlineBackgroundPosition(subjectEl);

		for (const anim of subjectEl.getAnimations()) {
			if (anim.animationName !== RAINBOW_ANIMATION_NAME) continue;
			anim.currentTime = 0;
		}
	}

	readLivePhase(subjectEl: HTMLElement, messageId: string): number | null {
		const basePhase = readBasePhaseFromElement(subjectEl, this.phaseFor(messageId));
		const fromStyle = readImportantRainbowPhase(subjectEl);

		if (fromStyle !== null && hasRainbowAnimation(subjectEl)) {
			const style = getComputedStyle(subjectEl);
			const posX = style.backgroundPositionX || style.backgroundPosition.split(/\s+/)[0];
			// px is the browser-interpolated animated value; rem often stays at the keyframe base.
			if (posX.endsWith('px')) {
				return clampPhaseOffset(roundPhase(fromStyle));
			}
			if (Math.abs(fromStyle - basePhase) > 0.001) {
				return clampPhaseOffset(roundPhase(fromStyle));
			}
		}

		const fromAnimation = readPhaseFromAnimation(subjectEl, basePhase);
		if (fromAnimation !== null) return fromAnimation;

		if (fromStyle !== null) return clampPhaseOffset(roundPhase(fromStyle));
		return basePhase;
	}

	readPhase(subjectEl: HTMLElement, messageId: string): number | null {
		const cached = this.hoverSamplePhase.get(messageId);
		if (cached !== undefined) return cached;
		return this.readLivePhase(subjectEl, messageId);
	}

	pickPhase(messageId: string, phase: number) {
		if (!browser || !Number.isFinite(phase)) return;

		const rounded = clampPhaseOffset(roundPhase(phase));
		if (this.pickedPhases[messageId] === rounded) return;

		this.pickedPhases = { ...this.pickedPhases, [messageId]: rounded };
		writeStoredPhases(this.pickedPhases);
		scheduleAccountSettingsPush();
	}

	/** Read live phase, freeze visual, persist pick — call on pointerleave. */
	pickFromElement(subjectEl: HTMLElement, messageId: string) {
		if (!browser) return;

		const phase =
			this.hoverSamplePhase.get(messageId) ?? this.readLivePhase(subjectEl, messageId);
		this.stopHoverSample(messageId);
		if (phase === null) return;

		this.commitPhaseVisual(subjectEl, messageId, phase);
		this.pickPhase(messageId, phase);
	}

	/** Save gradient position after hover — user-chosen color persists. */
	pickFromRow(row: HTMLElement, messageId: string) {
		if (!browser) return;

		const subject = row.querySelector('.z-mail-list-subject--important');
		if (!(subject instanceof HTMLElement)) return;

		this.pickFromElement(subject, messageId);
	}
}

export const importantRainbow = new ImportantRainbowStore();
