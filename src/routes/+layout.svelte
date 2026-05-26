<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
	import ToastStack from '$lib/components/ui/ToastStack.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { network } from '$lib/stores/network.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { visual } from '$lib/stores/visual.svelte';
	import { syncPushSubscription } from '$lib/utils/notifications';
	import { registerAppServiceWorker } from '$lib/utils/service-worker';

	let { children } = $props();

	onMount(() => {
		theme.init();
		visual.init();
		settings.init();
		pwa.init();
		void auth.init();
		network.init(() => {
			void import('$lib/sync/outbox-processor').then(({ outboxProcessor }) =>
				outboxProcessor.processQueue()
			);
		});

		void (async () => {
			await registerAppServiceWorker();

			if (settings.notifyOnNewMail) {
				await syncPushSubscription(true);
			}
		})();

		const onUnauthorized = () => auth.handleUnauthorized();
		window.addEventListener('zaur:unauthorized', onUnauthorized);
		return () => {
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
</svelte:head>

<a href="#main-content" class="z-skip-link">Skip to main content</a>
{@render children()}
<ToastStack />
<InstallPrompt />
