<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AppHeader from '$lib/components/shell/AppHeader.svelte';
	import { pushListener } from '$lib/jmap/push-listener';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { applyUnreadPrefixToDocument } from '$lib/utils/document-title';

	let { children } = $props();

	$effect(() => {
		if (auth.isRestoring) return;
		if (!auth.isAuthenticated && !$page.url.pathname.startsWith('/login')) {
			goto('/login');
		}
	});

	$effect(() => {
		if (!auth.isAuthenticated) return;
		mail.mailboxes;
		applyUnreadPrefixToDocument();
	});

	afterNavigate(() => {
		if (auth.isAuthenticated) applyUnreadPrefixToDocument();
	});

	$effect(() => {
		const client = auth.client;
		if (!client || !auth.isAuthenticated || auth.isRestoring) {
			pushListener.stop();
			return;
		}

		pushListener.start(client, (change) => {
			const accountChanges = change.changed[client.getAccountId()];
			if (accountChanges) {
				void mail.handlePushChange(client, accountChanges);
			}
		});

		return () => pushListener.stop();
	});
</script>

{#if auth.isRestoring}
	<div class="flex min-h-dvh items-center justify-center bg-surface text-sm text-fg-muted">
		Connecting…
	</div>
{:else if auth.isAuthenticated}
	<div class="flex min-h-dvh flex-col">
		<AppHeader />
		<main class="flex min-h-0 flex-1 flex-col">
			{@render children()}
		</main>
	</div>
{/if}
