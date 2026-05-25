<script lang="ts">
	import { LoaderCircle, Settings } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	const hideBorders = $derived(settings.hideCalendarPaneBorders || settings.hidePaneBorders);
</script>

<aside
	class={cn(
		'z-panel flex min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden',
		!hideBorders && 'border-r'
	)}
	style="view-transition-name: calendar-sidebar;"
	aria-label="Calendars"
>
	{#if !settings.hideCalendarSidebarHeader}
		<div
			class={cn(
				'shrink-0 border-b px-4',
				settings.compactCalendarSidebar ? 'py-2' : 'py-3',
				!hideBorders && 'border-border'
			)}
		>
			<h2 class="z-type-label">Calendars</h2>
		</div>
	{/if}

	<nav
		class={cn(
			'z-pane-scroll min-h-0 flex-1 overflow-y-auto',
			settings.compactCalendarSidebar ? 'p-1' : 'p-2'
		)}
	>
		{#if calendar.calendarsLoading}
			<div class="flex items-center gap-2 px-3 py-4 text-sm text-fg-muted">
				<span class="z-spinner size-4" aria-hidden="true">
					<LoaderCircle class="size-full" />
				</span>
				Loading calendars…
			</div>
		{:else if calendar.supported === false}
			<p class="px-3 py-4 text-sm text-fg-muted">Calendars are not available on this account.</p>
		{:else if !calendar.calendars.length}
			<p class="px-3 py-4 text-sm text-fg-muted">No calendars found.</p>
		{:else}
			<ul class="space-y-0.5">
				{#each calendar.calendars as item (item.id)}
					<li>
						<label
							class={cn(
								'flex cursor-pointer items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-surface-sunken',
								settings.compactCalendarSidebar ? 'py-1.5' : 'py-2',
								calendar.isCalendarVisible(item.id) ? 'text-fg' : 'text-fg-muted'
							)}
						>
							<input
								type="checkbox"
								class="size-4 accent-accent"
								checked={calendar.isCalendarVisible(item.id)}
								onchange={() => calendar.toggleCalendar(item.id)}
							/>
							<span
								class="size-2.5 shrink-0 rounded-full"
								style:background-color={item.color}
								aria-hidden="true"
							></span>
							<span class="truncate">{item.name}</span>
						</label>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>

	{#if !settings.hideCalendarSidebarSettings}
		<div class={cn('shrink-0 p-2', !hideBorders && 'border-t border-border')}>
			<a
				href="/settings/calendar"
				class={cn(
					'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
					$page.url.pathname.startsWith('/settings')
						? 'bg-surface-sunken font-medium text-fg'
						: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
				)}
			>
				<Settings class="size-4 shrink-0" aria-hidden="true" />
				Settings
			</a>
		</div>
	{/if}
</aside>
