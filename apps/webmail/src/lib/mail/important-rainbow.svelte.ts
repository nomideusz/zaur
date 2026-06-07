import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';

const STORAGE_KEY = 'zaur:important-rainbow-phases';
const RAINBOW_ANIMATION_NAME = 'z-important-rainbow';
const RAINBOW_ANIMATION_MS = 8000;
/** X travel fractions at 0/25/50/75/100% keyframes — keep in sync with list.css */
const RAINBOW_X_KEYFRAMES = [0, 0.25, 0.5, 0.75, 1] as const;
/** Y positions (%) at the same keyframes — keep in sync with list.css */
const RAINBOW_Y_KEYFRAMES = [50, 100, 50, 0, 50] as const;
/** Gradient band width — keep in sync with --important-rainbow-band (44rem). */
const RAINBOW_BAND_REM = 44;
/** Hover animation travel — keep in sync with --important-rainbow-travel in list.css. */
const RAINBOW_PHASE_SPAN_REM = 12;
const RAINBOW_PHASE_MIN_REM = -(RAINBOW_BAND_REM * 0.5);
const RAINBOW_CYCLE_STEP_REM = 2;
const PHASE_PRECISION = 100;
const DEFAULT_Y_PERCENT = 50;

type PickedPosition = { x: number; y: number };

function clampPhaseOffset(phase: number): number {
	return Math.max(RAINBOW_PHASE_MIN_REM, Math.min(phase, 0));
}

function roundPhase(phase: number): number {
	return Math.round(phase * PHASE_PRECISION) / PHASE_PRECISION;
}

function roundY(y: number): number {
	return Math.round(y * 10) / 10;
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

function normalizeStoredEntry(value: unknown): PickedPosition | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return { x: migrateLegacyPhase(value), y: DEFAULT_Y_PERCENT };
	}
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const record = value as Record<string, unknown>;
		if (typeof record.x === 'number' && Number.isFinite(record.x)) {
			const y =
				typeof record.y === 'number' && Number.isFinite(record.y) ? record.y : DEFAULT_Y_PERCENT;
			return { x: clampPhaseOffset(record.x), y: roundY(y) };
		}
	}
	return null;
}

function readStoredPhases(): Record<string, PickedPosition> {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
		const phases: Record<string, PickedPosition> = {};
		for (const [id, value] of Object.entries(parsed)) {
			const entry = normalizeStoredEntry(value);
			if (entry) phases[id] = entry;
		}
		return phases;
	} catch {
		return {};
	}
}

function writeStoredPhases(phases: Record<string, PickedPosition>) {
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

function parseAxisLength(value: string, asRem: boolean): number | null {
	if (value.endsWith('rem')) {
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	if (value.endsWith('px')) {
		const parsed = parseFloat(value);
		if (!Number.isFinite(parsed)) return null;
		return asRem ? parsed / rootFontSizePx() : parsed;
	}
	if (!asRem && value.endsWith('%')) {
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

/** Read gradient background-position as rem X and % Y. */
export function readImportantRainbowPhase(subjectEl: HTMLElement): number | null {
	return readImportantRainbowPosition(subjectEl)?.x ?? null;
}

function readImportantRainbowPosition(subjectEl: HTMLElement): PickedPosition | null {
	if (!browser) return null;

	const style = getComputedStyle(subjectEl);
	const posX = style.backgroundPositionX || style.backgroundPosition.split(/\s+/)[0];
	const posY = style.backgroundPositionY || style.backgroundPosition.split(/\s+/)[1] || '50%';

	const x = parseAxisLength(posX, true);
	const y = parseAxisLength(posY, false);
	if (x === null || y === null) return null;

	return { x, y };
}

function hasRainbowAnimation(subjectEl: HTMLElement): boolean {
	return subjectEl.getAnimations().some((anim) => (anim as CSSAnimation).animationName === RAINBOW_ANIMATION_NAME);
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

function keyframeFraction(linearT: number, keyframes: readonly number[]): number {
	const segments = keyframes.length - 1;
	const pos = linearT * segments;
	const i = Math.min(Math.floor(pos), segments - 1);
	const local = pos - i;
	const eased = easeInOut(local);
	const from = keyframes[i];
	const to = keyframes[i + 1];
	return from + (to - from) * eased;
}

/** Fallback when computed style does not expose the interpolated position (matches ease-in-out alternate). */
function readPositionFromAnimation(subjectEl: HTMLElement, basePhase: number): PickedPosition | null {
	for (const anim of subjectEl.getAnimations()) {
		if ((anim as CSSAnimation).animationName !== RAINBOW_ANIMATION_NAME) continue;
		const time = anim.currentTime;
		if (time === null) continue;

		const duration =
			anim.effect instanceof KeyframeEffect
				? Number(anim.effect.getTiming().duration) || RAINBOW_ANIMATION_MS
				: RAINBOW_ANIMATION_MS;

		const t = Number(time) % (duration * 2);
		const linearT = t <= duration ? t / duration : (t - duration) / duration;
		const xFraction =
			t <= duration ? keyframeFraction(linearT, RAINBOW_X_KEYFRAMES) : keyframeFraction(1 - linearT, RAINBOW_X_KEYFRAMES);
		const yFraction =
			t <= duration ? keyframeFraction(linearT, RAINBOW_Y_KEYFRAMES) : keyframeFraction(1 - linearT, RAINBOW_Y_KEYFRAMES);

		return {
			x: clampPhaseOffset(roundPhase(basePhase - xFraction * RAINBOW_PHASE_SPAN_REM)),
			y: roundY(yFraction)
		};
	}

	return null;
}

function positionsEqual(a: PickedPosition, b: PickedPosition): boolean {
	return a.x === b.x && a.y === b.y;
}

class ImportantRainbowStore {
	/** User-picked background-position per message id. */
	pickedPhases = $state<Record<string, PickedPosition>>({});

	/** Last rAF-sampled position while hovering — most accurate on pointerleave. */
	private hoverSamplePosition = new Map<string, PickedPosition>();
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
		const phase = this.pickedPhases[messageId]?.x ?? defaultPhaseOffset(messageId);
		return clampPhaseOffset(phase);
	}

	yFor(messageId: string): number {
		return this.pickedPhases[messageId]?.y ?? DEFAULT_Y_PERCENT;
	}

	positionFor(messageId: string): PickedPosition {
		return {
			x: this.phaseFor(messageId),
			y: this.yFor(messageId)
		};
	}

	cssVars(messageId: string): string {
		const hue = defaultHue(messageId);
		const { x, y } = this.positionFor(messageId);
		let vars = `--important-hue: ${hue}deg; --important-phase-offset: ${x}`;
		if (this.hasPicked(messageId)) {
			vars += `; --important-phase-offset-y: ${y}%`;
		}
		return vars;
	}

	/** Track live gradient position every frame while hovered. */
	startHoverSample(subjectEl: HTMLElement, messageId: string) {
		if (!browser) return;

		this.stopHoverSample();
		clearInlineBackgroundPosition(subjectEl);
		subjectEl.classList.add('z-mail-list-subject--important-picking');
		ensureRainbowAnimation(subjectEl);
		this.hoverSampleTarget = { el: subjectEl, id: messageId };

		const sample = () => {
			if (!this.hoverSampleTarget) return;
			const { el, id } = this.hoverSampleTarget;
			const position = this.readLivePosition(el, id);
			if (position !== null) this.hoverSamplePosition.set(id, position);
			this.hoverSampleRaf = requestAnimationFrame(sample);
		};

		this.hoverSampleRaf = requestAnimationFrame(sample);
	}

	stopHoverSample(messageId?: string) {
		if (this.hoverSampleRaf !== null) {
			cancelAnimationFrame(this.hoverSampleRaf);
			this.hoverSampleRaf = null;
		}
		if (this.hoverSampleTarget) {
			this.hoverSampleTarget.el.classList.remove('z-mail-list-subject--important-picking');
		}
		this.hoverSampleTarget = null;
		if (messageId) this.hoverSamplePosition.delete(messageId);
	}

	/** Press-and-hold on touch — animate while held, pick on release. */
	startTouchPick(subjectEl: HTMLElement, messageId: string) {
		if (!browser) return;
		this.startHoverSample(subjectEl, messageId);
	}

	finishTouchPick(subjectEl: HTMLElement, messageId: string) {
		this.pickFromElement(subjectEl, messageId);
	}

	cancelTouchPick(subjectEl: HTMLElement, messageId: string) {
		this.stopHoverSample(messageId);
	}

	/** Sample current gradient position from a list row (call on pointermove while hovering). */
	sampleFromRow(row: HTMLElement, messageId: string): PickedPosition | null {
		const subject = row.querySelector('.z-mail-list-subject--important');
		if (!(subject instanceof HTMLElement)) return null;
		return this.readPosition(subject, messageId);
	}

	/** Apply picked position immediately so unhover never flashes the old gradient. */
	commitPhaseVisual(subjectEl: HTMLElement, messageId: string, position: PickedPosition) {
		const x = clampPhaseOffset(roundPhase(position.x));
		const y = roundY(position.y);
		const hue = defaultHue(messageId);

		subjectEl.style.setProperty('--important-hue', `${hue}deg`);
		subjectEl.style.setProperty('--important-phase-offset', String(x));
		subjectEl.style.setProperty('--important-phase-offset-y', `${y}%`);
		subjectEl.style.backgroundPosition = `${x}rem ${y}%`;

		for (const anim of subjectEl.getAnimations()) {
			if ((anim as CSSAnimation).animationName !== RAINBOW_ANIMATION_NAME) continue;
			anim.cancel();
		}
	}

	readLivePosition(subjectEl: HTMLElement, messageId: string): PickedPosition | null {
		const basePhase = readBasePhaseFromElement(subjectEl, this.phaseFor(messageId));
		const fromStyle = readImportantRainbowPosition(subjectEl);

		if (fromStyle !== null && hasRainbowAnimation(subjectEl)) {
			const style = getComputedStyle(subjectEl);
			const posX = style.backgroundPositionX || style.backgroundPosition.split(/\s+/)[0];
			// px is the browser-interpolated animated value; rem often stays at the keyframe base.
			if (posX.endsWith('px')) {
				return {
					x: clampPhaseOffset(roundPhase(fromStyle.x)),
					y: roundY(fromStyle.y)
				};
			}
			if (Math.abs(fromStyle.x - basePhase) > 0.001 || Math.abs(fromStyle.y - DEFAULT_Y_PERCENT) > 0.001) {
				return {
					x: clampPhaseOffset(roundPhase(fromStyle.x)),
					y: roundY(fromStyle.y)
				};
			}
		}

		const fromAnimation = readPositionFromAnimation(subjectEl, basePhase);
		if (fromAnimation !== null) return fromAnimation;

		if (fromStyle !== null) {
			return {
				x: clampPhaseOffset(roundPhase(fromStyle.x)),
				y: roundY(fromStyle.y)
			};
		}

		return { x: basePhase, y: DEFAULT_Y_PERCENT };
	}

	readPosition(subjectEl: HTMLElement, messageId: string): PickedPosition | null {
		const cached = this.hoverSamplePosition.get(messageId);
		if (cached !== undefined) return cached;
		return this.readLivePosition(subjectEl, messageId);
	}

	pickPosition(messageId: string, position: PickedPosition) {
		if (!browser || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;

		const picked: PickedPosition = {
			x: clampPhaseOffset(roundPhase(position.x)),
			y: roundY(position.y)
		};
		const existing = this.pickedPhases[messageId];
		if (existing && positionsEqual(existing, picked)) return;

		this.pickedPhases = { ...this.pickedPhases, [messageId]: picked };
		writeStoredPhases(this.pickedPhases);
		scheduleAccountSettingsPush();
	}

	/** Touch / bulk-mode — step gradient phase to the next color stop. */
	cyclePhase(messageId: string) {
		const current = this.phaseFor(messageId);
		let next = clampPhaseOffset(roundPhase(current - RAINBOW_CYCLE_STEP_REM));
		if (next <= RAINBOW_PHASE_MIN_REM + 0.001) {
			next = 0;
		}
		this.pickPosition(messageId, { x: next, y: this.yFor(messageId) });
	}

	/** Read live position, freeze visual, persist pick — call on pointerleave. */
	pickFromElement(subjectEl: HTMLElement, messageId: string) {
		if (!browser) return;

		const position =
			this.hoverSamplePosition.get(messageId) ?? this.readLivePosition(subjectEl, messageId);
		this.stopHoverSample(messageId);
		if (position === null) return;

		this.commitPhaseVisual(subjectEl, messageId, position);
		this.pickPosition(messageId, position);
	}

	/** Save gradient position after hover — user-chosen color persists. */
	pickFromRow(row: HTMLElement, messageId: string) {
		if (!browser) return;

		const subject = row.querySelector('.z-mail-list-subject--important');
		if (!(subject instanceof HTMLElement)) return;

		this.pickFromElement(subject, messageId);
	}

	/** Restore visually saved color phase. */
	resetFromElement(subjectEl: HTMLElement, messageId: string) {
		if (!browser) return;
		this.stopHoverSample(messageId);
		const saved = this.positionFor(messageId);
		if (this.hasPicked(messageId)) {
			this.commitPhaseVisual(subjectEl, messageId, saved);
		} else {
			clearInlineBackgroundPosition(subjectEl);
			subjectEl.style.removeProperty('--important-phase-offset-y');
			ensureRainbowAnimation(subjectEl);
		}
	}

	/** Restore visually saved color phase from list row. */
	resetFromRow(row: HTMLElement, messageId: string) {
		if (!browser) return;
		const subject = row.querySelector('.z-mail-list-subject--important');
		if (subject instanceof HTMLElement) {
			this.resetFromElement(subject, messageId);
		}
	}
}

export const importantRainbow = new ImportantRainbowStore();
