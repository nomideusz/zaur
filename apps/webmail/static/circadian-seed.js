/**
 * Synchronous theme seed — load in <head> before CSS to prevent flash.
 * Keep keyframes in sync with circadian/keyframes.ts
 */
(function () {
	var KEY = 'zaur-theme';
	var FRAMES = [
		{ hour: 0, surface: { h: 40, s: 4, l: 6 }, fg: { h: 40, s: 5, l: 93 } },
		{ hour: 6, surface: { h: 48, s: 16, l: 97 }, fg: { h: 210, s: 10, l: 12 } },
		{ hour: 9, surface: { h: 42, s: 11, l: 98 }, fg: { h: 210, s: 10, l: 11 } },
		{ hour: 13, surface: { h: 60, s: 11, l: 98 }, fg: { h: 210, s: 10, l: 11 } },
		{ hour: 18, surface: { h: 38, s: 14, l: 93 }, fg: { h: 35, s: 8, l: 13 } },
		{ hour: 21, surface: { h: 35, s: 8, l: 14 }, fg: { h: 40, s: 7, l: 91 } },
		{ hour: 24, surface: { h: 40, s: 4, l: 6 }, fg: { h: 40, s: 5, l: 93 } }
	];

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
		return {
			surface: lerpTriple(from.surface, to.surface, localT),
			fg: lerpTriple(from.fg, to.fg, localT)
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
		var dark = sample.surface.l < 42;
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
