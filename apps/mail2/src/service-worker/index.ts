/**
 * Push, notification clicks, and one page for when the network is gone.
 *
 * No app-shell cache on purpose: mail is live, offline reading is not planned
 * (README), and a cached shell is how a deploy ends up serving yesterday's
 * JavaScript. The fetch handler only ever touches page loads, always asks the
 * network first, and has exactly one thing to fall back on — `/offline.html`,
 * a static page that loads nothing else — so an installed app that starts
 * without a connection shows its own screen instead of the browser's error.
 * Kit registers this worker itself (as a module).
 */
import { self } from '$app/service-worker';

const OFFLINE_URL = '/offline.html';
// Bump when static/offline.html changes: a changed worker reinstalls, and
// installing fetches the page afresh.
const OFFLINE_CACHE = 'zaur-offline-1';

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(OFFLINE_CACHE)
			.then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
			// Without the page the worker is still worth having: push does not need it.
			.catch(() => {})
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			// Earlier copies of the page only: Kit keeps a cache of its own (`sveltekit:…`).
			for (const name of await caches.keys()) {
				if (name.startsWith('zaur-offline-') && name !== OFFLINE_CACHE) await caches.delete(name);
			}
			// Lets a page load start while this worker is still waking up.
			await self.registration.navigationPreload?.enable();
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.mode !== 'navigate') return;
	event.respondWith(
		(async () => {
			try {
				return ((await event.preloadResponse) as Response | undefined) ?? (await fetch(event.request));
			} catch {
				return (await caches.match(OFFLINE_URL)) ?? Response.error();
			}
		})()
	);
});

/** What the server's push sender puts in the payload (#lib/server/push). */
interface PushMessage {
	title?: string;
	body?: string;
	url?: string;
	tag?: string;
	unreadCount?: number;
}

type BadgeNavigator = WorkerNavigator & {
	setAppBadge?: (count: number) => Promise<void>;
	clearAppBadge?: () => Promise<void>;
};

self.addEventListener('push', (event) => {
	let message: PushMessage;
	try {
		message = event.data?.json() ?? {};
	} catch {
		message = { body: event.data?.text() };
	}

	const nav = self.navigator as BadgeNavigator;
	const count = message.unreadCount;
	const badge =
		typeof count !== 'number' ? undefined : count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();

	event.waitUntil(
		Promise.all([
			self.registration.showNotification(message.title || 'New mail', {
				body: message.body,
				tag: message.tag || 'zaur-new-mail',
				// A notification that replaces one with the same tag (a reply in the
				// same thread, the next batch) arrives silently unless told otherwise.
				renotify: true,
				icon: '/icon-192.png',
				badge: '/badge.png',
				data: { url: message.url || '/' }
			} as NotificationOptions),
			badge?.catch(() => {})
		])
	);
});

/**
 * Ask an open page to show the link itself — it answers on the port when it
 * has (the Mail page, which opens the thread in place). Nobody listening, or a
 * page that cannot, simply never answers, and the caller navigates instead.
 */
function askToOpen(client: WindowClient, url: string): Promise<boolean> {
	return new Promise((resolve) => {
		const { port1, port2 } = new MessageChannel();
		port1.onmessage = () => resolve(true);
		setTimeout(() => resolve(false), 500);
		client.postMessage({ type: 'zaur:open', url }, [port2]);
	});
}

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const target = new URL(event.notification.data?.url ?? '/', self.location.origin);
	// Only ever open our own pages, whatever a payload says.
	if (target.origin !== self.location.origin) return;

	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			// Never a call: navigating that window hangs up on everyone in it. Of the
			// rest, the one being looked at.
			const open = windows
				.filter((client) => !new URL(client.url).pathname.startsWith('/meet/'))
				.sort((a, b) => Number(b.focused) - Number(a.focused))[0];
			if (open) {
				try {
					await open.focus();
					if (!(await askToOpen(open, target.pathname + target.search))) await open.navigate(target.href);
					return;
				} catch {
					// An uncontrolled window cannot be navigated from here; open a fresh one.
				}
			}
			await self.clients.openWindow(target.href);
		})()
	);
});
