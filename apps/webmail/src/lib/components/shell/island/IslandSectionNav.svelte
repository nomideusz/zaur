<script lang="ts">
	import { page } from '$app/stores';
	import CalendarPlus from '$lib/components/icons/CalendarPlus.svelte';
	import Menu from '$lib/components/icons/Menu.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import { activeMobileNavItem } from '$lib/shell/app-nav';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';

	/* Calendar / Contacts / Settings island — mirrors the mail layout (menu on the
	   left, section label centered, a primary action on the right) so every section
	   shares one pattern. The action comes from the calendar store or the page's
	   registered primary action; sections without one keep a balancing spacer. */

	const pathname = $derived($page.url.pathname);
	const active = $derived(activeMobileNavItem(pathname));
	const onCalendar = $derived(pathname.startsWith('/calendar'));
	const showCalendarAction = $derived(onCalendar && calendar.supported !== false);
	const pageAction = $derived(shellHeader.page?.primaryAction);
</script>

<div class="z-mobile-island__tabs">
	<button
		type="button"
		class="z-mobile-island__icon-btn"
		aria-label="Apps and folders"
		aria-expanded={mobileIsland.navDrawerOpen}
		onclick={() => mobileIsland.openNavDrawer()}
	>
		<Menu class="size-[1.125rem]" aria-hidden="true" />
	</button>

	{#if active}
		{@const Icon = active.icon}
		<div class="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1">
			<Icon class="size-4 shrink-0 text-accent" aria-hidden="true" />
			<span class="truncate text-sm font-medium text-fg">{active.label}</span>
		</div>
	{/if}

	{#if showCalendarAction}
		<button
			type="button"
			class="z-mobile-island__icon-btn z-mobile-island__icon-btn--accent"
			aria-label="New event"
			onclick={() => calendar.openCompose()}
		>
			<CalendarPlus class="size-[1.125rem]" aria-hidden="true" />
		</button>
	{:else if pageAction?.kind === 'button'}
		{@const action = pageAction}
		{@const ActionIcon = action.icon}
		<button
			type="button"
			class="z-mobile-island__icon-btn z-mobile-island__icon-btn--accent"
			aria-label={action.label}
			onclick={action.onclick}
		>
			{#if ActionIcon}<ActionIcon class="size-[1.125rem]" aria-hidden="true" />{:else}<Plus
					class="size-[1.125rem]"
					aria-hidden="true"
				/>{/if}
		</button>
	{:else if pageAction?.kind === 'link'}
		{@const action = pageAction}
		{@const ActionIcon = action.icon}
		<a
			href={action.href}
			class="z-mobile-island__icon-btn z-mobile-island__icon-btn--accent no-underline"
			aria-label={action.label}
		>
			{#if ActionIcon}<ActionIcon class="size-[1.125rem]" aria-hidden="true" />{:else}<Plus
					class="size-[1.125rem]"
					aria-hidden="true"
				/>{/if}
		</a>
	{:else}
		<div class="size-11 shrink-0" aria-hidden="true"></div>
	{/if}
</div>
