<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import ComposePanel from '$lib/components/mail/ComposePanel.svelte';
	import { compose } from '$lib/stores/compose.svelte';

	const mode = $derived($page.url.searchParams.get('mode') === 'reply' ? 'reply' : 'new');

	afterNavigate(({ from, to }) => {
		if (to?.url.pathname !== '/mail/compose') return;
		if (to.url.searchParams.get('mode') === 'reply') return;
		if (from?.url.pathname === '/mail/compose') return;
		compose.startNew();
	});
</script>

<svelte:head>
	<title>Compose · ZAUR Webmail</title>
</svelte:head>

<ComposePanel {mode} />
