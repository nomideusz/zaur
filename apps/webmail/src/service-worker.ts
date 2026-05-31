/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST?: Array<string | { url: string; revision?: string | null }>;
};

const precacheManifest = self.__WB_MANIFEST;
if (Array.isArray(precacheManifest)) {
	precacheAndRoute(precacheManifest);
}

self.addEventListener('install', (event) => {
	event.waitUntil(self.skipWaiting());
});

clientsClaim();

interface PushPayload {
	title?: string;
	body?: string;
	url?: string;
	tag?: string;
	unreadCount?: number;
}

type BadgeCapableRegistration = ServiceWorkerRegistration & {
	setAppBadge?: (count?: number) => Promise<void>;
	clearAppBadge?: () => Promise<void>;
};

self.addEventListener('push', (event) => {
	const payload = parsePushPayload(event);
	const title = payload.title ?? 'New mail';
	const options: NotificationOptions = {
		body: payload.body ?? 'You have new mail in your inbox.',
		tag: payload.tag ?? 'zaur-new-mail',
		icon: '/pwa-192x192.png',
		badge: '/pwa-192x192.png',
		data: { url: payload.url ?? '/' }
	};

	event.waitUntil(
		Promise.all([
			self.registration.showNotification(title, options),
			syncAppBadgeFromPush(payload.unreadCount)
		])
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = safeNotificationUrl(event.notification.data?.url as string | undefined);

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

function safeNotificationUrl(url: string | undefined): string {
	if (!url) return '/';
	try {
		const parsed = new URL(url, self.location.origin);
		if (parsed.origin !== self.location.origin) return '/';
		return `${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		return '/';
	}
}

async function syncAppBadgeFromPush(unreadCount: number | undefined): Promise<void> {
	if (typeof unreadCount !== 'number') return;

	const registration = self.registration as BadgeCapableRegistration;
	try {
		if (unreadCount > 0 && registration.setAppBadge) {
			await registration.setAppBadge(unreadCount);
		} else if (registration.clearAppBadge) {
			await registration.clearAppBadge();
		}
	} catch {
		// Badging is optional
	}
}

function parsePushPayload(event: PushEvent): PushPayload {
	if (!event.data) return {};

	try {
		return event.data.json() as PushPayload;
	} catch {
		const text = event.data.text()?.trim();
		return text ? { body: text } : {};
	}
}
