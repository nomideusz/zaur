<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CalendarPlus from '$lib/components/icons/CalendarPlus.svelte';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import GlobalSearch from './GlobalSearch.svelte';
	import OfflineIndicator from './OfflineIndicator.svelte';
	import ToolSwitcher from './ToolSwitcher.svelte';
	import UserMenu from './UserMenu.svelte';
	import { appConfig } from '$lib/config';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const homeHref = $derived(settings.preferredMailHref());
</script>

<header
	class="relative z-40 flex h-(--height-header) shrink-0 items-center gap-2 border-b border-border/50 bg-surface-raised/80 px-4 backdrop-blur-md"
	style="view-transition-name: app-header;"
>
	<div class="flex shrink-0 items-center gap-3 md:w-64">
		<a
			href={homeHref}
			class="text-base text-fg transition-colors hover:opacity-80"
		>
			<span class="font-extrabold tracking-tight text-accent lowercase text-lg">{appConfig.brandName}</span>
		</a>
		<ToolSwitcher />
	</div>

	<div class="min-w-0 flex-1">
		{#if !$page.url.pathname.startsWith('/settings')}
			<GlobalSearch />
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-2 md:w-64 md:justify-end">
		<OfflineIndicator />

		{#if $page.url.pathname.startsWith('/calendar') && calendar.supported !== false}
			<IconButton label="New event" class="sm:hidden" onclick={() => calendar.openCompose()}>
				<CalendarPlus class="size-5" aria-hidden="true" />
			</IconButton>
			<Button onclick={() => calendar.openCompose()} class="hidden sm:inline-flex">
				<CalendarPlus class="size-5" aria-hidden="true" />
				New event
			</Button>
		{:else if ($page.url.pathname.startsWith('/contacts') || $page.url.pathname === '/' || $page.url.pathname.startsWith('/mail')) && !$page.url.pathname.startsWith('/mail/compose')}
			<IconButton label="New message" class="sm:hidden" onclick={() => goto('/mail/compose')}>
				<PenSquare class="size-5" aria-hidden="true" />
			</IconButton>
			<Button href="/mail/compose" class="hidden sm:inline-flex">
				<PenSquare class="size-5" aria-hidden="true" />
				New message
			</Button>
		{/if}

		<UserMenu />
	</div>
</header>
