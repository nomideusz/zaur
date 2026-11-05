/*
 * Page-view beacon for stats.zaur.app. No cookie, no id that outlives the page:
 * a random id lets a view's end find its start.
 *
 *   <script defer src="https://stats.zaur.app/s.js"></script>
 *
 * data-api      where to report, when this file is served from the site itself
 * data-skip     regex over the path: pages that must not report (their address holds a secret)
 * data-detail   "off": no clicks, sections, hash or tag (signed-in apps)
 * data-sections selector of the parts of a page to time; default "main section[id]"
 * data-me-cookie a cookie on this site that marks its owner
 *
 * ?stats=me on any page counts this browser as the owner's on that site, and
 * ?stats=notme undoes it: the one thing this ever stores on a device.
 */
(function () {
	var me = document.currentScript;
	var nav = navigator;
	if (!me || nav.webdriver || !nav.sendBeacon || !window.crypto || !crypto.randomUUID) return;
	if (/^(localhost|127\.|\[)/.test(location.hostname)) return;

	var attr = function (name) {
		return me.getAttribute('data-' + name);
	};
	var api = attr('api') || new URL(me.src).origin;
	var skip = attr('skip') && new RegExp(attr('skip'));
	var detail = attr('detail') !== 'off';
	var sections = attr('sections') || 'main section[id]';
	var meCookie = attr('me-cookie');
	var KEY = 'zaur_stats_me';

	var query = new URLSearchParams(location.search);
	var mine = false;
	try {
		if (query.get('stats') === 'me') localStorage.setItem(KEY, '1');
		if (query.get('stats') === 'notme') localStorage.removeItem(KEY);
		mine = localStorage.getItem(KEY) === '1';
	} catch (e) {}
	if (meCookie && document.cookie.split(/;\s*/).indexOf(meCookie) >= 0) mine = true;

	var send = function (body) {
		nav.sendBeacon(api + '/api/hit', JSON.stringify(body));
	};
	var visible = function () {
		return document.visibilityState === 'visible';
	};

	var v = null;
	var path = '';
	var observer = null;

	// The stretch just ended counts towards whichever part of the page was in view.
	var tally = function () {
		if (!v) return;
		var now = performance.now();
		if (v.at && visible()) v.seen[v.at] = (v.seen[v.at] || 0) + (now - v.last);
		v.last = now;
	};
	var report = function () {
		if (!v) return;
		var shown = v.shown + (visible() ? performance.now() - v.since : 0);
		var body = { k: 'end', id: v.id, secs: Math.round(shown / 1000), depth: Math.round(v.depth * 100) };
		if (detail) {
			body.clicks = v.clicks;
			body.seen = {};
			for (var k in v.seen) if (v.seen[k] >= 1000) body.seen[k] = Math.round(v.seen[k] / 1000);
		}
		send(body);
	};
	var scroll = function () {
		if (v) v.depth = Math.max(v.depth, Math.min(1, (scrollY + innerHeight) / document.documentElement.scrollHeight));
	};
	var watch = function () {
		if (observer) observer.disconnect();
		if (!detail || !window.IntersectionObserver) return;
		// What crosses a line 40% down the screen is what is being read.
		observer = new IntersectionObserver(
			function (entries) {
				tally();
				entries.forEach(function (e) {
					if (e.isIntersecting && v) v.at = e.target.id || 'top';
				});
			},
			{ rootMargin: '-40% 0px -60% 0px' }
		);
		document.querySelectorAll(sections).forEach(function (el) {
			observer.observe(el);
		});
	};

	var open = function (from) {
		var now = performance.now();
		v = { id: crypto.randomUUID().replace(/-/g, '').slice(0, 16), shown: 0, since: now, last: now, depth: 0, clicks: [], seen: {}, at: '' };
		var ref = from;
		if (!from) {
			try {
				ref = new URL(document.referrer).hostname;
				if (ref === location.hostname) ref = '';
			} catch (e) {
				ref = '';
			}
		}
		var body = {
			k: 'view',
			id: v.id,
			path: location.pathname,
			internal: from ? 1 : 0,
			ref: ref,
			tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
			lang: nav.language,
			w: innerWidth,
			h: innerHeight,
			screen: screen.width + 'x' + screen.height,
			dpr: devicePixelRatio,
			dark: matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0,
			me: mine ? 1 : 0
		};
		if (detail && !from) {
			body.tag = query.get('r') || query.get('utm_source') || undefined;
			body.hash = location.hash || undefined;
		}
		send(body);
		scroll();
		setTimeout(watch, 500); // a client-side page has just begun to draw
	};

	// The first page, and every move to another: a filter or a hash is the same page.
	var check = function () {
		if (location.pathname === path) return;
		var from = path;
		tally();
		report();
		v = null;
		path = location.pathname;
		if (!skip || !skip.test(path)) open(from);
	};

	addEventListener(
		'click',
		function (e) {
			if (!v || !detail || v.clicks.length >= 30) return;
			var el = e.target.closest && e.target.closest('a[href], button, summary');
			if (!el) return;
			var what = '';
			if (el.localName === 'summary') {
				what = (el.parentElement.open ? '−' : '+') + (el.parentElement.id || el.textContent.trim());
			} else if (el.localName === 'a') {
				// Where it goes, and never the number or address behind tel: and mailto:.
				var u = new URL(el.href, location.href);
				what = u.protocol === 'tel:' ? 'phone' : u.protocol === 'mailto:' ? 'mail' : u.host === location.host ? u.pathname + u.hash : u.host + u.pathname.replace(/\/$/, '');
			} else what = el.getAttribute('aria-label') || el.textContent.trim();
			if (what) v.clicks.push(what.slice(0, 120));
		},
		true
	);
	addEventListener('scroll', scroll, { passive: true });
	document.addEventListener('visibilitychange', function () {
		if (!v) return;
		if (visible()) {
			v.since = v.last = performance.now();
			return;
		}
		// Hidden already, so tally() and report() count nothing new: add this stretch first.
		var now = performance.now();
		if (v.at) v.seen[v.at] = (v.seen[v.at] || 0) + (now - v.last);
		v.last = now;
		v.shown += now - v.since;
		report();
	});

	// Client-side moves. Frameworks keep their own reference to history.pushState,
	// so wrapping it misses them; the Navigation API or a light poll does not.
	if (window.navigation && navigation.addEventListener) navigation.addEventListener('currententrychange', check);
	else setInterval(check, 1000);
	addEventListener('popstate', check);
	check();
})();
