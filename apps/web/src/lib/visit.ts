// Anonymous visit counting for static-server.mjs (/api/hit, read at /stats).
// No cookie, nothing kept on the device, no IP stored (the server keeps only
// the network's owner and place it looks up): a random id lives only
// in this tab so the visit's end can be matched to its start. A link handed out
// with ?r=<tag> (one per job application) marks who the visit came from.
let tracked = false;
export function track() {
	// Once per page load: the svelte-i18n keys switch remounts the page.
	if (tracked || location.hostname !== 'zaur.app' || navigator.webdriver) return;
	tracked = true;
	const id = crypto.randomUUID().slice(0, 12);
	const send = (body: object) => navigator.sendBeacon('/api/hit', JSON.stringify({ id, ...body }));
	const q = new URLSearchParams(location.search);
	let ref: string | undefined;
	try {
		ref = new URL(document.referrer).host;
	} catch {}
	send({
		k: 'view',
		tag: q.get('r') ?? q.get('utm_source') ?? undefined,
		ref: ref === location.host ? undefined : ref,
		tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
		lang: navigator.language,
		w: innerWidth,
		h: innerHeight,
		screen: `${screen.width}x${screen.height}`,
		dpr: devicePixelRatio,
		dark: matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0,
		hash: location.hash || undefined,
		page: location.pathname
	});

	// What was opened: links by where they go, live windows by their label.
	const clicks: string[] = [];
	const click = (e: MouseEvent) => {
		const el = (e.target as Element).closest('a, button, summary');
		if (!el || clicks.length >= 40) return;
		// A fold's summary: which fold, opened or closed.
		if (el.localName === 'summary') clicks.push(`${(el.parentElement as HTMLDetailsElement).open ? '−' : '+'}${el.parentElement!.id}`);
		else if (el instanceof HTMLAnchorElement) {
			const u = new URL(el.href);
			clicks.push(u.protocol === 'mailto:' ? 'mail' : u.host === location.host ? u.hash || u.pathname : u.host + u.pathname.replace(/\/$/, ''));
		} else clicks.push(el.getAttribute('aria-label') ?? el.textContent!.trim());
	};
	let depth = 0;
	const scroll = () => (depth = Math.max(depth, (scrollY + innerHeight) / document.documentElement.scrollHeight));
	// Which part of the page is read: the one crossing a line 40% down the
	// screen, timed while the tab is in view, in the order first reached.
	// ponytail: the keys switch remounts the page and this keeps watching the
	// old nodes; re-observe on remount if those visits ever matter.
	const seen: Record<string, number> = {};
	let at: string | undefined;
	let last = performance.now();
	let inView = document.visibilityState === 'visible';
	// Called before the state changes, so the stretch just ended is counted.
	const tally = () => {
		const now = performance.now();
		if (at && inView) seen[at] = (seen[at] ?? 0) + (now - last);
		last = now;
	};
	const io = new IntersectionObserver(
		(entries) => {
			tally();
			for (const e of entries) if (e.isIntersecting) at = e.target.id || 'top';
		},
		{ rootMargin: '-40% 0px -60% 0px' }
	);
	for (const el of document.querySelectorAll('.poster, main > section[id], main details[id]')) io.observe(el);
	// Time counts only while the tab is in view; each hide reports the total so far.
	let shown = 0;
	let since = performance.now();
	const hide = () => {
		tally();
		inView = document.visibilityState === 'visible';
		if (document.visibilityState === 'visible') return void (since = performance.now());
		shown += performance.now() - since;
		const secs = Object.fromEntries(Object.entries(seen).map(([k, ms]) => [k, Math.round(ms / 1000)]).filter(([, s]) => s));
		send({ k: 'end', secs: Math.round(shown / 1000), depth: Math.round(depth * 100), clicks, seen: secs });
	};
	addEventListener('click', click, true);
	addEventListener('scroll', scroll, { passive: true });
	document.addEventListener('visibilitychange', hide);
	scroll();
}
