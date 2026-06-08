/**
 * Circadian theming for Zaur — time-adaptive palette without a light/dark toggle.
 *
 * ## Integration (webmail)
 *
 * 1. Import circadian CSS after theme.css:
 *    `import '@zaur/ui/circadian.css';`
 *
 * 2. Replace theme store init with:
 *    `import { startCircadian } from '@zaur/ui/circadian';`
 *    `startCircadian();` in `+layout.svelte` onMount (or root init).
 *
 * 3. In app.html inline script, call a minimal seed to avoid flash:
 *    `document.documentElement.dataset.theme = 'circadian';`
 *    plus set `--z-c-*` from local hour (copy keyframe values at hour buckets).
 *
 * 4. Settings: replace Light/Dark/System with optional "Fixed light" / "Fixed dark"
 *    overrides that call `startCircadian()` vs legacy `theme.set()`.
 *
 * Accent (`--z-accent`) stays stable — only surfaces and text drift.
 */

export { CIRCADIAN_KEYFRAMES, type CircadianKeyframe } from './keyframes.js';
export {
	applyCircadianNow,
	applyCircadianSample,
	dayFraction,
	dayFractionFromHour,
	formatHsl,
	isCircadianDark,
	sampleCircadian,
	startCircadian,
	stopCircadianTheme,
	type CircadianOptions
} from './apply.js';
export { type CircadianSample } from './interpolate.js';
