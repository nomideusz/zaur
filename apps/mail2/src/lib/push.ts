/**
 * New-mail notifications on this device. Nothing is stored locally: whether
 * this browser is subscribed is read back from its PushManager every time, so
 * the settings card cannot disagree with the browser.
 */
import { pushConfig, subscribePush, unsubscribePush } from '../routes/push.remote';

export type PushStatus =
	| 'unconfigured' // no VAPID keys on this server
	| 'unsupported' // no service worker / PushManager
	| 'install' // iPhone/iPad: push only exists for a Home Screen app
	| 'denied'
	| 'off'
	| 'on';

function isIosTab(): boolean {
	const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	return ios && !matchMedia('(display-mode: standalone)').matches;
}

/** Kit registers the worker on load; wait for it, but not forever. */
async function registration(): Promise<ServiceWorkerRegistration | null> {
	return Promise.race([
		navigator.serviceWorker.ready,
		new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000))
	]);
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
	const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
	return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function toInput(subscription: PushSubscription) {
	const json = subscription.toJSON();
	return { endpoint: subscription.endpoint, keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } };
}

export async function pushStatus(): Promise<PushStatus> {
	const { publicKey } = await pushConfig();
	if (!publicKey) return 'unconfigured';
	if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
		return isIosTab() ? 'install' : 'unsupported';
	}
	if (Notification.permission === 'denied') return 'denied';
	const reg = await registration();
	if (!reg) return 'unsupported';
	return Notification.permission === 'granted' && (await reg.pushManager.getSubscription()) ? 'on' : 'off';
}

export async function enablePush(): Promise<PushStatus> {
	const { publicKey } = await pushConfig();
	if (!publicKey) return 'unconfigured';
	if ((await Notification.requestPermission()) !== 'granted') return pushStatus();
	const reg = await registration();
	if (!reg) return 'unsupported';

	let subscription = await reg.pushManager.getSubscription();
	const key = keyBytes(publicKey);
	const current = subscription?.options.applicationServerKey;
	// A subscription made under other server keys (older ones, or webmail 1.0's
	// on the same origin) cannot be pushed to any more.
	if (subscription && current && !sameBytes(new Uint8Array(current), key)) {
		await subscription.unsubscribe();
		subscription = null;
	}
	try {
		subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
	} catch (cause) {
		// Brave ships with its push service off; so do some privacy-hardened Chromium builds.
		if (cause instanceof Error && /push service/i.test(cause.message)) {
			throw new Error(
				'This browser has its push service turned off. In Brave: Settings → Privacy and security → “Use Google services for push messaging”.'
			);
		}
		throw cause;
	}
	await subscribePush(toInput(subscription));
	return 'on';
}

export async function disablePush(): Promise<PushStatus> {
	const reg = await registration();
	const subscription = await reg?.pushManager.getSubscription();
	if (subscription) {
		await unsubscribePush({ endpoint: subscription.endpoint }).catch(() => {});
		await subscription.unsubscribe();
	}
	return 'off';
}

/**
 * On app load: tell the server this browser is still here, so its row does not
 * age out. Goes through enablePush, which re-makes a subscription taken under
 * other keys; permission is already granted, so nothing prompts.
 */
export async function resyncPush(): Promise<void> {
	if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
	if (!('Notification' in window) || Notification.permission !== 'granted') return;
	if (await (await registration())?.pushManager.getSubscription()) await enablePush();
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
	return a.length === b.length && a.every((byte, i) => byte === b[i]);
}
