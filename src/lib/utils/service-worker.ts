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
		try {
			await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
		} catch {
			return null;
		}
	}

	try {
		return await navigator.serviceWorker.ready;
	} catch {
		return null;
	}
}

export async function getAppServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
	if (!browser || !('serviceWorker' in navigator)) return null;

	const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
	if (existing) {
		try {
			await navigator.serviceWorker.ready;
		} catch {
			// Continue with the registration we have
		}
		return existing;
	}

	return registerAppServiceWorker();
}
