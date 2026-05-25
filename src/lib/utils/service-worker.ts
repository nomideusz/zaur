import { browser } from '$app/environment';

const SW_URL = '/service-worker.js';
const SW_SCOPE = '/';

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!browser || !('serviceWorker' in navigator)) return null;

	const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
	if (existing?.active) return existing;

	try {
		await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE, type: 'module' });
	} catch {
		return null;
	}

	return navigator.serviceWorker.ready;
}

export async function getAppServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
	if (!browser || !('serviceWorker' in navigator)) return null;

	const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
	if (existing) return existing;

	return registerAppServiceWorker();
}
