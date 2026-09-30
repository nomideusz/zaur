/**
 * Offline, as far as a streaming player goes: the installed app opens without
 * a network (to a page that says so) and covers come from a cache.
 *
 * Pages and their data are never cached — they carry the signed-in person —
 * and neither is /auth or anything under /api but covers. Audio is not touched
 * at all, so its Range requests go straight to the network.
 * Kit registers this worker itself (as a module).
 */
import { dev, version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self } from '$app/service-worker';

const SHELL = `shell-${version}`;
const COVERS = 'covers';
const MAX_COVERS = 300;
const OFFLINE = '/offline.html';

/** The build's hashed files and what is in static/: all this worker serves from its own cache. */
const precached = new Set([...immutable, ...assets].map(({ path }) => `/${path}`));

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(SHELL)
			.then((cache) => cache.addAll([...precached]))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== SHELL && key !== COVERS).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

/** Stale-while-revalidate: the cached cover now, a fresh one for next time. */
async function cover(event: FetchEvent): Promise<Response> {
	const cache = await caches.open(COVERS);
	const hit = await cache.match(event.request);
	const fresh = fetch(event.request).then(async (response) => {
		if (response.ok) {
			await cache.put(event.request, response.clone());
			// Oldest out: put() moves an entry to the end, keys() lists in that order.
			const keys = await cache.keys();
			await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_COVERS)).map((key) => cache.delete(key)));
		}
		return response;
	});
	if (!hit) return fresh;
	event.waitUntil(fresh.catch(() => {}));
	return hit;
}

// In dev nothing is served from a cache: there is no build to cache, and
// cache-first static files would hide edits.
if (!dev) {
	self.addEventListener('fetch', (event) => {
		const { request } = event;
		const url = new URL(request.url);
		if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('range')) return;

		if (precached.has(url.pathname)) {
			event.respondWith(
				caches
					.open(SHELL)
					.then((cache) => cache.match(url.pathname))
					.then((hit) => hit ?? fetch(request))
			);
		} else if (url.pathname.startsWith('/api/cover/')) {
			event.respondWith(cover(event));
		} else if (request.mode === 'navigate') {
			// Always the network; only when it cannot be reached, the page that says so.
			event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) ?? Response.error()));
		}
	});
}
