import { browser } from '$app/environment';

const SW_URL = '/service-worker.js';
const SW_SCOPE = '/';
const SW_READY_TIMEOUT_MS = 20_000;

export async function unregisterAppServiceWorker(): Promise<void> {
	if (!browser || !('serviceWorker' in navigator)) return;

	const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
	await registration?.unregister();
}

async function waitForActiveWorker(
	registration: ServiceWorkerRegistration,
	timeoutMs = SW_READY_TIMEOUT_MS
): Promise<ServiceWorkerRegistration | null> {
	if (registration.active) return registration;

	return new Promise((resolve) => {
		const timeout = setTimeout(() => resolve(null), timeoutMs);

		const finish = () => {
			clearTimeout(timeout);
			resolve(registration.active ? registration : null);
		};

		const track = (worker: ServiceWorker | null) => {
			if (!worker) return;
			if (worker.state === 'activated') {
				finish();
				return;
			}
			worker.addEventListener('statechange', () => {
				if (worker.state === 'activated') finish();
			});
		};

		track(registration.installing);
		track(registration.waiting);

		void navigator.serviceWorker.ready.then(finish).catch(() => resolve(null));
	});
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!browser || !('serviceWorker' in navigator)) return null;

	try {
		const registration = await navigator.serviceWorker.register(SW_URL, {
			scope: SW_SCOPE
		});

		const active = await waitForActiveWorker(registration);
		if (active) return active;

		try {
			await registration.update();
		} catch {
			// update() can fail when offline
		}

		return waitForActiveWorker(registration);
	} catch {
		return null;
	}
}

export async function resetAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	await unregisterAppServiceWorker();
	return registerAppServiceWorker();
}

export async function ensureAppServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
	if (!browser || !('serviceWorker' in navigator)) return null;

	let registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
	if (registration) {
		const active = await waitForActiveWorker(registration);
		if (active) return active;
	}

	registration = await registerAppServiceWorker();
	if (registration) return registration;

	return resetAppServiceWorker();
}

export async function getAppServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
	return ensureAppServiceWorkerReady();
}
