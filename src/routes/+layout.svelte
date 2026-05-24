<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ToastStack from '$lib/components/ui/ToastStack.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { network } from '$lib/stores/network.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';

	let { children } = $props();

	onMount(() => {
		theme.init();
		settings.init();
		void auth.init();
		network.init(() => {
			void import('$lib/sync/outbox-processor').then(({ outboxProcessor }) =>
				outboxProcessor.processQueue()
			);
		});

		const onUnauthorized = () => auth.handleUnauthorized();
		window.addEventListener('zaur:unauthorized', onUnauthorized);
		return () => {
			window.removeEventListener('zaur:unauthorized', onUnauthorized);
			network.stop();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
<ToastStack />
