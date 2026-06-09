<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Search from '$lib/components/icons/Search.svelte';
	import GlobalSearch from '$lib/components/shell/GlobalSearch.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MobileCalendarShellNav from '$lib/components/shell/MobileCalendarShellNav.svelte';
	import MobileContactsShellNav from '$lib/components/shell/MobileContactsShellNav.svelte';
	import MobileMailShellNav from '$lib/components/shell/MobileMailShellNav.svelte';
	import MobileSettingsShellNav from '$lib/components/shell/MobileSettingsShellNav.svelte';
	import OfflineIndicator from '$lib/components/shell/OfflineIndicator.svelte';
	import ToolSwitcher from '$lib/components/shell/ToolSwitcher.svelte';
	import UserMenu from '$lib/components/shell/UserMenu.svelte';
	import MessageListBulkHeader from '$lib/components/mail/MessageListBulkHeader.svelte';
	import { appConfig } from '$lib/config';
	import { isMailPath } from '$lib/mail/routes';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	const homeHref = $derived(settings.preferredMailHref());
	const pathname = $derived(page.url.pathname);
	const onSettingsRoute = $derived(pathname.startsWith('/settings'));
	const onMailRoute = $derived(pathname === '/' || isMailPath(pathname));
	const onContactsRoute = $derived(pathname.startsWith('/contacts'));
	const onCalendarRoute = $derived(pathname.startsWith('/calendar'));
	const onMailCompose = $derived(pathname.startsWith('/mail/compose'));
	const onMailSearch = $derived(pathname.startsWith('/mail/search'));
	const mailCtx = $derived(shellHeader.mail);
	const mailListToolbar = $derived(shellHeader.mailListToolbar);
	const pageCtx = $derived(shellHeader.page);

	const mailBulkActive = $derived(
		onMailRoute && !onMailCompose && mail.hasSelection && !!mailCtx?.mailboxRouteId
	);

	/** Folder list/bulk chrome lives in the list pane (both mobile + desktop). */
	const mailListChromeActive = $derived(
		onMailRoute && !onMailCompose && (mailBulkActive || !!mailListToolbar)
	);

	const mobileShellNavActive = $derived(
		(onMailRoute || onContactsRoute || onCalendarRoute || onSettingsRoute) &&
			!onMailCompose &&
			!onMailSearch &&
			!mailBulkActive
	);

	const onMailShellNav = $derived(onMailRoute && mobileShellNavActive);

	/** Mail primary action lives in the app header; bulk mode owns the row. */
	const showComposeAction = $derived(onMailShellNav);

	const showCalendarAction = $derived(
		onCalendarRoute && mobileShellNavActive && calendar.supported !== false
	);

	const pagePrimaryAction = $derived(pageCtx?.primaryAction);
	const showContactsAction = $derived(
		onContactsRoute && mobileShellNavActive && !!pagePrimaryAction
	);
</script>

<header
	class={cn(
		'z-app-shell-header relative z-40 flex h-(--height-header) w-full shrink-0 items-center gap-2 border-b border-border/50 bg-surface-raised/80 backdrop-blur-xl backdrop-saturate-150 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3 md:px-4',
		mailBulkActive ? 'px-0' : !mobileShellNavActive ? 'px-3' : '',
		mailListChromeActive && 'z-app-shell-header--mail-list',
		mobileShellNavActive && 'z-app-shell-header--mobile-app-nav'
	)}
	style="view-transition-name: app-header;"
>
	{#if mailBulkActive && mailCtx?.mailboxRouteId}
		<div class="relative z-10 w-full min-w-0 md:hidden">
			<MessageListBulkHeader
				class="w-full min-w-0"
				surface="shell"
				mailboxRouteId={mailCtx.mailboxRouteId}
				onBulkAction={mailCtx.onBulkAction}
				disabled={mailCtx.loading || !!mailCtx.error || mailCtx.messageCount === 0}
			/>
		</div>
	{/if}

	<div
		class={cn(
			'z-app-shell-header__start relative z-10 flex min-w-0 shrink-0 items-center gap-2 md:col-start-1 md:justify-self-start md:gap-3',
			mailBulkActive && 'max-md:hidden',
			mobileShellNavActive && 'max-md:min-w-0 max-md:flex-1'
		)}
	>
		<a
			href={homeHref}
			class="hidden shrink-0 text-base text-fg transition-opacity hover:opacity-80 md:inline-flex"
		>
			<span class="text-lg font-extrabold lowercase tracking-tight text-accent">
				{appConfig.brandName}
			</span>
		</a>

		<div class="hidden md:block">
			<ToolSwitcher />
		</div>

		{#if onMailShellNav}
			<MobileMailShellNav />
		{:else if onContactsRoute && mobileShellNavActive}
			<MobileContactsShellNav />
		{:else if onCalendarRoute && mobileShellNavActive}
			<MobileCalendarShellNav />
		{:else if onSettingsRoute && mobileShellNavActive}
			<MobileSettingsShellNav />
		{/if}
	</div>

	<div
		class={cn(
			'z-app-shell-header__center relative z-10 min-w-0 flex-1 md:col-start-2 md:w-full md:max-w-xl md:flex-none md:justify-self-center',
			mailBulkActive && 'max-md:hidden',
			mobileShellNavActive && 'max-md:hidden'
		)}
	>
		{#if mobileShellNavActive}
			<div class="hidden w-full min-w-0 md:block">
				<GlobalSearch />
			</div>
		{:else if !onCalendarRoute}
			<div class="w-full min-w-0">
				<GlobalSearch />
			</div>
		{/if}
	</div>

	<div
		class={cn(
			'z-app-shell-header__end relative z-10 flex shrink-0 items-center gap-1 md:col-start-3 md:justify-self-end md:gap-2',
			mailBulkActive && 'max-md:hidden'
		)}
	>
		<div class="max-md:hidden">
			<OfflineIndicator />
		</div>

		{#if showCalendarAction}
			<button
				type="button"
				class="z-mail-text-nav__action shrink-0 md:inline-flex"
				onclick={() => calendar.openCompose()}
			>
				<span class="md:hidden">New</span>
				<span class="hidden md:inline">New event</span>
			</button>
		{:else if showComposeAction}
			<IconButton
				label="Search mail"
				class="shrink-0 md:hidden"
				onclick={() => goto('/mail/search?focus=1')}
			>
				<Search class="size-4" />
			</IconButton>
			<span class="z-app-shell-header__divider md:hidden" aria-hidden="true"></span>
			<a href="/mail/compose" class="z-mail-text-nav__action shrink-0 md:inline-flex">
				<span class="md:hidden">New</span>
				<span class="hidden md:inline">New message</span>
			</a>
		{:else if showContactsAction && pagePrimaryAction?.kind === 'button'}
			{@const action = pagePrimaryAction}
			<button
				type="button"
				class="z-mail-text-nav__action shrink-0"
				onclick={action.onclick}
			>
				{action.label}
			</button>
		{:else if showContactsAction && pagePrimaryAction?.kind === 'link'}
			{@const action = pagePrimaryAction}
			<a href={action.href} class="z-mail-text-nav__action shrink-0">
				{action.label}
			</a>
		{/if}

		<div class="hidden md:block">
			<UserMenu />
		</div>
	</div>
</header>
