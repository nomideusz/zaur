import { browser } from '$app/environment';
import {
	ensureAppServiceWorkerReady,
	resetAppServiceWorker
} from '$lib/utils/service-worker';

// --- Native (Capacitor shell) push -----------------------------------------
// Inside the Capacitor app the page runs in a WebView where Web Push can't
// deliver; the injected Capacitor bridge exposes the native FCM/APNs plugin
// instead. Same server endpoints, `fcmToken` payload instead of `subscription`.

interface CapacitorPushPlugin {
	checkPermissions(): Promise<{ receive: string }>;
	requestPermissions(): Promise<{ receive: string }>;
	register(): Promise<void>;
	addListener(
		event: 'registration' | 'registrationError' | 'pushNotificationActionPerformed',
		callback: (payload: never) => void
	): Promise<unknown>;
}

const FCM_TOKEN_STORAGE_KEY = 'zaur-fcm-token';

function nativePushPlugin(): CapacitorPushPlugin | null {
	if (!browser) return null;
	const capacitor = (
		window as unknown as {
			Capacitor?: {
				isNativePlatform?: () => boolean;
				Plugins?: { PushNotifications?: CapacitorPushPlugin };
			};
		}
	).Capacitor;
	if (!capacitor?.isNativePlatform?.()) return null;
	return capacitor.Plugins?.PushNotifications ?? null;
}

async function isNativePushEnabledOnServer(): Promise<boolean> {
	try {
		const response = await fetch('/api/push/vapid-public-key');
		if (!response.ok) return false;
		const payload = (await response.json()) as { fcm?: boolean };
		return payload.fcm === true;
	} catch {
		return false;
	}
}

/** Register the device token with the server; resolves false on any failure. */
async function subscribeNative(plugin: CapacitorPushPlugin): Promise<boolean> {
	const permission = await plugin.requestPermissions();
	if (permission.receive !== 'granted') return false;

	const token = await new Promise<string | null>((resolve) => {
		const timeout = setTimeout(() => resolve(null), 15_000);
		void plugin.addListener('registration', (payload: { value: string }) => {
			clearTimeout(timeout);
			resolve(payload.value);
		});
		void plugin.addListener('registrationError', () => {
			clearTimeout(timeout);
			resolve(null);
		});
		void plugin.register();
	});
	if (!token) return false;

	const response = await fetch('/api/push/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ fcmToken: token })
	});
	if (response.ok) localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
	return response.ok;
}

async function unsubscribeNative(): Promise<void> {
	const token = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
	if (!token) return;
	await fetch('/api/push/unsubscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ fcmToken: token })
	});
	localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
}

/**
 * Call once at app start (native shell only, no-op elsewhere): navigates when
 * the user taps a notification delivered while the app was closed/backgrounded.
 */
export function initNativePushNavigation(): void {
	const plugin = nativePushPlugin();
	if (!plugin) return;
	void plugin.addListener(
		'pushNotificationActionPerformed',
		(payload: { notification?: { data?: { url?: string } } }) => {
			const url = payload.notification?.data?.url;
			if (url && url.startsWith('/')) window.location.assign(url);
		}
	);
}
// ---------------------------------------------------------------------------

export function canUseBrowserNotifications(): boolean {
	return browser && 'Notification' in window;
}

export function browserNotificationPermission(): NotificationPermission | null {
	if (!canUseBrowserNotifications()) return null;
	return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | null> {
	if (!canUseBrowserNotifications()) return null;
	if (Notification.permission !== 'default') return Notification.permission;
	return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string): void {
	if (!canUseBrowserNotifications() || Notification.permission !== 'granted') return;

	try {
		new Notification(title, { body, tag: 'zaur-new-mail', icon: '/pwa-192x192.png' });
	} catch {
		// Some browsers block notifications outside a user gesture
	}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(base64);
	const output = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; ++i) {
		output[i] = raw.charCodeAt(i);
	}
	return output;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
	return ensureAppServiceWorkerReady();
}

export async function isPushSupported(): Promise<boolean> {
	if (nativePushPlugin()) return isNativePushEnabledOnServer();
	if (!browser || !('PushManager' in window) || !('serviceWorker' in navigator)) return false;

	try {
		const response = await fetch('/api/push/vapid-public-key');
		if (!response.ok) return false;
		const payload = (await response.json()) as { enabled?: boolean; publicKey?: string | null };
		return payload.enabled === true && Boolean(payload.publicKey);
	} catch {
		return false;
	}
}

export async function subscribeToPushNotifications(): Promise<boolean> {
	if (!(await isPushSupported())) return false;

	const nativePlugin = nativePushPlugin();
	if (nativePlugin) return subscribeNative(nativePlugin);

	const permission = await requestBrowserNotificationPermission();
	if (permission !== 'granted') return false;

	let registration = await getServiceWorkerRegistration();
	if (!registration?.active) {
		await resetAppServiceWorker();
		registration = await getServiceWorkerRegistration();
	}
	if (!registration?.active) return false;

	const response = await fetch('/api/push/vapid-public-key');
	if (!response.ok) return false;
	const { publicKey } = (await response.json()) as { publicKey?: string | null };
	if (!publicKey) return false;

	let subscription = await registration.pushManager.getSubscription();
	if (!subscription) {
		try {
			subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
			});
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				return false;
			}
			throw error;
		}
	}

	const subscribeResponse = await fetch('/api/push/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ subscription: subscription.toJSON() })
	});

	return subscribeResponse.ok;
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
	if (nativePushPlugin()) return unsubscribeNative();
	if (!browser || !('serviceWorker' in navigator)) return;

	const registration = await navigator.serviceWorker.getRegistration();
	const subscription = await registration?.pushManager.getSubscription();
	if (!subscription) return;

	await fetch('/api/push/unsubscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ endpoint: subscription.endpoint })
	});

	await subscription.unsubscribe();
}

export async function syncPushSubscription(enabled: boolean): Promise<boolean> {
	if (enabled) {
		return subscribeToPushNotifications();
	}

	await unsubscribeFromPushNotifications();
	return true;
}

export type PushNotificationStatus =
	| { state: 'server_disabled' }
	| { state: 'unsupported' }
	| { state: 'service_worker_unavailable' }
	| { state: 'denied' }
	| { state: 'prompt' }
	| { state: 'subscribed' }
	| { state: 'not_subscribed' };

export async function getPushNotificationStatus(): Promise<PushNotificationStatus> {
	if (!browser) return { state: 'unsupported' };

	const nativePlugin = nativePushPlugin();
	if (nativePlugin) {
		if (!(await isNativePushEnabledOnServer())) return { state: 'server_disabled' };
		const permission = await nativePlugin.checkPermissions();
		if (permission.receive === 'denied') return { state: 'denied' };
		if (permission.receive !== 'granted') return { state: 'prompt' };
		return localStorage.getItem(FCM_TOKEN_STORAGE_KEY)
			? { state: 'subscribed' }
			: { state: 'not_subscribed' };
	}

	if (!(await isPushSupported())) {
		try {
			const response = await fetch('/api/push/vapid-public-key');
			if (response.ok) {
				const payload = (await response.json()) as { enabled?: boolean };
				if (payload.enabled === false) return { state: 'server_disabled' };
			}
		} catch {
			// Fall through to unsupported
		}
		return { state: 'unsupported' };
	}

	if (!('serviceWorker' in navigator)) return { state: 'unsupported' };

	const permission = browserNotificationPermission();
	if (permission === 'denied') return { state: 'denied' };
	if (permission === 'default') return { state: 'prompt' };

	const registration = await getServiceWorkerRegistration();
	if (!registration) return { state: 'service_worker_unavailable' };

	const subscription = await registration.pushManager.getSubscription();
	return subscription ? { state: 'subscribed' } : { state: 'not_subscribed' };
}

export function pushStatusLabel(status: PushNotificationStatus): string {
	switch (status.state) {
		case 'server_disabled':
			return 'Not configured on server';
		case 'unsupported':
			return 'Not supported in this browser';
		case 'service_worker_unavailable':
			return 'Service worker not ready';
		case 'denied':
			return 'Blocked in browser settings';
		case 'prompt':
			return 'Permission not granted';
		case 'subscribed':
			return 'Active — works when app is closed';
		case 'not_subscribed':
			return 'Ready to enable';
	}
}

export function pushStatusTone(status: PushNotificationStatus): 'success' | 'warning' | 'muted' {
	switch (status.state) {
		case 'subscribed':
			return 'success';
		case 'denied':
		case 'server_disabled':
		case 'unsupported':
		case 'service_worker_unavailable':
			return 'warning';
		default:
			return 'muted';
	}
}

