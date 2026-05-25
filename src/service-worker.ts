/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

interface PushPayload {
	title?: string;
	body?: string;
	url?: string;
	tag?: string;
}

self.addEventListener('push', (event) => {
	const payload = parsePushPayload(event);
	const title = payload.title ?? 'New mail';
	const options: NotificationOptions = {
		body: payload.body ?? 'You have new mail in your inbox.',
		tag: payload.tag ?? 'zaur-new-mail',
		icon: '/pwa-192x192.png',
		badge: '/pwa-192x192.png',
		data: { url: payload.url ?? '/mail/inbox' }
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = (event.notification.data?.url as string | undefined) ?? '/mail/inbox';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if ('focus' in client && 'navigate' in client) {
					void client.navigate(targetUrl);
					return client.focus();
				}
			}

			return self.clients.openWindow(targetUrl);
		})
	);
});

function parsePushPayload(event: PushEvent): PushPayload {
	if (!event.data) return {};

	try {
		return event.data.json() as PushPayload;
	} catch {
		const text = event.data.text()?.trim();
		return text ? { body: text } : {};
	}
}
