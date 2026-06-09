/**
 * Synchronous theme seed — load in <head> before CSS to prevent flash.
 * Keep keyframes in sync with circadian/keyframes.ts
 */
(function () {
	var KEY = 'zaur-theme';
	// Keep in sync with circadian/keyframes.ts
	var FRAMES = [
		{ hour: 0, surface: { h: 40, s: 5, l: 10 }, fg: { h: 40, s: 8, l: 93 } },
		{ hour: 5.5, surface: { h: 40, s: 6, l: 10 }, fg: { h: 40, s: 8, l: 93 } },
		{ hour: 7, surface: { h: 44, s: 16, l: 96 }, fg: { h: 215, s: 11, l: 13 } },
		{ hour: 9, surface: { h: 42, s: 11, l: 98 }, fg: { h: 210, s: 10, l: 11 } },
		{ hour: 13, surface: { h: 60, s: 11, l: 98 }, fg: { h: 210, s: 10, l: 11 } },
		{ hour: 17, surface: { h: 40, s: 13, l: 96 }, fg: { h: 30, s: 9, l: 12 } },
		{ hour: 19.5, surface: { h: 34, s: 12, l: 90 }, fg: { h: 30, s: 9, l: 14 } },
		{ hour: 21, surface: { h: 34, s: 9, l: 10 }, fg: { h: 40, s: 8, l: 93 } },
		{ hour: 24, surface: { h: 40, s: 5, l: 10 }, fg: { h: 40, s: 8, l: 93 } }
	];

	// Keep in sync with circadian/interpolate.ts
	var DARK_SURFACE_L = 58;
	var MIN_CONTRAST_L = 70;
	var DEAD_ZONE_MIN = 25;
	var DEAD_ZONE_MAX = 70;

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function guardSurface(surface, hour) {
		var l = surface.l;
		if (l < DEAD_ZONE_MIN || l > DEAD_ZONE_MAX) return surface;
		var dusk = hour >= 19.5 && hour < 21;
		var dawn = hour >= 5.5 && hour < 7;
		var night = hour >= 21 || hour < 5.5;
		if (dusk || night) {
			return { h: 40, s: Math.max(surface.s, 5), l: 10 };
		}
		if (dawn) {
			return { s: Math.max(surface.s, 11), l: 97 };
		}
		return { s: Math.max(surface.s, 11), l: 97 };
	}

	function guardContrast(surface, fg) {
		if (surface.l < DARK_SURFACE_L) {
			fg.s = Math.max(fg.s, 8);
			fg.l = clamp(Math.max(fg.l, surface.l + MIN_CONTRAST_L), 78, 96);
		} else {
			fg.s = Math.max(fg.s, 10);
			fg.l = clamp(Math.min(fg.l, surface.l - MIN_CONTRAST_L), 4, 22);
		}
		return fg;
	}

	function readMode() {
		try {
			var saved = localStorage.getItem(KEY);
			if (saved === 'circadian' || saved === 'light' || saved === 'dark') return saved;
			if (saved === 'system') return 'circadian';
		} catch (e) {}
		return 'circadian';
	}

	function lerp(a, b, t) {
		return a + (b - a) * t;
	}

	function lerpHue(a, b, t) {
		var delta = ((b - a + 540) % 360) - 180;
		return (a + delta * t + 360) % 360;
	}

	function lerpTriple(from, to, t) {
		return {
			h: lerpHue(from.h, to.h, t),
			s: lerp(from.s, to.s, t),
			l: lerp(from.l, to.l, t)
		};
	}

	function sampleCircadian(date) {
		var hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
		var from = FRAMES[0];
		var to = FRAMES[1];
		for (var i = 0; i < FRAMES.length - 1; i++) {
			if (hour >= FRAMES[i].hour && hour < FRAMES[i + 1].hour) {
				from = FRAMES[i];
				to = FRAMES[i + 1];
				break;
			}
		}
		var span = to.hour - from.hour;
		var localT = span > 0 ? (hour - from.hour) / span : 0;
		var surface = guardSurface(lerpTriple(from.surface, to.surface, localT), hour);
		return {
			surface: surface,
			fg: guardContrast(surface, lerpTriple(from.fg, to.fg, localT))
		};
	}

	function applyCircadian(el, sample) {
		el.dataset.theme = 'circadian';
		el.classList.remove('light', 'dark');
		el.style.setProperty('--z-c-s-h', String(sample.surface.h));
		el.style.setProperty('--z-c-s-s', sample.surface.s + '%');
		el.style.setProperty('--z-c-s-l', sample.surface.l + '%');
		el.style.setProperty('--z-c-f-h', String(sample.fg.h));
		el.style.setProperty('--z-c-f-s', sample.fg.s + '%');
		el.style.setProperty('--z-c-f-l', sample.fg.l + '%');
		var dark = sample.surface.l < DARK_SURFACE_L;
		el.style.colorScheme = dark ? 'dark' : 'light';
		if (dark) el.dataset.circadianDark = '';
		else delete el.dataset.circadianDark;
	}

	function applyFixed(el, mode) {
		delete el.dataset.theme;
		delete el.dataset.circadianDark;
		el.style.removeProperty('--z-c-s-h');
		el.style.removeProperty('--z-c-s-s');
		el.style.removeProperty('--z-c-s-l');
		el.style.removeProperty('--z-c-f-h');
		el.style.removeProperty('--z-c-f-s');
		el.style.removeProperty('--z-c-f-l');
		el.style.removeProperty('color-scheme');
		var dark = mode === 'dark';
		el.classList.toggle('dark', dark);
		el.classList.toggle('light', !dark);
	}

	function tickCircadian() {
		var el = document.documentElement;
		if (readMode() !== 'circadian') return;
		applyCircadian(el, sampleCircadian(new Date()));
	}

	function startCircadianLoop() {
		if (window.__zaurCircadianTimer) return;
		window.__zaurCircadianTimer = setInterval(tickCircadian, 60000);
	}

	var mode = readMode();
	var el = document.documentElement;
	if (mode === 'circadian') {
		applyCircadian(el, sampleCircadian(new Date()));
	} else {
		applyFixed(el, mode);
	}

	window.ZaurCircadianSeed = {
		readMode: readMode,
		tickCircadian: tickCircadian,
		startCircadianLoop: startCircadianLoop,
		applyFixed: applyFixed
	};
})();
