/**
 * Web Push: VAPID configuration, which endpoints a browser may register, and
 * the sender. Ported from webmail 1.0 (push-config, push-sender, the subscribe
 * route's allowlist); subscriptions live in the shared SQLite store instead of
 * 1.0's JSON file, and the watcher that decides *when* to send is push-watcher.
 *
 *   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY   npx web-push generate-vapid-keys
 *   VAPID_SUBJECT                          mailto: or https: contact for push services
 */
import { createHash } from 'node:crypto';
import webpush from 'web-push';
import { deletePushSubscription, getStoreDb, type PushSubscriptionRow } from '@zaur/server-auth';

/** What the service worker renders (src/service-worker/index.ts). */
export interface PushMessage {
	title: string;
	body: string;
	url: string;
	tag: string;
	unreadCount?: number;
}

export interface BrowserPushSubscription {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

function vapid() {
	const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
	const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
	const subject = process.env.VAPID_SUBJECT?.trim();
	return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

export function pushPublicKey(): string | null {
	return vapid()?.publicKey ?? null;
}

// The watcher POSTs to whatever endpoint a browser registered, server-side, so an
// unchecked URL is blind SSRF into the internal network. Only real push services.
const PUSH_HOSTS = [
	'fcm.googleapis.com', // Chrome, Edge
	'push.services.mozilla.com', // Firefox (updates.push.services.mozilla.com)
	'notify.windows.com', // Windows (*.notify.windows.com)
	'push.apple.com' // Safari (web.push.apple.com)
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
	let url: URL;
	try {
		url = new URL(endpoint);
	} catch {
		return false;
	}
	if (url.protocol !== 'https:' || url.port) return false;
	const host = url.hostname.toLowerCase();
	// Chromium 152+ hands out FCM endpoints on sharded jmtNN.google.com hosts.
	if (/^jmt\d+\.google\.com$/.test(host) && url.pathname.startsWith('/fcm/send/')) return true;
	return PUSH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Stable per browser: a re-subscribe from the same browser updates its row. */
export function pushSubscriptionId(endpoint: string): string {
	return createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

/** `gone` means the push service dropped the subscription for good; its row is deleted. */
export async function sendPush(
	row: PushSubscriptionRow,
	message: PushMessage
): Promise<'sent' | 'failed' | 'gone'> {
	const keys = vapid();
	if (!keys) return 'failed';
	try {
		await webpush.sendNotification(
			JSON.parse(row.subscription) as BrowserPushSubscription,
			JSON.stringify(message),
			{ vapidDetails: keys, TTL: 60 * 60 * 24 }
		);
		return 'sent';
	} catch (cause) {
		const status = (cause as { statusCode?: unknown })?.statusCode;
		if (status === 404 || status === 410) {
			deletePushSubscription(getStoreDb(), row.id);
			return 'gone';
		}
		console.warn('[push] delivery failed:', cause);
		return 'failed';
	}
}
