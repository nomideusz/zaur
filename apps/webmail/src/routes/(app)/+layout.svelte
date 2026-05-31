<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AppShellHeader from '$lib/components/shell/AppShellHeader.svelte';
	import ToastStack from '$lib/components/ui/ToastStack.svelte';
	import { pushListener } from '$lib/jmap/push-listener';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { applyUnreadPrefixToDocument } from '$lib/utils/document-title';

	let { children } = $props();
	const onMailRoute = $derived($page.url.pathname === '/' || $page.url.pathname.startsWith('/mail'));
	const onSettingsRoute = $derived($page.url.pathname.startsWith('/settings'));
	const showAppHeader = $derived(!onMailRoute && !onSettingsRoute);
	const pageScrollOnMain = $derived(onMailRoute || onSettingsRoute);
	const pageScrollOverflowX = 'overflow-x-hidden';

	$effect(() => {
		if (auth.isRestoring) return;
		if (!auth.isAuthenticated && !$page.url.pathname.startsWith('/login')) {
			goto('/login');
		}
	});

	$effect(() => {
		if (!auth.isAuthenticated) return;
		mail.mailboxes;
		settings.showUnreadInTitle;
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
		<span class={settings.hideConnectingScreen ? 'sr-only' : ''}>Connecting…</span>
	</div>
{:else if auth.isAuthenticated}
	<div class="relative flex h-dvh flex-col overflow-hidden">
		{#if showAppHeader}
			<AppShellHeader />
		{/if}
		<main
			id="main-content"
			class="flex min-h-0 flex-1 flex-col overflow-y-auto {pageScrollOverflowX} {pageScrollOnMain
				? 'z-app-main--page-scroll'
				: ''}"
			tabindex="-1"
		>
			{@render children()}
		</main>
		<ToastStack />
	</div>
{/if}
