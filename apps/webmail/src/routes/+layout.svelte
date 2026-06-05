<script lang="ts">
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { network } from '$lib/stores/network.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { importantRainbow } from '$lib/mail/important-rainbow.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { syncPushSubscription } from '$lib/utils/notifications';
	import { ensureAppServiceWorkerReady } from '$lib/utils/service-worker';

	let { children } = $props();

	const PRELOAD_RELOAD_KEY = 'zaur:vite-preload-reload-at';

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		const fromPath = navigation.from?.url.pathname ?? '';
		const toPath = navigation.to?.url.pathname ?? '';
		const fromParts = fromPath.split('/').filter(Boolean);
		const toParts = toPath.split('/').filter(Boolean);
		
		let direction = 'forward';
		if (fromParts.length > toParts.length) {
			direction = 'backward';
		} else if (fromParts.length === toParts.length) {
			direction = 'fade';
		}

		document.documentElement.classList.add(`z-nav-${direction}`);
		['forward', 'backward', 'fade'].forEach((dir) => {
			if (dir !== direction) {
				document.documentElement.classList.remove(`z-nav-${dir}`);
			}
		});

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	onMount(() => {
		theme.init();
		settings.init();
		importantRainbow.init();
		pwa.init();
		void auth.init().finally(() => {
			sessionStorage.removeItem(PRELOAD_RELOAD_KEY);
		});
		network.init(() => {
			void import('$lib/sync/outbox-processor').then(({ outboxProcessor }) =>
				outboxProcessor.processQueue()
			);
		});

		const onPageHide = () => {
			void import('$lib/db').then(({ closeMailDatabase }) => closeMailDatabase());
		};
		window.addEventListener('pagehide', onPageHide);

		const onPreloadError = (event: Event) => {
			event.preventDefault();
			const last = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) ?? 0);
			const now = Date.now();
			if (now - last < 10_000) {
				console.warn('[zaur] Suppressed vite:preloadError reload loop');
				return;
			}
			sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(now));
			window.location.reload();
		};
		window.addEventListener('vite:preloadError', onPreloadError);

		void (async () => {
			await ensureAppServiceWorkerReady();

			if (settings.notifyOnNewMail) {
				try {
					await syncPushSubscription(true);
				} catch {
					// Push may be unavailable (browser, network, or service worker state)
				}
			}
		})();

		const onUnauthorized = () => auth.handleUnauthorized();
		window.addEventListener('zaur:unauthorized', onUnauthorized);
		return () => {
			window.removeEventListener('pagehide', onPageHide);
			window.removeEventListener('vite:preloadError', onPreloadError);
			window.removeEventListener('zaur:unauthorized', onUnauthorized);
			network.stop();
			pwa.destroy();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/pwa-192x192.png" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="mobile-web-app-capable" content="yes" />
</svelte:head>

<a href="#main-content" class="z-skip-link">Skip to main content</a>
{@render children()}
<InstallPrompt />
