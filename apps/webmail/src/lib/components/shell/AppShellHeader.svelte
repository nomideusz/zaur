<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Search from '$lib/components/icons/Search.svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import CalendarPlus from '$lib/components/icons/CalendarPlus.svelte';
	import UserPlus from '$lib/components/icons/UserPlus.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import GlobalSearch from '$lib/components/shell/GlobalSearch.svelte';
	import OfflineIndicator from '$lib/components/shell/OfflineIndicator.svelte';
	import ToolSwitcher from '$lib/components/shell/ToolSwitcher.svelte';
	import UserMenu from '$lib/components/shell/UserMenu.svelte';
	import MessageListBulkHeader from '$lib/components/mail/MessageListBulkHeader.svelte';
	import MessageListToolbar from '$lib/components/mail/MessageListToolbar.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
	import { appConfig } from '$lib/config';
	import { isSettingsNavActive, settingsNavLinks } from '$lib/mail/config';
	import { isMailPath, mailListHref, parseMailContext } from '$lib/mail/routes';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	const homeHref = $derived(settings.preferredMailHref());
	const pathname = $derived($page.url.pathname);
	const onSettingsRoute = $derived(pathname.startsWith('/settings'));
	const onMailRoute = $derived(pathname === '/' || isMailPath(pathname));
	const onContactsRoute = $derived(pathname.startsWith('/contacts'));
	const onCalendarRoute = $derived(pathname.startsWith('/calendar'));
	const onMailCompose = $derived(pathname.startsWith('/mail/compose'));
	const mailCtx = $derived(shellHeader.mail);
	const mailListToolbar = $derived(shellHeader.mailListToolbar);
	const pageCtx = $derived(shellHeader.page);
	const isSettingsHome = $derived(/^\/settings\/?$/.test(pathname));

	const mailBulkActive = $derived(
		onMailRoute && !onMailCompose && mail.hasSelection && !!mailCtx?.mailboxRouteId
	);

	/** Folder list/bulk chrome lives in the list pane (both mobile + desktop). */
	const mailListChromeActive = $derived(
		onMailRoute && !onMailCompose && (mailBulkActive || !!mailListToolbar)
	);
	const mailListToolbarActive = $derived(
		onMailRoute && !onMailCompose && !mailBulkActive && !!mailListToolbar
	);

	/** Mail primary action lives in the app header; bulk mode owns the row. */
	const showComposeAction = $derived(
		onMailRoute && !onMailCompose && !mailBulkActive
	);

	const sectionLinks = $derived(settingsNavLinks());
	const activeSettingsSection = $derived(
		sectionLinks.find((link) => isSettingsNavActive(pathname, link.href)) ?? sectionLinks[0]
	);
	const settingsSectionOptions = $derived(
		sectionLinks.map((link) => ({ value: link.href, label: link.label }))
	);

	const primaryOrder = new Map([
		['inbox', 0],
		['drafts', 1],
		['sent', 2],
		['archive', 3],
		['junk', 4],
		['trash', 5]
	]);

	const mailboxOptions = $derived(
		[...mail.mailboxes]
			.filter((mb) => primaryOrder.has(mb.role ?? ''))
			.sort((a, b) => {
				const aRank = primaryOrder.get(a.role ?? '') ?? 99;
				const bRank = primaryOrder.get(b.role ?? '') ?? 99;
				return aRank - bRank || a.name.localeCompare(b.name);
			})
			.map((mb) => ({
				value: mb.id,
				label: mb.name + (mb.unread > 0 ? ` (${mb.unread})` : '')
			}))
	);

	const mailRouteId = $derived(parseMailContext(pathname)?.mailboxRouteId ?? 'inbox');

	function onSettingsSectionChange(href: string) {
		if (href !== pathname) void goto(href);
	}

	function onMailboxChange(routeId: string) {
		if (routeId !== mailRouteId) void goto(mailListHref(routeId));
	}
</script>

<header
	class={cn(
		'z-app-shell-header relative z-40 flex h-(--height-header) w-full shrink-0 items-center gap-2 border-b border-border/50 bg-surface-raised/80 px-3 backdrop-blur-xl backdrop-saturate-150 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3 md:px-4',
		mailListChromeActive && 'z-app-shell-header--mail-list'
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
			mailBulkActive && 'max-md:hidden'
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

		{#if onSettingsRoute}
			<a
				href={homeHref}
				class="z-btn-icon min-h-10 min-w-10 shrink-0 p-2.5 text-fg-muted no-underline transition-colors hover:text-fg md:hidden"
				aria-label="Back to mail"
			>
				<ArrowLeft class="size-5" aria-hidden="true" />
			</a>
			{#if isSettingsHome}
				<h1 class="z-app-shell-header__title md:hidden">Settings</h1>
			{:else}
				<MobilePicker
					label="Settings section"
					value={activeSettingsSection?.href ?? '/settings/account'}
					options={settingsSectionOptions}
					onchange={onSettingsSectionChange}
					compact={true}
					class="min-w-0 max-w-[11rem] md:hidden"
				/>
			{/if}
		{:else if onMailRoute && !onMailCompose}
			<MobilePicker
				label="Mailbox"
				value={mailRouteId}
				options={mailboxOptions}
				onchange={onMailboxChange}
				compact={true}
				class="min-w-0 max-w-[10rem] md:hidden"
			/>
		{:else if onContactsRoute && pageCtx?.title}
			<h1 class="z-app-shell-header__title min-w-0 truncate md:hidden">{pageCtx.title}</h1>
		{:else if onCalendarRoute}
			<h1 class="z-app-shell-header__title md:hidden">Calendar</h1>
		{/if}
	</div>

	<div
		class={cn(
			'z-app-shell-header__center relative z-10 min-w-0 flex-1 md:col-start-2 md:w-full md:max-w-xl md:flex-none md:justify-self-center',
			mailBulkActive && 'max-md:hidden'
		)}
	>
		{#if onSettingsRoute}
			<div class="md:hidden">
				<SettingsSearch />
			</div>
		{:else if mailListToolbarActive && mailListToolbar}
			<div class="md:hidden">
				<MessageListToolbar
					class="w-full min-w-0"
					surface="shell"
					readFilter={mailListToolbar.readFilter}
					onReadFilterChange={mailListToolbar.onReadFilterChange}
					disabled={mailListToolbar.disabled}
				/>
			</div>
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

		{#if onCalendarRoute && calendar.supported !== false}
			<IconButton
				label="New event"
				class="md:hidden"
				onclick={() => calendar.openCompose()}
			>
				<CalendarPlus class="size-4" aria-hidden="true" />
			</IconButton>
			<button
				type="button"
				class="z-mail-text-nav__action hidden md:inline-flex"
				onclick={() => calendar.openCompose()}
			>
				New event
			</button>
		{:else if showComposeAction}
			{#if mailListToolbarActive}
				<IconButton
					label="Search mail"
					class="md:hidden"
					onclick={() => goto('/mail/search?focus=1')}
				>
					<Search class="size-4" aria-hidden="true" />
				</IconButton>
			{/if}
			<a href="/mail/compose" class="z-mail-text-nav__action shrink-0 md:hidden">New</a>
			<a href="/mail/compose" class="z-mail-text-nav__action hidden shrink-0 md:inline-flex">
				New message
			</a>
		{:else if onContactsRoute && pageCtx?.primaryAction?.kind === 'button'}
			{@const action = pageCtx.primaryAction}
			{@const ActionIcon = action.icon ?? UserPlus}
			<IconButton label={action.label} class="md:hidden" onclick={action.onclick}>
				<ActionIcon class="size-4" aria-hidden="true" />
			</IconButton>
		{/if}

		<div class="hidden md:block">
			<UserMenu />
		</div>
	</div>
</header>
