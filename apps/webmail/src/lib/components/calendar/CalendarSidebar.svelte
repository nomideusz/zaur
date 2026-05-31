<script lang="ts">
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { cn } from '$lib/utils/cn';
</script>

<aside
	class="z-mail-pane-surface flex min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden border-r border-border"
	style="view-transition-name: calendar-sidebar;"
	aria-label="Calendars"
>
	<div class="shrink-0 border-b border-border/80 px-4 py-3">
		<h2 class="z-type-label">Calendars</h2>
	</div>

	<nav class="z-pane-scroll min-h-0 flex-1 overflow-y-auto p-2.5">
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
								'z-checkbox-row py-2',
								calendar.isCalendarVisible(item.id) ? 'text-fg' : 'text-fg-muted'
							)}
						>
							<input
								type="checkbox"

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

	<AppSidebarShortcuts />
</aside>
