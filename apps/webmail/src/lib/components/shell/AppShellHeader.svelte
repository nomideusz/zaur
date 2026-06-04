<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CalendarPlus from '$lib/components/icons/CalendarPlus.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import MessageListBulkHeader from '$lib/components/mail/MessageListBulkHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import GlobalSearch from './GlobalSearch.svelte';
	import OfflineIndicator from './OfflineIndicator.svelte';
	import ToolSwitcher from './ToolSwitcher.svelte';
	import UserMenu from './UserMenu.svelte';
	import { appConfig } from '$lib/config';
	import { INBOX_MAILBOX_ROUTE_ID, isMailPath, mailListHref } from '$lib/mail/routes';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	const homeHref = $derived(settings.preferredMailHref());
	const inboxHref = mailListHref(INBOX_MAILBOX_ROUTE_ID);
	const onInboxList = $derived(
		$page.url.pathname === '/' || $page.url.pathname === '/mail/inbox'
	);
	const onSettingsRoute = $derived($page.url.pathname.startsWith('/settings'));
	const onMailRoute = $derived($page.url.pathname === '/' || isMailPath($page.url.pathname));
	const mailCtx = $derived(shellHeader.mail);
	const showMobileBulkHeader = $derived(
		onMailRoute && mail.hasSelection && !!mailCtx?.mailboxRouteId
	);
	const showMobileMailboxTitle = $derived(onMailRoute && mailCtx && !mail.hasSelection);
	const hideShellSearch = $derived(onSettingsRoute || showMobileBulkHeader);
	const showComposeAction = $derived(
		($page.url.pathname.startsWith('/contacts') ||
			$page.url.pathname === '/' ||
			$page.url.pathname.startsWith('/mail')) &&
			!$page.url.pathname.startsWith('/mail/compose')
	);

	function handleMobileInboxHome(event: MouseEvent) {
		mail.clearSelection();
		if (onInboxList) event.preventDefault();
	}
</script>

<header
	class={cn(
		'z-app-shell-header relative z-40 flex h-(--height-header) shrink-0 items-center gap-2 border-b border-border/50 bg-surface-raised/80 px-4 backdrop-blur-md max-md:gap-1 max-md:px-3',
		showMobileBulkHeader && 'z-app-shell-header--bulk'
	)}
	style="view-transition-name: app-header;"
>
	<div class="relative z-10 hidden min-w-0 shrink-0 items-center gap-3 md:flex">
		<a
			href={homeHref}
			class="shrink-0 text-base text-fg transition-colors hover:opacity-80"
		>
			<span class="font-extrabold tracking-tight text-accent lowercase text-lg">{appConfig.brandName}</span>
		</a>
		<ToolSwitcher />
	</div>

	<a
		href={inboxHref}
		class="z-app-shell-header__home relative z-10 shrink-0 md:hidden"
		aria-label="Inbox"
		onclick={handleMobileInboxHome}
	>
		<span class="z-app-shell-header__home-mark">{appConfig.brandName.slice(0, 1).toLowerCase()}</span>
	</a>

	{#if showMobileBulkHeader && mailCtx?.mailboxRouteId}
		<div class="z-app-shell-header__bulk relative z-10 min-w-0 flex-1 md:hidden">
			<MessageListBulkHeader
				surface="shell"
				mailboxRouteId={mailCtx.mailboxRouteId}
				disabled={mailCtx.loading || !!mailCtx.error || mailCtx.messageCount === 0}
				onBulkAction={mailCtx.onBulkAction}
			/>
		</div>
	{:else}
		<div
			class={cn(
				'relative z-10 flex min-w-0 flex-1 items-center gap-2 max-md:gap-1.5',
				showMobileMailboxTitle && 'md:flex-none md:flex-initial'
			)}
		>
			{#if showMobileMailboxTitle && mailCtx}
				<p class="z-app-shell-header__mail-title min-w-0 flex-1 truncate md:hidden">
					{mailCtx.mailboxName}{#if mailCtx.countLabel}<span class="z-app-shell-header__mail-meta"> · {mailCtx.countLabel}</span>{/if}
				</p>
			{/if}

			<div
				class={cn(
					'min-w-0 flex-1 pointer-events-none',
					showMobileBulkHeader && 'max-md:hidden',
					showMobileMailboxTitle && 'max-md:flex-none max-md:flex-initial'
				)}
			>
				{#if !hideShellSearch}
					<div class="pointer-events-auto">
						<GlobalSearch />
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div
		class={cn(
			'relative z-10 flex shrink-0 items-center gap-1.5 md:w-64 md:justify-end md:gap-2',
			showMobileBulkHeader && 'max-md:hidden'
		)}
	>
		<div class="max-md:hidden">
			<OfflineIndicator />
		</div>

		{#if $page.url.pathname.startsWith('/calendar') && calendar.supported !== false}
			<Button onclick={() => calendar.openCompose()} class="hidden md:inline-flex">
				<CalendarPlus class="size-5" aria-hidden="true" />
				New event
			</Button>
		{:else if showComposeAction}
			<IconButton label="New message" class="md:hidden" onclick={() => goto('/mail/compose')}>
				<PenSquare class="size-5" aria-hidden="true" />
			</IconButton>
			<Button href="/mail/compose" class="hidden md:inline-flex">
				<PenSquare class="size-5" aria-hidden="true" />
				New message
			</Button>
		{/if}

		<UserMenu />
	</div>
</header>
