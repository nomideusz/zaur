<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CalendarPlus from '$lib/components/icons/CalendarPlus.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import GlobalSearch from './GlobalSearch.svelte';
	import MailShellHeaderContext from './MailShellHeaderContext.svelte';
	import OfflineIndicator from './OfflineIndicator.svelte';
	import UserMenu from './UserMenu.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';


	const homeHref = $derived(settings.preferredMailHref());
	const onMailRoute = $derived($page.url.pathname.startsWith('/mail'));
	const onSettingsRoute = $derived($page.url.pathname.startsWith('/settings'));
	const mobileReadingThread = $derived(
		onMailRoute && !!$page.params.threadId && !mail.hasSelection
	);
	const showMailContext = $derived(onMailRoute && shellHeader.mail !== null);
	const mobileListSelecting = $derived(
		onMailRoute && !!shellHeader.mail?.mailboxRouteId && !$page.params.threadId && mail.hasSelection
	);
	const showMailPrimaryAction = $derived(
		showMailContext &&
			shellHeader.mail?.showNewMessage &&
			!mobileReadingThread &&
			!mobileListSelecting
	);
	const showMobileMailSearch = $derived(
		showMailContext &&
			!settings.hideHeaderSearch &&
			!mobileReadingThread &&
			!mobileListSelecting &&
			!showMailPrimaryAction
	);
	const mobileMailListView = $derived(
		onMailRoute &&
			!!shellHeader.mail?.mailboxRouteId &&
			!$page.params.threadId &&
			!mail.hasSelection
	);
</script>

<header
	class={cn(
		'z-panel relative z-40 flex h-(--height-header) shrink-0 items-center gap-2',
		settings.compactAppHeader ? 'px-3' : 'px-4'
	)}
	style="view-transition-name: app-header;"
>
	<div
		class={cn(
			'flex shrink-0 items-center',
			settings.compactAppHeader ? 'gap-2' : 'gap-3'
		)}
	>
		<a
			href={homeHref}
			class={cn(
				'z-type-brand text-base text-fg transition-colors hover:text-fg-muted',
				(mobileReadingThread || mobileMailListView) && 'max-md:sr-only'
			)}
		>
			<span class={settings.hideAppTitle ? 'sr-only' : ''}>ZAUR</span>
		</a>
	</div>

	{#if showMailContext && shellHeader.mail}
		<MailShellHeaderContext ctx={shellHeader.mail} />
	{:else if onSettingsRoute}
		<div class="flex min-w-0 flex-1 items-center">
			<h2 class="z-type-pane-title hidden min-w-0 truncate md:block">Settings</h2>
		</div>
	{:else if !settings.hideHeaderSearch}
		<div class="min-w-0 flex-1">
			<GlobalSearch />
		</div>
	{:else}
		<div class="min-w-0 flex-1"></div>
	{/if}

	<div
		class={cn(
			'flex shrink-0 items-center',
			settings.compactAppHeader ? 'gap-1.5' : 'gap-2'
		)}
	>
		{#if showMailPrimaryAction}
			<IconButton label="New message" class="md:hidden" onclick={() => goto('/mail/compose')}>
				<PenSquare class="size-5" aria-hidden="true" />
			</IconButton>
		{/if}

		<OfflineIndicator />

		{#if !showMailContext}
			{#if $page.url.pathname.startsWith('/calendar') && calendar.supported !== false && !settings.hideCalendarNewEventButton}
				{#if settings.compactHeaderActions}
					<IconButton label="New event" onclick={() => calendar.openCompose()}>
						<CalendarPlus class="size-5" aria-hidden="true" />
					</IconButton>
				{:else}
					<IconButton label="New event" class="sm:hidden" onclick={() => calendar.openCompose()}>
						<CalendarPlus class="size-5" aria-hidden="true" />
					</IconButton>
					<Button onclick={() => calendar.openCompose()} class="hidden sm:inline-flex">
						<CalendarPlus class="size-5" aria-hidden="true" />
						New event
					</Button>
				{/if}
			{:else if $page.url.pathname.startsWith('/contacts') && !settings.hideContactsComposeButton}
				{#if settings.compactHeaderActions}
					<IconButton label="New message" onclick={() => goto('/mail/compose')}>
						<PenSquare class="size-5" aria-hidden="true" />
					</IconButton>
				{:else}
					<IconButton label="New message" class="sm:hidden" onclick={() => goto('/mail/compose')}>
						<PenSquare class="size-5" aria-hidden="true" />
					</IconButton>
					<Button href="/mail/compose" class="hidden sm:inline-flex">
						<PenSquare class="size-5" aria-hidden="true" />
						New message
					</Button>
				{/if}
			{/if}
		{/if}

		{#if showMobileMailSearch}
			<IconButton label="Search mail" class="md:hidden" onclick={() => goto('/mail/search?focus=1')}>
				<Search class="size-5" aria-hidden="true" />
			</IconButton>
		{/if}

		<UserMenu />
	</div>
</header>
