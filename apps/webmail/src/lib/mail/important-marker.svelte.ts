import { browser } from '$app/environment';
import { scheduleAccountSettingsPush } from '$lib/settings/account-sync';
import { markerHighlightColor } from '$lib/mail/important-marker-colors';

const STORAGE_KEY = 'zaur:important-marker-picks';
const LEGACY_STORAGE_KEY = 'zaur:important-rainbow-phases';
const SHOWN_STORAGE_KEY = 'zaur:important-marker-shown';
/** Hue step interval while hover-sampling — slow enough to browse, not strobe. */
const PICK_CYCLE_MS = 420;
const PICK_HUE_STEP = 4;

export type ImportantIntroSurface = 'list' | 'reader';

function introShownKey(messageId: string, generation: number, surface: ImportantIntroSurface): string {
	return `${messageId}:${generation}:${surface}`;
}

/** Wait before hue cycling starts — avoids accidental picks when scanning the list. */
export const IMPORTANT_MARKER_HOVER_DELAY_MS = 550;
/** Minimum time cycling before pointer-leave commits a pick. */
export const IMPORTANT_MARKER_PICK_DWELL_MS = 900;

export function shouldCommitImportantMarkerPick(sampleStartedAt: number): boolean {
	return sampleStartedAt > 0 && Date.now() - sampleStartedAt >= IMPORTANT_MARKER_PICK_DWELL_MS;
}

type MarkerPick = { hueShift: number };

function clampHueShift(shift: number): number {
	return Math.max(0, Math.min(60, Math.round(shift * 10) / 10));
}

function hashMessageId(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
	}
	return hash >>> 0;
}

function migrateLegacyEntry(value: unknown): MarkerPick | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return { hueShift: 0 };
	}
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const record = value as Record<string, unknown>;
		if (typeof record.hueShift === 'number' && Number.isFinite(record.hueShift)) {
			return { hueShift: clampHueShift(record.hueShift) };
		}
		if (typeof record.x === 'number' && Number.isFinite(record.x)) {
			const y = typeof record.y === 'number' && Number.isFinite(record.y) ? record.y : 50;
			return { hueShift: clampHueShift(((y - 50) / 50) * 24) };
		}
		if (typeof record.fill === 'number' && Number.isFinite(record.fill)) {
			const hueShift =
				typeof record.hueShift === 'number' && Number.isFinite(record.hueShift)
					? record.hueShift
					: 0;
			return { hueShift: clampHueShift(hueShift) };
		}
	}
	return null;
}

function readStoredPicks(): Record<string, MarkerPick> {
	if (!browser) return {};
	const phases: Record<string, MarkerPick> = {};

	for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
		try {
			const raw = localStorage.getItem(key);
			if (!raw) continue;
			const parsed = JSON.parse(raw) as unknown;
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) continue;
			for (const [id, value] of Object.entries(parsed)) {
				const entry = migrateLegacyEntry(value);
				if (entry) phases[id] = entry;
			}
		} catch {
			// Ignore corrupt storage.
		}
	}

	return phases;
}

function writeStoredPicks(picks: Record<string, MarkerPick>) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
}

function readIntroShownKeys(): Set<string> {
	if (!browser) return new Set();
	try {
		const raw = sessionStorage.getItem(SHOWN_STORAGE_KEY);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed.filter((key): key is string => typeof key === 'string'));
	} catch {
		return new Set();
	}
}

function writeIntroShownKeys(keys: Set<string>) {
	if (!browser) return;
	sessionStorage.setItem(SHOWN_STORAGE_KEY, JSON.stringify([...keys]));
}

function picksEqual(a: MarkerPick, b: MarkerPick): boolean {
	return a.hueShift === b.hueShift;
}

function subjectEl(root: HTMLElement): HTMLElement | null {
	if (root.matches('[data-important-subject]')) return root;
	return root.querySelector('[data-important-subject]');
}

class ImportantMarkerStore {
	picked = $state<Record<string, MarkerPick>>({});
	/** Message id currently cycling hue for a pick. */
	pickingMessageId = $state<string | null>(null);
	/** Live hue shift while picking (0–60°). */
	pickingShift = $state(0);

	private hoverSamplePick = new Map<string, MarkerPick>();
	private pickInterval: ReturnType<typeof setInterval> | null = null;
	/** `${messageId}:${generation}:${surface}` keys that already played the intro draw. */
	private introShownKeys = new Set<string>();
	/** Bumped when a message is newly marked Important — forces a fresh highlight + intro. */
	introGeneration = $state<Record<string, number>>({});

	init() {
		this.introShownKeys = readIntroShownKeys();
		this.reload();
	}

	reload() {
		if (!browser) return;
		this.picked = readStoredPicks();
	}

	baseHue(messageId: string): number {
		return hashMessageId(messageId) % 360;
	}

	/** Stable rough-notation seed — same message always gets the same marker shape. */
	notationSeed(messageId: string): number {
		return hashMessageId(messageId);
	}

	hasPicked(messageId: string): boolean {
		return this.picked[messageId] !== undefined;
	}

	markForIntroAnimation(
		messageId: string,
		options: { introInReader?: boolean } = {}
	) {
		this.introGeneration = {
			...this.introGeneration,
			[messageId]: (this.introGeneration[messageId] ?? 0) + 1
		};
		// Bulk marks animate in the list only — opening each message should stay static.
		if (options.introInReader === false) {
			this.markIntroShown(messageId, 'reader');
		}
	}

	private introGenerationFor(messageId: string): number {
		return this.introGeneration[messageId] ?? 0;
	}

	private hasIntroShown(messageId: string, surface: ImportantIntroSurface): boolean {
		const gen = this.introGenerationFor(messageId);
		if (gen === 0) return true;
		return this.introShownKeys.has(introShownKey(messageId, gen, surface));
	}

	shouldIntroAnimate(messageId: string, surface: ImportantIntroSurface): boolean {
		const gen = this.introGenerationFor(messageId);
		if (gen === 0) return false;
		return !this.hasIntroShown(messageId, surface);
	}

	/** Stable list/reader key — only changes when a message is newly marked Important. */
	highlightInstanceKey(messageId: string): string {
		return `${messageId}:${this.introGenerationFor(messageId)}`;
	}

	markIntroShown(messageId: string, surface: ImportantIntroSurface) {
		const gen = this.introGenerationFor(messageId);
		if (gen === 0) return;
		const key = introShownKey(messageId, gen, surface);
		if (this.introShownKeys.has(key)) return;
		this.introShownKeys.add(key);
		writeIntroShownKeys(this.introShownKeys);
	}

	completeIntroAnimation(messageId: string, surface: ImportantIntroSurface) {
		this.markIntroShown(messageId, surface);
	}

	/** @deprecated Use markIntroShown */
	markHighlightShown(messageId: string) {
		this.markIntroShown(messageId, 'list');
	}

	pickFor(messageId: string): MarkerPick {
		return this.picked[messageId] ?? { hueShift: 0 };
	}

	liveShiftFor(messageId: string): number {
		return this.pickingMessageId === messageId ? this.pickingShift : this.pickFor(messageId).hueShift;
	}

	/** @deprecated Use liveShiftFor */
	liveShift(messageId: string): number {
		return this.liveShiftFor(messageId);
	}

	markerColor(messageId: string, hueShift = this.pickFor(messageId).hueShift): string {
		return markerHighlightColor(this.baseHue(messageId) + hueShift);
	}

	startHoverSample(_subjectEl: HTMLElement, messageId: string) {
		if (!browser) return;
		this.stopHoverSample();

		this.pickingMessageId = messageId;
		this.pickingShift = this.pickFor(messageId).hueShift;

		this.pickInterval = setInterval(() => {
			this.pickingShift = clampHueShift(this.pickingShift >= 56 ? 0 : this.pickingShift + PICK_HUE_STEP);
			this.hoverSamplePick.set(messageId, { hueShift: this.pickingShift });
		}, PICK_CYCLE_MS);
	}

	stopHoverSample(messageId?: string) {
		if (this.pickInterval) {
			clearInterval(this.pickInterval);
			this.pickInterval = null;
		}
		this.pickingMessageId = null;
		if (messageId) this.hoverSamplePick.delete(messageId);
	}

	startTouchPick(subjectEl: HTMLElement, messageId: string) {
		this.startHoverSample(subjectEl, messageId);
	}

	finishTouchPick(subjectEl: HTMLElement, messageId: string) {
		this.pickFromElement(subjectEl, messageId);
	}

	cancelTouchPick(_subjectEl: HTMLElement, messageId: string) {
		this.stopHoverSample(messageId);
	}

	pickPosition(messageId: string, pick: MarkerPick) {
		if (!browser) return;
		const next: MarkerPick = { hueShift: clampHueShift(pick.hueShift) };
		const existing = this.picked[messageId];
		if (existing && picksEqual(existing, next)) return;

		this.picked = { ...this.picked, [messageId]: next };
		writeStoredPicks(this.picked);
		scheduleAccountSettingsPush();
	}

	cyclePhase(messageId: string) {
		const current = this.pickFor(messageId);
		const nextShift = current.hueShift >= 48 ? 0 : clampHueShift(current.hueShift + 12);
		this.pickPosition(messageId, { hueShift: nextShift });
	}

	pickFromElement(root: HTMLElement, messageId: string) {
		if (!browser) return;
		const pick = this.hoverSamplePick.get(messageId) ?? { hueShift: this.pickingShift };
		this.stopHoverSample(messageId);
		this.pickPosition(messageId, pick);
	}

	pickFromRow(row: HTMLElement, messageId: string) {
		const el = subjectEl(row);
		if (el) this.pickFromElement(el, messageId);
	}

	resetFromElement(_root: HTMLElement, _messageId: string) {
		// Rough notation re-draws from component props — nothing to reset on DOM.
		this.stopHoverSample(_messageId);
	}

	resetFromRow(row: HTMLElement, messageId: string) {
		const el = subjectEl(row);
		if (el) this.resetFromElement(el, messageId);
	}
}

export const importantMarker = new ImportantMarkerStore();

/** @deprecated Use importantMarker */
export const importantRainbow = importantMarker;

export type { MarkerPick };
