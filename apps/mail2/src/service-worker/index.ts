/**
 * Push and notification clicks, nothing else.
 *
 * No fetch handler and no cache on purpose: mail is live, offline reading is not
 * planned (README), and an app-shell cache is how a deploy ends up serving
 * yesterday's JavaScript. Kit registers this worker itself (as a module).
 */
import { self } from '$app/service-worker';

self.addEventListener('install', () => void self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
				icon: '/icon-192.png',
				badge: '/badge.png',
				data: { url: message.url || '/' }
			}),
			badge?.catch(() => {})
		])
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const target = new URL(event.notification.data?.url ?? '/', self.location.origin);
	// Only ever open our own pages, whatever a payload says.
	if (target.origin !== self.location.origin) return;

	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const open = windows[0];
			if (open) {
				try {
					await open.navigate(target.href);
					await open.focus();
					return;
				} catch {
					// An uncontrolled window cannot be navigated from here; open a fresh one.
				}
			}
			await self.clients.openWindow(target.href);
		})()
	);
});
