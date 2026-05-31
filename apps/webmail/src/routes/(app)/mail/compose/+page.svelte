<script lang="ts">
	import ComposePanel from '$lib/components/mail/ComposePanel.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose, type ComposeMode } from '$lib/stores/compose.svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';

	const COMPOSE_MODES = new Set<ComposeMode>(['new', 'reply', 'reply-all', 'forward']);

	const mode = $derived.by(() => {
		const value = $page.url.searchParams.get('mode');
		return value && COMPOSE_MODES.has(value as ComposeMode) ? (value as ComposeMode) : 'new';
	});

	const initialTo = $derived($page.url.searchParams.get('to') ?? '');
	const draftId = $derived($page.url.searchParams.get('draft'));

	afterNavigate(({ from, to }) => {
		if (to?.url.pathname !== '/mail/compose') return;
		if (to.url.searchParams.get('draft')) return;
		const toMode = to.url.searchParams.get('mode');
		if (toMode && toMode !== 'new') return;

		if (
			from?.url.pathname === '/mail/compose' &&
			from.url.searchParams.get('draft') === to.url.searchParams.get('draft') &&
			from.url.searchParams.get('mode') === to.url.searchParams.get('mode')
		) {
			return;
		}

		compose.startNew();
	});

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring || !draftId) return;
		void compose.loadDraft(client, draftId).catch((error) => {
			compose.error = error instanceof Error ? error.message : 'Could not open draft';
		});
	});
</script>

<svelte:head>
	<title>Compose · ZAUR Webmail</title>
</svelte:head>

<ComposePanel {mode} {initialTo} />
