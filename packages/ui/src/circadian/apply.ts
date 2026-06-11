import { dayFraction, isCircadianDark, sampleCircadian, type CircadianSample } from './interpolate.js';

export type CircadianOptions = {
	/** Called after each tick (default 60s). */
	onTick?: (sample: CircadianSample) => void;
	/** Override tick interval in ms (default 60_000). */
	intervalMs?: number;
};

const PRIMITIVE_VARS = [
	'--z-c-s-h',
	'--z-c-s-s',
	'--z-c-s-l',
	'--z-c-f-h',
	'--z-c-f-s',
	'--z-c-f-l'
] as const;

function formatHsl(h: number, s: number, l: number): string {
	return `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`;
}

/** Apply one circadian sample to the document root. */
export function applyCircadianSample(el: HTMLElement, sample: CircadianSample): void {
	const { surface, fg } = sample;
	el.style.setProperty('--z-c-s-h', String(surface.h));
	el.style.setProperty('--z-c-s-s', `${surface.s}%`);
	el.style.setProperty('--z-c-s-l', `${surface.l}%`);
	el.style.setProperty('--z-c-f-h', String(fg.h));
	el.style.setProperty('--z-c-f-s', `${fg.s}%`);
	el.style.setProperty('--z-c-f-l', `${fg.l}%`);
	const dark = isCircadianDark(sample);
	el.style.colorScheme = dark ? 'dark' : 'light';
	el.dataset.circadianPhase = sample.phase;
	if (dark) el.dataset.circadianDark = '';
	else delete el.dataset.circadianDark;
}

/** Seed primitives before first paint (call from app.html inline script). */
export function applyCircadianNow(el: HTMLElement = document.documentElement): CircadianSample {
	const sample = sampleCircadian();
	applyCircadianSample(el, sample);
	return sample;
}

let timer: ReturnType<typeof setInterval> | null = null;
let removeWakeListeners: (() => void) | null = null;

/** Tear down circadian primitives and data attributes. */
export function stopCircadianTheme(el: HTMLElement = document.documentElement): void {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
	removeWakeListeners?.();
	removeWakeListeners = null;
	for (const name of PRIMITIVE_VARS) el.style.removeProperty(name);
	delete el.dataset.theme;
	delete el.dataset.circadianPhase;
	delete el.dataset.circadianDark;
	el.style.removeProperty('color-scheme');
}

/**
 * Start circadian theming on `<html>`.
 * Sets `data-theme="circadian"` and removes `.light` / `.dark` toggles.
 */
export function startCircadian(options: CircadianOptions = {}): () => void {
	if (typeof document === 'undefined') return () => {};

	const el = document.documentElement;
	el.dataset.theme = 'circadian';
	el.classList.remove('light', 'dark');

	const tick = () => {
		const sample = applyCircadianNow(el);
		options.onTick?.(sample);
	};

	tick();
	if (timer) clearInterval(timer);
	timer = setInterval(tick, options.intervalMs ?? 60_000);

	// Interval timers are throttled in background tabs and paused during sleep,
	// so resample the moment the page becomes visible again.
	const onWake = () => {
		if (document.visibilityState === 'visible') tick();
	};
	removeWakeListeners?.();
	document.addEventListener('visibilitychange', onWake);
	window.addEventListener('focus', onWake);
	removeWakeListeners = () => {
		document.removeEventListener('visibilitychange', onWake);
		window.removeEventListener('focus', onWake);
	};

	return () => stopCircadianTheme(el);
}

/** Inline-script helper: estimate phase from timezone offset when Date isn't hydrated yet. */
export function dayFractionFromHour(hour: number): number {
	return Math.min(Math.max(hour, 0), 23.999) / 24;
}

export { dayFraction, formatHsl, isCircadianDark, sampleCircadian };
