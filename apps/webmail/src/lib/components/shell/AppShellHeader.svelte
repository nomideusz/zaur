<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CalendarPlus from '$lib/components/icons/CalendarPlus.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import GlobalSearch from './GlobalSearch.svelte';
	import OfflineIndicator from './OfflineIndicator.svelte';
	import UserMenu from './UserMenu.svelte';
	import { appConfig } from '$lib/config';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	const homeHref = $derived(settings.preferredMailHref());
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
			class="z-type-brand text-base text-fg transition-colors hover:text-fg-muted"
		>
			<span class={settings.hideAppTitle ? 'sr-only' : ''}>{appConfig.brandName}</span>
		</a>
	</div>

	{#if !settings.hideHeaderSearch}
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
		<OfflineIndicator />

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

		<UserMenu />
	</div>
</header>
