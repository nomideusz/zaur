<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { haptic } from '$lib/utils/haptics';
	import { isCoarsePointer } from '$lib/utils/pointer-env';
	import { cn } from '$lib/utils/cn';

	/* Skeleton row name widths — uneven so the placeholder reads like real names. */
	const SKELETON_WIDTHS = ['55%', '72%', '48%', '64%'];
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
			<ul class="space-y-0.5" aria-hidden="true">
				{#each SKELETON_WIDTHS as width, i (i)}
					<li class="flex items-center gap-2.5 px-3 py-2">
						<span class="z-skeleton size-4 shrink-0 rounded"></span>
						<span class="z-skeleton size-2.5 shrink-0 rounded-full"></span>
						<span class="z-skeleton h-3 rounded" style="width: {width};"></span>
					</li>
				{/each}
			</ul>
			<p class="sr-only" role="status">Loading calendars…</p>
		{:else if calendar.supported === false}
			<p class="px-3 py-4 text-sm text-fg-muted">Calendars are not available on this account.</p>
		{:else if !calendar.calendars.length}
			<p class="px-3 py-4 text-sm text-fg-muted">No calendars found.</p>
		{:else}
			<ul class="space-y-0.5">
				{#each calendar.calendars as item (item.id)}
					<li>
						<Checkbox
							checked={calendar.isCalendarVisible(item.id)}
							label={`Show ${item.name} calendar`}
							onchange={() => {
								if (isCoarsePointer()) haptic(8);
								calendar.toggleCalendar(item.id);
							}}
							class={cn(
								'z-checkbox-row w-full py-2 text-left',
								calendar.isCalendarVisible(item.id) ? 'text-fg' : 'text-fg-muted'
							)}
						>
							<span
								class="size-2.5 shrink-0 rounded-full"
								style:background-color={item.color}
								aria-hidden="true"
							></span>
							<span class="truncate">{item.name}</span>
						</Checkbox>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>
</aside>
