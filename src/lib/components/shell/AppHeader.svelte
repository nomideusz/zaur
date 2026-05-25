<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { CalendarPlus, PenSquare } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import GlobalSearch from './GlobalSearch.svelte';
	import OfflineIndicator from './OfflineIndicator.svelte';
	import OutboxMenu from './OutboxMenu.svelte';
	import ToolSwitcher from './ToolSwitcher.svelte';
	import UserMenu from './UserMenu.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { outbox } from '$lib/stores/outbox.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const homeHref = $derived(settings.skipHomeScreen ? '/mail/inbox' : '/');
</script>

<header
	class="z-panel relative z-40 flex h-(--height-header) shrink-0 items-center gap-4 border-b px-4"
	style="view-transition-name: app-header;"
>
	<a href={homeHref} class="text-base font-semibold tracking-tight text-fg">ZAUR</a>

	<ToolSwitcher />

	<div class="flex-1">
		{#if !settings.hideHeaderSearch}
			<GlobalSearch />
		{/if}
	</div>

	<OfflineIndicator />

	{#if outbox.pendingCount > 0}
		<OutboxMenu />
	{/if}

	{#if $page.url.pathname.startsWith('/mail')}
		<IconButton label="New message" class="sm:hidden" onclick={() => goto('/mail/compose')}>
			<PenSquare class="size-4" aria-hidden="true" />
		</IconButton>
		<Button href="/mail/compose" class="hidden sm:inline-flex">
			<PenSquare class="size-4" aria-hidden="true" />
			New
		</Button>
	{:else if $page.url.pathname.startsWith('/calendar') && calendar.supported !== false}
		<IconButton label="New event" class="sm:hidden" onclick={() => calendar.openCompose()}>
			<CalendarPlus class="size-4" aria-hidden="true" />
		</IconButton>
		<Button onclick={() => calendar.openCompose()} class="hidden sm:inline-flex">
			<CalendarPlus class="size-4" aria-hidden="true" />
			New event
		</Button>
	{/if}

	<UserMenu />
</header>
