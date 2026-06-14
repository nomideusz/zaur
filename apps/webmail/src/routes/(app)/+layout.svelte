<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AppShellHeader from '$lib/components/shell/AppShellHeader.svelte';
	import MobileIsland from '$lib/components/shell/island/MobileIsland.svelte';
	import WelcomeOnboarding from '$lib/components/shell/WelcomeOnboarding.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import ToastStack from '$lib/components/ui/ToastStack.svelte';
	import { pushListener } from '$lib/jmap/push-listener';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { applyUnreadPrefixToDocument } from '$lib/utils/document-title';

	let { children } = $props();

	const pageScrollOnMain = false;
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

{#if false}
	<div class="flex min-h-dvh items-center justify-center bg-surface text-sm text-fg-muted">
		<span>Connecting…</span>
	</div>
{:else}
	<div class="relative flex h-dvh flex-col overflow-hidden">
		<AppShellHeader />
		<main
			id="main-content"
			class="flex min-h-0 flex-1 flex-col {pageScrollOverflowX} {pageScrollOnMain
				? 'z-app-main--page-scroll overflow-y-auto'
				: 'overflow-hidden'}"
			style="padding-top: env(safe-area-inset-top, 0px); padding-left: env(safe-area-inset-left, 0px); padding-right: env(safe-area-inset-right, 0px);"
			tabindex="-1"
		>
			{@render children()}
		</main>
		<MobileIsland />
		<WelcomeOnboarding />
		<ConfirmDialog />
		<ToastStack />
	</div>
{/if}
