// Anonymous visit counting for static-server.mjs (/api/hit, read at /stats).
// No cookie, nothing kept on the device, no IP stored: a random id lives only
// in this tab so the visit's end can be matched to its start. A link handed out
// with ?r=<tag> (one per job application) marks who the visit came from.
export function track() {
	if (location.hostname !== 'zaur.app' || navigator.webdriver) return;
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
		w: innerWidth
	});

	// What was opened: links by where they go, live windows by their label.
	const clicks: string[] = [];
	const click = (e: MouseEvent) => {
		const el = (e.target as Element).closest('a, button');
		if (!el || clicks.length >= 40) return;
		if (el instanceof HTMLAnchorElement) {
			const u = new URL(el.href);
			clicks.push(u.protocol === 'mailto:' ? 'mail' : u.host === location.host ? u.hash || u.pathname : u.host + u.pathname.replace(/\/$/, ''));
		} else clicks.push(el.getAttribute('aria-label') ?? el.textContent!.trim());
	};
	let depth = 0;
	const scroll = () => (depth = Math.max(depth, (scrollY + innerHeight) / document.documentElement.scrollHeight));
	// Time counts only while the tab is in view; each hide reports the total so far.
	let shown = 0;
	let since = performance.now();
	const hide = () => {
		if (document.visibilityState === 'visible') return void (since = performance.now());
		shown += performance.now() - since;
		send({ k: 'end', secs: Math.round(shown / 1000), depth: Math.round(depth * 100), clicks });
	};
	addEventListener('click', click, true);
	addEventListener('scroll', scroll, { passive: true });
	document.addEventListener('visibilitychange', hide);
	scroll();
}
