<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { CalendarPlus, PenSquare } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import GlobalSearch from './GlobalSearch.svelte';
	import MailShellHeaderContext from './MailShellHeaderContext.svelte';
	import OfflineIndicator from './OfflineIndicator.svelte';
	import OutboxMenu from './OutboxMenu.svelte';
	import ToolSwitcher from './ToolSwitcher.svelte';
	import UserMenu from './UserMenu.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { outbox } from '$lib/stores/outbox.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	const homeHref = $derived(settings.skipHomeScreen ? settings.preferredMailHref() : '/');
	const showOutbox = $derived(
		!settings.hideOutboxUnlessFailed ||
			outbox.items.some((item) => item.status === 'failed')
	);
	const onMailRoute = $derived($page.url.pathname.startsWith('/mail'));
	const showMailContext = $derived(onMailRoute && shellHeader.mail !== null);
	const showToolSwitcher = $derived(!onMailRoute);
	const showNewMessage = $derived(
		showMailContext &&
			shellHeader.mail?.showNewMessage &&
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
		<a href={homeHref} class="z-type-brand text-base text-fg transition-colors hover:text-fg-muted">
			<span class={settings.hideAppTitle ? 'sr-only' : ''}>ZAUR</span>
		</a>

		{#if showToolSwitcher}
			<ToolSwitcher />
		{/if}
	</div>

	{#if showMailContext && shellHeader.mail}
		<MailShellHeaderContext ctx={shellHeader.mail} />
	{:else}
		<div class="min-w-0 flex-1">
			<GlobalSearch />
		</div>
	{/if}

	<div
		class={cn(
			'flex shrink-0 items-center',
			settings.compactAppHeader ? 'gap-1.5' : 'gap-2'
		)}
	>
		{#if showMailContext}
			<div class="hidden min-w-0 flex-1 md:block md:max-w-sm lg:max-w-md">
				<GlobalSearch />
			</div>
		{/if}

		{#if showNewMessage}
			<Button href="/mail/compose" class="shrink-0 md:hidden">
				<PenSquare class="size-5" aria-hidden="true" />
				New message
			</Button>
		{/if}

		<OfflineIndicator />

		{#if showOutbox}
			<OutboxMenu />
		{/if}

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

		<UserMenu />
	</div>
</header>
